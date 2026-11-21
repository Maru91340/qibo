// 阶段 2.1 图片接入层：把「图鉴类型 + 条目 id + 图片用途」解析为图片候选链。
// 紧凑索引由 scripts/build-image-runtime.mjs 从 image-map.json 生成，只有约 44KB；
// 本模块不 import 2.1MB 的 site-catalogs.json。
// 轮次 12（2026-11-17）图片本地化：候选链第一优先改为 BWIKI 原图本地副本
// （wiki-runtime.json 索引 + /static/wiki/ 图库，H5/dev 可用）；
// AI 生成图槽位（原 src/static/gen）整体摘除留档 assets/gen。
// 阶段 1 上云（2026-11-18）：微信端图库同样剥离（prune-package-assets.mjs），原图档改走
// 云开发存储 cloud:// fileID（<image> 原生支持，基础库 ≥2.2.3；wx.cloud.init 见 services/cloud.js）；
// CLOUD_STORAGE_BASE 未配置时 mp 端该档为空，自动回退热链，构建与发布不受影响。
import runtime from './generated/image-runtime.json';
import wikiRuntime from './generated/wiki-runtime.json';
import { CLOUD_DETAIL_ASSETS_BASE, CLOUD_QIBO_CBT3_BASE, CLOUD_STORAGE_BASE } from '../config/cloud.js';

const CDN = runtime.cdn;
const FILES = runtime.f || [];
const TABLE = runtime.t || {};
const WIKI_TYPES = (wikiRuntime && wikiRuntime.types) || {};
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

// 本地原图（image-map.json 的 images.<用途> 槽位）按用途回退的顺序
const WIKI_ROLE_FALLBACK = {
  icon: ['icon', 'avatar', 'art'],
  avatar: ['avatar', 'icon', 'art'],
  art: ['art', 'avatar', 'icon'],
  portraitM: ['avatar', 'icon'],
  circle: ['icon'],
  card: ['card', 'icon', 'art'],
  poster: ['poster', 'art', 'icon'],
  keyVisual: ['poster', 'art', 'icon']
};

const WIKI_BASE = '/static/wiki/';
const QIBO_CBT3_PATCH_PREFIX = 'qibo-cbt3/';

// 原图档按平台分流：H5/dev 仅服务已打包的 /static/wiki；微信端剥离图库后改走 cloud://。
// qibo-cbt3 是同桶的独立补图目录，不能拼进 images/wiki；H5 不伪造该目录路径，回退既有外链。
let WIKI_PREFIX = WIKI_BASE;
let QIBO_CBT3_PREFIX = '';
// #ifdef MP-WEIXIN
WIKI_PREFIX = CLOUD_STORAGE_BASE && CLOUD_STORAGE_BASE.startsWith('cloud://') ? CLOUD_STORAGE_BASE : '';
QIBO_CBT3_PREFIX = CLOUD_QIBO_CBT3_BASE && CLOUD_QIBO_CBT3_BASE.startsWith('cloud://') ? CLOUD_QIBO_CBT3_BASE : '';
// #endif

