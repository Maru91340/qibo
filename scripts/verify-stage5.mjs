// 阶段 5（5.1 H07 / 5.2 H08 / 5.3 深色硬编码色）静态核验。
// 只做源码锚点、字号下限、sRGB 对比度实算、全站硬编码色只读排查与构建产物锚点。
// 不代表 H5 运行 / 微信开发者工具 / 真机 / 视觉 / 交互 / T01-T12 通过。
// 用法：node scripts/verify-stage5.mjs
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => (existsSync(join(root, rel))
  ? readFileSync(join(root, rel), 'utf8').replace(/\r\n/g, '\n')
  : '');

const checks = [];
let failed = 0;
function expect(ok, label, detail = '') {
  checks.push({ label, ok: Boolean(ok), detail });
  if (!ok) failed += 1;
}
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');

const HOME = 'src/pages/index/index.vue';
const home = read(HOME);
const styleRaw = home.slice(home.lastIndexOf('<style>'));
const style = stripComments(styleRaw);
const tpl = (() => {
  const start = home.indexOf('<template>');
  const end = home.lastIndexOf('</template>');
  return start >= 0 && end > start ? home.slice(start, end).replace(/<!--[\s\S]*?-->/g, '') : '';
})();
const theme = read('src/styles/theme.css');
const themeSha256 = createHash('sha256').update(readFileSync(join(root, 'src/styles/theme.css'))).digest('hex');
expect(home.length > 0 && style.length > 0 && theme.length > 0, '首页与全局主题文件可读');

