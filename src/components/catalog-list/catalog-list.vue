<template>
  <view class="page" :class="{ 'theme-dark': isDark }">
    <view class="cl-hero" :style="{ background: heroBg }">
      <view class="cl-hero__dots" />
      <view class="cl-hero__body">
        <text class="cl-hero__emoji">✨</text>
        <view class="cl-hero__copy">
          <text class="cl-hero__title">{{ heroTitle }}</text>
          <text class="cl-hero__sub">收录 {{ total }} 条 · 点击条目看详情</text>
        </view>
      </view>
    </view>
    <view class="filter-bar card">
      <view class="cl-search">
        <text class="cl-search__icon">⌕</text>
        <input
          class="cl-search__input"
          :value="keyword"
          :placeholder="searchPlaceholder"
          confirm-type="search"
          placeholder-class="cl-search__ph"
          @input="onKeywordInput"
          @confirm="onKeywordConfirm"
        />
        <text v-if="keyword" class="cl-search__clear" hover-class="tap-hover" @tap="keyword = ''">×</text>
      </view>
      <scroll-view v-if="facetRows.length" scroll-y class="facets">
        <view v-for="row in facetRows" :key="row.key" class="facet-row" :class="{ 'facet-row--open': row.open }">
          <view class="facet-row__head" hover-class="tap-hover" @tap="toggleFacet(row.key)">
            <text class="facet-row__label">{{ row.label }}</text>
            <text class="facet-row__value">{{ row.active === '全部' ? '不限' : row.active }}</text>
            <text class="facet-row__arrow" :class="{ 'facet-row__arrow--open': row.open }">›</text>
          </view>
          <view v-if="row.open" class="facet-row__body">
            <view
              v-for="option in row.options"
              :key="option"
              class="facet-chip"
              :class="{ 'facet-chip--active': option === row.active }"
              hover-class="facet-chip--hover" hover-stay-time="90" @tap="setFacet(row.key, option)"
            >
              {{ option }}
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <view class="list-head">
      <text>命中 {{ list.length }} 条{{ titleSuffix }}</text>
      <text class="text-muted">共 {{ total }} 条</text>
    </view>

    <view class="entry-list">
      <view
        v-for="item in visibleList"
        :key="item.id"
        class="entry-card card"
        hover-class="entry-card--hover"
        hover-stay-time="90"
        @tap="goDetail(item)"
      >
        <image
          v-if="item.icon && !brokenIcons[item.id]"
          class="entry-card__img"
          :src="item.icon"
          mode="aspectFill"
          lazy-load
          @error="brokenIcons[item.id] = true"
        />
        <view v-else class="entry-card__badge" :style="{ color: rarityColor(item), background: hexTint(rarityColor(item)) }">
          {{ badgeText(item) }}
        </view>
        <view class="entry-card__body">
          <view class="entry-card__title">
            <text>{{ item.name }}</text>
            <text v-if="!item.verified" class="mini-tag mini-tag--warn">待核实</text>
            <text v-if="item.rarity" class="mini-tag" :style="{ color: rarityColor(item), background: hexTint(rarityColor(item)) }">{{ item.rarity }}</text>
          </view>
          <view class="entry-card__desc">{{ cleanSummary(item) }}</view>
          <view v-if="item.tags && item.tags.length" class="chip-row">
            <text v-for="tag in item.tags.slice(0, 4)" :key="tag" class="chip chip--ghost">{{ tag }}</text>
          </view>
        </view>
        <view class="entry-card__arrow">›</view>
      </view>
    </view>

    <view v-if="list.length > visibleCount" class="cl-more" hover-class="cl-more--hover" @tap="visibleCount += PAGE_SIZE">
      加载更多（已显示 {{ visibleCount }} / {{ list.length }} 条）
    </view>
    <view v-else-if="list.length > PAGE_SIZE" class="cl-more cl-more--end">已加载全部 {{ list.length }} 条</view>

    <view v-if="!list.length" class="cl-empty">
      <view class="cl-empty__icon">◌</view>
      <view class="cl-empty__text">没有符合条件的条目，试试放宽筛选</view>
      <view v-if="keyword || hasActiveFacet" class="cl-empty__reset" hover-class="cl-empty__reset--hover" @tap="resetFilters">清空筛选</view>
      <view v-else class="cl-empty__reset" hover-class="cl-empty__reset--hover" @tap="reload">重新加载</view>
    </view>
    <view class="footnote">{{ notice }}</view>
  </view>
