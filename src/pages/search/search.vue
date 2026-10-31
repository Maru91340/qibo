<template>
  <view class="page" :class="{ 'theme-dark': isDark }">
    <view class="searchbar">
      <cx-input
        :value="keyword"
        focus
        shape="round"
        placeholder="搜奇波、角色、灵子、物品、成就"
        @change="onKeywordChange"
        @clear="clear"
      />
    </view>

    <view v-if="!keyword" class="history">
      <view class="section-title">
        <text>最近搜索</text>
        <text
          v-if="history.length"
          class="section-title__more section-title__more--action"
          hover-class="facet-chip--hover"
          @tap="clearHistory"
        >清空</text>
      </view>
      <view v-if="history.length" class="chip-row">
        <view
          v-for="item in history"
          :key="item"
          class="facet-chip"
          hover-class="facet-chip--hover"
          hover-stay-time="90"
          @tap="apply(item)"
        >{{ item }}</view>
      </view>
      <view v-else class="text-muted">还没有搜索记录，先从下面的建议试试。</view>

      <view v-if="suggestions.length" class="section-title">
        <text>试试搜索</text>
        <text class="section-title__more">来自内置图鉴</text>
      </view>
      <view v-if="suggestions.length" class="chip-row">
        <view
          v-for="name in suggestions"
          :key="name"
          class="facet-chip"
          hover-class="facet-chip--hover"
          hover-stay-time="90"
          @tap="apply(name)"
        >{{ name }}</view>
      </view>
    </view>

    <template v-if="keyword">
      <view class="list-head">
        <text>找到 {{ result.total }} 条结果</text>
        <text class="text-muted">关键词：{{ keyword }}</text>
      </view>
      <view v-for="group in result.groups" :key="group.title" class="group">
        <view class="group__title">{{ group.title }}</view>
        <view class="entry-list">
          <view
            v-for="entry in group.items"
            :key="entry.id"
            class="entry-card card"
        hover-class="entry-card--hover"
        hover-stay-time="90"
            @tap="goResult(entry.path)"
          >
            <view class="entry-card__badge entry-card__badge--soft">
              <c-icon :name="entry.icon" size="34rpx" color="#2f6bff" />
            </view>
            <view class="entry-card__body">
              <view class="entry-card__title">{{ entry.name }}</view>
              <view class="entry-card__desc entry-card__desc--last">{{ entry.desc }}</view>
            </view>
            <c-icon name="chevron-right" size="32rpx" color="#c2c9d6" />
          </view>
        </view>
      </view>
      <view v-if="!result.total" class="ct-empty">
        <view class="ct-empty__icon">⌕</view>
        <view class="ct-empty__title">没有找到「{{ keyword }}」</view>
        <view class="ct-empty__text">试试更短的关键词，或清空后从建议里再搜一次。</view>
        <view class="ct-actions">
          <view class="ct-btn ct-btn--ghost" hover-class="ct-btn--hover" @tap="clear">清空关键词</view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup>
import { useTheme } from '@/utils/theme.js';

const { isDark } = useTheme();
import { computed, ref } from 'vue';
import { onLoad, onUnload } from '@dcloudio/uni-app';
import { getCatalog, onCatalogUpdate } from '@/services/content.js';
import { searchAll, SEARCHABLE_CATALOGS } from '@/utils/query.js';

const HISTORY_KEY = 'qbxzs:history';
const MAX_HISTORY = 8;

const keyword = ref('');
const history = ref([]);
const catalog = ref({});

const result = computed(() => {
  const data = catalog.value;
  return searchAll(
    {
      characters: (data.character || {}).items || [],
      qibos: (data.qibo || {}).items || [],
      sections: (data.meta || {}).sections || [],
      catalogs: SEARCHABLE_CATALOGS.map((entry) => ({
        label: entry.label,
        detailPath: entry.detailPath,
        items: ((catalog.value[entry.type] || {}).items || [])
      }))
    },
    keyword.value
  );
});

// 建议词直接取内置图鉴的条目名，保证点下去一定有结果，不臆造热度
const suggestions = computed(() => {
  const types = ['qibo', 'character', 'spirit', 'item', 'enemy', 'region'];
  const names = [];
  for (const type of types) {
    const pool = (catalog.value[type] || {}).items || [];
    const hit = pool.filter((entry) => entry.name)[0];
    if (hit && names.indexOf(hit.name) < 0) names.push(hit.name);
  }
  return names;
});

function reload() {
  const next = {
    meta: getCatalog('meta').data || {},
    qibo: getCatalog('qibo').data || {},
    character: getCatalog('character').data || {}
  };
  SEARCHABLE_CATALOGS.forEach((entry) => {
    next[entry.type] = getCatalog(entry.type).data || {};
  });
  catalog.value = next;
}

function apply(raw) {
  keyword.value = (raw || '').trim();
}

function clear() {
  keyword.value = '';
}

function remember(value) {
  const next = [value].concat(history.value.filter((item) => item !== value)).slice(0, MAX_HISTORY);
  history.value = next;
  uni.setStorageSync(HISTORY_KEY, next);
}

function clearHistory() {
  history.value = [];
  uni.removeStorageSync(HISTORY_KEY);
}

function onKeywordChange(event) {
  apply(event.detail.value);
}

function goResult(path) {
  if (keyword.value) remember(keyword.value);
  uni.navigateTo({ url: path });
}

let unsubscribe = null;
onLoad((options) => {
  history.value = uni.getStorageSync(HISTORY_KEY) || [];
  reload();
  apply(options && options.keyword ? decodeURIComponent(options.keyword) : '');
});
unsubscribe = onCatalogUpdate(reload);
onUnload(() => unsubscribe && unsubscribe());
</script>

<style>
.searchbar {
  padding: 8rpx 0 16rpx;
}

.history {
  margin-top: 8rpx;
}

.group {
  margin-bottom: 12rpx;
}

.group__title {
  margin: 24rpx 8rpx 14rpx;
  color: var(--ink-2);
  font-size: 25rpx;
  font-weight: 600;
}

.entry-card__badge--soft {
  background: var(--brand-soft);
}

.entry-card__desc--last {
  margin-bottom: 0;
}
</style>
