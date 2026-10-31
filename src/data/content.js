export const CONTENT_UPDATED_AT = '2026-10-31';
export const CONTENT_NOTICE =
  '内容为站内功能教程与公开资料整理，公测前数值、名称与剧情细节可能变动；标注「待核实」的条目请以官方信息为准。';

const tutorialItems = [
  {
    id: 'element-basics',
    title: '元素克制：3 分钟看懂相克矩阵',
    category: '入门',
    summary: '先分清攻击方与防守方，再记住三个闭环，组队时就能快速补短板。',
    tags: ['元素', '组队', '新手'],
    verified: true,
    sections: [
      {
        title: '矩阵怎么读',
        text: '每一行是攻击方，每一列是防守方。格子里写「克制」表示增伤，「被克」表示减伤，「中立」表示没有修正。'
      },
      {
        title: '先记住三个闭环',
        steps: ['焰克林、林克流、流克焰，构成基础三角。', '惊雷克流水，寒霜克惊雷，星辉克寒霜与烈焰。', '同一只敌人被多个元素克制时，优先补主输出的短板。']
      },
      {
        title: '组队怎么落地',
        steps: ['打开元素克制页，先确认本期敌人的元素。', '主输出确定后，补一个能克制主流敌人的副位。', '回到队伍编成保存阵容，下次直接复用。'],
        link: { label: '打开元素克制', path: '/pages/element/element' }
      }
    ],
    related: ['qibo-filter', 'team-build']
  },
  {
    id: 'qibo-filter',
    title: '奇波图鉴：按元素与用途三步筛选',
    category: '图鉴',
    summary: '元素、用途、稀有度三层筛选，比逐个翻卡片快得多。',
    tags: ['奇波', '筛选'],
    verified: true,
    sections: [
      {
        title: '筛选顺序',
        steps: ['先点元素 pill，缩小到你要的属性。', '再用用途筛出战斗、家园生产或探索。', '最后按稀有度确认是否值得培养。']
      },
      {
        title: '卡片上有什么',
        text: '卡片会显示元素、用途标签、稀有度与「示例」标识。没有官方来源的条目会标「待核实」，不要直接当正式数据引用。'
      },
      {
        title: '进详情看进化',
        steps: ['点开条目查看进化阶段与形态。', '在详情页可以直接设为出战。', '想按元素横向比较时，改用进化图谱。'],
        link: { label: '打开奇波图鉴', path: '/pages/qibo/list' }
      }
    ],
    related: ['evolution', 'team-build']
  },
  {
    id: 'team-build',
    title: '队伍编成：从选人到保存一套阵容',
    category: '组队',
    summary: '先定元素覆盖，再补定位，最后保存到本地随时取用。',
    tags: ['队伍', '本地保存'],
    verified: true,
    sections: [
      {
        title: '先定骨架',
        steps: ['确认主输出与它的克制元素。', '补一个能处理被克场景的副位。', '留一个位置给探索或家园用途的奇波。']
      },
      {
        title: '再调细节',
        text: '队伍页支持增删成员与查看元素覆盖；阵容只保存在本机，不会上传到云端。'
      },
      {
        title: '保存与复用',
        steps: ['编辑完成后点保存。', '下次进入队伍页会直接读取上次阵容。', '想清空时逐个移除成员即可。'],
        link: { label: '打开队伍编成', path: '/pages/team/team' }
      }
    ],
    related: ['element-basics', 'station']
  },
  {
    id: 'station',
    title: '家园派驻：按工种给奇波排班',
    category: '家园',
    summary: '派驻页按工种分组，先看缺口再安排，避免同一只奇波被重复占用。',
    tags: ['家园', '派驻'],
    verified: true,
    sections: [
      {
        title: '先看工种',
        text: '页面按工种汇总可派驻奇波，每一组只列一次，方便对照家园建筑需求。'
      },
      {
        title: '再排优先级',
        steps: ['优先填生产类工种，保证日常产出。', '探索型奇波留给外出队伍。', '同一只奇波不要同时放进多个岗位。'],
        link: { label: '打开家园派驻', path: '/pages/station/station' }
      }
    ],
    related: ['team-build', 'catalog-read']
  },
  {
    id: 'evolution',
    title: '进化图谱：按元素看完整成长链',
    category: '图鉴',
    summary: '把同一元素的奇波按阶段排开，先看终点再决定练哪只。',
    tags: ['进化', '奇波'],
    verified: true,
    sections: [
      {
        title: '按元素分组',
        text: '图谱按元素分组，每条链从低阶排到高阶，阶段行可以直接跳到奇波详情。'
      },
      {
        title: '什么时候用',
        steps: ['想确认某只奇波最终形态时。', '比较同元素不同链的长度与形态时。', '规划收藏目标时。'],
        link: { label: '打开进化图谱', path: '/pages/evolution/evolution' }
      }
    ],
    related: ['qibo-filter', 'catalog-read']
  },
  {
    id: 'affix',
    title: '战斗词条：机制、输出、增益、减益',
    category: '战斗',
    summary: '遇到不熟的战斗术语，先来这里按分类查，再回详情页对照。',
    tags: ['战斗', '词条'],
    verified: true,
    sections: [
      {
        title: '按分类找',
        steps: ['先选分类 chips，例如机制或减益。', '点开条目展开释义。', '需要深入时再对照奇波或角色详情。'],
        link: { label: '打开战斗词条', path: '/pages/affix/affix' }
      },
      {
        title: '释义边界',
        text: '词条说明为社区整理，公测后以游戏内实际描述为准。'
      }
    ],
    related: ['element-basics', 'global-search']
  },
  {
    id: 'global-search',
    title: '全局搜索：一次覆盖 12 类图鉴',
    category: '工具',
    summary: '记不住条目在哪一类时，直接从首页搜索框输入关键词。',
    tags: ['搜索', '效率'],
    verified: true,
    sections: [
      {
        title: '怎么搜',
        steps: ['在首页搜索框输入名称、效果或标签。', '结果按图鉴类型分组，同一条目只出现一次。', '点结果直接进入对应详情。']
      },
      {
        title: '搜不到怎么办',
        text: '先缩短关键词，或去对应图鉴用 facet 筛选；仍没有结果说明该条目尚未收录。',
        link: { label: '打开全局搜索', path: '/pages/search/search' }
      }
    ],
    related: ['catalog-read', 'affix']
  },
  {
    id: 'catalog-read',
    title: '图鉴条目怎么读：从卡片到详情',
    category: '入门',
    summary: '卡片看结论，详情看字段；「待核实」标签决定这条数据能不能直接引用。',
    tags: ['图鉴', '数据边界'],
    verified: true,
    sections: [
      {
        title: '卡片信息',
        text: '卡片展示名称、分类、稀有度、摘要与图片；图片加载失败时会回退成文字徽章。'
      },
      {
        title: '详情字段',
        steps: ['概要说明条目定位。', '基础信息列出可筛选字段。', '详情与分节补充机制、掉落或应对建议。']
      },
      {
        title: '可信度',
        text: '带「待核实」的条目为示例或社区整理，公测后会被重新采集替换。'
      }
    ],
    related: ['global-search', 'qibo-filter']
  },
  {
    id: 'achievement',
    title: '成就图鉴：分类、点数与完成条件',
    category: '图鉴',
    summary: '先看统计栏了解总量，再按分类展开完成条件，缺哪类补哪类。',
    tags: ['成就', '收集'],
    verified: true,
    sections: [
      {
        title: '统计栏',
        text: '顶部显示成就总数、大类数与成就点数，用来判断收集进度的大致分布。'
      },
      {
        title: '分类展开',
        steps: ['选分类 chips 过滤。', '点条目展开完成条件与字段。', '用搜索框直接找成就名。'],
        link: { label: '打开成就图鉴', path: '/pages/achievement/achievement' }
      }
    ],
    related: ['catalog-read', 'global-search']
  },
  {
    id: 'theme-settings',
    title: '主题与缓存：浅色、深色与跟随系统',
    category: '工具',
    summary: '设置页可以切换主题、清理图鉴缓存，并查看当前版本信息。',
    tags: ['设置', '主题'],
    verified: true,
    sections: [
      {
        title: '主题切换',
        steps: ['进入设置页选择浅色、深色或跟随系统。', '跟随系统会随手机深色模式自动切换。', '偏好保存在本机，下次启动继续生效。']
      },
      {
        title: '什么时候清缓存',
        text: '云端资料更新异常或条目显示旧数据时，清空图鉴缓存后会回落到内置资料并重新同步。',
        link: { label: '打开设置', path: '/pages/settings/settings' }
      }
    ],
    related: ['catalog-read']
  }
];

