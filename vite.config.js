import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { defineConfig } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';

// P1-0 主包瘦身（2026-11-04）：构建小程序/H5 时把全量图鉴 JSON 替换为离线回退子集
// （catalogs-bundled.json：无远程 icon URL / 精简字段 / item 400 条，由 collect 脚本生成）。
// 云端种子导出（seed:export）走 esbuild 不经过 vite，仍携带全量，通过 getCatalog 下发。

// 生成 gzip+base64 内联模块（运行时用 pako inflate 解出 JSON）。
function compressedJsonModule(filePath) {
  const compressed = gzipSync(readFileSync(filePath), { level: 9 }).toString('base64');
  return `import { inflate } from 'pako/lib/inflate.js';
    const encoded = ${JSON.stringify(compressed)};
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const bytes = new Uint8Array(encoded.length / 4 * 3 - (encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0));
    for (let i = 0, out = 0; i < encoded.length; i += 4) {
      const bits = (alphabet.indexOf(encoded[i]) << 18) | (alphabet.indexOf(encoded[i + 1]) << 12) | ((alphabet.indexOf(encoded[i + 2]) & 63) << 6) | (alphabet.indexOf(encoded[i + 3]) & 63);
      if (out < bytes.length) bytes[out++] = bits >> 16;
      if (out < bytes.length) bytes[out++] = bits >> 8;
      if (out < bytes.length) bytes[out++] = bits;
    }
    export default JSON.parse(inflate(bytes, { to: 'string' }));`;
}

function slimCatalogPlugin() {
  return {
    name: 'qbxzs-slim-catalogs',
    enforce: 'pre',
    // 构建时将内置资料指向压缩模块。
    resolveId(source, importer) {
      if (source === './generated/catalogs.json' && importer && /[\\/]data[\\/]catalog\.js$/.test(importer)) {
        const slimPath = join(dirname(importer), 'generated', 'catalogs-bundled.json');
        if (existsSync(slimPath)) return '\0qbxzs-compressed-catalog';
      }
      return null;
    },
    load(id) {
      if (id !== '\0qbxzs-compressed-catalog') return null;
      const slimPath = join(process.cwd(), 'src', 'data', 'generated', 'catalogs-bundled.json');
      this.addWatchFile(slimPath);
      return compressedJsonModule(slimPath);
    }
  };
}

// 奇波战斗数据（collect-cbt3-pets.mjs 产物）体积较大，仅 pkg-qibo 分包详情页引用；
// 构建时同样 gzip 内联，跟随分包下发，不占主包体积。
function combatDataPlugin() {
  return {
    name: 'qbxzs-combat-data',
    enforce: 'pre',
    resolveId(source, importer) {
      if (source === '../data/generated/qibo-combat.json' && importer && /[\\/]pkg-qibo[\\/]combat\.js$/.test(importer)) {
        return '\0qbxzs-compressed-combat';
      }
      return null;
    },
    load(id) {
      if (id !== '\0qbxzs-compressed-combat') return null;
      const combatPath = join(process.cwd(), 'src', 'data', 'generated', 'qibo-combat.json');
      this.addWatchFile(combatPath);
      return compressedJsonModule(combatPath);
    }
  };
}

// 灵子数据（collect-cbt3-soulessence.mjs 产物）：主包详情页引用，gzip 内联控制体积。
function soulDataPlugin() {
  return {
    name: 'qbxzs-soul-data',
    enforce: 'pre',
    resolveId(source, importer) {
      if (source === './generated/soul-essence.json' && importer && /[\\/]data[\\/]soul-essence\.js$/.test(importer)) {
        return '\0qbxzs-compressed-soul';
      }
      return null;
    },
    load(id) {
      if (id !== '\0qbxzs-compressed-soul') return null;
      const soulPath = join(process.cwd(), 'src', 'data', 'generated', 'soul-essence.json');
      this.addWatchFile(soulPath);
      return compressedJsonModule(soulPath);
    }
  };
}

// 站点2 字段补齐数据（2026-11-17 采集产物）：仅 catalog.js 引用；原文内联曾使主包
// data/catalog.js 达 1749 KiB 触发包体检查失败，与其他大 JSON 一致走 gzip 内联。
function station2DataPlugin() {
  return {
    name: 'qbxzs-station2-data',
    enforce: 'pre',
    resolveId(source, importer) {
      if (source === './generated/station2-qibo-character.json' && importer && /[\\/]data[\\/]catalog\.js$/.test(importer)) {
        return '\0qbxzs-compressed-station2';
      }
      return null;
    },
    load(id) {
      if (id !== '\0qbxzs-compressed-station2') return null;
      const station2Path = join(process.cwd(), 'src', 'data', 'generated', 'station2-qibo-character.json');
      this.addWatchFile(station2Path);
      return compressedJsonModule(station2Path);
    }
  };
}

