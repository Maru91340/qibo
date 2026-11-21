# -*- coding: utf-8 -*-
"""阶段1线框图补充批：独立功能页（page-hero / tool-panel / panel / content-list 类）。
用法：python scripts/gen-wireframes2.py   （输出到 docs/ui-redesign/）
"""
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / 'docs' / 'ui-redesign'
OUT.mkdir(exist_ok=True)

BASE_CSS = """  *{box-sizing:border-box}body{margin:0;background:#eef1f8;color:#1a2138;font-family:-apple-system,"PingFang SC",sans-serif;padding:36px 24px 70px}
  .wrap{max-width:1150px;margin:auto;display:flex;gap:34px;justify-content:center;flex-wrap:wrap;align-items:flex-start}
  h1{font-size:20px;margin:0 0 4px}.sub{font-size:12px;color:#5a6480;margin:0 0 20px;line-height:1.8}
  .phone{width:375px;border-radius:40px;background:#10141f;padding:9px;box-shadow:0 20px 50px rgba(26,33,56,.22);flex:none}
  .screen{border-radius:32px;overflow:hidden;height:760px;background:#f3f5fb;display:flex;flex-direction:column}
  .navbar{height:42px;background:#1f3d9e;color:#fff;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:600;flex:none}
  .scroll{flex:1;overflow-y:auto;padding:0 14px 24px}
  .blk{border:1.5px solid #9aa3b8;border-radius:9px;background:#fff;margin:9px 0;padding:9px;position:relative}
  .num{position:absolute;top:-9px;left:-9px;width:20px;height:20px;border-radius:50%%;background:#ff5b4a;color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 5px rgba(255,91,74,.4);z-index:2}
  .lb{font-size:11.5px;font-weight:700;color:#5a6480}
  .note{font-size:10.5px;color:#97a0b5;line-height:1.55;margin-top:2px}
  .phero{border-radius:0 0 14px 14px;margin:0 -14px;padding:16px 14px 13px;background:linear-gradient(132deg,#262c54 0%%,%(acc)s 58%%,#7f5bff 100%%);color:#fff}
  .pttl{font-size:17px;font-weight:800}.psub{font-size:10.5px;opacity:.88;margin-top:3px}
  .kv{display:flex;justify-content:space-between;font-size:11.5px;padding:7px 2px;border-bottom:1px dashed #eef0f7}
  .kv:last-child{border:0}.kv b{color:#97a0b5;font-weight:400}
  .rowline{display:flex;align-items:center;justify-content:space-between;font-size:11px;color:#5a6480;padding:4px 0}
  .chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
  .chip{padding:5px 10px;border-radius:999px;background:#f2f4f9;font-size:10.5px;color:#5a6480}
  .chip.on{background:#eaf0ff;color:#2f6bff;font-weight:700}
  .spec{max-width:430px;width:100%%;background:#fff;border-radius:16px;padding:20px 22px;box-shadow:0 8px 24px rgba(26,33,56,.07)}
  .spec h2{font-size:15px;margin:0 0 10px}
  .it{display:flex;gap:10px;padding:8px 0;border-bottom:1px dashed #eef0f7;font-size:12px;line-height:1.7}
  .it:last-child{border:0}
  .n{flex:none;width:20px;height:20px;border-radius:50%%;background:#ff5b4a;color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;margin-top:2px}
  .k{font-weight:700}.w{color:#5a6480;font-size:11px;display:block}
  .dark-note{margin-top:12px;padding:10px 12px;border-radius:10px;background:#111621;color:#b9c3da;font-size:10.5px;line-height:1.7}
  .dark-note b{color:#edf2ff}
"""

DARK_STD = '--bg #111621 / 卡 #1a2232 / 线 #2b354b / 文 #EDF2FF；page-hero 渐变保留主题色（图片/品牌语义），不随主题反转。'

