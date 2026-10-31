// 无 BWIKI 分类可采集的图鉴：先提供示例条目，公测后按 M5 流程替换。
const NOTICE = '示例条目，用于跑通列表/详情交互；公测后由采集脚本替换。';

export const enemyCatalog = {
  notice: '敌人条目：基础示例 + 9game 攻略文提取（带 source 标注，均未实机验证）；公测后替换为正式数据。',
  items: [
    {
      id: 'enemy-xunlang',
      name: '迅狼',
      category: '普通',
      rarity: '一星',
      tags: ['风', '兽形'],
      summary: '风元素普通敌人，行动速度快，常以小群出现。',
      desc: '风元素普通敌人，擅长突进撕咬，破韧后可打出硬直。',
      fields: [
        { label: '类型', value: '普通' },
        { label: '元素', value: '风' }
      ],
      sections: [{ title: '应对建议', text: '闪避第一次突进后从侧后方输出，优先打断蓄力扑击。' }],
      verified: false
    },
    {
      id: 'enemy-caiji',
      name: '菜鸡',
      category: '普通',
      rarity: '一星',
      tags: ['木', '禽形'],
      summary: '木元素普通敌人，攻击欲望低，适合作为采集路上的练手目标。',
      desc: '木元素普通敌人，会短距离冲刺啄击，威胁较低。',
      fields: [
        { label: '类型', value: '普通' },
        { label: '元素', value: '木' }
      ],
      sections: [],
      verified: false
    },
    {
      id: 'enemy-bingsulang',
      name: '冰速狼',
      category: '普通',
      rarity: '二星',
      tags: ['冰', '兽形'],
      summary: '冰元素普通敌人，移动时留下短暂减速地带。',
      desc: '冰元素普通敌人，擅长绕后与减速，成群时压迫感明显。',
      fields: [
        { label: '类型', value: '普通' },
        { label: '元素', value: '冰' }
      ],
      sections: [{ title: '应对建议', text: '避免在减速地带内站桩，利用火元素快速清场。' }],
      verified: false
    },
    {
      id: 'enemy-shuangrenlang',
      name: '霜刃狼',
      category: '精英',
      rarity: '三星',
      tags: ['冰', '兽形', '精英'],
      summary: '冰元素精英敌人，扑击附带霜刃范围伤害。',
      desc: '冰元素精英敌人，拥有两段扑击与范围霜刃，破韧窗口较短。',
      fields: [
        { label: '类型', value: '精英' },
        { label: '元素', value: '冰' }
      ],
      sections: [{ title: '应对建议', text: '保留闪避应对第二段扑击，破韧后集中爆发。' }],
      verified: false
    },
    {
      id: 'enemy-shuilingzai',
      name: '水灵仔',
      category: '普通',
      rarity: '一星',
      tags: ['水', '灵体'],
      summary: '水元素普通敌人，远程水弹攻击。',
      desc: '水元素普通敌人，保持距离发射水弹，近身后会快速后撤。',
      fields: [
        { label: '类型', value: '普通' },
        { label: '元素', value: '水' }
      ],
      sections: [],
      verified: false
    },
    {
      id: 'enemy-shuilingou',
      name: '水灵偶',
      category: '普通',
      rarity: '二星',
      tags: ['水', '灵体'],
      summary: '水灵仔的强化形态，水弹会分裂。',
      desc: '水元素普通敌人，水弹命中后分裂为小水珠，注意走位。',
      fields: [
        { label: '类型', value: '普通' },
        { label: '元素', value: '水' }
      ],
      sections: [],
      verified: false
    },
    {
      id: 'enemy-xilingou',
      name: '汐灵偶',
      category: '普通',
      rarity: '二星',
      tags: ['水', '灵体'],
      summary: '潮汐环境下的水灵偶，攻击附带击退。',
      desc: '水元素普通敌人，涨潮时攻击范围扩大。',
      fields: [
        { label: '类型', value: '普通' },
        { label: '元素', value: '水' }
      ],
      sections: [],
      verified: false
    },
    {
      id: 'enemy-huolingzai',
      name: '火灵仔',
      category: '普通',
      rarity: '一星',
      tags: ['火', '灵体'],
      summary: '火元素普通敌人，贴身自爆造成范围伤害。',
      desc: '火元素普通敌人，血量降低后会进入自爆读条。',
      fields: [
        { label: '类型', value: '普通' },
        { label: '元素', value: '火' }
      ],
      sections: [{ title: '应对建议', text: '看到读条立即拉开距离，或用远程攻击提前击破。' }],
      verified: false
    },
    {
      id: 'enemy-huolingou',
      name: '火灵偶',
      category: '普通',
      rarity: '二星',
      tags: ['火', '灵体'],
      summary: '火灵仔的强化形态，会留下灼烧地面。',
      desc: '火元素普通敌人，自爆后残留灼烧区域，限制走位。',
      fields: [
        { label: '类型', value: '普通' },
        { label: '元素', value: '火' }
      ],
      sections: [],
      verified: false
    },
    {
      id: 'enemy-yanjialing',
      name: '岩甲蜥',
      category: '精英',
      rarity: '三星',
      tags: ['地', '鳞形', '精英'],
      summary: '地元素精英敌人，正面护甲高，需要绕后破韧。',
      desc: '地元素精英敌人，正面减伤明显，尾部横扫范围大。',
      fields: [
        { label: '类型', value: '精英' },
        { label: '元素', value: '地' }
      ],
      sections: [{ title: '应对建议', text: '优先攻击侧后方，利用冰/木元素打出破韧。' }],
      verified: false
    },
    {
      id: 'enemy-panjia',
      name: '磐甲兽',
      category: '首领',
      rarity: '四星',
      tags: ['地', '兽形', '首领'],
      summary: '地元素首领，拥有冲锋与落石两套范围技。',
      desc: '地元素首领敌人，冲锋后接落石，场地边缘会持续塌陷。',
      fields: [
        { label: '类型', value: '首领' },
        { label: '元素', value: '地' }
      ],
      sections: [{ title: '应对建议', text: '引导冲锋撞墙可创造长硬直，落石阶段优先清理场地中央。' }],
      verified: false
    },
    // ---- 以下条目自 9game 攻略文结构化提取（野生奇波/亚种口径，待公测校对） ----
    {
      id: 'enemy-luanguanlinghu',
      name: '萝冠灵狐',
      category: '普通',
      rarity: '二星',
      tags: ['木', '兽形'],
      summary: '木元素奇波，头顶如戴上萝冠，擅长远程木属性光束压制。',
      desc: '技能「萝冠之息」对附近领域打出约 165.9% 木伤并施加木属印记，可削减敌人木抗约 8 秒；「灵木」连续发射 10 枚灵木弹，每枚约 37.2% 木伤，压制节奏强。',
      fields: [
        { label: '类型', value: '普通' },
        { label: '元素', value: '木' },
        { label: '技能', value: '萝冠之息 / 灵木' }
      ],
      sections: [{ title: '应对建议', text: '光束弹幕密集，建议侧向绕行拉近距离打断，用火/地元素快速破韧。' }],
      source: '9game《全奇波图鉴 | 强力奇波介绍》(www.9game.cn/lsxyly/11826196.html)',
      verified: false
    },
    {
      id: 'enemy-lieyanjiaoniu',
      name: '烈焰角牛',
      category: '精英',
      rarity: '三星',
      tags: ['火', '兽形', '精英'],
      summary: '火元素奇波，蓄力挥拳的多段矩形范围攻击，压迫感强。',
      desc: '技能「烈焰冲拳」蓄力后向前挥拳，对矩形范围打出 6 次火伤并降低敌人火抗；「燎焰之拳」可响应攻击瞬移至目标身旁打出约 138% 火伤，近战威胁高。',
      fields: [
        { label: '类型', value: '精英' },
        { label: '元素', value: '火' },
        { label: '技能', value: '烈焰冲拳 / 燎焰之拳' }
      ],
      sections: [{ title: '应对建议', text: '蓄力挥拳前摇明显，看到抬手立即脱离矩形范围，用冰/水元素克制输出。' }],
      source: '9game《全奇波图鉴 | 强力奇波介绍》(www.9game.cn/lsxyly/11826196.html)',
      verified: false
    },
    {
      id: 'enemy-murongtu',
      name: '目绒兔',
      category: '普通',
      rarity: '一星',
      tags: ['光', '兽形'],
      summary: '光元素奇波，生性胆小，具备为同伴恢复生命的辅助能力。',
      desc: '技能「紧急治疗」为区域内同伴恢复等同自身生命上限约 6.9% 的生命，对低血量（<50%）目标恢复量额外提升 20%，并提升约 8 秒物防和魔防；常与群体野生奇波一同出没。',
      fields: [
        { label: '类型', value: '普通' },
        { label: '元素', value: '光' },
        { label: '技能', value: '紧急治疗' }
      ],
      sections: [{ title: '应对建议', text: '优先集火治疗目标，避免陷入消耗战；单挑时威胁很低。' }],
      source: '9game《全奇波图鉴 | 强力奇波介绍》(www.9game.cn/lsxyly/11826196.html)',
      verified: false
    },
    {
      id: 'enemy-gululu',
      name: '菇噜噜',
      category: '普通',
      rarity: '二星',
      tags: ['暗', '菌形'],
      summary: '暗元素奇波，尾巴形似蘑菇，以毒气类范围攻击骚扰目标。',
      desc: '技能「菇噜噜噜」向周围释放气体，造成约 428.7% 暗伤，降低敌约 10% 移速及 9.9% 物防魔防；「暗魂影」向目标发射影子打出暗伤，持续减益能力突出。',
      fields: [
        { label: '类型', value: '普通' },
        { label: '元素', value: '暗' },
        { label: '技能', value: '菇噜噜噜 / 暗魂影' }
      ],
      sections: [{ title: '应对建议', text: '气体范围攻击附带减速与防御削减，建议远程拉扯规避，或用光元素反制。' }],
      source: '9game《全奇波图鉴 | 强力奇波介绍》(www.9game.cn/lsxyly/11826196.html)',
      verified: false
    },
    {
      id: 'enemy-dulu',
      name: '嘟噜',
      category: '普通',
      rarity: '二星',
      tags: ['地', '兽形'],
      summary: '地元素奇波，张开翅膀高速冲撞，突进路径多段伤害。',
      desc: '技能「一地毛」快速冲撞，路径上共 7 次攻击，每击约 158.8% 地伤并附加地抗下降；「岩石」向前滚动打出约 79.4% 地伤，突进类打法极难近身。',
      fields: [
        { label: '类型', value: '普通' },
        { label: '元素', value: '地' },
        { label: '技能', value: '一地毛 / 岩石' }
      ],
      sections: [{ title: '应对建议', text: '冲撞路径直线易读，提前横向闪避后绕背输出，用冰/水元素克制。' }],
      source: '9game《全奇波图鉴 | 强力奇波介绍》(www.9game.cn/lsxyly/11826196.html)',
      verified: false
    }
  ]
};

