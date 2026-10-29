const characters = [
  {
    id: 'ainisi',
    name: '艾妮丝',
    title: '星原旅人',
    element: 'astral',
    role: '输出',
    rarity: '五星',
    verified: true,
    desc: '公开前瞻中演示的角色，作为图鉴初始条目与配队示例的核心。',
    skills: [
      { name: '普通攻击', type: '输出', desc: '多段近战连击，末段附带星辉附加伤害。' },
      { name: '战技', type: '爆发', desc: '突进斩击并标记目标，标记期间受击增伤。' },
      { name: '奇波合击', type: '共鸣', desc: '与出战奇波共同释放，按奇波元素附加效果。' }
    ],
    teams: ['星辉速攻', '双核共鸣']
  },
  {
    id: 'shiyi-luoluo',
    name: '示例·洛洛',
    title: '海岸向导',
    element: 'flow',
    role: '辅助',
    rarity: '四星',
    verified: false,
    desc: '示例条目：演示治疗与元素附着结构，公测后替换为官方角色。',
    skills: [
      { name: '潮涌', type: '治疗', desc: '为队伍回复生命并短暂提升抗打断。' },
      { name: '浪壁', type: '护盾', desc: '生成吸收盾，命中时附加流水元素。' }
    ],
    teams: ['水岩耐久']
  },
  {
    id: 'shiyi-kela',
    name: '示例·克拉',
    title: '炉心匠人',
    element: 'flame',
    role: '输出',
    rarity: '五星',
    verified: false,
    desc: '示例条目：演示范围爆发与家园生产加成的展示方式。',
    skills: [
      { name: '熔核投掷', type: '范围', desc: '投掷熔核造成范围烈焰伤害。' },
      { name: '工坊时间', type: '增益', desc: '提升家园生产速度与掉落。' }
    ],
    teams: ['焰林速清']
  },
  {
    id: 'shiyi-ming',
    name: '示例·冥',
    title: '雷影',
    element: 'bolt',
    role: '副C',
    rarity: '四星',
    verified: false,
    desc: '示例条目：演示感电连携与破架势定位。',
    skills: [{ name: '雷切', type: '连携', desc: '对流水附着目标触发感电，附加破架势。' }],
    teams: ['双核共鸣']
  },
  {
    id: 'shiyi-xue',
    name: '示例·雪莉',
    title: '霜线射手',
    element: 'frost',
    role: '控制',
    rarity: '五星',
    verified: false,
    desc: '示例条目：演示冻结控制与远程站位说明。',
    skills: [{ name: '霜锁', type: '控制', desc: '命中冻结目标可触发碎裂。' }],
    teams: ['冰雷控场']
  },
  {
    id: 'shiyi-mu',
    name: '示例·穆恩',
    title: '林语者',
    element: 'grove',
    role: '坦克',
    rarity: '四星',
    verified: false,
    desc: '示例条目：演示减抗与嘲讽位的数据结构。',
    skills: [{ name: '根缚', type: '控制', desc: '范围定身并降低目标防御。' }],
    teams: ['水岩耐久']
  }
];

const roles = ['全部', '输出', '副C', '辅助', '控制', '坦克'];
const rarities = ['全部', '五星', '四星'];

function byId(id) {
  return characters.filter((item) => item.id === id)[0] || null;
}

function keyword(item) {
  return [item.name, item.title, item.desc, item.role, item.rarity]
    .concat(item.teams)
    .concat(item.skills.map((skill) => skill.name))
    .join(' ')
    .toLowerCase();
}

function filter(options) {
  const opts = options || {};
  const kw = (opts.keyword || '').trim().toLowerCase();
  return characters.filter((item) => {
    if (opts.role && opts.role !== '全部' && item.role !== opts.role) return false;
    if (opts.element && opts.element !== 'all' && item.element !== opts.element) return false;
    if (opts.rarity && opts.rarity !== '全部' && item.rarity !== opts.rarity) return false;
    if (kw && keyword(item).indexOf(kw) < 0) return false;
    return true;
  });
}

module.exports = { notice: '仅「艾妮丝」来自公开前瞻，其余为示例条目，公测后以官方角色替换。', characters, roles, rarities, byId, filter };
