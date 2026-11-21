<template>
  <view class="emap">
    <view class="emap__stage">
      <canvas
        id="exploreCanvas"
        type="2d"
        class="emap__canvas"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
      />
      <view class="emap__ctrl emap__ctrl--top">
        <text class="emap__badge">自绘示意底图 · 非官方</text>
      </view>
      <view class="emap__ctrl emap__ctrl--btns">
        <view class="emap__btn" hover-class="emap__btn--hover" @tap="zoomIn">＋</view>
        <view class="emap__btn" hover-class="emap__btn--hover" @tap="zoomOut">－</view>
        <view class="emap__btn emap__btn--wide" hover-class="emap__btn--hover" @tap="resetView">全图</view>
      </view>
      <view class="emap__legend">
        <text>显示 {{ clusterCount }} 簇 / {{ pointCount }} 点位 · 点簇可点按放大</text>
      </view>
    </view>
    <view v-if="!mapReady" class="emap__fallback">
      <text>示意底图需在微信小程序端查看；点位坐标请使用下方清单（复制坐标后到游戏内定位）。</text>
    </view>
  </view>
</template>

<script>
// R2-3 自绘示意底图：全部图形由代码绘制（色块/曲线/文字），不使用任何官方或第三方图片素材；
// 点位来自 BWIKI Data:Map（本项目已采集 11,692 个真实坐标），类型编号语义官方未公开。
import { useTheme } from '@/utils/theme.js';