const storyItems = [
  {
    id: 'world-promilia',
    title: '普罗米利亚大陆：故事发生的舞台',
    category: '世界设定',
    summary: '从公开资料与图鉴地区条目整理的大陆印象，细节待公测补完。',
    tags: ['世界观', '大陆'],
    verified: false,
    sections: [
      {
        title: '大陆印象',
        text: '《蓝色星原：旅谣》的冒险发生在普罗米利亚大陆。图鉴地区条目目前收录了大陆、国家、村落与区域四类地点。'
      },
      {
        title: '已收录地点',
        steps: ['国家：艾登兰、阿瓦利安。', '村落：夏露露村。', '区域：风语岚歌、狼神之影、初始的星光。']
      },
      {
        title: '资料边界',
        text: '以上名称来自图鉴示例与公开页面整理，剧情中的实际关系与时间线尚未公开，公测后按官方内容重写。'
      }
    ],
    related: ['regions-overview', 'qibo-spirit']
  },
  {
    id: 'qibo-spirit',
    title: '奇波与灵子：两个核心概念',
    category: '世界设定',
    summary: '奇波是伙伴与生产单位，灵子是装备与属性来源；先把这两个词分清。',
    tags: ['奇波', '灵子', '入门'],
    verified: false,
    sections: [
      {
        title: '奇波',
        text: '奇波是大陆上的生物伙伴，可用于战斗、探索与家园生产；图鉴中按元素、用途与稀有度分类，并展示进化阶段与形态。'
      },
      {
        title: '灵子',
        text: '灵子图鉴收录套装与属性条目，用来筛选装备方向；与奇波图鉴分开维护，避免混淆。'
      },
      {
        title: '怎么用这两个词',
        steps: ['说「练哪只」时指奇波。', '说「带什么套」时指灵子。', '搜索时直接输名称，全局搜索会跨图鉴去重。'],
        link: { label: '打开灵子图鉴', path: '/pages/spirit/list' }
      }
    ],
    related: ['world-promilia', 'glossary']
  },
  {
    id: 'regions-overview',
    title: '地区与阵营速览',
    category: '世界设定',
    summary: '把图鉴里的国家、村落与区域放在一张清单里，方便对照剧情条目。',
    tags: ['地区', '阵营'],
    verified: false,
    sections: [
      {
        title: '国家',
        text: '艾登兰以平原与贸易港口为核心；阿瓦利安是高等精灵国度，天马骑士团驻守于此。'
      },
      {
        title: '村落与区域',
        text: '夏露露村是目前收录的村落条目；风语岚歌、狼神之影、初始的星光为区域条目，具体玩法与剧情待公测补充。'
      },
      {
        title: '查看完整条目',
        text: '地区图鉴里有每个地点的字段与说明，示例条目均标注「待核实」。',
        link: { label: '打开地区阵营', path: '/pages/region/list' }
      }
    ],
    related: ['world-promilia', 'books-index']
  },
  {
    id: 'launch-info',
    title: '公测信息与资料更新节奏',
    category: '官方信息',
    summary: '官网标注 11 月 26 日正式公测；本工具会在公测后重刷图鉴与图片。',
    tags: ['公测', '版本'],
    verified: true,
    sections: [
      {
        title: '已确认信息',
        text: '《蓝色星原：旅谣》官方网站标注「11 月 26 日正式公测」。本工具不是官方产品，公测时间以官方公告为准。'
      },
      {
        title: '公测前资料状态',
        steps: ['奇波、敌人、地区等条目中包含示例数据，统一标「待核实」。', '图鉴图片使用 BWIKI 缩略图热链，公测后可能失效。', '数值类工具（对比、养成、保底）暂不开放，避免给出错误结论。']
      },
      {
        title: '公测后更新',
        text: '采集任务会重新拉取公开图鉴并生成新快照；旧缓存可在设置页清理。'
      }
    ],
    related: ['world-promilia', 'glossary']
  },
  {
    id: 'books-index',
    title: '游戏内书籍索引（BWIKI 收录）',
    category: '游戏内书籍',
    summary: 'BWIKI「书籍」分类中可查到的书名清单，正文尚未收录，先做索引使用。',
    tags: ['书籍', '剧情'],
    verified: false,
    sections: [
      {
        title: '书名清单',
        steps: ['《狼神传说》《大地是奶酪》《夏露露村的贝壳传说》', '《十大未解之谜系列》《孤独大陆·弗利斯篇》《弗利斯编年史》', '《星结指导手册》《训鹰人手记》《守林人日志》', '《秦时的信》《卓拉的信件》《留在船上的告别信》']
      },
      {
        title: '怎么用',
        text: '这些书名来自 BWIKI 的书籍分类，能帮助定位世界观线索；具体正文与游戏内获取方式尚未整理，公测后补充。'
      }
    ],
    related: ['world-promilia', 'glossary']
  },
  {
    id: 'glossary',
    title: '术语表：旅谣、奇波、灵子、家园',
    category: '世界设定',
    summary: '把常用词按一句话解释，搜索前先确认自己说的是哪一类。',
    tags: ['术语', '入门'],
    verified: false,
    sections: [
      {
        title: '常用词',
        steps: ['旅谣：玩家在大陆上的旅程与故事线索。', '奇波：可战斗、探索与生产的生物伙伴。', '灵子：装备套装与属性来源。', '家园：建筑、派驻与生产系统。']
      },
      {
        title: '容易混淆',
        text: '奇波与敌人图鉴分开；灵子与装备图鉴分开；同一个名称可能同时出现在多个图鉴，全局搜索结果会去重。'
      }
    ],
    related: ['qibo-spirit', 'catalog-read']
  }
];

