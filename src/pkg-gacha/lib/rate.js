// 抽卡模拟 · 名单与概率（纯函数，无 DOM / 无 uni API，可被 node 直接单测）
// 口径与 design/gacha-flow.html 一致：公测版，限定池五星 100% UP，不歪常驻。
import { POOLS, ROLE_FIVE, ROLE_FOUR, SOUL_FIVE, SOUL_FOUR, SOUL_THREE } from './pools.js';

/** 全量名单：名称 + 星级 + 类别。 */
export function buildCatalog() {
  const groups = [
    [ROLE_FIVE, 5, '角色'],
    [ROLE_FOUR, 4, '角色'],
    [SOUL_FIVE, 5, '灵子'],
    [SOUL_FOUR, 4, '灵子'],
    [SOUL_THREE, 3, '灵子'],
    [['涂山小玉'], 5, '角色'],
    [['花之舞'], 5, '灵子']
  ];
  return groups.flatMap(([names, rarity, kind]) => names.map((name) => ({ name, rarity, kind })));
}

export const CATALOG = buildCatalog();

/** 空存档：每个卡池一份统计，每个保底组一份计数（同类限定池共享）。 */
export function emptyStore() {
  const groups = [...new Set(POOLS.map((pool) => pool.group))];
  return {
    history: [],
    pools: Object.fromEntries(POOLS.map((pool) => [pool.id, { total: 0, five: 0, four: 0, up: 0, sinceFive: 0, sinceHigh: 0, sinceUp: 0 }])),
    groups: Object.fromEntries(groups.map((group) => [group, { sinceFive: 0, sinceUp: 0 }]))
  };
}

export function findPool(id) {
  return POOLS.find((pool) => pool.id === id) || POOLS[0];
}

/** 取某卡池所属保底组（同类卡池共享计数）。 */
export function pityOf(target, pool) {
  const group = target.groups[pool.group] || (target.groups[pool.group] = { sinceFive: 0, sinceUp: 0 });
  return group;
}

/** 五星好运标识：只标注运气好的情况，其余返回 null（不加任何标）。 */
export function luckOf(pool, gap) {
  if (!gap || !pool || !pool.cap) return null;
  if (pool.id === 'beginner' || pool.group.indexOf('standard') === 0) return null;
  if (gap <= Math.round(pool.cap * 0.22)) return 'legend';
  if (gap <= Math.round(pool.cap * 0.44)) return 'lucky';
  return null;
}

/** 更新卡池与保底组计数，并为记录补上五星间隔与标识。 */
export function applyRecord(target, record, pool = findPool(record.poolId)) {
  const stats = target.pools[record.poolId];
  if (!stats) return record;
  const pity = pityOf(target, pool);
  const savedGap = record.fiveGap;
  record.serial = stats.total + 1;
  // 读档重放沿用存档里的间隔与标识，避免规则调整后历史记录跟着变
  record.fiveGap = record.rarity === 5 ? savedGap || pity.sinceFive + 1 : null;
  if (record.rarity === 5) record.luck = record.luck !== undefined ? record.luck : luckOf(pool, record.fiveGap);
  stats.total += 1;
  stats.sinceFive += 1;
  stats.sinceHigh += 1;
  stats.sinceUp += 1;
  pity.sinceFive += 1;
  pity.sinceUp += 1;
  if (record.rarity === 5) { stats.five += 1; stats.sinceFive = 0; pity.sinceFive = 0; }
  if (record.rarity === 4) stats.four += 1;
  if (record.rarity >= 4) stats.sinceHigh = 0;
  if (record.isUp) { stats.up += 1; stats.sinceUp = 0; pity.sinceUp = 0; }
  target.history.push(record);
  return record;
}

function pick(items, random) {
  return items[Math.floor(random() * items.length)];
}

/** 按星级与类别选具体条目；限定池五星固定为 UP。 */
export function chooseItem(pool, rarity, random) {
  if (rarity === 3) {
    const name = pick(SOUL_THREE, random);
    return CATALOG.find((item) => item.name === name && item.rarity === 3);
  }
  if (rarity === 5) {
    const name = pool.up ? pool.up : pick(pool.kind === '角色' ? ROLE_FIVE : SOUL_FIVE, random);
    return CATALOG.find((item) => item.name === name && item.rarity === 5);
  }
  if (pool.up && random() < 0.5) {
    const name = pick(pool.upFour, random);
    return CATALOG.find((item) => item.name === name && item.rarity === 4);
  }
  const roleNames = ROLE_FOUR.filter((name) => !pool.upFour.includes(name));
  const soulNames = SOUL_FOUR.filter((name) => !pool.upFour.includes(name));
  const name = pick(random() < 0.5 ? roleNames : soulNames, random);
  return CATALOG.find((item) => item.name === name && item.rarity === 4);
}

/** 下一抽的五星概率：前 70 抽（灵子 60）0.8%，之后每抽 +2pp，第 81 抽起每抽 +8pp 至硬保底。 */
export function fiveRate(pity, pool) {
  const next = pity.sinceFive + 1;
  const start = pool.kind === '灵子' ? 60 : 70;
  if (next <= start) return 0.008;
  if (next <= start + 10) return 0.008 + (next - start) * 0.02;
  return Math.min(0.208 + (next - start - 10) * 0.08, 1);
}

/** 抽一次：先判五星（含 UP 硬保底），再判四星与十抽四星保底，结果同时写入 target。 */
export function rollOne(pool, target, random = Math.random, at = Date.now()) {
  const stats = target.pools[pool.id];
  const pity = pityOf(target, pool);
  if (pool.limit && stats.total >= pool.limit) return null;
  const forceUp = Boolean(pool.up && pity.sinceUp + 1 >= pool.cap);
  const forceFive = forceUp || pity.sinceFive + 1 >= pool.cap;
  const five = forceFive ? 1 : fiveRate(pity, pool);
  const chance = random();
  let rarity = chance < five ? 5 : chance < five + 0.06 ? 4 : 3;
  if (rarity === 3 && stats.sinceHigh + 1 >= 10) rarity = 4;
  const item = chooseItem(pool, rarity, random);
  const record = { poolId: pool.id, name: item.name, kind: item.kind, rarity, isUp: Boolean(pool.up && item.name === pool.up), at };
  applyRecord(target, record, pool);
  return record;
}
