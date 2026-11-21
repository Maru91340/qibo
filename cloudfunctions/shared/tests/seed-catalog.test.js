'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const seed = require('../../seedCatalog/index.js');
const { CATALOG_TYPES, COLLECTIONS, MANIFEST_ID, SCHEMA_VERSION } = require('../constants');
const { hashPayload, versionOf } = require('../catalog-core');

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function fakeDb(initial = {}) {
  let state = new Map(Object.entries(initial).map(([name, rows]) => [name, new Map(Object.entries(clone(rows)))]));
  const transactionRetries = [];

  function collectionFor(store, name) {
    if (!store.has(name)) store.set(name, new Map());
    return {
      doc(id) {
        return {
          async get() {
            return { data: clone(store.get(name).get(id) || null) };
          },
          async set({ data }) {
            store.get(name).set(id, clone(data));
            return { _id: id };
          }
        };
      }
    };
  }

  return {
    collection(name) {
      return collectionFor(state, name);
    },
    async createCollection(name) {
      if (state.has(name)) {
        const error = new Error('collection already exists');
        error.code = -501001;
        throw error;
      }
      state.set(name, new Map());
    },
    async runTransaction(callback, retries) {
      transactionRetries.push(retries);
      const staged = new Map([...state].map(([name, rows]) => [name, new Map([...rows].map(([id, row]) => [id, clone(row)]))]));
      const result = await callback({ collection: (name) => collectionFor(staged, name) });
      state = staged;
      return result;
    },
    row(name, id) {
      return clone(state.get(name) && state.get(name).get(id));
    },
    rows(name) {
      return [...((state.get(name) && state.get(name).values()) || [])].map(clone);
    },
    transactionRetries
  };
}

function catalogFixture(label) {
  const content = {};
  const snapshots = {};
  for (const type of CATALOG_TYPES) {
    const payload = { fixture: `${label}-${type}` };
    const sha256 = hashPayload(payload);
    const snapshotId = `${type}-${sha256.slice(0, 16)}`;
    content[type] = { sha256, count: 1, snapshotId };
    snapshots[snapshotId] = {
      schema: 'qbxzs-catalog-snapshot/v1',
      type,
      status: 'published',
      sha256,
      count: 1,
      payload
    };
  }
  const version = versionOf(content);
  return {
    manifest: {
      schema: SCHEMA_VERSION,
      version,
      previousVersion: null,
      publishedAt: '2026-11-01T00:00:00.000Z',
      runId: `fixture-${label}`,
      content
    },
    snapshots
  };
}

function initialState(current, history = {}, snapshots = {}) {
  return {
    [COLLECTIONS.manifests]: current ? { [MANIFEST_ID]: current } : {},
    [COLLECTIONS.manifestHistory]: history,
    [COLLECTIONS.snapshots]: snapshots,
    [COLLECTIONS.publishAudits]: {}
  };
}

test('publish request validation rejects empty content, unknown source, and invalid expectedVersion', () => {
  assert.throws(() => seed._test.requestedContent({ content: {} }), { code: 'INVALID_ARGUMENT' });
  assert.throws(() => seed._test.requestedContent({ source: 'remote', content: { meta: {} } }), { code: 'INVALID_ARGUMENT' });
  assert.throws(() => seed._test.requestedContent({ source: 'bundled', content: { meta: {} } }), { code: 'INVALID_ARGUMENT' });
  assert.throws(() => seed._test.expectedVersionOf({}), { code: 'INVALID_ARGUMENT' });
  assert.throws(() => seed._test.expectedVersionOf({ expectedVersion: '' }), { code: 'INVALID_ARGUMENT' });
  assert.throws(() => seed._test.rollbackVersionOf({ version: '0123456789abcdef' }), { code: 'INVALID_ARGUMENT' });
  assert.equal(seed._test.rollbackVersionOf({ targetVersion: '0123456789abcdef' }), '0123456789abcdef');
  assert.equal(seed._test.expectedVersionOf({ expectedVersion: null }), null);
  assert.equal(seed._test.expectedVersionOf({ expectedVersion: '0123456789abcdef' }), '0123456789abcdef');
});

test('transactional publish enforces expectedVersion CAS without writes on conflict', async () => {
  const current = catalogFixture('current');
  const db = fakeDb(initialState(current.manifest, { [current.manifest.version]: current.manifest }, current.snapshots));
  const changedPayload = { fixture: 'changed-meta' };
  const changedSha = hashPayload(changedPayload);
  const snapshots = {
    meta: {
      _id: `meta-${changedSha.slice(0, 16)}`,
      type: 'meta',
      status: 'published',
      sha256: changedSha,
      count: 1,
      payload: changedPayload
    }
  };

  await assert.rejects(
    seed._test.publishSnapshots(db, snapshots, {
      expectedVersion: '0000000000000000',
      source: 'manual',
      runId: 'seed-conflict',
      createdAt: '2026-11-03T00:00:00.000Z'
    }),
    { code: 'VERSION_CONFLICT' }
  );
  assert.equal(db.row(COLLECTIONS.manifests, MANIFEST_ID).version, current.manifest.version);
  assert.equal(db.rows(COLLECTIONS.publishAudits).length, 0);
});