export const dungeonCatalog = {
  notice: '副本条目为示例，体力与掉落口径参考图鉴截图；公测后替换为正式数据。',
  items: [
    {
      id: 'dungeon-ligutu',
      name: '离故土',
      category: '委托',
      rarity: 'Lv.10',
      tags: ['委托', '30 体力'],
      summary: '委托副本，消耗 30 体力，产出基础养成素材。',
      desc: '委托类副本，跟随任务指引清理目标区域。',
      fields: [
        { label: '类型', value: '委托' },
        { label: '等级', value: 'Lv.10' },
        { label: '体力', value: '30' }
      ],
      sections: [{ title: '主要掉落', text: '基础素材 ×300、奇波成长道具 ×4。' }],
      verified: false
    },
    {
      id: 'dungeon-jiejing',
      name: '结晶萃取·难度1',
      category: '材料副本',
      rarity: 'Lv.15',
      tags: ['材料副本', '30 体力'],
      summary: '材料副本，产出结晶类突破素材。',
      desc: '材料副本，敌人以元素灵体为主，建议携带克制元素。',
      fields: [
        { label: '类型', value: '材料副本' },
        { label: '等级', value: 'Lv.15' },
        { label: '体力', value: '30' }
      ],
      sections: [{ title: '主要掉落', text: '结晶素材 ×300、元素碎片 ×8。' }],
      verified: false
    },
    {
      id: 'dungeon-qianchui',
      name: '千锤百炼·难度1',
      category: '材料副本',
      rarity: 'Lv.15',
      tags: ['材料副本', '30 体力'],
      summary: '材料副本，产出装备强化素材。',
      desc: '材料副本，敌人护甲较高，建议带破韧能力强的角色。',
      fields: [
        { label: '类型', value: '材料副本' },
        { label: '等级', value: 'Lv.15' },
        { label: '体力', value: '30' }
      ],
      sections: [{ title: '主要掉落', text: '强化矿材 ×300、装备图纸 ×2。' }],
      verified: false
    },
    {
      id: 'dungeon-xunsheng',
      name: '寻生机',
      category: '委托',
      rarity: 'Lv.15',
      tags: ['委托', '30 体力'],
      summary: '委托副本，限时护送目标抵达终点。',
      desc: '委托类副本，护送途中会刷新多波敌人。',
      fields: [
        { label: '类型', value: '委托' },
        { label: '等级', value: 'Lv.15' },
        { label: '体力', value: '30' }
      ],
      sections: [{ title: '主要掉落', text: '角色经验 ×300、委托奖励 ×4。' }],
      verified: false
    },
    {
      id: 'dungeon-taolishan',
      name: '桃李山径',
      category: '材料副本',
      rarity: 'Lv.20',
      tags: ['材料副本', '35 体力'],
      summary: '材料副本，产出料理与药材。',
      desc: '材料副本，敌人以木、水元素为主。',
      fields: [
        { label: '类型', value: '材料副本' },
        { label: '等级', value: 'Lv.20' },
        { label: '体力', value: '35' }
      ],
      sections: [{ title: '主要掉落', text: '食材 ×300、药材 ×8。' }],
      verified: false
    },
    {
      id: 'dungeon-shenyuan',
      name: '深渊回响',
      category: '挑战副本',
      rarity: 'Lv.30',
      tags: ['挑战', '40 体力'],
      summary: '高难挑战副本，按层数结算奖励。',
      desc: '挑战类副本，敌人拥有额外词条，通关层数越高奖励越好。',
      fields: [
        { label: '类型', value: '挑战副本' },
        { label: '等级', value: 'Lv.30' },
        { label: '体力', value: '40' }
      ],
      sections: [{ title: '主要掉落', text: '星结卡、稀有装备图纸。' }],
      verified: false
    }
  ]
};

