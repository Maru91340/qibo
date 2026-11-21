# -*- coding: utf-8 -*-
"""轮次 12 追加（2026-11-17）：远程图片外链全量下载器。

用户需求：奇波详情技能图等仍是远程链接（ap-cbt3.csxylic.com / patchwiki 等），
先把运行数据里出现的所有外链图片下载到本地留档（assets/remote-images/），
暂不替换代码中的图片链接；先统计总数再下载，下载失败的单独记录。

用法：
    python scripts/download-remote-images.py scan          # 只扫描统计，不下载
    python scripts/download-remote-images.py download      # 扫描 + 并发下载全量运行数据外链
    python scripts/download-remote-images.py qibo-missing  # 只补奇波列表缺失的 8 张 CBT3 宠物头像

产物：
    assets/remote-images/<sha1-12>.<ext>   图片文件（文件名为 URL 摘要，防重名/中文路径问题）
    assets/remote-images/manifest.json     url -> 文件/状态/字节数/来源 的映射（供将来替换链接用）
    assets/remote-images/failures.json     下载失败清单（url/状态码/错误/重试次数）
"""
import hashlib
import json
import os
import re
import sys
import time
import concurrent.futures
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(PROJECT_ROOT, "assets", "remote-images")
LOG_FILE = os.path.join(OUT_DIR, "download.log")


def log(message):
    """同时写 stdout 与 download.log，进度随时可查（支持中断后续传）。"""
    line = "[%s] %s" % (time.strftime("%Y-%m-%d %H:%M:%S"), message)
    print(line, flush=True)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as handle:
            handle.write(line + "\n")
    except OSError:
        pass
DATA_DIRS = [
    os.path.join(PROJECT_ROOT, "src", "data"),
]
# image-runtime.json 的文件池：相对路径需拼出 BWIKI 原图 URL
IMAGE_RUNTIME = os.path.join(PROJECT_ROOT, "src", "data", "generated", "image-runtime.json")
CDN_BASE = "https://patchwiki.biligame.com/images/ap/"
# 奇波列表云图索引当前缺失的条目。固定用 CBT3 的 pet 图标路径，不能按历史 CSV 中
# 任意同编号 URL 猜图（会误匹配 kiboecho 材料图或 enemy 图）。下载后需人工核图再上传云存储。
QIBO_MISSING = {
    "500023": "苗鸡",
    "500297": "苗鸡（特殊）",
    "500002": "水灵仔",
    "500123": "风灵苞",
    "500046": "木灵苞",
    "500020": "小雪狼",
    "500021": "冰速狼",
    "500022": "霜刃狼",
}
QIBO_PATCH_DIR = os.path.join(PROJECT_ROOT, "assets", "qibo-cbt3-patches")

IMG_EXT_RE = re.compile(r"\.(png|jpe?g|webp|gif|svg)(\?[^\s]*)?$", re.I)
URL_RE = re.compile(r"^https?://", re.I)
THUMB_HINT_RE = re.compile(r"/thumb/", re.I)
SKIP_EXT_RE = re.compile(r"\.(mp3|mp4|m4a|webm|css|js|json|html?|php)(\?|$)", re.I)
# MediaWiki「文件:xxx.png」描述页是 HTML 页面不是图片直链（以图片扩展名结尾的误报源）
DESC_PAGE_RE = re.compile(r"wiki\.biligame\.com/ap/(%E6%96%87%E4%BB%B6%3a|文件%3a|%E6%96%87%E4%BB%B6:|文件:)", re.I)
# JS 模板字面量（生成代码里的 ${var}），运行时渲染后才存在，扫描期不是真实 URL
TEMPLATE_URL_RE = re.compile(r"\$\{")


def iter_strings(obj):
    """递归产出 JSON 结构里的所有字符串值。"""
    if isinstance(obj, str):
        yield obj
    elif isinstance(obj, dict):
        for value in obj.values():
            yield from iter_strings(value)
    elif isinstance(obj, list):
        for value in obj:
            yield from iter_strings(value)