</template>

<script setup>
import { useTheme } from '@/utils/theme.js';

const { isDark } = useTheme();
import { computed, ref, watch } from 'vue';
import { getCatalog, onCatalogUpdate } from '@/services/content.js';

const props = defineProps({
  type: { type: String, required: true },
  searchPlaceholder: { type: String, default: '搜索名称、描述、标签' },
  facets: { type: Array, default: () => ['category', 'rarity', 'tags'] },
  detailPath: { type: String, default: '' },
  badge: { type: String, default: 'category' },
  accent: { type: String, default: '#2f6bff' },
  titleSuffix: { type: String, default: '' }
});

const FACET_LABELS = { category: '类别', rarity: '稀有度', tags: '标签' };
const SEARCH_FIELDS = ['name', 'summary', 'desc', 'category', 'rarity'];

const keyword = ref('');
const active = ref({ category: '全部', rarity: '全部', tags: '全部' });
const openRows = ref({});
const brokenIcons = ref({});
const catalog = ref({ items: [], notice: '' });

// 增量渲染：长列表先渲染 PAGE_SIZE 条，避免 300 条一次铺满
const PAGE_SIZE = 60;
const visibleCount = ref(PAGE_SIZE);
watch([keyword, active, () => catalog.value], () => {
  visibleCount.value = PAGE_SIZE;
});

const tintBg = computed(() => hexTint(props.accent));
const heroBg = computed(() => `linear-gradient(132deg, ${props.accent} 0%, ${hexFade(props.accent, 0.72)} 55%, ${hexFade(props.accent, 0.35)} 100%)`);
const heroTitle = computed(() => (catalog.value.notice || '').split('数据采集')[0].split('条目')[0].slice(0, 14) || '图鉴');
function hexFade(hex, alpha) {
  const value = String(hex || '').replace('#', '');
  if (value.length !== 6) return `rgba(47, 107, 255, ${alpha})`;
  const num = parseInt(value, 16);
  return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
}
// 稀有度配色：徽章色条 + 标签
const RARITY_COLORS = { SSR: '#b56cff', SR: '#3f8cff', R: '#8a93a8', UR: '#ff5b7f', 五星: '#ffb02e', 四星: '#8a6cff', 三星: '#3f8cff', 未知: '#8a93a8' };
// 元素配色：敌人/副本/地区等按标签首个元素着色，一眼分辨属性
const ELE_TAG_COLORS = { 火: '#ff7a45', 焰: '#ff7a45', 水: '#2f9bff', 流: '#2f9bff', 冰: '#4fd2e8', 霜: '#4fd2e8', 雷: '#f2b50c', 电: '#f2b50c', 风: '#7ec8ff', 木: '#28b37a', 草: '#28b37a', 地: '#a0714f', 光: '#8a6cff', 暗: '#7a5cc9', 星: '#8a6cff' };
function tagColor(item) {
  for (const tag of item.tags || []) {
    if (ELE_TAG_COLORS[tag]) return ELE_TAG_COLORS[tag];
    for (const ch of tag) if (ELE_TAG_COLORS[ch]) return ELE_TAG_COLORS[ch];
  }
  return '';
}
const rarityColor = computed(() => (item) => tagColor(item) || RARITY_COLORS[item.rarity] || props.accent);
const items = computed(() => catalog.value.items || []);
const notice = computed(() => catalog.value.notice || '');
const total = computed(() => items.value.length);

