# -*- coding: utf-8 -*-
"""角色详情页外链补采（2026-11-19，P2 配套）：character-detail 数据里的 csxylic 图标落本地。

背景：cloudDetailAsset 曾用 new URL 取 pathname，微信运行时无 URL 构造器导致 MP 端
静默回退热链（已修复为手动截取）；修复后角色详情全部图标走 images/detail-assets/
<分类>/<原名>，核对发现只有「装备」分类（tex_icon_equipment_* / tex_accessory_*，
共 107 个）从未整理进上传批次，其余 532 个已覆盖。

产物（目录结构配合 scripts/upload_cloud_assets.py 白名单映射）：
    assets/cloud-missing/character-detail/装备/<原名>  → images/detail-assets/装备/
    assets/cloud-missing/character-detail/manifest.json

用法：
    python scripts/collect-character-detail.py          # 核对 + 下载缺失
    python scripts/collect-character-detail.py report   # 只核对报告，不下载
"""
import importlib.util
import json
import os
import re
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

# 复用 download-remote-images.py 的 fetch（带重试与图片魔数校验），只引用不触发 __main__
_spec = importlib.util.spec_from_file_location('dri', os.path.join(ROOT, 'scripts', 'download-remote-images.py'))
dri = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(dri)

SOURCES = [
    'src/data/generated/character-detail-cbt3.json',
    'src/data/generated/character-detail-bwiki.json',
    'src/data/generated/character-bwiki-info.json',
]
UPLOAD_BATCH = os.path.join(ROOT, 'assets', 'cloud-batch-detail')
OUT_DIR = os.path.join(ROOT, 'assets', 'cloud-missing', 'character-detail')

# 与 site-images.js DETAIL_CATEGORY_RULES 保持同源（顺序即优先级）
CATEGORY_RULES = [
    (r'petupgrade', '资质图标'),
    (r'icons/skill/', '技能图标'),
    (r'icons/soulessence', '灵子'),
    (r'icons/pet/', '奇波图标'),
    (r'icons/item/', '物品'),
    (r'icons/enemy/', '敌人'),
    (r'icons/equip', '装备'),
    (r'icons/food/', '美食'),
    (r'icons/', '其他图标'),
]


def categorize(url):
    for pattern, name in CATEGORY_RULES:
        if re.search(pattern, url):
            return name
    return '其他图标'


def collect_urls():
    """收集三个角色详情数据源里的全部 csxylic 图标 URL（按文件名去重）。"""
    urls = {}
    for path in SOURCES:
        if not os.path.exists(path):
            continue
        text = open(os.path.join(ROOT, path), encoding='utf-8').read()
        for url in re.findall(r'https://ap-cbt3\.csxylic\.com/icons/[^"\\\s]+', text):
            name = url.split('?')[0].rstrip('/').rsplit('/', 1)[-1]
            urls.setdefault(name, url)
    return urls


def has_local(category, name):
    return os.path.exists(os.path.join(UPLOAD_BATCH, category, name)) or \
        os.path.exists(os.path.join(OUT_DIR, '装备', name))


def main():
    download = 'report' not in sys.argv[1:]
    urls = collect_urls()
    todo = []
    for name, url in sorted(urls.items()):
        category = categorize(url)
        if has_local(category, name):
            continue
        todo.append((url, name, category))
    print('角色详情图标 %d 个（按文件名去重）；缺失 %d 个待下载。' % (len(urls), len(todo)))
    by_cat = {}
    for _, name, category in todo:
        by_cat.setdefault(category, []).append(name)
    for category, names in sorted(by_cat.items()):
        print('  [%s] %d 个，例：%s' % (category, len(names), '、'.join(sorted(names)[:3])))
    if not todo:
        print('✔ 无缺失。')
        return
    if not download:
        print('（report 模式，不下载）')
        return

    records_path = os.path.join(OUT_DIR, 'manifest.json')
    records = {}
    if os.path.exists(records_path):
        try:
            records = json.load(open(records_path, encoding='utf-8'))
        except (OSError, json.JSONDecodeError):
            records = {}
    ok = fail = 0
    for i, (url, name, category) in enumerate(todo, 1):
        body, status = dri.fetch(url)
        if body is None:
            fail += 1
            records[url] = {'error': status, 'category': category, 'downloadedAt': time.strftime('%Y-%m-%dT%H:%M:%S')}
            print('  ✘ %s：%s' % (name, status))
            continue
        target = os.path.join(OUT_DIR, category, name)
        os.makedirs(os.path.dirname(target), exist_ok=True)
        with open(target, 'wb') as handle:
            handle.write(body)
        ok += 1
        records[url] = {
            'file': os.path.relpath(target, ROOT).replace('\\', '/'),
            'cloudPath': 'images/detail-assets/' + category + '/' + name,
            'bytes': len(body),
            'httpStatus': status,
            'downloadedAt': time.strftime('%Y-%m-%dT%H:%M:%S'),
        }
        if i % 20 == 0 or i == len(todo):
            print('进度 %d/%d：成功 %d / 失败 %d' % (i, len(todo), ok, fail))

    with open(records_path, 'w', encoding='utf-8', newline='\n') as handle:
        json.dump(records, handle, ensure_ascii=False, indent=1)
    print('✔ 补采完成：成功 %d / 失败 %d；清单 %s' % (ok, fail, records_path))
    print('下一步：python scripts/upload_cloud_assets.py --only 装备 --yes')


if __name__ == '__main__':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except (AttributeError, OSError):
        pass
    main()