def collect_urls_from_file(path, bucket, sources):
    try:
        with open(path, "r", encoding="utf-8") as handle:
            data = json.load(handle)
    except Exception:
        return  # 非 JSON（.js 里的 URL 少量，交给文本正则兜底）
    for text in iter_strings(data):
        text = text.strip()
        if not URL_RE.match(text):
            continue
        if SKIP_EXT_RE.search(text):
            continue
        if DESC_PAGE_RE.search(text):
            continue
        if TEMPLATE_URL_RE.search(text):
            continue
        if IMG_EXT_RE.search(text) or THUMB_HINT_RE.search(text):
            bucket.add(text)
            sources[text] = os.path.relpath(path, PROJECT_ROOT)


def collect_urls_from_text_file(path, bucket, sources):
    """js 文本兜底：正则抓 http(s) 图片直链。"""
    try:
        with open(path, "r", encoding="utf-8") as handle:
            text = handle.read()
    except Exception:
        return
    for match in re.finditer(r"https?://[^\s\"'`,)\\]+", text):
        url = match.group(0).rstrip(".")
        if SKIP_EXT_RE.search(url):
            continue
        if DESC_PAGE_RE.search(url):
            continue
        if TEMPLATE_URL_RE.search(url):
            continue
        if IMG_EXT_RE.search(url) or THUMB_HINT_RE.search(url):
            bucket.add(url)
            sources[url] = os.path.relpath(path, PROJECT_ROOT)


def scan():
    bucket = set()
    sources = {}
    for data_dir in DATA_DIRS:
        for root, _dirs, files in os.walk(data_dir):
            for name in files:
                path = os.path.join(root, name)
                if name.endswith(".json"):
                    collect_urls_from_file(path, bucket, sources)
                elif name.endswith(".js"):
                    collect_urls_from_text_file(path, bucket, sources)

    # image-runtime 文件池 → BWIKI 原图直链（thumbUrl/redirectUrl 的原图形态）
    pool_count = 0
    try:
        runtime = json.load(open(IMAGE_RUNTIME, "r", encoding="utf-8"))
        for item in runtime.get("f", []):
            if isinstance(item, (list, tuple)) and item:
                url = CDN_BASE + item[0]
                if url not in bucket:
                    bucket.add(url)
                    sources[url] = "src/data/generated/image-runtime.json"
                    pool_count += 1
    except Exception as error:
        print("image-runtime 解析失败: %s" % error)

    by_host = {}
    for url in bucket:
        by_host.setdefault(urlparse(url).netloc, 0)
        by_host[urlparse(url).netloc] += 1

    print("去重后外链图片总数：%d" % len(bucket))
    print("其中来自 image-runtime 文件池原图：%d" % pool_count)
    print("按域名分布：")
    for host, count in sorted(by_host.items(), key=lambda kv: -kv[1]):
        print("  %-36s %5d" % (host, count))

    os.makedirs(OUT_DIR, exist_ok=True)
    with open(os.path.join(OUT_DIR, "sources.json"), "w", encoding="utf-8") as handle:
        json.dump({url: sources[url] for url in sorted(bucket)}, handle, ensure_ascii=False, indent=1)
    print("清单已写：%s" % os.path.join(OUT_DIR, "sources.json"))
    return bucket


def ext_of(url):
    path = urlparse(url).path
    match = re.search(r"\.(png|jpe?g|webp|gif|svg)$", path, re.I)
    return (match.group(1) if match else "png").lower().replace("jpeg", "jpg")


def looks_like_image(body):
    """按魔数校验真图片（防把 HTML 错误页/文件描述页存成图）。"""
    if body[:8] == b"\x89PNG\r\n\x1a\n":
        return True
    if body[:3] == b"\xff\xd8\xff":
        return True
    if body[:4] == b"RIFF" and body[8:12] == b"WEBP":
        return True
    if body[:4] == b"GIF8":
        return True
    if body[:5] in (b"<svg ", b"<?xml"):
        return True
    return False


