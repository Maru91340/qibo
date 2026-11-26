import { GACHA_ASSET_BASE, GACHA_ASSET_FILES } from '@/data/gacha/assets.js';

/** 设计稿路径 → 云存储 key：'gacha-assets/soul/bg-huazhiwu.png' → 'soul/bg-huazhiwu.webp'。 */
export function assetKey(path) {
  if (!path) return '';
  return String(path)
    .replace(/^gacha-assets\//, '')
    .replace(/\.(png|jpe?g)$/i, '.webp');
}

/**
 * H5 端云存储直链：浏览器不认 cloud://，改用存储桶的 HTTPS 下载域名。
 * cloud://<envId>.<bucket>/a/b.webp → https://<bucket>.tcb.qcloud.la/a/b.webp
 * 仅 H5 编译保留（条件编译），小程序端仍是 cloud:// fileID，不受影响。
 */
const HTTPS_BASE = (() => {
  // #ifdef H5
  // 注意保留 bucket 之后的目录段（/images/gacha/），只换协议与域名
  const matched = /^cloud:\/\/[^.]+\.([^/]+)(\/.*)?$/.exec(GACHA_ASSET_BASE);
  if (matched) return 'https://' + matched[1] + '.tcb.qcloud.la' + (matched[2] || '/');
  // #endif
  return '';
})();

/** 取素材 URL；映射表里没有的返回空串，由调用方显式降级（不返回坏路径，避免 <image> 报错）。 */
export function gachaAsset(path) {
  if (String(path || '').startsWith('/pkg-gacha/static/')) return path;
  const key = assetKey(path);
  if (!key) return '';
  if (!GACHA_ASSET_FILES[key]) return '';
  return (HTTPS_BASE || GACHA_ASSET_BASE) + key;
}

/** 卡面：角色取立绘缩略图 ID，灵子取卡面键，缺图时返回空串由 UI 画首字色块。 */
export function cardAsset(kind, name, artRole, artSoul) {
  if (kind === '角色') {
    const id = artRole[name];
    return id ? gachaAsset('gacha-assets/card/char-' + id + '.webp') : '';
  }
  const key = artSoul[name];
  return key ? gachaAsset('gacha-assets/card/soul-' + key + '.webp') : '';
}
