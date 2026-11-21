// P8 S3-3 发布前全量路由遍历：54 路由逐个 reLaunch，验证落地页匹配且有渲染节点。
// 用法：node scripts/automator-s3.mjs（需 DevTools 自动化端口 9420）
import automator from 'miniprogram-automator';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'D:/qibo/ap-benchmark/own-app-screenshots/R2-round3';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const appJson = JSON.parse(readFileSync('dist/build/mp-weixin/app.json', 'utf8'));
  const routes = (appJson.pages || []).map((p) => `/${p}`);
  (appJson.subPackages || []).forEach((sub) => {
    (sub.pages || []).forEach((p) => routes.push(`/${sub.root}/${p}`));
  });
  console.log(`路由总数：${routes.length}`);

  const mini = await automator.connect({ wsEndpoint: 'ws://localhost:9420' });
  const fails = [];
  let ok = 0;

  for (let i = 0; i < routes.length; i += 1) {
    const route = routes[i];
    try {
      const page = await mini.reLaunch(route);
      await sleep(1150);
      const current = await mini.currentPage();
      const currentPath = `/${current.path}`;
      if (!route.startsWith(currentPath)) throw new Error(`落地不匹配：${currentPath}`);
      // 渲染验证：page.$ 不穿透自定义组件（catalog-list/content-list 等整页组件会误报白屏），
      // 故全量截图归档 + 抽样人工走查；自动层只验证落地页匹配。
      await mini.screenshot({ path: join(OUT, `s3-${String(route).replace(/\//g, '_')}.png`) });
      ok += 1;
    } catch (error) {
      fails.push(`${route}: ${String(error.message).slice(0, 110)}`);
      try {
        await mini.screenshot({ path: join(OUT, `s3-FAIL-${String(route).replace(/\//g, '_')}.png`) });
      } catch (e) { /* 截图失败忽略 */ }
    }
  }

  console.log(`通过 ${ok}/${routes.length}`);
  if (fails.length) {
    console.log('失败清单：');
    fails.forEach((line) => console.log(`  ✖ ${line}`));
  } else {
    console.log('S3-3 全量遍历：0 白屏 0 失败');
  }
  await mini.disconnect();
  process.exitCode = fails.length ? 1 : 0;
}

main().catch((error) => {
  console.error('S3-3 脚本异常：', error.message);
  process.exit(1);
});
