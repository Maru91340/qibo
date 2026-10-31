'use strict';

const { CATALOG_TYPES } = require('../shared/constants');
const { clientManifest } = require('../shared/catalog-core');
const { getPublishedManifest, getSnapshot, initCloud, serializeError } = require('../shared/cloud');

function response(data) {
  return { code: 0, message: 'success', data };
}

function fail(error) {
  return { code: 1, message: error.message || 'CATALOG_READ_FAILED', error: serializeError(error) };
}

function readType(value) {
  const type = String(value || '');
  if (!CATALOG_TYPES.includes(type)) {
    const error = new Error(`unsupported catalog type "${type}"`);
    error.code = 'INVALID_ARGUMENT';
    throw error;
  }
  return type;
}

exports.main = async (event = {}) => {
  try {
    const { db } = initCloud();
    const manifest = await getPublishedManifest(db);
    // No published catalog yet: the client treats a null payload as "keep the bundled data".
    if (!manifest) return response(null);

    const action = event.action || 'manifest';

    if (action === 'manifest') {
      if (event.revision && event.revision === manifest.version) {
        return response({ notModified: true, revision: manifest.version });
      }
      return response(Object.assign({ notModified: false }, clientManifest(manifest)));
    }

    if (action === 'content') {
      const type = readType(event.type);
      const pointer = manifest.content[type];
      const snapshot = await getSnapshot(db, manifest, type);
      if (!pointer || !snapshot || snapshot.status !== 'published' || snapshot.sha256 !== pointer.sha256) {
        const error = new Error(`published snapshot is unavailable or inconsistent for ${type}`);
        error.code = 'SNAPSHOT_MISSING';
        throw error;
      }
      return response({
        type,
        content: snapshot.payload,
        revision: snapshot.sha256,
        count: snapshot.count,
        publishedAt: manifest.publishedAt
      });
    }

    const error = new Error(`unsupported action "${action}"`);
    error.code = 'INVALID_ARGUMENT';
    throw error;
  } catch (error) {
    return fail(error);
  }
};
