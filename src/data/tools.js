import { characters } from './character.js';
import { regionCatalog } from './manual-catalogs.js';

// 工具页数据：全部为交互骨架示例，官方数值/规则未公开，统一 verified: false。
export const TOOLS_NOTICE = '公测 2026-11-26 开启，工具中的数值、概率与返利规则均以官方公告为准；当前版本先提供交互骨架。';

export const compareDimensions = [
  { key: 'rarity', label: '稀有度' },
  { key: 'role', label: '职业' },
  { key: 'weapon', label: '武器' },
  { key: 'element', label: '元素' },
  { key: 'camp', label: '阵营' }
];

// 对比池：示例 + BWIKI 真实角色（与角色图鉴同源）
import { bundledCatalog } from './catalog.js';
const allCharacters = (bundledCatalog.character.items || []);

export const compareCharacters = allCharacters.map((item) => ({
  id: item.id,
  name: item.name,
  title: item.title,
  element: item.element,
  role: item.role,
  rarity: item.rarity,
  weapon: item.weapon || '',
  camp: item.camp || '',
  race: item.race || '',
  teams: item.teams || [],
  verified: item.verified
}));

// 面板对比行（数值公测后填入，当前显示「—」态）
export const panelCompareRows = [
  { key: 'hp', label: '生命', left: null, right: null },
  { key: 'atk', label: '攻击', left: null, right: null },
  { key: 'def', label: '防御', left: null, right: null },
  { key: 'over', label: '超限强度', left: null, right: null },
  { key: 'poise', label: '破韧值', left: null, right: null },
  { key: 'total', label: '综合', left: null, right: null }
];

export const cultivationStages = [
  { key: 'lv20', label: '1 → 20 级', hint: '熟悉基础循环', materials: ['经验材料', '通用货币'] },
  { key: 'lv40', label: '20 → 40 级', hint: '解锁更多玩法', materials: ['经验材料', '突破材料', '通用货币'] },
  { key: 'lv60', label: '40 → 60 级', hint: '主力角色阶段', materials: ['经验材料', '突破材料', '技能材料', '通用货币'] },
  { key: 'lv80', label: '60 → 80 级', hint: '长线养成目标', materials: ['经验材料', '突破材料', '技能材料', '稀有素材', '通用货币'] }
];

export const pityDefaults = { current: 0, target: 90 };

export const simulatorPresets = { rates: [0.6, 1.6], pulls: [10, 50, 100] };

// 星结概率参考表（来源：竞品《蓝色星原手册》默认参数实机截图 2026-11-03；公式未公开，仅作参考）
export const starCardRates = [
  { key: 'normal', name: '普通', rate: '0.79%', expected: '34.42', p95: 61, guaranteed: 101 },
  { key: 'rare', name: '奇特', rate: '0.79%', expected: '26.62', p95: 45, guaranteed: 65 },
  { key: 'fine', name: '精美', rate: '23.4%', expected: '3.37', p95: 8, guaranteed: 14 },
  { key: 'precious', name: '珍贵', rate: '48.8%', expected: '1.83', p95: 4, guaranteed: 6 },
  { key: 'out', name: '出众', rate: '71.4%', expected: '1.33', p95: 2, guaranteed: 3 },
  { key: 'shine', name: '闪耀', rate: '87.4%', expected: '1.13', p95: 2, guaranteed: 2 },
  { key: 'superb', name: '卓然', rate: '99.3%', expected: '1.01', p95: 1, guaranteed: 2 },
  { key: 'liao', name: '寥光', rate: '100%', expected: '1.00', p95: 1, guaranteed: 1, recommend: true },
  { key: 'limitless', name: '无限', rate: '100%', expected: '1.00', p95: 1, guaranteed: 1 }
];

// 过程拆解示例（竞品默认参数：小芽狐 Lv.30 / 血量100% / 世界等级1 / 连结力60 / 无蛋糕）
export const starProcessDemo = [
  { label: '星结难度', value: '40' },
  { label: '卡牌修正', value: '0.4%' },
  { label: '连结影响', value: '120.0%' }
];

export const rebateQuickAmounts = [6, 30, 98, 328, 648, 2000, 3000, 5000];

// 返利规则（来源：竞品《蓝色星原手册》福利页/返利计算器实机截图 2026-11-03，原文要点）
export const rebateRules = [
  '公测后用同一萤啾通行证登录，返还以星虹形式发至游戏内邮件',
  '返还邮件自公测起 365 天内有效，逾期作废',
  '首充双倍的赠送部分、档位附赠道具、系统赠送星虹不计入返还基数',
  '「飞信订约」每份额外返 1 张订约凭证（最多记 3 份）；「普罗米利亚游记」按档位返游记凭证',
  'iOS 端受平台政策限制不能在游戏内充值，需走 PC / 安卓官服或网页商城'
];

// 估算口径：2,000 元以内按 200% 返星虹，更高部分按 150%（竞品另有 125% 档，分界待核实）
export function calcRebate(amount) {
  const yuan = Math.max(Number(amount) || 0, 0);
  const low = Math.min(yuan, 2000);
  const high = Math.max(yuan - 2000, 0);
  return Math.round(low * 2 + high * 1.5);
}

export const exploreCategories = ['全部', '地标', '宝箱', '探索', '书籍', '奇波'];

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

// 角色名清单（供养成计算 picker 使用，与 catalogs charWiki 同名）
export const charNameList = ['阿比', '艾妮丝', '姬瑟贝露', '法兰塔', '寒悠悠', '卡塔露', '兰香子', '莉莉', '洛卿', '璐璐卡', '枫糖', '米砂', '源千代', '米蒂', '末音', '诺诺', '佩佩', '瓦瓦', '红宝石', '夏儿', '星裔（女）', '星裔（男）', '西芙莉雅', '忒拉拉', '涂山小玉', '星临者'];