// 详情页杂图（技能/资质/灵子等）目录分流：H5 保持 CSXYLIC 热链可用；微信端这些域名未入
// 下载白名单，改走已上传的 cloud:// images/detail-assets/<分类>/<原名>。分类必须与上传目录一致。
const DETAIL_CATEGORY_RULES = [
  [/petupgrade/, '资质图标'],
  [/icons\/skill\//, '技能图标'],
  [/icons\/soulessence/, '灵子'],
  [/icons\/pet\//, '奇波图标'],
  [/icons\/item\//, '物品'],
  [/icons\/enemy\//, '敌人'],
  [/icons\/equip/, '装备'],
  [/icons\/food/, '美食'],
  [/patchwiki\.biligame\.com/, 'BWIKI采集图'],
  [/icons\//, '其他图标']
];
let DETAIL_ASSETS_PREFIX = '';
// #ifdef MP-WEIXIN
DETAIL_ASSETS_PREFIX = CLOUD_DETAIL_ASSETS_BASE && CLOUD_DETAIL_ASSETS_BASE.startsWith('cloud://') ? CLOUD_DETAIL_ASSETS_BASE : '';
// #endif

// 输入 csxylic / patchwiki 完整 URL 或 icons/... 相对路径；微信端转 cloud fileID，
// 其余平台原样返回（H5 热链可用且本地没有 detail-assets 副本）。
export function cloudDetailAsset(input) {
  const raw = String(input || '');
  if (!/^https?:\/\//.test(raw) && !raw.startsWith('icons/')) return raw;
  if (!DETAIL_ASSETS_PREFIX) return raw;
  let path = raw;
  if (/^https?:\/\//.test(raw)) {
    // 微信小程序运行时无 URL 构造器（曾用 new URL 取 pathname，MP 端抛错静默回退热链），手动截取
    path = raw.replace(/^https?:\/\/[^/]+/i, '');
  }
  const fileName = decodeURIComponent(path.split('/').pop() || '');
  if (!fileName) return raw;
  const rule = DETAIL_CATEGORY_RULES.find(([pattern]) => pattern.test(raw) || pattern.test(path));
  return rule ? DETAIL_ASSETS_PREFIX + rule[1] + '/' + fileName : raw;
}

function resolveWikiAsset(rel) {
  if (!rel) return '';
  if (rel.startsWith(QIBO_CBT3_PATCH_PREFIX)) {
    return QIBO_CBT3_PREFIX ? QIBO_CBT3_PREFIX + rel.slice(QIBO_CBT3_PATCH_PREFIX.length) : '';
  }
  return WIKI_PREFIX ? WIKI_PREFIX + rel : '';
}

// 本地/云端原图候选（有序）：H5 命中 /static/wiki，mp 命中对应的 cloud:// 目录；
// 配置或对象不存在时返回空串，候选链直接继续使用 BWIKI / CBT3 回退。
function wikiSources(type, item, role) {
  const table = WIKI_TYPES[type];
  if (!table) return [];
  const id = typeof item === 'object' ? item.id : item;
  const entry = table[id];
  if (!entry) return [];
  const list = [];
  for (const slot of WIKI_ROLE_FALLBACK[role] || [role]) {
    const source = resolveWikiAsset(entry[slot]);
    if (source) list.push(source);
  }
  return list;
}

// 单值取图：按槽位顺序返回第一个原图路径（详情页头图等场景），无则空串
export function wikiSlotImage(type, item, roles = ['icon']) {
  const table = WIKI_TYPES[type];
  const id = typeof item === 'object' ? item.id : item;
  const entry = table && table[id];
  if (!entry) return '';
  for (const slot of Array.isArray(roles) ? roles : [roles]) {
    const source = resolveWikiAsset(entry[slot]);
    if (source) return source;
  }
  return '';
}

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

// 有序候选链：本地原图（/static/wiki）→ 用途新图 CDN 直链 → 同图按需生成地址 → 原有 icon 热链。
// 页面 @error 时逐档切换；全部失败返回空串，由页面渲染等尺寸占位（不改布局）。
export function imageSources(type, item, role = 'icon', fallbackIcon = '', options = {}) {
  const id = typeof item === 'object' ? item.id : item;
  const local = typeof item === 'object' ? wikiSources(type, item, role) : [];
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
  const list = [...local, ...mapped, ...variants, original];
  return [...new Set(list.filter(Boolean))];
}

// 首页公测主视觉：原图档（H5 本地 / mp 云存储，见 WIKI_PREFIX）优先，CDN 缩略图兜底
export function keyVisualSources() {
  const list = [];
  if (WIKI_PREFIX && wikiRuntime && wikiRuntime.keyVisual) list.push(WIKI_PREFIX + wikiRuntime.keyVisual);
  const kv = runtime.k;
  if (kv && typeof kv.f === 'number') {
    const width = widthOf('keyVisual', {}, kv.f);
    list.push(thumbUrl(kv.f, width), redirectUrl(kv.f, width));
  }
  return [...new Set(list.filter(Boolean))];
}

export function keyVisualMeta() {
  const kv = runtime.k;
  return kv ? { width: kv.w, height: kv.h, asset: kv.asset, source: kv.source } : null;
}
