// P6 S1-4/S1-5 冒烟测试：miniprogram-automator 连接开发者工具自动化端口，
// 遍历核心页面截图并做本轮修改回归断言。用法：node scripts/automator-smoke.mjs
import automator from 'miniprogram-automator';
import { mkdirSync } from 'node:fs';

const OUT = 'D:/qibo/ap-benchmark/own-app-screenshots/round1';
mkdirSync(OUT, { recursive: true });

const PAGES = [
  ['index', '/pages/index/index'],
  ['qibo-list', '/pages/qibo/list'],
  ['character-list', '/pages/character/list'],
  ['element', '/pages/element/element'],
  ['team', '/pages/team/team'],
  ['search', '/pages/search/search'],
  ['compare', '/pages/compare/compare'],
  ['cultivation', '/pages/cultivation/cultivation'],
  ['pity', '/pages/pity/pity'],
  ['simulator', '/pages/simulator/simulator'],
  ['codes', '/pages/codes/codes'],
  ['settings', '/pages/settings/settings'],
  ['explore-subpkg', '/pages-explore/explore/explore']
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const mini = await automator.connect({ wsEndpoint: 'ws://localhost:9420' });
  const results = [];
  let fails = 0;

  for (const [name, route] of PAGES) {
    try {
      const page = await mini.reLaunch(route);
      await sleep(1600);
      await mini.screenshot({ path: `${OUT}/s1-${name}.png` });
      const current = (await mini.currentPage()).path;
      const ok = current && route.startsWith('/' + current);
      if (!ok) throw new Error(`落地页不匹配：${current}`);
      results.push(`✔ ${name} → ${current}`);
    } catch (error) {
      fails += 1;
      results.push(`✖ ${name}: ${String(error.message).slice(0, 140)}`);
    }
  }

  // S1-5 本轮修改回归
  try {
    const index = await mini.reLaunch('/pages/index/index');
    await sleep(1500);
    const countdown = await index.$('.countdown__text');
    const cdText = countdown ? await countdown.text() : '';
    if (!/倒计时\s*\d+\s*天/.test(cdText)) throw new Error(`倒计时文案异常：${cdText}`);
    if (!/11\.26/.test(cdText)) throw new Error(`倒计时缺定档日期：${cdText}`);
    results.push(`✔ 回归·首页倒计时：${cdText.trim().slice(0, 40)}`);

    const quickCell = await index.$$('.quick-cell');
    if (quickCell.length !== 12) throw new Error(`首页快捷宫格格数异常：${quickCell.length}（应 12）`);
    results.push(`✔ 回归·首页快捷宫格：12 格`);

    const codes = await mini.reLaunch('/pages/codes/codes');
    await sleep(1400);
    const codeValues = await codes.$$('.code-value');
    if (codeValues.length < 5) throw new Error(`福利码条目异常：${codeValues.length}（应 ≥5）`);
    results.push(`✔ 回归·福利码页：${codeValues.length} 条兑换码`);

    const pity = await mini.reLaunch('/pages/pity/pity');
    await sleep(1400);
    const ruleText = await pity.$('.pity-rules');
    const rt = ruleText ? await ruleText.text() : '';
    if (!/5星涂山小玉/.test(rt)) throw new Error('保底规则文案未含 5星涂山小玉（P0-3 回归失败）');
    results.push(`✔ 回归·保底规则文案：5星涂山小玉 ✓`);

    const element = await mini.reLaunch('/pages/element/element');
    await sleep(1400);
    const roleLines = await element.$$('.role-line');
    if (roleLines.length !== 5) throw new Error(`战斗职业行数异常：${roleLines.length}（应 5）`);
    results.push(`✔ 回归·战斗职业 5 类：✓`);

    const explore = await mini.reLaunch('/pages-explore/explore/explore');
    await sleep(2000);
    const firstPoint = await explore.$('.tool-point');
    if (!firstPoint) throw new Error('地图点位列表为空');
    results.push(`✔ 回归·地图点位列表渲染：✓`);
  } catch (error) {
    fails += 1;
    results.push(`✖ 回归: ${String(error.message).slice(0, 160)}`);
  }

  console.log(results.join('\n'));
  console.log(fails ? `\nS1 冒烟：${fails} 项失败` : '\nS1 冒烟：全部通过');
  await mini.disconnect();
  process.exitCode = fails ? 1 : 0;
}

main().catch((error) => {
  console.error('冒烟脚本异常：', error.message);
  process.exit(1);
});
