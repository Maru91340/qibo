// 灵子战斗数据（collect-cbt3-soulessence.mjs 从 ap-cbt3.csxylic.com 采集解析）：
// B/S 版图标 / 星级 / 职业 / 获取与分解 / Lv1-100 四维属性 / Lv1-5 专属技能 / 升级经验。
// 灵子详情页在主包（75 条体积可控），构建时由 vite soulEssenceDataPlugin gzip 内联，不进云端 seed。
import soul from './generated/soul-essence.json';
import { cloudDetailAsset } from './site-images.js';

export const SOUL_CDN = 'https://ap-cbt3.csxylic.com/';
// 采集数据里的图标都是站内路径（icons/soulessence/xxx.png）：H5 拼 CDN 热链；
// 微信端经 cloudDetailAsset 转为云存储 detail-assets 目录（同 combatIcon）。
export function soulIcon(path) {
  return path ? cloudDetailAsset(SOUL_CDN + path) : '';
}

export const soulData = soul;
export const soulStatic = soul.static || {};
// 升级经验按星级分档（3/4/5 星升下级消耗不同），取对应星级的表
export function expForStars(stars) {
  const exp = soulStatic.exp || {};
  return exp[String(stars || 4)] || exp['4'] || Object.values(exp)[0] || [];
}

// 名称匹配：BWIKI 条目名与 CBT3 页名一致（去空格；S/B 版后缀容错）
const byName = new Map();
Object.keys(soul.items || {}).forEach((pageId) => {
  const entry = soul.items[pageId];
  const raw = String(entry.n || '');
  const keys = new Set([raw, raw.replace(/\s+/g, ''), raw.replace(/\s+/g, '').replace(/S版$|B版$/, ''), raw.replace(/S 版$|B 版$/, '')]);
  keys.forEach((key) => { if (key && !byName.has(key)) byName.set(key, pageId); });
});

export function soulIdOf(name) {
  if (!name) return '';
  const raw = String(name).replace(/\s+/g, '');
  return byName.get(raw) || byName.get(raw.replace(/S版$|B版$/, '')) || byName.get(String(name)) || '';
}

export function soulOf(name) {
  const pageId = soulIdOf(name);
  return pageId ? { pageId, ...(soul.items[pageId] || {}) } : null;
}

// R2-6 同款分级描述解压（与 catalog.js / pkg-qibo/combat.js 同构）
export function expandSoulLevels(skill) {
  if (!skill || !skill.lvls || !Array.isArray(skill.lvls.nums)) return [];
  const { tpl, nums } = skill.lvls;
  return nums.map((list, idx) => {
    let i = 0;
    const text = tpl.replace(/\{\}/g, () => (list && list[i] != null ? String(list[i++]) : ''));
    return { lv: idx + 1, desc: text };
  });
}

// 等级档位展示：默认取 5 档采样（1/25/50/75/100），展开后全 100 级
export function statAt(stats, key, lv) {
  const arr = stats && stats[key];
  if (!arr || !arr.length) return null;
  const idx = Math.min(Math.max(lv, 1), arr.length) - 1;
  return arr[idx];
}
