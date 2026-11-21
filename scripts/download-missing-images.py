# -*- coding: utf-8 -*-
"""定时任务 2：扫描全部运行数据外链图片，把没有本地副本的下载到独立文件夹并记录。

逻辑：
  1) 复用 download-remote-images.py 的 scan() 收集 src/data 全部真实外链；
  2) 追加 combat/soul 相对路径拼 CSXYLIC 的 URL；
  3) 已有判定：assets/remote-images/manifest.json 有副本，或 assets/cloud-batch-detail、
     assets/qibo-cbt3-patches 下已有同名文件，或 assets/cloud-missing 历史批次已下载；
  4) 缺失的下载到 assets/cloud-missing/<批次>/<分类>/<原名>.<ext>，写批次 manifest；
  5) 全程只增不删，幂等可重跑；输出汇总供人工查看后上传云存储。
"""
import importlib.util
import json
import os
import re
import sys
import time
import concurrent.futures
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
sys.path.insert(0, os.path.join(ROOT, 'scripts'))

_spec = importlib.util.spec_from_file_location('dri', os.path.join(ROOT, 'scripts', 'download-remote-images.py'))
dri = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(dri)  # 只用其 scan/fetch，__main__ 保护使其不会自动执行

CSXYLIC = 'https://ap-cbt3.csxylic.com/'
OUT_ROOT = os.path.join(ROOT, 'assets', 'cloud-missing')
IMG_RE = re.compile(r'\.(png|jpe?g|webp)$', re.I)
REL_RE = re.compile(r'^icons/[^"\'\s]+\.(png|jpe?g|webp)$', re.I)


def iter_strings(o):
    if isinstance(o, str):
        yield o
    elif isinstance(o, dict):
        for v in o.values():
            yield from iter_strings(v)
    elif isinstance(o, list):
        for v in o:
            yield from iter_strings(v)


def known_local(url, name):
    """判定该 URL 是否已有本地副本（历史下载库 / 待上传目录 / 历史补图批次）。"""
    if url in dri_manifest and dri_manifest[url].get('file'):
        return 'remote-images'
    for base in ('assets/cloud-batch-detail', 'assets/qibo-cbt3-patches'):
        root = os.path.join(ROOT, base)
        if not os.path.isdir(root):
            continue
        for dirpath, _dirs, files in os.walk(root):
            if name in files:
                return os.path.relpath(os.path.join(dirpath, name), ROOT)
    return None


def main():
    global dri_manifest
    manifest_path = os.path.join(ROOT, 'assets', 'remote-images', 'manifest.json')
    try:
        dri_manifest = json.load(open(manifest_path, encoding='utf-8'))
    except (OSError, json.JSONDecodeError):
        dri_manifest = {}

    urls = dri.scan()
    # combat/soul 相对路径补集
    for path in ('src/data/generated/qibo-combat.json', 'src/data/generated/soul-essence.json'):
        data = json.load(open(os.path.join(ROOT, path), encoding='utf-8'))
        for s in iter_strings(data):
            if REL_RE.match(s.strip()):
                urls.add(CSXYLIC + s.strip())

    batch = time.strftime('%Y%m%d-%H%M')
    batch_dir = os.path.join(OUT_ROOT, batch)
    todo = []
    for url in sorted(urls):
        name = os.path.basename(urlparse(url).path)
        if known_local(url, name):
            continue
        cat_dir = os.path.join(batch_dir, urlparse(url).netloc.replace('.', '_'))
        todo.append((url, os.path.join(cat_dir, name)))

    print('外链总量 %d；已有本地副本，跳过；缺失 %d 张待下载 → %s' % (len(urls), len(todo), batch_dir))
    if not todo:
        print('✔ 无缺失，本轮无需下载。')
        return

    def worker(item):
        url, target = item
        body, status = dri.fetch(url)
        if body is None:
            return url, target, None, status
        os.makedirs(os.path.dirname(target), exist_ok=True)
        with open(target, 'wb') as h:
            h.write(body)
        return url, target, len(body), status

    records = {}
    ok = fail = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as pool:
        futures = [pool.submit(worker, it) for it in todo]
        for i, future in enumerate(concurrent.futures.as_completed(futures), 1):
            url, target, size, status = future.result()
            name = os.path.basename(target)
            if size:
                ok += 1
                records[url] = {'file': os.path.relpath(target, ROOT), 'bytes': size, 'httpStatus': status, 'downloadedAt': time.strftime('%Y-%m-%dT%H:%M:%S')}
            else:
                fail += 1
                records[url] = {'error': status, 'downloadedAt': time.strftime('%Y-%m-%dT%H:%M:%S')}
            if i % 50 == 0 or i == len(todo):
                print('进度 %d/%d：成功 %d / 失败 %d' % (i, len(todo), ok, fail))

    manifest_out = os.path.join(batch_dir, 'manifest.json')
    json.dump(records, open(manifest_out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('✔ 下载完成：成功 %d / 失败 %d；清单 %s' % (ok, fail, manifest_out))


if __name__ == '__main__':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except (AttributeError, OSError):
        pass
    main()
