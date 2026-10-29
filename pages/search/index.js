const { search } = require('../../utils/search');

const HISTORY_KEY = 'qbxzs:history';
const MAX_HISTORY = 8;

Page({
  data: {
    keyword: '',
    groups: [],
    total: 0,
    history: []
  },

  onLoad(options) {
    const keyword = options && options.keyword ? decodeURIComponent(options.keyword) : '';
    this.setData({ history: wx.getStorageSync(HISTORY_KEY) || [] });
    if (keyword) this.apply(keyword);
  },

  onKeywordChange(event) {
    this.apply(event.detail.value);
  },

  onClear() {
    this.setData({ keyword: '', groups: [], total: 0 });
  },

  apply(raw) {
    const keyword = (raw || '').trim();
    const result = search(keyword);
    this.setData({ keyword, groups: result.groups, total: result.total });
  },

  remember(keyword) {
    const history = [keyword].concat(this.data.history.filter((item) => item !== keyword)).slice(0, MAX_HISTORY);
    this.setData({ history });
    wx.setStorageSync(HISTORY_KEY, history);
  },

  clearHistory() {
    this.setData({ history: [] });
    wx.removeStorageSync(HISTORY_KEY);
  },

  useKeyword(event) {
    this.apply(event.currentTarget.dataset.value);
  },

  goResult(event) {
    if (this.data.keyword) this.remember(this.data.keyword);
    wx.navigateTo({ url: event.currentTarget.dataset.path });
  }
});