# 每页: (路由, 标题, 辅色, 页面类型, 数据来源, blocks=[(标题,说明)], spec=[(要点,说明)])
PAGES = [
    ('pages/element/element', '元素克制速查', '#00b3a4', 'hero', "页面内置元素矩阵 + getCatalog('element')",
     [('渐变头', '标题「元素克制速查」+ 副说明，青→紫渐变。'), ('相克矩阵', '元素两两相克表，行=攻击元素，列=防守元素，格内高效/低效标识。'), ('队伍覆盖检查', '选择已上阵元素后高亮缺口，提示未覆盖的克制关系。')],
     [('矩阵可扫读', '行列表头固定，格内用色点+文字双编码（不只靠颜色）。'), ('交互沿用', '点格弹说明，逻辑不动。')]),
    ('pages/team/team', '队伍编成', '#ff8a3d', 'tool', "本机存储（uni.getStorageSync，不上传）",
     [('队伍头卡', '队伍名 + 改名 + 3 角色 + 3 奇波槽位。'), ('元素覆盖条', 'coverage 汇总当前队伍元素分布。'), ('槽位编辑', '点槽位从图鉴选择角色/奇波，支持替换与清空。'), ('保存/多队', '本地保存，不上传（页面已声明）。')],
     [('本地语义', '延续「不上传」声明，不添加云同步暗示。'), ('槽位反馈', '空槽/重复槽给出轻提示。')]),
    ('pages/compare/compare', '角色对比', '#7f5bff', 'tool', "getCatalog('charWiki')",
     [('工具面板', '标题「选择角色」+ 提示「点选择位后再点角色」。'), ('双列对比', '左 A 右 B 两列属性逐行对照，差异行高亮。'), ('换人操作', '每列头部可重选角色。')],
     [('差异高亮', '数值差异用主蓝强调，不用红绿语义（避免强暗示）。'), ('空位状态', '未选满时给出引导文案。')]),
    ('pages/cultivation/cultivation', '养成计算', '#00b3a4', 'tool', "getCatalog('material') + 经验表",
     [('工具面板', '标题「养成清单计算」+ 提示「升级经验+印记突破 → 材料缺口清单」。'), ('输入区', '当前等级/目标等级选择。'), ('结果清单', 'tool-result 行：材料名 × 数量，可勾选。')],
     [('清单可勾选', '勾选进度本地保留。'), ('数据口径', '材料数量来自材料图鉴目录，页面不硬编码。')]),
    ('pages/affix/affix', '战斗词条', '#e0553f', 'hero', "getCatalog('affix')",
     [('渐变头', '标题「战斗词条」。'), ('词条分类胶囊', '机制 / 输出 / 增益 / 减益。'), ('词条卡列表', '词条名 + 释义，支持搜索。')],
     [('检索优先', '顶部搜索框置顶。'), ('手风琴', '点词条展开完整释义（沿用 cl-fade-in 动画）。')]),
    ('pages/pity/pity', '保底计算', '#e0553f', 'tool', "页面本地计算（概率表内置）",
     [('工具面板', '标题「抽数输入」+ 提示「点 ± 调整」。'), ('步进器', '已垫抽数 ± 输入。'), ('结果区', '距离保底/期望输出（非官方口径需标注）。')],
     [('口径声明', '结果标注「仅供参考，非官方概率」。'), ('输入安全', '步进器最小值 0。')]),
    ('pages/evolution/evolution', '进化图谱', '#7f5bff', 'hero', "getCatalog('qiboWiki') 进化链",
     [('渐变头', '标题「进化图谱」。'), ('元素筛选', '按元素过滤进化链。'), ('链路卡', '奇波进化链：幼年→成长→完全，节点图+箭头。')],
     [('节点可点', '点节点进对应奇波详情。'), ('链路方向', '统一左→右，深浅两主题箭头均用主蓝。')]),
    ('pages/beast/beast', '凶兽生态', '#e0553f', 'hero', "页面内置图文数据",
     [('渐变头', '标题「凶兽生态」。'), ('生态条目列表', '凶兽名 + 栖息地 + 图鉴图文段。')],
     [('图文行', '图 + 名 + 释义三段式，与 detail 家族一致。'), ('空态', '数据为空时显示 cx-empty。')]),
    ('pages/station/station', '家园派驻', '#0aa06e', 'hero', "getCatalog('qiboWiki') 按工种聚合",
     [('渐变头', '标题「家园派驻」。'), ('工种分组', '按派驻工种分组列出可派驻奇波。'), ('派驻行', '工种名 + 奇波头像列表。')],
     [('分组导航', '顶部工种胶囊锚点。'), ('派驻说明', '标注「以游戏内实际解锁为准」。')]),
    ('pages/achievement/achievement', '成就图鉴', '#d9a514', 'hero', "getCatalog('achievement')",
     [('渐变头', '标题「成就图鉴」。'), ('成就分组', '按成就分类分组 + 点数统计。'), ('成就行', '名称 + 条件 + 点数徽标。')],
     [('点数汇总', '组头显示「已获/总点数」。'), ('进度语义', '已完成用 ok 色勾标，不用大色块。')]),
    ('pages/guide/guide', '玩法指南', '#4f7cff', 'hero', "页面内置四大类分步图文",
     [('渐变头', '标题「玩法指南」。'), ('四大类入口', '捉宠 / 骑乘解谜 / 家园劳作 / 战斗。'), ('分步图文', '步骤卡：图 + 步骤文字。')],
     [('步骤编号', '步骤用数字徽标串联，方向统一向下。'), ('图可点', '图点击放大预览。')]),
    ('pages/versus/versus', '奇波对决', '#e0553f', 'hero', "页面内置规则与阵容数据",
     [('渐变头', '标题「奇波对决」。'), ('规则说明卡', '对决规则要点。'), ('阵容推荐卡', '推荐阵容 + 思路。')],
     [('规则优先', '规则卡置顶，阵容其次。'), ('标注口径', '非官方内容标注「社区整理」。')]),
    ('pages/ridu/ridu', '日渡尘影', '#5a6ad0', 'hero', "页面内置剧情目录",
     [('渐变头', '标题「日渡尘影」。'), ('剧情分类目录', '按章节/类别分组条目。'), ('条目行', '名称 + 简述。')],
     [('剧透防护', '默认折叠详情，点开再展开。'), ('阅读层级', '章节标题用 30rpx/600。')]),
    ('pages/codes/codes', '福利码', '#f2c45d', 'hero', "页面内置兑换码列表",
     [('渐变头', '标题「福利码」。'), ('兑换码卡', '码 + 有效期 + 复制按钮。'), ('过期分组', '已过期折叠在下方。')],
     [('一键复制', 'uni.setClipboardData 复制并 toast。'), ('时效标注', '有效期临近用 warn 色，过期灰显。')]),
    ('pages/subscribe/subscribe', '订阅提醒', '#f2c45d', 'hero', "本机存储（模板 ID 为空，不上传）",
     [('渐变头', '标题「订阅提醒」。'), ('订阅项管理', '订阅开关列表。'), ('口径说明', '「仅本机记录」声明。')],
     [('真实口径', '延续首页 H10 决策：只保存本机偏好，不承诺推送提醒。'), ('开关反馈', '切换即时生效并 toast。')]),
    ('pages/wiki/wiki', '奇波百科', '#4f7cff', 'hero', "页面内置说明文档",
     [('渐变头', '标题「奇波百科」。'), ('说明段', '数据来源、口径、边界说明分节。'), ('跳转', '相关页入口。')],
     [('文档结构', '分节标题 + 段落，复用 panel 体系。'), ('入口一致', '首页公告条「详情」指向本页。')]),
    ('pages/about/about', '关于游戏', '#4f7cff', 'hero', "页面内置游戏/制作组信息",
     [('渐变头', '标题（游戏名）。'), ('信息卡', '游戏简介 / 制作组 / 上线信息。'), ('版本卡', '应用版本 + 免责声明。')],
     [('免责声明', '非官方资料站声明保留。'), ('公测动态', '与 release-event.js 联动的动态文案。')]),
    ('pages/favorites/favorites', '我的收藏', '#d9a514', 'hero', "本机收藏存储（utils/favorites.js）",
     [('渐变头', '标题「我的收藏」。'), ('收藏分组', '按图鉴类型分组（角色/奇波/物品…）。'), ('收藏行', '条目 + 取消收藏。')],
     [('跨图鉴聚合', '类型分组 + 数量徽标。'), ('空态', '无收藏时 cx-empty 引导去图鉴。')]),
    ('pages/wallpaper/list', '壁纸画廊', '#7f5bff', 'hero', "wallpapers.json（BWIKI 收录）",
     [('渐变头', '标题「壁纸画廊」+ 副题「官方壁纸 · 节日贺图 · 过场图」。'), ('瀑布/网格', '壁纸缩略网格。'), ('大图预览', '点击全屏预览。')],
     [('网格规格', '双列等宽缩略图，比例随原图。'), ('加载', 'lazy-load + 失败占位。')]),
    ('pages/story/list', '剧情读物', '#5a6ad0', 'content', "getCatalog('book') 经 content-list 组件",
     [('条目列表', 'content-list：剧情条目（封面 + 名 + 简介）。'), ('进入阅读', '点条目进 content-detail。')],
     [('组件复用', '沿用 content-list，不重写列表。'), ('阅读入口', '整卡可点。')]),
    ('pages/story/detail', '剧情详情', '#5a6ad0', 'content', "getCatalog('book') 经 content-detail 组件",
     [('阅读页', 'content-detail：标题 + 正文段落。'), ('返回', '返回列表。')],
     [('排版', '正文 28rpx、行高 1.7，深色同适配。'), ('组件复用', '沿用 content-detail。')]),
    ('pages/tutorial/list', '教程合集', '#4f7cff', 'content', "getCatalog('guide') 经 content-list 组件",
     [('条目列表', 'content-list：教程条目。'), ('进入教程', '点条目进 content-detail。')],
     [('组件复用', '沿用 content-list。'), ('首页联动', '首页「新手必看 · 查看全部」指向本页。')]),
    ('pages/tutorial/detail', '教程详情', '#4f7cff', 'content', "content-detail 组件",
     [('教程正文', 'content-detail：标题 + 分步段落。'), ('返回', '返回列表。')],
     [('组件复用', '沿用 content-detail。'), ('步骤结构', '步骤编号沿用指南页规范。')]),
    ('pages/wallpaper/detail', '壁纸详情', '#7f5bff', 'hero', "wallpapers.json",
     [('大图', '全屏图 + 查看原图。'), ('信息', '名称/来源标注。')],
     [('预览', 'uni.previewImage 全屏。'), ('来源标注', 'BWIKI 收录声明保留。')]),
    ('pages/settings/settings', '设置', '#8291ad', 'panel', "主题偏好 / 缓存 / 版本（本机存储）",
     [('外观主题', '浅色 / 深色 / 跟随系统 三选一。'), ('资料缓存', '缓存说明 + 清除按钮。'), ('问题反馈', '微信客服会话按钮（open-type=contact）。'), ('关于', '版本 / 资料来源 / 数据说明。')],
     [('三选项交互', '选中态用 brand-soft 底 + 主蓝描边。'), ('反馈按钮', 'button open-type=contact，勿改为跳页。')]),
    ('pages-explore/explore/explore', '地图探索', '#0aa06e', 'tool', "map-points.json（区域点位清单）",
     [('工具面板', '区域选择 + 点位清单。'), ('点位行', '区域 + 点位说明。')],
     [('分包注意', '本页在 pages-explore 分包（580KB），改动注意包体门禁。'), ('地图探索入口', '首页宫格 P5 已有入口。')]),
]

