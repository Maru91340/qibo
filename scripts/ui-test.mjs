// UI/UX 测试驱动：miniprogram-automator 连接开发者工具，逐页导航截图
// 用法：先 cli auto --project <path> --auto-port 9420，再 node scripts/ui-test.mjs
import automator from 'miniprogram-automator';
import { mkdirSync } from 'node:fs';

const OUT = 'D:/qibo/采集/compare';
mkdirSync(OUT, { recursive: true });

const pages = [
  { path: '/pages/character/detail?id=ch-40c2fea853', name: 'char_detail' },
  { path: '/pages/qibo/detail?id=qi-1738ff87f2', name: 'qibo_detail' },
  { path: '/pages/material/detail?id=item-c00069efa7', name: 'material_detail' },
  { path: '/pages/index/index', name: 'home' },
  { path: '/pages/character/list', name: 'char_list' },
  { path: '/pages/qibo/list', name: 'qibo_list' },
  { path: '/pages/item/list', name: 'item_list' },
  { path: '/pages/element/element', name: 'element' },
  { path: '/pages/pity/pity', name: 'pity' },
  { path: '/pages/cultivation/cultivation', name: 'cultivation' },
  { path: '/pages/compare/compare', name: 'compare' },
  { path: '/pages/evolution/evolution', name: 'evolution' },
  { path: '/pages/wallpaper/list', name: 'wallpaper' },
  { path: '/pages/settings/settings', name: 'settings' }
];

const mini = await automator.connect({ wsEndpoint: 'ws://localhost:9420' });
console.log('connected');
const results = [];

for (const page of pages) {
  try {
    await mini.reLaunch(page.path);
    await new Promise((r) => setTimeout(r, 1800));
    const fileName = `${OUT}/ui_${page.name}.png`;
    await mini.screenshot({ path: fileName });
    const current = (await mini.currentPage()).path;
    results.push(`✔ ${page.path} → ${current} → ${fileName}`);
  } catch (error) {
    results.push(`✖ ${page.path}: ${error.message}`);
  }
}
console.log(results.join('\n'));
await mini.disconnect();
