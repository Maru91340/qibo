# 云函数与资料契约

两个函数，共用 `shared/`（`scripts/sync-cloudfunctions.mjs` 会把公共模块拍平到函数目录，并把 `require('../shared/x')` 改写成 `require('./x')`）。

## getCatalog（公开读）

返回统一信封 `{ code: 0, message: 'success', data }`，失败为 `{ code: 1, message, error }`。

| 事件 | data |
| --- | --- |
| `{ action: 'manifest', revision? }` | 无发布内容时 `null`；否则 `{ notModified, revision, publishedAt, types: { <type>: { revision, count } } }` |
| `{ action: 'content', type, revision? }` | `{ type, content, revision, count, publishedAt }` |

客户端只用它做两件事：比对 `revision` 决定要不要拉，以及拉整类 payload 覆盖缓存。

## seedCatalog（受控写）

fail closed：未配置 `QBXZS_SEED_TOKEN` 时任何调用都返回 `SEED_NOT_CONFIGURED`。

| 事件 | 说明 |
| --- | --- |
| `{ action: 'status' }` | 当前版本与各类修订号 |
| `{ action: 'publish', source: 'bundled' }` | 发布 `seed/bundled.json`（由 `npm run seed:export` 从 `src/data` 生成） |
| `{ action: 'publish', content: { <type>: payload } }` | 增量发布会话：只写本次涉及的类型的快照，其余类型的指针原样保留 |

发布前会跑 `catalog-core` 的强校验，任何一条不过就整体拒绝（不会写半套数据）。内容与线上完全一致时返回 `status: 'unchanged'`，版本号不变。

## 数据契约（采集脚本的产出目标）

通用：`notice` 可选 ≤200 字；所有字符串去首尾空格；`_id`/`id` 只允许 `[a-z0-9-]`，≤40 字。

- `meta`：`sections[]`（`key/title/desc/icon/path/accent`，`path` 必须以 `/pages/` 开头且是已注册路由）+ `banners[]`（`id/tag/title/desc/path`）
- `element`：`elements[]`（`key/name/label/color/tint`，颜色必须 `#rrggbb`）+ `counters{ 元素key: [被克元素key] }`；`counters` 的键值都必须出现在 `elements` 里
- `qibo`：`items[]`（`id/name/element/kind/rarity/habitat/desc/usage[]/stages[]/forms[]/skills[]/verified`）+ `filters`（`kinds/usages/rarities` 都以 `全部` 开头）
- `character`：`items[]`（`id/name/title/element/role/rarity/desc/teams[]/skills[{name,type,desc}]/verified`）+ `filters`（`roles/rarities`）

两条容易被忽略的约束：

1. `filters` 的选项集必须与 `items` 用到的值互为子集（有选项没人用 → 点了空列表；有值没选项 → 筛不出来）。`src/data/qibo.js` 曾因为「异色」只出现在 `forms` 而报错，已从稀有度筛选项移除。
2. `qibo`/`character` 的 `element` 必须是当前 `element` 目录里的 key；同一请求里同时发 `element` 时，按新元素表校验。

## 集合

- `catalog_manifests/published`：`{ version, publishedAt, content: { <type>: { sha256, count, snapshotId } } }`
- `catalog_snapshots/<type>-<sha256 前16位>`：`{ type, sha256, count, payload, publishedAt }`

快照 id 由内容哈希决定，同一份内容重复发布会命中同一个快照，天然去重。
