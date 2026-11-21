# AGENTS.md — AI 协作须知

本文件供任何 AI 工具/模型（ZCode、Cursor、Codex、Claude Code 等）在本仓库发起新会话时自动读取。
改动云开发接入方式时必须同步更新本文件。

## 项目速览

- 「奇波陪你走」资料小程序（uni-app + Vue3，H5 + 微信小程序双端）：图鉴数据经 `scripts/` 下的采集脚本落到 `src/data/generated/`，页面只读生成物。
- 图片分层（`src/data/site-images.js`）：H5 端 BWIKI/CSXYLIC 热链；微信端走云开发存储 `cloud://` fileID，映射规则见同文件 `cloudDetailAsset` / `WIKI_PREFIX`。
- 采集脚本复用约定：下载图片一律复用 `scripts/download-remote-images.py` 的 `fetch()`（带重试与图片魔数校验），参考 `scripts/collect-spirit-detail.py`、`scripts/download-missing-images.py` 的 importlib 用法。

## 云开发（腾讯云 TCB）接入

- 环境 ID / 桶名 / 目录前缀的唯一事实源：`src/config/cloud.js`。不要把桶名抄进文档或脚本。
- 凭证：机器级环境变量 `TENCENT_SECRET_ID` / `TENCENT_SECRET_KEY`（Windows 用户级 `setx` 配置，CAM 子账号最小权限，只授云开发存储写权限）。凭证**只存在于机器环境变量**，仓库内不得出现任何密钥文件。

### 上传通道（唯一合法方式）

```bash
node scripts/upload-cloud-assets.mjs               # dry-run：列出待传清单，不做任何改动
node scripts/upload-cloud-assets.mjs --yes         # 实际上传
node scripts/upload-cloud-assets.mjs --only 灵子   # 只传指定云目录分类
```

白名单映射（`scripts/upload-cloud-assets.mjs` 内 `WHITELIST`，扩充需经用户确认并同步本文件）：

| 本地目录 | 云存储目录 |
|---|---|
| `assets/cloud-batch-detail/<分类>/` | `images/detail-assets/<分类>/` |
| `assets/cloud-missing/<批次>/<分类>/` | `images/detail-assets/<分类>/` |
| `assets/qibo-cbt3-patches/` | `images/qibo-cbt3/` |

### 上传安全规则（硬性，任何会话不得绕过）

1. **上传是外发操作**：先跑 dry-run 展示清单，向用户确认后再 `--yes` 执行。
2. 只允许白名单目录 → 固定云目录的映射；不得上传白名单外文件，不得另写绕过该脚本的上传代码。
3. 凭证红线：不得要求用户把密钥贴进对话；不得把密钥写入任何文件（含 `.env` 提交物）；不得在输出/日志中回显密钥。
4. 密钥一旦出现在聊天记录、截图、仓库文件中，立即提醒用户到腾讯云 CAM 控制台**轮换并吊销**旧密钥。
5. 上传后报告成功/失败数与 fileID 前缀（`cloud://<envId>.<bucket>/…`）供用户在云开发控制台核对。

### 首次配置（仅用户一次性手工操作，AI 不代做）

1. 腾讯云控制台 → 访问管理 CAM → 新建子用户，访问方式只勾「编程访问」，挂两条策略（缺一不可）：
   - `QcloudTCBFullAccess`（云开发全读写：管理面 + 数据面接口，storage.getUploadMetadata 等）；
   - **COS 桶写权限**——文件实际是直传环境共享桶（`putObject`），TCB 预设策略不含 COS，缺了会报
     `Access Denied.`（典型误诊：以为 TCB 策略没生效）。推荐自定义策略 `qbxzs-tcb-storage-upload`，
     只授本环境桶的写入，JSON 见 docs/云开发接入.md 或向用户索取。
2. 为该子用户生成 SecretId/SecretKey，然后写入**用户级**环境变量（新开终端生效，不在项目里留痕）：
   ```powershell
   setx TENCENT_SECRET_ID "<SecretId>"
   setx TENCENT_SECRET_KEY "<SecretKey>"
   ```
3. 依赖已就绪（`npm i -D @cloudbase/manager-node`）；换机器后重跑该命令即可。
4. 注意：CAM 策略挂上后有约 1-2 分钟生效延迟，Access Denied 时先等一等再重试。

## 本地核对命令

- 图片巡检（列表图 + 详情杂图覆盖情况）：`node scripts/audit-page-images.mjs`，报告在 `docs/图片巡检/`。
- 详情杂图补采：`python scripts/collect-spirit-detail.py`（灵子详情页）/ `python scripts/download-missing-images.py`（全量），产物进 `assets/cloud-missing/` 待上传目录。
