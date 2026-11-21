# -*- coding: utf-8 -*-
"""阶段1线框图批量生成：catalog-list / catalog-detail 参数化模板（结构基于真实组件）。
用法：python scripts/gen-wireframes.py   （输出到 docs/ui-redesign/）
"""
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / 'docs' / 'ui-redesign'
OUT.mkdir(exist_ok=True)

PAGES = [
    ('spirit', '灵子图鉴', '搜灵子名称、属性', '分类 / 稀有度 / 标签', '分类', '#7f5bff', 'spirit', '灵子套装与属性筛选'),
    ('item', '物品图鉴', '搜物品名称、功能', '分类 / 稀有度 / 用途 / 标签', '分类', '#2f6bff', 'item', '物品类型与稀有度速查'),
    ('equipment', '装备图鉴', '搜装备名称、套装', '分类 / 稀有度 / 标签', '分类', '#ff8a3d', 'equipment', '装备类型与套装查看'),
    ('material', '材料图鉴', '搜材料名称、用途', '分类 / 稀有度 / 用途 / 标签', '分类', '#00b3a4', 'material', '养成材料与用途'),
    ('food', '美食图鉴', '搜料理名称、效果', '分类 / 稀有度 / 标签', '分类', '#ff5b7f', 'food', '料理效果与饱腹值'),
    ('fishing', '钓鱼图鉴', '搜鱼类、鱼竿、钓点', '分类 / 稀有度 / 标签', '分类', '#12a5c9', 'fishing', '鱼类与产地信息'),
    ('enemy', '敌人图鉴', '搜敌人名称、元素', '分类 / 稀有度 / 标签', '分类', '#e0553f', 'enemy', '敌人类型与应对建议'),
    ('dungeon', '副本图鉴', '搜副本名称、类型', '分类 / 稀有度', '分类', '#5a6ad0', 'dungeon', '副本类型与掉落'),
    ('building', '家园建筑', '搜建筑名称、功能', '分类 / 标签', '分类', '#0aa06e', 'building', '建筑功能与解锁条件'),
    ('region', '地区阵营', '搜地区名称、阵营', '分类 / 稀有度', '分类', '#3f7fe0', 'region', '地区与阵营条目'),
]

CSS = """  *{box-sizing:border-box}body{margin:0;background:#eef1f8;color:#1a2138;font-family:-apple-system,"PingFang SC",sans-serif;padding:36px 24px 70px}
  .wrap{max-width:1150px;margin:auto;display:flex;gap:34px;justify-content:center;flex-wrap:wrap;align-items:flex-start}
  h1{font-size:20px;margin:0 0 4px}.sub{font-size:12px;color:#5a6480;margin:0 0 20px;line-height:1.8}
  .phone{width:375px;border-radius:40px;background:#10141f;padding:9px;box-shadow:0 20px 50px rgba(26,33,56,.22);flex:none}
  .screen{border-radius:32px;overflow:hidden;height:760px;background:#f3f5fb;display:flex;flex-direction:column}
  .navbar{height:42px;background:#1f3d9e;color:#fff;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:600;flex:none}
  .scroll{flex:1;overflow-y:auto;padding:10px 14px 24px}
  .blk{border:1.5px solid #9aa3b8;border-radius:9px;background:#fff;margin-bottom:9px;padding:9px;position:relative}
  .num{position:absolute;top:-9px;left:-9px;width:20px;height:20px;border-radius:50%;background:#ff5b4a;color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 5px rgba(255,91,74,.4);z-index:2}
  .lb{font-size:11.5px;font-weight:700;color:#5a6480}
  .note{font-size:10.5px;color:#97a0b5;line-height:1.55;margin-top:2px}
  .searchbar{height:32px;border:1px solid #d5daea;border-radius:999px;display:flex;align-items:center;padding:0 10px;font-size:11px;color:#97a0b5;gap:6px}
  .chips{display:flex;gap:6px;margin-top:7px;align-items:center;flex-wrap:wrap}
  .chip{padding:5px 9px;border-radius:999px;background:#f2f4f9;font-size:10.5px;color:#5a6480}
  .more{margin-left:auto;padding:5px 9px;border-radius:999px;background:#f2f4f9;font-size:10.5px;color:#5a6480}
  .row{display:flex;align-items:center;justify-content:space-between;font-size:11px;color:#5a6480}
  .cards{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
  .card{border:1px solid #e3e7f0;border-radius:11px;padding:8px;display:flex;gap:8px;align-items:center}
  .pic{width:44px;height:44px;border-radius:10px;background:#e8ebf3;flex:none;display:flex;align-items:center;justify-content:center;font-size:20px}
  .nm{font-size:12px;font-weight:700}.meta{font-size:9.5px;color:#97a0b5;margin-top:3px}
  .badge{margin-left:auto;font-size:9px;padding:2px 7px;border-radius:999px;background:%(accsoft)s;color:%(acc)s;font-weight:700;flex:none}
  .hero{border-radius:12px;padding:12px;background:linear-gradient(135deg,%(acc)s,rgba(255,255,255,.08));color:#fff;display:flex;gap:10px;align-items:center;position:relative}
  .hpic{width:64px;height:64px;border-radius:14px;background:rgba(255,255,255,.85);flex:none;display:flex;align-items:center;justify-content:center;font-size:30px}
  .hnm{font-size:16px;font-weight:800}.hsub{font-size:10.5px;opacity:.9;margin-top:3px}
  .tags{display:flex;gap:5px;margin-top:6px;flex-wrap:wrap}
  .tag{padding:2px 8px;border-radius:999px;background:rgba(255,255,255,.22);font-size:9.5px}
  .fav{position:absolute;top:10px;right:10px;font-size:10px;padding:4px 10px;border-radius:999px;background:rgba(255,255,255,.25)}
  .kv{display:flex;justify-content:space-between;font-size:11px;padding:6px 2px;border-bottom:1px dashed #eef0f7}
  .kv:last-child{border:0}.kv b{color:#97a0b5;font-weight:400}
  .spec{max-width:430px;width:100%;background:#fff;border-radius:16px;padding:20px 22px;box-shadow:0 8px 24px rgba(26,33,56,.07)}
  .spec h2{font-size:15px;margin:0 0 10px}
  .it{display:flex;gap:10px;padding:8px 0;border-bottom:1px dashed #eef0f7;font-size:12px;line-height:1.7}
  .it:last-child{border:0}
  .n{flex:none;width:20px;height:20px;border-radius:50%;background:#ff5b4a;color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;margin-top:2px}
  .k{font-weight:700}.w{color:#5a6480;font-size:11px;display:block}
  .dark-note{margin-top:12px;padding:10px 12px;border-radius:10px;background:#111621;color:#b9c3da;font-size:10.5px;line-height:1.7}
  .dark-note b{color:#edf2ff}
"""


