const qiboData = require('../../utils/data/qibo');
const elementData = require('../../utils/data/element');
const teamUtil = require('../../utils/team');
const { hexToRgba } = require('../../utils/format');

const elementOptions = [{ key: 'all', name: '全', label: '全部元素', color: '#5a6480' }]
  .concat(elementData.elements)
  .map((item) => Object.assign({}, item, { tint: hexToRgba(item.color, 0.28) }));

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
    kind: '全部',
    usage: '全部',
    rarity: '全部',
    element: 'all',
    kindOptions: qiboData.kinds,
    usageOptions: qiboData.usages,
    rarityOptions: qiboData.rarities,
    elementOptions,
    list: [],
    teamCount: 0,
    notice: qiboData.notice
  },

  onLoad(options) {
    if (options && options.keyword) this.setData({ keyword: decodeURIComponent(options.keyword) });
    this.refresh();
  },

  onShow() {
    this.setData({ teamCount: teamUtil.load().qibos.length });
  },

  refresh() {
    const { keyword, kind, usage, rarity, element } = this.data;
    const list = decorate(
      qiboData.filter({ keyword, kind, usage, rarity, element })
    );
    this.setData({ list });
  },

  onKeywordChange(event) {
    this.setData({ keyword: event.detail.value });
    this.refresh();
  },

  onClear() {
    this.setData({ keyword: '' });
    this.refresh();
  },

  onKindChange(event) {
    this.setData({ kind: event.currentTarget.dataset.value });
    this.refresh();
  },

  onUsageChange(event) {
    this.setData({ usage: event.currentTarget.dataset.value });
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
    wx.navigateTo({ url: `/pages/qibo/detail?id=${event.currentTarget.dataset.id}` });
  }
});