const facetOptions = computed(() => {
  const counts = { category: new Map(), rarity: new Map(), tags: new Map() };
  items.value.forEach((item) => {
    bump(counts.category, item.category);
    bump(counts.rarity, item.rarity);
    (item.tags || []).forEach((tag) => bump(counts.tags, tag));
  });
  const sorted = (map, max) =>
    [...map.entries()]
      .filter(([name]) => name && name !== '未分类')
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'))
      .slice(0, max)
      .map(([name]) => name);
  return {
    category: sorted(counts.category, 24),
    rarity: sorted(counts.rarity, 16),
    tags: sorted(counts.tags, 20)
  };
});

const facetRows = computed(() =>
  props.facets
    .map((key) => {
      const options = ['全部', ...facetOptions.value[key]];
      return {
        key,
        label: FACET_LABELS[key] || key,
        active: active.value[key],
        options,
        open: Boolean(openRows.value[key])
      };
    })
    .filter((row) => row.options.length > 2)
);

const hasActiveFacet = computed(() => props.facets.some((key) => active.value[key] !== '全部'));

const list = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  return items.value.filter((item) => {
    if (active.value.category !== '全部' && item.category !== active.value.category) return false;
    if (active.value.rarity !== '全部' && item.rarity !== active.value.rarity) return false;
    if (active.value.tags !== '全部' && (item.tags || []).indexOf(active.value.tags) < 0) return false;
    if (kw) {
      const haystack = SEARCH_FIELDS.map((field) => item[field])
        .concat(item.tags || [], (item.fields || []).map((field) => `${field.label}${field.value}`))
        .join(' ')
        .toLowerCase();
      if (haystack.indexOf(kw) < 0) return false;
    }
    return true;
  });
});

const visibleList = computed(() => list.value.slice(0, visibleCount.value));

function bump(map, value) {
  if (!value) return;
  map.set(value, (map.get(value) || 0) + 1);
}

