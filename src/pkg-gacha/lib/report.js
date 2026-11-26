// 抽卡模拟 · 竖版分享图（750 × 1000）：坐标与配色沿用 design/gacha-flow.html 的 paintReport。
// 与设计稿的差异只有两处：图片资源换成云存储本地临时文件（小程序 canvas 只能画本地路径）；
// 文案口径保持一致，不做嘲讽式表达。
import { LUCK } from './pools.js';
import { cardArt } from './cards.js';
import { buildReport, format, reportTags } from './report-data.js';

export { buildReport, format, reportTags };

export const REPORT_W = 750;
export const REPORT_H = 1000;
const PAD = 64;

const SERIF = '"Songti SC","SimSun",serif';
const SANS = '"PingFang SC","Microsoft YaHei",sans-serif';

/** #rrggbb → rgba()，供渐变使用。 */
export function hexAlpha(hex, alpha) {
  const value = String(hex || '').replace('#', '');
  const full = value.length === 3 ? value.split('').map((part) => part + part).join('') : value;
  const num = (from) => parseInt(full.slice(from, from + 2), 16) || 0;
  return 'rgba(' + num(0) + ',' + num(2) + ',' + num(4) + ',' + alpha + ')';
}

/** 圆角矩形路径。 */
export function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function setFont(ctx, size, weight, family) {
  // 小程序 CanvasContext：font 支持不全时 setFontSize 兜底，字号至少不会错
  ctx.font = (weight || '400') + ' ' + size + 'px ' + (family === 'serif' ? SERIF : SANS);
  ctx.setFontSize(size);
}

/** 取图片尺寸；失败返回 null，由调用方退回首字色块。 */
function imageInfo(src) {  return new Promise((resolve) => {
    uni.getImageInfo({
      src,
      success: (res) => resolve({ path: res.path, width: res.width, height: res.height }),
      fail: () => resolve(null)
    });
  });
}

/** 云文件先下到本地临时路径，再取尺寸；任何一步失败都退回首字色块。 */
function loadImage(src) {
  if (!src) return Promise.resolve(null);
  if (/^cloud:\/\//.test(src)) {
    return new Promise((resolve) => {
      if (typeof wx === 'undefined' || !wx.cloud || !wx.cloud.downloadFile) {
        resolve(null);
        return;
      }
      wx.cloud.downloadFile({
        fileID: src,
        success: (res) => resolve(res.tempFilePath || ''),
        fail: () => resolve(null)
      });
    })
      .then((path) => (path ? imageInfo(path) : null))
      .catch(() => null);
  }
  return imageInfo(src);
}

export function loadReportImages(stat) {
  return Promise.all(stat.latest.map((item) => loadImage(cardArt(item))));
}

