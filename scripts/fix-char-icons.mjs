// R3-T1 F1 修复 v2：charWiki icon 误配一图流海报/站点通用图 → 按「角色自身 hero ID」取获得立绘
// 机制：BWIKI 角色页图片为游戏纹理（Tex icon hero get <ID>.png = 获得立绘 2600x1900、
//       Tex icon hero l <ID>.png = 大头像、HeroFavorPlotPic <ID>xx = 牵绊剧情图）。
//       角色自身 ID = 页面文件名中出现频次最高的 6 位数。
// 用法：node scripts/fix-char-icons.mjs [--all]（默认只处理 一图流/空/已知坏图 的条目）
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = join(projectRoot, 'src/data/generated/catalogs.json');
const API = 'https://wiki.biligame.com/ap/api.php';
const UA = 'Mozilla/5.0 (compatible; qbxzs-data/1.0; +local)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ALL = process.argv.includes('--all');

async function api(params) {
  const body = new URLSearchParams({ format: 'json', ...params });
  const res = await fetch(API, { method: 'POST', headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const text = await res.text();
  if (!text.trim().startsWith('{')) throw new Error(`HTTP ${res.status}`);
  return JSON.parse(text);
}

function ownHeroId(files) {
  const counts = new Map();
  for (const f of files) {
    for (const m of f.matchAll(/(?:hero (?:get|l) |HeroFavorPlotPic )(\d{6})/g)) {
      counts.set(m[1], (counts.get(m[1]) || 0) + 1);
    }
  }
  let best = '';
  let bestN = 0;
  for (const [id, n] of counts) {
    if (n > bestN || (n === bestN && id < best)) { best = id; bestN = n; }
  }
  return best;
}

async function pickPortrait(name) {
  const imgJson = await api({ action: 'query', prop: 'images', imlimit: '100', titles: name });
  const page = Object.values((imgJson.query || {}).pages || {})[0];
  const files = (page && page.images ? page.images : []).map((i) => i.title);
  if (!files.length) return '';
  const id = ownHeroId(files);
  if (!id) return '';
  const prefer = [`文件:Tex icon hero get ${id}.png`, `文件:Tex icon hero l ${id}.png`];
  const hit = files.find((f) => prefer.includes(f));
  if (!hit) return '';
  const info = await api({ action: 'query', prop: 'imageinfo', iiprop: 'url', iiurlwidth: '240', titles: hit });
  const p2 = Object.values((info.query || {}).pages || {})[0];
  const u = p2 && p2.imageinfo && p2.imageinfo[0] ? (p2.imageinfo[0].thumburl || p2.imageinfo[0].url || '') : '';
  return u.startsWith('//') ? `https:${u}` : u;
}

const data = JSON.parse(readFileSync(OUTPUT, 'utf8'));
const chars = (data.types.charWiki || {}).items || [];
let fixed = 0;
let kept = 0;
let cleared = 0;
for (const item of chars) {
  const icon = item.icon || '';
  const bad = !icon || /一图流/.test(decodeURIComponent(icon)) || /pxeyo0tufltxcodxvxlo6xwtd0tqjo0|b6fzjd6hfupmf6r404dmrwchx6zyzvy|0jh4jdt0n8watqg46x0i98y0klci1nx|d2hwu3j0r7i3q36xrp3d376famfhtae|edftnfyj4ddzq1d0sxnlspo4b36wulg/.test(icon);
  if (!ALL && !bad) { kept += 1; continue; }
  try {
    const url = await pickPortrait(item.name);
    if (url) {
      item.icon = url;
      fixed += 1;
      console.log(`✔ ${item.name} → ${decodeURIComponent(url.split('/').pop()).slice(0, 52)}`);
    } else {
      item.icon = '';
      cleared += 1;
      console.log(`◌ ${item.name} 页面无可判定立绘 → 置空走占位`);
    }
  } catch (error) {
    console.warn(`✖ ${item.name}: ${error.message}（保留原值）`);
  }
  await sleep(800);
}
writeFileSync(OUTPUT, JSON.stringify(data));
console.log(`完成：修复 ${fixed} · 保持 ${kept} · 置空 ${cleared}`);
