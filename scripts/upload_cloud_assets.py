# -*- coding: utf-8 -*-
"""云开发批量上传统一入口（python）：转发 node scripts/upload-cloud-assets.mjs。

上传逻辑（白名单 / dry-run / --yes / 分类映射）全部在 upload-cloud-assets.mjs，
本脚本只是 python 侧的入口转发，方便与其它采集脚本同一套命令风格：
    python scripts/upload_cloud_assets.py               # dry-run 列清单
    python scripts/upload_cloud_assets.py --yes         # 实际上传
    python scripts/upload_cloud_assets.py --only 灵子   # 只传指定云目录分类
凭证走机器级环境变量 TENCENT_SECRET_ID / TENCENT_SECRET_KEY，见 AGENTS.md。
"""
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENTRY = os.path.join(ROOT, 'scripts', 'upload-cloud-assets.mjs')

if __name__ == '__main__':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except (AttributeError, OSError):
        pass
    if not os.path.exists(ENTRY):
        print('✘ 找不到 %s' % ENTRY)
        sys.exit(1)
    result = subprocess.call(['node', ENTRY] + sys.argv[1:])
    sys.exit(result)
