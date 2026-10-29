const characterData = require('../../utils/data/character');
const elementData = require('../../utils/data/element');
const teamUtil = require('../../utils/team');

function decorate(list) {
  return list.map((item) => {
    const element = elementData.elementMap[item.element] || {};
    return Object.assign({}, item, {
      elementName: element.name || '—',
      elementColor: element.color || '#5a6480',
      elementTint: element.tint || '#f2f4f9'
    });
  });
}

Page({
  data: {
    keyword: '',
    role: '全部',
    rarity: '全部',
    element: 'all',
    roleOptions: characterData.roles,
    rarityOptions: characterData.rarities,
    elementOptions: [{ key: 'all', name: '全', label: '全部元素', color: '#5a6480' }].concat(elementData.elements),
    list: [],
    teamCount: 0,
    notice: characterData.notice
  },

  onLoad(options) {
    if (options && options.keyword) this.setData({ keyword: decodeURIComponent(options.keyword) });
    this.refresh();
  },

  onShow() {
    this.setData({ teamCount: teamUtil.load().members.length });
  },

  refresh() {
    const { keyword, role, rarity, element } = this.data;
    this.setData({ list: decorate(characterData.filter({ keyword, role, rarity, element })) });
  },

  onKeywordChange(event) {
    this.setData({ keyword: event.detail.value });
    this.refresh();
  },

  onClear() {
    this.setData({ keyword: '' });
    this.refresh();
  },

  onRoleChange(event) {
    this.setData({ role: event.currentTarget.dataset.value });
    this.refresh();
  },

  onRarityChange(event) {
    this.setData({ rarity: event.currentTarget.dataset.value });
    this.refresh();
  },

  onElementChange(event) {
    this.setData({ element: event.currentTarget.dataset.value });
    this.refresh();
  },

  goDetail(event) {
    wx.navigateTo({ url: `/pages/character/detail?id=${event.currentTarget.dataset.id}` });
  }
});
