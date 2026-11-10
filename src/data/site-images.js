// 阶段 2.1 图片接入层：把「图鉴类型 + 条目 id + 图片用途」解析为 BWIKI 图片直链。
// 紧凑索引由 scripts/build-image-runtime.mjs 从 image-map.json 生成，只有约 44KB；
// 本模块不 import 2.1MB 的 site-catalogs.json，也不引用 src/assets/wiki 下 1535 张 WebP。
// 现有 catalog.js 的 icon 热链保持原样，seed 修订号与 CATALOG_VERSION 不受影响。
import runtime from './generated/image-runtime.json';

const CDN = runtime.cdn;
const FILES = runtime.f || [];
const TABLE = runtime.t || {};
// 站点按需缩略图跳转：patchwiki CDN 只提供已缓存的宽度，未缓存时由此接口生成后 302 到直链
const REDIRECT = 'https://wiki.biligame.com/ap/index.php?title=Special:Redirect/file/';

// 用途 → 映射表单字符键（与 build-image-runtime.mjs 的 ROLE_CODE 一致）
const ROLE_CODE = {
  icon: 'i', avatar: 'a', art: 'r', portraitM: 'm', circle: 'o',
  card: 'c', poster: 'p', keyVisual: 'k'
};

// 各用途首选宽度（按 5.3 展示尺寸选取）；实际可用性由候选链兜底，不假设 CDN 已缓存
const WIDTH = {
  icon: 200, avatar: 240, art: 720, portraitM: 240, circle: 100,
  card: 320, poster: 480, keyVisual: 480
};

export const IMAGE_RUNTIME_VERSION = runtime.v || '';

// 内置子集把 icon 压成相对路径，云端全量是完整 URL；两种形态都统一成可请求的绝对地址
function absoluteIcon(icon) {
  const raw = String(icon || '');
  if (!raw) return '';
  if (/^https?:\/\//.test(raw)) return raw;
  return CDN + raw.replace(/^\/+/, '');
}

// 由文件池下标拼指定宽度的 CDN 缩略图直链；中文文件名需按 MediaWiki 口径 URL 编码
export function thumbUrl(fileIndex, width) {
  const file = FILES[fileIndex];
  if (!file) return '';
  return `${CDN}thumb/${file[0]}/${Number(width) || 120}px-${encodeURIComponent(file[1])}`;
}

// 同一文件的按需生成地址：CDN 未缓存该宽度时，先经站点生成再 302 回 CDN 直链
export function redirectUrl(fileIndex, width) {
  const file = FILES[fileIndex];
  if (!file) return '';
  return `${REDIRECT}${encodeURIComponent(file[1])}&width=${Number(width) || 120}`;
}

// 2.4：现有 icon 本就是 BWIKI 缩略图直链（.../thumb/<哈希>/<宽度>px-<文件名>）。
// 物品/灵子/装备/料理/书籍等类型的 images.icon 已在运行数据里齐备，不必把上千条 URL
// 再写进运行时映射；这里从原 URL 解析哈希与文件名，按展示用途换宽度，原 URL 恒作兜底。
export function legacySources(icon, widths = []) {
  const raw = absoluteIcon(icon);
  const match = raw.match(/\/thumb\/([0-9a-f]\/[0-9a-f]{2}\/[^/?#]+)\/\d+px-([^/?#]+)$/i);
  const list = [];
  if (match) {
    for (const width of widths) {
      const w = Number(width);
      if (!w) continue;
      list.push(`${CDN}thumb/${match[1]}/${w}px-${match[2]}`);
      list.push(`${REDIRECT}${match[2]}&width=${w}`);
    }
  }
  list.push(raw);
  return [...new Set(list.filter(Boolean))];
}

// 取某个「类型/条目/用途」映射到的文件池下标；无映射返回 -1（调用方走原有 icon 或占位）
export function imageFileIndex(type, id, role) {
  const entry = TABLE[type] && TABLE[type][id];
  if (!entry) return -1;
  const index = entry[ROLE_CODE[role] || role];
  return typeof index === 'number' ? index : -1;
}

function widthOf(role, options, index) {
  const requested = options && options.widths;
  const first = Array.isArray(requested) ? requested[0] : requested;
  const width = Number(first) || WIDTH[role] || 120;
  // 不超过该原图的变体宽度（如 336px 的中号头像不能请求 720px 缩略图）
  const cap = Number(FILES[index] && FILES[index][2]) || 0;
  return cap > 0 ? Math.min(width, cap) : width;
}

// 首选单张图片（无映射时返回原有 icon，保持旧行为）
export function getImage(type, id, role, fallbackIcon = '', options = {}) {
  const index = imageFileIndex(type, id, role);
  return index >= 0 ? thumbUrl(index, widthOf(role, options, index)) : absoluteIcon(fallbackIcon);
}

// 有序候选链：用途新图 CDN 直链 → 同图按需生成地址 → 原有 icon 热链。
// 页面 @error 时逐档切换；全部失败返回空串，由页面渲染等尺寸占位（不改布局）。
// preferMapped=false 把原有 icon 放首位，用于「图本身没错、只是要更稳妥显示」的列表页。
export function imageSources(type, id, role = 'icon', fallbackIcon = '', options = {}) {
  const index = imageFileIndex(type, id, role);
  const width = widthOf(role, options, index);
  const mapped = [];
  if (index >= 0) {
    mapped.push(thumbUrl(index, width));
    mapped.push(redirectUrl(index, width));
  }
  // legacyWidths：同一张原图的其他展示宽度（不新增映射数据），原 icon 恒为最后一档
  const legacy = legacySources(fallbackIcon, options.legacyWidths || []);
  const original = legacy[legacy.length - 1] || '';
  const variants = legacy.slice(0, -1);
  const list = options.preferMapped === false
    ? [original, ...mapped, ...variants]
    : [...mapped, ...variants, original];
  return [...new Set(list.filter(Boolean))];
}

// 首页公测主视觉：阶段 4 使用，本轮只提供入口，不在页面渲染
export function keyVisualSources() {
  const kv = runtime.k;
  if (!kv || typeof kv.f !== 'number') return [];
  const width = widthOf('keyVisual', {}, kv.f);
  return [thumbUrl(kv.f, width), redirectUrl(kv.f, width)];
}

export function keyVisualMeta() {
  const kv = runtime.k;
  return kv ? { width: kv.w, height: kv.h, asset: kv.asset, source: kv.source } : null;
}
