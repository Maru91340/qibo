// 本地收藏：图鉴条目与内容条目通用，不上传
const KEY = 'qbxzs:favs';
// 3.2 / L04：收藏只表示用户主动标记，不再对外宣称「已获得」。原 200 上限会让奇波等
// 超过 200 条的图鉴在新增收藏时静默截掉旧记录，故上调容量；真要溢出时先给提示。
const MAX = 1000;

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
    const next = [Object.assign({ ts: Date.now() }, entry)].concat(list);
    // 溢出不再静默丢弃：明确告知用户最旧一条会被移除
    if (next.length > MAX) uni.showToast({ title: '收藏已达上限，最旧记录已移除', icon: 'none' });
    list = next.slice(0, MAX);
  }
  uni.setStorageSync(KEY, list);
  return !exists;
}

export function removeFav(type, id) {
  const list = listFavs().filter((f) => !(f.type === type && f.id === id));
  uni.setStorageSync(KEY, list);
}

// 详情路由映射：奇波/角色详情在分包，通用图鉴在主包 /pages/{type}/detail。
// 收藏（qiboWiki/charWiki）与浏览记录（qibo/character）两套 type 命名都在此收敛。
const DETAIL_ROUTES = {
  qibo: '/pkg-qibo/detail',
  qiboWiki: '/pkg-qibo/detail',
  character: '/pkg-character/detail',
  charWiki: '/pkg-character/detail',
  spirit: '/pages/spirit/detail',
  item: '/pages/item/detail',
  equipment: '/pages/equipment/detail',
  material: '/pages/material/detail',
  food: '/pages/food/detail',
  fishing: '/pages/fishing/detail',
  enemy: '/pages/enemy/detail',
  dungeon: '/pages/dungeon/detail',
  building: '/pages/building/detail',
  region: '/pages/region/detail'
};

// 按类型解析详情路由；未登记类型返回空串（调用方自行回退）。
export function detailPath(type) {
  return DETAIL_ROUTES[type] || '';
}

// 详情路由解析：收藏条目自带 path 时优先；其余按类型映射，未登记类型沿用旧拼接（内容类详情）。
export function favPath(fav) {
  if (fav.path) return `${fav.path}?id=${fav.id}`;
  const base = detailPath(fav.type);
  return base ? `${base}?id=${fav.id}` : `/pages/${fav.type}/detail?id=${fav.id}`;
}