// H5 dev/preview：uni 静态中间件对含中文目录的 /static 路径会 SPA fallback（返回 text/html），
// 本地图库（src/static/wiki/<中文分类>/…）全部无法显示；这里前置拦截该前缀，
// 手动解码读盘并按扩展名回 content-type。微信端图库被剥离，不受影响。
const WIKI_MIME = {
  webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  gif: 'image/gif', svg: 'image/svg+xml'
};

function wikiStaticMiddleware() {
  return function wikiStaticHandler(req, res, next) {
    if (!req.url || !req.url.startsWith('/static/wiki/')) return next();
    let pathname;
    try {
      pathname = decodeURIComponent(req.url.split('?')[0]);
    } catch {
      return next();
    }
    const wikiRoot = join(process.cwd(), 'src', 'static', 'wiki');
    const filePath = join(wikiRoot, pathname.replace(/^\/static\/wiki\//, ''));
    if (!filePath.startsWith(wikiRoot)) return next();
    try {
      const data = readFileSync(filePath);
      const ext = filePath.slice(filePath.lastIndexOf('.') + 1).toLowerCase();
      res.writeHead(200, {
        'Content-Type': WIKI_MIME[ext] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(data);
    } catch {
      next();
    }
  };
}

function wikiStaticDevPlugin() {
  return {
    name: 'qbxzs-wiki-static-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(wikiStaticMiddleware());
    }
  };
}

function wikiStaticPreviewPlugin() {
  return {
    name: 'qbxzs-wiki-static-preview',
    apply: 'serve',
    configurePreviewServer(server) {
      server.middlewares.use(wikiStaticMiddleware());
    }
  };
}

// 本地原图索引（wiki-runtime.json，由 scripts/build-wiki-runtime.mjs 从 image-map.json 生成）：
// H5/dev 与微信端都 gzip 内联全量索引（mp 端原图档走云存储 cloud://，见 site-images.js 的
// WIKI_PREFIX 条件编译；CLOUD_STORAGE_BASE 未配置时 mp 候选链自动回退热链）。
// 图库本体仍不入 mp 包（scripts/prune-package-assets.mjs 剥离 static/wiki）。
function wikiIndexPlugin() {
  return {
    name: 'qbxzs-wiki-index',
    enforce: 'pre',
    resolveId(source, importer) {
      if (source === './generated/wiki-runtime.json' && importer && /[\\/]data[\\/]site-images\.js$/.test(importer)) {
        return '\0qbxzs-wiki-runtime';
      }
      return null;
    },
    load(id) {
      if (id !== '\0qbxzs-wiki-runtime') return null;
      const wikiPath = join(process.cwd(), 'src', 'data', 'generated', 'wiki-runtime.json');
      this.addWatchFile(wikiPath);
      return compressedJsonModule(wikiPath);
    }
  };
}

export default defineConfig({
  plugins: [wikiStaticDevPlugin(), wikiStaticPreviewPlugin(), slimCatalogPlugin(), combatDataPlugin(), soulDataPlugin(), station2DataPlugin(), wikiIndexPlugin(), {
    name: 'qbxzs-character-details',
    enforce: 'pre',
    resolveId(source, importer) {
      if (source === '../data/generated/character-detail-cbt3.json' && importer && /[\\/]pkg-character[\\/]/.test(importer)) return '\0qbxzs-character-cbt3';
      if (source === '../data/generated/character-detail-bwiki.json' && importer && /[\\/]pkg-character[\\/]/.test(importer)) return '\0qbxzs-character-bwiki';
      return null;
    },
    load(id) {
      if (!['\0qbxzs-character-cbt3', '\0qbxzs-character-bwiki'].includes(id)) return null;
      const path = join(process.cwd(), 'src', 'data', 'generated', id.endsWith('cbt3') ? 'character-detail-cbt3.json' : 'character-detail-bwiki.json');
      this.addWatchFile(path);
      return compressedJsonModule(path);
    }
  }, uni()]
});
