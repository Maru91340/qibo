import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildSeedBundle, CATALOG_TYPES, SEED_FILE } from './bundle-catalog.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcRoot = join(projectRoot, 'src');
const tdesignRoot = join(projectRoot, 'node_modules/tdesign-miniprogram/miniprogram_dist');
const errors = [];
const warnings = [];
const fail = (message) => errors.push(message);

const read = (file) => readFileSync(file, 'utf8');
const relativePath = (file) => relative(projectRoot, file).replaceAll('\\', '/');
const isVoid = (tag) => ['image', 'input', 'textarea', 'import', 'include'].includes(tag);

function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

function checkNoNativeLeftovers() {
  for (const stale of ['app.js', 'app.json', 'app.wxss', 'sitemap.json', 'project.config.json', 'pages', 'utils']) {
    if (existsSync(join(projectRoot, stale))) fail(`原生小程序残留：${stale}，uni-app 代码只应放在 src/`);
  }
}

function templateOf(source) {
  const start = source.indexOf('<template>');
  const end = source.lastIndexOf('</template>');
  return start >= 0 && end > start ? source.slice(start + '<template>'.length, end) : '';
}

function checkTags(page) {
  const template = templateOf(page.source);
  const stack = [];
  for (const match of template.matchAll(/<(\/)?([a-zA-Z][\w-]*)\b([^>]*)>/g)) {
    const [, closing, tag, attrs] = match;
    if (closing) {
      const open = stack.pop();
      if (open !== tag) return fail(`${page.label} 标签不配对：${open || '空'} 与 </${tag}>`);
      continue;
    }
    if (!attrs.trimEnd().endsWith('/') && !isVoid(tag)) stack.push(tag);
  }
  if (stack.length) fail(`${page.label} 有未闭合标签：${stack.join(', ')}`);
}

