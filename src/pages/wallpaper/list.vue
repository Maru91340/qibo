<template>
  <view class="page" :class="{ 'theme-dark': isDark }">
    <view class="page-hero wallpaper-hero">
      <view class="page-hero__inner">
        <text class="page-hero__eyebrow">内容与运营</text>
        <view class="page-hero__title">壁纸画廊</view>
        <view class="page-hero__sub">官方壁纸与活动贺图占位预览，原图接入后可保存到相册。</view>
        <view class="page-hero__meta">
          <text class="page-hero__tag">{{ items.length }} 张</text>
          <text class="page-hero__tag">{{ categories.length - 1 }} 个分类</text>
          <text class="page-hero__tag">示例预览</text>
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
        <view class="wallpaper-card__cover" :style="{ background: gradientOf(item) }">
          <text class="wallpaper-card__glyph">{{ item.title.slice(0, 1) }}</text>
          <view class="wallpaper-card__veil" />
          <text class="wallpaper-card__cat">{{ item.category }}</text>
        </view>
        <view class="wallpaper-card__body">
          <view class="wallpaper-card__title">{{ item.title }}</view>
          <view class="wallpaper-card__note">{{ item.desc }}</view>
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

    <view class="ct-source">当前为占位预览，不使用来源不明的图片；官方壁纸接入后替换并开放保存。</view>
  </view>
</template>

<script setup>
import { useTheme } from '@/utils/theme.js';

const { isDark } = useTheme();
import { computed, ref } from 'vue';
import { onShareAppMessage } from '@dcloudio/uni-app';
import { wallpapers } from '@/data/content.js';

const items = wallpapers;
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
  uni.navigateTo({ url: `/pages/wallpaper/detail?id=${item.id}` });
}

onShareAppMessage(() => ({ title: '壁纸画廊 · 蓝色星原助手', path: '/pages/wallpaper/list' }));
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
</style>