export default {
  name: 'ExploreMap',
  props: {
    points: { type: Array, default: () => [] }
  },
  data() {
    return {
      mapReady: false,
      clusterCount: 0,
      pointCount: 0,
      // 视图状态（世界坐标 → 屏幕像素）
      vcx: 0,
      vcy: 0,
      zoom: 1,
      bounds: null,
      regionSeeds: [],
      // 内部
      ctx: null,
      canvasW: 0,
      canvasH: 0,
      dpr: 1,
      rect: null,
      drag: null,
      dark: false,
      pendingDraw: false
    };
  },
  computed: {
    regionGroups() {
      const map = new Map();
      (this.points || []).forEach((p) => {
        if (!map.has(p.regionCode)) map.set(p.regionCode, []);
        map.get(p.regionCode).push(p);
      });
      return [...map.entries()].map(([code, list]) => ({ code, list }));
    }
  },
  watch: {
    points() {
      this.recomputeBounds();
      this.requestDraw();
    }
  },
  mounted() {
    // R2-T2/F5：静态 import 主题（此前 require 在 ESM 下静默失败导致画布不跟随深色）
    try {
      const t = useTheme();
      this.dark = Boolean(t && t.isDark && t.isDark.value);
    } catch (err) { this.dark = false; }
    this.$nextTick(() => this.initCanvas());
  },
  beforeDestroy() {
    this.ctx = null;
    this.mapReady = false;
  },
  methods: {
    initCanvas(attempt) {
      const tryNo = attempt || 0;
      try {
        const query = uni.createSelectorQuery().in(this);
        query.select('#exploreCanvas').node();
        query.select('#exploreCanvas').boundingClientRect();
        query.exec((res) => {
          const nodeRes = res && res[0];
          const rect = res && res[1];
          const node = nodeRes && nodeRes.node;
          if (!node || !rect || !rect.width) {
            // 自动化/首帧场景节点可能未就绪，重试数次后再降级
            if (tryNo < 4) setTimeout(() => this.initCanvas(tryNo + 1), 900);
            else this.mapReady = false;
            return;
          }
          try {
            const dpr = (uni.getSystemInfoSync().pixelRatio) || 2;
            node.width = Math.floor(rect.width * dpr);
            node.height = Math.floor(rect.height * dpr);
            const ctx = node.getContext('2d');
            ctx.scale(dpr, dpr);
            this.ctx = ctx;
            this.canvasW = rect.width;
            this.canvasH = rect.height;
            this.dpr = dpr;
            this.rect = rect;
            this.mapReady = true;
            this.recomputeBounds();
            this.draw();
          } catch (err2) {
            if (tryNo < 4) setTimeout(() => this.initCanvas(tryNo + 1), 900);
            else this.mapReady = false;
          }
        });
      } catch (err) {
        if (tryNo < 4) setTimeout(() => this.initCanvas(tryNo + 1), 900);
        else this.mapReady = false;
      }
    },
    recomputeBounds() {
      const list = this.points || [];
      this.pointCount = list.length;
      if (!list.length) {
        this.bounds = null;
        return;
      }
      let minX = Infinity; let maxX = -Infinity; let minY = Infinity; let maxY = -Infinity;
      list.forEach((p) => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      });
      const padX = (maxX - minX) * 0.05 || 100;
      const padY = (maxY - minY) * 0.05 || 100;
      this.bounds = { minX: minX - padX, maxX: maxX + padX, minY: minY - padY, maxY: maxY + padY };
      this.regionSeeds = this.regionGroups.map((g) => g.code);
      if (this.zoom === 1) {
        this.vcx = (this.bounds.minX + this.bounds.maxX) / 2;
        this.vcy = (this.bounds.minY + this.bounds.maxY) / 2;
      }
    },
    scale() {
      if (!this.bounds) return 1;
      const spanX = this.bounds.maxX - this.bounds.minX;
      const spanY = this.bounds.maxY - this.bounds.minY;
      const base = Math.min(this.canvasW / spanX, this.canvasH / spanY);
      return base * this.zoom;
    },
    toScreen(wx, wy) {
      const s = this.scale();
      return {
        x: (wx - this.vcx) * s + this.canvasW / 2,
        y: (wy - this.vcy) * s + this.canvasH / 2
      };
    },
    toWorld(sx, sy) {
      const s = this.scale();
      return { x: (sx - this.canvasW / 2) / s + this.vcx, y: (sy - this.canvasH / 2) / s + this.vcy };
    },
    requestDraw() {
      if (this.mapReady && this.ctx) this.draw();
      else this.pendingDraw = true;
    },
    seedOf(code) {
      let h = 0;
      String(code || '').split('').forEach((ch) => { h = (h * 31 + ch.charCodeAt(0)) % 997; });
      return h;
    },
    drawLand(ctx, bounds, seed) {
      const cx = (bounds.minX + bounds.maxX) / 2;
      const cy = (bounds.minY + bounds.maxY) / 2;
      const c0 = this.toScreen(cx, cy);
      const p1 = this.toScreen(bounds.maxX, cy);
      const p2 = this.toScreen(cx, bounds.maxY);
      const rx = Math.abs(p1.x - c0.x) * 0.92;
      const ry = Math.abs(p2.y - c0.y) * 0.9;
      if (rx < 8 || ry < 8) return;
      ctx.beginPath();
      const SEG = 28;
      for (let i = 0; i <= SEG; i++) {
        const t = (i / SEG) * Math.PI * 2;
        const wob = 1 + 0.07 * Math.sin(3 * t + seed) + 0.045 * Math.sin(7 * t + seed * 1.7);
        const x = c0.x + Math.cos(t) * rx * wob;
        const y = c0.y + Math.sin(t) * ry * wob;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = this.dark ? '#173043' : '#a8d8b0';
      ctx.fill();
      ctx.strokeStyle = this.dark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.65)';
      ctx.lineWidth = 1;
      ctx.stroke();
      // 两块自绘湖泊
      for (let k = 0; k < 2; k++) {
        const lx = cx + (k === 0 ? -0.22 : 0.18) * (bounds.maxX - bounds.minX);
        const ly = cy + (k === 0 ? 0.12 : -0.2) * (bounds.maxY - bounds.minY);
        const lc = this.toScreen(lx, ly);
        const lr = Math.max(7, Math.min(rx, ry) * (k === 0 ? 0.16 : 0.11));
        ctx.beginPath();
        ctx.ellipse(lc.x, lc.y, lr * 1.35, lr, 0.5 + seed * 0.01, 0, Math.PI * 2);
        ctx.fillStyle = this.dark ? '#0e3a52' : '#8fd0e6';
        ctx.fill();
      }
      // 一条自绘河流曲线
      const r1 = this.toScreen(cx - rx * 0.5, cy - ry * 0.6);
      const r2 = this.toScreen(cx + rx * 0.4, cy + ry * 0.55);
      ctx.beginPath();
      ctx.moveTo(r1.x, r1.y);
      ctx.bezierCurveTo(r1.x + rx * 0.4, r1.y + ry * 0.2, r2.x - rx * 0.5, r2.y - ry * 0.3, r2.x, r2.y);
      ctx.strokeStyle = this.dark ? 'rgba(64,150,190,0.55)' : 'rgba(120,190,220,0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();
    },
    computeClusters() {
      const list = this.points || [];
      const CELL = 34;
      const buckets = new Map();
      list.forEach((p) => {
        const sp = this.toScreen(p.x, p.y);
        if (sp.x < -CELL || sp.y < -CELL || sp.x > this.canvasW + CELL || sp.y > this.canvasH + CELL) return;
        const key = `${Math.floor(sp.x / CELL)},${Math.floor(sp.y / CELL)}`;
        let b = buckets.get(key);
        if (!b) {
          b = { sx: 0, sy: 0, count: 0, types: {} };
          buckets.set(key, b);
        }
        b.sx += sp.x;
        b.sy += sp.y;
        b.count += 1;
        b.types[p.type] = (b.types[p.type] || 0) + 1;
      });
      const clusters = [];
      buckets.forEach((b) => {
        let dom = 0;
        let domCount = -1;
        Object.keys(b.types).forEach((t) => {
          if (b.types[t] > domCount) { domCount = b.types[t]; dom = Number(t); }
        });
        clusters.push({ x: b.sx / b.count, y: b.sy / b.count, count: b.count, type: dom, wx: 0, wy: 0 });
      });
      this.clusterCount = clusters.length;
      return clusters;
    },
    draw() {
      const ctx = this.ctx;
      if (!ctx || !this.bounds) return;
      const W = this.canvasW;
      const H = this.canvasH;
      // 海面
      ctx.fillStyle = this.dark ? '#0a2233' : '#bfe3ee';
      ctx.fillRect(0, 0, W, H);
      // 参考网格
      ctx.strokeStyle = this.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,60,90,0.08)';
      ctx.lineWidth = 1;
      for (let i = 1; i < 6; i++) {
        ctx.beginPath(); ctx.moveTo((W / 6) * i, 0); ctx.lineTo((W / 6) * i, H); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, (H / 4) * i > H ? H : (H / 4) * i); ctx.lineTo(W, (H / 4) * i > H ? H : (H / 4) * i); ctx.stroke();
      }
      // 陆地（每区域一块自绘大陆）
      this.regionGroups.forEach((g) => {
        const b = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
        g.list.forEach((p) => {
          if (p.x < b.minX) b.minX = p.x;
          if (p.x > b.maxX) b.maxX = p.x;
          if (p.y < b.minY) b.minY = p.y;
          if (p.y > b.maxY) b.maxY = p.y;
        });
        if (b.minX === Infinity) return;
        this.drawLand(ctx, b, this.seedOf(g.code));
        const label = this.toScreen((b.minX + b.maxX) / 2, b.minY);
        ctx.fillStyle = this.dark ? 'rgba(255,255,255,0.55)' : 'rgba(20,60,50,0.6)';
        ctx.font = '600 11px sans-serif';
        ctx.textAlign = 'center';
        const nameMap = { xysg: '新芽山谷', fls: '弗利斯', xllc: '待核实区域' };
        ctx.fillText(nameMap[g.code] || g.code, label.x, Math.max(14, label.y - 4));
        ctx.textAlign = 'left';
      });
      // 点簇
      const clusters = this.computeClusters();
      const PALETTE = ['#2fa84f', '#3f7fd9', '#8a5fd6', '#e8842a', '#d94f6b', '#1fa88f'];
      clusters.forEach((c) => {
        const r = Math.min(26, 9 + Math.sqrt(c.count) * 2.2);
        ctx.beginPath();
        ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
        ctx.fillStyle = PALETTE[c.type % PALETTE.length];
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = '600 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(c.count > 999 ? '999+' : String(c.count), c.x, c.y);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
      });
      // 水印与缩放提示
      ctx.fillStyle = this.dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,40,60,0.45)';
      ctx.font = '10px sans-serif';
      ctx.fillText(`×${this.zoom}`, W - 34, H - 8);
    },
    zoomIn() {
      this.zoom = Math.min(8, this.zoom * 2);
      this.draw();
    },
    zoomOut() {
      this.zoom = Math.max(1, this.zoom / 2);
      if (this.zoom === 1) this.resetView();
      else this.draw();
    },
    resetView() {
      this.zoom = 1;
      if (this.bounds) {
        this.vcx = (this.bounds.minX + this.bounds.maxX) / 2;
        this.vcy = (this.bounds.minY + this.bounds.maxY) / 2;
      }
      this.draw();
    },
    eventPoint(e) {
      const t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || {};
      const x = t.x != null ? t.x : (t.clientX || 0) - (this.rect ? this.rect.left || 0 : 0);
      const y = t.y != null ? t.y : (t.clientY || 0) - (this.rect ? this.rect.top || 0 : 0);
      return { x, y };
    },
    onTouchStart(e) {
      const p = this.eventPoint(e);
      this.drag = { sx: p.x, sy: p.y, ox: this.vcx, oy: this.vcy, moved: false };
    },
    onTouchMove(e) {
      if (!this.drag || !this.ctx) return;
      const p = this.eventPoint(e);
      const dx = p.x - this.drag.sx;
      const dy = p.y - this.drag.sy;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this.drag.moved = true;
      const s = this.scale();
      this.vcx = this.drag.ox - dx / s;
      this.vcy = this.drag.oy - dy / s;
      this.draw();
    },
    onTouchEnd(e) {
      if (this.drag && !this.drag.moved) {
        const p = this.eventPoint({ touches: e.changedTouches || [] });
        this.handleTap(p);
      }
      this.drag = null;
    },
    handleTap(p) {
      // 命中簇 → 以该簇为中心放大；空白处 → 平移中心
      const clusters = this.computeClusters();
      let hit = null;
      let best = 24;
      clusters.forEach((c) => {
        const d = Math.hypot(c.x - p.x, c.y - p.y);
        if (d < best) { best = d; hit = c; }
      });
      if (hit) {
        const w = this.toWorld(hit.x, hit.y);
        this.vcx = w.x;
        this.vcy = w.y;
        this.zoom = Math.min(8, this.zoom * 2);
        this.draw();
      }
    }
  }
};
</script>

