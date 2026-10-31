<template>
  <view class="page" :class="{ 'theme-dark': isDark }">
    <view class="page-hero">
      <view class="page-hero__inner">
        <text class="page-hero__eyebrow">内容与运营</text>
        <view class="page-hero__title">{{ collection.title }}</view>
        <view class="page-hero__sub">{{ collection.subtitle }}</view>
        <view class="page-hero__meta">
          <text class="page-hero__tag">共 {{ items.length }} 篇</text>
          <text class="page-hero__tag">更新于 {{ updatedAt }}</text>
          <text class="page-hero__tag">公开资料整理</text>
        </view>
      </view>
    </view>

    <view class="filter-bar card">
      <view class="ct-search">
        <text class="ct-search__icon">⌕</text>
        <input
          class="ct-search__input"
          :value="keyword"
          :placeholder="searchPlaceholder"
          confirm-type="search"
          placeholder-class="ct-search__ph"
          @input="onKeywordInput"
          @confirm="onKeywordConfirm"
        />
        <text v-if="keyword" class="ct-search__clear" hover-class="tap-hover" @tap="keyword = ''">×</text>
      </view>
      <scroll-view scroll-x class="ct-cats">
        <view class="ct-cats__inner">
          <view
            v-for="option in collection.categories"
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
      <text>命中 {{ list.length }} 篇</text>
      <text class="text-muted">共 {{ items.length }} 篇</text>
    </view>

    <view class="entry-list">
      <view
        v-for="item in list"
        :key="item.id"
        class="content-card card"
        hover-class="content-card--hover"
        hover-stay-time="90"
        @tap="goDetail(item)"
      >
        <view class="content-card__cover" :style="{ background: coverBg }">
          <image
            v-if="coverOf(item) && !brokenCovers[item.id]"
            class="content-card__img"
            :src="coverOf(item)"
            mode="aspectFill"
            lazy-load
            @error="brokenCovers[item.id] = true"
          />
          <text v-else class="content-card__glyph">{{ item.title.slice(0, 1) }}</text>
          <view class="content-card__fade" />
          <text class="content-card__cat">{{ item.category }}</text>
        </view>
        <view class="content-card__body">
          <view class="content-card__title">
            <text>{{ item.title }}</text>
            <text v-if="!item.verified" class="ct-tag ct-tag--warn">待核实</text>
          </view>
          <view class="content-card__desc">{{ item.summary }}</view>
          <view class="content-card__foot">
            <view class="chip-row">
              <text v-for="tag in item.tags" :key="tag" class="chip chip--ghost">{{ tag }}</text>
            </view>
            <text class="content-card__date">{{ item.updatedAt || updatedAt }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="!list.length" class="ct-empty">
      <view class="ct-empty__icon">◌</view>
      <view class="ct-empty__title">没有找到匹配的条目</view>
      <view class="ct-empty__text">换个关键词或切回「全部」分类，也可以直接去问全局搜索。</view>
      <view class="ct-actions">
        <view class="ct-btn" hover-class="ct-btn--hover" @tap="resetFilters">清空筛选</view>
        <view class="ct-btn ct-btn--ghost" hover-class="ct-btn--hover" @tap="goSearch">打开全局搜索</view>
      </view>
    </view>

    <view class="ct-source">{{ notice }}</view>
  </view>
</template>

<script setup>
import { useTheme } from '@/utils/theme.js';

const { isDark } = useTheme();
import { computed, ref, watch } from 'vue';
import { CONTENT_NOTICE, CONTENT_UPDATED_AT, getContentCollection } from '@/data/content.js';
import { getCatalog } from '@/services/content.js';
import { hexToRgba } from '@/utils/format.js';

const props = defineProps({
  type: { type: String, required: true },
  detailPath: { type: String, default: '' },
  accent: { type: String, default: '#2f6bff' },
  searchPlaceholder: { type: String, default: '搜索标题、摘要、标签' },
  initialCategory: { type: String, default: '全部' }
});

const collection = getContentCollection(props.type);
const updatedAt = CONTENT_UPDATED_AT;
const notice = CONTENT_NOTICE;
const items = collection.items;
const keyword = ref('');
const category = ref(
  props.initialCategory && collection.categories.indexOf(props.initialCategory) >= 0
    ? props.initialCategory
    : '全部'
);
const brokenCovers = ref({});

watch(
  () => props.initialCategory,
  (value) => {
    if (value && collection.categories.indexOf(value) >= 0) category.value = value;
  }
);

const arts = (getCatalog('spirit').data.items || []).map((item) => item.icon).filter(Boolean);

function hashIndex(key, length) {
  let hash = 0;
  const text = String(key || '');
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return length ? hash % length : 0;
}

function coverOf(item) {
  if (item.image) return item.image;
  return arts.length ? arts[hashIndex(item.id, arts.length)] : '';
}

const coverBg = computed(
  () => `linear-gradient(135deg, ${hexToRgba(props.accent, 0.18)}, ${hexToRgba(props.accent, 0.04)})`
);

const list = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  return items.filter((item) => {
    if (category.value !== '全部' && item.category !== category.value) return false;
    if (!kw) return true;
    const haystack = [item.title, item.summary, item.category].concat(item.tags || []).join(' ').toLowerCase();
    return haystack.indexOf(kw) >= 0;
  });
});

function onKeywordInput(event) {
  keyword.value = event.detail.value;
}

function onKeywordConfirm() {
  keyword.value = keyword.value.trim();
}

function resetFilters() {
  keyword.value = '';
  category.value = '全部';
}

function goDetail(item) {
  const path = props.detailPath || `/pages/${props.type}/detail`;
  uni.navigateTo({ url: `${path}?id=${item.id}` });
}

function goSearch() {
  uni.navigateTo({ url: '/pages/search/search' });
}
</script>

<style>
.content-card {
  overflow: hidden;
  transition: transform 0.16s ease;
}

.content-card--hover {
  transform: scale(0.985);
}

.content-card__cover {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200rpx;
  overflow: hidden;
}

.content-card__img {
  width: 200rpx;
  height: 200rpx;
  opacity: 0.9;
}

.content-card__glyph {
  color: var(--brand);
  font-size: 84rpx;
  font-weight: 700;
  opacity: 0.5;
}

.content-card__fade {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 40%, rgba(17, 21, 44, 0.35) 100%);
  pointer-events: none;
}

.content-card__cat {
  position: absolute;
  left: 20rpx;
  bottom: 16rpx;
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.88);
  color: var(--brand-deep);
  font-size: 20rpx;
  font-weight: 600;
}

.content-card__body {
  padding: 22rpx 24rpx 24rpx;
}

.content-card__title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12rpx;
  color: var(--ink);
  font-size: 30rpx;
  font-weight: 600;
}

.content-card__desc {
  margin: 10rpx 0 16rpx;
  color: var(--ink-2);
  font-size: 24rpx;
  line-height: 1.65;
}

.content-card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.content-card__date {
  flex: none;
  color: var(--ink-3);
  font-size: 21rpx;
}
</style>
