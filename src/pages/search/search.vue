<template>
  <view class="page" :class="{ 'theme-dark': isDark }">
    <view class="searchbar">
      <t-search
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
        <text v-if="history.length" class="section-title__more" @tap="clearHistory">清空</text>
      </view>
      <view v-if="history.length" class="chip-row">
        <text v-for="item in history" :key="item" class="chip" @tap="apply(item)">{{ item }}</text>
      </view>
      <view v-else class="text-muted">还没有搜索记录</view>
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
              <t-icon :name="entry.icon" size="34rpx" color="#2f6bff" />
            </view>
            <view class="entry-card__body">
              <view class="entry-card__title">{{ entry.name }}</view>
              <view class="entry-card__desc entry-card__desc--last">{{ entry.desc }}</view>
            </view>
            <t-icon name="chevron-right" size="32rpx" color="#c2c9d6" />
          </view>
        </view>
      </view>
      <t-empty v-if="!result.total" description="没有找到相关内容" />
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