def fetch(url, retries=2, timeout=25):
    last_error = None
    for attempt in range(1, retries + 2):
        try:
            request = Request(url, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) qbxzs-image-sync/1.0",
                "Accept": "image/*,*/*;q=0.8",
            })
            with urlopen(request, timeout=timeout) as response:
                status = getattr(response, "status", 200) or 200
                body = response.read()
            if status != 200 or not body:
                raise RuntimeError("HTTP %s, %d bytes" % (status, len(body)))
            if not looks_like_image(body):
                raise RuntimeError("响应不是图片（魔数不符，%d bytes，疑似 HTML/重定向页）" % len(body))
            return body, status
        except (HTTPError, URLError, RuntimeError, OSError) as error:
            last_error = "%s: %s" % (type(error).__name__, str(error)[:160])
    return None, last_error


def download_qibo_missing():
    """下载奇波列表缺失的 8 张 CBT3 宠物头像，独立留档等待人工核图。"""
    os.makedirs(QIBO_PATCH_DIR, exist_ok=True)
    manifest_path = os.path.join(QIBO_PATCH_DIR, "manifest.json")
    failures_path = os.path.join(QIBO_PATCH_DIR, "failures.json")
    log_path = os.path.join(QIBO_PATCH_DIR, "download.log")
    try:
        with open(manifest_path, "r", encoding="utf-8") as handle:
            manifest = json.load(handle)
    except (OSError, json.JSONDecodeError):
        manifest = {}

    targets = []
    for pet_id, name in QIBO_MISSING.items():
        url = "https://ap-cbt3.csxylic.com/icons/pet/tex_icon_pet_%s.png" % pet_id
        output = os.path.join(QIBO_PATCH_DIR, "%s.png" % pet_id)
        old = manifest.get(pet_id, {})
        if old.get("status") == "success" and os.path.isfile(output):
            continue
        targets.append((pet_id, name, url, output))

    def patch_log(message):
        line = "[%s] %s" % (time.strftime("%Y-%m-%d %H:%M:%S"), message)
        print(line, flush=True)
        with open(log_path, "a", encoding="utf-8") as handle:
            handle.write(line + "\n")

    patch_log("========== 奇波缺图补图开始 ==========")
    patch_log("固定请求 CBT3 pet URL：待下载 %d / 已完成 %d / 目录 %s" % (
        len(targets), len(QIBO_MISSING) - len(targets), QIBO_PATCH_DIR
    ))

    def worker(target):
        pet_id, name, url, output = target
        body, result = fetch(url)
        record = {
            "id": pet_id,
            "name": name,
            "url": url,
            "file": "%s.png" % pet_id,
            "checkedAt": time.strftime("%Y-%m-%dT%H:%M:%S"),
        }
        if body is None:
            record.update({"status": "failed", "error": result})
            return pet_id, record
        with open(output, "wb") as handle:
            handle.write(body)
        record.update({"status": "success", "bytes": len(body), "httpStatus": result})
        return pet_id, record

    with concurrent.futures.ThreadPoolExecutor(max_workers=min(8, len(targets) or 1)) as pool:
        futures = [pool.submit(worker, target) for target in targets]
        for future in concurrent.futures.as_completed(futures):
            pet_id, record = future.result()
            manifest[pet_id] = record
            patch_log("%s %s：%s%s" % (
                pet_id, record["name"], record["status"],
                " (%d bytes)" % record["bytes"] if record["status"] == "success" else " — " + record["error"]
            ))

    failures = {pet_id: record for pet_id, record in manifest.items() if record.get("status") == "failed"}
    with open(manifest_path, "w", encoding="utf-8") as handle:
        json.dump(manifest, handle, ensure_ascii=False, indent=2)
    with open(failures_path, "w", encoding="utf-8") as handle:
        json.dump(failures, handle, ensure_ascii=False, indent=2)
    succeeded = sum(1 for record in manifest.values() if record.get("status") == "success")
    patch_log("完成：成功 %d / 失败 %d；请人工核对目录内图片内容，再上传云存储。" % (succeeded, len(failures)))
    patch_log("========== 奇波缺图补图结束 ==========")


