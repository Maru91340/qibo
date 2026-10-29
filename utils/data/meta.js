const sections = [
  {
    key: 'qibo',
    title: '奇波图鉴',
    desc: '分布、进化阶段与用途速查',
    icon: 'smile',
    path: '/pages/qibo/index',
    accent: '#2f6bff'
  },
  {
    key: 'character',
    title: '角色图鉴',
    desc: '元素、定位与配队思路一览',
    icon: 'usergroup',
    path: '/pages/character/index',
    accent: '#7f5bff'
  },
  {
    key: 'element',
    title: '元素克制',
    desc: '相克矩阵与组队元素覆盖',
    icon: 'swap',
    path: '/pages/element/index',
    accent: '#00b3a4'
  },
  {
    key: 'team',
    title: '队伍编成',
    desc: '保存搭配，本地记录不上传',
    icon: 'secured',
    path: '/pages/team/index',
    accent: '#ff8a3d'
  }
];

const banners = [
  {
    id: 'release',
    tag: '版本动态',
    title: '公测定档前瞻',
    desc: '定档信息、福利与保底规则整理，先看一步。',
    path: '/pages/qibo/index'
  },
  {
    id: 'camp',
    tag: '玩法',
    title: '奇波营地大作战',
    desc: '捉宠、骑乘解谜与家园自动劳作怎么玩。',
    path: '/pages/qibo/index'
  },
  {
    id: 'team',
    tag: '工具',
    title: '队伍编成器上线',
    desc: '搭配角色与出战奇波，自动算元素覆盖。',
    path: '/pages/team/index'
  }
];

module.exports = { sections, banners };