export const contentCollections = {
  tutorial: {
    title: '教程合集',
    subtitle: '站内功能与玩法教程，每篇 3 分钟读完',
    categories: ['全部', '入门', '图鉴', '组队', '家园', '战斗', '工具'],
    items: tutorialItems
  },
  story: {
    title: '剧情读物',
    subtitle: '世界观、地区与游戏内书籍索引',
    categories: ['全部', '世界设定', '官方信息', '游戏内书籍'],
    items: storyItems
  }
};

export function getContentCollection(type) {
  return contentCollections[type] || { title: '内容', subtitle: '', categories: ['全部'], items: [] };
}

export function findContentItem(type, id) {
  const collection = getContentCollection(type);
  return collection.items.filter((item) => item.id === id)[0] || null;
}

export function relatedContent(type, item, limit = 3) {
  if (!item) return [];
  const collection = getContentCollection(type);
  const ids = item.related || [];
  return ids
    .map((id) => collection.items.filter((entry) => entry.id === id)[0])
    .filter(Boolean)
    .slice(0, limit);
}

export const guideCategories = ['系统', '战斗', '家园', '探索'];

export const guideTopics = [
  {
    id: 'guide-system-catalog',
    category: '系统',
    title: '图鉴查询',
    summary: '不知道东西在哪一类时，先用全局搜索，再回对应图鉴筛选。',
    steps: [
      { text: '首页搜索框输入名称或效果关键词。', link: { label: '全局搜索', path: '/pages/search/search' } },
      { text: '结果按图鉴分组，点条目进入详情。' },
      { text: '想批量比较时，进入对应图鉴用 facet 缩小范围。' }
    ]
  },
  {
    id: 'guide-system-team',
    category: '系统',
    title: '队伍编成',
    summary: '先定元素覆盖，再保存阵容，避免每次重新选人。',
    steps: [
      { text: '在奇波图鉴确认元素与用途。', link: { label: '奇波图鉴', path: '/pages/qibo/list' } },
      { text: '进入队伍编成添加成员并检查元素覆盖。', link: { label: '队伍编成', path: '/pages/team/team' } },
      { text: '保存后阵容只存本机，不会上传。' }
    ]
  },
  {
    id: 'guide-system-settings',
    category: '系统',
    title: '主题与缓存',
    summary: '深色模式与缓存清理都在设置页，数据异常时先清缓存。',
    steps: [
      { text: '设置页切换浅色、深色或跟随系统。' },
      { text: '图鉴显示旧数据时清理缓存并重新进入。', link: { label: '设置', path: '/pages/settings/settings' } }
    ]
  },
  {
    id: 'guide-battle-element',
    category: '战斗',
    title: '元素克制',
    summary: '矩阵决定增伤与减伤，组队前先看敌人元素。',
    steps: [
      { text: '打开元素克制页确认攻击方与防守方。', link: { label: '元素克制', path: '/pages/element/element' } },
      { text: '记住焰→林→流→焰与雷/霜/辉环。' },
      { text: '组队时补一个能处理被克场景的副位。' }
    ]
  },
  {
    id: 'guide-battle-affix',
    category: '战斗',
    title: '战斗词条',
    summary: '破韧、暴击、元素附着等术语先查词条页，再回详情核对。',
    steps: [
      { text: '按分类 chips 找词条。', link: { label: '战斗词条', path: '/pages/affix/affix' } },
      { text: '需要举例时搜索奇波或角色详情。' }
    ]
  },
  {
    id: 'guide-battle-achievement',
    category: '战斗',
    title: '成就与收集',
    summary: '用成就分类和点数规划收集目标。',
    steps: [
      { text: '成就页先看统计栏与分类。', link: { label: '成就图鉴', path: '/pages/achievement/achievement' } },
      { text: '完成条件不明确的条目先记下，公测后核对。' }
    ]
  },
  {
    id: 'guide-home-station',
    category: '家园',
    title: '家园派驻',
    summary: '按工种排班，生产与探索分开安排。',
    steps: [
      { text: '打开派驻页查看工种分组。', link: { label: '家园派驻', path: '/pages/station/station' } },
      { text: '优先填生产类岗位，探索型奇波留给外出队伍。' },
      { text: '同一只奇波不要重复占用多个岗位。' }
    ]
  },
  {
    id: 'guide-home-building',
    category: '家园',
    title: '家园建筑',
    summary: '建筑条目看功能与解锁条件，再决定先升哪一个。',
    steps: [
      { text: '建筑图鉴按类别筛选。', link: { label: '家园建筑', path: '/pages/building/list' } },
      { text: '进详情看功能字段与解锁说明。' }
    ]
  },
  {
    id: 'guide-home-material',
    category: '家园',
    title: '材料与物品',
    summary: '材料图鉴从物品派生，找养成素材优先看材料。',
    steps: [
      { text: '材料图鉴搜索材料名。', link: { label: '材料图鉴', path: '/pages/material/list' } },
      { text: '找不到时回物品图鉴放宽筛选。', link: { label: '物品图鉴', path: '/pages/item/list' } }
    ]
  },
  {
    id: 'guide-explore-map',
    category: '探索',
    title: '地区与点位',
    summary: '地区条目先看阵营与类型，点位清单等待公测后接入。',
    steps: [
      { text: '地区阵营图鉴查看国家、村落与区域。', link: { label: '地区阵营', path: '/pages/region/list' } },
      { text: '地图探索页当前为点位清单骨架，公测后补坐标。', link: { label: '地图探索', path: '/pages/explore/explore' } }
    ]
  },
  {
    id: 'guide-explore-fishing',
    category: '探索',
    title: '钓鱼与收集',
    summary: '钓鱼图鉴按产地与稀有度筛选，先确认鱼饵与鱼竿。',
    steps: [
      { text: '钓鱼图鉴查看鱼类与产地。', link: { label: '钓鱼图鉴', path: '/pages/fishing/list' } },
      { text: '稀有鱼先确认鱼饵与时段。' }
    ]
  },
  {
    id: 'guide-explore-beast',
    category: '探索',
    title: '凶兽生态',
    summary: '外出前先看凶兽类型与元素，准备好克制手段。',
    steps: [
      { text: '凶兽生态页按普通、精英、首领筛选。', link: { label: '凶兽生态', path: '/pages/beast/beast' } },
      { text: '展开条目看应对建议，再决定是否绕行。' }
    ]
  }
];

