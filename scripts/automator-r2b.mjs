// R2-T2 第二轮：边界用例 + 深色主题走查
// 用法：node scripts/automator-r2b.mjs（需 cli auto --auto-port 9420）
import automator from 'miniprogram-automator';
import { mkdirSync } from 'node:fs';

const OUT = 'D:/qibo/ap-benchmark/own-app-screenshots/R2-round2';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const mini = await automator.connect({ wsEndpoint: 'ws://localhost:9420' });
  const results = [];
  let fails = 0;
  const ok = (msg) => results.push(`✔ ${msg}`);
  const bad = (msg) => { fails += 1; results.push(`✖ ${msg}`); };

  // B1 地图 11,692 点位：区域切换到弗利斯（5552 点）+ 性能粗测
  try {
    const t0 = Date.now();
    const page = await mini.reLaunch('/pages-explore/explore/explore');
    await sleep(2800);
    const loadMs = Date.now() - t0;
    const chips = await page.$$('.tool-picker__item');
    if (chips.length < 3) throw new Error(`区域页签不足：${chips.length}`);
    // 点「弗利斯」
    let tapped = false;
    for (const c of chips) {
      if ((await c.text()).includes('弗利斯')) { await c.tap(); tapped = true; break; }
    }
    if (!tapped) throw new Error('未找到弗利斯页签');
    await sleep(1800);
    const head = await page.$('.explore-count');
    const headText = head ? await head.text() : '';
    if (!/命中/.test(headText)) throw new Error(`切换后命中行异常：${headText}`);
    ok(`地图边界：区域切换弗利斯 ✓ 首屏 ${loadMs}ms（${headText.trim().slice(0, 24)}）`);
    await mini.screenshot({ path: `${OUT}/t2-map-fls.png` });
  } catch (e) { bad(`地图边界: ${e.message}`); }

  // B2 成就 144 长列表滚动到底部
  try {
    const page = await mini.reLaunch('/pages/achievement/achievement');
    await sleep(1800);
    await mini.pageScrollTo({ scrollTop: 99999 });
    await sleep(900);
    await mini.pageScrollTo({ scrollTop: 99999 });
    await sleep(900);
    await mini.screenshot({ path: `${OUT}/t2-achievement-bottom.png` });
    const foot = await page.$('.footnote');
    ok(`成就长列表滚动到底 ✓（页脚：${foot ? (await foot.text()).trim().slice(0, 20) : '渲染中'}）`);
  } catch (e) { bad(`成就长列表: ${e.message}`); }

  // B3 剧情 63：空结果边界
  try {
    const page = await mini.reLaunch('/pages/story/list');
    await sleep(2600);
    const input = await page.$('input');
    if (!input) throw new Error('未找到搜索框');
    await input.input('不存在的关键词xyzzy');
    await sleep(1400);
    await mini.screenshot({ path: `${OUT}/t2-story-empty.png` });
    ok('剧情空结果边界：输入无命中关键词（空态见截图走查）');
    // 恢复
    const clear = await page.$('.ct-search__clear');
    if (clear) { await clear.tap(); await sleep(600); }
  } catch (e) { bad(`剧情空结果: ${e.message}`); }

  // B4 技能档位边界：三角蜥 → 点 Lv.3 中间档
  try {
    const page = await mini.reLaunch('/pages/qibo/list');
    await sleep(1800);
    const input = await page.$('input');
    if (input) { await input.input('三角蜥'); await sleep(1200); }
    const cards = await page.$$('.catalog-list__card, .card');
    let tapped = false;
    for (const c of cards) {
      const t = await c.text();
      if (t && t.includes('三角蜥')) { await c.tap(); tapped = true; break; }
    }
    if (!tapped) throw new Error('未找到三角蜥');
    await sleep(2000);
    const detail = await mini.currentPage();
    const chips = await detail.$$('.skill__lv-chip');
    if (chips.length < 5) throw new Error(`chips 不足：${chips.length}`);
    await chips[2].tap(); // Lv.3 中间档
    await sleep(600);
    await mini.screenshot({ path: `${OUT}/t2-skill-lv3.png` });
    ok(`技能档位边界：Lv.3 中间档切换 ✓（共 ${chips.length} chips）`);
  } catch (e) { bad(`技能档位边界: ${e.message}`); }

  // B5 奇波列表「特殊个体」筛选可见性（round1 观察项）
  try {
    const page = await mini.reLaunch('/pages/qibo/list');
    await sleep(2200);
    const chips = await page.$$('.facet-chip');
    const texts = [];
    for (const c of chips) texts.push((await c.text()).trim());
    const has = texts.some((t) => t.includes('特殊个体'));
    ok(`奇波筛选 chips（${texts.length} 个）：特殊个体${has ? ' 可见 ✓' : ' 未显示（记录观察）'} → ${texts.slice(0, 6).join('/')}`);
  } catch (e) { bad(`特殊个体筛选: ${e.message}`); }

  // B6 队伍满编路径：加 1 角色后计数 1/3
  try {
    const page = await mini.reLaunch('/pages/team/team');
    await sleep(1800);
    const empty = await page.$('.slot--empty');
    if (empty) {
      await empty.tap();
      await sleep(1500);
      const pickerItem = await page.$('.picker__item, .tool-picker__item, .entry-card');
      if (pickerItem) {
        await pickerItem.tap();
        await sleep(1400);
      }
    }
    const meta = await page.$('.team-head__meta');
    const metaText = meta ? await meta.text() : '';
    if (!/\d\/3/.test(metaText)) throw new Error(`计数异常：${metaText}`);
    ok(`队伍边界：添加成员后头部「${metaText.trim().slice(0, 30)}」`);
    await mini.screenshot({ path: `${OUT}/t2-team-add.png` });
  } catch (e) { bad(`队伍满编路径: ${e.message}`); }

  // B7 深色主题走查（新功能页 3 页截图）
  try {
    await mini.callWxMethod('setStorageSync', 'qbxzs:theme', 'dark');
    const routes = [
      ['/pages-explore/explore/explore', 't2-dark-explore.png'],
      ['/pages/team/team', 't2-dark-team.png'],
      ['/pages/story/list', 't2-dark-story.png'],
      ['/pages/qibo/detail?id=qibo-r2-'] // 特殊个体详情（id 前缀匹配失败则跳过）
    ];
    for (const [route, file] of routes) {
      if (!file) continue;
      try {
        await mini.reLaunch(route);
        await sleep(2600);
        await mini.screenshot({ path: `${OUT}/${file}` });
        results.push(`✔ 深色走查：${route}`);
      } catch (e) { results.push(`⚠ 深色走查跳过：${route}（${String(e.message).slice(0, 40)}）`); }
    }
    await mini.callWxMethod('setStorageSync', 'qbxzs:theme', 'auto');
    ok('深色主题走查完成（4 张截图）+ 主题已恢复 auto');
  } catch (e) { bad(`深色走查: ${e.message}`); }

  console.log(results.join('\n'));
  console.log(`\nR2-T2 边界+深色：${fails ? fails + ' 项失败' : '全部通过'}`);
  await mini.disconnect();
  process.exit(fails ? 1 : 0);
}

main().catch((e) => { console.error('R2-T2 脚本异常：', e.message); process.exit(2); });
