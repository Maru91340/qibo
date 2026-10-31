<template>
  <view class="page" :class="{ 'theme-dark': isDark }">
    <!-- #ifdef H5 -->
    <view class="preview-tip">📱 当前为浏览器预览端 · 交付以微信小程序端为准</view>
    <!-- #endif -->
    <view class="banner-wrap">
      <swiper class="banner" circular autoplay :interval="5000" :duration="400" @change="onBannerChange">
        <swiper-item v-for="(item, index) in banners" :key="item.id">
          <view class="banner__card" :class="[`slide-${item.theme || 'night'}`]" hover-class="slide-hover" hover-stay-time="90" @tap="go(item.path)">
            <view class="banner__grid" />
            <image v-if="item.art" class="banner__art" :src="item.art" mode="aspectFill" />
            <view class="banner__fade" />
            <view class="banner__copy">
              <text class="banner__tag">{{ item.tag }}</text>
              <view class="banner__title">{{ item.title }}</view>
              <view class="banner__desc">{{ item.desc }}</view>
              <view class="banner__cta">
                <text>立即查看</text>
                <c-icon name="chevron-right" size="28rpx" color="#ffffff" />
              </view>
            </view>
          </view>
        </swiper-item>
      </swiper>
      <view class="banner__dots">
        <view
          v-for="(item, index) in banners"
          :key="item.id"
          class="banner__dot"
          :class="{ 'banner__dot--active': index === bannerIndex }"
        />
      </view>
    </view>

    <view class="stat-strip card">
      <view class="stat-strip__item">
        <text class="stat-strip__num">{{ stat.qibo }}</text>
        <text class="stat-strip__label">奇波</text>
      </view>
      <view class="stat-strip__item">
        <text class="stat-strip__num">{{ stat.character }}</text>
        <text class="stat-strip__label">角色</text>
      </view>
      <view class="stat-strip__item">
        <text class="stat-strip__num">{{ stat.images }}</text>
        <text class="stat-strip__label">官方图</text>
      </view>
      <view class="stat-strip__item">
        <text class="stat-strip__num">{{ stat.total }}</text>
        <text class="stat-strip__label">图鉴条目</text>
      </view>
    </view>

    <view class="searchbar">
      <cx-input
        :value="keyword"
        shape="round"
        placeholder="搜奇波、角色、灵子、物品、成就"
        @change="onKeywordChange"
        @submit="submitSearch"
      />
    </view>

    <view class="cx-notice" hover-class="tap-hover" @tap="go('/pages/guide/guide')">
      <text class="cx-notice__icon">📢</text>
      <text class="cx-notice__text">{{ notice }}</text>
      <text class="cx-notice__more">详情›</text>
    </view>

    <view v-for="group in groups" :key="group.key" class="home-group">
      <view class="section-title">
        <text>{{ group.title }}</text>
        <text class="section-title__more">{{ group.items.length }} 个板块</text>
      </view>

      <view v-if="group.mode === 'card'" class="grid-2">
        <view
          v-for="item in group.items"
          :key="item.key"
          class="section-card card section-card--art"
          hover-class="section-card--hover"
          hover-stay-time="90"
          @tap="go(item.path)"
        >
          <view class="section-card__accent" :style="{ background: item.accentGradient }" />
          <image v-if="item.art" class="section-card__art" :src="item.art" mode="aspectFill" />
          <view class="section-card__veil" />
          <view class="section-card__top">
            <view class="section-card__icon" :style="{ color: item.accent, background: item.tint }">
              <text class="section-card__emoji">{{ item.emoji }}</text>
            </view>
            <view class="section-card__arrow">
              <c-icon name="chevron-right" size="26rpx" color="#97a0b5" />
            </view>
          </view>
          <view class="section-card__title">{{ item.title }}</view>
          <view class="section-card__desc">{{ item.desc }}</view>
        </view>
      </view>

      <view v-else class="row-grid card">
        <view
          v-for="item in group.items"
          :key="item.key"
          class="row-cell"
          @tap="go(item.path)"
        >
          <text class="row-cell__title">{{ item.title }}</text>
          <text class="row-cell__tag row-cell__tag--ready" v-if="item.ready">可用</text>
          <text class="row-cell__tag" v-else>建设中</text>
        </view>
      </view>
    </view>

    <view class="footnote">{{ footer }}</view>
  </view>
