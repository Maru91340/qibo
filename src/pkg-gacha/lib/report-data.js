// 抽卡模拟 · 分享图数据口径（纯函数，无 DOM / 无 uni API，可被 node 直接单测）
// 渲染在 lib/report.js，口径与 design/gacha-flow.html 的 reportData() 一致。
import { LUCK, POOLS } from './pools.js';

/** 千分位，避免四位数挤在一起。 */
export function format(value) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** 报告标签：只描述运气好的情况；抽得少或暂未出货用中性说法。 */
export function reportTags(scope, stat) {
  const tags = [];
  if (!stat.total) return tags;
  if (!stat.five) return [{ label: stat.total >= scope.cap ? '保底在望' : '星光初现', calm: true }];
  if (stat.bestGap <= Math.round(scope.cap * 0.22)) tags.push({ label: '天选之人' });
  else if (stat.bestGap <= Math.round(scope.cap * 0.44)) tags.push({ label: '欧气满溢' });
  if (stat.avg <= scope.cap * 0.5) tags.push({ label: '星光眷顾' });
  if (stat.up) tags.push({ label: '如愿以偿' });
  if (stat.total <= 30 && stat.five >= 2) tags.push({ label: '一发入魂' });
  if (stat.five >= 3) tags.push({ label: '满载而归' });
  if (!tags.length) tags.push({ label: '稳步前行', calm: true });
  return tags.slice(0, 3);
}

/** 汇总分享图数据：scope 为卡池口径，stat 为数字与最近四张五星。 */
export function buildReport(store, poolId) {
  const pool = POOLS.find((item) => item.id === poolId) || null;
  const records = pool ? store.history.filter((item) => item.poolId === pool.id) : store.history.slice();
  const five = records.filter((item) => item.rarity === 5);
  const cap = pool ? pool.cap : 90;
  const scope = {
    pool,
    cap,
    title: pool ? pool.name : '全部观测',
    sub: pool ? pool.type : '五个卡池合计 · 本地模拟',
    accent: pool ? pool.accent : '#88739c',
    soft: pool ? pool.soft : '#eee9f2'
  };
  let bestGap = 0;
  for (const item of five) {
    const gap = item.fiveGap || cap;
    if (!bestGap || gap < bestGap) bestGap = gap;
  }
  const stat = {
    total: records.length,
    five: five.length,
    up: records.filter((item) => item.isUp).length,
    bestGap,
    avg: five.length ? Math.round(records.length / five.length) : 0
  };
  stat.tags = reportTags(scope, stat);
  stat.latest = five.slice(-4).reverse();
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  stat.stamp = now.getFullYear() + '.' + pad(now.getMonth() + 1) + '.' + pad(now.getDate());
  return { scope, stat };
}

/** 五星角标文案（设计稿口径：角标为同池间隔）。 */
export function gapLabel(item) {
  return (item.fiveGap || 0) + ' 抽';
}

/** 好运标识文案；未标注返回空串。 */
export function luckLabel(key) {
  return (LUCK[key] && LUCK[key].label) || '';
}
