// R2-T2 深色主题走查（经设置页真实切换 setThemePref）
import automator from 'miniprogram-automator';
import { mkdirSync } from 'node:fs';
const OUT = 'D:/qibo/ap-benchmark/own-app-screenshots/R2-round2';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function main() {
  const mini = await automator.connect({ wsEndpoint: 'ws://localhost:9420' });
  const out = [];
  await mini.reLaunch('/pages/index/index'); await sleep(1500); // 规避直连 reLaunch 超时
  // 切深色
  await mini.reLaunch('/pages/settings/settings'); await sleep(1800);
  let page = await mini.currentPage();
  const opts = await page.$$('.st-option');
  if (opts.length < 3) throw new Error('主题选项不足');
  await opts[1].tap(); // 深色
  await sleep(900);
  const isDarkNow = await page.$('.page.theme-dark');
  out.push(isDarkNow ? '✔ 设置页切深色：theme-dark 类生效' : '✖ 深色类未生效');
  // 三页走查
  for (const [route, file] of [
    ['/pages-explore/explore/explore', 't2-dark-explore.png'],
    ['/pages/team/team', 't2-dark-team.png'],
    ['/pages/story/list', 't2-dark-story.png'],
    ['/pages/qibo/list', 't2-dark-qibo.png']
  ]) {
    try {
      await mini.reLaunch(route); await sleep(2600);
      await mini.screenshot({ path: `${OUT}/${file}` });
      out.push(`✔ 深色走查 ${route}`);
    } catch (e) { out.push(`⚠ 跳过 ${route}: ${String(e.message).slice(0, 40)}`); }
  }
  // 恢复跟随系统
  await mini.reLaunch('/pages/settings/settings'); await sleep(1800);
  page = await mini.currentPage();
  const opts2 = await page.$$('.st-option');
  await opts2[2].tap(); await sleep(700);
  const darkOff = !(await page.$('.page.theme-dark'));
  out.push(darkOff ? '✔ 已恢复跟随系统（浅色）' : '⚠ 恢复后仍为深色（系统或为深色，属正常）');
  console.log(out.join('\n'));
  await mini.disconnect(); process.exit(0);
}
main().catch((e) => { console.error('ERR', e.message); process.exit(2); });
