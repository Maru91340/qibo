# UI 样式与交互规范（蓝色星原手册）

> 2026-10-30 首页改版与主题体系落地后沉淀。改任何页面前先读本文档，保持全局观感一致；与本文冲突的旧样式以本文为准。模式参考 `D:\test\wxq-uniapp\docs\UI_STYLE_GUIDE.md`，Token 值以本项目 `src/styles/theme.css` 为唯一来源。

## 设计 Token

- 唯一来源：`src/styles/theme.css` 的 CSS 自定义属性（`page` 选择器浅色值 + `.theme-dark` 深色覆盖）。页面局部样式必须引用 `var(--…)`，发现硬编码近似色时收敛到 Token，不新增第四个近似值。
- 覆盖类别：
  - Color：`--brand #2f6bff`、`--brand-deep #1f3d9e`、`--brand-soft #eaf0ff`、`--ink`（标题）/`--ink-2`（正文）/`--ink-3`（弱化）三级文字、`--bg #f3f5fb` 页面底、`--card-bg` 卡片底、`--soft` 输入/筛選底、`--line` 边框。
  - Radius：卡片 24rpx（`--radius-lg`）、小件 16rpx（`--radius-md`）、chips/按钮胶囊 999rpx。
  - Shadow：卡片 `0 8rpx 32rpx rgba(31,61,158,.08)`，深色主题换纯黑投影；轮播用 `0 16rpx 40rpx rgba(31,61,158,.22)`。
  - State：可点卡片按压 `scale(.96–.985)` + `transition: transform .16s ease`，用 `hover-class` 实现。
- 深色主题：根节点 `:class="{ 'theme-dark': isDark }"`（`useTheme()`，`src/utils/theme.js`），新页面/新组件必须绑定；深色下不要硬编码白底/黑字，一律走变量。

## 设计基调

- 浅蓝灰页面底 + 白色圆角卡片 + 主题渐变点缀；首页轮播用深色渐变（night/dawn/amber）+ 灵子立绘氛围层。
- 可点卡片统一：顶部 6rpx accent 渐变条（`linear-gradient(90deg, 透明 → accent → 半透明)`）+ 右下角装饰图（120px BWIKI 缩略图，`mask-image` 向左渐隐）+ 白色/深色渐变盖层保证文字可读。
- 立绘/装饰图层 `z-index: 0`，盖层 `z-index: 1`，内容 `z-index: 2`，accent 条 `z-index: 3`；装饰图必须 `pointer-events: none`。

## 首页结构

1. **轮播导航**：`src/data/meta.js` 的 `banners`，3 张、5s 自动切换、循环、滑动指示点。每张可点击跳转，含 tag/标题/副文案/CTA；立绘从灵子图鉴 `icon` 字段按 `hashIndex(item.id)` 稳定分配，重采自动更新。
2. 搜索框（t-search）→ 全局搜索；通知条（t-notice-bar）。
3. **分组宫格**：图鉴 13 + 信息查询 6 为 `card` 模式（大卡 + 灵子装饰图）；内容与运营 12 + 工具 6 为 `row` 模式（紧凑胶囊行 + 「建设中」角标）。分组顺序 = 优先级顺序（P0 → P1 → P2）。

## 通用范式（图鉴引擎）

- 列表页 = `catalog-list` 组件（搜索 + 折叠 facet 行 + 条目卡）；详情页 = `catalog-detail` 组件。新图鉴只写薄页面传 props（type/accent/facets/badge/detailPath），不复制模板。
- facet 折叠行：label + 当前值（「不限」）+ 旋转箭头；选项超过 1 个才渲染该行；选中 chip 蓝底白字。
- 条目卡：76rpx 图标（图片加载失败 `@error` 回退文字徽章）+ 标题 + 待核实/稀有度 mini-tag + 摘要 + 标签 chips + 箭头。
- 「未分类」条目不得外露：徽章降级取首个标签或稀有度，摘要剥除「未分类 ·」前缀。
- 图片一律 BWIKI 120px 缩略图热链（`patchwiki.biligame.com`），不落主包；必须有文字徽章回退。

## 字号与触控下限

- 正文/标签最小 `20rpx`；chips/按钮最小 `64rpx` 高（触控热区不足时用 padding 补足）；列表标题 ≥26rpx。
- 单页渲染超过 150 条的长列表需加分页或 `visibleCount` 增量渲染（当前物品 300 条待处理，见优化计划 B2）。

## 筛选反馈与空态

- 结果行必须写「共 X 条」（筛选后可见命中数变化），并保留「合计 Y 条」参照。
- 空态三件套：图标 + 原因文案 + 主操作按钮（筛选无结果 → 「清空筛选」；数据为空 → 提示等待采集）。
- 错误态与空态不并列出现。

## 文案规范

- 入口卡片说「玩家能得到什么」，口语化、可带行动激励；数据边界、免责、来源说明放页脚脚注。
- 诚实底线：`verified: false` 条目必须显示「待核实」角标；采集来源与日期写入 notice 字段展示在页脚。

## 主题与导航

- 主题偏好 `light/dark/auto` 存 `qbxzs:theme`，设置页提供切换；`auto` 跟随 `uni.onThemeChange`。
- 导航栏保持品牌深蓝（浅色/深色一致），内容区随主题切换。

## 素材与版权

- 图鉴图片来自 BWIKI 热链，页脚注明来源；未获授权前不得抓取官网/社区图片作营销素材。
- 公测后数据与图片整体重刷，条目保留 `verified` 与抓取日期。
