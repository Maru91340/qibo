# UI/UX 参考文档 — 页面明细、入口矩阵（蓝色星原手册）

> 2026-10-30 生成，2026-10-31 更新，对应 `src/pages.json` 全部 53 个页面（53 已实现 / 0 占位）。日常改版查本文档定位页面；改样式前先读 [UI_STYLE_GUIDE.md](UI_STYLE_GUIDE.md)；推进优化批次见 [UI_OPTIMIZATION_PLAN.md](UI_OPTIMIZATION_PLAN.md)。

## 1. 页面地图

### 1.1 已实现页面（53）

| 分组 | 页面路径 | 页面标题 | 实现方式 | 备注 |
| --- | --- | --- | --- | --- |
| 首页 | `pages/index/index` | 蓝色星原 | 独立页 | 轮播（灵子立绘背景）+ 搜索 + 分组宫格（card/row 双模式，可用/建设中角标） |
| 奇波图鉴 | `pages/qibo/list` | 奇波图鉴 | 独立页 | 元素 pill + 多行筛选 + 出战计数 |
| 奇波详情 | `pages/qibo/detail` | 奇波详情 | 独立页 | 进化链 stages + 设为出战 |
| 角色图鉴 | `pages/character/list` | 角色图鉴 | 独立页 | 同 qibo 范式 |
| 角色详情 | `pages/character/detail` | 角色详情 | 独立页 | |
| 元素克制 | `pages/element/element` | 元素克制 | 独立页 | 相克矩阵 + 组队元素覆盖 |
| 队伍编成 | `pages/team/team` | 队伍编成 | 独立页 | 本地存储，545 行最大页面 |
| 全局搜索 | `pages/search/search` | 全局搜索 | 独立页 | 覆盖 12 类图鉴 + 跨组去重 + 历史 + 数据驱动建议词 |
| 战斗词条 | `pages/affix/affix` | 战斗词条 | 独立页 | 分类 chips + 手风琴展开 |
| 进化图谱 | `pages/evolution/evolution` | 进化图谱 | 独立页 | 按元素分组的阶段连线 |
| 家园派驻 | `pages/station/station` | 家园派驻 | 独立页 | 按工种分组（每奇波单组） |
| 成就图鉴 | `pages/achievement/achievement` | 成就图鉴 | 独立页 | 统计栏 + 分类 + 行内展开 |
| 设置 | `pages/settings/settings` | 设置 | 独立页 | 主题切换 + 缓存清理 + 关于 |
| 灵子图鉴 | `pages/spirit/list` + `detail` | 灵子图鉴/详情 | 引擎薄页 | `catalog-list/detail` 组件，75 条含图 |
| 物品图鉴 | `pages/item/list` + `detail` | 物品图鉴/详情 | 引擎薄页 | 300 条含图，60/页增量渲染 |
| 装备图鉴 | `pages/equipment/list` + `detail` | 装备图鉴/详情 | 引擎薄页 | 143 条含图 |
| 材料图鉴 | `pages/material/list` + `detail` | 材料图鉴/详情 | 引擎薄页 | 71 条，由物品派生 |
| 美食图鉴 | `pages/food/list` + `detail` | 美食图鉴/详情 | 引擎薄页 | 249 条含图 |
| 钓鱼图鉴 | `pages/fishing/list` + `detail` | 钓鱼图鉴/详情 | 引擎薄页 | 13 条（采得 7 + 手工 6 合并） |
| 敌人图鉴 | `pages/enemy/list` + `detail` | 敌人图鉴/详情 | 引擎薄页 | 11 条示例数据 |
| 副本图鉴 | `pages/dungeon/list` + `detail` | 副本图鉴/详情 | 引擎薄页 | 6 条示例数据 |
| 家园建筑 | `pages/building/list` + `detail` | 家园建筑/详情 | 引擎薄页 | 34 条含图 |
| 地区阵营 | `pages/region/list` + `detail` | 地区阵营/详情 | 引擎薄页 | 7 条示例数据 |
| 教程合集 | `pages/tutorial/list` + `detail` | 教程合集/详情 | 内容引擎 | `content-list/detail` + `data/content.js`，10 篇功能教程 |
| 玩法指南 | `pages/guide/guide` | 玩法指南 | 独立长页 | 4 类（系统/战斗/家园/探索）12 条手风琴 |
| 凶兽生态 | `pages/beast/beast` | 凶兽生态 | 独立页 | 11 条（普通/精英/首领），数据来自 manual-catalogs |
| 剧情读物 | `pages/story/list` + `detail` | 剧情读物/详情 | 内容引擎 | 6 篇，支持 `?category=` 分类筛选 |
| 奇波对决 | `pages/versus/versus` | 奇波对决 | 独立长页 | 3 组清单 + 3 套阵容 + 规则 FAQ |
| 日渡尘影 | `pages/ridu/ridu` | 日渡尘影 | 独立页 | 3 类目录 + 分类跳转剧情列表 |
| 壁纸画廊 | `pages/wallpaper/list` + `detail` | 壁纸画廊/预览 | 独立页 | 8 张渐变+标题字占位，不盗图 |
| 福利码 | `pages/codes/codes` | 福利码 | 独立页 | 空态 + 兑换步骤 + 复制交互 + 防诈提示 |
| 订阅提醒 | `pages/subscribe/subscribe` | 订阅提醒 | 独立页 | 5 个订阅项，本机持久化 |
| 奇波百科 | `pages/wiki/wiki` | 奇波百科 | 独立页 | 搜索 + 8 条 FAQ 手风琴 |
| 关于游戏 | `pages/about/about` | 关于游戏 | 独立页 | 游戏/工具/数据来源/边界/反馈 5 板块 |
| 角色对比 | `pages/compare/compare` | 角色对比 | 工具页 | 双选择位 + 交换 + 元素/定位/稀有度/队伍对照；数值「公测后开放」 |
| 养成计算 | `pages/cultivation/cultivation` | 养成计算 | 工具页 | 4 阶段 + 材料勾选 + 本机持久化 + 进度条 |
| 保底计算 | `pages/pity/pity` | 保底计算 | 工具页 | 垫抽/目标 ± 步进 + 抽数差 + 本地持久化 |
| 星结模拟 | `pages/simulator/simulator` | 星结模拟 | 工具页 | 自定概率本地随机 + 最近 3 次记录 + 非官方提示 |
| 充值返利 | `pages/rebate/rebate` | 充值返利 | 工具页 | 金额输入 + 示例档位对照 + 本地持久化 |
| 地图探索 | `pages/explore/explore` | 地图探索 | 工具页 | region 派生 14 个点位 + 搜索/分类/展开 + 地区跳转 |

