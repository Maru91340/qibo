'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { CATALOG_TYPES, COLLECTIONS, MANIFEST_ID, SCHEMA_VERSION } = require('../shared/constants');
const {
  clientManifest,
  elementKeySet,
  hashPayload,
  makeManifest,
  makeSnapshot,
  normalizeContent,
  versionOf
} = require('../shared/catalog-core');
const {
  ensureCollection,
  getDocument,
  getPublishedManifest,
  getSnapshot,
  initCloud,
  putDocument
} = require('../shared/cloud');

const VERSION_PATTERN = /^[a-f0-9]{16}$/;
const TRANSACTION_RETRIES = 3;

function failure(code, message) {
  const error = new Error(message || code);
  error.code = code;
  throw error;
}

function safeTokenEqual(received, expected) {
  if (!received || !expected) return false;
  const left = Buffer.from(String(received));
  const right = Buffer.from(String(expected));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function authorize(event) {
  // Fail closed: only the deployment token can authorize this function.
  const expected = process.env.QBXZS_SEED_TOKEN;
  if (!expected) return { ok: false, code: 'SEED_NOT_CONFIGURED' };
  return safeTokenEqual(event && event.token, expected)
    ? { ok: true }
    : { ok: false, code: 'UNAUTHORIZED' };
}

function bundledSeed() {
  const file = path.join(__dirname, 'seed', 'bundled.json');
  if (!fs.existsSync(file)) failure('SEED_BUNDLE_MISSING', 'bundled seed is missing');
  const bundle = JSON.parse(fs.readFileSync(file, 'utf8'));
  return bundle.content || bundle;
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function publishSource(event) {
  const source = event.source === undefined ? 'manual' : event.source;
  if (source !== 'manual' && source !== 'bundled') failure('INVALID_ARGUMENT', 'invalid source');
  return source;
}

function requestedContent(event, loadBundled = bundledSeed) {
  const source = publishSource(event);
  if (source === 'bundled' && event.content !== undefined) failure('INVALID_ARGUMENT', 'bundled source cannot include content');
  const raw = source === 'bundled' ? loadBundled() : event.content;
  if (!isObject(raw) || Object.keys(raw).length === 0) failure('INVALID_ARGUMENT', 'content must not be empty');
  const unknown = Object.keys(raw).filter((type) => !CATALOG_TYPES.includes(type));
  if (unknown.length) failure('INVALID_ARGUMENT', 'content contains unsupported catalog types');
  return { raw, source };
}

function expectedVersionOf(event) {
  if (!Object.prototype.hasOwnProperty.call(event, 'expectedVersion')) {
    failure('INVALID_ARGUMENT', 'expectedVersion is required');
  }
  if (event.expectedVersion === null) return null;
  if (typeof event.expectedVersion !== 'string' || !VERSION_PATTERN.test(event.expectedVersion)) {
    failure('INVALID_ARGUMENT', 'expectedVersion is invalid');
  }
  return event.expectedVersion;
}

function rollbackVersionOf(event) {
  if (typeof event.targetVersion !== 'string' || !VERSION_PATTERN.test(event.targetVersion)) {
    failure('INVALID_ARGUMENT', 'rollback targetVersion is invalid');
  }
  return event.targetVersion;
}

function assertExpectedVersion(manifest, expectedVersion) {
  const actualVersion = manifest && manifest.version ? manifest.version : null;
  if (actualVersion !== expectedVersion) failure('VERSION_CONFLICT', 'catalog version conflict');
}

function makeRunId(now = new Date(), randomBytes = crypto.randomBytes) {
  const stamp = now.toISOString().replace(/[-:.TZ]/g, '');
  return `seed-${stamp}-${randomBytes(4).toString('hex')}`;
}

function makeAudit(input) {
  const audit = {
    _id: input.runId,
    action: input.action,
    result: input.result,
    expectedVersion: input.expectedVersion,
    previousVersion: input.previousVersion || null,
    version: input.version || null,
    createdAt: input.createdAt
  };
  if (input.source) audit.source = input.source;
  if (Array.isArray(input.types)) audit.types = [...input.types];
  return audit;
}

function validateManifestShape(manifest, code = 'ROLLBACK_INVALID') {
  if (!manifest || manifest.schema !== SCHEMA_VERSION || !isObject(manifest.content)) {
    failure(code, 'manifest is invalid');
  }
  for (const type of CATALOG_TYPES) {
    const pointer = manifest.content[type];
    if (!pointer || typeof pointer.snapshotId !== 'string' || !/^[a-f0-9]{64}$/.test(pointer.sha256)) {
      failure(code, 'manifest snapshot pointer is invalid');
    }
  }
  if (manifest.version !== versionOf(manifest.content)) failure(code, 'manifest version is invalid');
}

function validateSnapshot(snapshot, type, pointer, code = 'ROLLBACK_INVALID') {
  if (
    !snapshot
    || snapshot.type !== type
    || snapshot.status !== 'published'
    || snapshot.sha256 !== pointer.sha256
    || hashPayload(snapshot.payload) !== pointer.sha256
  ) {
    failure(code, 'snapshot is invalid');
  }
}

function sameHistory(existing, manifest) {
  if (!existing) return false;
  try {
    validateManifestShape(existing, 'HISTORY_CONFLICT');
  } catch (error) {
    return false;
  }
  return existing.version === manifest.version
    && JSON.stringify(existing.content) === JSON.stringify(manifest.content);
}

async function readHistory(transaction, version) {
  if (!version) return null;
  return getDocument(transaction.collection(COLLECTIONS.manifestHistory), version);
}

async function writeHistoryIfAbsent(transaction, existing, manifest) {
  if (!manifest) return;
  if (existing) {
    if (!sameHistory(existing, manifest)) failure('HISTORY_CONFLICT', 'immutable history conflict');
    return;
  }
  await putDocument(transaction.collection(COLLECTIONS.manifestHistory), manifest.version, manifest);
}

async function putSnapshotIdempotent(db, snapshot) {
  const collection = db.collection(COLLECTIONS.snapshots);
  const existing = await getDocument(collection, snapshot._id);
  if (existing) {
    validateSnapshot(existing, snapshot.type, snapshot, 'SNAPSHOT_CONFLICT');
    return 'exists';
  }
  await putDocument(collection, snapshot._id, snapshot);
  const stored = await getDocument(collection, snapshot._id);
  validateSnapshot(stored, snapshot.type, snapshot, 'SNAPSHOT_CONFLICT');
  return 'created';
}

async function ensurePublishCollections(db) {
  for (const name of [
    COLLECTIONS.snapshots,
    COLLECTIONS.manifests,
    COLLECTIONS.manifestHistory,
    COLLECTIONS.publishAudits
  ]) {
    await ensureCollection(db, name);
  }
}

async function publishSnapshots(db, snapshots, options) {
  const types = Object.keys(snapshots);
  return db.runTransaction(async (transaction) => {
    const current = await getDocument(transaction.collection(COLLECTIONS.manifests), MANIFEST_ID);
    assertExpectedVersion(current, options.expectedVersion);

    const next = makeManifest(current, snapshots, {
      manifestId: MANIFEST_ID,
      runId: options.runId,
      publishedAt: options.createdAt
    });
    const unchanged = Boolean(current && current.version === next.version);

    const currentHistory = current ? await readHistory(transaction, current.version) : null;
    const nextHistory = unchanged ? currentHistory : await readHistory(transaction, next.version);

    await writeHistoryIfAbsent(transaction, currentHistory, current);
    if (!unchanged) await writeHistoryIfAbsent(transaction, nextHistory, next);

    if (!unchanged) {
      await putDocument(transaction.collection(COLLECTIONS.manifests), MANIFEST_ID, next);
    }
    const audit = makeAudit({
      runId: options.runId,
      action: 'publish',
      result: unchanged ? 'unchanged' : 'published',
      source: options.source,
      types,
      expectedVersion: options.expectedVersion,
      previousVersion: current && current.version,
      version: next.version,
      createdAt: options.createdAt
    });
    await putDocument(transaction.collection(COLLECTIONS.publishAudits), audit._id, audit);

    return { current, next, status: audit.result };
  }, TRANSACTION_RETRIES);
}

async function rollbackManifest(db, options) {
  return db.runTransaction(async (transaction) => {
    const current = await getDocument(transaction.collection(COLLECTIONS.manifests), MANIFEST_ID);
    assertExpectedVersion(current, options.expectedVersion);
    if (!current) failure('ROLLBACK_NOT_FOUND', 'catalog is not published');

    const target = await readHistory(transaction, options.version);
    if (!target) failure('ROLLBACK_NOT_FOUND', 'rollback version was not found');
    validateManifestShape(target);

    const snapshots = {};
    for (const type of CATALOG_TYPES) {
      const pointer = target.content[type];
      snapshots[type] = await getDocument(transaction.collection(COLLECTIONS.snapshots), pointer.snapshotId);
      validateSnapshot(snapshots[type], type, pointer);
    }

    const currentHistory = await readHistory(transaction, current.version);
    const unchanged = current.version === target.version;
    const next = {
      _id: MANIFEST_ID,
      schema: SCHEMA_VERSION,
      version: target.version,
      previousVersion: current.version,
      publishedAt: options.createdAt,
      runId: options.runId,
      content: target.content
    };

    await writeHistoryIfAbsent(transaction, currentHistory, current);
    if (!unchanged) await putDocument(transaction.collection(COLLECTIONS.manifests), MANIFEST_ID, next);

    const audit = makeAudit({
      runId: options.runId,
      action: 'rollback',
      result: unchanged ? 'unchanged' : 'rolled_back',
      expectedVersion: options.expectedVersion,
      previousVersion: current.version,
      version: target.version,
      createdAt: options.createdAt
    });
    await putDocument(transaction.collection(COLLECTIONS.publishAudits), audit._id, audit);

    return { current, next, status: audit.result };
  }, TRANSACTION_RETRIES);
}

async function publishedElementKeys(db, manifest) {
  const snapshot = await getSnapshot(db, manifest, 'element');
  return snapshot ? elementKeySet(snapshot.payload) : null;
}

function publicFailure(error) {
  const code = String((error && error.code) || 'SEED_FAILED');
  const messages = {
    SEED_NOT_CONFIGURED: 'Publishing is not configured.',
    UNAUTHORIZED: 'Unauthorized.',
    INVALID_ARGUMENT: 'Invalid request.',
    INVALID_CONTENT: 'Catalog content is invalid.',
    VERSION_CONFLICT: 'Catalog version conflict.',
    ROLLBACK_NOT_FOUND: 'Rollback version was not found.',
    ROLLBACK_INVALID: 'Rollback data is invalid.',
    SEED_BUNDLE_MISSING: 'Bundled catalog is unavailable.'
  };
  return { code: messages[code] ? code : 'SEED_FAILED', message: messages[code] || 'Catalog operation failed.' };
}

async function execute(db, event, dependencies = {}) {
  const now = dependencies.now ? dependencies.now() : new Date();
  const createdAt = now.toISOString();
  const runId = dependencies.runId || makeRunId(now, dependencies.randomBytes || crypto.randomBytes);
  const action = event.action || 'status';

  if (action === 'status') {
    const manifest = await getPublishedManifest(db);
    if (!manifest) return { ok: true, runId, published: false };
    return { ok: true, runId, published: true, version: manifest.version, catalog: clientManifest(manifest) };
  }

  if (action === 'publish') {
    const expectedVersion = expectedVersionOf(event);
    const { raw, source } = requestedContent(event, dependencies.bundledSeed || bundledSeed);
    await ensurePublishCollections(db);

    const manifest = await getPublishedManifest(db);
    assertExpectedVersion(manifest, expectedVersion);
    const types = Object.keys(raw);
    let elementKeys = raw.element ? null : await publishedElementKeys(db, manifest);
    const normalized = {};
    const ordered = ['element', ...types.filter((type) => type !== 'element')];
    for (const type of ordered) {
      normalized[type] = normalizeContent(type, raw[type], { elementKeys });
      if (type === 'element') elementKeys = elementKeySet(normalized[type].payload);
    }

    const snapshots = {};
    for (const type of types) {
      snapshots[type] = makeSnapshot(type, normalized[type], { runId, source, updatedAt: createdAt });
      await putSnapshotIdempotent(db, snapshots[type]);
    }

    const result = await publishSnapshots(db, snapshots, { expectedVersion, source, runId, createdAt });
    return {
      ok: true,
      runId,
      status: result.status,
      version: result.next.version,
      previousVersion: result.current ? result.current.version : null,
      counts: Object.fromEntries(types.map((type) => [type, normalized[type].count])),
      revisions: Object.fromEntries(types.map((type) => [type, normalized[type].sha256]))
    };
  }

  if (action === 'rollback') {
    const expectedVersion = expectedVersionOf(event);
    const version = rollbackVersionOf(event);
    await ensurePublishCollections(db);
    const result = await rollbackManifest(db, { expectedVersion, version, runId, createdAt });
    return {
      ok: true,
      runId,
      status: result.status,
      version: result.next.version,
      previousVersion: result.current.version
    };
  }

  failure('INVALID_ARGUMENT', 'unsupported action');
}

exports.main = async (event = {}) => {
  const access = authorize(event);
  if (!access.ok) return Object.assign({ ok: false }, publicFailure({ code: access.code }));

  let runId;
  try {
    runId = makeRunId();
    const { db } = initCloud();
    return await execute(db, event, { runId });
  } catch (error) {
    const response = publicFailure(error);
    console.error('seedCatalog failed', {
      runId,
      code: String((error && error.code) || ''),
      name: String((error && error.name) || 'Error'),
      message: String((error && error.message) || '').slice(0, 500)
    });
    return Object.assign({ ok: false, runId }, response);
  }
};

exports._test = {
  assertExpectedVersion,
  authorize,
  execute,
  expectedVersionOf,
  makeAudit,
  publishSnapshots,
  publicFailure,
  requestedContent,
  rollbackManifest,
  rollbackVersionOf,
  safeTokenEqual,
  validateManifestShape,
  validateSnapshot
};
