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
const routeEntries = [
  ...(pagesJson.pages || []).map((page) => ({ ...page, route: page.path })),
  ...(pagesJson.subPackages || []).flatMap((subPackage) =>
    (subPackage.pages || []).map((page) => ({
      ...page,
      route: `${String(subPackage.root || '').replace(/\/$/, '')}/${page.path}`
    }))
  )
];
const knownRoutes = new Set(routeEntries.map((entry) => `/${entry.route}`));
const pages = routeEntries.map((entry) => {
  const file = join(srcRoot, `${entry.route}.vue`);
  if (!existsSync(file)) return { ...entry, file, label: `src/${entry.route}.vue`, source: '', template: '' };
  const source = read(file);
  return { ...entry, file, label: relativePath(file), source, template: templateOf(source) };
});

function checkPagesAgainstManifest() {
  const manifestPaths = new Set(routeEntries.map((entry) => entry.route));
  if (manifestPaths.size !== routeEntries.length) fail('pages.json 存在重复路由');
  for (const page of pages) {
    if (!existsSync(page.file)) fail(`pages.json 注册了 ${page.route}，但缺少对应文件`);
  }

  const routeRoots = new Set(['pages', ...(pagesJson.subPackages || []).map((item) => item.root).filter(Boolean)]);
  for (const root of routeRoots) {
    const absoluteRoot = join(srcRoot, root);
    if (!existsSync(absoluteRoot)) continue;
    for (const file of walk(absoluteRoot).filter((item) => item.endsWith('.vue'))) {
      const route = relativePath(file).replace('src/', '').replace(/\.vue$/, '');
      if (!manifestPaths.has(route)) fail(`${relativePath(file)} 未在 pages.json 的 pages/subPackages 中注册`);
    }
  }
}

function checkRegisteredComponents() {
  for (const entry of routeEntries) {
    const components = (entry.style || {})['mp-weixin']?.usingComponents || {};
    const registered = new Set(Object.keys(components));
    const page = pages.find((item) => item.route === entry.route);
    if (!page?.source) continue;
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
  const resourceAppId = (env.match(/CLOUD_RESOURCE_APP_ID\s*=\s*'([^']*)'/) || [])[1] || '';
  const envId = (env.match(/CLOUD_ENV_ID\s*=\s*'([^']*)'/) || [])[1] || '';
  if (!resourceAppId || !envId || envId.startsWith('REPLACE_WITH')) {
    warnings.push('src/config/cloud.js 的共享云资源方 AppID/环境 ID 未配置完整，云端同步会自动降级为内置资料');
  }
  const cloudClient = read(join(srcRoot, 'services/cloud.js'));
  if (resourceAppId && !cloudClient.includes('new wx.cloud.Cloud')) {
    fail('共享云环境必须通过 new wx.cloud.Cloud({ resourceAppid, resourceEnv }) 初始化');
  }
  const functions = (env.match(/read:\s*'([^']+)'/) || [])[1];
  if (functions && !existsSync(join(projectRoot, 'cloudfunctions', functions, 'index.js'))) {
    fail(`云函数 ${functions} 在 cloudfunctions/ 下不存在`);
  }
}

function checkReleaseSafety() {
  const packageJson = JSON.parse(read(join(projectRoot, 'package.json')));
  const manifest = JSON.parse(read(join(srcRoot, 'manifest.json')));
  const appConfig = read(join(srcRoot, 'config/app.js'));
  const appVersion = (appConfig.match(/APP_VERSION\s*=\s*'([^']+)'/) || [])[1] || '';
  if (packageJson.version !== manifest.versionName || packageJson.version !== appVersion) {
    fail(`版本不一致：package=${packageJson.version} / manifest=${manifest.versionName} / app=${appVersion || '缺失'}`);
  }

  for (const name of ['getCatalog', 'seedCatalog']) {
    const packageFile = join(projectRoot, 'cloudfunctions', name, 'package.json');
    const lockFile = join(projectRoot, 'cloudfunctions', name, 'package-lock.json');
    if (!existsSync(lockFile)) {
      fail(`cloudfunctions/${name}/package-lock.json 缺失`);
      continue;
    }
    const fnPackage = JSON.parse(read(packageFile));
    const fnLock = JSON.parse(read(lockFile));
    if (fnLock.name !== fnPackage.name || fnLock.version !== fnPackage.version) {
      fail(`cloudfunctions/${name} 的 package.json 与 package-lock.json 不一致`);
    }
  }

  const appSource = read(join(srcRoot, 'App.vue'));
  const clientFiles = walk(srcRoot).filter((file) => /\.(?:js|vue)$/.test(file) && file !== join(srcRoot, 'App.vue'));
  const forbidden = [
    ['seedCatalog', '正式客户端不应包含 seedCatalog 管理调用'],
    ['CATALOG_FUNCTIONS.seed', '正式客户端不应导出 seed 云函数'],
    ['setStorageSync(\'qbxzs:seed-token\'', '正式客户端不应持久化发布口令'],
    ['getStorageSync(\'qbxzs:seed-token\'', '正式客户端不应读取发布口令']
  ];
  for (const file of clientFiles) {
    const source = read(file);
    for (const [needle, message] of forbidden) {
      if (source.includes(needle)) fail(`${relativePath(file)}：${message}`);
    }
  }
  if (!appSource.includes("removeStorageSync('qbxzs:seed-token')")) {
    warnings.push('App.vue 未清理旧版本遗留的 seed token');
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
checkReleaseSafety();

for (const warning of warnings) console.warn(`⚠ ${warning}`);
if (errors.length) {
  errors.forEach((message) => console.error(`✖ ${message}`));
  throw new Error(`静态校验失败：${errors.length} 项`);
}
console.log(`✔ 静态校验通过：${pages.length} 个页面 / ${routeEntries.length} 条路由 / ${CATALOG_TYPES.length} 类资料`);