TMPL = """<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>线框图 · %(title)s（%(route)s）</title><style>%(css)s</style></head><body>
<h1>线框图 · %(title)s（%(route)s）</h1>
<p class="sub">阶段 1 产出 · 页面类型：%(kindcn)s · 数据来源：%(src)s</p>
<div class="wrap"><div class="phone"><div class="screen">
  <div class="navbar">%(title)s</div>
  <div class="scroll">
    %(hero)s
    %(blocks)s
  </div>
</div></div>
%(spec)s
</div></body></html>
"""

HERO_TPL = """    <div class="phero"><span class="num">1</span>
      <div class="pttl">%(title)s</div>
      <div class="psub">%(sub)s</div>
    </div>"""


def render(page):
    route, title, acc, kind, src, blocks, specitems = page
    css = BASE_CSS % dict(acc=acc)
    if kind == 'hero':
        hero = HERO_TPL % dict(title=title, sub=desc_of(route))
    elif kind == 'tool':
        hero = ('    <div class="blk" style="margin-top:9px"><span class="num">1</span>'
                '<div class="lb">工具面板（tool-panel：标题 + 提示 + 操作区）</div>'
                '<div class="note">%s</div></div>') % desc_of(route)
    elif kind == 'panel':
        hero = ('    <div class="blk" style="margin-top:9px"><span class="num">1</span>'
                '<div class="lb">面板组（panel card × N）</div>'
                '<div class="note">%s</div></div>') % desc_of(route)
    else:  # content
        hero = ('    <div class="blk" style="margin-top:9px"><span class="num">1</span>'
                '<div class="lb">组件页（content-list / content-detail 复用）</div>'
                '<div class="note">%s</div></div>') % desc_of(route)
    blocks_html = []
    for i, (bt, bn) in enumerate(blocks, start=2):
        blocks_html.append('    <div class="blk"><span class="num">%d</span><div class="lb">%s</div><div class="note">%s</div></div>' % (i, bt, bn))
    kindcn = {'hero': '渐变头 + 内容区', 'tool': '工具面板', 'panel': '面板组', 'content': '共享组件'}[kind]
    specs = ''.join(
        '<div class="it"><span class="n">&#10003;</span><div><span class="k">%s</span><span class="w">%s</span></div></div>' % (k, w)
        for k, w in specitems
    )
    return TMPL % dict(
        title=title, route=route, kindcn=kindcn, src=src, css=css, hero=hero,
        blocks='\n'.join(blocks_html),
        spec='  <div class="spec"><h2>改动说明 / 交互要点</h2>%s\n    <div class="dark-note"><b>深色模式：</b>%s</div></div>' % (specs, DARK_STD),
    )


