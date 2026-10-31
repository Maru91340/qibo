import { buildSync } from 'esbuild';
import { createRequire } from 'node:module';
import { mkdtempSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import { CATALOG_TYPES, MANIFEST_ID } from '../cloudfunctions/shared/constants.js';
import {
  clientManifest,
  elementKeySet,
  makeManifest,
  makeSnapshot,
  normalizeContent
} from '../cloudfunctions/shared/catalog-core.js';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const SEED_FILE = join(projectRoot, 'cloudfunctions/seedCatalog/seed/bundled.json');

// src/data is ESM while the cloud tooling is CJS: bundle into a throwaway file and require it.
function loadBundledCatalog() {
  const bundlePath = join(mkdtempSync(join(tmpdir(), 'qbxzs-catalog-')), 'catalog.cjs');
  buildSync({
    entryPoints: [join(projectRoot, 'src/data/catalog.js')],
    bundle: true,
    format: 'cjs',
    platform: 'node',
    outfile: bundlePath,
    logLevel: 'silent'
  });
  const loaded = createRequire(join(projectRoot, 'noop.cjs'))(bundlePath);
  if (!loaded || !loaded.bundledCatalog) throw new Error('src/data/catalog.js 未导出 bundledCatalog');
  return loaded;
}

// Normalised in the same order as seedCatalog, so element keys are validated
// before the item types are checked against them.
export function buildSeedBundle() {
  const { bundledCatalog, CATALOG_VERSION } = loadBundledCatalog();
  const missing = CATALOG_TYPES.filter((type) => !bundledCatalog[type]);
  if (missing.length) throw new Error(`内置资料缺少类型：${missing.join(', ')}`);

  let elementKeys = null;
  const snapshots = {};
  for (const type of ['element', ...CATALOG_TYPES.filter((item) => item !== 'element')]) {
    const normalized = normalizeContent(type, bundledCatalog[type], { elementKeys });
    if (type === 'element') elementKeys = elementKeySet(normalized.payload);
    snapshots[type] = makeSnapshot(type, normalized, { runId: 'export-seed', source: `src/data@${CATALOG_VERSION}` });
  }

  const manifest = makeManifest(null, snapshots, { manifestId: MANIFEST_ID, runId: 'export-seed' });
  return {
    manifest,
    catalog: clientManifest(manifest),
    bundle: {
      schema: 'qbxzs-catalog-seed/v1',
      builtinVersion: CATALOG_VERSION,
      publishedAt: manifest.publishedAt,
      version: manifest.version,
      content: Object.fromEntries(CATALOG_TYPES.map((type) => [type, snapshots[type].payload])),
      catalog: clientManifest(manifest)
    }
  };
}

export { CATALOG_TYPES, projectRoot };
