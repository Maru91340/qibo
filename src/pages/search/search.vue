<template>
  <view class="page" :class="{ 'theme-dark': isDark }">
    <view class="searchbar">
      <cx-input
        :value="keyword"
        focus
        shape="round"
        placeholder="搜奇波、角色、灵子、物品、成就"
        @change="onKeywordChange"
        @submit="onKeywordConfirm"
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

    <view class="scope-chips">
      <view class="scope-chip" :class="{ 'scope-chip--active': scope === '全部' }" hover-class="facet-chip--hover" @tap="scope = '全部'">全部 {{ scopeTotal }}</view>
      <view
        v-for="entry in scopeStats"
        :key="entry.label"
        class="scope-chip"
        :class="{ 'scope-chip--active': scope === entry.label }"
        hover-class="facet-chip--hover"
        @tap="scope = entry.label"
      >{{ entry.label }} {{ entry.count }}</view>
    </view>

    <view v-if="!keyword && recentItems.length" class="history">
      <view class="section-title">
        <text>最近浏览</text>
        <text class="section-title__more section-title__more--action" hover-class="facet-chip--hover" @tap="clearRecentItems">清空</text>
      </view>
      <view class="entry-list">
        <view
          v-for="rec in recentItems"
          :key="rec.type + rec.id"
          class="entry-card card"
          hover-class="entry-card--hover"
          hover-stay-time="90"
          @tap="goResult(rec.path)"
        >
          <image
            v-if="rec.icon"
            class="entry-card__img"
            :src="rec.icon"
            mode="aspectFill"
            lazy-load
          />
          <view v-else class="entry-card__badge entry-card__badge--soft">
            <text class="scope-badge">{{ rec.typeLabel }}</text>
          </view>
          <view class="entry-card__body">
            <view class="entry-card__title">{{ rec.name }}</view>
            <view class="entry-card__desc entry-card__desc--last">{{ rec.desc }}</view>
          </view>
          <c-icon name="chevron-right" size="32rpx" color="var(--ink-3)" />
        </view>
      </view>
    </view>

    <template v-if="keyword">
      <view class="list-head">
        <text>找到 {{ result.total }} 条结果</text>
        <text class="text-muted">关键词：{{ appliedKeyword }}</text>
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
              <c-icon :name="entry.icon" size="34rpx" color="var(--brand)" />
            </view>
            <view class="entry-card__body">
              <view class="entry-card__title">{{ entry.name }}</view>
              <view class="entry-card__desc entry-card__desc--last">{{ entry.desc }}</view>
            </view>
            <c-icon name="chevron-right" size="32rpx" color="var(--ink-3)" />
          </view>
        </view>
      </view>
      <view v-if="!result.total" class="ct-empty">
        <view class="ct-empty__icon">⌕</view>
        <view class="ct-empty__title">没有找到「{{ appliedKeyword }}」</view>
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
import { officialItems } from '@/utils/catalog-view.js';
import { listRecent, clearRecent as clearRecentStore } from '@/utils/recent.js';
import { detailPath } from '@/utils/favorites.js';

const HISTORY_KEY = 'qbxzs:history';
const MAX_HISTORY = 8;

const keyword = ref('');
const appliedKeyword = ref('');
let keywordTimer = null;
const scope = ref('全部');
const recentItems = ref([]);
const history = ref([]);
const catalog = ref({});

const scopeStats = computed(() =>
  SEARCHABLE_CATALOGS.map((entry) => ({
    label: entry.label,
    count: ((catalog.value[entry.type] || {}).items || []).length
  }))
);
const scopeTotal = computed(() => SEARCHABLE_CATALOGS.length);

// 奇波/角色不在 SEARCHABLE_CATALOGS 注册表里，标签单独补齐
const RECENT_TYPE_LABELS = { qibo: '奇波', character: '角色', qiboWiki: '奇波', charWiki: '角色' };

function loadRecent() {
  recentItems.value = listRecent()
    .slice(0, 8)
    .map((rec) => ({
      ...rec,
      typeLabel: RECENT_TYPE_LABELS[rec.type]
        || (SEARCHABLE_CATALOGS.find((entry) => entry.type === rec.type) || {}).label
        || rec.type,
      // 浏览记录直达详情（奇波/角色在分包）；无登记类型时回退首页
      path: rec.path || (detailPath(rec.type) ? `${detailPath(rec.type)}?id=${rec.id}` : '/pages/index/index')
    }));
}
function clearRecentItems() {
  clearRecentStore();
  loadRecent();
}

const baseResult = computed(() => {
  const data = catalog.value;
  return searchAll(
    {
      // 3.3 / L05：全局搜索与列表使用同一「正式列表」口径，不返回演示条目与同名重复
      characters: officialItems((data.character || {}).items || []),
      qibos: officialItems((data.qibo || {}).items || []),
      sections: (data.meta || {}).sections || [],
      catalogs: SEARCHABLE_CATALOGS.map((entry) => ({
        label: entry.label,
        detailPath: entry.detailPath,
        items: ((catalog.value[entry.type] || {}).items || [])
      }))
    },
    // 输入防抖与列表页一致：停止输入 250ms 后才执行全库检索
    appliedKeyword.value
  );
});
// 范围筛选：全部 / 单图鉴类（竞品同款范围 chips）
const result = computed(() => {
  const base = baseResult.value;
  if (scope.value === '全部') return base;
  const groups = (base.groups || []).filter((group) => (group.title || '').indexOf(scope.value) >= 0);
  return { ...base, groups, total: groups.reduce((sum, group) => sum + group.items.length, 0) };
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
  const value = (raw || '').trim();
  keyword.value = value;
  appliedKeyword.value = value;
}

// 确认搜索时立即应用当前输入；输入过程中 250ms 防抖。
function onKeywordChange(event) {
  keyword.value = event.detail.value;
  if (keywordTimer) clearTimeout(keywordTimer);
  if (!keyword.value) {
    appliedKeyword.value = '';
    return;
  }
  keywordTimer = setTimeout(() => {
    appliedKeyword.value = keyword.value;
    keywordTimer = null;
  }, 250);
}

function onKeywordConfirm() {
  if (keywordTimer) clearTimeout(keywordTimer);
  keywordTimer = null;
  appliedKeyword.value = keyword.value;
}

function clear() {
  if (keywordTimer) clearTimeout(keywordTimer);
  keywordTimer = null;
  keyword.value = '';
  appliedKeyword.value = '';
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

function goResult(path) {
  if (appliedKeyword.value) remember(appliedKeyword.value);
  uni.navigateTo({ url: path });
}

let unsubscribe = null;
onLoad((options) => {
  history.value = uni.getStorageSync(HISTORY_KEY) || [];
  loadRecent();
  reload();
  apply(options && options.keyword ? decodeURIComponent(options.keyword) : '');
});
unsubscribe = onCatalogUpdate(() => { reload(); loadRecent(); });
onUnload(() => unsubscribe && (unsubscribe(), clearTimeout(keywordTimer)));
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

.scope-chips {
  display: flex;
  flex-wrap: nowrap;
  overflow-x: auto;
  gap: 12rpx;
  padding: 4rpx 0 16rpx;
}

/* 9.5 / S06：隐藏横向滚动条（深色下突兀） */
.scope-chips::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

.scope-chip {
  flex-shrink: 0;
  padding: 10rpx 22rpx;
  border-radius: 999rpx;
  background: var(--soft);
  color: var(--ink-2);
  font-size: 24rpx;
}

.scope-chip--active {
  background: var(--brand);
  color: #fff;
}

.scope-badge {
  font-size: 22rpx;
  color: var(--brand);
}
</style>