export const versusChecklist = [
  {
    title: '编队前确认',
    steps: ['选出 3 只主力奇波，元素尽量覆盖三种以上。', '确认进化阶段与可用技能，不用未培养的收藏位。', '把阵容保存到队伍编成，避免临场重选。']
  },
  {
    title: '阅读对手',
    steps: ['先看对手元素，再决定首发。', '留意精英与首领的破韧窗口。', '遇到未知机制先查战斗词条。']
  },
  {
    title: '赛后复盘',
    steps: ['记录被克制的回合，下次换位。', '把有效的奇波组合保存为固定阵容。', '规则细节以公测后官方说明为准。']
  }
];

export const versusLineups = [
  { id: 'lineup-grove', title: '苍林探索队', element: '林', accent: '#28b37a', desc: '以森系奇波为主，适合林地区域与采集路线。', tags: ['探索', '采集'], verified: false },
  { id: 'lineup-bolt', title: '惊雷速攻队', element: '雷', accent: '#f2b50c', desc: '速攻位先手破架势，适合短回合压制。', tags: ['战斗', '先手'], verified: false },
  { id: 'lineup-frost', title: '寒霜控制队', element: '霜', accent: '#4fd2e8', desc: '减速与控制的示例组合，实际效果待公测验证。', tags: ['战斗', '控制'], verified: false }
];

