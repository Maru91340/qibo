// 图标导出：docs/icon-set/*.svg → src/static/icons/<key>.png（128×128 透明底）
//
// 微信小程序 image 组件不支持本地 SVG，设计稿必须栅格化后才能进入小程序包。
// 本脚本用系统 Chrome/Edge 无头模式渲染（与设计验收时同一内核，保证像素一致），
// 不引入 sharp/resvg 等原生依赖，也规避它们对 SVG <style> CSS 变量支持不完整的问题。
//
// 用法：
//   npm run icons                 # 重新导出全部图标
//   npm run icons -- spirit search # 只重新导出指定板块（改单枚图标后用）
//
// 环境变量：
//   ICON_EXPORT_BROWSER  指定浏览器可执行文件路径（默认自动探测 Chrome → Edge）
//   ICON_EXPORT_SIZE     输出尺寸，默认 128

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_DIR = join(projectRoot, 'docs', 'icon-set');
const OUTPUT_DIR = join(projectRoot, 'src', 'static', 'icons');
const SIZE = Number(process.env.ICON_EXPORT_SIZE || 128);

// Chrome/Edge 常见安装路径；SVG 使用 <style> + CSS 变量，必须用 Blink 内核渲染
const BROWSER_CANDIDATES = [
  process.env.ICON_EXPORT_BROWSER,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
].filter(Boolean);

function findBrowser() {
  for (const candidate of BROWSER_CANDIDATES) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error('未找到 Chrome/Edge，可用环境变量 ICON_EXPORT_BROWSER 指定浏览器路径');
}

// PNG 头校验：IHDR 宽高必须等于目标尺寸，防止截到空白帧
function pngSize(buffer) {
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function renderIcon(browser, workDir, key) {
  const wrapFile = join(workDir, `${key}.html`);
  const shotFile = join(workDir, `${key}.png`);
  const svgUrl = `file:///${SOURCE_DIR.replaceAll('\\', '/')}/${key}.svg`;
  writeFileSync(
    wrapFile,
    `<!DOCTYPE html><html><head><meta charset="utf-8"><style>`
    + `*{margin:0;padding:0}html,body{width:${SIZE}px;height:${SIZE}px;background:transparent}`
    + `img{display:block;width:${SIZE}px;height:${SIZE}px}</style></head>`
    + `<body><img src="${svgUrl}"></body></html>`
  );
  const result = spawnSync(browser, [
    '--headless',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${join(workDir, '.profile')}`,
    '--default-background-color=00000000',
    `--window-size=${SIZE},${SIZE}`,
    '--hide-scrollbars',
    '--virtual-time-budget=3000',
    `--screenshot=${shotFile}`,
    `file:///${wrapFile.replaceAll('\\', '/')}`
  ], { timeout: 30000 });
  if (!existsSync(shotFile) || statSync(shotFile).size < 512) {
    throw new Error(`浏览器未输出有效截图（stderr: ${String(result.stderr || '').slice(0, 200)}）`);
  }
  const png = readFileSync(shotFile);
  const { width, height } = pngSize(png);
  if (width !== SIZE || height !== SIZE) {
    throw new Error(`尺寸不符：期望 ${SIZE}，实际 ${width}x${height}`);
  }
  return png;
}

const wanted = process.argv.slice(2);
const keys = (wanted.length
  ? readdirSync(SOURCE_DIR)
      .filter((file) => file.endsWith('.svg'))
      .map((file) => file.replace(/\.svg$/, ''))
      .filter((key) => wanted.includes(key))
  : readdirSync(SOURCE_DIR)
      .filter((file) => file.endsWith('.svg'))
      .map((file) => file.replace(/\.svg$/, ''))
).sort();

if (!keys.length) {
  console.error(`未找到匹配的 SVG：${wanted.join(', ') || SOURCE_DIR}`);
  process.exit(1);
}

const browser = findBrowser();
const workDir = join(tmpdir(), 'qbxzs-icon-export');
rmSync(workDir, { recursive: true, force: true });
mkdirSync(workDir, { recursive: true });
mkdirSync(OUTPUT_DIR, { recursive: true });

let totalBytes = 0;
const failures = [];
for (const key of keys) {
  try {
    const png = renderIcon(browser, workDir, key);
    writeFileSync(join(OUTPUT_DIR, `${key}.png`), png);
    totalBytes += png.length;
    console.log(`✔ ${key}.png  ${SIZE}x${SIZE}  ${(png.length / 1024).toFixed(1)} KiB`);
  } catch (error) {
    failures.push(key);
    console.error(`✖ ${key}: ${error.message}`);
  }
}
rmSync(workDir, { recursive: true, force: true });

if (failures.length) {
  console.error(`\n导出失败 ${failures.length} 枚：${failures.join(', ')}`);
  process.exit(1);
}
console.log(`\n✔ 已导出 ${keys.length} 枚图标到 ${OUTPUT_DIR}（合计 ${(totalBytes / 1024).toFixed(1)} KiB）`);
