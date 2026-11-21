"""采集 CBT3 角色详情，并按来源页保留文本、图片、链接和等级数据。"""

import json
import re
import time
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parent.parent
SOURCE = 'https://ap-cbt3.csxylic.com'
AUDIT = ROOT / 'docs' / '数据源审计_2026-11-13' / '在线数据快照.json'
OUTPUT = ROOT / 'src' / 'data' / 'generated' / 'character-detail-cbt3.json'


class HeroParser(HTMLParser):
    """提取正文顺序、标题、图片、链接和页面内的等级数据。"""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.in_main = False
        self.ignored = 0
        self.tag_stack = []
        self.records = []

    def handle_starttag(self, tag, attrs):
        """处理正文标签和可供展示的资源。"""
        attrs = dict(attrs)
        if tag == 'main':
            self.in_main = True
        if not self.in_main:
            return
        if tag in ('script', 'style', 'svg', 'button'):
            self.ignored += 1
        if self.ignored:
            return
        if tag not in ('img', 'br', 'input', 'meta', 'link', 'source', 'hr'):
            self.tag_stack.append(tag)
        if tag == 'img' and attrs.get('src'):
            self.records.append({'type': 'image', 'url': SOURCE + attrs['src'] if attrs['src'].startswith('/') else attrs['src'], 'alt': attrs.get('alt', '')})
        if tag == 'a' and attrs.get('href'):
            href = attrs['href']
            if href.startswith(('/pet/', '/hero/', '/equipment/', '/soulessence/')):
                self.records.append({'type': 'link', 'url': SOURCE + href})
        for key in ('data-levels', 'data-ast-rates', 'data-ast-values'):
            if attrs.get(key):
                try:
                    self.records.append({'type': key, 'value': json.loads(attrs[key])})
                except (ValueError, TypeError):
                    self.records.append({'type': key, 'value': attrs[key]})

    def handle_endtag(self, tag):
        """恢复标签上下文并结束正文。"""
        if not self.in_main:
            return
        if tag in ('script', 'style', 'svg', 'button') and self.ignored:
            self.ignored -= 1
            return
        if self.ignored:
            return
        if tag == 'main':
            self.in_main = False
        if tag in self.tag_stack:
            self.tag_stack = self.tag_stack[:len(self.tag_stack) - 1 - self.tag_stack[::-1].index(tag)]

    def handle_data(self, data):
        """以文本顺序保留标题和正文。"""
        if not self.in_main or self.ignored:
            return
        value = re.sub(r'\s+', ' ', data).strip()
        if not value:
            return
        heading = next((tag for tag in reversed(self.tag_stack) if re.fullmatch(r'h[1-4]', tag)), None)
        self.records.append({'type': 'heading' if heading else 'text', 'value': value})


def fetch_page(url):
    """限速读取公开页面，失败时重试并报告缺项。"""
    for attempt in range(3):
        try:
            request = Request(url, headers={'User-Agent': 'Mozilla/5.0 (compatible; qbxzs-reference/1.0)'})
            with urlopen(request, timeout=30) as response:
                return response.read().decode('utf-8')
        except (HTTPError, URLError, TimeoutError) as error:
            if attempt == 2:
                print('读取失败:', url, str(error), flush=True)
                return None
            time.sleep(2 * (attempt + 1))


def main():
    """采集索引中的角色及各个详情子页面。"""
    audit = json.loads(AUDIT.read_text(encoding='utf-8'))
    characters = [row for row in audit['records'] if row.get('source') == 'cbt3' and row.get('type') == 'character']
    output = {'source': SOURCE, 'reference': 'CBT3', 'characters': [], 'failed': []}
    for entry in characters:
        hero_id = entry['sourceId']
        character = {'name': entry['name'], 'sourceId': hero_id, 'pages': {}}
        for page in ('battle', 'recommend', 'profile'):
            suffix = '' if page == 'battle' else page + '/'
            url = f'{SOURCE}/hero/{hero_id}/{suffix}'
            html = fetch_page(url)
            if html is None:
                output['failed'].append(url)
            else:
                parser = HeroParser()
                parser.feed(html)
                if not parser.records:
                    output['failed'].append(url)
                else:
                    character['pages'][page] = {'url': url, 'records': parser.records}
            time.sleep(1.1)
        output['characters'].append(character)
        print(f"{entry['name']} {hero_id}: {len(character['pages'])}/3", flush=True)
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8', newline='\n')
    print(f"保存 {len(output['characters'])} 条，失败 {len(output['failed'])} 页：{OUTPUT}", flush=True)


if __name__ == '__main__':
    main()