def spec(items, dark, src):
    its = ''.join(
        '<div class="it"><span class="n">%d</span><div><span class="k">%s</span><span class="w">%s</span></div></div>'
        % (i + 1, k, w)
        for i, (k, w) in enumerate(items)
    )
    return (
        '  <div class="spec"><h2>改动说明</h2>%s\n'
        '    <div class="it"><span class="n">&#10003;</span><div><span class="k">数据来源</span>'
        '<span class="w">%s</span></div></div>\n'
        '    <div class="dark-note"><b>深色模式：</b>%s</div></div>'
    ) % (its, src, dark)


def list_page(key, title, ph, facets, badge, acc, typ, desc):
    accsoft = acc + '22'
    chips = ''.join('<span class="chip">%s ▾</span>' % f for f in facets.split(' / '))
    cards = ''.join(
        '<div class="card"><div class="pic">◈</div><div><div class="nm">条目 %s</div>'
        '<div class="meta">%s · ★%s</div></div><span class="badge">%s</span></div>'
        % (n, facets.split(' / ')[0], stars, badge)
        for n, stars in [('A', '★'), ('B', '★★★'), ('C', ''), ('D', '★★')]
    )
    src = "getCatalog('%s')，经 catalog-list 组件渲染（type=%s，facets=%s）" % (typ, typ, facets)
    items = [
        ('筛选卡吸顶', '搜索（%s）+ %s 胶囊合并吸顶，与首页圆角搜索同语言。' % (ph, facets)),
        ('结果行', '「共 N 条 / 找到 M 条」+ 排序入口浅蓝胶囊。'),
        ('双列条目卡', '图(44px) + 名称 + 首要分类 + 稀有度星；右侧 %s 角标；命名区固定可见。' % badge),
        ('交互沿用', '分页加载更多 / 底部筛选面板 / 收藏开关，逻辑全部不动。'),
    ]
    return LIST_TMPL % dict(
        title=title, key=key, ph=ph, chips=chips, cards=cards, badge=badge,
        acc=acc, accsoft=accsoft, css=CSS, spec=spec(items, '--bg #111621 / 卡 #1a2232 / 线 #2b354b / 文 #EDF2FF，辅色 %s 保持该图鉴品牌差异。' % acc, src),
    )