function checkNativeLeaks(page) {
  const template = templateOf(page.source);
  if (/wx:/.test(template)) fail(`${page.label} 仍在使用 wx: 指令，uni-app 需改为 v-directive`);
  if (/\b(?:bind|catch)[:_-]?[a-z-]+\s*=/.test(template)) fail(`${page.label} 仍在使用 bind:/catch: 原生事件绑定`);
  if (/\bdata-[a-z]+\s*=/.test(template)) fail(`${page.label} 仍在使用 data-* 传参，请直接传参给处理函数`);
  if (/require\(/.test(page.source)) fail(`${page.label} 不应使用 require()，请改用 import`);
  if (/\bwx\.[a-zA-Z]/.test(page.source)) fail(`${page.label} 直接调用了 wx.*，请改用 uni.* 接口`);
}

function checkHandlers(page) {
  const script = page.source.slice(page.source.indexOf('<script'), page.source.length);
  const declared = new Set();
  for (const match of script.matchAll(/(?:function|const|let|var|import)\s+([A-Za-z_$][\w$]*)/g)) declared.add(match[1]);
  for (const match of script.matchAll(/(?:^|[{},\s])([A-Za-z_$][\w$]*)\s*(?:=>|[:(,])/g)) declared.add(match[1]);
  for (const match of page.template.matchAll(/@(?:[a-z][a-z0-9-]*)=(?:"|')([^"']+)(?:"|')/g)) {
    const expression = match[1];
    const call = expression.match(/^([A-Za-z_$][\w$]*)\s*[({]/);
    const bare = /^([A-Za-z_$][\w$]*)$/.exec(expression.trim());
    const name = call ? call[1] : bare ? bare[1] : null;
    if (name && !declared.has(name) && !name.startsWith('$')) fail(`${page.label} 模板绑定了未定义的 ${name}()`);
  }
}

function checkComponents(page, registered) {
  const used = new Set();
  for (const match of page.template.matchAll(/<(t-[a-z][\w-]*)\b/g)) used.add(match[1]);
  for (const name of used) {
    if (!registered.has(name)) fail(`${page.label} 使用了未注册的组件 <${name}>`);
    const path = (page.components || {})[name];
    if (path) {
      const file = join(tdesignRoot, `${path.replace('tdesign-miniprogram/', '')}.json`);
      if (!existsSync(file)) fail(`${page.label} 组件路径不存在：${path}`);
    }
  }
}

function matchesRoute(url) {
  if (!url.includes('${')) return knownRoutes.has(url);
  const pattern = new RegExp(`^${url.replaceAll(/\$\{[^}]*\}/g, '[^/]+')}$`);
  return [...knownRoutes].some((route) => pattern.test(route));
}

function checkRoutes(page) {
  for (const match of page.source.matchAll(/(?:navigateTo|redirectTo|switchTab)\(\{\s*url:\s*[`'"]([^`'"?]+)/g)) {
    if (!matchesRoute(match[1])) fail(`${page.label} 跳转到了未注册的路由 ${match[1]}`);
  }
}

const pagesJson = JSON.parse(read(join(srcRoot, 'pages.json')));
const knownRoutes = new Set(pagesJson.pages.map((page) => `/${page.path}`));
for (const sub of pagesJson.subPackages || []) {
  for (const page of sub.pages || []) knownRoutes.add(`/${sub.root}/${page.path}`);
}

const pages = walk(join(srcRoot, 'pages'))
  .filter((file) => file.endsWith('.vue'))
  .map((file) => {
    const source = read(file);
    return {
      file,
      label: relativePath(file),
      source,
      template: templateOf(source)
    };
  });

function checkPagesAgainstManifest() {
  const manifestPaths = new Set(pagesJson.pages.map((page) => page.path));
  for (const page of pages) {
    const route = relativePath(page.file).replace('src/', '').replace(/\.vue$/, '');
    if (!manifestPaths.has(route)) fail(`${page.label} 未在 pages.json 中注册`);
  }
  for (const route of manifestPaths) {
    if (!pages.some((page) => relativePath(page.file) === `src/${route}.vue`)) fail(`pages.json 注册了 ${route}，但缺少对应文件`);
  }
}

function checkRegisteredComponents() {
  for (const entry of pagesJson.pages) {
    const components = (entry.style || {})['mp-weixin']?.usingComponents || {};
    const registered = new Set(Object.keys(components));
    const page = pages.find((item) => relativePath(item.file) === `src/${entry.path}.vue`);
    if (!page) continue;
    page.components = components;
    checkComponents(page, registered);
  }
}

function checkCatalog() {
  let built;
  try {
    built = buildSeedBundle();
  } catch (error) {
    fail(`内置资料未通过云函数校验：${error.message}`);
    return;
  }
  const { bundle, manifest, catalog } = built;
  const meta = bundle.content.meta;
  for (const section of meta.sections) {
    if (!knownRoutes.has(section.path)) fail(`首页板块跳转路由未注册：${section.path}`);
  }
  for (const banner of meta.banners) {
    if (!knownRoutes.has(banner.path)) fail(`轮播跳转路由未注册：${banner.path}`);
  }
  if (!existsSync(SEED_FILE)) {
    fail(`${relativePath(SEED_FILE)} 缺失，请执行 npm run seed:export`);
    return;
  }
  const committed = JSON.parse(read(SEED_FILE));
  if (committed.version !== manifest.version) {
    fail(`${relativePath(SEED_FILE)} 与 src/data 不一致（${committed.version} → ${manifest.version}），请执行 npm run seed:export`);
  }
  CATALOG_TYPES.forEach((type) => {
    if (committed.catalog.types[type].revision !== catalog.types[type].revision) {
      fail(`seed 的 ${type} 修订号过期：${committed.catalog.types[type].revision.slice(0, 8)} → ${catalog.types[type].revision.slice(0, 8)}`);
    }
  });
}

function checkCloudParity() {
  const client = read(join(srcRoot, 'services/content.js'));
  const clientTypes = (client.match(/CATALOG_TYPES\s*=\s*\[([^\]]*)\]/) || [])[1] || '';
  const parsed = clientTypes.split(',').map((item) => item.trim().replace(/'/g, '')).filter(Boolean);
  if (parsed.join(',') !== CATALOG_TYPES.join(',')) {
    fail(`src/services/content.js 与 cloudfunctions/shared/constants.js 的 CATALOG_TYPES 不一致：${parsed.join(',')} vs ${CATALOG_TYPES.join(',')}`);
  }
  const env = read(join(srcRoot, 'config/cloud.js'));
  const envId = (env.match(/CLOUD_ENV_ID\s*=\s*'([^']*)'/) || [])[1] || '';
  if (!envId || envId.startsWith('REPLACE_WITH')) {
    warnings.push('src/config/cloud.js 的 CLOUD_ENV_ID 仍是占位值，云端同步会自动降级为内置资料');
  }
  const functions = (env.match(/read:\s*'([^']+)'/) || [])[1];
  if (functions && !existsSync(join(projectRoot, 'cloudfunctions', functions, 'index.js'))) {
    fail(`云函数 ${functions} 在 cloudfunctions/ 下不存在`);
  }
}

checkNoNativeLeftovers();
checkPagesAgainstManifest();
checkRegisteredComponents();
for (const page of pages) {
  checkTags(page);
  checkNativeLeaks(page);
  checkHandlers(page);
  checkRoutes(page);
}
checkCatalog();
checkCloudParity();

for (const warning of warnings) console.warn(`⚠ ${warning}`);
if (errors.length) {
  errors.forEach((message) => console.error(`✖ ${message}`));
  throw new Error(`静态校验失败：${errors.length} 项`);
}
console.log(`✔ 静态校验通过：${pages.length} 个页面 / ${pagesJson.pages.length} 条路由 / ${CATALOG_TYPES.length} 类资料`);
