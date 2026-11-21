# -*- coding: utf-8 -*-
"""BWIKI 角色信息补采（P2）：抓取 信息 区的 元素/职业/阵营/种族/生日/稀有度/武器/配音 字段。

背景：CBT3 数据里 生日/配音 多为「待公开/未知」，BWIKI 页（wiki.biligame.com/ap/<角色>）
信息区有官方填充值。本脚本只抓信息区标签对，输出：
    src/data/generated/character-bwiki-info.json
    { source, generatedAt, characters: [{ name, fields: {生日: 8月30日, ...} }] }

页面消费（pkg-character/detail.vue）：与 CBT3 的 profile.info 合并，BWIKI 优先覆盖
「待公开/未知」的空值；头部追加生日 chip。

用法：
    python scripts/collect-bwiki-character-info.py            # 全量（名字来自 CBT3 详情 + 既有 BWIKI 详情）
    python scripts/collect-bwiki-character-info.py 佩佩        # 只采集指定角色（试采用）
    python scripts/collect-bwiki-character-info.py --delay 2  # 自定义间隔秒数（默认 1.2，礼貌抓取）
"""
import importlib.util
import json
import os
import re
import sys
import time
from urllib.parse import quote
from urllib.request import Request, urlopen

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

# 复用既有 BWIKI 采集脚本的 SectionParser / section()（只引用不触发 __main__）
_spec = importlib.util.spec_from_file_location('cbwiki', os.path.join(ROOT, 'scripts', 'collect-bwiki-character-detail.py'))
cbwiki = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(cbwiki)

CBT3_FILE = os.path.join(ROOT, 'src', 'data', 'generated', 'character-detail-cbt3.json')
BWIKI_FILE = os.path.join(ROOT, 'src', 'data', 'generated', 'character-detail-bwiki.json')
OUTPUT = os.path.join(ROOT, 'src', 'data', 'generated', 'character-bwiki-info.json')
WANTED = ['元素', '职业', '阵营', '种族', '生日', '稀有度', '武器', '配音', '战斗定位']


def norm(name):
    return re.sub(r'\s+', '', str(name or ''))


def load_names():
    names = []
    seen = set()
    for path in (CBT3_FILE, BWIKI_FILE):
        if not os.path.exists(path):
            continue
        data = json.load(open(path, encoding='utf-8'))
        for entry in data.get('characters', []):
            key = norm(entry.get('name'))
            if key and key not in seen:
                seen.add(key)
                names.append(entry.get('name'))
    return names


def fetch_records(name, retries=2):
    """抓取角色页 信息 区 records（复用既有脚本的选择区段逻辑）。"""
    url = 'https://wiki.biligame.com/ap/' + quote(norm(name))
    last_error = None
    for attempt in range(retries + 1):
        try:
            with urlopen(Request(url, headers={'User-Agent': 'Mozilla/5.0 (compatible; qbxzs-reference/1.0)'}), timeout=30) as response:
                html = response.read().decode('utf-8')
            return cbwiki.section(html, '信息', '属性'), url
        except Exception as error:  # noqa: BLE001 - 记录后重试
            last_error = '%s: %s' % (type(error).__name__, str(error)[:120])
            time.sleep(1.5)
    raise RuntimeError(last_error or '抓取失败')


def parse_fields(records):
    """信息区标签对：`xxx：` 为标签，紧随文本为值；同标签多值合并。"""
    fields = {}
    label = None
    for record in records:
        if record.get('type') != 'text':
            continue
        value = re.sub(r'\s+', ' ', str(record.get('value', ''))).strip()
        if not value or value.startswith('id='):
            continue
        if value.endswith('：') and len(value) <= 8:
            label = value.rstrip('：')
            if label not in fields:
                fields[label] = ''
            continue
        if label:
            fields[label] = (fields[label] + '、' + value).strip('、') if fields[label] else value
            label = None
    return {k: v for k, v in fields.items() if k in WANTED and v and not re.match(r'^[\?？]+', v)}


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    delay = 1.2
    if '--delay' in sys.argv:
        try:
            delay = float(sys.argv[sys.argv.index('--delay') + 1])
        except (IndexError, ValueError):
            pass
    only = args[0] if args else None

    names = load_names()
    if only:
        names = [n for n in names if norm(n) == norm(only)] or [only]
    print('待采集角色 %d 个（间隔 %.1fs）：%s' % (len(names), delay, '、'.join(names)))

    existing = {'source': 'https://wiki.biligame.com/ap/', 'generatedAt': '', 'characters': []}
    if os.path.exists(OUTPUT):
        try:
            existing = json.load(open(OUTPUT, encoding='utf-8'))
        except (OSError, json.JSONDecodeError):
            existing = {'source': 'https://wiki.biligame.com/ap/', 'generatedAt': '', 'characters': []}
    by_name = {norm(c['name']): c for c in existing.get('characters', [])}

    ok = fail = 0
    for idx, name in enumerate(names, 1):
        try:
            records, url = fetch_records(name)
            fields = parse_fields(records)
            if not fields:
                raise RuntimeError('信息区为空或字段未命中')
            by_name[norm(name)] = {'name': name, 'fields': fields, 'url': url}
            ok += 1
            print('[%d/%d] ✔ %s：%s' % (idx, len(names), name, '；'.join('%s=%s' % kv for kv in fields.items())))
        except Exception as error:  # noqa: BLE001
            fail += 1
            print('[%d/%d] ✘ %s：%s' % (idx, len(names), name, error))
        if idx < len(names):
            time.sleep(delay)

    payload = {
        'source': 'https://wiki.biligame.com/ap/',
        'generatedAt': time.strftime('%Y-%m-%dT%H:%M:%S'),
        'characters': sorted(by_name.values(), key=lambda c: norm(c['name'])),
    }
    with open(OUTPUT, 'w', encoding='utf-8', newline='\n') as handle:
        json.dump(payload, handle, ensure_ascii=False, separators=(',', ':'))
        handle.write('\n')
    print('✔ 补采完成：成功 %d / 失败 %d；共 %d 个角色 → %s' % (ok, fail, len(payload['characters']), OUTPUT))


if __name__ == '__main__':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except (AttributeError, OSError):
        pass
    main()