/** 画 750×1000 报告：缺图时首字色块，与设计稿一致。 */
export function paintReport(ctx, scope, stat, images) {
  const W = REPORT_W;
  const H = REPORT_H;
  if (!ctx) return;

  const bg = ctx.createLinearGradient(0, 0, W * 0.5, H);
  bg.addColorStop(0, '#fffefa');
  bg.addColorStop(0.56, scope.soft);
  bg.addColorStop(1, '#f2e8d8');
  ctx.setFillStyle(bg);
  ctx.fillRect(0, 0, W, H);

  const halo = ctx.createRadialGradient(W * 0.5, -40, 30, W * 0.5, -40, 430);
  halo.addColorStop(0, hexAlpha(scope.accent, 0.3));
  halo.addColorStop(1, hexAlpha(scope.accent, 0));
  ctx.setFillStyle(halo);
  ctx.fillRect(0, 0, W, 430);

  ctx.setStrokeStyle('rgba(255,255,255,.75)');
  ctx.setLineWidth(2);
  roundRect(ctx, 26, 26, W - 52, H - 52, 30);
  ctx.stroke();

  ctx.textAlign = 'center';
  setFont(ctx, 21, '500', 'sans');
  ctx.setFillStyle('#a99a83');
  ctx.fillText('OBSERVATION REPORT', W / 2, 108);

  setFont(ctx, 58, '600', 'serif');
  ctx.setFillStyle(scope.accent);
  ctx.fillText(scope.title, W / 2, 178);

  setFont(ctx, 22, '400', 'sans');
  ctx.setFillStyle('#8e8678');
  ctx.fillText(scope.sub + ' · ' + stat.stamp, W / 2, 216);

  // 三列数字
  const figures = [
    [format(stat.total), '累计观测', '#3c374a'],
    [String(stat.five), '五星相遇', '#a47727'],
    [stat.avg ? String(stat.avg) : '—', '平均出货抽数', '#3c374a']
  ];
  const colW = (W - PAD * 2) / 3;
  figures.forEach((figure, index) => {
    const cx = PAD + colW * index + colW / 2;
    if (index) {
      ctx.setStrokeStyle('rgba(217,205,182,.9)');
      ctx.setLineWidth(1);
      ctx.beginPath();
      ctx.moveTo(PAD + colW * index, 272);
      ctx.lineTo(PAD + colW * index, 352);
      ctx.stroke();
    }
    setFont(ctx, 62, '600', 'serif');
    ctx.setFillStyle(figure[2]);
    ctx.fillText(figure[0], cx, 336);
    setFont(ctx, 20, '400', 'sans');
    ctx.setFillStyle('#9c9384');
    ctx.fillText(figure[1], cx, 372);
  });

  ctx.textAlign = 'left';
  setFont(ctx, 24, '600', 'serif');
  ctx.setFillStyle('#6b6252');
  ctx.fillText('五星相遇', PAD, 436);
  ctx.textAlign = 'right';
  setFont(ctx, 19, '400', 'sans');
  ctx.setFillStyle('#a39884');
  ctx.fillText('共 ' + stat.five + ' 个 · 角标为同池间隔', W - PAD, 436);

  const top = 462;
  if (stat.latest.length) {
    const gapX = 16;
    const cardW = Math.min(150, (W - PAD * 2 - gapX * (stat.latest.length - 1)) / stat.latest.length);
    const cardH = cardW * 1.25;
    const totalW = cardW * stat.latest.length + gapX * (stat.latest.length - 1);
    const startX = (W - totalW) / 2;
    stat.latest.forEach((item, index) => {
      const x = startX + (cardW + gapX) * index;
      ctx.save();
      roundRect(ctx, x, top, cardW, cardH, 12);
      ctx.clip();
      ctx.setFillStyle('#efe7da');
      ctx.fillRect(x, top, cardW, cardH);
      const image = images[index];
      if (image) {
        const ratio = Math.max(cardW / image.width, cardH / image.height);
        const dw = image.width * ratio;
        const dh = image.height * ratio;
        ctx.drawImage(image.path, x + (cardW - dw) / 2, top + (cardH - dh) / 2, dw, dh);
      } else {
        setFont(ctx, 34, '600', 'serif');
        ctx.setFillStyle('#ad9e87');
        ctx.textAlign = 'center';
        ctx.fillText(item.name.slice(0, 1), x + cardW / 2, top + cardH / 2 + 12);
      }
      ctx.restore();

      const badge = (item.fiveGap || 0) + ' 抽';
      setFont(ctx, 16, '400', 'sans');
      const bw = ctx.measureText(badge).width + 20;
      ctx.setFillStyle('rgba(36,31,46,.82)');
      roundRect(ctx, x + cardW - bw - 6, top + cardH - 32, bw, 26, 13);
      ctx.fill();
      setFont(ctx, 16, '400', 'sans');
      ctx.setFillStyle('#fdf8ee');
      ctx.textAlign = 'center';
      ctx.fillText(badge, x + cardW - bw / 2 - 6, top + cardH - 13);

      if (item.luck && LUCK[item.luck]) {
        const label = LUCK[item.luck].label;
        setFont(ctx, 15, '500', 'sans');
        const lw = ctx.measureText(label).width + 18;
        const luckGrad = ctx.createLinearGradient(x + 6, top + 6, x + 6 + lw, top + 32);
        luckGrad.addColorStop(0, '#f9e79a');
        luckGrad.addColorStop(1, '#e9c65a');
        ctx.setFillStyle(luckGrad);
        roundRect(ctx, x + 6, top + 6, lw, 26, 13);
        ctx.fill();
        ctx.setFillStyle('#5d4318');
        ctx.fillText(label, x + 6 + lw / 2, top + 24);
      }

      if (item.isUp) {
        setFont(ctx, 14, '600', 'sans');
        const uw = ctx.measureText('UP').width + 16;
        ctx.setFillStyle('rgba(157,47,63,.84)');
        roundRect(ctx, x + cardW - uw - 6, top + 6, uw, 24, 12);
        ctx.fill();
        ctx.setFillStyle('#fff6ef');
        ctx.fillText('UP', x + cardW - uw / 2 - 6, top + 23);
      }

      setFont(ctx, 19, '400', 'sans');
      ctx.setFillStyle('#6d6558');
      ctx.textAlign = 'center';
      ctx.fillText(item.name, x + cardW / 2, top + cardH + 30);
    });
  } else {
    ctx.setStrokeStyle('#d3c6ae');
    ctx.setLineWidth(1.5);
    ctx.setLineDash([8, 8]);
    roundRect(ctx, PAD, top, W - PAD * 2, 150, 18);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.textAlign = 'center';
    setFont(ctx, 21, '400', 'sans');
    ctx.setFillStyle('#a39884');
    ctx.fillText('还没有五星记录 · 继续观测，星光会在某一次回应', W / 2, top + 86);
  }

  ctx.textAlign = 'center';
  setFont(ctx, 21, '400', 'serif');
  ctx.setFillStyle('#a2917a');
  ctx.fillText(scope.pool ? scope.pool.themeCaption : '循星而来 · 与你相遇', W / 2, 712);

  if (stat.tags.length) {
    setFont(ctx, 20, '400', 'sans');
    const tagTexts = stat.tags.map((tag) => '#' + tag.label);
    const widths = tagTexts.map((text) => ctx.measureText(text).width + 40);
    const totalW = widths.reduce((sum, value) => sum + value, 0) + 14 * (tagTexts.length - 1);
    let x = (W - totalW) / 2;
    const y = 748;
    tagTexts.forEach((text, index) => {
      const calm = stat.tags[index].calm;
      ctx.setFillStyle(calm ? 'rgba(255,253,248,.72)' : 'rgba(255,253,246,.78)');
      ctx.setStrokeStyle(calm ? '#cfd3cd' : '#dcca9f');
      ctx.setLineWidth(1.5);
      roundRect(ctx, x, y, widths[index], 40, 20);
      ctx.fill();
      ctx.stroke();
      ctx.setFillStyle(calm ? '#7d8378' : '#7a6431');
      ctx.textAlign = 'center';
      ctx.fillText(text, x + widths[index] / 2, y + 27);
      x += widths[index] + 14;
    });
  }

  // 页脚：小程序码位（待确认 #3 用占位框）+ 品牌
  ctx.setStrokeStyle('rgba(226,214,192,1)');
  ctx.setLineWidth(1);
  ctx.beginPath();
  ctx.moveTo(PAD, 812);
  ctx.lineTo(W - PAD, 812);
  ctx.stroke();

  ctx.setLineDash([6, 6]);
  ctx.setStrokeStyle('#c9bda4');
  roundRect(ctx, PAD, 840, 92, 92, 14);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.textAlign = 'center';
  setFont(ctx, 15, '400', 'sans');
  ctx.setFillStyle('#ab9f88');
  ctx.fillText('小程序', PAD + 46, 882);
  ctx.fillText('码位', PAD + 46, 904);

  ctx.textAlign = 'left';
  setFont(ctx, 26, '600', 'serif');
  ctx.setFillStyle('#4d4756');
  ctx.fillText('奇波小助手', PAD + 116, 882);
  setFont(ctx, 17, '400', 'sans');
  ctx.setFillStyle('#9c9384');
  ctx.fillText('蓝色星原 · 抽卡模拟', PAD + 116, 910);
  ctx.fillText('本地记录 · 不代表游戏真实概率', PAD + 116, 936);
}

/** 旧版 canvas 需要显式 draw 才落笔，导出前等回调。 */
export function flushCanvas(ctx) {
  return new Promise((resolve) => {
    ctx.draw(false, () => resolve());
  });
}

export function canvasToFile(canvasId) {
  return new Promise((resolve, reject) => {
    uni.canvasToTempFilePath({
      canvasId,
      x: 0,
      y: 0,
      width: REPORT_W,
      height: REPORT_H,
      destWidth: REPORT_W,
      destHeight: REPORT_H,
      success: (res) => resolve(res.tempFilePath),
      fail: (error) => reject(error)
    });
  });
}