export const regionCatalog = {
  notice: '地区阵营条目为示例，参考图鉴截图的国家/村落结构；公测后替换为官方文案。',
  items: [
    {
      id: 'region-aidenland',
      name: '艾登兰',
      category: '国家',
      rarity: '',
      tags: ['大陆已知国家', '阵营之一'],
      summary: 'Aidenland · 大陆已知国家 / 阵营之一。',
      desc: '普罗米利亚大陆上的已知国家，拥有完整的城邦与骑士体系。',
      fields: [
        { label: '英文名', value: 'Aidenland' },
        { label: '类型', value: '国家' }
      ],
      sections: [{ title: '地区概况', text: '以平原与贸易港口为核心，是旅人出发的重要据点。' }],
      verified: false
    },
    {
      id: 'region-averian',
      name: '阿瓦利安',
      category: '国家',
      rarity: '',
      tags: ['天马骑士团', '高等精灵'],
      summary: 'Averian · 天马骑士团所在，夏蕾·恩西斯出身于此。',
      desc: '高等精灵国度，天马骑士团驻守于此，重视传统与荣誉。',
      fields: [
        { label: '英文名', value: 'Averian' },
        { label: '阵营', value: '阿瓦利安' }
      ],
      sections: [{ title: '地区概况', text: '高耸的林间城邦，以天马与风元素信仰闻名。' }],
      verified: false
    },
    {
      id: 'region-charlulu',
      name: '夏露露村',
      category: '村落',
      rarity: '',
      tags: ['兽人族', '狩猎采集'],
      summary: 'Charlulu Village · 兽人族的故乡，以狩猎与采集为生。',
      desc: '兽人族聚居的村落，日常围绕狩猎、采集与家园建设展开。',
      fields: [
        { label: '英文名', value: 'Charlulu Village' },
        { label: '阵营', value: '夏露露村' }
      ],
      sections: [{ title: '地区概况', text: '坐落于森林边缘，是家园系统与奇波栖息的重要区域。' }],
      verified: false
    },
    {
      id: 'region-promelia',
      name: '普罗米利亚大陆',
      category: '大陆',
      rarity: '',
      tags: ['帕米冒险笔记'],
      summary: '游戏主舞台，包含多个国家、村落与荒野区域。',
      desc: '大陆地图覆盖森林、火山、雪原与海岸，是探索与采集的主要舞台。',
      fields: [
        { label: '类型', value: '大陆' },
        { label: '相关', value: '帕米冒险笔记' }
      ],
      sections: [],
      verified: false
    },
    {
      id: 'region-fengyu',
      name: '风语岚歌',
      category: '区域',
      rarity: '',
      tags: ['风元素', '高地'],
      summary: '风元素活跃的高地区域，常见飞行类奇波。',
      desc: '风力强劲的高地，适合采集风元素素材与捕捉飞行奇波。',
      fields: [
        { label: '类型', value: '区域' },
        { label: '元素', value: '风' }
      ],
      sections: [],
      verified: false
    },
    {
      id: 'region-langyao',
      name: '狼神之影',
      category: '区域',
      rarity: '',
      tags: ['兽形奇波', '森林'],
      summary: '狼形奇波出没的密林区域。',
      desc: '密林深处常有狼形奇波群活动，夜间刷新频率更高。',
      fields: [
        { label: '类型', value: '区域' },
        { label: '元素', value: '木' }
      ],
      sections: [],
      verified: false
    },
    {
      id: 'region-chuguang',
      name: '初始的星光',
      category: '区域',
      rarity: '',
      tags: ['新手区域', '海岸'],
      summary: '旅人初始区域，资源温和，适合熟悉采集与战斗。',
      desc: '海岸与缓坡交错的初始区域，分布基础食材与一阶奇波。',
      fields: [
        { label: '类型', value: '区域' },
        { label: '元素', value: '水' }
      ],
      sections: [],
      verified: false
    }
  ]
};

