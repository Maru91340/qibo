const qiboData = require('../../utils/data/qibo');
const elementData = require('../../utils/data/element');
const teamUtil = require('../../utils/team');

Page({
  data: {
    item: null,
    inTeam: false,
    notice: qiboData.notice
  },

  onLoad(options) {
    const item = qiboData.byId(options.id);
    if (!item) {
      wx.setNavigationBarTitle({ title: '奇波不存在' });
      return;
    }
    const element = elementData.elementMap[item.element] || {};
    wx.setNavigationBarTitle({ title: item.name });
    this.setData({
      item: Object.assign({}, item, {
        elementName: element.name || '—',
        elementColor: element.color || '#5a6480',
        elementLabel: element.label || '未知'
      })
    });
    this.syncTeam();
  },

  syncTeam() {
    this.setData({ inTeam: teamUtil.load().qibos.indexOf(this.data.item.id) >= 0 });
  },

  toggleTeam() {
    const team = teamUtil.load();
    const result = teamUtil.toggleQibo(team, this.data.item.id);
    this.setData({ inTeam: result.team.qibos.indexOf(this.data.item.id) >= 0 });
    wx.showToast({ title: this.data.inTeam ? '已设为出战' : '已移出出战', icon: 'none' });
  },

  onShareAppMessage() {
    const item = this.data.item;
    return { title: `奇波图鉴 · ${item ? item.name : '蓝色星原'}`, path: `/pages/qibo/detail?id=${item ? item.id : ''}` };
  }
});
