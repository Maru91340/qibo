const elementData = require('./data/element');

const TEAM_KEY = 'qbxzs:team';
const MAX_MEMBERS = 4;
const MAX_QIBO = 1;

const emptyTeam = () => ({ name: '我的队伍', members: [], qibos: [], updatedAt: 0 });

function load() {
  const saved = wx.getStorageSync(TEAM_KEY);
  if (!saved || !Array.isArray(saved.members)) return emptyTeam();
  return {
    name: saved.name || '我的队伍',
    members: saved.members.slice(0, MAX_MEMBERS),
    qibos: (saved.qibos || []).slice(0, MAX_QIBO),
    updatedAt: saved.updatedAt || 0
  };
}

function save(team) {
  const next = Object.assign({}, team, { updatedAt: Date.now() });
  wx.setStorageSync(TEAM_KEY, next);
  return next;
}

function reset() {
  wx.removeStorageSync(TEAM_KEY);
  return emptyTeam();
}

function hasMember(team, id) {
  return team.members.indexOf(id) >= 0;
}

function toggleMember(team, id) {
  const members = team.members.slice();
  const index = members.indexOf(id);
  if (index >= 0) {
    members.splice(index, 1);
  } else {
    if (members.length >= MAX_MEMBERS) return { team, error: `最多编入 ${MAX_MEMBERS} 名角色` };
    members.push(id);
  }
  const next = save(Object.assign({}, team, { members }));
  return { team: next, error: '' };
}

function toggleQibo(team, id) {
  const qibos = team.qibos.slice();
  const index = qibos.indexOf(id);
  if (index >= 0) {
    qibos.splice(index, 1);
  } else {
    qibos.length = 0;
    qibos.push(id);
  }
  const next = save(Object.assign({}, team, { qibos }));
  return { team: next, error: '' };
}

function summarize(team, characterMap, qiboMap) {
  const elements = [];
  team.members.forEach((id) => {
    const item = characterMap[id];
    if (item && elements.indexOf(item.element) < 0) elements.push(item.element);
  });
  team.qibos.forEach((id) => {
    const item = qiboMap[id];
    if (item && elements.indexOf(item.element) < 0) elements.push(item.element);
  });
  const roles = [];
  team.members.forEach((id) => {
    const item = characterMap[id];
    if (item && roles.indexOf(item.role) < 0) roles.push(item.role);
  });
  return {
    elementCount: elements.length,
    elements: elements.map((key) => elementData.elementMap[key]).filter(Boolean),
    roles,
    coverage: elements.length >= 4 ? '元素覆盖充足' : elements.length >= 2 ? '可补充元素' : '元素过于单一',
    hasHealer: roles.indexOf('辅助') >= 0 || roles.indexOf('坦克') >= 0,
    hasCarry: roles.indexOf('输出') >= 0
  };
}

module.exports = {
  TEAM_KEY,
  MAX_MEMBERS,
  MAX_QIBO,
  emptyTeam,
  load,
  save,
  reset,
  hasMember,
  toggleMember,
  toggleQibo,
  summarize
};
