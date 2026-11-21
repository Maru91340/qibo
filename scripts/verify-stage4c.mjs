// 阶段 4（4.7 / 4.8 / 4.9）静态核验：只检查源码锚点、事件三态实算与构建产物。
// 不代表 H5 运行 / 微信开发者工具 / 真机 / 视觉 / 交互 / T01–T12 通过。
// 用法：node scripts/verify-stage4c.mjs
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { buildSync } from 'esbuild';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => (existsSync(join(root, rel))
  ? readFileSync(join(root, rel), 'utf8').replace(/\r\n/g, '\n')
  : '');

const checks = [];
let failed = 0;
function expect(ok, label, detail = '') {
  checks.push({ label, ok: Boolean(ok), detail });
  if (!ok) failed += 1;
}
function templateOf(s) {
  const start = s.indexOf('<template>');
  const end = s.lastIndexOf('</template>');
  return start >= 0 && end > start ? s.slice(start, end).replace(/<!--[\s\S]*?-->/g, '') : '';
}

const HOME = 'src/pages/index/index.vue';
const home = read(HOME);
const tpl = templateOf(home);
// 只检查实际代码与渲染文本：HTML 注释、JS 行注释里对旧术语的描述不算残留（既有注释保留不改）
const codeOnly = home
  .replace(/<!--[\s\S]*?-->/g, '')
  .split('\n')
  .map((line) => line.replace(/\/\/.*$/, ''))
  .join('\n');
const style = home.slice(home.lastIndexOf('<style>'));
const release = read('src/utils/release-event.js');
const theme = read('src/styles/theme.css');
const pagesJson = JSON.parse(read('src/pages.json'));
const routes = new Set([
  ...(pagesJson.pages || []).map((p) => `/${p.path}`),
  ...(pagesJson.subPackages || []).flatMap((s) => (s.pages || []).map((p) => `/${s.root}/${p.path}`))
]);
expect(home.length > 0 && release.length > 0, '首页与事件配置文件可读');

