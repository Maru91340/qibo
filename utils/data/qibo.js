const qibos = [
  {
    id: 'sencai-lingdie',
    name: '森彩灵蝶',
    element: 'grove',
    kind: '收藏型',
    usage: ['探索', '战斗'],
    rarity: '稀有',
    habitat: '森系区域',
    stages: ['一阶', '二阶', '三阶', '四阶'],
    forms: ['星彩', '闪光', '异色'],
    verified: true,
    desc: '前瞻中明确演示了四阶段进化与星彩/闪光/异色稀有形态，是收藏向奇波的代表。',
    skills: ['骑乘解谜', '合击触发']
  },
  {
    id: 'yanbeishou',
    name: '岩背兽',
    element: 'flame',
    kind: '实用派',
    usage: ['家园生产'],
    rarity: '普通',
    habitat: '岩地丘陵',
    stages: ['一阶', '二阶', '三阶'],
    forms: [],
    verified: false,
    desc: '示例条目：偏家园自动劳作的负重型奇波，用于占位演示筛选与详情结构。',
    skills: ['搬运', '耕作']
  },
  {
    id: 'chaomingyao',
    name: '潮鸣鳐',
    element: 'flow',
    kind: '实用派',
    usage: ['探索'],
    rarity: '稀有',
    habitat: '椰香海岸',
    stages: ['一阶', '二阶', '三阶'],
    forms: ['异色'],
    verified: false,
    desc: '示例条目：海岸水域滑翔型奇波，演示按栖息地与元素筛选。',
    skills: ['水域滑翔']
  },
  {
    id: 'leiwenyun',
    name: '雷纹隼',
    element: 'bolt',
    kind: '收藏型',
    usage: ['战斗'],
    rarity: '闪光',
    habitat: '高崖风口',
    stages: ['一阶', '二阶', '三阶', '四阶'],
    forms: ['闪光'],
    verified: false,
    desc: '示例条目：奇波对决中的速攻位，演示闪光形态标签。',
    skills: ['先手突进', '破架势']
  },
  {
    id: 'shuangtilu',
    name: '霜蹄鹿',
    element: 'frost',
    kind: '收藏型',
    usage: ['探索', '家园生产'],
    rarity: '稀有',
    habitat: '雪线林缘',
    stages: ['一阶', '二阶', '三阶'],
    forms: ['星彩'],
    verified: false,
    desc: '示例条目：雪原骑乘型奇波，演示多用途叠加展示。',
    skills: ['雪原骑乘', '采集']
  },
  {
    id: 'fengrongyang',
    name: '风绒羊',
    element: 'grove',
    kind: '实用派',
    usage: ['家园生产'],
    rarity: '普通',
    habitat: '草原牧场',
    stages: ['一阶', '二阶'],
    forms: [],
    verified: false,
    desc: '示例条目：产出绒毛类材料的家园型奇波，演示低阶进化链。',
    skills: ['剪毛', '放牧']
  },
  {
    id: 'huiguangdie',
    name: '辉光蝶',
    element: 'astral',
    kind: '收藏型',
    usage: ['战斗', '探索'],
    rarity: '星彩',
    habitat: '星辉裂隙',
    stages: ['一阶', '二阶', '三阶', '四阶'],
    forms: ['星彩', '异色'],
    verified: false,
    desc: '示例条目：星辉系奇波，演示与角色合击时的元素覆盖计算。',
    skills: ['合击增幅', '共鸣']
  }
];

const kinds = ['全部', '收藏型', '实用派'];
const usages = ['全部', '战斗', '家园生产', '探索'];
const rarities = ['全部', '普通', '稀有', '闪光', '星彩', '异色'];

function byId(id) {
  return qibos.filter((item) => item.id === id)[0] || null;
}

function keyword(item) {
  return [item.name, item.desc, item.habitat, item.kind, item.rarity]
    .concat(item.usage)
    .concat(item.forms)
    .concat(item.skills)
    .join(' ')
    .toLowerCase();
}

function filter(options) {
  const opts = options || {};
  const kw = (opts.keyword || '').trim().toLowerCase();
  return qibos.filter((item) => {
    if (opts.kind && opts.kind !== '全部' && item.kind !== opts.kind) return false;
    if (opts.element && opts.element !== 'all' && item.element !== opts.element) return false;
    if (opts.rarity && opts.rarity !== '全部' && item.rarity !== opts.rarity) return false;
    if (opts.usage && opts.usage !== '全部' && item.usage.indexOf(opts.usage) < 0) return false;
    if (kw && keyword(item).indexOf(kw) < 0) return false;
    return true;
  });
}

module.exports = {
  notice: '仅「森彩灵蝶」来自公开前瞻，其余为示例条目，公测后以官方图鉴替换。',
  qibos,
  kinds,
  usages,
  rarities,
  byId,
  filter
};