### 1.2 占位页面（0）

无。B9+B10 后 53 个路由全部可走通；工具页的数值/点位仍为示例，统一标注「公测后开放」或「待核实」。

## 2. 入口矩阵（主要 UI 入口）

| 目标页面 | 入口 |
| --- | --- |
| 首页 | 启动页；分享默认落地 |
| 各图鉴列表 | 首页「图鉴」宫格卡 |
| 元素克制 / 战斗词条 / 进化图谱 / 家园派驻 / 全局搜索 / 队伍编成 | 首页「信息查询」宫格卡 |
| 成就图鉴 | 首页「图鉴」宫格卡（单页无独立详情） |
| 教程合集 / 玩法指南 / 凶兽生态 / 剧情读物 / 奇波对决 / 日渡尘影 / 壁纸画廊 / 福利码 / 订阅提醒 / 奇波百科 / 关于游戏 | 首页「内容与运营」行（已标「可用」） |
| 各图鉴详情 | 对应列表条目卡；全局搜索结果（achievement/affix 无详情路由，结果仅入列表） |
| 奇波详情 | 进化图谱阶段行、家园派驻工种行、奇波列表、搜索 |
| 课程/剧情详情 | 内容列表卡片；详情页「继续阅读」相关条目（redirectTo） |
| 剧情分类 | 日渡尘影分类卡 → `/pages/story/list?category=` |
| 设置 / 关于 | 首页「内容与运营」行；关于页快捷入口 |
| 角色对比 / 养成计算 / 保底计算 / 星结模拟 / 充值返利 / 地图探索 | 首页「工具」行（均已可用，无「建设中」角标） |
| 地图点位 → 地区 | 地图探索点位展开后的「查看地区阵营」→ `/pages/region/detail?id=` |

## 3. 数据与展示口径

- 图鉴数据：BWIKI SMW 采集 → `src/data/generated/catalogs.json`；`icon` 为 120px 缩略图热链。
- 手工数据：`src/data/manual-catalogs.js`（enemy/dungeon/region/affix/fishing 补充），`verified: false`。
- 内容数据：`src/data/content.js`（教程/剧情/指南/对决/日渡/壁纸/福利码/订阅/百科/关于）；功能教程 `verified: true`，游戏设定类 `verified: false`，统一显示「待核实」。
- 工具数据：`src/data/tools.js`（对比角色引用 `character.js`、地图点位由 `manual-catalogs.js` 的 region 派生；阶段/档位/概率均为示例，`verified: false`）。
- 内容版本：`bundledCatalog`（src/data/catalog.js）+ 云端缓存覆盖（ENV_ID 未配置，暂只有内置）。

## 4. 变更记录

| 日期 | 变更 |
| --- | --- |
| 2026-10-29 | 53 路由注册、占位页；奇波/角色/元素/队伍/搜索可用 |
| 2026-10-30 | P0 图鉴引擎 + 10 类薄页、4 查询页、成就页、设置页（主题切换）；首页轮播立绘 + 功能卡灵子装饰图 + 深色主题全覆盖 |
| 2026-10-31 | B6–B8 内容页落地 14 路由（教程/指南/凶兽/剧情/对决/日渡/壁纸/福利码/订阅/百科/关于）；新增 `content-list/detail` 引擎与 `data/content.js`；已实现 33 → 47，占位 20 → 6 |
| 2026-10-31 | B9+B10 工具/地图 6 路由落地；新增 `tool-shell` 共享组件、`styles/tools.css`、`data/tools.js`；已实现 47 → 53，占位 6 → 0；`PLACEHOLDER_PATHS` 清空 |
| 2026-10-31 | B11 全量走查：53 路由 × 浅/深色渲染通过（390×844），修复 19rpx 字号 2 处、触控热区 <64rpx 若干；新增 `--warn/--reward` 语义 Token 与 `.tap-hover` 通用按压类；搜索页增加建议词与无结果空态操作；修复搜索结果空分组；页面统计维持 53 已实现 / 0 占位 |
| 2026-10-31 | 收尾停用定时任务：无页面/路由变更，页面统计维持 53 已实现 / 0 占位；B1–B11 计划全部关闭 |
