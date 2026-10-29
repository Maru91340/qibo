const characterData = require('../../utils/data/character');
const elementData = require('../../utils/data/element');
const teamUtil = require('../../utils/team');

const labels = (keys) => (keys.length ? keys.map((key) => elementData.elementMap[key].label).join('、') : '无');

Page({
  data: {
    item: null,
    counters: { strongText: '', weakText: '' },
    elementNotice: elementData.notice,
    inTeam: false,
    notice: characterData.notice
  },

  onLoad(options) {
    const raw = characterData.byId(options.id);
    if (!raw) {
      wx.setNavigationBarTitle({ title: '角色不存在' });
      return;
    }
    const element = elementData.elementMap[raw.element] || {};
    wx.setNavigationBarTitle({ title: raw.name });
    this.setData({
      item: Object.assign({}, raw, {
        elementName: element.name || '—',
        elementColor: element.color || '#5a6480',
        elementLabel: element.label || '未知'
      }),
      counters: {
        strongText: labels(elementData.counters[raw.element] || []),
        weakText: labels(elementData.counteredBy[raw.element] || [])
      }
    });
    this.syncTeam();
  },

  syncTeam() {
    const item = this.data.item;
    if (!item) return;
    this.setData({ inTeam: teamUtil.load().members.indexOf(item.id) >= 0 });
  },

  toggleTeam() {
    const item = this.data.item;
    const result = teamUtil.toggleMember(teamUtil.load(), item.id);
    if (result.error) {
      wx.showToast({ title: result.error, icon: 'none' });
      return;
    }
    this.setData({ inTeam: result.team.members.indexOf(item.id) >= 0 });
    wx.showToast({ title: this.data.inTeam ? '已编入队伍' : '已移出队伍', icon: 'none' });
  },

  onShareAppMessage() {
    const item = this.data.item;
    return { title: `角色图鉴 · ${item ? item.name : '蓝色星原'}`, path: `/pages/character/detail?id=${item ? item.id : ''}` };
  }
});
