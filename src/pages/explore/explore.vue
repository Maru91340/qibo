<template>
  <view class="page" :class="{ 'theme-dark': isDark }">
    <view class="stub card">
      <view class="stub__icon">🚧</view>
      <view class="stub__title">地图探索 · 建设中</view>
      <view class="stub__desc">该板块正在按优先级排期开发，公测前后续版本上线；先去图鉴和查询页逛逛吧。</view>
      <view class="stub__back" hover-class="stub__back--hover" hover-stay-time="90" @tap="goHome">返回首页</view>
    </view>
  </view>
</template>

<script setup>
import { useTheme } from '@/utils/theme.js';

const { isDark } = useTheme();

function goHome() {
  uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/index/index' }) });
}
</script>

<style>
.stub {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18rpx;
  margin-top: 30vh;
  padding: 60rpx 44rpx;
  text-align: center;
}

.stub__icon {
  font-size: 72rpx;
}

.stub__title {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--ink);
}

.stub__desc {
  color: var(--ink-2);
  font-size: 25rpx;
  line-height: 1.7;
}

.stub__back {
  margin-top: 12rpx;
  padding: 20rpx 64rpx;
  border-radius: 999rpx;
  background: var(--brand);
  color: #fff;
  font-size: 26rpx;
  font-weight: 600;
  transition: transform 0.16s ease;
}

.stub__back--hover {
  transform: scale(0.96);
}
</style>
