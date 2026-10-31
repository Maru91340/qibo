<template>
  <view class="page" :class="{ 'theme-dark': isDark }">
    <view class="page-hero wiki-hero">
      <view class="page-hero__inner">
        <text class="page-hero__eyebrow">内容与运营</text>
        <view class="page-hero__title">奇波百科</view>
        <view class="page-hero__sub">把常见概念、数据边界和工具用法整理成问答，先查再问。</view>
        <view class="page-hero__meta">
          <text class="page-hero__tag">{{ items.length }} 个问答</text>
          <text class="page-hero__tag">站内整理</text>
          <text class="page-hero__tag">持续补充</text>
        </view>
      </view>
    </view>

    <view class="filter-bar card">
      <view class="ct-search">
        <text class="ct-search__icon">⌕</text>
        <input
          class="ct-search__input"
          :value="keyword"
          placeholder="搜问题、关键词，例如 灵子、待核实"
          confirm-type="search"
          placeholder-class="ct-search__ph"
          @input="onKeywordInput"
        />
        <text v-if="keyword" class="ct-search__clear" hover-class="tap-hover" @tap="keyword = ''">×</text>
      </view>
    </view>

    <view class="list-head">
      <text>命中 {{ list.length }} 个问答</text>
      <text class="text-muted">共 {{ items.length }} 个</text>
    </view>

    <view v-for="faq in list" :key="faq.id" class="ct-accordion card">
      <view
        class="ct-accordion__head"
        hover-class="facet-chip--hover"
        hover-stay-time="90"
        @tap="toggle(faq.id)"
      >
        <view class="wiki-q">
          <text class="ct-accordion__title">{{ faq.q }}</text>
          <view class="chip-row">
            <text v-for="tag in faq.tags" :key="tag" class="ct-tag ct-tag--ghost">{{ tag }}</text>
          </view>
        </view>
        <text class="ct-accordion__arrow" :class="{ 'ct-accordion__arrow--open': openId === faq.id }">›</text>
      </view>
      <view v-if="openId === faq.id" class="ct-accordion__body">
        <text class="wiki-a">{{ faq.a }}</text>
        <view
          v-if="faq.link"
          class="ct-link"
          hover-class="ct-link--hover"
          hover-stay-time="90"
          @tap.stop="go(faq.link.path)"
        >
          {{ faq.link.label }} ›
        </view>
      </view>
    </view>

    <view v-if="!list.length" class="ct-empty">
      <view class="ct-empty__icon">◌</view>
      <view class="ct-empty__title">没有匹配的问答</view>
      <view class="ct-empty__text">换个关键词，或去全局搜索直接找条目。</view>
      <view class="ct-actions">
        <view class="ct-btn" hover-class="ct-btn--hover" @tap="reset">清空搜索</view>
        <view class="ct-btn ct-btn--ghost" hover-class="ct-btn--hover" @tap="goSearch">全局搜索</view>
      </view>
    </view>

    <view class="ct-source">百科内容为站内整理，涉及数值与剧情的部分以官方信息为准；带「待核实」的数据不要直接引用。</view>
  </view>
</template>

<script setup>
import { useTheme } from '@/utils/theme.js';

const { isDark } = useTheme();
import { computed, ref } from 'vue';
import { onShareAppMessage } from '@dcloudio/uni-app';
import { wikiFaqs } from '@/data/content.js';

const items = wikiFaqs;
const keyword = ref('');
const openId = ref(wikiFaqs[0].id);

const list = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  if (!kw) return items;
  return items.filter((faq) =>
    [faq.q, faq.a].concat(faq.tags || []).join(' ').toLowerCase().indexOf(kw) >= 0
  );
});

function onKeywordInput(event) {
  keyword.value = event.detail.value;
}

function toggle(id) {
  openId.value = openId.value === id ? '' : id;
}

function reset() {
  keyword.value = '';
}

function go(path) {
  if (path) uni.navigateTo({ url: path });
}

function goSearch() {
  uni.navigateTo({ url: '/pages/search/search' });
}

onShareAppMessage(() => ({ title: '奇波百科 · 蓝色星原助手', path: '/pages/wiki/wiki' }));
</script>

<style>
.wiki-hero {
  background: linear-gradient(135deg, #1f3d9e 0%, #5a6ad0 55%, #8a6cff 100%);
}

.wiki-q {
  flex: 1;
  min-width: 0;
}

.wiki-a {
  display: block;
  color: var(--ink-2);
  font-size: 24rpx;
  line-height: 1.75;
}
</style>
