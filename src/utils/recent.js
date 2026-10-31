// 最近浏览：本地记录，最新在前，去重，上限 50
const KEY = 'qbxzs:recent';
const MAX = 50;

export function listRecent() {
  const list = uni.getStorageSync(KEY);
  return Array.isArray(list) ? list : [];
}

export function pushRecent(entry) {
  if (!entry || !entry.type || !entry.id) return;
  let list = listRecent().filter((r) => !(r.type === entry.type && r.id === entry.id));
  list = [Object.assign({ ts: Date.now() }, entry)].concat(list).slice(0, MAX);
  uni.setStorageSync(KEY, list);
}

export function clearRecent() {
  uni.removeStorageSync(KEY);
}
