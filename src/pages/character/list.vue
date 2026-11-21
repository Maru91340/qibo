<template>
  <page-meta :page-style="filterSheetOpen || sortSheetOpen ? 'overflow: hidden;' : ''" />
  <view class="page character-page" :class="{ 'theme-dark': isDark }">
    <view class="filter-bar card">
      <cx-input
        :value="keyword"
        shape="round"
        placeholder="搜角色、定位、配队思路"
        @change="onKeywordChange"
        @submit="onKeywordConfirm"
        @clear="clearKeyword"
      />
      <view class="character-filter-quick">
        <view class="character-filter-trigger" :class="{ 'character-filter-trigger--on': role !== '全部' }" hover-class="tap-hover" @tap="openFilterSheet('all')">
          <text class="character-filter-trigger__label">定位</text>
          <text class="character-filter-trigger__value">{{ role }}</text>
          <text>▾</text>
        </view>
        <view class="character-filter-trigger" :class="{ 'character-filter-trigger--on': rarity !== '全部' }" hover-class="tap-hover" @tap="openFilterSheet('all')">
          <text class="character-filter-trigger__label">星级</text>
          <text class="character-filter-trigger__value">{{ rarity }}</text>
          <text>▾</text>
        </view>
        <view class="character-filter-trigger" :class="{ 'character-filter-trigger--on': element !== 'all' }" hover-class="tap-hover" @tap="openFilterSheet('all')">
          <text class="character-filter-trigger__label">元素</text>
          <text class="character-filter-trigger__value">{{ selectedElementLabel }}</text>
          <text>▾</text>
        </view>
      </view>
    </view>

    <view class="character-result-row">
      <view class="character-result-copy">
        <text class="character-result-count">{{ list.length === totalCount ? `共 ${totalCount} 名角色` : `找到 ${list.length} 名角色` }}</text>
        <text v-if="teamCount" class="character-result-team">已编入 {{ teamCount }} 名</text>
        <text v-if="activeFilterCount" class="character-filter-clear" hover-class="tap-hover" @tap="clearCharacterFacets">清除筛选</text>
      </view>
      <view class="character-result-actions">
        <view class="character-fav-filter" :class="{ 'character-fav-filter--on': onlyFav }" role="switch" :aria-checked="onlyFav" aria-label="只看收藏" hover-class="tap-hover" @tap="onlyFav = !onlyFav">
          <text>{{ onlyFav ? '仅收藏' : '收藏' }}</text>
          <text class="character-fav-filter__count">{{ favCount }}</text>
        </view>
        <view class="character-sort-trigger" hover-class="tap-hover" @tap="sortSheetOpen = true">
          <text>{{ sortLabel }}</text>
          <text>▾</text>
        </view>
      </view>
    </view>

    <view v-if="loading" class="cl-loading">正在加载图鉴…</view>
    <view v-else-if="loadError" class="cl-error">
      <view class="cl-error__icon">!</view>
      <text class="cl-error__title">图鉴暂时加载失败</text>
      <text class="cl-error__text">请检查网络后重试，已保存的筛选条件不会丢失。</text>
      <view class="cl-error__retry" hover-class="tap-hover" @tap="reload">重新加载</view>
    </view>
    <view v-else class="entry-list">
      <view v-for="item in visibleList" :key="item.id" class="entry-card card"
        hover-class="entry-card--hover"
        hover-stay-time="90" @tap="goDetail(item.id)">
        <image
          v-if="srcOf(item, 'charWiki', 'avatar', { widths: [240, 160, 120], fallback: '' })"
          class="entry-card__img"
          :src="srcOf(item, 'charWiki', 'avatar', { widths: [240, 160, 120], fallback: '' })"
          :style="{ background: item.elementTint }"
          mode="aspectFit"
          lazy-load
          @error="onImageError(item)"
        />
        <view v-else class="entry-card__badge" :style="{ color: item.elementColor, background: item.elementTint }">
          {{ item.elementName }}
        </view>
        <view
          class="character-card__fav"
          :class="{ 'character-card__fav--on': favSet[item.id] }"
          :aria-label="favSet[item.id] ? '取消收藏' : '收藏'"
          hover-class="tap-hover"
          @tap.stop="toggleFavItem(item)"
        >{{ favSet[item.id] ? '★' : '☆' }}</view>
        <view class="entry-card__body">
          <view class="entry-card__title">
            <text>{{ item.name }}</text>
            <text v-if="!item.verified" class="mini-tag mini-tag--warn">待核实</text>
          </view>
          <view class="character-card__meta">
            <text class="mini-tag">{{ item.rarity }}</text>
            <text class="mini-tag mini-tag--ok">{{ item.role }}</text>
            <text v-for="option in item.elementOptions" :key="option.key" class="character-card__element" :style="{ color: option.color, background: option.tint }">{{ option.name }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="list.length > visibleCount" class="cl-more" hover-class="cl-more--hover" hover-stay-time="90" @tap="visibleCount += 60">
      加载更多（已显示 {{ visibleCount }} / {{ list.length }} 条）
    </view>
    <view v-else-if="list.length > 60" class="cl-more cl-more--end">已加载全部 {{ list.length }} 条</view>

    <view v-if="!loading && !loadError && !list.length" class="cx-empty">
      <view class="cx-empty__icon">🐾</view>
      <view class="cx-empty__text">{{ emptyText }}</view>
      <view v-if="appliedKeyword" class="cl-empty__reset" hover-class="tap-hover" @tap="clearKeyword">清除搜索</view>
      <view v-if="activeFilterCount" class="cl-empty__reset" hover-class="tap-hover" @tap="clearCharacterFacets">清除筛选</view>
      <view v-if="onlyFav" class="cl-empty__reset" hover-class="tap-hover" @tap="onlyFav = false">查看全部角色</view>
    </view>
    <view class="footnote">{{ notice }}</view>

    <view v-if="filterSheetOpen" class="character-sheet-mask">
      <view class="character-sheet-backdrop" @tap="filterSheetOpen = false" @touchmove.stop.prevent />
      <view class="character-sheet" @tap.stop>
        <view class="character-sheet__head">
          <view>
            <text class="character-sheet__title">{{ filterSheetTitle }}</text>
            <text class="character-sheet__hint">每组单选，可组合筛选</text>
          </view>
          <text class="character-sheet__close" aria-label="关闭筛选" hover-class="tap-hover" @tap="filterSheetOpen = false">×</text>
        </view>
        <scroll-view class="character-sheet__body" scroll-y>
          <view class="character-sheet__group">
            <view class="character-sheet__group-head">
              <text class="character-sheet__group-label">定位</text>
              <text class="character-sheet__group-value">{{ draftRole }}</text>
            </view>
            <view class="character-sheet__options">
              <view v-for="option in filters.roles" :key="option" class="character-sheet__option" :class="{ 'character-sheet__option--on': draftRole === option }" hover-class="tap-hover" @tap="setDraftFilter('role', option)">
                <text>{{ option }}</text><text v-if="draftRole === option">✓</text>
              </view>
            </view>
          </view>
          <view class="character-sheet__group">
            <view class="character-sheet__group-head">
              <text class="character-sheet__group-label">星级</text>
              <text class="character-sheet__group-value">{{ draftRarity }}</text>
            </view>
            <view class="character-sheet__options">
              <view v-for="option in filters.rarities" :key="option" class="character-sheet__option" :class="{ 'character-sheet__option--on': draftRarity === option }" hover-class="tap-hover" @tap="setDraftFilter('rarity', option)">
                <text>{{ option }}</text><text v-if="draftRarity === option">✓</text>
              </view>
            </view>
          </view>
          <view class="character-sheet__group">
            <view class="character-sheet__group-head">
              <text class="character-sheet__group-label">元素</text>
              <text class="character-sheet__group-value">{{ draftElementLabel }}</text>
            </view>
            <view class="character-sheet__options">
              <view v-for="option in elementOptions" :key="option.key" class="character-sheet__option character-sheet__option--element" :class="{ 'character-sheet__option--on': draftElement === option.key }" hover-class="tap-hover" @tap="setDraftFilter('element', option.key)">
                <view class="character-sheet__element-dot" :style="{ background: option.color }">{{ option.name }}</view>
                <text>{{ option.label }}</text><text v-if="draftElement === option.key">✓</text>
              </view>
            </view>
          </view>
        </scroll-view>
        <view class="character-sheet__foot">
          <view class="character-sheet__reset" hover-class="tap-hover" @tap="resetDraftFilter">重置全部</view>
          <view class="character-sheet__apply" hover-class="tap-hover" @tap="applyFilterSheet">查看结果（{{ draftCount }}）</view>
        </view>
      </view>
    </view>

    <view v-if="sortSheetOpen" class="character-sheet-mask">
      <view class="character-sheet-backdrop" @tap="sortSheetOpen = false" @touchmove.stop.prevent />
      <view class="character-sort-sheet" @tap.stop>
        <view class="character-sheet__head">
          <view>
            <text class="character-sheet__title">排序方式</text>
            <text class="character-sheet__hint">选择后立即更新列表</text>
          </view>
          <text class="character-sheet__close" aria-label="关闭排序" hover-class="tap-hover" @tap="sortSheetOpen = false">×</text>
        </view>
        <view class="character-sort-options">
          <view v-for="option in sortOptions" :key="option.key" class="character-sort-option" :class="{ 'character-sort-option--on': sortKey === option.key }" hover-class="tap-hover" @tap="selectSort(option.key)">
            <text>{{ option.label }}</text>
            <text v-if="sortKey === option.key">✓</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { useTheme } from '@/utils/theme.js';

const { isDark } = useTheme();
import { computed, ref, watch } from 'vue';
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app';
import { getCatalog, onCatalogUpdate } from '@/services/content.js';
import { createElementToolkit } from '@/data/element.js';
import { useImageSources } from '@/utils/image-source.js';
import { decorateWithElement, filterCharacters } from '@/utils/query.js';
import { load } from '@/utils/team.js';
import { listFavs, toggleFav } from '@/utils/favorites.js';

const keyword = ref('');
const appliedKeyword = ref('');
let keywordTimer = null;
const role = ref('全部');
const rarity = ref('全部');
const element = ref('all');
const onlyFav = ref(false);
const loading = ref(true);
const loadError = ref('');
const teamCount = ref(0);
const filterSheetOpen = ref(false);
const sortSheetOpen = ref(false);
const filterMode = ref('role');
const draftRole = ref('全部');
const draftRarity = ref('全部');
const draftElement = ref('all');
const { srcOf, onError: nextImageSource } = useImageSources();

const catalog = ref({ items: [], filters: {}, notice: '' });
const elementToolkit = ref(createElementToolkit(getCatalog('element').data));

const filters = computed(() => catalog.value.filters || {});
const notice = computed(() => catalog.value.notice || '');

const elementOptions = computed(() => [
  { key: 'all', name: '全', label: '全部元素', color: '#5a6480' },
  ...elementToolkit.value.elements
]);
const filterSheetTitle = computed(() => ({ all: '筛选角色', role: '选择定位', rarity: '选择星级', element: '选择元素' }[filterMode.value]));
const selectedElementLabel = computed(() => element.value === 'all' ? '全部' : (elementOptions.value.find((option) => option.key === element.value)?.label || '未知'));
const draftElementLabel = computed(() => draftElement.value === 'all' ? '全部' : (elementOptions.value.find((option) => option.key === draftElement.value)?.label || '未知'));
const activeFilterCount = computed(() => [role.value !== '全部', rarity.value !== '全部', element.value !== 'all'].filter(Boolean).length);
const draftCount = computed(() => {
  const matches = filterCharacters(catalog.value.items, {
    keyword: appliedKeyword.value,
    role: draftRole.value,
    rarity: draftRarity.value,
    element: draftElement.value
  });
  return onlyFav.value ? matches.filter((item) => favSet.value[item.id]).length : matches.length;
});

// 空态文案区分「搜索无结果」和「筛选/收藏无结果」，便于给出对应的一键撤销入口。
const emptyText = computed(() => {
  if (appliedKeyword.value) return '没有找到符合条件的角色';
  if (onlyFav.value && !activeFilterCount.value) return '还没有收藏的角色';
  return '没有符合筛选条件的角色';
});

// 增量渲染：默认 60 条，筛选变化重置
const visibleCount = ref(60);
const totalCount = computed(() => (catalog.value.items || []).length);
const favSet = ref({});
const favCount = computed(() => (catalog.value.items || []).filter((item) => favSet.value[item.id]).length);

// 排序：默认（数据顺序）/ 稀有度
const RARITY_ORDER = ['SSR', 'SR', 'R', '五星', '四星', '闪光', '星彩', '稀有', '普通', '未知'];
const sortKey = ref('default');
const sortOptions = [{ key: 'default', label: '默认排序' }, { key: 'rarity', label: '星级从高到低' }];
const sortLabel = computed(() => sortOptions.find((option) => option.key === sortKey.value)?.label || '默认排序');
const rarityRank = (item) => {
  const r = item.rarity || '';
  const idx = RARITY_ORDER.indexOf(r);
  if (idx >= 0) return RARITY_ORDER.length - idx;
  const m = r.match(/(\d)星/);
  return m ? parseInt(m[1], 10) * 2 : 0;
};
const sortedList = computed(() => {
  if (sortKey.value !== 'rarity') return list.value;
  return list.value.slice().sort((a, b) => rarityRank(b) - rarityRank(a));
});

const list = computed(() => {
  const matches = filterCharacters(catalog.value.items, {
    keyword: appliedKeyword.value,
    role: role.value,
    rarity: rarity.value,
    element: element.value
  });
  return onlyFav.value ? matches.filter((item) => favSet.value[item.id]) : matches;
});
const visibleList = computed(() =>
  sortedList.value.slice(0, visibleCount.value).map((item) => {
    const decorated = decorateWithElement(item, elementToolkit.value.elementMap);
    const keys = item.elements && item.elements.length ? item.elements : [item.element];
    return Object.assign({}, decorated, {
      elementOptions: keys.map((key) => elementToolkit.value.elementMap[key]).filter(Boolean)
    });
  })
);

function reload() {
  loading.value = true;
  loadError.value = '';
  try {
    catalog.value = getCatalog('character').data || { items: [], filters: {}, notice: '' };
    elementToolkit.value = createElementToolkit(getCatalog('element').data);
  } catch (error) {
    catalog.value = { items: [], filters: {}, notice: '' };
    loadError.value = 'catalog-load-failed';
  } finally {
    loading.value = false;
  }
}

watch([appliedKeyword, role, rarity, element, onlyFav], () => {
  visibleCount.value = 60;
});

// 从本地收藏读取角色状态，和角色详情的 charWiki 类型保持一致。
function refreshFavs() {
  const map = {};
  listFavs().forEach((fav) => { if (fav.type === 'charWiki') map[fav.id] = true; });
  favSet.value = map;
}

// 卡片收藏只更新本地收藏，不改变队伍或已拥有状态。
function toggleFavItem(item) {
  const on = toggleFav({ type: 'charWiki', id: item.id, name: item.name || '', icon: item.icon || '' });
  favSet.value = { ...favSet.value, [item.id]: on };
  uni.showToast({ title: on ? '已收藏' : '已取消收藏', icon: 'none' });
}

// 输入防抖与奇波列表一致：停止输入 250ms 后才应用关键字，避免边输入边重排列表。
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

// 确认搜索时立即应用当前输入。
function onKeywordConfirm() {
  if (keywordTimer) clearTimeout(keywordTimer);
  keywordTimer = null;
  appliedKeyword.value = keyword.value;
}

// 清空搜索时同步清除待应用的关键字。
function clearKeyword() {
  if (keywordTimer) clearTimeout(keywordTimer);
  keywordTimer = null;
  keyword.value = '';
  appliedKeyword.value = '';
}

// 头像加载失败时切换到下一档候选，全部失败后显示等尺寸元素占位。
function onImageError(item) {
  nextImageSource(item, 'avatar');
}

// 打开筛选面板时复制当前条件，关闭面板不会误改列表。
function openFilterSheet(mode) {
  filterMode.value = mode;
  draftRole.value = role.value;
  draftRarity.value = rarity.value;
  draftElement.value = element.value;
  filterSheetOpen.value = true;
}

// 更新当前筛选面板中的单选草稿。
function setDraftFilter(key, value) {
  if (key === 'role') draftRole.value = value;
  if (key === 'rarity') draftRarity.value = value;
  if (key === 'element') draftElement.value = value;
}

// 应用筛选草稿并关闭面板。
function applyFilterSheet() {
  role.value = draftRole.value;
  rarity.value = draftRarity.value;
  element.value = draftElement.value;
  filterSheetOpen.value = false;
}

// 只重置当前面板对应的筛选项。
function resetDraftFilter() {
  if (filterMode.value === 'all') {
    draftRole.value = '全部';
    draftRarity.value = '全部';
    draftElement.value = 'all';
  }
  if (filterMode.value === 'role') draftRole.value = '全部';
  if (filterMode.value === 'rarity') draftRarity.value = '全部';
  if (filterMode.value === 'element') draftElement.value = 'all';
}

// 清除已应用的角色筛选，不影响搜索词和排序方式。
function clearCharacterFacets() {
  role.value = '全部';
  rarity.value = '全部';
  element.value = 'all';
}

// 选择排序方式并关闭排序面板。
function selectSort(key) {
  sortKey.value = key;
  sortSheetOpen.value = false;
}

function goDetail(id) {
  // 阶段5：角色详情唯一入口为分包 /pkg-character/detail（旧主包页仅保留兼容跳转）
  uni.navigateTo({ url: `/pkg-character/detail?id=${id}` });
}

let unsubscribe = null;
onLoad((options) => {
  if (options && options.keyword) keyword.value = decodeURIComponent(options.keyword);
  reload();
});
onShow(() => {
  teamCount.value = load().members.length;
  refreshFavs();
});
unsubscribe = onCatalogUpdate(reload);
onUnload(() => unsubscribe && unsubscribe());
</script>

<style>
.character-page .filter-bar {
  padding: 14rpx 18rpx;
  margin-bottom: 14rpx;
}

.character-filter-quick {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8rpx;
  margin-top: 10rpx;
}

.character-filter-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  min-width: 0;
  min-height: 44px;
  padding: 0 12rpx;
  box-sizing: border-box;
  border-radius: 20px;
  background: var(--soft);
  color: var(--ink-2);
  font-size: 22rpx;
}

