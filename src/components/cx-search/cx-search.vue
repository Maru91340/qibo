<template>
  <view class="cx-search" hover-class="cx-search--hover" hover-stay-time="90" @tap="$emit('tap')">
    <text class="cx-search__icon">🔍</text>
    <text class="cx-search__text">{{ placeholder }}</text>
    <view class="cx-search__go">
      <text>搜索</text>
    </view>
  </view>
</template>

<script setup>
defineProps({
  placeholder: { type: String, default: '搜索' }
});
defineEmits(['tap']);
</script>

<style>
.cx-search {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 18rpx 26rpx;
  border-radius: 999rpx;
  background: var(--card-bg);
  border: 1rpx solid var(--line);
  box-shadow: var(--shadow-card);
  transition: transform 0.16s ease;
}

.cx-search--hover {
  transform: scale(0.98);
}

.cx-search__icon {
  font-size: 30rpx;
}

.cx-search__text {
  flex: 1;
  min-width: 0;
  color: var(--ink-3);
  font-size: 26rpx;
}

.cx-search__go {
  padding: 8rpx 22rpx;
  border-radius: 999rpx;
  background: var(--brand-soft);
  color: var(--brand);
  font-size: 23rpx;
  font-weight: 700;
}
</style>
