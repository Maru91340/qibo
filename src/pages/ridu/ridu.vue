<template>
  <view class="page" :class="{ 'theme-dark': isDark }">
    <view class="page-hero ridu-hero">
      <view class="page-hero__inner">
        <text class="page-hero__eyebrow">内容与运营</text>
        <view class="page-hero__title">日渡尘影</view>
        <view class="page-hero__sub">按分类浏览剧情与世界观资料，详情复用剧情读物条目。</view>
        <view class="page-hero__meta">
          <text class="page-hero__tag">{{ cards.length }} 个分类</text>
          <text class="page-hero__tag">{{ total }} 篇资料</text>
          <text class="page-hero__tag">公测后补全</text>
        </view>
      </view>
    </view>

    <view
      v-for="card in cards"
      :key="card.key"
      class="ridu-card card"
      hover-class="ridu-card--hover"
      hover-stay-time="90"
      @tap="goCategory(card.key)"
    >
      <view class="ridu-card__badge" :style="{ background: tint(card.accent), color: card.accent }">
        {{ card.title.slice(0, 1) }}
      </view>
      <view class="ridu-card__text">
        <view class="ridu-card__title">{{ card.title }}</view>
        <view class="ridu-card__desc">{{ card.desc }}</view>
      </view>
      <view class="ridu-card__count">
        <text class="ridu-card__num">{{ card.count }}</text>
        <text class="ridu-card__unit">篇</text>
      </view>
    </view>

    <view class="section-title">
      <text>最近整理</text>
      <text class="section-title__more section-title__more--action" hover-class="tap-hover" @tap="goList">全部剧情读物 ›</text>
    </view>

    <view class="panel card">
      <view
        v-for="item in recent"
        :key="item.id"
        class="ridu-row"
        hover-class="ridu-row--hover"
        hover-stay-time="90"
        @tap="goDetail(item)"
      >
        <view class="ridu-row__text">
          <view class="ridu-row__title">
            <text>{{ item.title }}</text>
            <text v-if="!item.verified" class="ct-tag ct-tag--warn">待核实</text>
          </view>
          <view class="ridu-row__desc">{{ item.summary }}</view>
        </view>
        <text class="ridu-row__arrow">›</text>
      </view>
    </view>

    <view class="ct-source">「日渡尘影」当前复用剧情读物数据；官方独立分类与条目待公测后补充。</view>
  </view>
</template>

<script setup>
import { useTheme } from '@/utils/theme.js';

const { isDark } = useTheme();
import { computed } from 'vue';
import { onShareAppMessage } from '@dcloudio/uni-app';
import { getContentCollection, riduCategories } from '@/data/content.js';
import { tint } from '@/utils/format.js';

const stories = getContentCollection('story').items;
const total = stories.length;

const cards = computed(() =>
  riduCategories.map((card) =>
    Object.assign({}, card, {
      count: stories.filter((item) => item.category === card.key).length
    })
  )
);

const recent = computed(() => stories.slice(0, 6));

function goCategory(key) {
  uni.navigateTo({ url: `/pages/story/list?category=${encodeURIComponent(key)}` });
}

function goList() {
  uni.navigateTo({ url: '/pages/story/list' });
}

function goDetail(item) {
  uni.navigateTo({ url: `/pages/story/detail?id=${item.id}` });
}

onShareAppMessage(() => ({ title: '日渡尘影 · 蓝色星原助手', path: '/pages/ridu/ridu' }));
</script>

<style>
.ridu-hero {
  background: linear-gradient(135deg, #2a2340 0%, #7f5bff 58%, #d9a514 100%);
}

.ridu-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 20rpx;
  padding: 26rpx;
  transition: transform 0.16s ease;
}

.ridu-card--hover {
  transform: scale(0.985);
}

.ridu-card__badge {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 80rpx;
  height: 80rpx;
  border-radius: 24rpx;
  font-size: 34rpx;
  font-weight: 700;
}

.ridu-card__text {
  flex: 1;
  min-width: 0;
}

.ridu-card__title {
  color: var(--ink);
  font-size: 29rpx;
  font-weight: 600;
}

.ridu-card__desc {
  margin-top: 6rpx;
  color: var(--ink-2);
  font-size: 23rpx;
  line-height: 1.6;
}

.ridu-card__count {
  flex: none;
  text-align: right;
}

.ridu-card__num {
  color: var(--brand);
  font-size: 34rpx;
  font-weight: 700;
}

.ridu-card__unit {
  margin-left: 4rpx;
  color: var(--ink-3);
  font-size: 20rpx;
}

.ridu-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 0;
  border-bottom: 1rpx solid var(--line);
  transition: transform 0.16s ease;
}

.ridu-row:last-child {
  border-bottom: none;
}

.ridu-row--hover {
  transform: scale(0.98);
}

.ridu-row__text {
  flex: 1;
  min-width: 0;
}

.ridu-row__title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10rpx;
  color: var(--ink);
  font-size: 26rpx;
  font-weight: 600;
}

.ridu-row__desc {
  margin-top: 6rpx;
  color: var(--ink-3);
  font-size: 22rpx;
  line-height: 1.6;
}

.ridu-row__arrow {
  color: var(--ink-3);
  font-size: 30rpx;
}
</style>