</template>

<script setup>
import { useTheme } from '@/utils/theme.js';

const { isDark } = useTheme();
import { computed, ref } from 'vue';
import { onLoad, onUnload, onShareAppMessage } from '@dcloudio/uni-app';
import { getCatalog, catalogNotice, onCatalogUpdate } from '@/services/content.js';
import { APP_VERSION, GAME_NAME } from '@/config/app.js';
import { tint } from '@/utils/format.js';

const banners = ref([]);
const sections = ref([]);
const keyword = ref('');
const bannerIndex = ref(0);
const notice = ref('');
const footer = ref('');

const stat = computed(() => {
  const count = (t) => ((getCatalog(t).data || {}).items || []).length;
  const catTypes = ['spirit', 'item', 'equipment', 'material', 'food', 'fishing', 'enemy', 'dungeon', 'building', 'achievement', 'region', 'guide'];
  let images = 0;
  catTypes.forEach((t) => {
    ((getCatalog(t).data || {}).items || []).forEach((it) => { if (it.icon) images += 1; });
  });
  const total = catTypes.reduce((sum, t) => sum + count(t), 0) + count('qibo') + count('character');
  return { qibo: count('qibo'), character: count('character'), images, total };
});

const groups = computed(() => {
  const order = ['catalog', 'query', 'content', 'tool'];
  const modes = { catalog: 'card', query: 'card', content: 'row', tool: 'row' };
  return order
    .map((key) => ({
      key,
      title: { catalog: '图鉴', query: '信息查询', content: '内容与运营', tool: '工具 · 低优先级' }[key],
      mode: modes[key],
      items: sections.value.filter((item) => (item.group || 'catalog') === key)
    }))
    .filter((group) => group.items.length);
});

const BANNER_THEMES = ['night', 'dawn', 'amber'];

// 每个板块专属图标（emoji 双端一致渲染，青少年向视觉）
const SECTION_EMOJI = {
  qibo: '🐾', character: '🥇', spirit: '💎', item: '🎒', equipment: '🗡️',
  material: '🧬', food: '🍚', fishing: '🎣', enemy: '👾', dungeon: '🏰',
  building: '🏗️', achievement: '🏆', region: '🗺️',
  element: '🔄', affix: '⚔️', evolution: '⏳', station: '🏠', search: '🔍',
  team: '🛡️', beast: '🐉', tutorial: '📚', guide: '🧭', story: '📜',
  versus: '⚡', ridu: '🌙', wallpaper: '🖼️', codes: '🎁', subscribe: '🔔',
  wiki: '📖', about: '💙', settings: '⚙️', compare: '⚖️', cultivation: '📈',
  pity: '🎯', simulator: '🎲', rebate: '💰', explore: '🧭'
};

function hashIndex(key, length) {
  let hash = 0;
  const text = String(key || '');
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return length ? hash % length : 0;
}

function loadMeta() {
  const meta = getCatalog('meta').data || {};
  // 灵子图鉴图标作为轮播立绘与功能卡装饰图；重采后自动跟随更新
  const spiritItems = getCatalog('spirit').data.items || [];
  const arts = spiritItems.map((entry) => entry.icon).filter(Boolean);
  banners.value = (meta.banners || []).map((item, index) =>
    Object.assign({}, item, {
      theme: BANNER_THEMES[index % BANNER_THEMES.length],
      art: arts.length ? arts[hashIndex(item.id || index, arts.length)] : ''
    })
  );
  sections.value = (meta.sections || []).map((item, index) =>
    Object.assign({}, item, {
      emoji: SECTION_EMOJI[item.key] || '✦',
      tint: tint(item.accent || '#2f6bff'),
      accentGradient: `linear-gradient(90deg, ${hexFade(item.accent || '#2f6bff', 0)}, ${item.accent || '#2f6bff'} 38%, ${hexFade(item.accent || '#2f6bff', 0.72)})`,
      art: arts.length ? arts[hashIndex(item.key || index, arts.length)] : ''
    })
  );
  notice.value = meta.notice || '';
  footer.value = `v${APP_VERSION} · ${GAME_NAME} · ${catalogNotice()}`;
}