export const riduCategories = [
  { key: '世界设定', title: '世界设定', desc: '大陆、地区、奇波与灵子的基础资料。', accent: '#d9a514' },
  { key: '官方信息', title: '官方信息', desc: '公测时间与资料更新节奏。', accent: '#2f6bff' },
  { key: '游戏内书籍', title: '游戏内书籍', desc: 'BWIKI 收录的书名索引与线索。', accent: '#7f5bff' }
];

const wallpaperSeed = [
  { id: 'wallpaper-starlight', title: '初始的星光', category: '官方壁纸', colors: ['#1f3d9e', '#6a4bb8'], desc: '星辉落在旅途起点，适合做锁屏。' },
  { id: 'wallpaper-forest', title: '风语岚歌', category: '官方壁纸', colors: ['#1c7a5b', '#3fb98a'], desc: '林间风声与灵子微光。' },
  { id: 'wallpaper-coast', title: '椰香海岸', category: '官方壁纸', colors: ['#1b5f9e', '#4fc3d9'], desc: '海岸线与潮鸣鳐的公开前瞻画面印象。' },
  { id: 'wallpaper-home', title: '家园黄昏', category: '活动贺图', colors: ['#8c4a17', '#e8a75c'], desc: '家园生产与派驻的暖色氛围。' },
  { id: 'wallpaper-frost', title: '雪线林缘', category: '官方壁纸', colors: ['#31549f', '#93b2ef'], desc: '霜蹄鹿出没的雪线边缘。' },
  { id: 'wallpaper-festival', title: '星夜旅谣', category: '活动贺图', colors: ['#262c54', '#7f5bff'], desc: '活动贺图占位，等待官方原图接入。' },
  { id: 'wallpaper-dynamic', title: '灵子回响', category: '动态', colors: ['#3a2a6a', '#b06cff'], desc: '动态壁纸占位，暂以静态预览呈现。' },
  { id: 'wallpaper-dawn', title: '晨雾旅路', category: '官方壁纸', colors: ['#2f6b8f', '#8fd0c8'], desc: '清晨薄雾中的出发画面。' }
];