// ---- sRGB 相对亮度与对比度（方案 1.2 口径） ----
function luminance(hex) {
  const s = hex.replace('#', '');
  const full = s.length === 3 ? s.split('').map((c) => c + c).join('') : s;
  const lin = [0, 2, 4].map((i) => {
    const c = parseInt(full.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}
function contrast(fg, bg) {
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
const round2 = (n) => Math.round(n * 100) / 100;

// ---- 5.1 / H07：单主色，去多色渐变、金色分页、橙/红/绿强调与浮起阴影 ----
const purple = ['#262c54', '#413a86', '#6a4bb8', '#7f5bff'];
for (const c of purple) {
  expect(!styleRaw.includes(c), `5.1 首页不再使用紫色系强调色 ${c}`);
}
const warmOrStatus = ['#d9841f', '#c77700', '#a06b00', '#e8c15a', '#ffb45c', '#c93b3b', '#16813f', '#55d98a', '#f8837b', '#ffd700', '#f0b90b'];
for (const c of warmOrStatus) {
  expect(!styleRaw.includes(c), `5.1 首页不再出现暖色/状态色强调 ${c}`);
}
for (const token of ['var(--warn', 'var(--danger', 'var(--ok', 'var(--reward', 'var(--warn-ink']) {
  expect(!style.includes(token), `5.1 首页不混用状态色变量 ${token}`);
}
expect(!/linear-gradient/.test(style), '5.1 首页静态样式已无多色渐变');
expect(!/box-shadow/.test(style), '5.1 静态内容卡不添加浮起阴影');
expect(/\.home \.hero \{[\s\S]{0,180}background: var\(--card-bg\)/.test(style), '5.1 主视觉显式固定卡片底，不受全局渐变影响');
expect(/background: #1f3d9e/.test(style), '5.1 图片位占位底改为单主蓝（复用 --brand-deep 浅色值）');
expect(/background: var\(--brand\)/.test(style) && !/background: var\(--brand-deep\)/.test(style), '5.1 行为色只用主蓝，无第二种彩色行为面');
expect(!/indicator-active-color/.test(tpl) && !/indicator-color/.test(tpl), '5.1 模板无金色/彩色分页指示（4.5 回归）');
expect(!/opacity: 0\.85/.test(style), '5.1 / 5.2 快捷名称不再靠透明度压低对比度');

// ---- 5.2 / H08：字号下限与低对比色收敛 ----
const rules = [...style.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
  selector: m[1].trim().replace(/\s+/g, ' '),
  body: m[2]
}));
const fontOf = (selector) => {
  const rule = rules.find((r) => r.selector === selector);
  const m = rule && rule.body.match(/font-size:\s*(\d+)rpx/);
  return m ? Number(m[1]) : null;
};
const BODY_SELECTORS = [
  '.hero__title', '.hero__cta', '.feature__title', '.feature__name',
  '.quick-cell__title', '.row-cell__title', '.tools-dir__title', '.tools-dir__name',
  '.starter__title', '.starter__name'
];
const NOTE_SELECTORS = [
  '.hero__tag', '.hero__desc', '.hero__fallback-desc', '.hero__retry',
  '.feature__more', '.row-cell__tag', '.preview-tip', '.tools-dir__close',
  '.starter__more', '.starter__desc', '.home .footnote', '.home .cx-notice__text, .home .cx-notice__more'
];
const DECOR_SELECTORS = [
  '.hero__fallback-title', '.feature__badge', '.quick-cell__emoji',
  '.tools-dir__arrow', '.starter__arrow', '.cx-notice__icon'
];
const fontRules = [];
for (const r of rules) {
  const m = r.body.match(/font-size:\s*(\d+)rpx/);
  if (m) fontRules.push({ selector: r.selector, rpx: Number(m[1]) });
}
for (const sel of BODY_SELECTORS) {
  const px = fontOf(sel);
  expect(px !== null && px >= 28, `5.2 [${sel}] 正文/名称 ≥28rpx（约 14px）`, px === null ? '缺失' : `${px}rpx ≈ ${round2(px * 390 / 750)}px`);
}
for (const sel of NOTE_SELECTORS) {
  const px = fontOf(sel);
  expect(px !== null && px >= 24, `5.2 [${sel}] 说明文字 ≥24rpx（约 12px）`, px === null ? '缺失' : `${px}rpx ≈ ${round2(px * 390 / 750)}px`);
}
const decorSet = new Set(DECOR_SELECTORS);
const tooSmall = fontRules.filter((r) => !decorSet.has(r.selector) && !BODY_SELECTORS.includes(r.selector) && !NOTE_SELECTORS.includes(r.selector) && r.rpx < 24);
expect(tooSmall.length === 0, '5.2 首页所有文本规则均不低于 24rpx', JSON.stringify(tooSmall));
expect(!style.includes('var(--ink-3)'), '5.2 首页不再使用低对比三级文字色 --ink-3');
expect(/\.home \.footnote \{[\s\S]{0,120}color: var\(--ink-2\)[\s\S]{0,80}font-size: 24rpx/.test(style), '5.2 全局页脚在首页局部覆写为二级色 + 24rpx');
expect(/\.home \.cx-notice__text,[\s\S]{0,80}font-size: 26rpx/.test(style), '5.2 公告文案在首页局部提到 26rpx');
expect(/\.page \{[\s\S]{0,140}padding: 0 24rpx 48rpx/.test(theme), '5.2 theme.css 全局 .page 保持原样（共享样式零改动）');
expect(/--ink-3: #97a0b5/.test(theme) && /--ink-2: #5a6480/.test(theme), '5.2 全局语义色变量保持原值（首页局部覆写，不动全局）');

// 对比度实算：浅色/深色正文与次要文字、主按钮白字、主视觉回退白字
const contrastCases = [
  { label: '浅色正文 / 白卡', fg: '#1a2138', bg: '#ffffff', min: 4.5 },
  { label: '浅色正文 / 页面底', fg: '#1a2138', bg: '#f3f5fb', min: 4.5 },
  { label: '浅色次要 / 白卡', fg: '#5a6480', bg: '#ffffff', min: 4.5 },
  { label: '浅色次要 / 页面底', fg: '#5a6480', bg: '#f3f5fb', min: 4.5 },
  { label: '浅色次要 / 浅底 chip', fg: '#5a6480', bg: '#f2f4f9', min: 4.5 },
  { label: '深色正文 / 深卡', fg: '#e9edf8', bg: '#1c2233', min: 4.5 },
  { label: '深色次要 / 深卡', fg: '#aab4cd', bg: '#1c2233', min: 4.5 },
  { label: '深色次要 / 深底 chip', fg: '#aab4cd', bg: '#232b40', min: 4.5 },
  { label: '深色次要 / 页面底', fg: '#aab4cd', bg: '#131722', min: 4.5 },
  { label: '主按钮白字 / 主蓝', fg: '#ffffff', bg: '#2f6bff', min: 4.5 },
  { label: '主视觉回退白字 / 单主蓝占位底', fg: '#ffffff', bg: '#1f3d9e', min: 4.5 }
];
const contrastTable = contrastCases.map((c) => ({ ...c, ratio: round2(contrast(c.fg, c.bg)) }));
for (const c of contrastTable) {
  expect(c.ratio >= c.min, `5.2 对比度 [${c.label}] ≥${c.min}:1`, `${c.ratio}:1`);
}
const legacyRatio = round2(contrast('#97a0b5', '#ffffff'));
expect(legacyRatio < 4.5, '5.2 整改前三级色确属低对比（对照，不作为通过项）', `${legacyRatio}:1`);

// ---- 5.3 / 深色硬编码色：首页局部修复 + 全站只读排查 ----
expect(!/#333|#d9841f|#d8dce6/.test(styleRaw), '5.3 首页无深色固定字 / 橙色标题 / 旧深色覆写色');
expect(!/\.theme-dark[^{}]*\{[^}]*color:\s*#/.test(style), '5.3 首页无 .theme-dark 下写死的文字色');
// (?<![-\w]) 排除 --td-brand-color 之类自定义属性，避免把变量定义误报为文字色声明
const fixedTextColors = [...style.matchAll(/(?<![-\w])color:\s*(#[0-9a-fA-F]{3,8})\b/g)].map((m) => m[1].toLowerCase());
expect(fixedTextColors.length > 0 && fixedTextColors.every((c) => c === '#fff' || c === '#ffffff'),
  '5.3 首页固定文字色只剩白色，且只用于固定深蓝/主蓝底容器', JSON.stringify([...new Set(fixedTextColors)]));
expect(/color: #ffffff/.test(style) || /color: #fff/.test(style), '5.3 回退说明文字已由半透明白改为不透明白');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(vue|css)$/.test(name)) out.push(p);
  }
  return out;
}
function styleOf(p, s) {
  if (p.endsWith('.css')) return s;
  const i = s.lastIndexOf('<style');
  const gt = s.indexOf('>', i);
  const j = s.lastIndexOf('</style>');
  return i >= 0 && j > gt ? s.slice(gt + 1, j) : '';
}
// 只读排查：全站 .theme-dark 规则里写死的文字色，以及常见深色固定字
const darkHardcoded = [];
const fixedInkHardcoded = [];
let scannedFiles = 0;
for (const p of walk(join(root, 'src'))) {
  const s = readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
  const css = stripComments(styleOf(p, s));
  if (!css) continue;
  scannedFiles += 1;
  const rel = relative(root, p).replaceAll('\\', '/');
  const darkBlocks = [...css.matchAll(/\.theme-dark[^{}]*\{([^{}]*)\}/g)].map((m) => m[1]);
  const darkColors = darkBlocks.flatMap((b) => [...b.matchAll(/(?<![-\w])color:\s*(#[0-9a-fA-F]{3,8})\b/g)].map((x) => x[1]));
  if (darkColors.length) darkHardcoded.push({ file: rel, count: darkColors.length, colors: [...new Set(darkColors)].slice(0, 6) });
  const fixed = [...css.matchAll(/(?<![-\w])color:\s*#(?:333|000|1a1a1a|222|444|555|666)\b/gi)].length;
  if (fixed) fixedInkHardcoded.push({ file: rel, count: fixed });
}
const homeDark = darkHardcoded.find((x) => x.file === 'src/pages/index/index.vue');
expect(!homeDark, '5.3 首页不在全站深色硬编码文字色清单中', homeDark ? JSON.stringify(homeDark) : '0 条');
expect(!fixedInkHardcoded.some((x) => x.file === 'src/pages/index/index.vue'), '5.3 首页无 #333/#000 一类固定深字');
expect(scannedFiles > 30, '5.3 全站只读排查覆盖 src 下样式文件', `${scannedFiles} 个文件`);
const hardcodeSummary = {
  scannedFiles,
  darkHardcodedFiles: darkHardcoded.length,
  darkHardcodedDeclarations: darkHardcoded.reduce((n, x) => n + x.count, 0),
  darkHardcodedTop: darkHardcoded.sort((a, b) => b.count - a.count).slice(0, 12),
  fixedInkFiles: fixedInkHardcoded.length,
  fixedInkDeclarations: fixedInkHardcoded.reduce((n, x) => n + x.count, 0),
  fixedInkTop: fixedInkHardcoded.sort((a, b) => b.count - a.count).slice(0, 12),
  note: '只读排查，未修改其他页面；修复范围需用户确认（待确认 #30）'
};

// ---- 构建产物锚点（仍属静态检查） ----
const DIST = 'dist/build/mp-weixin';
const distWxssPath = join(root, DIST, 'pages/index/index.wxss');
const hasDist = existsSync(distWxssPath);
// 产物比源码旧说明本轮改动尚未构建，锚点检查应跳过而不是误判为失败（构建后复跑才有效）
const distFresh = hasDist && statSync(distWxssPath).mtimeMs >= statSync(join(root, HOME)).mtimeMs;
const distWxss = distFresh ? read(`${DIST}/pages/index/index.wxss`) : '';
const distAnchors = { present: distFresh, stale: hasDist && !distFresh };
if (distWxss) {
  expect(/\.page\.home/.test(distWxss), '[产物] 首页局部限定类进入 wxss');
  expect(!/#d8dce6/.test(distWxss) && !/#6a4bb8/.test(distWxss), '[产物] 旧深色固定字与紫色渐变不再进入首页 wxss');
  expect(!/var\(--ink-3\)/.test(distWxss), '[产物] 首页 wxss 不再引用低对比三级色');
  expect(/font-size:\s*28rpx/.test(distWxss), '[产物] 正文下限字号进入首页 wxss');
  expect(!/box-shadow/.test(distWxss), '[产物] 首页 wxss 无浮起阴影');
  distAnchors.homeWxssBytes = Buffer.byteLength(distWxss);
  const appWxss = read(`${DIST}/app.wxss`);
  expect(/--ink-3:\s*#97a0b5/.test(appWxss), '[产物] 全局主题变量保持原值（未顺手重排其他页面）');
} else {
  console.log(distAnchors.stale
    ? 'ℹ dist 首页 wxss 早于本轮源码改动，产物陈旧，跳过锚点检查（本轮构建后复跑）'
    : 'ℹ 未发现 dist/build/mp-weixin 首页 wxss，跳过构建产物锚点检查（本轮需在构建后复跑）');
}

// ---- 输出 ----
for (const check of checks) console.log(`${check.ok ? '✔' : '✖'} ${check.label}${check.detail ? ` · ${check.detail}` : ''}`);
mkdirSync(join(root, '.tmp'), { recursive: true });
const outFile = join(root, '.tmp', 'stage5-verify.json');
writeFileSync(outFile, JSON.stringify({
  generatedAt: new Date().toISOString(),
  scope: 'static-code-and-contrast-math-only',
  passed: checks.length - failed,
  total: checks.length,
  failed,
  themeSha256,
  contrastTable,
  legacyRatio,
  fontRules,
  hardcodeSummary,
  distAnchors,
  checks
}, null, 2));
console.log(`\n阶段 5 静态核验：${checks.length - failed}/${checks.length} 通过；产物 ${outFile.replaceAll('\\', '/')}`);
console.log(`theme.css sha256：${themeSha256}`);
console.log(`全站只读排查：${scannedFiles} 个样式文件，深色硬编码文字色 ${hardcodeSummary.darkHardcodedFiles} 文件 / ${hardcodeSummary.darkHardcodedDeclarations} 条，固定深字 ${hardcodeSummary.fixedInkFiles} 文件 / ${hardcodeSummary.fixedInkDeclarations} 条（均未修改，见 #30）`);
console.log('注意：以上仅为静态代码检查、字号下限与 sRGB 对比度实算；H5 运行 / 微信开发者工具 / 真机 / 浅深色实拍 / 视觉 / 交互 / T01-T12 均「未能验证」。');
if (failed) process.exit(1);
