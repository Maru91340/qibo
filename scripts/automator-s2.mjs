// P7 S2 边界与稳定性测试：输入边界 / 结果容错 / 收藏大数据量。
// 用法：node scripts/automator-s2.mjs（需 DevTools 自动化端口 9420）
import automator from 'miniprogram-automator';
import { readFileSync, mkdirSync } from 'node:fs';

const OUT = 'D:/qibo/ap-benchmark/own-app-screenshots/round2';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
let fails = 0;

function record(name, fn) {
  return async (...args) => {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        await fn(...args);
        results.push(`✔ ${name}${attempt > 1 ? '（重试后通过）' : ''}`);
        return;
      } catch (error) {
        if (attempt >= 2 || !/timeout/i.test(String(error.message))) {
          fails += 1;
          results.push(`✖ ${name}: ${String(error.message).slice(0, 150)}`);
          return;
        }
        await sleep(2500);
      }
    }
  };
}

async function main() {
  const mini = await automator.connect({ wsEndpoint: 'ws://localhost:9420' });

  // S2-1a 保底计算边界：0 时减号钳制、目标 ±10
  await record('S2-1a 保底边界', async () => {
    const page = await mini.reLaunch('/pages/pity/pity');
    await sleep(1500);
    const btns = await page.$$('.tool-stepper__btn');
    if (btns.length < 4) throw new Error(`步进按钮数量异常：${btns.length}`);
    await btns[0].tap(); // current −（已在 0，应钳制）
    await sleep(250);
    await btns[0].tap();
    await sleep(250);
    const nums = await page.$$('.tool-stepper__num');
    const cur = (await nums[0].text()).trim();
    if (cur !== '0') throw new Error(`current 负数未钳制：${cur}`);
    const targetBefore = Number((await nums[1].text()).trim());
    await btns[3].tap(); // target ＋10
    await btns[3].tap();
    await sleep(300);
    const nums2 = await page.$$('.tool-stepper__num');
    const targetAfter = Number((await nums2[1].text()).trim());
    if (targetAfter !== targetBefore + 20) throw new Error(`target 步进异常：${targetBefore} → ${targetAfter}（应 +20）`);
    await mini.screenshot({ path: `${OUT}/s2-pity-boundary.png` });
  })();

  // S2-1b 返利档位与容错
  await record('S2-1b 返利档位/容错', async () => {
    const page = await mini.reLaunch('/pages/rebate/rebate');
    await sleep(1500);
    const input = await page.$('.tool-input');
    if (!input) throw new Error('找不到充值输入框');
    for (const [val, mustContain] of [['2000', '200%'], ['2001', '150%'], ['0', null], ['abc', null], ['-50', null]]) {
      await input.input(val);
      await sleep(450);
      const hero = await page.$('.tool-result__hero');
      const heroText = hero ? await hero.text() : '';
      if (/NaN|undefined|Infinity/.test(heroText)) throw new Error(`输入 ${val} 出现异常值：${heroText}`);
      if (mustContain) {
        const tierEl = await page.$('.tool-result__text');
        const tierText = tierEl ? await tierEl.text() : '';
        if (!tierText.includes(mustContain)) throw new Error(`输入 ${val} 未命中档位 ${mustContain}：${tierText}`);
      }
    }
    await input.input('648');
    await sleep(400);
    await mini.screenshot({ path: `${OUT}/s2-rebate-tiers.png` });
  })();

  // S2-1c 星结模拟运行
  await record('S2-1c 星结模拟运行', async () => {
    const page = await mini.reLaunch('/pages/simulator/simulator');
    await sleep(1500);
    const btns = await page.$$('.ct-btn');
    if (!btns.length) throw new Error('找不到开始模拟按钮');
    await btns[0].tap();
    await sleep(900);
    const rows = await page.$$('.tool-result__row');
    if (rows.length < 3) throw new Error(`模拟结果行数异常：${rows.length}`);
    await mini.screenshot({ path: `${OUT}/s2-simulator-run.png` });
  })();

  // S2-1d 搜索超长 + emoji 关键词
  await record('S2-1d 搜索边界关键词', async () => {
    const keyword = '🔥'.repeat(40) + '星'.repeat(180);
    const page = await mini.reLaunch(`/pages/search/search?keyword=${encodeURIComponent(keyword)}`);
    await sleep(1800);
    const current = await mini.currentPage();
    if (!current || !current.path.includes('search')) throw new Error('搜索页未正常承载');
    await mini.screenshot({ path: `${OUT}/s2-search-long-emoji.png` });
  })();

  // S2-3 收藏 120 条真实条目（真实 qibo id）性能与渲染
  await record('S2-3 收藏 120 条', async () => {
    const bundled = JSON.parse(readFileSync('src/data/generated/catalogs-bundled.json', 'utf8'));
    const ids = ((bundled.types.qiboWiki || {}).items || []).slice(0, 120).map((item) => item.id);
    if (ids.length < 100) throw new Error('真实 qibo id 不足');
    const seeded = await mini.evaluate((list) => {
      try {
        wx.setStorageSync('qbxzs:favs', list);
        return list.length;
      } catch (error) {
        return -1;
      }
    }, ids);
    if (seeded < 0) throw new Error('evaluate 写入收藏失败（wx 不可用）');
    const page = await mini.reLaunch('/pages/favorites/favorites');
    await sleep(2000);
    const current = await mini.currentPage();
    if (!current || !current.path.includes('favorites')) throw new Error('收藏页未正常承载');
    await mini.screenshot({ path: `${OUT}/s2-favorites-120.png` });
    // 清理，避免污染后续轮次
    await mini.evaluate(() => {
      wx.setStorageSync('qbxzs:favs', []);
      return 1;
    });
  })();

  console.log(results.join('\n'));
  console.log(fails ? `\nS2 边界测试：${fails} 项失败` : '\nS2 边界测试：全部通过');
  await mini.disconnect();
  process.exitCode = fails ? 1 : 0;
}

main().catch((error) => {
  console.error('S2 脚本异常：', error.message);
  process.exit(1);
});
