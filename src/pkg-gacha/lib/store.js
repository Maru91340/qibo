// 抽卡模拟 · 本地存档与每日次数（uni storage）
// 存档结构：{ version:1, history:[{poolId,name,rarity,kind,isUp,at,fiveGap,luck}] }
// 每日次数：{ date:'YYYY-MM-DD', used:0, adUsed:0 }，跨 0 点自动重置；免费 300 + 每看一次广告 300，每天最多 3 次。
import { POOLS } from './pools.js';
import { CATALOG, applyRecord, emptyStore, findPool } from './rate.js';

const STORE_KEY = 'qibo-gacha-v1';
const QUOTA_KEY = 'qibo-gacha-quota-v1';
export const DAILY_FREE = 300;
export const AD_BONUS = 300;
export const AD_MAX = 3;
const HISTORY_LIMIT = 3000;

let storageIssue = '';

export function getStorageIssue() {
  return storageIssue;
}

function readRaw(key) {
  try {
    return uni.getStorageSync(key);
  } catch (error) {
    return '';
  }
}

/** 读存档：逐条校验后重放，数据损坏时保留原值不覆盖并给出提示。 */
export function loadStore() {
  const target = emptyStore();
  const raw = readRaw(STORE_KEY);
  if (!raw) return target;
  try {
    const saved = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!saved || saved.version !== 1 || !Array.isArray(saved.history)) throw new Error('invalid storage');
    for (const entry of saved.history) {
      const pool = POOLS.find((item) => item.id === entry.poolId);
      const item = CATALOG.find((candidate) => candidate.name === entry.name && candidate.rarity === entry.rarity && candidate.kind === entry.kind);
      if (!pool || !item || !Number.isSafeInteger(entry.at) || entry.at < 0) throw new Error('invalid record');
      if (entry.rarity === 5 && entry.kind !== pool.kind) throw new Error('invalid rarity');
      if (pool.limit && target.pools[pool.id].total >= pool.limit) throw new Error('invalid beginner total');
      applyRecord(target, {
        poolId: pool.id,
        name: item.name,
        rarity: item.rarity,
        kind: item.kind,
        isUp: Boolean(pool.up && item.name === pool.up),
        at: entry.at,
        fiveGap: Number.isSafeInteger(entry.fiveGap) && entry.fiveGap > 0 && entry.fiveGap <= 999 ? entry.fiveGap : null,
        luck: typeof entry.luck === 'string' ? entry.luck : undefined
      });
    }
    storageIssue = '';
    return target;
  } catch (error) {
    storageIssue = '无法读取原本的本地记录。本次可临时体验；为保留原数据，暂不覆盖保存。可在观测记录中重置全部后重新开始。';
    return emptyStore();
  }
}

/** 落盘：只存历史，统计由重放得出；超上限截断最旧记录。 */
export function saveStore(store) {
  if (storageIssue.indexOf('无法读取') === 0) return false;
  const history = store.history.length > HISTORY_LIMIT ? store.history.slice(-HISTORY_LIMIT) : store.history;
  try {
    uni.setStorageSync(STORE_KEY, JSON.stringify({
      version: 1,
      history: history.map((record) => ({
        poolId: record.poolId,
        name: record.name,
        rarity: record.rarity,
        kind: record.kind,
        at: record.at,
        isUp: record.isUp,
        fiveGap: record.fiveGap === undefined ? null : record.fiveGap,
        luck: record.luck
      }))
    }));
    return true;
  } catch (error) {
    storageIssue = '本地存储写入失败（可能空间不足）。当前页面仍可用，但关闭后本次记录会丢失。';
    return false;
  }
}

export function clearStore() {
  try {
    uni.removeStorageSync(STORE_KEY);
    storageIssue = '';
    return true;
  } catch (error) {
    return false;
  }
}

/** 重置指定卡池（poolId 为空则全部）：只保留其余记录并重放统计，不动每日次数。 */
export function resetStore(store, poolId) {
  const target = emptyStore();
  for (const record of store.history) {
    if (poolId && record.poolId !== poolId) applyRecord(target, { ...record });
  }
  storageIssue = '';
  saveStore(target);
  return target;
}

function dateKey(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

/** 读每日次数；跨天或格式异常时重置为当天满额。 */
export function loadQuota() {
  const today = dateKey();
  const raw = readRaw(QUOTA_KEY);
  let quota = null;
  try {
    const saved = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (saved && saved.date === today) quota = saved;
  } catch (error) {
    quota = null;
  }
  if (!quota) {
    quota = { date: today, used: 0, adUsed: 0 };
    saveQuota(quota);
    return quota;
  }
  const used = Number.isSafeInteger(quota.used) && quota.used >= 0 ? quota.used : 0;
  const adUsed = Number.isSafeInteger(quota.adUsed) && quota.adUsed >= 0 ? Math.min(quota.adUsed, AD_MAX) : 0;
  return { date: today, used, adUsed };
}

export function saveQuota(quota) {
  try {
    uni.setStorageSync(QUOTA_KEY, JSON.stringify(quota));
  } catch (error) {
    /* 次数为体验性限制，写入失败不阻断抽卡 */
  }
}

/** 剩余次数 = 300 + 已看广告 × 300 − 已用。 */
export function quotaRemaining(quota) {
  return Math.max(0, DAILY_FREE + quota.adUsed * AD_BONUS - quota.used);
}

/** 扣次数：不足返回 false，不写盘。 */
export function consumeQuota(quota, count) {
  if (quotaRemaining(quota) < count) return false;
  quota.used += count;
  saveQuota(quota);
  return true;
}

/** 广告加次：每天最多 3 次，返回 { ok, quota, reason }。 */
export function addAdBonus(quota) {
  if (quota.adUsed >= AD_MAX) return { ok: false, quota, reason: '今日加次次数已用完（每日 3 次）' };
  quota.adUsed += 1;
  saveQuota(quota);
  return { ok: true, quota, reason: '' };
}

export { findPool };
