<template>
  <view class="page" :class="{ 'theme-dark': isDark }">
    <view class="page-hero">
      <view class="page-hero__inner">
        <text class="page-hero__eyebrow">内容与运营</text>
        <view class="page-hero__title">玩法指南</view>
        <view class="page-hero__sub">系统、战斗、家园、探索四大类，每类三个主题，按步骤直接跳到对应页面。</view>
        <view class="page-hero__meta">
          <text class="page-hero__tag">{{ guideCategories.length }} 大类</text>
          <text class="page-hero__tag">{{ guideTopics.length }} 个主题</text>
          <text class="page-hero__tag">站内实操</text>
        </view>
      </view>
    </view>

    <view class="filter-bar card">
      <scroll-view scroll-x class="ct-cats">
        <view class="ct-cats__inner">
          <view
            v-for="option in guideCategories"
            :key="option"
            class="facet-chip"
            :class="{ 'facet-chip--active': option === category }"
            hover-class="facet-chip--hover"
            hover-stay-time="90"
            @tap="setCategory(option)"
          >
            {{ option }}
          </view>
        </view>
      </scroll-view>
    </view>

    <view class="list-head">
      <text>{{ category }} · {{ topics.length }} 个主题</text>
      <text class="text-muted">点击展开步骤</text>
    </view>

    <view
      v-for="(topic, index) in topics"
      :key="topic.id"
      class="guide-topic card"
      :class="{ 'guide-topic--open': openId === topic.id }"
      hover-class="guide-topic--hover"
      hover-stay-time="90"
      @tap="toggle(topic.id)"
    >
      <view class="guide-topic__head">
        <text class="guide-topic__num">{{ pad(index + 1) }}</text>
        <view class="guide-topic__text">
          <view class="guide-topic__title">{{ topic.title }}</view>
          <view class="guide-topic__summary">{{ topic.summary }}</view>
        </view>
        <text class="ct-accordion__arrow" :class="{ 'ct-accordion__arrow--open': openId === topic.id }">›</text>
      </view>
      <view v-if="openId === topic.id" class="ct-accordion__body">
        <view v-for="(step, stepIndex) in topic.steps" :key="step.text" class="ct-step">
          <text class="ct-step__num">{{ stepIndex + 1 }}</text>
          <view class="ct-step__body">
            <text class="ct-step__text">{{ step.text }}</text>
            <view
              v-if="step.link"
              class="ct-link"
              hover-class="ct-link--hover"
              hover-stay-time="90"
              @tap.stop="go(step.link.path)"
            >
              {{ step.link.label }} ›
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="ct-source">{{ notice }}</view>
  </view>
</template>

<script setup>
import { useTheme } from '@/utils/theme.js';

const { isDark } = useTheme();
import { computed, ref } from 'vue';
import { onShareAppMessage } from '@dcloudio/uni-app';
import { CONTENT_NOTICE, guideCategories, guideTopics } from '@/data/content.js';

const category = ref(guideCategories[0]);
const openId = ref(guideTopics[0].id);
const notice = CONTENT_NOTICE;

const topics = computed(() => guideTopics.filter((topic) => topic.category === category.value));

function pad(value) {
  return value < 10 ? `0${value}` : String(value);
}

function setCategory(option) {
  category.value = option;
  const first = guideTopics.filter((topic) => topic.category === option)[0];
  openId.value = first ? first.id : '';
}

function toggle(id) {
  openId.value = openId.value === id ? '' : id;
}

function go(path) {
  if (path) uni.navigateTo({ url: path });
}

onShareAppMessage(() => ({ title: '玩法指南 · 蓝色星原助手', path: '/pages/guide/guide' }));
</script>

<style>
.guide-topic {
  margin-bottom: 20rpx;
  padding: 0 26rpx;
  transition: transform 0.16s ease;
}

.guide-topic--hover {
  transform: scale(0.99);
}

.guide-topic__head {
  display: flex;
  align-items: flex-start;
  gap: 18rpx;
  padding: 26rpx 0;
}

.guide-topic__num {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52rpx;
  height: 52rpx;
  border-radius: 16rpx;
  background: var(--brand-soft);
  color: var(--brand);
  font-size: 22rpx;
  font-weight: 700;
}

.guide-topic__text {
  flex: 1;
  min-width: 0;
}

.guide-topic__title {
  color: var(--ink);
  font-size: 29rpx;
  font-weight: 600;
}

.guide-topic__summary {
  margin-top: 8rpx;
  color: var(--ink-2);
  font-size: 23rpx;
  line-height: 1.6;
}

.ct-step__body {
  flex: 1;
  min-width: 0;
}
</style>