function hexFade(hex, alpha) {
  const value = String(hex || '').replace('#', '');
  if (value.length !== 6) return `rgba(47, 107, 255, ${alpha})`;
  const num = parseInt(value, 16);
  return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
}

function onBannerChange(event) {
  bannerIndex.value = event.detail.current;
}

function onKeywordChange(event) {
  keyword.value = event.detail.value;
}

function submitSearch() {
  uni.navigateTo({ url: `/pages/search/search?keyword=${encodeURIComponent(keyword.value.trim())}` });
}

function go(path) {
  if (path) uni.navigateTo({ url: path });
}

let unsubscribe = null;
onLoad(() => loadMeta());
onShareAppMessage(() => ({ title: '蓝色星原助手 · 奇波/角色图鉴与队伍编成', path: '/pages/index/index' }));
unsubscribe = onCatalogUpdate(loadMeta);
onUnload(() => unsubscribe && unsubscribe());
</script>

<style>
.banner-wrap {
  position: relative;
}

.banner {
  height: 320rpx;
}

.banner__card {
  position: relative;
  box-sizing: border-box;
  height: 300rpx;
  overflow: hidden;
  border-radius: var(--radius-lg);
  color: #fff;
  box-shadow: 0 16rpx 40rpx rgba(31, 61, 158, 0.22);
  transition: transform 0.16s ease;
}

.slide-night {
  background: linear-gradient(132deg, #262c54 0%, #413a86 58%, #6a4bb8 100%);
}

.slide-dawn {
  background: linear-gradient(132deg, #31549f 0%, #5f83d8 55%, #93b2ef 100%);
}

.slide-amber {
  background: linear-gradient(132deg, #8c4a17 0%, #c9772c 55%, #e8a75c 100%);
}

.slide-hover {
  transform: scale(0.985);
}

.banner__grid {
  position: absolute;
  inset: 0;
  z-index: 0;
  opacity: 0.28;
  background-image: radial-gradient(rgba(255, 255, 255, 0.8) 1.5rpx, transparent 1.5rpx);
  background-size: 22rpx 22rpx;
}

/* 立绘作氛围层：右下角铺陈，左缘渐隐融入渐变底 */
.banner__art {
  position: absolute;
  right: -20rpx;
  bottom: -20rpx;
  z-index: 0;
  width: 360rpx;
  height: 320rpx;
  opacity: 0.42;
  filter: saturate(1.08);
  -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 34%);
  mask-image: linear-gradient(90deg, transparent 0%, #000 34%);
}

.banner__fade {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(90deg, rgba(17, 21, 44, 0.55) 0%, rgba(17, 21, 44, 0.18) 55%, rgba(17, 21, 44, 0) 100%);
}

.slide-amber .banner__fade {
  background: linear-gradient(90deg, rgba(56, 26, 5, 0.55) 0%, rgba(56, 26, 5, 0.18) 55%, rgba(56, 26, 5, 0) 100%);
}

.banner__copy {
  position: relative;
  z-index: 2;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 80%;
  height: 100%;
  padding: 36rpx 40rpx;
}

.banner__tag {
  align-self: flex-start;
  display: inline-block;
  padding: 8rpx 22rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.22);
  border: 1rpx solid rgba(255, 255, 255, 0.5);
  font-size: 22rpx;
  letter-spacing: 1rpx;
}

.banner__title {
  margin-top: 22rpx;
  font-size: 42rpx;
  font-weight: 800;
  line-height: 1.25;
  text-shadow: 0 2rpx 12rpx rgba(12, 16, 40, 0.35);
}

.banner__desc {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  margin-top: 12rpx;
  max-width: 440rpx;
  height: 76rpx;
  font-size: 24rpx;
  line-height: 1.6;
  opacity: 0.88;
}

.banner__cta {
  position: absolute;
  left: 40rpx;
  bottom: 30rpx;
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  padding: 12rpx 28rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.92);
  color: #1f3d9e;
  font-size: 24rpx;
  font-weight: 700;
  box-shadow: 0 6rpx 16rpx rgba(10, 14, 38, 0.3);
}

.banner__dots {
  display: flex;
  justify-content: center;
  gap: 12rpx;
  margin: 18rpx 0 28rpx;
}

.banner__dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: var(--line);
  transition: all 0.3s ease;
}

