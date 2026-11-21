// 角色字典（来源：竞品《蓝色星原手册》元素克制/战斗词条页实机采集，2026-11-03）
// 武器 9 种数量与职业 5 类为竞品页面明示数据；战斗定位官方共 12 种，已确认 2 种，其余公测后补全。

export const WEAPON_TYPES = [
  { key: 'polearm', name: '长柄武器', count: 5 },
  { key: 'dualblade', name: '双刀', count: 4 },
  { key: 'scythe', name: '镰刀', count: 3 },
  { key: 'musket', name: '火枪', count: 3 },
  { key: 'onehand', name: '单手武器', count: 3 },
  { key: 'bow', name: '弓', count: 3 },
  { key: 'staff', name: '法杖', count: 2 },
  { key: 'whip', name: '鞭子', count: 1 },
  { key: 'gauntlet', name: '格斗武器', count: 1 }
];

export const BATTLE_ROLES = [
  { key: 'burst', name: '爆发', desc: '通过爆炸式输出造成大量伤害，不消耗属性印记。' },
  { key: 'break', name: '破坏', alias: '击破', desc: '专精破甲，稳定消耗属性印记大幅削减敌方架势。' },
  { key: 'assault', name: '猛攻', desc: '具备稳定输出的能力，能在造成高伤害的同时，快速消耗调谱打出更高伤害。' },
  { key: 'amp', name: '增幅', desc: '高效叠加属性印记，为队友营造输出环境。' },
  { key: 'grant', name: '赋予', desc: '提供增益、减益等支援能力，消耗印记放大 buff 效果。' }
];

export const COMBAT_POSITIONS = {
  total: 12,
  known: ['敌方减益', '生存防御'],
  notice: '官方战斗定位共 12 种，其余 10 种待公测客户端数据补全。'
};

export const RARITY_ORDER = ['SSR', 'SR', 'R'];

export const CAMPS = [
  '阿瓦利安', '辰王朝', '断风磐', '弗利斯城邦', '罗吉尼亚联邦',
  '罗吉亚帝国', '洛斯兰瑟', '祈云', '夏露露村', '无阵营'
];

export const RACES = [
  '高等精灵族', '鬼人族', '龙人族', '木精灵族', '帕米族', '兽人族', '智人族', '未知'
];

export const MATERIAL_QUALITY = ['荧', '烁', '辉', '煌', '烬'];
