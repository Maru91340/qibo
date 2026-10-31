'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { CATALOG_TYPES, COLLECTIONS, MANIFEST_ID } = require('../shared/constants');
const { clientManifest, elementKeySet, makeManifest, makeSnapshot, normalizeContent } = require('../shared/catalog-core');
const { ensureCollection, getPublishedManifest, getSnapshot, initCloud, putDocument, serializeError } = require('../shared/cloud');

function safeTokenEqual(received, expected) {
  if (!received || !expected) return false;
  const left = Buffer.from(String(received));
  const right = Buffer.from(String(expected));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function authorize(cloud, event) {
  // Fail closed: the function refuses everything until QBXZS_SEED_TOKEN is set in the cloud console.
  const expected = process.env.QBXZS_SEED_TOKEN;
  if (!expected) return { ok: false, code: 'SEED_NOT_CONFIGURED' };
  if (safeTokenEqual(event.token, expected)) return { ok: true, via: 'token' };
  const context = cloud.getWXContext ? cloud.getWXContext() : {};
  const openid = String((context && context.OPENID) || '');
  const allowlist = String(process.env.QBXZS_SEED_OPENIDS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  if (openid && allowlist.indexOf(openid) >= 0) return { ok: true, via: 'openid' };
  return { ok: false, code: 'UNAUTHORIZED' };
}

function bundledSeed() {
  const file = path.join(__dirname, 'seed', 'bundled.json');
  if (!fs.existsSync(file)) {
    const error = new Error('bundled seed is missing, run npm run seed:export first');
    error.code = 'SEED_BUNDLE_MISSING';
    throw error;
  }
  const bundle = JSON.parse(fs.readFileSync(file, 'utf8'));
  return bundle.content || bundle;
}

function requestedContent(event) {
  if (event.source === 'bundled') return bundledSeed();
  if (event.content && typeof event.content === 'object') return event.content;
  const error = new Error('publish needs { source: "bundled" } or { content: { type: payload } }');
  error.code = 'INVALID_ARGUMENT';
  throw error;
}

async function publishedElementKeys(db, manifest) {
  const snapshot = await getSnapshot(db, manifest, 'element');
  return snapshot ? elementKeySet(snapshot.payload) : null;
}

exports.main = async (event = {}) => {
  const { cloud, db } = initCloud();
  const access = authorize(cloud, event);
  if (!access.ok) return { ok: false, code: access.code };

  const runId = `seed:${new Date().toISOString().replace(/[-:.TZ]/g, '')}:${crypto.randomBytes(4).toString('hex')}`;

  try {
    const manifest = await getPublishedManifest(db);
    const action = event.action || 'status';

    if (action === 'status') {
      if (!manifest) return { ok: true, runId, published: false };
      return { ok: true, runId, published: true, version: manifest.version, catalog: clientManifest(manifest) };
    }

    if (action !== 'publish') {
      const error = new Error(`unsupported action "${action}"`);
      error.code = 'INVALID_ARGUMENT';
      throw error;
    }

    const raw = requestedContent(event);
    const types = Object.keys(raw);
    const unknown = types.filter((type) => !CATALOG_TYPES.includes(type));
    if (unknown.length) {
      const error = new Error(`unsupported catalog type(s): ${unknown.join(', ')}`);
      error.code = 'INVALID_ARGUMENT';
      throw error;
    }

    // Normalise `element` first so item types can be checked against the keys
    // being published in the same request; fall back to the live catalog.
    let elementKeys = raw.element ? null : await publishedElementKeys(db, manifest);
    const normalized = {};
    const ordered = ['element', ...types.filter((type) => type !== 'element')];
    for (const type of ordered) {
      normalized[type] = normalizeContent(type, raw[type], { elementKeys });
      if (type === 'element') elementKeys = elementKeySet(normalized[type].payload);
    }

    const snapshots = {};
    for (const type of types) snapshots[type] = makeSnapshot(type, normalized[type], { runId, source: event.source || 'manual' });

    const next = makeManifest(manifest, snapshots, { manifestId: MANIFEST_ID, runId });
    if (manifest && manifest.version === next.version) {
      return { ok: true, runId, status: 'unchanged', version: next.version };
    }

    // First publish creates the collections; TCB refuses writes otherwise.
    await ensureCollection(db, COLLECTIONS.snapshots);
    await ensureCollection(db, COLLECTIONS.manifests);

    for (const type of types) {
      const snapshot = Object.assign({}, snapshots[type], { publishedAt: next.publishedAt });
      await putDocument(db.collection(COLLECTIONS.snapshots), snapshot._id, snapshot);
    }
    await putDocument(db.collection(COLLECTIONS.manifests), MANIFEST_ID, next);

    return {
      ok: true,
      runId,
      status: 'published',
      version: next.version,
      previousVersion: manifest ? manifest.version : null,
      counts: Object.fromEntries(types.map((type) => [type, normalized[type].count])),
      revisions: Object.fromEntries(types.map((type) => [type, normalized[type].sha256]))
    };
  } catch (error) {
    const failure = serializeError(error);
    return { ok: false, runId, code: failure.code || 'SEED_FAILED', message: failure.message, error: failure };
  }
};

exports._test = { authorize, safeTokenEqual };
