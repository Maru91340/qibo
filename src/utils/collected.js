// 本地已收集：游戏内已获得/拥有状态，独立于收藏（规范 03：两者互不代表），仅保存在本机。
// 经用户批准（待确认 #10 裁决：已收集=本地方案），不涉及云函数/数据库改动。
const KEY = 'qbxzs:collected';
const MAX = 2000;

export function listCollected() {
  const list = uni.getStorageSync(KEY);
  return Array.isArray(list) ? list : [];
}

export function isCollected(type, id) {
  return listCollected().some((entry) => entry.type === type && entry.id === id);
}

// 返回切换后的状态（true=已收集）；溢出时移除最旧一条并明确告知。
export function toggleCollected(entry) {
  let list = listCollected();
  const exists = list.some((item) => item.type === entry.type && item.id === entry.id);
  if (exists) {
    list = list.filter((item) => !(item.type === entry.type && item.id === entry.id));
  } else {
    const next = [Object.assign({ ts: Date.now() }, entry)].concat(list);
    if (next.length > MAX) uni.showToast({ title: '收集记录已达上限，最旧记录已移除', icon: 'none' });
    list = next.slice(0, MAX);
  }
  uni.setStorageSync(KEY, list);
  return !exists;
}

export function removeCollected(type, id) {
  const list = listCollected().filter((item) => !(item.type === type && item.id === id));
  uni.setStorageSync(KEY, list);
}