def download(bucket):
    os.makedirs(OUT_DIR, exist_ok=True)
    manifest_path = os.path.join(OUT_DIR, "manifest.json")
    failures_path = os.path.join(OUT_DIR, "failures.json")
    manifest = {}
    if os.path.exists(manifest_path):
        try:
            with open(manifest_path, "r", encoding="utf-8") as handle:
                manifest = json.load(handle)
        except Exception:
            manifest = {}

    todo = [url for url in sorted(bucket) if url not in manifest or not manifest[url].get("file")]
    # 清理历史误报：文件描述页（HTML）与模板字符串都不是真实图片 URL，从 manifest 中移除
    for url in [u for u in list(manifest) if manifest[u].get("status") == "failed"
                and (DESC_PAGE_RE.search(u) or TEMPLATE_URL_RE.search(u))]:
        del manifest[url]
    print("待下载 %d 张（跳过清单中已有文件的 %d 张）" % (len(todo), len(bucket) - len(todo)))

    ok = fail = 0
    done = 0
    log("========== 下载开始 ==========")
    log("待下载 %d 张，跳过已完成 %d 张，输出目录 %s" % (len(todo), len(bucket) - len(todo), OUT_DIR))

    def worker(url):
        body, status = fetch(url)
        record = {"status": status if body is None else status, "source": url}
        if body is None:
            return url, None, record, status
        digest = hashlib.sha1(url.encode("utf-8")).hexdigest()[:12]
        name = "%s.%s" % (digest, ext_of(url))
        with open(os.path.join(OUT_DIR, name), "wb") as handle:
            handle.write(body)
        record.update({"file": name, "bytes": len(body)})
        return url, name, record, None

    with concurrent.futures.ThreadPoolExecutor(max_workers=24) as pool:
        futures = {pool.submit(worker, url): url for url in todo}
        for future in concurrent.futures.as_completed(futures):
            url, name, record, error = future.result()
            done += 1
            if name:
                ok += 1
                manifest[url] = record
            else:
                fail += 1
                manifest[url] = {"status": "failed", "error": error, "source": record.get("source", url)}
            if done % 50 == 0 or done == len(todo):
                log("进度 %d/%d：成功 %d，失败 %d" % (done, len(todo), ok, fail))
                with open(manifest_path, "w", encoding="utf-8") as handle:
                    json.dump(manifest, handle, ensure_ascii=False, indent=1)

    failures = {url: info for url, info in manifest.items() if info.get("status") == "failed" and url in bucket}
    with open(manifest_path, "w", encoding="utf-8") as handle:
        json.dump(manifest, handle, ensure_ascii=False, indent=1)
    with open(failures_path, "w", encoding="utf-8") as handle:
        json.dump(failures, handle, ensure_ascii=False, indent=1)

    log("=" * 40)
    log("本轮完成：成功 %d / 失败 %d / 清单累计 %d" % (ok, fail, len(manifest)))
    log("图片目录：%s" % OUT_DIR)
    log("失败清单：%s（共 %d 条）" % (failures_path, len(failures)))
    if failures:
        hosts = {}
        for url in failures:
            hosts.setdefault(urlparse(url).netloc, 0)
            hosts[urlparse(url).netloc] += 1
        log("失败域名分布：%s" % json.dumps(hosts, ensure_ascii=False))
    log("========== 下载结束 ==========")


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "scan"
    if mode == "qibo-missing":
        download_qibo_missing()
    elif mode in ("scan", "download"):
        urls = scan()
        if mode == "download":
            download(urls)
    else:
        print("未知命令：%s" % mode, file=sys.stderr)
        print("用法：python scripts/download-remote-images.py [scan|download|qibo-missing]", file=sys.stderr)
        sys.exit(2)
