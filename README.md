# 蓝色星原助手（qbxzs）

微信小程序：奇波图鉴 / 角色图鉴 / 元素克制 / 队伍编成。
技术栈：uni-app（Vue 3 + vite）+ TDesign 小程序组件库 + 微信云开发（云函数 + 云数据库）。

## 目录结构

```
src/                     小程序源码（uni-app）
  pages.json             8 条路由 + 每个页面用到的 t-* 组件注册
  manifest.json          appid、分包、少代码注入等小程序配置
  App.vue                启动时 initCloud() + prefetchCatalog()
  config/cloud.js        CLOUD_ENV_ID（待填）与云函数名
  services/cloud.js      wx.cloud 封装：未配置/未部署时自动降级为内置资料
  services/content.js    资料读取 + 版本比对 + 本地缓存 + 更新事件
  data/                  内置资料（meta/element/qibo/character）+ catalog 聚合
  utils/                 query（筛选/搜索）、team（本地队伍）、format
  styles/theme.css       全局主题变量与公共样式
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
| `npm run build:mp-weixin` | 校验 → 构建 → 拷 TDesign → 生成云函数上传目录 |
| `npm run check` | 静态校验：路由/组件注册/模板事件/内置资料 schema/seed 一致性 |
| `npm test` | 云函数公共模块单元测试（node --test） |
| `npm run seed:export` | 由 `src/data` 生成 `cloudfunctions/seedCatalog/seed/bundled.json` |
| `npm run cloud:deploy [all\|read\|seed]` | 用开发者工具 CLI 部署云函数（需开启服务端口） |

## 首次接入云开发（一次性）

1. 在 `src/config/cloud.js` 填写 `CLOUD_ENV_ID`（云开发环境 ID）。不填也能跑，只是永远使用内置资料。
2. 云开发控制台 → 云函数 → `seedCatalog` → 环境变量：
   - `QBXZS_SEED_TOKEN`：自定义长随机串（必填，否则该函数拒绝一切调用）
   - `QBXZS_SEED_OPENIDS`：可选，逗号分隔的白名单 openid
3. `npm run build:mp-weixin && npm run cloud:deploy`
4. 发布内置资料（二选一）：
   - 开发者工具控制台：`wx.cloud.callFunction({ name: 'seedCatalog', data: { action: 'publish', source: 'bundled', token: '<QBXZS_SEED_TOKEN>' } })`
   - 云开发控制台「云端测试」：事件填 `{"action":"publish","source":"bundled","token":"<同上>"}`
5. 小程序冷启动或回到前台时会自动拉取 manifest，只有修订号变化才下载对应类型。

云函数会自动创建 `catalog_manifests` 与 `catalog_snapshots` 两个集合。

## 继续开发

- **新增板块页面**：`src/pages/<name>/<name>.vue` + `pages.json` 注册 + `src/data/meta.js` 的 `sections`（首页四宫格与搜索都读它）；数据源沿用 `getCatalog(type)`。
- **新增资料类型**：`cloudfunctions/shared/constants.js` 的 `CATALOG_TYPES` 与 `src/services/content.js` 同步（`npm run check` 会拦住不一致），再补 `catalog-core.js` 的 `NORMALIZERS`。
- **数据采集路径**：采集脚本产出 payload 后，直接调 `seedCatalog` 的 `{ action: 'publish', content: { qibo: payload } }` 单类型增量发布，未涉及的类型的快照指针保持不变。
