const characterData = require('../../utils/data/character');
const qiboData = require('../../utils/data/qibo');
const elementData = require('../../utils/data/element');
const teamUtil = require('../../utils/team');
const { formatTime } = require('../../utils/format');

const characterMap = characterData.characters.reduce((acc, item) => {
  acc[item.id] = item;
  return acc;
}, {});
const qiboMap = qiboData.qibos.reduce((acc, item) => {
  acc[item.id] = item;
  return acc;
}, {});

function withElement(item) {
  if (!item) return null;
  const element = elementData.elementMap[item.element] || {};
  return {
    id: item.id,
    name: item.name,
    role: item.role || item.kind,
    desc: item.title || item.habitat,
    elementName: element.name || '—',
    elementColor: element.color || '#5a6480',
    elementTint: element.tint || '#f2f4f9'
  };
}

function slots(ids, map, max) {
  const views = [];
  for (let i = 0; i < max; i += 1) {
    const id = ids[i];
    views.push({ key: `slot-${i}`, data: id ? withElement(map[id]) : null });
  }
  return views;
}

Page({
  data: {
    team: teamUtil.emptyTeam(),
    memberViews: [],
    qiboViews: [],
    summary: { elements: [], roles: [], coverage: '', hasCarry: false, hasHealer: false, elementCount: 0 },
    pickerVisible: false,
    pickerType: 'character',
    pickerItems: [],
    updatedText: '未保存',
    maxMembers: teamUtil.MAX_MEMBERS,
    maxQibo: teamUtil.MAX_QIBO
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const team = teamUtil.load();
    this.setData({
      team,
      memberViews: slots(team.members, characterMap, teamUtil.MAX_MEMBERS),
      qiboViews: slots(team.qibos, qiboMap, teamUtil.MAX_QIBO),
      summary: teamUtil.summarize(team, characterMap, qiboMap),
      updatedText: team.updatedAt ? `更新于 ${formatTime(team.updatedAt)}` : '未保存'
    });
  },

  openPicker(event) {
    const type = event.currentTarget.dataset.type || 'character';
    this.setData({ pickerVisible: true, pickerType: type, pickerItems: this.buildPicker(type) });
  },

  buildPicker(type) {
    const team = this.data.team;
    if (type === 'qibo') {
      return qiboData.qibos.map((item) => {
        const view = withElement(item);
        return Object.assign({}, view, { added: team.qibos.indexOf(item.id) >= 0, disabled: false });
      });
    }
    const full = team.members.length >= teamUtil.MAX_MEMBERS;
    return characterData.characters.map((item) => {
      const view = withElement(item);
      const added = team.members.indexOf(item.id) >= 0;
      return Object.assign({}, view, { added, disabled: full && !added });
    });
  },

  pickItem(event) {
    const id = event.currentTarget.dataset.id;
    const team = teamUtil.load();
    if (this.data.pickerType === 'qibo') {
      teamUtil.toggleQibo(team, id);
    } else {
      const added = team.members.indexOf(id) >= 0;
      const result = teamUtil.toggleMember(team, id);
      if (result.error) {
        wx.showToast({ title: result.error, icon: 'none' });
        return;
      }
      wx.showToast({ title: added ? '已移出队伍' : '已编入队伍', icon: 'none' });
    }
    this.refresh();
    this.setData({ pickerItems: this.buildPicker(this.data.pickerType) });
  },

  removeMember(event) {
    teamUtil.toggleMember(teamUtil.load(), event.currentTarget.dataset.id);
    this.refresh();
  },

  removeQibo(event) {
    teamUtil.toggleQibo(teamUtil.load(), event.currentTarget.dataset.id);
    this.refresh();
  },

  closePicker() {
    this.setData({ pickerVisible: false });
  },

  onPopupChange(event) {
    this.setData({ pickerVisible: event.detail.visible });
  },

  rename() {
    wx.showModal({
      title: '队伍名称',
      editable: true,
      placeholderText: this.data.team.name,
      success: (res) => {
        const name = (res.content || '').trim();
        if (!res.confirm || !name) return;
        teamUtil.save(Object.assign({}, teamUtil.load(), { name }));
        this.refresh();
      }
    });
  },

  clearTeam() {
    wx.showModal({
      title: '清空队伍',
      content: '将清除本地保存的角色与出战奇波，确定继续？',
      confirmColor: '#d54941',
      success: (res) => {
        if (!res.confirm) return;
        teamUtil.reset();
        this.refresh();
        wx.showToast({ title: '已清空', icon: 'none' });
      }
    });
  },

  goCharacter(event) {
    wx.navigateTo({ url: `/pages/character/detail?id=${event.currentTarget.dataset.id}` });
  },

  goQibo(event) {
    wx.navigateTo({ url: `/pages/qibo/detail?id=${event.currentTarget.dataset.id}` });
  },

  onShareAppMessage() {
    return { title: `我的蓝色星原队伍：${this.data.team.name}`, path: '/pages/index/index' };
  }
});