function hexTint(hex) {
  const value = String(hex || '').replace('#', '');
  if (value.length !== 6) return 'rgba(47,107,255,0.09)';
  const num = parseInt(value, 16);
  return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, 0.1)`;
}

function badgeText(item) {
  const uncategorized = !item.category || item.category === '未分类';
  if (props.badge === 'rarity') return item.rarity || (uncategorized ? (item.tags && item.tags[0]) || '—' : item.category);
  if (props.badge === 'tag') return (item.tags && item.tags[0]) || (uncategorized ? '—' : item.category);
  return uncategorized ? (item.tags && item.tags[0]) || item.rarity || '—' : item.category;
}

// 采集数据的“未分类 · R · 攻击”式摘要在界面上弱化“未分类”前缀
function cleanSummary(item) {
  return String(item.summary || '').replace(/^(未分类|其他)\s*·\s*/, '') || item.desc || '暂无描述';
}

function toggleFacet(key) {
  openRows.value = Object.assign({}, openRows.value, { [key]: !openRows.value[key] });
}

function setFacet(key, option) {
  active.value = Object.assign({}, active.value, { [key]: option });
  openRows.value = Object.assign({}, openRows.value, { [key]: false });
}

function resetFilters() {
  keyword.value = '';
  active.value = { category: '全部', rarity: '全部', tags: '全部' };
  openRows.value = {};
}

function onKeywordInput(event) {
  keyword.value = event.detail.value;
}

function onKeywordConfirm() {
  keyword.value = keyword.value.trim();
}

function goDetail(item) {
  const path = props.detailPath || `pages/${props.type}/detail`;
  uni.navigateTo({ url: `${path}?id=${item.id}` });
}

function reload() {
  catalog.value = getCatalog(props.type).data || { items: [], notice: '' };
}

reload();
let unsubscribe = onCatalogUpdate(reload);
</script>

<style>
.cl-hero {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-lg);
  padding: 30rpx 32rpx;
  margin-bottom: 20rpx;
  color: #ffffff;
  box-shadow: 0 12rpx 30rpx rgba(31, 61, 158, 0.25);
}

.cl-hero__dots {
  position: absolute;
  inset: 0;
  opacity: 0.25;
  background-image: radial-gradient(rgba(255, 255, 255, 0.85) 1.5rpx, transparent 1.5rpx);
  background-size: 22rpx 22rpx;
}

.cl-hero__body {
  position: relative;
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.cl-hero__emoji {
  font-size: 52rpx;
}

.cl-hero__title {
  display: block;
  font-size: 34rpx;
  font-weight: 800;
  text-shadow: 0 2rpx 10rpx rgba(10, 14, 38, 0.3);
}

.cl-hero__sub {
  display: block;
  margin-top: 6rpx;
  font-size: 23rpx;
  opacity: 0.9;
}

.cl-search {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 14rpx 20rpx;
  border-radius: 40rpx;
  background: var(--soft);
}

.cl-search__icon {
  color: var(--ink-3);
  font-size: 32rpx;
}

.cl-search__input {
  flex: 1;
  font-size: 26rpx;
  color: var(--ink);
}

.cl-search__ph {
  color: var(--ink-3);
}

.cl-search__clear {
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--soft);
  color: var(--ink-2);
  font-size: 26rpx;
}

.facets {
  max-height: 1200rpx;
}

.facet-row {
  margin-top: 12rpx;
  border-radius: 16rpx;
  background: var(--soft);
  overflow: hidden;
}

.facet-row__head {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 18rpx 20rpx;
}

.facet-row__label {
  font-size: 25rpx;
  color: var(--ink);
  font-weight: 600;
}

.facet-row__value {
  flex: 1;
  font-size: 23rpx;
  color: var(--ink-3);
  text-align: right;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.facet-row__arrow {
  color: var(--ink-3);
  font-size: 28rpx;
  transform: rotate(90deg);
  transition: transform 0.2s ease;
}

.facet-row__arrow--open {
  transform: rotate(-90deg);
}

.facet-row__body {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  padding: 6rpx 20rpx 20rpx;
}


.mini-tag {
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  background: var(--brand-soft);
  color: var(--brand-deep);
  font-size: 20rpx;
}

.mini-tag--warn {
  background: var(--warn-soft);
  color: var(--warn-ink);
}

.entry-card__arrow {
  color: var(--ink-3);
  font-size: 32rpx;
  align-self: center;
}

.entry-card__img {
  flex: none;
  width: 76rpx;
  height: 76rpx;
  border-radius: 22rpx;
  background: var(--soft);
}

.cl-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  padding: 90rpx 0 40rpx;
}

.cl-empty__icon {
  width: 110rpx;
  height: 110rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--soft);
  color: var(--ink-3);
  font-size: 52rpx;
}

.cl-empty__text {
  color: var(--ink-3);
  font-size: 25rpx;
}

.entry-card--hover {
  transform: scale(0.98);
}

.entry-card {
  transition: transform 0.16s ease;
}

.cl-more {
  margin: 24rpx 0 8rpx;
  padding: 20rpx 0;
  text-align: center;
  border-radius: 40rpx;
  border: 1rpx solid var(--line);
  background: var(--card-bg);
  color: var(--brand);
  font-size: 25rpx;
  transition: transform 0.16s ease;
}

.cl-more--hover {
  transform: scale(0.98);
}

.cl-more--end {
  border: none;
  background: transparent;
  color: var(--ink-3);
  font-size: 22rpx;
}

.cl-empty__reset {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 64rpx;
  margin-top: 6rpx;
  padding: 0 44rpx;
  border-radius: 32rpx;
  background: var(--brand);
  color: #ffffff;
  font-size: 24rpx;
  transition: transform 0.16s ease;
}

.cl-empty__reset--hover {
  transform: scale(0.96);
}
</style>