export const affixCatalog = {
  notice: '词条释义为示例整理，公测后以游戏内实际描述为准。',
  items: [
    {
      id: 'affix-poren',
      name: '破韧',
      category: '机制',
      rarity: '',
      tags: ['削韧', '控制'],
      summary: '削减目标韧性条；韧性清空后目标进入短时间硬直。',
      desc: '削减目标韧性条；韧性清空后目标进入短时间硬直，是打断首领技能的核心手段。',
      fields: [
        { label: '类型', value: '机制' },
        { label: '作用', value: '削韧 / 打断' }
      ],
      sections: [],
      verified: false
    },
    {
      id: 'affix-baoji',
      name: '暴击',
      category: '输出',
      rarity: '',
      tags: ['伤害'],
      summary: '按暴击率判定，触发后按暴击伤害倍率结算。',
      desc: '攻击时按暴击率判定，触发后以暴击伤害倍率结算，可被减暴击抗性影响。',
      fields: [
        { label: '类型', value: '输出' },
        { label: '叠加', value: '暴击率 / 暴击伤害' }
      ],
      sections: [],
      verified: false
    },
    {
      id: 'affix-zhuoshao',
      name: '灼烧',
      category: '减益',
      rarity: '',
      tags: ['火', '持续伤害'],
      summary: '火元素持续伤害，按层数结算。',
      desc: '火元素附着后触发的持续伤害，层数越高单跳伤害越高。',
      fields: [
        { label: '类型', value: '减益' },
        { label: '元素', value: '火' }
      ],
      sections: [],
      verified: false
    },
    {
      id: 'affix-dongjie',
      name: '冰冻',
      category: '控制',
      rarity: '',
      tags: ['冰', '控制'],
      summary: '冰元素控制效果，冻结目标行动。',
      desc: '冰元素附着叠满后冻结目标，冻结期间受到的重击可能触发碎冰。',
      fields: [
        { label: '类型', value: '控制' },
        { label: '元素', value: '冰' }
      ],
      sections: [],
      verified: false
    },
    {
      id: 'affix-gandian',
      name: '感电',
      category: '减益',
      rarity: '',
      tags: ['雷', '连锁'],
      summary: '雷元素触发连锁伤害，可传导至附近目标。',
      desc: '雷元素附着后触发的连锁伤害，潮湿环境下传导范围更大。',
      fields: [
        { label: '类型', value: '减益' },
        { label: '元素', value: '雷' }
      ],
      sections: [],
      verified: false
    },
    {
      id: 'affix-hudun',
      name: '护盾',
      category: '增益',
      rarity: '',
      tags: ['生存'],
      summary: '吸收固定数值伤害，存在持续时间。',
      desc: '吸收固定数值伤害，护盾存在期间提升抗打断。',
      fields: [
        { label: '类型', value: '增益' },
        { label: '叠加', value: '取最高值' }
      ],
      sections: [],
      verified: false
    },
    {
      id: 'affix-zengshang',
      name: '增伤',
      category: '增益',
      rarity: '',
      tags: ['伤害乘区'],
      summary: '按百分比提升造成的伤害。',
      desc: '按百分比提升造成的伤害，通常与攻击力加成处于不同乘区。',
      fields: [
        { label: '类型', value: '增益' },
        { label: '乘区', value: '增伤' }
      ],
      sections: [],
      verified: false
    },
    {
      id: 'affix-jianfang',
      name: '减防',
      category: '减益',
      rarity: '',
      tags: ['防御'],
      summary: '降低目标防御力，提升队伍整体输出。',
      desc: '降低目标防御力，可与破甲类词条叠加，但有下限。',
      fields: [
        { label: '类型', value: '减益' },
        { label: '叠加', value: '有下限' }
      ],
      sections: [],
      verified: false
    },
    {
      id: 'affix-jifei',
      name: '击飞',
      category: '控制',
      rarity: '',
      tags: ['控制', '位移'],
      summary: '将目标击退或挑空，打断蓄力动作。',
      desc: '将目标击退或挑空，可打断部分蓄力技能；对首领通常只造成削韧。',
      fields: [
        { label: '类型', value: '控制' },
        { label: '作用', value: '打断 / 位移' }
      ],
      sections: [],
      verified: false
    },
    {
      id: 'affix-huifu',
      name: '治疗加成',
      category: '增益',
      rarity: '',
      tags: ['治疗'],
      summary: '提升治疗量与受治疗效果。',
      desc: '提升角色造成的治疗量，部分词条同时提升受到的治疗效果。',
      fields: [
        { label: '类型', value: '增益' },
        { label: '作用', value: '治疗量' }
      ],
      sections: [],
      verified: false
    },
    {
      id: 'affix-yuansu',
      name: '元素附着',
      category: '机制',
      rarity: '',
      tags: ['元素', '反应'],
      summary: '攻击附带元素属性，为后续反应提供前置。',
      desc: '攻击附带元素属性，附着量与元素精通相关，是触发元素反应的前置条件。',
      fields: [
        { label: '类型', value: '机制' },
        { label: '相关', value: '元素反应' }
      ],
      sections: [],
      verified: false
    },
    {
      id: 'affix-chongneng',
      name: '充能',
      category: '机制',
      rarity: '',
      tags: ['能量', '大招'],
      summary: '恢复元素能量，加快终结技循环。',
      desc: '通过攻击、受击或队友技能恢复元素能量，充能效率影响终结技循环速度。',
      fields: [
        { label: '类型', value: '机制' },
        { label: '作用', value: '终结技能量' }
      ],
      sections: [],
      verified: false
    }
  ]
};

