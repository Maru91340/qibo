# UI/UX 参考文档 — 页面明细、入口矩阵（蓝色星原手册）

> 2026-10-30 生成，对应 `src/pages.json` 全部 53 个页面（33 已实现 / 20 占位）。日常改版查本文档定位页面；改样式前先读 [UI_STYLE_GUIDE.md](UI_STYLE_GUIDE.md)；推进优化批次见 [UI_OPTIMIZATION_PLAN.md](UI_OPTIMIZATION_PLAN.md)。

## 1. 页面地图

### 1.1 已实现页面（33）

| 分组 | 页面路径 | 页面标题 | 实现方式 | 备注 |
| --- | --- | --- | --- | --- |
| 首页 | `pages/index/index` | 蓝色星原 | 独立页 | 轮播（灵子立绘背景）+ 搜索 + 分组宫格（card/row 双模式） |
| 奇波图鉴 | `pages/qibo/list` | 奇波图鉴 | 独立页 | 元素 pill + 多行筛选 + 出战计数 |
| 奇波详情 | `pages/qibo/detail` | 奇波详情 | 独立页 | 进化链 stages + 设为出战 |
| 角色图鉴 | `pages/character/list` | 角色图鉴 | 独立页 | 同 qibo 范式 |
| 角色详情 | `pages/character/detail` | 角色详情 | 独立页 | |
| 元素克制 | `pages/element/element` | 元素克制 | 独立页 | 相克矩阵 + 组队元素覆盖 |
| 队伍编成 | `pages/team/team` | 队伍编成 | 独立页 | 本地存储，545 行最大页面 |
| 全局搜索 | `pages/search/search` | 全局搜索 | 独立页 | 覆盖 12 类图鉴 + 跨组去重 + 历史 |
| 战斗词条 | `pages/affix/affix` | 战斗词条 | 独立页 | 分类 chips + 手风琴展开 |
| 进化图谱 | `pages/evolution/evolution` | 进化图谱 | 独立页 | 按元素分组的阶段连线 |
| 家园派驻 | `pages/station/station` | 家园派驻 | 独立页 | 按工种分组（每奇波单组） |
| 成就图鉴 | `pages/achievement/achievement` | 成就图鉴 | 独立页 | 统计栏 + 分类 + 行内展开 |
| 设置 | `pages/settings/settings` | 设置 | 独立页 | 主题切换 + 缓存清理 + 关于 |
| 灵子图鉴 | `pages/spirit/list` + `detail` | 灵子图鉴/详情 | 引擎薄页 | `catalog-list/detail` 组件，75 条含图 |
| 物品图鉴 | `pages/item/list` + `detail` | 物品图鉴/详情 | 引擎薄页 | 300 条含图（长列表待分页） |
| 装备图鉴 | `pages/equipment/list` + `detail` | 装备图鉴/详情 | 引擎薄页 | 143 条含图 |
| 材料图鉴 | `pages/material/list` + `detail` | 材料图鉴/详情 | 引擎薄页 | 71 条，由物品派生 |
| 美食图鉴 | `pages/food/list` + `detail` | 美食图鉴/详情 | 引擎薄页 | 249 条含图 |
| 钓鱼图鉴 | `pages/fishing/list` + `detail` | 钓鱼图鉴/详情 | 引擎薄页 | 13 条（采得 7 + 手工 6 合并） |
| 敌人图鉴 | `pages/enemy/list` + `detail` | 敌人图鉴/详情 | 引擎薄页 | 11 条示例数据 |
| 副本图鉴 | `pages/dungeon/list` + `detail` | 副本图鉴/详情 | 引擎薄页 | 6 条示例数据 |
| 家园建筑 | `pages/building/list` + `detail` | 家园建筑/详情 | 引擎薄页 | 34 条含图 |
| 地区阵营 | `pages/region/list` + `detail` | 地区阵营/详情 | 引擎薄页 | 7 条示例数据 |

### 1.2 占位页面（20，均显示「XX · 建设中」）

| 分组 | 页面路径 | 优先级 | 备注 |
| --- | --- | --- | --- |
| 凶兽生态 | `pages/beast/beast` | P1 | 图文条目长页 |
| 教程合集 | `pages/tutorial/list` + `detail` | P1 | 列表 → 详情 `?id=` |
| 玩法指南 | `pages/guide/guide` | P1 | 四大类分步图文 |
| 剧情读物 | `pages/story/list` + `detail` | P1 | 列表 → 详情 `?id=` |
| 奇波对决 | `pages/versus/versus` | P1 | 规则速记 + 阵容 |
| 日渡尘影 | `pages/ridu/ridu` | P1 | 剧情分类目录 |
| 壁纸画廊 | `pages/wallpaper/list` + `detail` | P1 | 列表 → 大图预览 |
| 福利码 | `pages/codes/codes` | P1 | 兑换码列表 |
| 订阅提醒 | `pages/subscribe/subscribe` | P1 | 订阅项管理 |
| 奇波百科 | `pages/wiki/wiki` | P1 | 百科说明 |
| 关于游戏 | `pages/about/about` | P1 | 游戏/制作组信息 |
| 角色对比 | `pages/compare/compare` | P2 | 双列对比工具 |
| 养成计算 | `pages/cultivation/cultivation` | P2 | 清单工具 |
| 保底计算 | `pages/pity/pity` | P2 | 垫抽数计算器 |
| 星结模拟 | `pages/simulator/simulator` | P2 | 概率模拟器 |
| 充值返利 | `pages/rebate/rebate` | P2 | 累计充值计算器 |
| 地图探索 | `pages/explore/explore` | P2 | 点位清单先行 |

## 2. 入口矩阵（主要 UI 入口）

| 目标页面 | 入口 |
| --- | --- |
| 首页 | 启动页；分享默认落地 |
| 各图鉴列表 | 首页「图鉴」宫格卡 |
| 元素克制 / 战斗词条 / 进化图谱 / 家园派驻 / 全局搜索 / 队伍编成 | 首页「信息查询」宫格卡 |
| 成就图鉴 | 首页「图鉴」宫格卡（单页无独立详情） |
| 各图鉴详情 | 对应列表条目卡；全局搜索结果（achievement/affix 无详情路由，结果仅入列表） |
| 奇波详情 | 进化图谱阶段行、家园派驻工种行、奇波列表、搜索 |
| 设置 | 首页「内容与运营」行（建设中角标，页面实际可用） |
| P1/P2 占位页 | 首页「内容与运营」「工具」行 |

## 3. 数据与展示口径

- 图鉴数据：BWIKI SMW 采集（每 30 分钟定时任务）→ `src/data/generated/catalogs.json`；`icon` 为 120px 缩略图热链。
- 手工数据：`src/data/manual-catalogs.js`（enemy/dungeon/region/affix/fishing 补充），`verified: false`。
- 内容版本：`bundledCatalog`（src/data/catalog.js）+ 云端缓存覆盖（ENV_ID 未配置，暂只有内置）。

## 4. 变更记录

| 日期 | 变更 |
| --- | --- |
| 2026-10-29 | 53 路由注册、占位页；奇波/角色/元素/队伍/搜索可用 |
| 2026-10-30 | P0 图鉴引擎 + 10 类薄页、4 查询页、成就页、设置页（主题切换）；首页轮播立绘 + 功能卡灵子装饰图 + 深色主题全覆盖 |