.character-filter-trigger--on {
  background: var(--brand-soft);
  color: var(--brand-deep);
  font-weight: 600;
}

.character-filter-trigger__label,
.character-filter-trigger__value {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.character-filter-trigger__value {
  flex: 1;
  text-align: right;
}

.character-filter-trigger--more {
  padding: 0 20rpx;
  white-space: nowrap;
}

.character-filter-trigger__count {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28rpx;
  height: 28rpx;
  border-radius: 50%;
  background: var(--brand);
  color: #ffffff;
  font-size: 18rpx;
}

.character-result-row,
.character-result-copy,
.character-result-actions,
.character-card__meta {
  display: flex;
  align-items: center;
}

.character-result-row {
  justify-content: space-between;
  gap: 12rpx;
  padding: 0 8rpx 14rpx;
}

.character-result-copy {
  min-width: 0;
  gap: 10rpx;
  flex-wrap: wrap;
}

.character-result-actions {
  flex: none;
  gap: 8rpx;
}

.character-fav-filter {
  display: flex;
  align-items: center;
  gap: 6rpx;
  min-height: 44px;
  padding: 0 14rpx;
  box-sizing: border-box;
  border: 1rpx solid var(--line);
  border-radius: 22px;
  background: var(--card-bg);
  color: var(--ink-2);
  font-size: 22rpx;
}

.character-fav-filter--on {
  border-color: var(--accent-gold);
  background: var(--reward-soft);
  color: var(--reward);
}

.character-fav-filter__count {
  font-variant-numeric: tabular-nums;
}

.character-result-count {
  color: var(--ink);
  font-size: 25rpx;
  font-weight: 600;
  white-space: nowrap;
}

.character-result-team {
  color: var(--ink-2);
  font-size: 21rpx;
  white-space: nowrap;
}

.character-filter-clear {
  display: flex;
  align-items: center;
  min-height: 44px;
  margin: -8px 0;
  padding: 0 8rpx;
  color: var(--brand);
  font-size: 22rpx;
  white-space: nowrap;
}

.character-sort-trigger {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  min-height: 44px;
  padding: 0 18rpx;
  box-sizing: border-box;
  border-radius: 22px;
  background: var(--soft);
  color: var(--brand-deep);
  font-size: 22rpx;
  white-space: nowrap;
}

.character-page.character-page .entry-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12rpx;
}

