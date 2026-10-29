const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const NPM_DIR = path.join(ROOT, 'miniprogram_npm');
const IGNORED = new Set(['node_modules', '.git', 'miniprogram_npm']);
const problems = [];
const notes = [];

function fail(file, message) {
  problems.push(`${path.relative(ROOT, file)}: ${message}`);
}

function projectFiles(ext) {
  const found = [];
  const stack = [ROOT];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORED.has(entry.name)) stack.push(full);
      } else if (entry.name.endsWith(ext)) {
        found.push(full);
      }
    }
  }
  return found.sort();
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    fail(file, `JSON 解析失败 ${err.message}`);
    return null;
  }
}

const appJson = readJson(path.join(ROOT, 'app.json')) || {};
const pages = appJson.pages || [];

pages.forEach((page) => {
  const base = path.join(ROOT, page);
  ['.js', '.json', '.wxml'].forEach((ext) => {
    if (!fs.existsSync(base + ext)) fail(base + ext, '页面文件缺失');
  });
  if (!fs.existsSync(base + '.wxss')) notes.push(`${page} 无 wxss（可选）`);
});

function resolveComponent(fromFile, raw) {
  if (raw.startsWith('/')) return path.join(ROOT, raw.slice(1));
  if (raw.startsWith('.')) return path.resolve(path.dirname(fromFile), raw);
  return path.join(NPM_DIR, raw);
}

projectFiles('.json').forEach((file) => {
  const json = readJson(file);
  if (!json) return;
  const using = json.usingComponents || {};
  Object.keys(using).forEach((name) => {
    const target = resolveComponent(file, using[name]);
    if (!fs.existsSync(`${target}.wxml`) || !fs.existsSync(`${target}.js`)) {
      fail(file, `组件 ${name} -> ${using[name]} 未构建，检查 miniprogram_npm 或执行 npm run build:npm`);
    }
  });
});

const declaredPages = new Set(pages);

function underNpm(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) underNpm(full, out);
    else if (/\.(js|json)$/.test(entry.name)) out.push(full);
  }
  return out;
}

let npmRefs = 0;
underNpm(NPM_DIR).forEach((file) => {
  const text = fs.readFileSync(file, 'utf8');
  for (const match of text.matchAll(/["'](\.{1,2}\/[^"']+)["']/g)) {
    npmRefs += 1;
    const target = path.resolve(path.dirname(file), match[1]);
    const resolved = [target, `${target}.js`, `${target}.json`, `${target}.wxml`].some(
      (p) => fs.existsSync(p) && fs.statSync(p).isFile()
    );
    if (!resolved) fail(file, `组件内部引用缺失: ${match[1]}，重跑 npm run build:npm`);
  }
});

function checkRoute(file, url) {
  const clean = String(url).split('?')[0].replace(/^\//, '');
  if (!clean || clean.includes('${') || clean.includes('{{')) return;
  if (!declaredPages.has(clean)) fail(file, `路由未在 app.json 注册: ${url}`);
}

const VOID_TAGS = new Set(['input', 'textarea', 'image', 'icon', 'progress', 'slider', 'switch', 'import', 'include', 'wxs', 'slot', 'br', 'audio', 'video', 'canvas', 'camera', 'live-player', 'navigator']);

function checkTags(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const stack = [];
  const pattern = /<(\/?)([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;
  for (const match of text.matchAll(pattern)) {
    const [, slash, tag, attrs, selfClosed] = match;
    if (selfClosed === '/' || VOID_TAGS.has(tag)) continue;
    if (slash === '/') {
      const last = stack.pop();
      if (!last) fail(file, `多余的闭合标签 </${tag}>`);
      else if (last !== tag) fail(file, `标签未正确闭合：<${last}> 遇到 </${tag}>`);
    } else {
      stack.push(tag);
    }
  }
  stack.forEach((tag) => fail(file, `标签未闭合 <${tag}>`));
}

projectFiles('.wxml').forEach((file) => {
  checkTags(file);
  const text = fs.readFileSync(file, 'utf8');
  for (const match of text.matchAll(/\b(?:bind|catch)[:_-]?[a-zA-Z-]*\s*=\s*"([^"{}]+)"/g)) {
    const handler = match[1];
    const jsFile = file.replace(/\.wxml$/, '.js');
    if (!fs.existsSync(jsFile)) continue;
    if (!new RegExp(`(^|[\\s,{])${handler}\\s*\\(`).test(fs.readFileSync(jsFile, 'utf8'))) {
      fail(file, `事件处理函数 ${handler} 未在 ${path.basename(jsFile)} 中定义`);
    }
  }
  for (const match of text.matchAll(/(?:url|path)\s*=\s*"\/(pages\/[^"{}]*)"/g)) {
    checkRoute(file, match[1]);
  }
});

projectFiles('.js').forEach((file) => {
  const text = fs.readFileSync(file, 'utf8');
  if (file.startsWith(NPM_DIR)) return;
  try {
    new vm.Script(text, { filename: file });
  } catch (err) {
    fail(file, `语法错误 ${err.message}`);
  }
  for (const match of text.matchAll(/require\(['"]([^'"]+)['"]\)/g)) {
    const raw = match[1];
    if (!raw.startsWith('.')) continue;
    const target = path.resolve(path.dirname(file), raw);
    const ok = [target, `${target}.js`, path.join(target, 'index.js')].some((p) => fs.existsSync(p) && fs.statSync(p).isFile());
    if (!ok) fail(file, `require 路径不存在: ${raw}`);
  }
  for (const match of text.matchAll(/wx\.(?:navigateTo|redirectTo|switchTab|reLaunch)\(\{\s*url:\s*[`'"]\/(pages\/[^`'"?{}]*)/g)) {
    checkRoute(file, match[1]);
  }
  for (const match of text.matchAll(/[`'"]\/(pages\/[a-zA-Z0-9/_-]+)(?:\?[^`'"]*)?[`'"]/g)) {
    checkRoute(file, match[1]);
  }
});

const config = readJson(path.join(ROOT, 'project.config.json'));
if (config && !config.appid) fail(path.join(ROOT, 'project.config.json'), '缺少 appid');
if (config && config.appid !== 'wx76c07a501ca942a0') fail(path.join(ROOT, 'project.config.json'), `appid 不匹配: ${config.appid}`);

const npmSize = fs.existsSync(NPM_DIR)
  ? projectFilesAll(NPM_DIR).reduce((sum, file) => sum + fs.statSync(file).size, 0)
  : 0;

function projectFilesAll(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else out.push(full);
    }
  }
  return out;
}

console.log(`页面 ${pages.length} 个 | miniprogram_npm ${(npmSize / 1024).toFixed(0)} KB / 内部引用 ${npmRefs} 条`);
notes.forEach((note) => console.log(`  · ${note}`));
if (problems.length) {
  console.log(`\n发现 ${problems.length} 个问题:`);
  problems.forEach((p) => console.log(`  ✗ ${p}`));
  process.exit(1);
}
console.log('\n校验通过：页面注册、组件路径、路由、事件绑定与 JS 语法一致。');