export const wallpapers = wallpaperSeed.map((item, index) => Object.assign({}, item, {
  index,
  coverSpirit: '',
  verified: false,
  note: '占位预览：官方原图接入后可保存到相册。'
}));

export const codeEntries = [];

export const codeFaq = [
  {
    q: '现在有可用的兑换码吗？',
    a: '暂无可核实的兑换码。公测前的所谓「内部码」多为假消息，本页只收录官方发布且能验证的码。'
  },
  {
    q: '兑换入口在哪里？',
    a: '以游戏内「设置 / 公告 / 活动」中的兑换入口为准。不同版本入口位置可能不同，公测后本页会补充截图步骤。'
  },
  {
    q: '兑换失败怎么办？',
    a: '先检查大小写与有效期，再确认账号区服。仍失败时以游戏内提示为准，不要向第三方提供账号信息。'
  }
];

export const subscribeTopics = [
  { id: 'launch', title: '公测开服提醒', desc: '11 月 26 日公测当天提醒一次', cadence: '一次性' },
  { id: 'codes', title: '兑换码更新', desc: '收录到新的可用兑换码时提醒', cadence: '不定期' },
  { id: 'version', title: '版本前瞻', desc: '新版本角色、奇波与活动信息', cadence: '每版本' },
  { id: 'event', title: '卡池与活动', desc: '卡池轮换与限时活动开启', cadence: '每周' },
  { id: 'maintenance', title: '维护公告', desc: '停服维护与补偿信息', cadence: '按公告' }
];