.character-page.character-page .entry-card {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0;
  min-width: 0;
  padding: 0;
  overflow: hidden;
  border: 1rpx solid var(--line);
  border-radius: 18rpx;
  box-shadow: 0 6rpx 18rpx rgba(31, 61, 158, 0.07);
}

.character-page.character-page .entry-card__img,
.character-page.character-page .entry-card__badge {
  width: 100%;
  height: 232rpx;
  padding: 10rpx;
  box-sizing: border-box;
  border-radius: 0;
  background: var(--soft);
}

.character-page.character-page .entry-card__body {
  padding: 14rpx 12rpx 16rpx;
}

.character-card__fav {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(16, 24, 39, 0.46);
  color: #ffffff;
  font-size: 32rpx;
}

.character-card__fav--on {
  color: var(--accent-gold);
}

.character-page.character-page .entry-card__title {
  align-items: center;
  flex-wrap: nowrap;
  gap: 6rpx;
  height: 58rpx;
  overflow: hidden;
  font-size: 26rpx;
  line-height: 1.35;
}

.character-page.character-page .entry-card__title > text:first-child {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.character-card__meta {
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 6rpx;
  margin-top: 8rpx;
}

.character-page .mini-tag,
.character-card__element {
  display: inline-flex;
  align-items: center;
  min-height: 30rpx;
  padding: 2rpx 10rpx;
  box-sizing: border-box;
  border-radius: 999rpx;
  font-size: 18rpx;
  line-height: 1.4;
  white-space: nowrap;
}

.character-card__element {
  font-weight: 600;
}

.character-sheet-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: flex-end;
  background: rgba(16, 22, 38, 0.42);
}

