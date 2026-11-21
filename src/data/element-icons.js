// 元素图标（本地 /static/element，随包分发；单张约 2 KiB，共 8 张 ~16 KiB）：
// 奇波列表 / 详情 / 筛选面板共用，避免页面各自硬编码。
// key 与 src/data/element.js 的元素表一致；unknown/none 无专属图标，走彩色首字兜底。
// astral（星/光）源站图片已删除（404，无本地副本），置空走彩色徽章兜底；
// 若后续拿到新图，放入 src/static/element/astral.png 并在此填 '/static/element/astral.png'。
export const ELEMENT_ICONS = {
  flame: '/static/element/flame.png',
  wind: '/static/element/wind.png',
  earth: '/static/element/earth.png',
  grove: '/static/element/grove.png',
  frost: '/static/element/frost.png',
  flow: '/static/element/flow.png',
  bolt: '/static/element/bolt.png',
  astral: '',
  dark: '/static/element/dark.png'
};