def detail_page(key, title, ph, facets, badge, acc, typ, desc):
    accsoft = acc + '22'
    src = '路由 /pages/%s/detail?id=…，catalog-detail 组件（type=%s）读取 getCatalog(%s)' % (key, typ, "getCatalog('%s')" % typ)
    items = [
        ('Hero 头卡', '头图可点开大图预览；加载失败回退首字占位 + 重试；收藏按钮常驻右上。'),
        ('概要与基础信息', 'item.summary 与 item.fields key-value 行，字段随条目动态。'),
        ('图文段', 'item.sections 循环渲染，标题 + 段落，支持多个。'),
        ('数据可信', '未核实条目显式标注「数据待核实」角标。'),
    ]
    return DETAIL_TMPL % dict(
        title=title, key=key, badge=badge,
        acc=acc, accsoft=accsoft, css=CSS, spec=spec(items, '--bg #111621 / 卡 #1a2232 / 线 #2b354b / 文 #EDF2FF，Hero 渐变保留 %s 主题色。' % acc, src),
    )


LIST_TMPL = """<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>线框图 · %(title)s（pages/%(key)s/list）</title><style>%(css)s</style></head><body>
<h1>线框图 · %(title)s（pages/%(key)s/list）</h1>
<p class="sub">阶段 1 产出 · 基于 catalog-list 组件真实参数（type=%(key)s）。模板套用自 pages-qibo-list 代表页。</p>
<div class="wrap"><div class="phone"><div class="screen">
  <div class="navbar">%(title)s</div>
  <div class="scroll">
    <div class="blk"><span class="num">1</span><div class="lb">筛选卡（吸顶）</div>
      <div class="searchbar" style="margin-top:6px">⌕ %(ph)s</div>
      <div class="chips">%(chips)s<span class="more">更多筛选 ›</span></div>
    </div>
    <div class="blk" style="padding:7px 9px"><span class="num">2</span><div class="row"><span>☆ 只看收藏 · 已收藏 N 条</span><span>清空条件</span></div></div>
    <div class="blk" style="padding:7px 9px"><span class="num">3</span><div class="row"><span>共 N 条</span><span>排序：默认 ▾</span></div></div>
    <div class="blk" style="border:none;background:transparent;padding:0"><span class="num">4</span>
      <div class="lb" style="padding:0 2px">条目卡 · 双列栅格</div>
      <div class="cards">%(cards)s</div>
    </div>
  </div>
</div></div>
%(spec)s
</div></body></html>
"""

DETAIL_TMPL = """<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>线框图 · %(title)s详情（pages/%(key)s/detail）</title><style>%(css)s</style></head><body>
<h1>线框图 · %(title)s详情（pages/%(key)s/detail）</h1>
<p class="sub">阶段 1 产出 · 基于 catalog-detail 组件真实结构（含收藏 / 概要 / 基础信息 / 图文段 / 数据待核实角标）。模板套用自 pages-qibo-detail 代表页。</p>
<div class="wrap"><div class="phone"><div class="screen">
  <div class="navbar">%(title)s详情</div>
  <div class="scroll">
    <div class="blk"><span class="num">1</span><div class="lb">Hero 头卡（%(acc)s 主题色渐变）</div>
      <div class="hero" style="margin-top:6px">
        <div class="hpic">◈</div>
        <div><div class="hnm">条目名称</div><div class="hsub">分类 · 稀有度</div>
          <div class="tags"><span class="tag">SSR</span><span class="tag">标签1</span><span class="tag">数据待核实</span></div></div>
        <span class="fav">☆ 收藏</span>
      </div>
    </div>
    <div class="blk"><span class="num">2</span><div class="lb">概要卡</div><div class="note">一句话概要描述（item.summary）。</div></div>
    <div class="blk"><span class="num">3</span><div class="lb">基础信息卡（key-value 行）</div>
      <div class="kv"><span>字段1</span><b>值1</b></div><div class="kv"><span>字段2</span><b>值2</b></div><div class="kv"><span>获取途径</span><b>……</b></div>
    </div>
    <div class="blk"><span class="num">4</span><div class="lb">图文段（可多个）</div><div class="note">section 标题 + 段落文本，支持多个 section 循环。</div></div>
    <div class="blk" style="padding:7px 9px"><span class="num">5</span><div class="row"><span>返回列表</span><span>上一条 / 下一条 ›</span></div></div>
  </div>
</div></div>
%(spec)s
</div></body></html>
"""

if __name__ == '__main__':
    css = CSS
    count = 0
    for page in PAGES:
        key, title, ph, facets, badge, acc, typ, desc = page
        params = dict(acc=acc, accsoft=acc + '22')
        list_html = list_page(key, title, ph, facets, badge, acc, typ, desc)
        (OUT / ('pages-%s-list.html' % key)).write_text(list_html, encoding='utf-8')
        detail_html = detail_page(key, title, ph, facets, badge, acc, typ, desc)
        (OUT / ('pages-%s-detail.html' % key)).write_text(detail_html, encoding='utf-8')
        count += 2
    print('generated files:', count)
