<template>
  <view class="page" :class="{ 'theme-dark': isDark }">
    <view class="page-hero" :style="{ background: 'linear-gradient(132deg, #262c54 0%, #d9a514 58%, #7f5bff 100%)' }">
      <view class="page-hero__inner">
        <text class="page-hero__eyebrow">信息查询</text>
        <view class="page-hero__title">我的收藏</view>
        <view class="page-hero__sub">收藏只保存在本机，不上传；点条目直达详情。</view>
        <view class="page-hero__meta">
          <text class="page-hero__tag">共 {{ list.length }} 条</text>
        </view>
      </view>
    </view>

    <view v-for="group in groups" :key="group.label" class="panel card">
      <view class="panel__title">{{ group.label }}</view>
      <view
        v-for="fav in group.items"
        :key="fav.type + fav.id"
        class="fav-item"
        hover-class="fav-item--hover"
        hover-stay-time="90"
        @tap="go(fav)"
      >
        <image v-if="fav.icon && !broken[fav.id]" class="fav-item__img" :src="fav.icon" mode="aspectFill" @error="broken[fav.id] = true" />
        <view v-else class="fav-item__glyph">{{ (fav.name || '?').slice(0, 1) }}</view>
        <view class="fav-item__body">
          <text class="fav-item__name">{{ fav.name }}</text>
          <text class="fav-item__type">{{ fav.label }}</text>
        </view>
        <text class="fav-item__remove" hover-class="tap-hover" @tap.stop="remove(fav)">移除</text>
      </view>
    </view>

    <view v-if="!list.length" class="fav-empty">
      <view class="fav-empty__icon">⭐</view>
      <view class="fav-empty__text">还没有收藏，去图鉴里点亮星星吧</view>
      <view class="fav-empty__back" hover-class="tap-hover" @tap="goHome">去图鉴逛逛</view>
    </view>
    <view class="footnote">收藏保存在本机 · 清除小程序数据会一并清空</view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue';
import { onShow, onShareAppMessage } from '@dcloudio/uni-app';
import { useTheme } from '@/utils/theme.js';
import { listFavs, removeFav, favPath } from '@/utils/favorites.js';

const { isDark } = useTheme();
const list = ref([]);
const broken = ref({});

const TYPE_LABELS = {
  qibo: '奇波', character: '角色', spirit: '灵子', item: '物品', equipment: '装备',
  material: '材料', food: '美食', fishing: '钓鱼', enemy: '敌人', dungeon: '副本',
  building: '建筑', region: '地区', affix: '战斗词条', guide: '攻略'
};

const groups = computed(() => {
  const map = new Map();
  list.value.forEach((fav) => {
    const label = TYPE_LABELS[fav.type] || fav.type;
    if (!map.has(label)) map.set(label, []);
    map.get(label).push(fav);
  });
  return [...map.entries()].map(([label, items]) => ({ label, items }));
});

function refresh() {
  list.value = listFavs();
}

function go(fav) {
  uni.navigateTo({ url: favPath(fav) });
}

function remove(fav) {
  removeFav(fav.type, fav.id);
  refresh();
  uni.showToast({ title: '已移除', icon: 'none' });
}

function goHome() {
  uni.reLaunch({ url: '/pages/index/index' });
}

onShow(() => refresh());

onShareAppMessage(() => ({ title: '我的收藏 · 蓝色星原助手', path: '/pages/index/index' }));
</script>

<style>
.fav-item {
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 18rpx 0;
  border-bottom: 1rpx solid var(--line);
  transition: background 0.2s ease;
}

.fav-item--hover {
  background: var(--soft);
}

.fav-item__img {
  flex: none;
  width: 76rpx;
  height: 76rpx;
  border-radius: 20rpx;
  background: var(--soft);
}

.fav-item__glyph {
  flex: none;
  width: 76rpx;
  height: 76rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20rpx;
  background: var(--brand-soft);
  color: var(--brand);
  font-size: 32rpx;
  font-weight: 700;
}

.fav-item__body {
  flex: 1;
  min-width: 0;
}

.fav-item__name {
  display: block;
  font-size: 27rpx;
  font-weight: 600;
  color: var(--ink);
}

.fav-item__type {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: var(--ink-3);
}

.fav-item__remove {
  flex-shrink: 0;
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  border: 1rpx solid var(--line);
  color: var(--ink-2);
  font-size: 22rpx;
}

.fav-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  padding: 120rpx 0 60rpx;
}

.fav-empty__icon {
  font-size: 64rpx;
}

.fav-empty__text {
  color: var(--ink-3);
  font-size: 25rpx;
}

.fav-empty__back {
  margin-top: 10rpx;
  padding: 18rpx 56rpx;
  border-radius: 999rpx;
  background: var(--brand);
  color: #fff;
  font-size: 25rpx;
  font-weight: 600;
}
</style>
