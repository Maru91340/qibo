# 奇波小助手（qbxzs）

微信小程序：奇波/角色/物品等图鉴、元素克制、队伍编成、教程与剧情内容、壁纸/福利码/订阅等运营页，以及对比/养成/保底/模拟/返利/地图工具。
技术栈：uni-app（Vue 3 + vite）+ TDesign 小程序组件库 + 微信云开发（云函数 + 云数据库）。
当前 54 个路由全部可走通（0 个占位页）；工具页统一复用 `tool-shell` 组件 + `styles/tools.css`，未公开数值统一标注「公测后开放 / 待核实」。正式客户端只提供公开资料读取，不包含云端数据发布入口。

## 目录结构

```
src/                     小程序源码（uni-app）
  pages.json             54 条路由 + 每个页面用到的 t-* 组件注册
  manifest.json          appid、分包、少代码注入等小程序配置
  App.vue                启动时 initCloud() + prefetchCatalog()
  config/cloud.js        共享云资源方 AppID、环境 ID 与公开读取函数名
  services/cloud.js      wx.cloud 封装：未配置/未部署时自动降级为内置资料
  services/content.js    资料读取 + 版本比对 + 本地缓存 + 更新事件
  data/                  内置资料（meta/element/qibo/character/content/tools）+ catalog 聚合
  utils/                 query（筛选/搜索）、team（本地队伍）、format
  components/            catalog-list/detail、content-list/detail、tool-shell（easycom）
  styles/                theme.css 全局主题变量 + content.css / tools.css 共享件
cloudfunctions/          云函数源码（CJS）
  shared/                constants / catalog-core（纯校验）/ cloud（SDK 封装）+ tests
  getCatalog/            公开读：manifest + content
  seedCatalog/           受控写：publish + status（含内置 seed）
scripts/                 check / build-npm / sync-cloudfunctions / deploy-cloudfunctions / export-seed
dist/                    构建产物（已 gitignore）
  build/mp-weixin/       用开发者工具导入这个目录
  cloudfunctions/        云函数上传目录（自包含，无 ../shared）
```

## 命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev:mp-weixin` | 监听构建到 `dist/dev/mp-weixin` |
| `npm run npm:mp` | 把 TDesign 依赖闭包拷进 `dist/dev/mp-weixin/miniprogram_npm`（dev 时手动执行一次） |
| `npm run build:mp-weixin` | 校验 → 构建 → 拷 TDesign → 生成云函数上传目录 → 包体门禁 |
| `npm run check` | 静态校验：路由/组件/版本/内置资料/seed/正式包安全约束 |
| `npm test` | 云函数公共模块与发布事务单元测试（node --test） |
| `npm run test:data` | 数据数量、字段、元素和壁纸完整性断言 |
| `npm run audit:release` | 根工程及两个云函数生产依赖审计；Critical 阻断 |
| `npm run release:check` | 测试、数据断言、H5/小程序构建、包体和依赖审计全门禁 |
| `npm run seed:export` | 由 `src/data` 生成 `cloudfunctions/seedCatalog/seed/bundled.json` |
| `npm run cloud:deploy [all\|read\|seed]` | 用开发者工具 CLI 部署云函数（需开启服务端口） |

## 首次接入云开发（一次性）

1. 在 `src/config/cloud.js` 填写资源方 `CLOUD_RESOURCE_APP_ID` 和共享环境 `CLOUD_ENV_ID`。客户端通过 `new wx.cloud.Cloud({ resourceAppid, resourceEnv })` 访问共享环境；未配置时回退内置资料。
2. 云开发控制台 → 云函数 → `seedCatalog` → 环境变量：
   - `QBXZS_SEED_TOKEN`：至少 32 字节的随机串（必填，否则该函数拒绝一切调用）。
   - 不再支持 OpenID 白名单旁路；正式客户端也不包含发布入口。
3. `npm run build:mp-weixin && npm run cloud:deploy`。
4. 在云开发控制台先调用 `status` 读取当前 `version`，再按 `docs/云端发布与回滚手册.md` 携带 `expectedVersion` 执行发布；首次发布传 `null`。不要把 Token 写进客户端、仓库或截图。
5. 小程序冷启动或回到前台时会自动拉取 manifest，只有修订号变化才下载对应类型。

云函数会自动创建 `catalog_manifests`、`catalog_snapshots`、`catalog_manifest_history` 与 `catalog_publish_audits`。发布、回滚必须经过事务内版本校验；详细操作和应急步骤见 `docs/云端发布与回滚手册.md`。

## 继续开发

- **新增板块页面**：`src/pages/<name>/<name>.vue` + `pages.json` 注册 + `src/data/meta.js` 的 `sections`（首页四宫格与搜索都读它）；数据源沿用 `getCatalog(type)`。
- **新增资料类型**：`cloudfunctions/shared/constants.js` 的 `CATALOG_TYPES` 与 `src/services/content.js` 同步（`npm run check` 会拦住不一致），再补 `catalog-core.js` 的 `NORMALIZERS`。
- **数据采集路径**：采集脚本产出 payload 后，直接调 `seedCatalog` 的 `{ action: 'publish', content: { qibo: payload } }` 单类型增量发布，未涉及的类型的快照指针保持不变。
