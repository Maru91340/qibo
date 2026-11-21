// 奇波详情改版冒烟：连接开发者工具自动化端口，打开蓬尾狐详情截图并断言关键板块渲染。
// 用法：先在微信开发者工具开启服务端口（设置→安全→服务端口），再 node scripts/automator-qibo-detail.mjs
import automator from 'miniprogram-automator';
import { mkdirSync } from 'node:fs';

const OUT = '.tmp/qibo-detail-shots';
mkdirSync(OUT, { recursive: true });
// 蓬尾狐 BWIKI 条目 id（列表页合并后 detailId 即 BWIKI id）
const DETAIL_ID = 'qi-7dac847e45';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 页面上所有 text 节点拼一份全文，检查关键板块标题是否渲染
async function pageText(page) {
  const nodes = await page.$$('text');
  const parts = [];
  for (const node of nodes) parts.push(await node.text());
  return parts.join('\n');
}

async function main() {
  console.log('连接 ws://localhost:9420 …');
  const mini = await automator.connect({ wsEndpoint: 'ws://localhost:9420' });
  const page = await mini.reLaunch(`/pkg-qibo/detail?id=${DETAIL_ID}`);
  await sleep(3000);
  const current = await mini.currentPage();
  console.log('落地页:', current.path);

  const text = await pageText(page);
  const expectTexts = ['战斗信息', '六维能力资质', '战斗技能', '专属特性', '基因技能', '基础信息', '家族', '星临图志', '升级经验', '设为出战奇波'];
  const missing = expectTexts.filter((t) => !text.includes(t));
  await mini.screenshot({ path: `${OUT}/detail-top.png` });
  await mini.pageScrollTo(3200).catch(() => {});
  await sleep(1000);
  await mini.screenshot({ path: `${OUT}/detail-bottom.png` });

  if (missing.length) {
    console.log('✘ 未找到文本:', missing.join(' / '));
    process.exitCode = 1;
  } else {
    console.log('✔ 全部关键板块渲染正常（截图见', OUT, '）');
  }
  await mini.disconnect();
}

main().catch((error) => {
  console.error('冒烟失败：', error.message);
  process.exit(1);
});
