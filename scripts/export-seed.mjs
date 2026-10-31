import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { buildSeedBundle, CATALOG_TYPES, projectRoot, SEED_FILE } from './bundle-catalog.mjs';

const { bundle, manifest, catalog } = buildSeedBundle();

mkdirSync(dirname(SEED_FILE), { recursive: true });
writeFileSync(SEED_FILE, `${JSON.stringify(bundle, null, 2)}\n`);

console.log(`已导出内置资料 -> ${SEED_FILE.slice(projectRoot.length + 1)}`);
console.log(`版本 ${manifest.version} · ${(statSync(SEED_FILE).size / 1024).toFixed(1)} KB`);
console.log(CATALOG_TYPES.map((type) => `${type}: ${catalog.types[type].count} 条 / ${catalog.types[type].revision.slice(0, 8)}`).join('\n'));
