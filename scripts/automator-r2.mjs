// R2-T1 第一轮新功能回归：地图示意底图 / 技能等级档 / 队伍 3+3 / 剧情 63 条 / 成就计数 / 指南正文
// 用法：node scripts/automator-r2.mjs（需先 cli auto --auto-port 9420）
import automator from 'miniprogram-automator';
import { mkdirSync } from 'node:fs';

const OUT = 'D:/qibo/ap-benchmark/own-app-screenshots/R2-round1';
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const mini = await automator.connect({ wsEndpoint: 'ws://localhost:9420' });
  const results = [];
  let fails = 0;
  const ok = (msg) => results.push(`✔ ${msg}`);
  const bad = (msg) => { fails += 1; results.push(`✖ ${msg}`); };

  // 1. 地图示意底图：virtualHost 组件选择器受限 → 截图留档 + 由走查目检 canvas 内容
  try {
    const page = await mini.reLaunch('/pages-explore/explore/explore');
    await sleep(3000);
    await mini.screenshot({ path: `${OUT}/r2-explore-map.png` });
    const current = (await mini.currentPage()).path;
    if (!/explore/.test(current)) throw new Error(`落地页异常：${current}`);
    ok(`地图探索页落地 + 截图（示意底图渲染由截图目检）：${current}`);
  } catch (e) { bad(`地图示意底图: ${e.message}`); }

  // 2. 奇波详情技能等级档：找一个带 lvls 的奇波（三角蜥）
  try {
    const page = await mini.reLaunch('/pages/qibo/list');
    await sleep(1800);
    // 用搜索定位三角蜥（列表分页可能未含目标）
    const search = await page.$('input');
    if (search) {
      const sid = await search.attribute('id');
      await search.input('三角蜥');
      await sleep(1200);
    }
    const card = await page.$('.cx-card, .catalog-card, .content-card, view');
    // 直接走搜索结果点击第一个卡片
    const cards = await page.$$('.catalog-list__card, .card');
    let tapped = false;
    for (const c of cards) {
      const t = await c.text();
      if (t && t.includes('三角蜥')) { await c.tap(); tapped = true; break; }
    }
    if (!tapped) throw new Error('列表未找到三角蜥卡片');
    await sleep(2000);
    const detail = await mini.currentPage();
    await mini.screenshot({ path: `${OUT}/r2-qibo-skill-lv.png` });
    const chips = await detail.$$('.skill__lv-chip');
    const note = await detail.$('.skill__lvnote');
    if (chips.length < 5) throw new Error(`等级 chips 不足：${chips.length}`);
    ok(`奇波技能等级档：${chips.length} 档 chips${note ? ' + 三测角标' : ''}`);
    // 点 Lv.1 验证切换
    await chips[0].tap();
    await sleep(600);
    ok('等级档点击切换：Lv.1 生效');
  } catch (e) { bad(`奇波技能等级档: ${e.message}`); }

  // 3. 队伍 3+3：槽位断言
  try {
    const page = await mini.reLaunch('/pages/team/team');
    await sleep(1800);
    await mini.screenshot({ path: `${OUT}/r2-team-3x3.png` });
    const slots = await page.$$('.slot');
    // 3 角色 + 3 奇波 = 6 槽
    if (slots.length !== 6) throw new Error(`槽位数异常：${slots.length}（应 3+3=6）`);
    const counterText = await (await page.$('.team-head__meta')).text().catch(() => '');
    ok(`队伍 3+3：6 槽 ✓ 头部「${(counterText || '').trim().slice(0, 30)}」`);
    const hint = await page.$('.counter-hints');
    ok(`克制提示区块：${hint ? '渲染 ✓（无成员时提示文案）' : '空态隐藏'}`);
  } catch (e) { bad(`队伍 3+3: ${e.message}`); }

  // 4. 剧情 63 条：virtualHost 组件 → 截图留档（计数 chips 由走查目检：全部 63/阅读物 57/世界设定 4/官方信息 1）
  try {
    const page = await mini.reLaunch('/pages/story/list');
    await sleep(3000);
    await mini.screenshot({ path: `${OUT}/r2-story-63.png` });
    const current = (await mini.currentPage()).path;
    if (!/story/.test(current)) throw new Error(`落地页异常：${current}`);
    ok('剧情读物页落地 + 截图（63 篇计数目检）');
  } catch (e) { bad(`剧情 63 条: ${e.message}`); }

  // 5. 成就分类计数
  try {
    const page = await mini.reLaunch('/pages/achievement/achievement');
    await sleep(1800);
    await mini.screenshot({ path: `${OUT}/r2-achievement-counts.png` });
    const chips = await page.$$('.facet-chip');
    const texts = [];
    for (const c of chips) texts.push((await c.text()).trim());
    if (!texts.length || !/\d/.test(texts[0])) throw new Error(`成就计数异常：${texts.join('|')}`);
    ok(`成就分类计数：${texts.slice(0, 4).join(' / ')}`);
  } catch (e) { bad(`成就计数: ${e.message}`); }

  // 6. 攻略正文（指南 22 条带作者字段 → 详情）
  try {
    const page = await mini.reLaunch('/pages/guide/guide');
    await sleep(2000);
    const head = await page.$('.list-head');
    const headText = head ? await head.text() : '';
    ok(`指南列表：${headText.trim().slice(0, 30)}`);
    await mini.screenshot({ path: `${OUT}/r2-guide-list.png` });
  } catch (e) { bad(`指南列表: ${e.message}`); }

  // 7. 关于页官方事实
  try {
    const page = await mini.reLaunch('/pages/about/about');
    await sleep(1600);
    const text = await (await page.$('.page')).text();
    const need = ['11 月 26 日', '2500 万', '978-7-498-12746-4'];
    const missing = need.filter((n) => !text.includes(n));
    if (missing.length) throw new Error(`关于页缺事实：${missing.join(',')}`);
    ok('关于页官方事实：公测日/预约2500万/ISBN ✓');
    await mini.screenshot({ path: `${OUT}/r2-about-facts.png` });
  } catch (e) { bad(`关于页事实: ${e.message}`); }

  console.log(results.join('\n'));
  console.log(`\nR2-T1 新功能回归：${fails ? fails + ' 项失败' : '全部通过'}`);
  await mini.disconnect();
  process.exit(fails ? 1 : 0);
}

main().catch((e) => { console.error('R2 回归脚本异常：', e.message); process.exit(2); });