.banner__dot--active {
  width: 34rpx;
  border-radius: 999rpx;
  background: var(--brand);
}

.searchbar {
  padding: 4rpx 0 24rpx;
}

.home-group {
  margin-bottom: 8rpx;
}

.section-card {
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
  min-height: 250rpx;
  padding: 28rpx 26rpx;
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}

.section-card--hover {
  transform: scale(0.98);
}

/* 顶部彩色 accent 条（参考 wxq-uniapp entry-accent） */
.section-card__accent {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  z-index: 3;
  height: 6rpx;
  opacity: 0.88;
}

/* 灵子图作装饰层：右下角，向左渐隐，不压文字 */
.section-card__art {
  position: absolute;
  right: -14rpx;
  bottom: -16rpx;
  z-index: 0;
  width: 220rpx;
  height: 220rpx;
  opacity: 0.5;
  -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 40%);
  mask-image: linear-gradient(90deg, transparent 0%, #000 40%);
  pointer-events: none;
}

/* 白色渐变盖层：保证左侧文字在装饰图上可读（深色主题换深色渐变） */
.section-card--art::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.96) 0%, rgba(255, 255, 255, 0.86) 58%, rgba(255, 255, 255, 0.12) 100%);
  pointer-events: none;
}

.theme-dark .section-card--art::after {
  background: linear-gradient(90deg, rgba(28, 34, 51, 0.96) 0%, rgba(28, 34, 51, 0.86) 58%, rgba(28, 34, 51, 0.12) 100%);
}

.section-card__top {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.section-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 84rpx;
  height: 84rpx;
  border-radius: 24rpx;
}

.section-card__emoji {
  font-size: 44rpx;
  line-height: 1;
}

.section-card__arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: var(--soft);
}

.section-card__title {
  position: relative;
  z-index: 2;
  margin-top: 26rpx;
  font-size: 32rpx;
  font-weight: 600;
}

.section-card__desc {
  position: relative;
  z-index: 2;
  margin-top: 10rpx;
  font-size: 23rpx;
  line-height: 1.55;
  color: var(--ink-2);
}

.row-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
  padding: 22rpx;
}

.row-cell {
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  min-height: 64rpx;
  padding: 0 24rpx;
  border-radius: 32rpx;
  background: var(--soft);
  border: 1rpx solid var(--line);
  transition: transform 0.16s ease;
}

.row-cell:active {
  transform: scale(0.97);
}

.row-cell__title {
  font-size: 24rpx;
  color: var(--ink);
}

.row-cell__tag {
  font-size: 20rpx;
  color: var(--ink-3);
}

.row-cell__tag--ready {
  color: var(--ok);
}

.preview-tip {
  padding: 12rpx 0 4rpx;
  text-align: center;
  color: var(--ink-3);
  font-size: 22rpx;
}

.stat-strip {
  display: flex;
  padding: 20rpx 0;
  margin-bottom: 8rpx;
}

.stat-strip__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}

.stat-strip__num {
  font-size: 32rpx;
  font-weight: 800;
  color: var(--brand);
}

.stat-strip__label {
  font-size: 21rpx;
  color: var(--ink-3);
}
</style>
