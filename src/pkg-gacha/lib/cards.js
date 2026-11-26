// 抽卡模拟 · 卡面与元素图标：把「记录条目」翻译成可用的图片地址与展示字段。
// 素材缺失一律返回空串，由页面画首字色块兜底（与设计稿 faceHtml 一致）。
import { ART_ROLE, ART_SOUL } from './pools.js';
import { gachaAsset } from './assets.js';
import { CHAR_INFO } from '@/data/gacha/char-info.js';
import { ELEMENT_ICONS } from '@/data/element-icons.js';

/** 元素中文 → 图标 key（与 src/data/element.js 一致）。 */
const ELEMENT_KEYS = {
  火: 'flame',
  风: 'wind',
  地: 'earth',
  木: 'grove',
  冰: 'frost',
  水: 'flow',
  雷: 'bolt',
  光: 'astral',
  暗: 'dark'
};

/** 五星召唤大立绘：素材按角色名归档，个别名字与文件名不一致。 */
const BIG_ALIAS = {
  璐璐卡: '露露卡',
  姬瑟贝露: '妮瑟贝露'
};

/** 角色立绘 ID（十连竖板 / 单抽大卡）：来自 pools.js 的 ART_ROLE。 */
export function charArtId(name) {
  return ART_ROLE[name] || '';
}

/** 记录卡面（历史页 / 分享图）：角色取立绘缩略图，灵子取卡面图。 */
export function cardArt(item) {
  if (!item) return '';
  if (item.kind === '角色') {
    const id = ART_ROLE[item.name];
    return id ? gachaAsset('gacha-assets/card/char-' + id + '.webp') : '';
  }
  const key = ART_SOUL[item.name];
  return key ? gachaAsset('gacha-assets/card/soul-' + key + '.webp') : '';
}

/** 竖板立绘（满幅镜头）：角色走 flip/<id>，灵子走卡面图。 */
export function slabArt(item) {
  if (!item) return '';
  if (item.kind === '角色') {
    const id = ART_ROLE[item.name];
    return id ? gachaAsset('gacha-assets/flip/' + id + '.webp') : '';
  }
  const key = ART_SOUL[item.name];
  return key ? gachaAsset('gacha-assets/card/soul-' + key + '.webp') : '';
}

/** 五星召唤立绘：优先 big/<名字>，涂山小玉单独一张抠图，灵子用卡面图。 */
export function summonArt(item) {
  if (!item) return '';
  if (item.kind === '角色') {
    if (item.name === '涂山小玉') return gachaAsset('gacha-assets/tushan-xiaoyu-cutout.webp');
    const file = BIG_ALIAS[item.name] || item.name;
    return gachaAsset('gacha-assets/big/' + file + '.webp') || slabArt(item);
  }
  return slabArt(item);
}

/** 角色定位与元素：数据来自 catalogs.json 的派生表，查不到时返回空字段。 */
export function traitOf(name) {
  const info = CHAR_INFO[name];
  if (!info) return { role: '', elements: [], summary: '' };
  return {
    role: info.role || '',
    elements: (info.elements || []).map((label) => ({ label, icon: ELEMENT_ICONS[ELEMENT_KEYS[label]] || '' })),
    summary: info.summary || ''
  };
}

/** 卡池色的软背景：用于结果页与召唤页的氛围底色。 */
export function tintOf(pool) {
  return {
    accent: (pool && pool.accent) || '#88739c',
    soft: (pool && pool.soft) || '#eee9f2'
  };
}
