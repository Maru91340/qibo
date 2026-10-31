// 本地收藏：图鉴条目与内容条目通用，不上传
const KEY = 'qbxzs:favs';
const MAX = 200;

export function listFavs() {
  const list = uni.getStorageSync(KEY);
  return Array.isArray(list) ? list : [];
}

export function isFav(type, id) {
  return listFavs().some((f) => f.type === type && f.id === id);
}

export function toggleFav(entry) {
  let list = listFavs();
  const exists = list.some((f) => f.type === entry.type && f.id === entry.id);
  if (exists) {
    list = list.filter((f) => !(f.type === entry.type && f.id === entry.id));
  } else {
    list = [Object.assign({ ts: Date.now() }, entry)].concat(list).slice(0, MAX);
  }
  uni.setStorageSync(KEY, list);
  return !exists;
}

export function removeFav(type, id) {
  const list = listFavs().filter((f) => !(f.type === type && f.id === id));
  uni.setStorageSync(KEY, list);
}

// 详情路由映射：图鉴类走 /pages/{type}/detail，内容类走注册路径
export function favPath(fav) {
  if (fav.path) return `${fav.path}?id=${fav.id}`;
  return `/pages/${fav.type}/detail?id=${fav.id}`;
}
