// P6 U1 UI/UX 测试：深色主题截图走查（浅色截图已在 S1 采集 s1-*.png）。
// 用法：node scripts/automator-u1.mjs  （需 DevTools 自动化端口 9420 已启动）
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
  ['explore-subpkg', '/pages-explore/explore/explore'],
  ['favorites', '/pages/favorites/favorites'],
  ['story-list', '/pages/story/list'],
  ['wallpaper-list', '/pages/wallpaper/list']
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 通过设置页真实点击切换主题（主题为模块级单例，跨页面保持）
async function setThemeByTap(mini, label) {
  const settings = await mini.reLaunch('/pages/settings/settings');
  await sleep(1400);
  const options = await settings.$$('.st-option');
  for (const option of options) {
    const labelEl = await option.$('.st-option__label');
    const text = labelEl ? await labelEl.text() : '';
    if (text.trim() === label) {
      await option.tap();
      await sleep(500);
      return true;
    }
  }
  throw new Error(`设置页未找到主题选项「${label}」`);
}

async function main() {
  const mini = await automator.connect({ wsEndpoint: 'ws://localhost:9420' });
  const results = [];
  let fails = 0;

  await setThemeByTap(mini, '深色');

  for (const [name, route] of PAGES) {
    try {
      await mini.reLaunch(route);
      await sleep(1700);
      await sleep(200);
      const page = await mini.currentPage();
      // 注意：tool-shell/content-list 页面在自定义组件内部绑定 theme-dark，
      // page.$ 不穿透组件 → 以截图人工/视觉走查为准，此处仅记录
      const isDarkApplied = await page.$('.theme-dark');
      await mini.screenshot({ path: `${OUT}/u1-dark-${name}.png` });
      results.push(`✔ dark ${name}${isDarkApplied ? '' : '（组件级主题，截图为准）'}`);
    } catch (error) {
      fails += 1;
      results.push(`✖ dark ${name}: ${String(error.message).slice(0, 130)}`);
    }
  }

  // 恢复浅色，避免影响后续轮次基线
  try {
    await setThemeByTap(mini, '浅色');
    const settings = await mini.currentPage();
    await sleep(600);
    const dark = await settings.$('.theme-dark');
    if (dark) throw new Error('恢复浅色失败');
    results.push('✔ 恢复浅色主题');
  } catch (error) {
    results.push(`✖ 恢复浅色: ${String(error.message).slice(0, 120)}`);
    fails += 1;
  }

  console.log(results.join('\n'));
  console.log(fails ? `\nU1 深色走查：${fails} 项待人工复核` : '\nU1 深色走查：截图完成，无自动化层异常');
  await mini.disconnect();
}

main().catch((error) => {
  console.error('U1 脚本异常：', error.message);
  process.exit(1);
});
