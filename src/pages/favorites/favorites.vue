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

    <view class="seg card">
      <view class="seg__item" :class="{ 'seg__item--on': tab === 'fav' }" hover-class="tap-hover" @tap="tab = 'fav'">
        ⭐ 收藏{{ list.length ? ' ' + list.length : '' }}
      </view>
      <view class="seg__item" :class="{ 'seg__item--on': tab === 'recent' }" hover-class="tap-hover" @tap="tab = 'recent'">
        🕐 最近{{ recents.length ? ' ' + recents.length : '' }}
      </view>
    </view>

    <template v-if="tab === 'fav'">
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
    </template>

    <template v-else>
    <view class="panel card">
      <view class="panel__title">最近浏览</view>
      <view
        v-for="rec in recents"
        :key="rec.type + rec.id"
        class="fav-item"
        hover-class="fav-item--hover"
        hover-stay-time="90"
        @tap="go(rec)"
      >
        <image v-if="rec.icon && !broken[rec.id]" class="fav-item__img" :src="rec.icon" mode="aspectFill" @error="broken[rec.id] = true" />
        <view v-else class="fav-item__glyph">{{ (rec.name || '?').slice(0, 1) }}</view>
        <view class="fav-item__body">
          <text class="fav-item__name">{{ rec.name }}</text>
          <text class="fav-item__type">{{ TYPE_LABELS[rec.type] || rec.type }}</text>
        </view>
        <text class="fav-item__time">{{ timeAgo(rec.ts) }}</text>
      </view>
      <view v-if="recents.length" class="fav-clear" hover-class="tap-hover" @tap="clearAll">清空浏览记录</view>
    </view>
    <view v-if="!recents.length" class="fav-empty">
      <view class="fav-empty__icon">🕐</view>
      <view class="fav-empty__text">暂无浏览记录，看过的条目会出现在这里</view>
    </view>
    </template>
    <view class="footnote">收藏保存在本机 · 清除小程序数据会一并清空</view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue';
import { onShow, onShareAppMessage } from '@dcloudio/uni-app';
import { useTheme } from '@/utils/theme.js';
import { listFavs, removeFav, favPath } from '@/utils/favorites.js';
import { listRecent, clearRecent } from '@/utils/recent.js';

const { isDark } = useTheme();
const list = ref([]);
const recents = ref([]);
const tab = ref('fav');
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
  recents.value = listRecent();
}

function go(fav) {
  uni.navigateTo({ url: favPath(fav) });
}

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  if (diff < 3600000) return Math.max(1, Math.floor(diff / 60000)) + ' 分钟前';
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前';
  return Math.floor(diff / 86400000) + ' 天前';
}

function clearAll() {
  clearRecent();
  refresh();
  uni.showToast({ title: '已清空', icon: 'none' });
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
.seg {
  display: flex;
  gap: 12rpx;
  padding: 12rpx;
  margin-bottom: 20rpx;
}

.seg__item {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  border-radius: 999rpx;
  color: var(--ink-2);
  font-size: 25rpx;
  font-weight: 600;
  background: var(--soft);
  transition: all 0.2s ease;
}

.seg__item--on {
  background: var(--brand);
  color: #ffffff;
}

.fav-item__time {
  flex-shrink: 0;
  color: var(--ink-3);
  font-size: 21rpx;
}

.fav-clear {
  margin-top: 16rpx;
  text-align: center;
  color: var(--ink-3);
  font-size: 23rpx;
  padding: 12rpx 0;
}


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