export const wikiFaqs = [
  {
    id: 'wiki-qibo',
    q: '奇波是什么？',
    a: '大陆上的生物伙伴，可用于战斗、探索与家园生产。图鉴按元素、用途与稀有度分类，并展示进化阶段。',
    tags: ['奇波'],
    link: { label: '奇波图鉴', path: '/pages/qibo/list' }
  },
  {
    id: 'wiki-spirit',
    q: '灵子和装备有什么区别？',
    a: '灵子是套装与属性来源，装备是对应部位条目；两者在图鉴里分开维护，搜索时按名称定位。',
    tags: ['灵子', '装备'],
    link: { label: '灵子图鉴', path: '/pages/spirit/list' }
  },
  {
    id: 'wiki-element',
    q: '元素克制怎么记？',
    a: '基础三角是焰→林→流→焰；另外惊雷克流水、寒霜克惊雷、星辉克寒霜与烈焰。具体增伤比例以游戏内为准。',
    tags: ['元素'],
    link: { label: '元素克制', path: '/pages/element/element' }
  },
  {
    id: 'wiki-station',
    q: '家园派驻怎么安排？',
    a: '按工种分组查看缺口，优先填生产岗位，探索型奇波留给外出队伍，同一只奇波不要重复占用。',
    tags: ['家园'],
    link: { label: '家园派驻', path: '/pages/station/station' }
  },
  {
    id: 'wiki-verified',
    q: '为什么有些条目标了「待核实」？',
    a: '这些条目来自示例、社区整理或公测前前瞻，官方数值与文案可能变化。公测后采集任务会重新拉取并替换。',
    tags: ['数据']
  },
  {
    id: 'wiki-image',
    q: '图片为什么有时加载不出来？',
    a: '图鉴图片为 BWIKI 缩略图热链，受 CDN 与网络影响；加载失败时会回退成文字徽章，不影响条目查看。',
    tags: ['图片']
  },
  {
    id: 'wiki-cache',
    q: '数据看起来是旧的怎么办？',
    a: '到设置页清理图鉴缓存，再进入页面会回落到内置资料并尝试重新同步。',
    tags: ['缓存'],
    link: { label: '设置', path: '/pages/settings/settings' }
  },
  {
    id: 'wiki-tools',
    q: '对比、养成、保底工具为什么还没开放？',
    a: '这些工具依赖公测后的正式数值。当前只搭交互骨架，避免用示例数值给出误导结论。',
    tags: ['工具']
  }
];

export const aboutSections = [
  {
    title: '关于游戏',
    rows: [
      { label: '游戏名称', value: '蓝色星原：旅谣' },
      { label: '制作组', value: '蛮啾网络（Manjuu）' },
      { label: '公测时间', value: '官网标注 11 月 26 日正式公测' },
      { label: '类型', value: '开放世界角色扮演' }
    ]
  },
  {
    title: '关于本工具',
    text: '这是玩家自制的图鉴与查询助手，不是官方产品。目标是让奇波、角色、物品与家园信息查得更快，同时明确标注数据边界。'
  },
  {
    title: '数据来源',
    steps: ['图鉴条目：BWIKI 开放 API 采集，图片使用 120px 缩略图热链。', '官方信息：官网与官方公开公告。', '示例条目：站内手工整理，统一标「待核实」。']
  },
  {
    title: '数据边界',
    text: '公测前数值、技能与剧情可能变动；标注「待核实」的内容不要直接用于攻略结论。公测后采集任务会重新生成快照。'
  },
  {
    title: '版权与反馈',
    text: '游戏名称、角色与图片版权归原作者所有，本工具仅作学习与查询用途，不做商业使用。发现问题可在公众号或项目仓库反馈。'
  }
];
