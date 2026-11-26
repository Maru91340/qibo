// 抽卡模拟 · 卡池与美术映射（自 design/gacha-flow.html 原样抽取，勿手改；改口径请同步设计稿）
// 素材路径保留 gacha-assets/ 前缀与原始扩展名，由 lib/assets.js 归一为云存储 key。

    export const ROLE_FIVE = ['米砂', '末音', '法兰塔', '璐璐卡', '夏儿', '阿比', '红宝石', '兰香子', '姬瑟贝露', '佩佩'];
    export const ROLE_FOUR = ['诺诺', '忒拉拉', '西芙莉雅', '寒悠悠', '莉莉', '米蒂', '芃芃', '卡塔露', '枫糖', '艾妮丝'];
    export const SOUL_FIVE = ['新生', '厨房的秘密', '碧空之下', '唤灵', '羽夜的思念', '充能时间', '月下秘仪', '一梦千约', '彻底清理！', '修行中'];
    export const SOUL_FOUR = ['折纸寄情', '未来之星', '一点都不痛', '暗中观察', '星晚的追忆', '归来', '药草大丰收', '陪伴', '可以吃吗', '恶作剧前奏', '来者何人', '女仆的疗养日', '精打细算', '汁石就是力量', '狩猎姿态', '风语之愿', '失控飞行', '甜点时光', '飞行试验', '功夫是这样的！', '攀高的幼崽'];
    export const SOUL_THREE = ['森境之灵', '水境之灵', '怀疑', '五谷丰登', '禁咒', '宵祝', '分道扬镳', '屋嘟娃娃', '传承', '璇枢', '魂引', '小小木雕', '远古秘钥', '淳朴之音', '命土', '往事', '苍鹰图腾', '狼魂图腾', '夜鸮图腾', '岚境之灵', '焰境之灵', '黯星花', '残局'];

    /** 记录页卡面：角色取立绘缩略图 ID，灵子取卡面缩略图键，缺图时退回首字色块。 */
    export const ART_ROLE = {
      '米砂':'107002', '末音':'109001', '法兰塔':'111001', '璐璐卡':'108002', '夏儿':'109002',
      '阿比':'107003', '红宝石':'103002', '兰香子':'101014', '姬瑟贝露':'112001', '佩佩':'101008',
      '诺诺':'199003', '忒拉拉':'108001', '西芙莉雅':'107001', '米蒂':'108003', '芃芃':'101007',
      '卡塔露':'108005', '枫糖':'199008', '艾妮丝':'112002', '涂山小玉':'101010'
    };
    export const ART_SOUL = {
      '一梦千约':'101014_083', '一点都不痛':'112002_175', '五谷丰登':'0_034', '今日风平浪静':'1_252',
      '传承':'0_047', '修行中':'101008_021', '充能时间':'107003_147', '分道扬镳':'0_062',
      '利箭锋芒':'1_221', '功夫是这样的！':'101007_011', '加大火力':'1_224', '厨房的秘密':'109001_037',
      '可以吃吗':'107003_008', '命土':'0_057', '唤灵':'108002_032', '嘟噜的自我修养':'1_223',
      '夜栖鸮语':'1_241', '夜鸮图腾':'0_070', '失控飞行':'101003_149', '女仆的疗养日':'112001_130',
      '安睡吧，宝贝':'1_197', '宵祝':'0_060', '小小木雕':'0_052', '屋嘟娃娃':'0_063',
      '岚境之灵':'0_073', '归来':'111001_101', '彻底清理！':'112001_255', '往事':'0_058',
      '怀疑':'0_014', '恶作剧前奏':'103002_155', '折纸寄情':'101010_121', '拉锯！战！':'1_222',
      '捕捉「闪亮」':'1_220', '攀高的幼崽':'108005_170', '新生':'107002_146', '星之意志':'199001_253',
      '星之种':'0_198', '星晚的追忆':'109001_078', '暗中观察':'107002_132', '月下秘仪':'103002_154',
      '未来之星':'199008_200', '来者何人':'101014_120', '林间舞会':'1_240', '森境之灵':'0_066',
      '残局':'0_061', '水境之灵':'0_067', '汁石就是力量':'199003_001', '淳朴之音':'0_056',
      '点滴积累':'1_218', '热火朝天':'1_196', '焰境之灵':'0_074', '狩猎姿态':'108001_044',
      '狼魂图腾':'0_069', '猛攻对决':'1_239', '璇枢':'0_048', '甜点时光':'102001_095',
      '破坏大王':'1_238', '碧水激浪':'1_237', '碧空之下':'111001_076', '禁呪':'0_059',
      '精打细算':'101008_248', '编织温暖':'1_217', '美味稍等片刻':'1_225', '羽夜的思念':'109002_071',
      '耕种之时':'1_216', '花之舞':'101010_122', '苍鹰图腾':'0_068', '药草大丰收':'108002_107',
      '远古秘钥':'0_055', '迫不及待':'1_219', '陪伴':'109002_094', '风语之愿':'107001_084',
      '飞行试验':'108003_018', '魂引':'0_050', '黯星花':'0_015'
    };
    /** 五星好运标识：只标注运气好的情况，其余不显示。 */
    export const LUCK = { legend:{ label:'天选' }, lucky:{ label:'欧皇' } };
    export const UP_FOUR_ART = { '枫糖':'gacha-assets/fengtang.png', '艾妮丝':'gacha-assets/ainisi.png' };
    export const POOLS = [
      { id:'peach', group:'limited-role', name:'桃笺为契', type:'角色限定 · 弦定观测', symbol:'桃', accent:'#98718e', soft:'#f1e7ed', cap:90, kind:'角色', up:'涂山小玉', upFour:['枫糖', '艾妮丝'], desc:'循着星光，邂逅命运中的相遇。', theme:'涂山小玉 · 角色 UP', themeTitle:'弦定之约', themeCaption:'执扇乘春 · 与你相遇', artPos:'31% 102%', artSize:'auto 90%', art:'gacha-assets/tushan-xiaoyu-full.png', artMode:'contain', face:'gacha-assets/tushan-xiaoyu-portrait.png', thumb:'/pkg-gacha/static/peach-thumb.jpg', scene:'/pkg-gacha/static/peach-scene.jpg', cover:{ bg:'gacha-assets/soul/bg-huazhiwu.png' } },
      { id:'silk', group:'limited-soul', name:'绯影入怀', type:'灵子限定 · 羁点观测', symbol:'绯', accent:'#837099', soft:'#ece8f2', cap:80, kind:'灵子', up:'花之舞', upFour:['折纸寄情', '未来之星', '一点都不痛'], desc:'于星光交汇之处，唤醒灵子的回响。', theme:'花之舞 · 灵子 UP', themeTitle:'羁点之约', themeCaption:'循星而来 · 与你相遇', art:null, artMode:'cover', thumb:'gacha-assets/soul/icon-huazhiwu.png', cover:{ bg:'gacha-assets/soul/bg-huazhiwu.png', x:'45%', y:'50%', cards:[{ src:'gacha-assets/soul/card-huazhiwu.png', w:27, x:0, y:0, r:-4, z:7, main:true }] } },

      { id:'beginner', group:'beginner', name:'始源观测', type:'新手观测', symbol:'始', accent:'#648c81', soft:'#e6efeb', cap:30, kind:'角色', up:null, upFour:[], desc:'自此启程，与星原的伙伴一同前行。', theme:'始源之约 · 循星而来，与你相遇', themeTitle:'始源之约', themeCaption:'循星而来 · 与你相遇', art:'gacha-assets/beginner-cover.png', artMode:'cover', thumb:'gacha-assets/beginner-cover.png', limit:30 },

      { id:'standard-role', group:'standard-role', name:'恒常观测', type:'角色常驻', symbol:'恒', accent:'#6585a3', soft:'#e8eef4', cap:90, kind:'角色', up:null, upFour:[], desc:'在无垠星海，寻找属于你的回响。', theme:'恒常相伴 · 星原旅途的伙伴', themeTitle:'恒常相伴', themeCaption:'循星而来 · 与你相遇', artPos:'30% center', art:'gacha-assets/standard-cover.png', artMode:'cover', thumb:'gacha-assets/standard-cover.png' },
      { id:'standard-soul', group:'standard-soul', name:'恒序观测', type:'灵子常驻', symbol:'序', accent:'#6d7e99', soft:'#e9edf3', cap:80, kind:'灵子', up:null, upFour:[], desc:'聆听无垠星海中的灵子之声。', theme:'灵子之约 · 与星光一同共鸣', themeTitle:'灵子之约', themeCaption:'循星而来 · 与你相遇', art:null, artMode:'cover', thumb:'gacha-assets/soul/icon-huanling.png', cover:{ bg:'gacha-assets/soul/bg-huanling.png', x:'44%', y:'48%', cards:[
        { src:'gacha-assets/soul/card-xiuxing.png', w:11.5, x:-20, y:-5.4, r:-37, z:3, o:.86, far:true },
        { src:'gacha-assets/soul/card-yuexia.png', w:13, x:-15.2, y:4.8, r:-26, z:4 },
        { src:'gacha-assets/soul/card-yimeng.png', w:16, x:-9, y:-4, r:-13, z:5 },
        { src:'gacha-assets/soul/card-huanling.png', w:23, x:0, y:.8, r:-3, z:7, main:true },
        { src:'gacha-assets/soul/card-xinsheng.png', w:16, x:10, y:4.4, r:12, z:5 },
        { src:'gacha-assets/soul/card-bikong.png', w:13, x:16.4, y:-4.6, r:25, z:4 },
        { src:'gacha-assets/soul/card-chedi.png', w:11.5, x:22, y:4.8, r:35, z:3, o:.86, far:true }
      ] } }

    ];