def desc_of(route):
    DESCS = {
        'pages/element/element': '元素克制速查：相克矩阵 + 队伍覆盖检查',
        'pages/team/team': '队伍编成：3 角色 + 3 奇波槽位与元素覆盖',
        'pages/compare/compare': '双列角色属性对比，差异高亮',
        'pages/cultivation/cultivation': '升级经验 + 印记突破 → 材料缺口清单',
        'pages/pity/pity': '保底计算：垫抽数输入 + 距保底输出',
        'pages/settings/settings': '外观主题（浅/深/跟随系统）、资料缓存、微信客服反馈、版本信息',
        'pages-explore/explore/explore': '区域点位清单（分包页）',
        'pages/story/list': '剧情条目列表（content-list）',
        'pages/tutorial/list': '新手教程条目列表（content-list）',
        'pages/story/detail': '剧情正文阅读（content-detail）',
        'pages/tutorial/detail': '教程分步正文（content-detail）',
        'pages/wallpaper/detail': '壁纸大图预览',
    }
    return DESCS.get(route, '')


if __name__ == '__main__':
    count = 0
    for page in PAGES:
        route = page[0]
        fname = route.replace('/', '-').replace('pages-', '') + '.html'
        fname = 'pages-' + route.split('/', 1)[1].replace('/', '-') + '.html'
        (OUT / fname).write_text(render(page), encoding='utf-8')
        count += 1
    print('generated:', count)
