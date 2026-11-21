"""采集 BWIKI 两个补充角色的可用详情，缺失内容保持空数组。"""

import json
import re
import time
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / 'src' / 'data' / 'generated' / 'character-detail-bwiki.json'
CHARACTERS = [('源 千代', '104001', '源千代'), ('洛卿', '101006', '洛卿')]


class SectionParser(HTMLParser):
    """保留内容区文本、图片和技能等级数据。"""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.records = []
        self.ignore = 0

    def handle_starttag(self, tag, attrs):
        """收集资源链接和页面内技能等级参数。"""
        attrs = dict(attrs)
        if tag in ('script', 'style'):
            self.ignore += 1
        if self.ignore:
            return
        if tag == 'img' and attrs.get('src', '').startswith('https://patchwiki.biligame.com/'):
            self.records.append({'type': 'image', 'url': attrs['src'], 'alt': attrs.get('alt', '')})
        if attrs.get('data-values'):
            self.records.append({'type': 'data-values', 'value': attrs['data-values']})

    def handle_endtag(self, tag):
        """跳过脚本与样式内容。"""
        if tag in ('script', 'style') and self.ignore:
            self.ignore -= 1

    def handle_data(self, data):
        """收集非空正文并过滤素材上传提示。"""
        if self.ignore:
            return
        value = re.sub(r'\s+', ' ', data).strip()
        if value and not any(part in value for part in ('请上传文件', '待机预览', '文件大小不超过')):
            self.records.append({'type': 'text', 'value': value})


def section(html, name, next_name):
    """截取两个章节标题之间的页面内容。"""
    start = html.find('id="' + name + '"')
    end = html.find('id="' + next_name + '"', start + 1)
    if start < 0 or end < 0:
        raise ValueError('缺少章节：' + name)
    parser = SectionParser()
    parser.feed(html[start:end])
    return parser.records


def main():
    """读取两个人物页面，写入可重复使用的补充数据。"""
    characters = []
    for name, source_id, title in CHARACTERS:
        from urllib.parse import quote
        url = 'https://wiki.biligame.com/ap/' + quote(title)
        with urlopen(Request(url, headers={'User-Agent': 'Mozilla/5.0 (compatible; qbxzs-reference/1.0)'}), timeout=30) as response:
            html = response.read().decode('utf-8')
        battle = [{'type': 'heading', 'value': '信息'}] + section(html, '信息', '属性')
        battle += [{'type': 'heading', 'value': '技能'}] + section(html, '技能', '星赐')
        battle += [{'type': 'heading', 'value': '星赐'}] + section(html, '星赐', '定弦')
        profile = [{'type': 'heading', 'value': '资料'}] + section(html, '资料', '语音')
        characters.append({'name': name, 'sourceId': source_id, 'pages': {
            'battle': {'url': url, 'records': battle},
            'recommend': {'url': url, 'records': []},
            'profile': {'url': url, 'records': profile}
        }, 'unavailable': ['基础属性', '定弦', '推荐配置', '奇波搭配推荐', '装备推荐', '灵子推荐']})
        print(name, '战斗', len(battle), '资料', len(profile), flush=True)
        time.sleep(1.1)
    OUTPUT.write_text(json.dumps({'source': 'https://wiki.biligame.com/ap/', 'characters': characters, 'failed': []}, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8', newline='\n')


if __name__ == '__main__':
    main()