test('transactional publish stores immutable history, previousVersion, and sanitized audit', async () => {
  const current = catalogFixture('current');
  const db = fakeDb(initialState(current.manifest, {}, current.snapshots));
  const changedPayload = { fixture: 'changed-meta' };
  const changedSha = hashPayload(changedPayload);
  const snapshots = {
    meta: {
      _id: `meta-${changedSha.slice(0, 16)}`,
      type: 'meta',
      status: 'published',
      sha256: changedSha,
      count: 1,
      payload: changedPayload
    }
  };

  const result = await seed._test.publishSnapshots(db, snapshots, {
    expectedVersion: current.manifest.version,
    source: 'manual',
    runId: 'seed-publish',
    createdAt: '2026-11-03T00:00:00.000Z',
    token: 'must-not-be-stored'
  });
  const live = db.row(COLLECTIONS.manifests, MANIFEST_ID);
  const audit = db.row(COLLECTIONS.publishAudits, 'seed-publish');

  assert.equal(result.status, 'published');
  assert.equal(live.previousVersion, current.manifest.version);
  assert.deepEqual(db.row(COLLECTIONS.manifestHistory, current.manifest.version).content, current.manifest.content);
  assert.deepEqual(db.row(COLLECTIONS.manifestHistory, live.version).content, live.content);
  assert.equal(audit.action, 'publish');
  assert.equal(audit.result, 'published');
  assert.equal(audit.expectedVersion, current.manifest.version);
  assert.equal(JSON.stringify(audit).includes('must-not-be-stored'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(audit, 'token'), false);
  assert.deepEqual(db.transactionRetries, [3]);
});

test('successful no-op publish still writes history and audit without replacing the manifest', async () => {
  const current = catalogFixture('current');
  const db = fakeDb(initialState(current.manifest, {}, current.snapshots));
  const result = await seed._test.publishSnapshots(db, {}, {
    expectedVersion: current.manifest.version,
    source: 'manual',
    runId: 'seed-unchanged',
    createdAt: '2026-11-03T00:30:00.000Z'
  });

  assert.equal(result.status, 'unchanged');
  assert.deepEqual(db.row(COLLECTIONS.manifests, MANIFEST_ID), current.manifest);
  assert.deepEqual(db.row(COLLECTIONS.manifestHistory, current.manifest.version).content, current.manifest.content);
  assert.equal(db.row(COLLECTIONS.publishAudits, 'seed-unchanged').result, 'unchanged');
});

test('rollback validates history snapshots then atomically restores the target version', async () => {
  const target = catalogFixture('target');
  const current = catalogFixture('current');
  const db = fakeDb(initialState(
    current.manifest,
    { [target.manifest.version]: target.manifest },
    Object.assign({}, target.snapshots, current.snapshots)
  ));

  const result = await seed._test.rollbackManifest(db, {
    expectedVersion: current.manifest.version,
    version: target.manifest.version,
    runId: 'seed-rollback',
    createdAt: '2026-11-03T01:00:00.000Z',
    token: 'must-not-be-stored'
  });
  const live = db.row(COLLECTIONS.manifests, MANIFEST_ID);
  const audit = db.row(COLLECTIONS.publishAudits, 'seed-rollback');

  assert.equal(result.status, 'rolled_back');
  assert.equal(live.version, target.manifest.version);
  assert.equal(live.previousVersion, current.manifest.version);
  assert.deepEqual(live.content, target.manifest.content);
  assert.deepEqual(db.row(COLLECTIONS.manifestHistory, current.manifest.version).content, current.manifest.content);
  assert.equal(audit.action, 'rollback');
  assert.equal(audit.result, 'rolled_back');
  assert.equal(Object.prototype.hasOwnProperty.call(audit, 'token'), false);
});

test('rollback rejects a corrupt snapshot and leaves manifest and audit unchanged', async () => {
  const target = catalogFixture('target');
  const current = catalogFixture('current');
  const corruptSnapshots = Object.assign({}, target.snapshots, current.snapshots);
  corruptSnapshots[target.manifest.content.meta.snapshotId] = Object.assign(
    {},
    corruptSnapshots[target.manifest.content.meta.snapshotId],
    { payload: { fixture: 'tampered' } }
  );
  const db = fakeDb(initialState(
    current.manifest,
    { [target.manifest.version]: target.manifest },
    corruptSnapshots
  ));

  await assert.rejects(
    seed._test.rollbackManifest(db, {
      expectedVersion: current.manifest.version,
      version: target.manifest.version,
      runId: 'seed-bad-rollback',
      createdAt: '2026-11-03T02:00:00.000Z'
    }),
    { code: 'ROLLBACK_INVALID' }
  );
  assert.equal(db.row(COLLECTIONS.manifests, MANIFEST_ID).version, current.manifest.version);
  assert.equal(db.rows(COLLECTIONS.publishAudits).length, 0);
});

test('external errors expose stable codes without internal messages', () => {
  const response = seed._test.publicFailure({ code: 'HISTORY_CONFLICT', message: 'database secret details' });
  assert.deepEqual(response, { code: 'SEED_FAILED', message: 'Catalog operation failed.' });
  assert.equal(JSON.stringify(response).includes('database secret details'), false);
});
