import { characters } from './character.js';
import { regionCatalog } from './manual-catalogs.js';

// 工具页数据：全部为交互骨架示例，官方数值/规则未公开，统一 verified: false。
export const TOOLS_NOTICE = '公测 2026-11-26 开启，工具中的数值、概率与返利规则均以官方公告为准；当前版本先提供交互骨架。';

export const compareDimensions = [
  { key: 'element', label: '元素' },
  { key: 'role', label: '定位' },
  { key: 'rarity', label: '稀有度' },
  { key: 'teams', label: '推荐队伍' },
  { key: 'stats', label: '基础数值' }
];

export const compareCharacters = characters.map((item) => ({
  id: item.id,
  name: item.name,
  title: item.title,
  element: item.element,
  role: item.role,
  rarity: item.rarity,
  teams: item.teams || [],
  verified: item.verified
}));

export const cultivationStages = [
  { key: 'lv20', label: '1 → 20 级', hint: '熟悉基础循环', materials: ['经验材料', '通用货币'] },
  { key: 'lv40', label: '20 → 40 级', hint: '解锁更多玩法', materials: ['经验材料', '突破材料', '通用货币'] },
  { key: 'lv60', label: '40 → 60 级', hint: '主力角色阶段', materials: ['经验材料', '突破材料', '技能材料', '通用货币'] },
  { key: 'lv80', label: '60 → 80 级', hint: '长线养成目标', materials: ['经验材料', '突破材料', '技能材料', '稀有素材', '通用货币'] }
];

export const pityDefaults = { current: 0, target: 90 };

export const simulatorPresets = { rates: [0.6, 1.6], pulls: [10, 50, 100] };

export const rebateTiers = [
  { amount: 6, reward: '示例档位 · 待核实' },
  { amount: 30, reward: '示例档位 · 待核实' },
  { amount: 98, reward: '示例档位 · 待核实' },
  { amount: 198, reward: '示例档位 · 待核实' },
  { amount: 328, reward: '示例档位 · 待核实' },
  { amount: 648, reward: '示例档位 · 待核实' }
];

export const exploreCategories = ['全部', '采集点', '奇波栖息', '传送点', '副本入口'];

const regionName = (id) => {
  const found = regionCatalog.items.find((item) => item.id === id);
  return found ? found.name : '待核实区域';
};

const pointSeed = [
  { id: 'poi-chuguang-tide', name: '潮汐浅滩', regionId: 'region-chuguang', category: '采集点', element: '水', desc: '初始区域的海岸采集带，适合熟悉基础食材与素材采集。' },
  { id: 'poi-chuguang-camp', name: '星落营地', regionId: 'region-chuguang', category: '传送点', desc: '初始区域落脚点，作为探索路线的起点。' },
  { id: 'poi-chuguang-nest', name: '缓坡巢穴', regionId: 'region-chuguang', category: '奇波栖息', element: '水', desc: '低阶奇波活动区，适合练习捕捉与元素反应。' },
  { id: 'poi-charlulu-market', name: '夏露露集市', regionId: 'region-charlulu', category: '采集点', desc: '兽人村落的生活集市，常见日常材料交换。' },
  { id: 'poi-charlulu-trail', name: '森林巡猎道', regionId: 'region-charlulu', category: '奇波栖息', element: '林', desc: '狩猎与采集路线，兽形奇波出没。' },
  { id: 'poi-charlulu-mill', name: '村口风车', regionId: 'region-charlulu', category: '传送点', desc: '村落入口地标，往返家园的常用落点。' },
  { id: 'poi-fengyu-cliff', name: '岚歌断崖', regionId: 'region-fengyu', category: '奇波栖息', element: '风', desc: '高地气流强劲，飞行类奇波活动频繁。' },
  { id: 'poi-fengyu-herb', name: '风语草甸', regionId: 'region-fengyu', category: '采集点', element: '风', desc: '高地草甸，分布风元素相关素材。' },
  { id: 'poi-langyao-woods', name: '月狼密林', regionId: 'region-langyao', category: '奇波栖息', element: '林', desc: '密林深处的狼形奇波群，夜间更活跃。' },
  { id: 'poi-langyao-altar', name: '古木祭坛', regionId: 'region-langyao', category: '副本入口', desc: '密林中的遗迹入口，具体副本规则公测后开放。' },
  { id: 'poi-aidenland-port', name: '港口旧仓', regionId: 'region-aidenland', category: '采集点', desc: '贸易港口的旧仓库区，常见补给类材料。' },
  { id: 'poi-aidenland-yard', name: '骑士训练场', regionId: 'region-aidenland', category: '副本入口', desc: '城邦训练设施，挑战内容公测后开放。' },
  { id: 'poi-averian-perch', name: '天马林台', regionId: 'region-averian', category: '传送点', desc: '林间高台，俯瞰高等精灵城邦的路线节点。' },
  { id: 'poi-averian-pasture', name: '风马牧场', regionId: 'region-averian', category: '奇波栖息', element: '风', desc: '天马与飞行奇波的栖息地，适合观察与捕捉。' }
];

export const explorePoints = pointSeed.map((item) => Object.assign({}, item, {
  regionName: regionName(item.regionId),
  verified: false
}));