export const fishingCatalog = {
  notice: '钓鱼条目为示例，鱼种与钓点数据待 BWIKI 收录后替换。',
  items: [
    {
      id: 'fishing-caiji-yu',
      name: '彩鳍鱼',
      category: '鱼类',
      rarity: '普通',
      tags: ['浅滩', '日间'],
      summary: '浅滩常见鱼种，日间出没，可用于基础料理。',
      desc: '浅滩与河口常见，咬钩快，适合新手练手。',
      fields: [
        { label: '类型', value: '鱼类' },
        { label: '钓点', value: '浅滩' },
        { label: '时段', value: '日间' }
      ],
      sections: [{ title: '推荐饵料', text: '普通鱼饵即可，咬钩后快速提竿。' }],
      verified: false
    },
    {
      id: 'fishing-yinyu',
      name: '银鳞鱼',
      category: '鱼类',
      rarity: '稀有',
      tags: ['深水', '夜间'],
      summary: '深水区稀有鱼种，夜间更容易上钩。',
      desc: '深水区夜间出没，咬钩后有两次挣扎，需要耐心放线。',
      fields: [
        { label: '类型', value: '鱼类' },
        { label: '钓点', value: '深水' },
        { label: '时段', value: '夜间' }
      ],
      sections: [],
      verified: false
    },
    {
      id: 'fishing-jinlong',
      name: '金鳞龙鱼',
      category: '稀有鱼',
      rarity: '传说',
      tags: ['湖心', '雨天'],
      summary: '湖心区域传说鱼种，雨天出现概率提升。',
      desc: '湖心区域传说鱼种，需要高级鱼饵，挣扎强度高。',
      fields: [
        { label: '类型', value: '稀有鱼' },
        { label: '钓点', value: '湖心' },
        { label: '时段', value: '雨天' }
      ],
      sections: [],
      verified: false
    },
    {
      id: 'fishing-putong-yuer',
      name: '普通鱼饵',
      category: '鱼饵',
      rarity: '普通',
      tags: ['消耗品'],
      summary: '基础鱼饵，适用于浅滩与近岸钓点。',
      desc: '基础鱼饵，可在杂货铺购买或通过采集制作。',
      fields: [
        { label: '类型', value: '鱼饵' },
        { label: '适用', value: '浅滩 / 近岸' }
      ],
      sections: [],
      verified: false
    },
    {
      id: 'fishing-gaoji-yugan',
      name: '高级鱼竿',
      category: '鱼竿',
      rarity: '稀有',
      tags: ['工具'],
      summary: '提升抛竿距离与稀有鱼概率。',
      desc: '高级鱼竿，抛竿距离更远，稀有鱼咬钩概率小幅提升。',
      fields: [
        { label: '类型', value: '鱼竿' },
        { label: '效果', value: '抛竿距离 / 稀有概率' }
      ],
      sections: [],
      verified: false
    },
    {
      id: 'fishing-laji',
      name: '水草团',
      category: '杂物',
      rarity: '普通',
      tags: ['垃圾'],
      summary: '钓鱼时可能钓上的杂物，可分解为基础材料。',
      desc: '钓鱼时可能钓上的杂物，分解后获得纤维等基础材料。',
      fields: [
        { label: '类型', value: '杂物' },
        { label: '用途', value: '分解' }
      ],
      sections: [],
      verified: false
    }
  ]
};

export { NOTICE as MANUAL_NOTICE };
