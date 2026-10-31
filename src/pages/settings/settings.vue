<template>
  <view class="page" :class="{ 'theme-dark': isDark }">
    <view class="panel card">
      <view class="panel__title">外观主题</view>
      <view class="panel__desc">深色主题跟随设置立即生效；「跟随系统」在系统切换深色模式时自动变化。</view>
      <view class="st-options">
        <view
          v-for="option in options"
          :key="option.value"
          class="st-option" hover-class="tap-hover"
          :class="{ 'st-option--active': pref === option.value }"
          @tap="apply(option.value)"
        >
          <text class="st-option__icon">{{ option.icon }}</text>
          <text class="st-option__label">{{ option.label }}</text>
          <text v-if="pref === option.value" class="st-option__check">✓</text>
        </view>
      </view>
    </view>

    <view class="panel card">
      <view class="panel__title">资料缓存</view>
      <view class="panel__desc">{{ cacheDesc }}</view>
      <view class="st-btn" hover-class="tap-hover" @tap="clearCache">清除云端资料缓存</view>
    </view>

    <view class="panel card">
      <view class="panel__title">关于</view>
      <view class="kv__row">
        <text class="kv__key">应用版本</text>
        <text class="kv__value">v{{ APP_VERSION }}</text>
      </view>
      <view class="kv__row">
        <text class="kv__key">资料来源</text>
        <text class="kv__value">BWIKI（公测后以官方为准）</text>
      </view>
      <view class="kv__row">
        <text class="kv__key">数据说明</text>
        <text class="kv__value">{{ catalogNotice() }}</text>
      </view>
    </view>

    <view class="footnote">蓝色星原手册 · 非官方资料站</view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useTheme, setThemePref, readThemePref } from '@/utils/theme.js';
import { clearCatalogCache, catalogNotice, prefetchCatalog } from '@/services/content.js';
import { APP_VERSION } from '@/config/app.js';

const { pref, isDark } = useTheme();
const cacheVersion = ref('');

const options = [
  { value: 'light', label: '浅色', icon: '☀' },
  { value: 'dark', label: '深色', icon: '☾' },
  { value: 'auto', label: '跟随系统', icon: '◐' }
];

const cacheDesc = computed(() =>
  cacheVersion.value ? `云端资料已同步（${cacheVersion.value}）` : '当前为内置资料，云端尚未同步'
);

function apply(value) {
  setThemePref(value);
}

function clearCache() {
  clearCatalogCache();
  uni.showToast({ title: '缓存已清除', icon: 'none' });
  prefetchCatalog();
}

onShow(() => {
  pref.value = readThemePref();
  const cache = uni.getStorageSync('qbxzs:catalog-cache');
  cacheVersion.value = cache && cache.revision ? new Date(cache.fetchedAt).toLocaleDateString() : '';
});
</script>

<style>
.st-options {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
  margin-top: 20rpx;
}

.st-option {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 22rpx 24rpx;
  border-radius: 18rpx;
  border: 1rpx solid var(--line);
  background: var(--soft);
}

.st-option--active {
  border-color: var(--brand);
  background: var(--brand-soft);
}

.st-option__icon {
  font-size: 30rpx;
  color: var(--ink-2);
}

.st-option__label {
  flex: 1;
  font-size: 27rpx;
  color: var(--ink);
}

.st-option__check {
  color: var(--brand);
  font-size: 28rpx;
  font-weight: 700;
}

.st-btn {
  margin-top: 20rpx;
  padding: 20rpx 0;
  text-align: center;
  border-radius: 40rpx;
  border: 1rpx solid var(--line);
  color: var(--brand);
  font-size: 26rpx;
  background: var(--card-bg);
}
</style>
