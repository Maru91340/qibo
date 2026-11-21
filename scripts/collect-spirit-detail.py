# -*- coding: utf-8 -*-
"""灵子详情页外链补采（2026-11-19）。

背景：灵子详情页（pages/spirit/detail）微信端全部图片经 cloudDetailAsset 映射到
云存储 images/detail-assets/<分类>/<原名>，H5 端保持 CSXYLIC 热链。核对发现既有
上传批次 assets/cloud-batch-detail 缺 3 张四维属性图标（tex_icon_status_hp/atk/
def.png，详情页每页都渲染），MP 端属性 tile 只能落字形兜底。

逻辑（复用 download-remote-images.py 的 fetch，同 download-missing-images.py 模式）：
  1) 收集 soul-essence.json 全部图标字段 + 详情页硬编码属性图标，拼 CSXYLIC 完整 URL；
  2) 按 site-images.js DETAIL_CATEGORY_RULES 同源规则分到云目录分类；
  3) assets/cloud-batch-detail/<分类>/ 已有同名副本的视为已整理待上传，跳过；
  4) 缺失的下载到 assets/cloud-missing/spirit-detail/<分类>/<原名>，写 manifest，
     供手动上传云存储 images/detail-assets/<分类>/；
  5) 灵子图鉴 thumb 外链（item.icon 兜底档）只报告不采集：75 条全部命中 soul vars，
     详情页当前数据下永不渲染该档。

用法：
    python scripts/collect-spirit-detail.py            # 核对 + 补采缺失
    python scripts/collect-spirit-detail.py report     # 只核对报告，不下载
"""
import importlib.util
import json
import os
import re
import sys
import time
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

# 复用 download-remote-images.py 的 fetch（带重试与图片魔数校验），只引用不触发 __main__
_spec = importlib.util.spec_from_file_location('dri', os.path.join(ROOT, 'scripts', 'download-remote-images.py'))
dri = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(dri)

CSXYLIC = 'https://ap-cbt3.csxylic.com/'
SOUL_FILE = os.path.join(ROOT, 'src', 'data', 'generated', 'soul-essence.json')
CATALOG_FILE = os.path.join(ROOT, 'src', 'data', 'generated', 'catalogs-bundled.json')
UPLOAD_BATCH = os.path.join(ROOT, 'assets', 'cloud-batch-detail')
OUT_DIR = os.path.join(ROOT, 'assets', 'cloud-missing', 'spirit-detail')

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


def categorize(path):
    """按 detail-assets 分类规则返回云目录分类名，无规则命中返回 None。"""
    for pattern, name in CATEGORY_RULES:
        if re.search(pattern, path):
            return name
    return None


def collect_soul_paths():
    """收集灵子详情页会渲染的全部 CSXYLIC 相对路径（含页面硬编码属性图标）。"""
    data = json.load(open(SOUL_FILE, encoding='utf-8'))
    paths = set()
    for entry in data['items'].values():
        for key in ('icon', 'profIc'):
            if entry.get(key):
                paths.add(entry[key].strip())
        for variant in entry.get('vars') or []:
            if variant.get('ic'):
                paths.add(variant['ic'].strip())
        skill = entry.get('skill') or {}
        if skill.get('ic'):
            paths.add(skill['ic'].strip())
        decomp = entry.get('decomp') or {}
        if decomp.get('ic'):
            paths.add(decomp['ic'].strip())
    # detail.vue ATTR_META 硬编码的四个属性图标（破韧值走 petupgrade 分类）
    paths.update([
        'icons/soulessence/tex_icon_status_hp.png',
        'icons/soulessence/tex_icon_status_atk.png',
        'icons/soulessence/tex_icon_status_def.png',
        'icons/pet/tex_petupgrade_icon_brk.png',
    ])
    return paths


def thumb_report():
    """报告图鉴 thumb 兜底档是否可达（全部条目命中 soul vars 则该档为死路径）。"""
    data = json.load(open(CATALOG_FILE, encoding='utf-8'))
    spirit = data['types'].get('spirit') or {'items': []}
    soul = json.load(open(SOUL_FILE, encoding='utf-8'))

    def norm(name):
        return re.sub(r'\s+', '', str(name or '')).replace('S版', '').replace('B版', '')

    by_name = {}
    for entry in soul['items'].values():
        by_name.setdefault(norm(entry.get('n')), entry)
    unmatched = []
    for item in spirit['items']:
        entry = by_name.get(norm(item.get('name')))
        if not entry or not entry.get('vars'):
            unmatched.append(item.get('name'))
    return len(spirit['items']), unmatched


def main():
    download = 'report' not in sys.argv[1:]
    paths = collect_soul_paths()
    todo = []
    covered = 0
    for path in sorted(paths):
        category = categorize(path)
        name = path.rstrip('/').rsplit('/', 1)[-1]
        if category and os.path.exists(os.path.join(UPLOAD_BATCH, category, name)):
            covered += 1
            continue
        todo.append((CSXYLIC + path, category or '其他图标', name, path))
    total, unmatched = thumb_report()

    print('灵子详情页外链图标 %d 个；已在上传批次 %d 个；缺失 %d 个。' % (len(paths), covered, len(todo)))
    print('图鉴 thumb 兜底档 %d 条，未命中 soul vars 的 %d 个%s。' % (
        total, len(unmatched), ('：' + '、'.join(unmatched[:5])) if unmatched else '（当前数据下详情页永不渲染，无需采集）'))
    if not todo:
        print('✔ 无缺失，详情页云端图片已齐。')
        return
    for url, category, name, _ in todo:
        print('  [%s] %s' % (category, name))
    if not download:
        print('（report 模式，不下载）')
        return

    records = {}
    ok = fail = 0
    for url, category, name, path in todo:
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
        print('  ✔ %s → %s（%d bytes）' % (name, os.path.relpath(target, ROOT), len(body)))

    manifest_path = os.path.join(OUT_DIR, 'manifest.json')
    with open(manifest_path, 'w', encoding='utf-8', newline='\n') as handle:
        json.dump(records, handle, ensure_ascii=False, indent=1)
    print('✔ 补采完成：成功 %d / 失败 %d；清单 %s' % (ok, fail, manifest_path))
    if ok:
        print('上传指引：把 assets/cloud-missing/spirit-detail/<分类>/ 下的文件手动上传到云存储 images/detail-assets/<分类>/（文件名保持不变）。')


if __name__ == '__main__':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except (AttributeError, OSError):
        pass
    main()
