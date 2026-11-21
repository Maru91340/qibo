// 奇波战斗数据（collect-cbt3-pets.mjs 从 ap-cbt3.csxylic.com 采集解析）：
// 六维资质 / 战斗·对决技能 / 专属特性 / 基因 / 基础分类 / 家园 / 家族进化链 / 星临图志 / 升级经验。
// 仅 pkg-qibo 分包详情页引用；构建时由 vite combatDataPlugin gzip 内联，不进云端 seed / catalog.js。
// 文件必须留在 pkg-qibo 目录内：uni-app 按源码路径镜像输出 JS 模块，数据才能跟随分包而非进主包。
import combat from '../data/generated/qibo-combat.json';
import { cloudDetailAsset } from '../data/site-images.js';

export const COMBAT_CDN = 'https://ap-cbt3.csxylic.com/';
// 采集数据里的图标都是站内路径（icons/pet/xxx.png）：H5 拼 CDN 热链；微信端经
// cloudDetailAsset 转为云存储 detail-assets 目录（csxylic 域名未入下载白名单会被拦截）。
export function combatIcon(path) {
  return path ? cloudDetailAsset(COMBAT_CDN + path) : '';
}

export const combatData = combat;
export const combatStatic = combat.static || {};

export function combatOf(wikiId) {
  return (combat.pets && combat.pets[String(wikiId)]) || null;
}

// R2-6 同款分级描述解压（与 src/data/catalog.js decompressSkillLevels 同构）：
// lvls = { tpl, nums } → [{ lv, desc }]
export function expandSkillLevels(skill) {
  if (!skill || !skill.lvls || !Array.isArray(skill.lvls.nums)) return [];
  const { tpl, nums } = skill.lvls;
  return nums.map((list, idx) => {
    let i = 0;
    const text = tpl.replace(/\{\}/g, () => (list && list[i] != null ? String(list[i++]) : ''));
    return { lv: idx + 1, desc: text };
  });
}

// 技能描述取值：有分级走选中等级，否则退回单级文本
export function skillDescAt(skill, lv) {
  if (skill.lvls) {
    const levels = expandSkillLevels(skill);
    const hit = levels.find((entry) => entry.lv === lv) || levels[levels.length - 1];
    if (hit) return hit.desc;
  }
  return skill.d || '';
}

// 解析表逐级单元格：优先取选中等级数值，退回 Lv1 展示值
export function astCellAt(row, lv) {
  if (row.lv && row.lv[String(lv)] != null) return row.lv[String(lv)];
  return row.v || '—';
}