<style>
.emap {
  margin-top: 8rpx;
}

.emap__stage {
  position: relative;
  border-radius: 20rpx;
  overflow: hidden;
  border: 1rpx solid var(--line);
}

.emap__canvas {
  width: 100%;
  height: 560rpx;
  display: block;
  background: #bfe3ee;
}

.emap__ctrl--top {
  position: absolute;
  left: 12rpx;
  top: 12rpx;
}

.emap__badge {
  display: inline-flex;
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(0, 0, 0, 0.45);
  color: #ffffff;
  font-size: 20rpx;
}

.emap__ctrl--btns {
  position: absolute;
  right: 12rpx;
  bottom: 52rpx;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.emap__btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.92);
  color: #14405c;
  font-size: 30rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.18);
}

.emap__btn--wide {
  width: auto;
  padding: 0 18rpx;
  font-size: 24rpx;
}

.emap__btn--hover {
  transform: scale(0.94);
}

.emap__legend {
  margin-top: 10rpx;
  font-size: 22rpx;
  color: var(--ink-3, #8a97a5);
}

.emap__fallback {
  padding: 40rpx 24rpx;
  border-radius: 20rpx;
  border: 1rpx dashed var(--line);
  color: var(--ink-2, #5a6a78);
  font-size: 24rpx;
  text-align: center;
}

.theme-dark .emap__canvas {
  background: #0a2233;
}
</style>
