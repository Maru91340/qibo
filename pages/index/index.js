const { sections, banners } = require('../../utils/data/meta');
const qiboData = require('../../utils/data/qibo');
const { tint, glow } = require('../../utils/format');

Page({
  data: {
    banners,
    bannerIndex: 0,
    sections: [],
    keyword: '',
    notice: qiboData.notice,
    version: ''
  },

  onLoad() {
    const app = getApp();
    this.setData({
      sections: sections.map((item) => Object.assign({}, item, { tint: tint(item.accent), glow: glow(item.accent) })),
      version: `v${app.globalData.version} · ${app.globalData.gameName}`
    });
  },

  onBannerChange(event) {
    this.setData({ bannerIndex: event.detail.current });
  },

  onBannerTap(event) {
    const path = event.currentTarget.dataset.path;
    if (path) wx.navigateTo({ url: path });
  },

  onSectionTap(event) {
    wx.navigateTo({ url: event.currentTarget.dataset.path });
  },

  onKeywordChange(event) {
    this.setData({ keyword: event.detail.value });
  },

  onSearchSubmit() {
    const keyword = this.data.keyword.trim();
    wx.navigateTo({ url: `/pages/search/index?keyword=${encodeURIComponent(keyword)}` });
  },

  onShareAppMessage() {
    return { title: '蓝色星原助手 · 奇波/角色图鉴与队伍编成', path: '/pages/index/index' };
  }
});