// ---- 4.7 / H09：事件信息收敛，只保留一条当前确认的公测事件 ----
expect(!/class="verinfo/.test(tpl) && !/\.verinfo/.test(home), '4.7 原「版本信息」混排块（模板 + 样式）已整体删除');
expect(!/『版本信息』/.test(home) && !/verinfo__title/.test(home), '4.7 装饰性「『版本信息』」标题已移除');
const staleFacts = ['2026 年起陆续', '全球预计 2026 末', 'PS5 / PC / iOS / Android', '2500 万', '韩服', '首测', '里程碑奖励'];
for (const fact of staleFacts) {
  expect(!tpl.includes(fact), `4.7 首页不再把历史预测/营销数字当最新情报：${fact}`);
}
expect(!/verinfo__tag--head/.test(home) && !/verinfo__tag--info/.test(home), '4.7 不同性质的「头条 / 情报」标签不再并列');
expect(/class="starter"/.test(tpl) && /新手必看/.test(tpl), '4.7 玩法内容归「新手必看」独立区块');
expect(/starter__more[\s\S]{0,100}查看全部/.test(tpl) && /go\('\/pages\/tutorial\/list'\)/.test(tpl), '4.7 新手必看提供「查看全部」且落到已注册教程页');
expect(/v-for="task in starterTasks"/.test(tpl) && /\{\{ task\.title \}\}/.test(tpl) && /\{\{ task\.desc \}\}/.test(tpl), '4.7 每条一行标题 + 必要说明，由数据驱动');
expect(/go\('\/pages\/wiki\/wiki'\)/.test(tpl) && routes.has('/pages/wiki/wiki'), '4.7 数据口径公告条落到匹配内容（奇波百科·数据边界）');
expect((release.match(/^\s*day:/gm) || []).length === 1, '4.7 当前确认的公测事件只有一条内容配置');
expect(/RELEASE_EVENT/.test(release) && /scope: '国服'/.test(release) && /source: 'BWIKI/.test(release), '4.7 事件注明范围与出处');
expect(/\{\{ releaseState\.tag \}\}/.test(tpl) && /公测信息/.test(tpl), '4.7 范围与出处在主视觉文字条渲染');
expect((tpl.match(/class="hero__media"/g) || []).length === 1 && (tpl.match(/class="hero__bar"/g) || []).length === 1, '4.7 首页只有一个公测主视觉焦点');

// 新手必看两条的路径与路由注册（静态实算）
const starterBlock = home.match(/const starterTasks = \[([\s\S]*?)\];/);
const taskPaths = starterBlock ? [...starterBlock[1].matchAll(/path: '([^']+)'/g)].map((m) => m[1]) : [];
const taskTitles = starterBlock ? [...starterBlock[1].matchAll(/title: '([^']+)'/g)].map((m) => m[1]) : [];
expect(taskPaths.length === 2 && taskTitles.length === 2, '4.7 先展示两条玩法任务', JSON.stringify(taskTitles));
for (const path of taskPaths) {
  expect(routes.has(path), `4.7 玩法任务 [${path}] 路由已注册`, path);
}
expect(routes.has('/pages/tutorial/list') && routes.has('/pages/about/about'), '4.7 查看全部 / 公测落地路由已注册');

// ---- 4.8 / H10：移除订阅承诺，事件三态 + 前台重算 ----
expect(/import \{ eventState \} from '@\/utils\/release-event\.js'/.test(home), '4.8 首页引用事件配置模块');
expect(/const nowTs = ref\(Date\.now\(\)\)/.test(home) && /function refreshNow\(\)/.test(home), '4.8 时间源改为响应式，可重新计算');
expect(/const releaseState = computed\(\(\) => eventState\(nowTs\.value\)\)/.test(home), '4.8 三态文案由响应式时间驱动');
expect(/onShow\(refreshNow\)/.test(home) && /uni\.onAppShow\(refreshNow\)/.test(home) && /offAppShow/.test(home), '4.8 进入首页 / 返回 / 应用切回前台均重算，且卸载时解绑');
expect(!/countdownDays/.test(home) && !/Math\.ceil\(\(target - Date\.now\(\)\)/.test(home), '4.8 旧的无响应式倒计时 computed 已移除');
expect(!/距公测 \{\{ countdownDays \}\}/.test(tpl) && /\{\{ releaseState\.desc \}\}/.test(tpl), '4.8 主视觉描述改为三态文案，不再写死倒计时');
expect(!/requestSubscribeMessage/.test(home) && !/订阅提醒/.test(codeOnly), '4.8 首页不承诺订阅能力、不触发真实订阅消息');
expect(!/已订阅成功/.test(home) && !/届时通知/.test(home) && !/提醒我/.test(home), '4.8 首页不出现「已订阅成功 / 届时通知 / 提醒我」文案');
expect(/HOME_LIMITS = \{ subscribe: '仅本机记录' \}/.test(home) && /\{\{ item\.limitNote \}\}/.test(tpl), '4.8 订阅入口标注真实限制，不宣称可通知');

// 三态逻辑按指定时间戳实算（北京时间自然日，不依赖运行界面）
let stats = {};
try {
  const tmpDir = mkdtempSync(join(tmpdir(), 'qbxzs-stage4c-'));
  const requireFromRoot = createRequire(join(root, 'noop.cjs'));
  const out = join(tmpDir, 'release-event.cjs');
  buildSync({ entryPoints: [join(root, 'src/utils/release-event.js')], bundle: true, format: 'cjs', platform: 'node', outfile: out, logLevel: 'silent' });
  const ev = requireFromRoot(out);
  const samples = [
    { label: '公测前一日 12:00', ms: Date.parse('2026-11-25T04:00:00Z'), phase: 'before', days: 1 },
    { label: '公测前一日 23:59', ms: Date.parse('2026-11-25T15:59:00Z'), phase: 'before', days: 1 },
    { label: '公测当天 00:00', ms: Date.parse('2026-11-25T16:00:00Z'), phase: 'today', days: 0 },
    { label: '公测当天 23:59', ms: Date.parse('2026-11-26T15:59:00Z'), phase: 'today', days: 0 },
    { label: '公测次日 00:00', ms: Date.parse('2026-11-26T16:00:00Z'), phase: 'after', days: 0 },
    { label: '公测后一周', ms: Date.parse('2026-12-03T04:00:00Z'), phase: 'after', days: 0 }
  ];
  const phases = [];
  for (const sample of samples) {
    const state = ev.eventState(sample.ms);
    phases.push({ label: sample.label, phase: state.phase, daysBefore: state.daysBefore, desc: state.desc });
    expect(state.phase === sample.phase && state.daysBefore === sample.days, `4.8 [${sample.label}] 三态判定`, `${state.phase}/${state.daysBefore} · ${state.desc}`);
    expect(!/距公测 0 天/.test(state.desc), `4.8 [${sample.label}] 不出现永久「倒计时 0 天」`, state.desc);
  }
  expect(ev.eventState(Date.parse('2026-11-25T04:00:00Z')).desc.includes('距公测 1 天'), '4.8 开始前显示自然日倒计时');
  expect(ev.eventState(Date.parse('2026-11-26T04:00:00Z')).desc.includes('今日正式公测'), '4.8 当天显示「今日正式公测」');
  expect(ev.eventState(Date.parse('2026-11-27T04:00:00Z')).desc.includes('公测已开启'), '4.8 开始后显示「公测已开启」');
  expect(ev.beijingDay(Date.parse('2026-11-25T16:00:00Z')) === '2026-11-26', '4.8 北京时间自然日边界正确');

  // 数据实算：分组覆盖、订阅入口仍在共享数据中但首页视图层改名
  const metaOut = join(tmpDir, 'meta.cjs');
  buildSync({ entryPoints: [join(root, 'src/data/meta.js')], bundle: true, format: 'cjs', platform: 'node', outfile: metaOut, logLevel: 'silent' });
  const sections = requireFromRoot(metaOut).sections || [];
  const groupCounts = {};
  for (const key of ['catalog', 'query', 'content']) {
    groupCounts[key] = sections.filter((item) => (item.group || 'catalog') === key).length;
    expect(groupCounts[key] > 0, `4.9 [${key}] 分组有真实条目`, `${groupCounts[key]} 条`);
  }
  const subscribe = sections.find((item) => item.key === 'subscribe');
  expect(Boolean(subscribe) && routes.has(subscribe.path), '4.8 订阅页仍保留且路由已注册（仅本机记录，不删页面）', subscribe ? subscribe.path : '缺失');
  stats = { phases, taskPaths, taskTitles, groupCounts };
} catch (error) {
  expect(false, '阶段 4c 事件三态与数据实算可执行', error.message);
}

// ---- 4.9 / H11：后台术语替换为玩家任务语言 ----
expect(/GROUP_TITLES = \{ catalog: '更多资料', query: '常用工具', content: '玩法与设置' \}/.test(home), '4.9 分组标题改为玩家任务语言');
for (const term of ['内容与运营', '工具（低优先级）', '信息查询', '个板块', '低优先级']) {
  expect(!codeOnly.includes(term), `4.9 首页不再出现后台术语：${term}`);
}
expect(!/row-cell__tag--ready/.test(home) && !/>可用</.test(tpl), '4.9 无信息量的「可用」标签已删除');
expect(/row-cell__tag--limit/.test(style) && /\{\{ item\.label \}\}/.test(tpl), '4.9 真实限制短句只在确有功能限制时出现');
expect(/HOME_LABELS = \{ subscribe: '订阅偏好' \}/.test(home), '4.9 订阅入口不再以「订阅提醒」命名');
expect(/\.page \{[\s\S]{0,140}padding: 0 24rpx 48rpx/.test(theme), '4.9 theme.css 全局 .page 保持原样（共享样式零改动）');
expect(!/#333/.test(style) && !/#d9841f/.test(style), '4.9 随旧版本信息块删除，首页不再有该处深色硬编码色（5.3 实拍仍待验证）');

// ---- 构建产物锚点（仍属静态检查，不是运行/视觉/交互验证） ----
const DIST = 'dist/build/mp-weixin';
const distWxml = read(`${DIST}/pages/index/index.wxml`);
if (distWxml) {
  // uni-app 把静态字面文本留在 wxml，把 starterTasks / GROUP_TITLES / HOME_LABELS 等数组编译进页面 js，
  // 因此动态文案须在 index.js 中核对（首次核验把两者都当 wxml 文本，属口径误判）。
  const distJs = read(`${DIST}/pages/index/index.js`);
  expect(/新手必看/.test(distWxml) && /class="starter"/.test(distWxml) && /查看全部/.test(distWxml), '[产物] 新手必看区块与查看全部进入 wxml');
  expect(/元素克制怎么查/.test(distJs) && /角色与奇波如何编队/.test(distJs), '[产物] 两条玩法任务数据进入页面 js');
  expect(/更多资料/.test(distJs) && /常用工具/.test(distJs) && /玩法与设置/.test(distJs), '[产物] 玩家任务语言分组进入页面 js');
  expect(/订阅偏好/.test(distJs) && /仅本机记录/.test(distJs), '[产物] 订阅入口真实限制进入页面 js');
  expect(/eventState/.test(distJs) && /onAppShow/.test(distJs), '[产物] 事件三态与前台重算逻辑进入页面 js');
  expect(!/『版本信息』/.test(distWxml) && !/2500 万/.test(distWxml) && !/全球预计/.test(distWxml), '[产物] 历史预测与营销数字不再进入 wxml');
  const distWxss = read(`${DIST}/pages/index/index.wxss`);
  expect(/\.starter/.test(distWxss) && !/\.verinfo/.test(distWxss), '[产物] 新手必看样式进入 wxss，旧版本信息样式已移除');
} else {
  console.log('ℹ 未发现 dist/build/mp-weixin 首页产物，跳过构建产物锚点检查');
}

// ---- 输出 ----
for (const check of checks) console.log(`${check.ok ? '✔' : '✖'} ${check.label}${check.detail ? ` · ${check.detail}` : ''}`);
mkdirSync(join(root, '.tmp'), { recursive: true });
const outFile = join(root, '.tmp', 'stage4c-verify.json');
writeFileSync(outFile, JSON.stringify({
  generatedAt: new Date().toISOString(),
  scope: 'static-code-and-data-only',
  passed: checks.length - failed,
  total: checks.length,
  failed,
  stats,
  checks
}, null, 2));
console.log(`\n阶段 4c 静态核验：${checks.length - failed}/${checks.length} 通过；产物 ${outFile.replaceAll('\\', '/')}`);
console.log('注意：以上仅为静态代码检查与事件三态实算；H5 运行 / 微信开发者工具 / 真机 / 视觉 / 交互 / T01–T12 均「未能验证」。');
if (failed) process.exit(1);
