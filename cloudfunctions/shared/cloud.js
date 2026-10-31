'use strict';

const { COLLECTIONS, MANIFEST_ID } = require('./constants');

function initCloud() {
  // Behind a function so the pure modules and the node --test suite never load the cloud SDK.
  const cloud = require('wx-server-sdk');
  cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV, traceUser: true });
  return { cloud, db: cloud.database() };
}

function isNotFound(error) {
  const message = String((error && (error.errMsg || error.message)) || '');
  return /not exist|not found|does not exist|-502005/i.test(message);
}

async function getDocument(collection, id) {
  if (!id) return null;
  try {
    const result = await collection.doc(id).get();
    return result.data || null;
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

async function putDocument(collection, id, data) {
  const payload = Object.assign({}, data);
  delete payload._id;
  await collection.doc(id).set({ data: payload });
  return payload;
}

function getPublishedManifest(db) {
  return getDocument(db.collection(COLLECTIONS.manifests), MANIFEST_ID);
}

function getSnapshot(db, manifest, type) {
  const pointer = manifest && manifest.content && manifest.content[type];
  if (!pointer || !pointer.snapshotId) return Promise.resolve(null);
  return getDocument(db.collection(COLLECTIONS.snapshots), pointer.snapshotId);
}

async function ensureCollection(db, name) {
  try {
    await db.createCollection(name);
    return 'created';
  } catch (error) {
    const message = String((error && (error.errMsg || error.message)) || '');
    if (/exist|已存在|-501001/i.test(message)) return 'exists';
    throw error;
  }
}

function serializeError(error) {
  return {
    name: String((error && error.name) || 'Error'),
    code: String((error && error.code) || ''),
    message: String((error && error.message) || error || 'unknown error').slice(0, 1000),
    details: Array.isArray(error && error.details) ? error.details.slice(0, 50) : []
  };
}

module.exports = {
  ensureCollection,
  getDocument,
  getPublishedManifest,
  getSnapshot,
  initCloud,
  isNotFound,
  putDocument,
  serializeError
};
