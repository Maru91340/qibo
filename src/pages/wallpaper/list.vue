<template>
  <view class="page" :class="{ 'theme-dark': isDark }">
    <view class="page-hero wallpaper-hero">
      <view class="page-hero__inner">
        <text class="page-hero__eyebrow">内容与运营</text>
        <view class="page-hero__title">壁纸画廊</view>
        <view class="page-hero__sub">官方壁纸 · 节日贺图 · 过场图（BWIKI 收录，点击可查看大图）</view>
        <view class="page-hero__meta">
          <text class="page-hero__tag">{{ items.length }} 张</text>
          <text class="page-hero__tag">{{ categories.length - 1 }} 个分类</text>
        </view>
      </view>
    </view>

    <view class="filter-bar card">
      <scroll-view scroll-x class="ct-cats">
        <view class="ct-cats__inner">
          <view
            v-for="option in categories"
            :key="option"
            class="facet-chip"
            :class="{ 'facet-chip--active': option === category }"
            hover-class="facet-chip--hover"
            hover-stay-time="90"
            @tap="category = option"
          >
            {{ option }}
          </view>
        </view>
      </scroll-view>
    </view>

    <view class="list-head">
      <text>命中 {{ list.length }} 张</text>
      <text class="text-muted">共 {{ items.length }} 张</text>
    </view>

    <view class="wallpaper-grid">
      <view
        v-for="item in list"
        :key="item.id"
        class="wallpaper-card card"
        hover-class="wallpaper-card--hover"
        hover-stay-time="90"
        @tap="goDetail(item)"
      >
        <view class="wallpaper-card__cover">
          <image
            v-if="item.url && !brokenIcons[item.id]"
            class="wallpaper-card__img"
            :src="item.url"
            mode="aspectFill"
            lazy-load
            @error="brokenIcons[item.id] = true"
          />
          <view v-else class="wallpaper-card__cover wallpaper-card__cover--ph" :style="{ background: gradientOf(item) }">
            <text class="wallpaper-card__glyph">{{ item.title.slice(0, 1) }}</text>
          </view>
          <view class="wallpaper-card__veil" />
          <text class="wallpaper-card__cat">{{ item.category }}</text>
        </view>
        <view class="wallpaper-card__body">
          <view class="wallpaper-card__title">{{ item.title }}</view>
          <view v-if="item.desc" class="wallpaper-card__note">{{ item.desc }}</view>
        </view>
      </view>
    </view>

    <view v-if="!list.length" class="ct-empty">
      <view class="ct-empty__icon">◌</view>
      <view class="ct-empty__title">该分类暂无壁纸</view>
      <view class="ct-empty__text">切回「全部」，或订阅上线提醒等官方原图。</view>
      <view class="ct-actions">
        <view class="ct-btn" hover-class="ct-btn--hover" @tap="category = '全部'">查看全部</view>
      </view>
    </view>

    <view class="ct-source">图片来源：BWIKI 官方壁纸页（tgs2025 / Comic World 330 / 动态 / 星至测试 / 官网），点击可查看大图。</view>
  </view>
</template>

<script setup>
import { useTheme } from '@/utils/theme.js';

const { isDark } = useTheme();
import { computed, ref } from 'vue';
import { onShareAppMessage } from '@dcloudio/uni-app';
import wallpaperData from '@/data/generated/wallpapers.json';
import { cloudDetailAsset } from '@/data/site-images.js';

const brokenIcons = ref({});
// 文件名转友好标题：去扩展名与 hash 后缀（如 banner.25882074.jpg → banner）
function prettyName(item) {
  if (item.note) {
    const fromNote = item.note.split('：')[0].trim();
    if (fromNote) return fromNote.slice(0, 18);
  }
  return item.name.replace(/\.[a-z0-9]+$/i, '').replace(/\.[a-f0-9]{6,}$/i, '');
}
const items = wallpaperData.groups.flatMap((group) =>
  group.items.map((item, idx) => ({
    id: group.label + '-' + idx,
    title: prettyName(item),
    desc: item.note,
    category: group.label,
    // patchwiki 原图：微信端转 cloud:// detail-assets/BWIKI采集图/<原名>，H5 保持热链
    url: cloudDetailAsset(item.url)
  }))
);
const category = ref('全部');

const categories = computed(() => {
  const seen = [];
  items.forEach((item) => {
    if (seen.indexOf(item.category) < 0) seen.push(item.category);
  });
  return ['全部'].concat(seen);
});

const list = computed(() =>
  category.value === '全部' ? items : items.filter((item) => item.category === category.value)
);

function gradientOf(item) {
  return `linear-gradient(150deg, ${item.colors[0]} 0%, ${item.colors[1]} 100%)`;
}

function goDetail(item) {
  if (item.url) {
    uni.previewImage({ urls: [item.url], current: item.url });
    return;
  }
  uni.navigateTo({ url: `/pages/wallpaper/detail?id=${item.id}` });
}

onShareAppMessage(() => ({ title: '壁纸画廊 · 奇波小助手', path: '/pages/wallpaper/list' }));
</script>

<style>
.wallpaper-hero {
  background: linear-gradient(135deg, #1f3d9e 0%, #4a8ab8 55%, #8fd0c8 100%);
}

.wallpaper-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.wallpaper-card {
  overflow: hidden;
  transition: transform 0.16s ease;
}

.wallpaper-card--hover {
  transform: scale(0.97);
}

.wallpaper-card__cover {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 280rpx;
  overflow: hidden;
}

.wallpaper-card__glyph {
  color: rgba(255, 255, 255, 0.34);
  font-size: 150rpx;
  font-weight: 700;
  line-height: 1;
}

.wallpaper-card__veil {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 45%, rgba(17, 21, 44, 0.4) 100%);
}

.wallpaper-card__cat {
  position: absolute;
  left: 16rpx;
  bottom: 14rpx;
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.9);
  color: var(--brand-deep);
  font-size: 20rpx;
  font-weight: 600;
}

.wallpaper-card__body {
  padding: 18rpx 20rpx 22rpx;
}

.wallpaper-card__title {
  color: var(--ink);
  font-size: 27rpx;
  font-weight: 600;
}

.wallpaper-card__note {
  margin-top: 6rpx;
  color: var(--ink-3);
  font-size: 21rpx;
  line-height: 1.5;
}

.wallpaper-card__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.wallpaper-card__cover--ph {
  position: absolute;
  inset: 0;
}
</style>