.character-sheet-backdrop {
  position: absolute;
  inset: 0;
}

.character-sheet {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 82vh;
  max-height: 90vh;
  padding: 20rpx 24rpx 0;
  box-sizing: border-box;
  border-radius: 24rpx 24rpx 0 0;
  background: var(--card-bg);
}

.character-sheet__head,
.character-sheet__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.character-sheet__head {
  flex: none;
  padding-bottom: 18rpx;
}

.character-sheet__title,
.character-sheet__hint {
  display: block;
}

.character-sheet__title {
  color: var(--ink);
  font-size: 30rpx;
  font-weight: 600;
}

.character-sheet__hint {
  margin-top: 4rpx;
  color: var(--ink-2);
  font-size: 22rpx;
}

.character-sheet__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  color: var(--ink-3);
  font-size: 40rpx;
}

.character-sheet__body {
  flex: 1;
  min-height: 0;
}

.character-sheet__group {
  padding: 8rpx 0 18rpx;
}

.character-sheet__group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.character-sheet__group-label {
  color: var(--ink);
  font-size: 25rpx;
  font-weight: 600;
}

.character-sheet__group-value {
  color: var(--ink-2);
  font-size: 22rpx;
}

.character-sheet__options {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  padding: 12rpx 0 0;
}

.character-sheet__option {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  min-width: 120rpx;
  min-height: 44px;
  padding: 0 24rpx;
  box-sizing: border-box;
  border: 1rpx solid var(--line);
  border-radius: 22px;
  background: var(--soft);
  color: var(--ink-2);
  font-size: 24rpx;
}

