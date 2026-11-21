# -*- coding: utf-8 -*-
"""残留外链补采（2026-11-19）：外链排查后的最后两批图片落本地。

背景（docs/云开发接入.md 与外链排查结论）：
  1) 壁纸页 59 张 patchwiki 原图裸链（wallpapers.json），无任何云映射；
  2) qibo-index.js 编号图标模板（tex_icon_pet_<wikiId>.png，csxylic）是奇波列表
     候选链的最后兜底档，既有上传批次（奇波图标 79 张为 combat 数据命名）覆盖不全。
候选链里的 patchwiki thumb / wiki.biligame redirect 档无需采集：同一原图已 100%
在云 images/wiki（宽度变体而已）。

产物（目录结构配合 scripts/upload_cloud_assets.py 白名单映射）：
    assets/cloud-missing/wallpapers/BWIKI采集图/<原名>   → images/detail-assets/BWIKI采集图/
    assets/cloud-missing/qibo-index/奇波图标/<原名>      → images/detail-assets/奇波图标/
    assets/cloud-missing/<批次>/manifest.json            → url → 本地文件/云端路径/字节数

用法：
    python scripts/collect-remaining-externals.py          # 核对 + 下载缺失
    python scripts/collect-remaining-externals.py report   # 只核对报告，不下载
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
WALLPAPER_FILE = os.path.join(ROOT, 'src', 'data', 'generated', 'wallpapers.json')
QIBO_INDEX_FILE = os.path.join(ROOT, 'src', 'data', 'generated', 'qibo-index.js')
UPLOAD_BATCH = os.path.join(ROOT, 'assets', 'cloud-batch-detail')
OUT_DIR = os.path.join(ROOT, 'assets', 'cloud-missing')
# 同名副本的额外搜索目录（历史上传暂存 / 补图批次），命中即视为已整理待上传
EXTRA_LOCAL_DIRS = [
    os.path.join(ROOT, 'assets', 'cloud-upload'),
    os.path.join(ROOT, 'assets', 'qibo-cbt3-patches'),
]


def has_local_copy(category, name):
    """该分类/文件名是否已有本地副本（上传批次或历史目录），命中则不再下载。"""
    if os.path.exists(os.path.join(UPLOAD_BATCH, category, name)):
        return 'cloud-batch-detail/' + category
    for base in EXTRA_LOCAL_DIRS:
        if not os.path.isdir(base):
            continue
        for dirpath, _dirs, files in os.walk(base):
            if name in files:
                return os.path.relpath(os.path.join(dirpath, name), ROOT)
    target = os.path.join(OUT_DIR, '*', category, name)
    import glob
    return 'cloud-missing' if glob.glob(target) else None


def collect_wallpapers():
    """壁纸页全部 patchwiki 原图 → BWIKI采集图 分类（cloudDetailAsset 同名映射）。"""
    data = json.load(open(WALLPAPER_FILE, encoding='utf-8'))
    seen = set()
    for group in data.get('groups', []):
        for item in group.get('items', []):
            url = str(item.get('url') or '')
            if not re.match(r'^https?://', url):
                continue
            name = urlparse(url).path.rstrip('/').rsplit('/', 1)[-1]
            if name and name not in seen:
                seen.add(name)
                yield url, name


def collect_qibo_icons():
    """qibo-index 紧凑索引的 wikiId → csxylic 编号图标 → 奇波图标 分类。"""
    text = open(QIBO_INDEX_FILE, encoding='utf-8').read()
    wiki_ids = sorted(set(re.findall(r'(?m)^(\d{5,7})\|', text)))
    for wiki_id in wiki_ids:
        name = 'tex_icon_pet_%s.png' % wiki_id
        yield CSXYLIC + 'icons/pet/' + name, name


def main():
    download = 'report' not in sys.argv[1:]
    records = {}
    ok = fail = skip = 0
    todo = []
    for url, name in list(collect_wallpapers()) + list(collect_qibo_icons()):
        category = 'BWIKI采集图' if 'biligame' in url else '奇波图标'
        batch = 'wallpapers' if 'biligame' in url else 'qibo-index'
        hit = has_local_copy(category, name)
        if hit:
            skip += 1
            continue
        todo.append((url, name, category, batch))

    print('待核对：壁纸 %d 张来源 + qibo-index %d 个编号；已在上传批次/历史目录 %d 个；缺失 %d 个。' % (
        len(list(collect_wallpapers())), len(list(collect_qibo_icons())), skip, len(todo)))
    if not todo:
        print('✔ 无缺失。')
        return
    if not download:
        for url, name, category, batch in todo[:10]:
            print('  [%s] %s' % (category, name))
        if len(todo) > 10:
            print('  … 共 %d 个' % len(todo))
        print('（report 模式，不下载）')
        return

    for i, (url, name, category, batch) in enumerate(todo, 1):
        body, status = dri.fetch(url)
        if body is None:
            fail += 1
            records[url] = {'error': status, 'category': category, 'downloadedAt': time.strftime('%Y-%m-%dT%H:%M:%S')}
            print('  ✘ %s：%s' % (name, status))
            continue
        target = os.path.join(OUT_DIR, batch, category, name)
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
        if i % 10 == 0 or i == len(todo):
            print('进度 %d/%d：成功 %d / 失败 %d' % (i, len(todo), ok, fail))

    manifest_path = os.path.join(OUT_DIR, 'manifest.json')
    existing = {}
    if os.path.exists(manifest_path):
        try:
            existing = json.load(open(manifest_path, encoding='utf-8'))
        except (OSError, json.JSONDecodeError):
            existing = {}
    existing.update(records)
    with open(manifest_path, 'w', encoding='utf-8', newline='\n') as handle:
        json.dump(existing, handle, ensure_ascii=False, indent=1)
    print('✔ 补采完成：成功 %d / 失败 %d（已有副本 %d 跳过）；清单 %s' % (ok, fail, skip, manifest_path))
    if ok or skip:
        print('下一步：python scripts/upload_cloud_assets.py   # dry-run 核对后加 --yes 全量上传')


if __name__ == '__main__':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except (AttributeError, OSError):
        pass
    main()
