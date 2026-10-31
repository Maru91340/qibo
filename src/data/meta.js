export const META_NOTICE = '奇波与角色数据以官方公测公告为准。';

// 分组顺序即首页展示顺序；mode: card=宫格卡片 / row=紧凑行
export const sectionGroups = [
  { key: 'catalog', title: '图鉴', mode: 'card' },
  { key: 'query', title: '信息查询', mode: 'card' },
  { key: 'content', title: '内容与运营', mode: 'row' },
  { key: 'tool', title: '工具（低优先级）', mode: 'row' }
];

export const sections = [
  { key: 'qibo', group: 'catalog', title: '奇波图鉴', desc: '分布、进化阶段与用途速查', icon: 'smile', path: '/pages/qibo/list', accent: '#2f6bff' },
  { key: 'character', group: 'catalog', title: '角色图鉴', desc: '元素、定位与配队思路一览', icon: 'usergroup', path: '/pages/character/list', accent: '#7f5bff' },
  { key: 'spirit', group: 'catalog', title: '灵子图鉴', desc: '灵子套装与属性筛选', icon: 'bookmark', accent: '#8a93a8', path: '/pages/spirit/list', accent: '#7f5bff' },
  { key: 'item', group: 'catalog', title: '物品图鉴', desc: '物品类型与稀有度速查', icon: 'bookmark', accent: '#8a93a8', path: '/pages/item/list', accent: '#2f6bff' },
  { key: 'equipment', group: 'catalog', title: '装备图鉴', desc: '装备类型与套装查看', icon: 'bookmark', accent: '#8a93a8', path: '/pages/equipment/list', accent: '#ff8a3d' },
  { key: 'material', group: 'catalog', title: '材料图鉴', desc: '养成材料与用途', icon: 'bookmark', accent: '#8a93a8', path: '/pages/material/list', accent: '#00b3a4' },
  { key: 'food', group: 'catalog', title: '美食图鉴', desc: '料理效果与饱腹值', icon: 'bookmark', accent: '#8a93a8', path: '/pages/food/list', accent: '#ff5b7f' },
  { key: 'fishing', group: 'catalog', title: '钓鱼图鉴', desc: '鱼类与产地信息', icon: 'bookmark', accent: '#8a93a8', path: '/pages/fishing/list', accent: '#12a5c9' },
  { key: 'enemy', group: 'catalog', title: '敌人图鉴', desc: '敌人类型与应对建议', icon: 'flag', path: '/pages/enemy/list', accent: '#e0553f' },
  { key: 'dungeon', group: 'catalog', title: '副本图鉴', desc: '副本类型与掉落', icon: 'flag', path: '/pages/dungeon/list', accent: '#5a6ad0' },
  { key: 'building', group: 'catalog', title: '家园建筑', desc: '建筑功能与解锁条件', icon: 'bookmark', accent: '#8a93a8', path: '/pages/building/list', accent: '#0aa06e' },
  { key: 'achievement', group: 'catalog', title: '成就图鉴', desc: '成就分类与点数统计', icon: 'star', path: '/pages/achievement/achievement', accent: '#d9a514' },
  { key: 'region', group: 'catalog', title: '地区阵营', desc: '地区与阵营条目', icon: 'map', path: '/pages/region/list', accent: '#3f7fe0' },
  { key: 'element', group: 'query', title: '元素克制', desc: '相克矩阵与组队元素覆盖', icon: 'swap', path: '/pages/element/element', accent: '#00b3a4' },
  { key: 'affix', group: 'query', title: '战斗词条', desc: '机制/输出/增益/减益释义', icon: 'bookmark', accent: '#8a93a8', path: '/pages/affix/affix', accent: '#e0553f' },
  { key: 'evolution', group: 'query', title: '进化图谱', desc: '按元素查看奇波进化链', icon: 'time', path: '/pages/evolution/evolution', accent: '#7f5bff' },
  { key: 'station', group: 'query', title: '家园派驻', desc: '按工种汇总派驻奇波', icon: 'bookmark', accent: '#8a93a8', path: '/pages/station/station', accent: '#0aa06e' },
  { key: 'favorites', group: 'query', title: '我的收藏', desc: '本机收藏的条目', icon: 'star', path: '/pages/favorites/favorites', accent: '#d9a514' },
  { key: 'search', group: 'query', title: '全局搜索', desc: '一次搜索覆盖全部图鉴', icon: 'search', path: '/pages/search/search', accent: '#2f6bff' },
  { key: 'team', group: 'query', title: '队伍编成', desc: '保存搭配，本地记录不上传', icon: 'secured', path: '/pages/team/team', accent: '#ff8a3d' },
  { key: 'beast', group: 'content', title: '凶兽生态', desc: '凶兽条目图文', icon: 'bookmark', accent: '#8a93a8', path: '/pages/beast/beast' },
  { key: 'tutorial', group: 'content', title: '教程合集', desc: '新手系列教程', icon: 'bookmark', accent: '#8a93a8', path: '/pages/tutorial/list' },
  { key: 'guide', group: 'content', title: '玩法指南', desc: '四大类分步图文', icon: 'bookmark', accent: '#8a93a8', path: '/pages/guide/guide' },
  { key: 'story', group: 'content', title: '剧情读物', desc: '剧情条目阅读', icon: 'bookmark', accent: '#8a93a8', path: '/pages/story/list' },
  { key: 'versus', group: 'content', title: '奇波对决', desc: '对决规则与阵容', icon: 'bookmark', accent: '#8a93a8', path: '/pages/versus/versus' },
  { key: 'ridu', group: 'content', title: '日渡尘影', desc: '剧情分类目录', icon: 'bookmark', accent: '#8a93a8', path: '/pages/ridu/ridu' },
  { key: 'wallpaper', group: 'content', title: '壁纸画廊', desc: '官方壁纸浏览', icon: 'bookmark', accent: '#8a93a8', path: '/pages/wallpaper/list' },
  { key: 'codes', group: 'content', title: '福利码', desc: '兑换码汇总', icon: 'bookmark', accent: '#8a93a8', path: '/pages/codes/codes' },
  { key: 'subscribe', group: 'content', title: '订阅提醒', desc: '订阅项管理', icon: 'bookmark', accent: '#8a93a8', path: '/pages/subscribe/subscribe' },
  { key: 'wiki', group: 'content', title: '奇波百科', desc: '百科说明', icon: 'bookmark', accent: '#8a93a8', path: '/pages/wiki/wiki' },
  { key: 'about', group: 'content', title: '关于游戏', desc: '游戏与制作组信息', icon: 'bookmark', accent: '#8a93a8', path: '/pages/about/about' },
  { key: 'settings', group: 'content', title: '设置', desc: '主题与缓存管理', icon: 'bookmark', accent: '#8a93a8', path: '/pages/settings/settings' },
  { key: 'compare', group: 'tool', title: '角色对比', desc: '双列对比工具', icon: 'bookmark', accent: '#8a93a8', path: '/pages/compare/compare' },
  { key: 'cultivation', group: 'tool', title: '养成计算', desc: '养成材料清单', icon: 'bookmark', accent: '#8a93a8', path: '/pages/cultivation/cultivation' },
  { key: 'pity', group: 'tool', title: '保底计算', desc: '垫抽数计算器', icon: 'bookmark', accent: '#8a93a8', path: '/pages/pity/pity' },
  { key: 'simulator', group: 'tool', title: '星结模拟', desc: '概率模拟器', icon: 'bookmark', accent: '#8a93a8', path: '/pages/simulator/simulator' },
  { key: 'rebate', group: 'tool', title: '充值返利', desc: '累计充值计算', icon: 'bookmark', accent: '#8a93a8', path: '/pages/rebate/rebate' },
  { key: 'explore', group: 'tool', title: '地图探索', desc: '区域点位清单', icon: 'bookmark', accent: '#8a93a8', path: '/pages/explore/explore' }
];

// 尚未开发的占位页；其余首页入口均视为可用，首页据此显示「建设中」角标
const PLACEHOLDER_PATHS = [];

sections.forEach((item) => {
  item.ready = PLACEHOLDER_PATHS.indexOf(item.path) < 0;
});

export const banners = [
  {
    id: 'release',
    tag: '版本动态',
    title: '公测定档前瞻',
    desc: '定档信息、福利与保底规则整理，先看一步。',
    path: '/pages/codes/codes'
  },
  {
    id: 'camp',
    tag: '玩法',
    title: '奇波营地大作战',
    desc: '捉宠、骑乘解谜与家园自动劳作怎么玩。',
    path: '/pages/guide/guide'
  },
  {
    id: 'team',
    tag: '工具',
    title: '队伍编成器上线',
    desc: '搭配角色与出战奇波，自动算元素覆盖。',
    path: '/pages/team/team'
  }
];
