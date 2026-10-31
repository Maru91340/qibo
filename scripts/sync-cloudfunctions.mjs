import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const weixinRoot = resolve(projectRoot, process.argv[2] || 'dist/build/mp-weixin');
const sourceRoot = join(projectRoot, 'cloudfunctions');
const sharedRoot = join(sourceRoot, 'shared');
const deployRoot = join(projectRoot, 'dist/cloudfunctions');

const SHARED_FILES = readdirSync(sharedRoot).filter((file) => file.endsWith('.js'));
const FUNCTIONS = [
  { name: 'getCatalog', needsSeed: false },
  { name: 'seedCatalog', needsSeed: true }
];

if (!existsSync(join(weixinRoot, 'app.json'))) throw new Error(`构建产物不存在：${weixinRoot}，请先执行 uni build -p mp-weixin`);
if (!existsSync(sharedRoot)) throw new Error(`云函数公共模块不存在：${sharedRoot}`);

rmSync(join(weixinRoot, 'cloudfunctions'), { recursive: true, force: true });
rmSync(deployRoot, { recursive: true, force: true });

for (const { name, needsSeed } of FUNCTIONS) {
  const from = join(sourceRoot, name);
  if (!existsSync(join(from, 'index.js'))) throw new Error(`云函数不完整：${name}`);
  const dest = join(deployRoot, 'cloudfunctions', name);
  mkdirSync(dest, { recursive: true });
  for (const file of readdirSync(from)) {
    if (file === 'node_modules' || file === 'seed') continue;
    cpSync(join(from, file), join(dest, file), { recursive: true });
  }
  if (needsSeed) {
    const seed = join(from, 'seed/bundled.json');
    if (!existsSync(seed)) throw new Error(`缺少 ${relative(projectRoot, seed)}，请先执行 npm run seed:export`);
    mkdirSync(join(dest, 'seed'), { recursive: true });
    cpSync(seed, join(dest, 'seed/bundled.json'));
  }
  // Nested shared/ folders have been dropped by the cloud upload before, and '../'
  // escapes the function root, so flatten the helpers next to index.js.
  for (const file of SHARED_FILES) cpSync(join(sharedRoot, file), join(dest, file));
  const indexPath = join(dest, 'index.js');
  writeFileSync(indexPath, readFileSync(indexPath, 'utf8').replaceAll("require('../shared/", "require('./"));
}

const weixinConfigPath = join(weixinRoot, 'project.config.json');
const weixinConfig = JSON.parse(readFileSync(weixinConfigPath, 'utf8'));

writeFileSync(
  join(deployRoot, 'project.config.json'),
  `${JSON.stringify(
    Object.assign({}, weixinConfig, {
      projectname: 'qbxzs-cloud',
      cloudfunctionRoot: 'cloudfunctions/',
      packOptions: { ignore: [{ type: 'suffix', value: '.map' }] }
    }),
    null,
    2
  )}\n`
);

weixinConfig.packOptions = Object.assign({}, weixinConfig.packOptions, {
  ignore: [
    { type: 'folder', value: 'cloudfunctions' },
    { type: 'suffix', value: '.map' }
  ]
});
delete weixinConfig.cloudfunctionRoot;
writeFileSync(weixinConfigPath, `${JSON.stringify(weixinConfig, null, 2)}\n`);

console.log(`云函数已准备：${relative(projectRoot, join(deployRoot, 'cloudfunctions'))}`);
FUNCTIONS.forEach(({ name }) => console.log(`- ${name}：index.js + ${SHARED_FILES.length} 个公共模块`));


// 同步到小程序项目内（开发者工具 cloudfunctionRoot 直传路径），并注入 project.config.json
const mpRoot = join(projectRoot, 'dist', 'build', 'mp-weixin');
const mpFn = join(mpRoot, 'cloudfunctions');
if (existsSync(mpFn)) rmSync(mpFn, { recursive: true, force: true });
cpSync(join(deployRoot, 'cloudfunctions'), mpFn, { recursive: true });
const mpCfgPath = join(mpRoot, 'project.config.json');
if (existsSync(mpCfgPath)) {
  const mpCfg = JSON.parse(readFileSync(mpCfgPath, 'utf8'));
  mpCfg.cloudfunctionRoot = 'cloudfunctions/';
  writeFileSync(mpCfgPath, JSON.stringify(mpCfg, null, 2));
}
console.log('云函数已同步至小程序项目（cloudfunctionRoot）');
