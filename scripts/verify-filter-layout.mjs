// 阶段 3.1 L01 筛选布局静态核验：两页的模板锚点、44px 热区、固定高度横滑容器、
// 内容层禁止收缩、底部分组面板、重置/查看结果、已选条件撤销，以及构建产物是否落地。
// 这是静态代码与构建产物检查，不代表 320/375/390/430px 运行视觉或点击交互通过。
// 用法：node scripts/verify-filter-layout.mjs
// 产物：.tmp/filter-layout-verify.json
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PAGES = ['src/pages/character/list.vue', 'src/pages/qibo/list.vue'];
const DIST_WXML = ['dist/build/mp-weixin/pages/character/list.wxml', 'dist/build/mp-weixin/pages/qibo/list.wxml'];
const TMP = join(projectRoot, '.tmp');
if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });

// 每项：[说明, 正则/字符串]。字符串用 includes，正则用 test
function has(text, rule) {
  return typeof rule === 'string' ? text.includes(rule) : rule.test(text);
}

const checks = [
  // 结构：搜索 44px → 一行常用筛选 + 更多 → 结果与排序一行 → 内容
  ['搜索行 44px（.cl-search height: 44px）', /\.cl-search\s*\{[^}]*height:\s*44px/s],
  ['输入框高度 44px', /\.cl-search__field\s*\{[^}]*height:\s*44px/s],
  ['清除按钮 44×44px 热区', /\.cl-search__clear\s*\{[^}]*width:\s*44px;[^}]*height:\s*44px/s],
  ['常用筛选行 44px', /\.cl-filter-quick\s*\{[^}]*height:\s*44px/s],
  ['横滑容器固定 44px 高度', /\.cl-quick-scroll\s*\{[^}]*height:\s*44px/s],
  ['内部横排内容层 nowrap', /\.cl-quick-track\s*\{[^}]*flex-wrap:\s*nowrap/s],
  ['内容层边缘留白（可继续滚动提示）', /\.cl-quick-track\s*\{[^}]*padding-right:\s*32rpx/s],
  ['滚动提示渐隐层', '.cl-quick-fade'],
  ['chip 热区 44px 且禁止收缩', /\.cl-chip-hit\s*\{[^}]*flex:\s*0\s+0\s+auto;[^}]*height:\s*44px/s],
  ['可见 chip 36px（热区与可见高度分离）', /\.cl-chip\s*\{[^}]*height:\s*36px/s],
  ['更多筛选入口 44px', /\.cl-more-btn\s*\{[^}]*height:\s*44px/s],
  ['结果与排序同一行', /\.cl-result-row\s*\{[^}]*display:\s*flex/s],
  ['排序 chip 36px 可触', /\.cl-sort-chip\s*\{[^}]*min-height:\s*36px/s],
  ['底部分组面板带分组与选项', 'v-for="group in sheetGroups"'],
  ['面板「重置」', '@tap="resetAllFilters"'],
  ['面板「查看 N 个结果」', '查看 {{ list.length }} 个结果'],
  ['面板选项 44px 热区', /\.cl-sheet-chip\s*\{[^}]*min-height:\s*44px/s],
  ['面板遮罩与阻止冒泡', '@tap.stop'],
  ['已选条件可见', 'v-if="activeChips.length"'],
  ['已选条件可逐项撤销', '@tap="clearChip(chip)"'],
  ['页面局部样式，不依赖 theme.css 改写', '3.1 L01'],
  // script 锚点
  ['面板开关状态', 'const sheetOpen = ref(false)'],
  ['常用筛选选项', 'const quickOptions = computed('],
  ['分组条件', 'const sheetGroups = computed('],
  ['已选条件集合', 'const activeChips = computed('],
  ['统一设置入口', 'function setSheetOption('],
  ['撤销入口', 'function clearChip('],
  ['重置入口', 'function resetAllFilters(']
];

const result = { checkedAt: new Date().toISOString(), pages: {}, dist: {}, allPassed: true };
for (const page of PAGES) {
  const text = readFileSync(join(projectRoot, page), 'utf8');
  const failed = checks.filter(([, rule]) => !has(text, rule)).map(([label]) => label);
  result.pages[page] = { checked: checks.length, passed: checks.length - failed.length, failed };
  if (failed.length) result.allPassed = false;
}
for (const file of DIST_WXML) {
  const absolute = join(projectRoot, file);
  const exists = existsSync(absolute);
  const text = exists ? readFileSync(absolute, 'utf8') : '';
  const anchors = ['cl-search', 'cl-quick-scroll', 'cl-more-btn', 'cl-result-row', 'cl-sheet-mask', 'cl-active-row'];
  result.dist[file] = { exists, anchors: Object.fromEntries(anchors.map((a) => [a, text.includes(a)])) };
  if (!exists || anchors.some((a) => !text.includes(a))) result.allPassed = false;
}

writeFileSync(join(TMP, 'filter-layout-verify.json'), JSON.stringify(result, null, 2), 'utf8');
for (const [page, info] of Object.entries(result.pages)) {
  console.log(`${relative(projectRoot, page)}：${info.passed}/${info.checked} 项通过${info.failed.length ? `，缺失：${info.failed.join('、')}` : ''}`);
}
for (const [file, info] of Object.entries(result.dist)) {
  console.log(`${relative(projectRoot, file)}：产物存在=${info.exists}，锚点 ${Object.values(info.anchors).filter(Boolean).length}/${Object.keys(info.anchors).length}`);
}
console.log(result.allPassed ? '3.1 静态核验全部通过（运行视觉/交互仍需实测）' : '3.1 静态核验存在缺失');
if (!result.allPassed) process.exitCode = 1;
