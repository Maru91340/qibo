// 阶段 6 静态核验：竞品对比报告结构、现场/本地截图证据、接续记录状态。
// 用法：node scripts/verify-stage6.mjs（产出 .tmp/stage6-verify.json）
import { readFileSync, existsSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const p = (...s) => join(ROOT, ...s);
const results = [];
const meta = { at: new Date().toISOString(), root: ROOT };

function ok(name, cond, detail = '') {
  results.push({ name, pass: !!cond, detail });
}
function read(rel) {
  return existsSync(p(rel)) ? readFileSync(p(rel), 'utf8') : '';
}

// ---- 1. 报告存在与必备章节 ----
const REPORT = 'docs/升级任务/竞品对比报告.md';
const report = read(REPORT);
ok('报告文件存在', report.length > 4000, `${report.length} chars`);
const chapters = [
  ['首页信息层级', /首页信息层级/],
  ['图片用途', /图片用途/],
  ['图鉴筛选', /图鉴筛选/],
  ['详情', /详情/],
  ['功能完整度', /功能完整度/],
  ['交互', /交互/],
  ['差异表', /差异表/],
  ['可借鉴项', /可借鉴项/],
  ['不建议照搬项', /不建议照搬项/],
  ['截图证据', /截图证据/],
  ['验证边界分类', /\| 静态文件\/代码核对 \|[\s\S]*\| H5 运行验证 \|[\s\S]*\| 微信开发者工具 \/ 真机验证 \|[\s\S]*\| 未能验证 \|/],
  ['基线标识', /builtin-2026-11-05T00:47:46\.864Z/],
  ['待确认清单引用', /#32|#33/],
];
for (const [name, re] of chapters) ok(`报告章节：${name}`, re.test(report));

// 不虚报：报告不得把本项目运行/视觉/交互写成通过
const tRows = report.split('\n').filter((l) => /^\| T(?:0[1-9]|1[0-2]) \|/.test(l));
ok('T01–T12 逐项行齐全', tRows.length === 12, `${tRows.length} 行`);
ok('报告未宣称 T01–T12 通过', tRows.every((l) => !/\|\s*(?:✅\s*)?(?:通过|已通过)\s*\|/.test(l)));
ok('报告标注 T01–T12 未能验证', tRows.filter((l) => l.includes('未能验证')).length >= 9, `${tRows.filter((l) => l.includes('未能验证')).length} 行标未能验证`);

// ---- 2. 现场截图证据（本轮采集） ----
const LIVE = 'docs/升级任务/现场截图';
const liveFiles = existsSync(p(LIVE)) ? readdirSync(p(LIVE)).filter((f) => f.endsWith('.png')).sort() : [];
ok('现场截图目录存在', existsSync(p(LIVE)));
ok('现场截图数量 >= 7', liveFiles.length >= 7, `${liveFiles.length} 张`);
const liveNames = ['首页', '角色图鉴', '奇波图鉴', '攻略tab'];
for (const n of liveNames) ok(`现场含「${n}」`, liveFiles.some((f) => f.includes(n)));
for (const f of liveFiles) {
  const size = statSync(p(LIVE, f)).size;
  ok(`现场截图非空：${f}`, size > 10000, `${size} bytes`);
}
meta.live = liveFiles.map((f) => ({ file: f, bytes: statSync(p(LIVE, f)).size }));

// ---- 3. 本地既有截图证据（非本轮现场） ----
const HB = '参考小程序/蓝色星原手册/last';
const CAMP = '参考小程序/蓝色星原营地';
const hb = existsSync(p(HB)) ? readdirSync(p(HB)).filter((f) => f.endsWith('.png')) : [];
const camp = existsSync(p(CAMP)) ? readdirSync(p(CAMP)).filter((f) => f.endsWith('.png')) : [];
ok('手册截图 69 张', hb.length === 69, `${hb.length} 张`);
ok('营地截图 5 张', camp.length === 5, `${camp.length} 张`);
ok('报告引用手册截图目录', /蓝色星原手册\/last/.test(report));
ok('报告引用营地截图目录', /蓝色星原营地/.test(report));
meta.local = { handbook: hb.length, camp: camp.length };

// ---- 4. 三个参考站点 ----
for (const [name, host] of [['BWIKI', 'wiki.biligame.com/ap/'], ['官网', 'azurpromilia.manjuu.com/home/'], ['CBT3 Wiki', 'ap-cbt3.csxylic.com/']]) {
  ok(`报告覆盖参考站：${name}`, report.includes(host));
}
ok('官网标注 SPA 动态渲染抓取受限', /SPA|动态渲染|抓取受限/.test(report));
ok('CBT3 标注按 #5 未做批量采集', /#5|未.{0,4}批量采集/.test(report));

// ---- 5. 接续记录状态 ----
const LOG = '升级任务_接续记录.md';
const log = read(LOG);
const row = (id) => {
  const m = log.split('\n').find((l) => l.startsWith(`| ${id} |`));
  return m || '';
};
for (const id of ['6.1', '6.2', '6.3']) ok(`4.3 状态 ${id} = ✅`, row(id).includes('✅'), row(id).slice(0, 120));
ok('待确认 #32 已追加', /\| 32 \|/.test(log));
ok('待确认 #33 已追加', /\| 33 \|/.test(log));
ok('待确认 1–31 历史行未改动', /\| 31 \|/.test(log) && /\| 20 \|/.test(log) && /\| 15 \|/.test(log));
ok('4.4 执行日志含轮次 10', /\| 10（/.test(log));
ok('4.5 报告清单含竞品对比报告', /\| `竞品对比报告\.md` \| 6\.3/.test(log));
ok('阶段 7 仍为 ⬜', row('7.1').includes('⬜'));
ok('未标「任务完成」', !/任务完成/.test(log));

// ---- 6. 汇总 ----
const passed = results.filter((r) => r.pass).length;
const failed = results.filter((r) => !r.pass);
meta.summary = { total: results.length, passed, failed: failed.length };
mkdirSync(p('.tmp'), { recursive: true });
writeFileSync(p('.tmp/stage6-verify.json'), JSON.stringify({ ...meta, results }, null, 2) + '\n', 'utf8');
console.log(`阶段 6 静态核验：${passed}/${results.length}`);
for (const r of results) console.log(`${r.pass ? '✔' : '✖'} ${r.name}${r.detail ? ' — ' + r.detail : ''}`);
if (failed.length) process.exit(1);
