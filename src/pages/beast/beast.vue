<template>
  <view class="page" :class="{ 'theme-dark': isDark }">
    <view class="page-hero beast-hero">
      <view class="page-hero__inner">
        <text class="page-hero__eyebrow">内容与运营</text>
        <view class="page-hero__title">凶兽生态</view>
        <view class="page-hero__sub">{{ notice }}</view>
        <view class="page-hero__meta">
          <text class="page-hero__tag">{{ items.length }} 个条目</text>
          <text class="page-hero__tag">{{ categories.length - 1 }} 种类型</text>
          <text class="page-hero__tag">示例数据</text>
        </view>
      </view>
    </view>

    <view class="stat-row card">
      <view v-for="stat in stats" :key="stat.label" class="stat">
        <view class="stat__num">{{ stat.value }}</view>
        <view class="stat__label">{{ stat.label }}</view>
      </view>
    </view>

    <view class="filter-bar card">
      <view class="ct-search">
        <text class="ct-search__icon">⌕</text>
        <input
          class="ct-search__input"
          :value="keyword"
          placeholder="搜凶兽名称、元素或应对建议"
          confirm-type="search"
          placeholder-class="ct-search__ph"
          @input="onKeywordInput"
        />
        <text v-if="keyword" class="ct-search__clear" hover-class="tap-hover" @tap="keyword = ''">×</text>
      </view>
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
      <text>命中 {{ list.length }} 个条目</text>
      <text class="text-muted">共 {{ items.length }} 个</text>
    </view>

    <view
      v-for="item in list"
      :key="item.id"
      class="beast-card card"
      hover-class="beast-card--hover"
      hover-stay-time="90"
      @tap="toggle(item.id)"
    >
      <view class="beast-card__head">
        <view class="beast-card__badge" :style="{ background: tintOf(item), color: colorOf(item) }">
          {{ item.name.slice(0, 1) }}
        </view>
        <view class="beast-card__text">
          <view class="beast-card__title">
            <text>{{ item.name }}</text>
            <text class="ct-tag" :class="item.category === '首领' ? 'ct-tag--warn' : ''">{{ item.category }}</text>
            <text v-if="!item.verified" class="ct-tag ct-tag--warn">待核实</text>
          </view>
          <view class="beast-card__summary">{{ item.summary }}</view>
          <view class="chip-row">
            <text v-for="tag in item.tags" :key="tag" class="chip chip--ghost">{{ tag }}</text>
          </view>
        </view>
        <text class="ct-accordion__arrow" :class="{ 'ct-accordion__arrow--open': openId === item.id }">›</text>
      </view>

      <view v-if="openId === item.id" class="ct-accordion__body">
        <view v-if="item.desc && item.desc !== item.summary" class="beast-card__desc">{{ item.desc }}</view>
        <view v-for="field in item.fields" :key="field.label" class="kv__row">
          <text class="kv__key">{{ field.label }}</text>
          <text class="kv__value">{{ field.value }}</text>
        </view>
        <view v-for="section in item.sections" :key="section.title" class="beast-card__section">
          <view class="panel__sub">{{ section.title }}</view>
          <view class="beast-card__desc">{{ section.text }}</view>
        </view>
        <view class="ct-link" hover-class="ct-link--hover" hover-stay-time="90" @tap.stop="goEnemy">
          去敌人图鉴查看更多 ›
        </view>
      </view>
    </view>

    <view v-if="!list.length" class="ct-empty">
      <view class="ct-empty__icon">◌</view>
      <view class="ct-empty__title">没有匹配的凶兽</view>
      <view class="ct-empty__text">换个关键词，或切回「全部」类型。</view>
      <view class="ct-actions">
        <view class="ct-btn" hover-class="ct-btn--hover" @tap="resetFilters">清空筛选</view>
      </view>
    </view>

    <view class="ct-source">条目为公测前示例，类型、元素与应对建议待官方图鉴核实。</view>
  </view>
</template>

<script setup>
import { useTheme } from '@/utils/theme.js';

const { isDark } = useTheme();
import { computed, ref } from 'vue';
import { onShareAppMessage } from '@dcloudio/uni-app';
import { enemyCatalog } from '@/data/manual-catalogs.js';
import { tint } from '@/utils/format.js';

const items = enemyCatalog.items;
const notice = enemyCatalog.notice;
const keyword = ref('');
const category = ref('全部');
const openId = ref('');

const categories = computed(() => {
  const seen = [];
  items.forEach((item) => {
    if (item.category && seen.indexOf(item.category) < 0) seen.push(item.category);
  });
  return ['全部'].concat(seen);
});

const stats = computed(() => {
  const elements = [];
  items.forEach((item) => {
    (item.tags || []).forEach((tag) => {
      if (tag.length === 1 && elements.indexOf(tag) < 0) elements.push(tag);
    });
  });
  return [
    { label: '凶兽条目', value: items.length },
    { label: '类型', value: categories.value.length - 1 },
    { label: '涉及元素', value: elements.length }
  ];
});

const list = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  return items.filter((item) => {
    if (category.value !== '全部' && item.category !== category.value) return false;
    if (!kw) return true;
    const haystack = [item.name, item.summary, item.desc, item.category]
      .concat(item.tags || [], (item.sections || []).map((section) => section.text))
      .join(' ')
      .toLowerCase();
    return haystack.indexOf(kw) >= 0;
  });
});

function colorOf(item) {
  if (item.category === '首领') return '#c93b3b';
  if (item.category === '精英') return '#b96a00';
  return '#5a6480';
}

function tintOf(item) {
  return tint(colorOf(item));
}

function toggle(id) {
  openId.value = openId.value === id ? '' : id;
}

function onKeywordInput(event) {
  keyword.value = event.detail.value;
}

function resetFilters() {
  keyword.value = '';
  category.value = '全部';
}

function goEnemy() {
  uni.navigateTo({ url: '/pages/enemy/list' });
}

onShareAppMessage(() => ({ title: '凶兽生态 · 蓝色星原助手', path: '/pages/beast/beast' }));
</script>

<style>
.beast-hero {
  background: linear-gradient(135deg, #4a1f2a 0%, #9c3b3b 55%, #d97a3b 100%);
}

.stat-row {
  display: flex;
  margin-bottom: 24rpx;
  padding: 24rpx 0;
}

.stat {
  flex: 1;
  text-align: center;
}

.stat__num {
  color: var(--ink);
  font-size: 36rpx;
  font-weight: 700;
}

.stat__label {
  margin-top: 6rpx;
  color: var(--ink-3);
  font-size: 21rpx;
}

.beast-card {
  margin-bottom: 20rpx;
  padding: 0 26rpx;
  transition: transform 0.16s ease;
}

.beast-card--hover {
  transform: scale(0.99);
}

.beast-card__head {
  display: flex;
  align-items: flex-start;
  gap: 18rpx;
  padding: 26rpx 0;
}

.beast-card__badge {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 76rpx;
  height: 76rpx;
  border-radius: 22rpx;
  font-size: 32rpx;
  font-weight: 700;
}

.beast-card__text {
  flex: 1;
  min-width: 0;
}

.beast-card__title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10rpx;
  color: var(--ink);
  font-size: 29rpx;
  font-weight: 600;
}

.beast-card__summary {
  margin: 8rpx 0 12rpx;
  color: var(--ink-2);
  font-size: 24rpx;
  line-height: 1.6;
}

.beast-card__desc {
  color: var(--ink-2);
  font-size: 24rpx;
  line-height: 1.7;
}

.beast-card__section {
  margin-top: 20rpx;
}
</style>