.character-sheet__option--on {
  border-color: var(--brand);
  background: var(--brand);
  color: #ffffff;
  font-weight: 600;
}

.character-sheet__option--element {
  justify-content: flex-start;
}

.character-sheet__element-dot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  color: #ffffff;
  font-size: 20rpx;
  font-weight: 600;
}

.character-sheet__foot {
  flex: none;
  gap: 16rpx;
  padding: 16rpx 0 calc(16rpx + env(safe-area-inset-bottom));
}

.character-sheet__reset,
.character-sheet__apply {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  border-radius: 22px;
  font-size: 26rpx;
}

.character-sheet__reset {
  flex: 0 0 30%;
  background: var(--soft);
  color: var(--ink-2);
}

.character-sheet__apply {
  flex: 1;
  background: var(--brand);
  color: #ffffff;
  font-weight: 600;
}

.character-sort-sheet {
  position: relative;
  width: 100%;
  padding: 20rpx 24rpx calc(20rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
  border-radius: 24rpx 24rpx 0 0;
  background: var(--card-bg);
}

.character-sort-options {
  display: flex;
  flex-direction: column;
}

.character-sort-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 52px;
  padding: 0 16rpx;
  border-bottom: 1rpx solid var(--line);
  color: var(--ink);
  font-size: 26rpx;
}

.character-sort-option:last-child {
  border-bottom: none;
}

.character-sort-option--on {
  color: var(--brand);
  font-weight: 600;
}
</style>
