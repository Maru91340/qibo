<template>
  <view class="page" :class="{ 'theme-dark': isDark }">
    <template v-if="item">
      <view class="wallpaper-stage card" :style="{ background: gradientOf(item) }">
        <text class="wallpaper-stage__glyph">{{ item.title.slice(0, 1) }}</text>
        <view class="wallpaper-stage__veil" />
        <view class="wallpaper-stage__copy">
          <text class="wallpaper-stage__cat">{{ item.category }}</text>
          <view class="wallpaper-stage__title">{{ item.title }}</view>
        </view>
      </view>

      <view class="panel card">
        <view class="panel__title">
          <text>壁纸说明</text>
          <text class="ct-tag ct-tag--warn">示例预览</text>
        </view>
        <view class="panel__desc panel__desc--first">{{ item.desc }}</view>
        <view class="kv__row">
          <text class="kv__key">分类</text>
          <text class="kv__value">{{ item.category }}</text>
        </view>
        <view class="kv__row">
          <text class="kv__key">原图状态</text>
          <text class="kv__value">待官方源接入</text>
        </view>
        <view class="kv__row">
          <text class="kv__key">保存方式</text>
          <text class="kv__value">原图接入后开放</text>
        </view>
      </view>

      <view class="panel card">
        <view class="panel__title">为什么现在不能保存</view>
        <view class="panel__desc panel__desc--first">
          当前仅用纯色渐变与标题字占位做氛围预览，不展示来源不明的图片。官方壁纸源确认后，会替换为大图并提供保存入口。
        </view>
        <view class="ct-actions">
          <view class="ct-btn" hover-class="ct-btn--hover" @tap="goSubscribe">订阅上线提醒</view>
          <view class="ct-btn ct-btn--ghost" hover-class="ct-btn--hover" @tap="goList">返回画廊</view>
        </view>
      </view>

      <view class="section-title">
        <text>同一分类</text>
        <text class="section-title__more">{{ related.length }} 张</text>
      </view>
      <view class="related-grid">
        <view
          v-for="entry in related"
          :key="entry.id"
          class="related-card card"
          hover-class="related-card--hover"
          hover-stay-time="90"
          @tap="openRelated(entry)"
        >
          <view class="related-card__cover" :style="{ background: gradientOf(entry) }">
            <text class="related-card__glyph">{{ entry.title.slice(0, 1) }}</text>
          </view>
          <view class="related-card__title">{{ entry.title }}</view>
        </view>
      </view>

      <view class="ct-source">占位预览不构成官方素材；游戏壁纸版权归原作者所有。</view>
    </template>

    <view v-else class="ct-empty">
      <view class="ct-empty__icon">∅</view>
      <view class="ct-empty__title">找不到这张壁纸</view>
      <view class="ct-empty__text">可能已被替换，返回画廊重新选择。</view>
      <view class="ct-actions">
        <view class="ct-btn" hover-class="ct-btn--hover" @tap="goList">返回画廊</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { useTheme } from '@/utils/theme.js';

const { isDark } = useTheme();
import { computed, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { wallpapers } from '@/data/content.js';

const id = ref('');
const item = computed(() => wallpapers.filter((entry) => entry.id === id.value)[0] || null);
const related = computed(() => {
  if (!item.value) return [];
  return wallpapers
    .filter((entry) => entry.category === item.value.category && entry.id !== item.value.id)
    .slice(0, 4);
});

function gradientOf(entry) {
  return `linear-gradient(150deg, ${entry.colors[0]} 0%, ${entry.colors[1]} 100%)`;
}

function openRelated(entry) {
  uni.redirectTo({ url: `/pages/wallpaper/detail?id=${entry.id}` });
}

function goList() {
  uni.navigateBack({ fail: () => uni.redirectTo({ url: '/pages/wallpaper/list' }) });
}

function goSubscribe() {
  uni.navigateTo({ url: '/pages/subscribe/subscribe' });
}

onLoad((options) => {
  id.value = (options && options.id) || '';
});
</script>

<style>
.wallpaper-stage {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 760rpx;
  margin-bottom: 24rpx;
  overflow: hidden;
}

.wallpaper-stage__glyph {
  color: rgba(255, 255, 255, 0.32);
  font-size: 300rpx;
  font-weight: 700;
  line-height: 1;
}

.wallpaper-stage__veil {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 45%, rgba(17, 21, 44, 0.62) 100%);
}

.wallpaper-stage__copy {
  position: absolute;
  left: 32rpx;
  right: 32rpx;
  bottom: 32rpx;
  color: #fff;
}

.wallpaper-stage__cat {
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.2);
  font-size: 20rpx;
}

.wallpaper-stage__title {
  margin-top: 12rpx;
  font-size: 40rpx;
  font-weight: 700;
}

.related-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.related-card {
  overflow: hidden;
  transition: transform 0.16s ease;
}

.related-card--hover {
  transform: scale(0.97);
}

.related-card__cover {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200rpx;
}

.related-card__glyph {
  color: rgba(255, 255, 255, 0.34);
  font-size: 96rpx;
  font-weight: 700;
}

.related-card__title {
  padding: 14rpx 18rpx 18rpx;
  color: var(--ink);
  font-size: 24rpx;
  font-weight: 600;
}
</style>
