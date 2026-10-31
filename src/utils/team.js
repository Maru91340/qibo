const TEAM_KEY = 'qbxzs:team';
export const MAX_MEMBERS = 4;
export const MAX_QIBO = 1;

const emptyTeam = () => ({ name: '我的队伍', members: [], qibos: [], updatedAt: 0 });

export function load() {
  const saved = uni.getStorageSync(TEAM_KEY);
  if (!saved || !Array.isArray(saved.members)) return emptyTeam();
  return {
    name: saved.name || '我的队伍',
    members: saved.members.slice(0, MAX_MEMBERS),
    qibos: (saved.qibos || []).slice(0, MAX_QIBO),
    updatedAt: saved.updatedAt || 0
  };
}

export function save(team) {
  const next = Object.assign({}, team, { updatedAt: Date.now() });
  uni.setStorageSync(TEAM_KEY, next);
  return next;
}

export function reset() {
  uni.removeStorageSync(TEAM_KEY);
  return emptyTeam();
}

export function toggleMember(team, id) {
  const members = team.members.slice();
  const index = members.indexOf(id);
  if (index >= 0) {
    members.splice(index, 1);
  } else {
    if (members.length >= MAX_MEMBERS) return { team, error: `最多编入 ${MAX_MEMBERS} 名角色` };
    members.push(id);
  }
  return { team: save(Object.assign({}, team, { members })), error: '' };
}

export function toggleQibo(team, id) {
  const qibos = team.qibos.slice();
  const index = qibos.indexOf(id);
  if (index >= 0) qibos.splice(index, 1);
  else {
    qibos.length = 0;
    qibos.push(id);
  }
  return save(Object.assign({}, team, { qibos }));
}

export function summarize(team, characterMap, qiboMap, elementMap) {
  const elements = [];
  const roles = [];
  team.members.forEach((id) => {
    const item = characterMap[id];
    if (!item) return;
    if (elements.indexOf(item.element) < 0) elements.push(item.element);
    if (roles.indexOf(item.role) < 0) roles.push(item.role);
  });
  team.qibos.forEach((id) => {
    const item = qiboMap[id];
    if (item && elements.indexOf(item.element) < 0) elements.push(item.element);
  });
  return {
    elementCount: elements.length,
    elements: elements.map((key) => elementMap[key]).filter(Boolean),
    roles,
    coverage: elements.length >= 4 ? '元素覆盖充足' : elements.length >= 2 ? '可补充元素' : '元素过于单一',
    hasHealer: roles.indexOf('辅助') >= 0 || roles.indexOf('坦克') >= 0,
    hasCarry: roles.indexOf('输出') >= 0
  };
}
