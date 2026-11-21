<template>
  <view class="page se-list" :class="{ 'theme-dark': isDark }">
    <view class="filter-bar">
      <view class="sl-search">
        <text class="sl-search__icon">⌕</text>
        <input
          class="sl-search__field"
          :value="keyword"
          placeholder="搜索灵子名称"
          confirm-type="search"
          @input="onKeywordChange"
          @confirm="onSearchConfirm"
        />
        <text v-if="keyword" class="sl-search__clear" hover-class="tap-hover" @tap="clearKeyword">×</text>
      </view>
      <!-- 方案一：筛选收纳为两个下拉触发器（职业/星级），选项进底部弹窗 -->
      <view class="sl-filter-row">
        <view
          class="sl-filter-chip"
          :class="{ 'sl-filter-chip--on': !!activeProf }"
          hover-class="tap-hover"
          @tap="openSheet('prof')"
        >
          <text class="sl-filter-chip__label">职业</text>
          <text class="sl-filter-chip__value">{{ activeProf || '全部' }}</text>
          <text class="sl-filter-chip__arrow">▾</text>
        </view>
        <view
          class="sl-filter-chip"
          :class="{ 'sl-filter-chip--on': !!activeStar }"
          hover-class="tap-hover"
          @tap="openSheet('star')"
        >
          <text class="sl-filter-chip__label">星级</text>
          <text class="sl-filter-chip__value">{{ activeStar ? `${activeStar}星` : '全部' }}</text>
          <text class="sl-filter-chip__arrow">▾</text>
        </view>
      </view>
    </view>

    <!-- 筛选底部弹窗：单选即生效 -->
    <view v-if="sheetOpen" class="sl-sheet-mask">
      <view class="sl-sheet-backdrop" @tap="sheetOpen = false" @touchmove.stop.prevent />
      <view class="sl-sheet" @tap.stop>
        <view class="sl-sheet__head">
          <text class="sl-sheet__title">{{ sheetMode === 'prof' ? '选择职业' : '选择星级' }}</text>
          <text class="sl-sheet__close" hover-class="tap-hover" @tap="sheetOpen = false">×</text>
        </view>
        <view class="sl-sheet__options">
          <view
            v-for="option in sheetOptions"
            :key="option.key"
            class="sl-sheet__option"
            :class="{ 'sl-sheet__option--on': option.active }"
            hover-class="tap-hover"
            @tap="pickOption(option)"
          >
            <text>{{ option.label }}</text>
            <text v-if="option.active" class="sl-sheet__check">✓</text>
          </view>
        </view>
      </view>
    </view>

    <view class="sl-result-row">
      <text class="sl-result-row__count">{{ list.length === totalCount ? `共 ${totalCount} 个灵子` : `找到 ${list.length} 个灵子` }}<text v-if="list.length !== totalCount" class="sl-result-row__total">（全部 {{ totalCount }} 个）</text></text>
    </view>

    <view v-if="list.length" class="entry-list">
      <view
        v-for="entry in list"
        :key="entry.id"
        class="entry-card card"
        hover-class="entry-card--hover"
        hover-stay-time="90"
        @tap="goDetail(entry.id)"
      >
        <view class="entry-card__imgwrap" :style="{ '--se-c': rarityColorOf(entry) }">
          <image
            v-if="srcOf(entry, 'spirit', 'icon', { fallback: legacyIconOf(entry) })"
            class="entry-card__img"
            :src="srcOf(entry, 'spirit', 'icon', { fallback: legacyIconOf(entry) })"
            mode="aspectFit"
            lazy-load
            @error="onError(entry, 'icon')"
          />
          <view v-else class="entry-card__glyph">{{ entry.name.slice(0, 1) }}</view>
        </view>
        <view class="entry-card__body">
          <view class="entry-card__title">
            <text>{{ entry.name }}</text>
            <text v-if="starsOf(entry)" class="mini-tag" :class="`mini-tag--s${starsOf(entry)}`">{{ starsOf(entry) }}星</text>
            <text v-if="profOf(entry)" class="mini-tag mini-tag--ghost">{{ profOf(entry) }}</text>
          </view>
          <view class="entry-card__desc">{{ entry.desc || entry.summary }}</view>
        </view>
      </view>
    </view>

    <view v-if="!list.length" class="cx-empty">
      <view class="cx-empty__icon">💠</view>
      <view class="cx-empty__text">{{ keyword ? '没有找到符合条件的灵子' : '暂无灵子数据' }}</view>
      <view v-if="keyword" class="sl-empty__reset" hover-class="tap-hover" @tap="keyword = ''">清除搜索</view>
    </view>

    <view class="footnote">资料来自 BWIKI 收录与公开 CBT3 数据 · 收录不等于官方核实 · 公测后以官方为准</view>
  </view>
</template>

<script setup>
import { useTheme } from '@/utils/theme.js';
const { isDark } = useTheme();
import { computed, ref } from 'vue';
import { onShow, onUnload, onShareAppMessage } from '@dcloudio/uni-app';
import { getCatalog, onCatalogUpdate } from '@/services/content.js';
import { soulOf, soulIcon } from '@/data/soul-essence.js';
import { useImageSources } from '@/utils/image-source.js';

const { srcOf, onError: nextImageSource } = useImageSources();
function onError(item, role) { nextImageSource(item, role); }

const keyword = ref('');
const appliedKeyword = ref('');
let keywordTimer = null;
const activeProf = ref('');
const activeStar = ref(0);
const sheetOpen = ref(false);
const sheetMode = ref('prof');

const items = ref([]);
function reload() {
  items.value = (getCatalog('spirit').data || {}).items || [];
}
reload();
onCatalogUpdate(reload);
onShow(() => reload());

const totalCount = computed(() => items.value.length);
const profOptions = computed(() => {
  const set = new Set();
  items.value.forEach((entry) => { const prof = profOf(entry); if (prof) set.add(prof); });
  return [...set];
});
const starOptions = [
  { key: 3, label: '3星' },
  { key: 4, label: '4星' },
  { key: 5, label: '5星' }
];

function profOf(entry) {
  const soulEntry = soulOf(entry.name);
  return (soulEntry && soulEntry.prof) || entry.category || '';
}
function starsOf(entry) {
  const soulEntry = soulOf(entry.name);
  return (soulEntry && soulEntry.stars) || 0;
}
// 图标第一候选走统一链（wiki 本地/云原图，索引 75/75 命中）；灵子 CDN 与数据 icon 作回退档。
function legacyIconOf(entry) {
  const soulEntry = soulOf(entry.name);
  return (soulEntry && soulEntry.icon) ? soulIcon(soulEntry.icon) : entry.icon || '';
}
// 稀有度色：3星蓝 / 4星紫 / 5星金（卡片图标座与星标同色系）
const RARITY_COLORS = { 3: '#4a8df0', 4: '#9b6cff', 5: '#f2b50c' };
function rarityColorOf(entry) {
  return RARITY_COLORS[starsOf(entry)] || '#7f5bff';
}

const list = computed(() => items.value.filter((entry) => {
  if (appliedKeyword.value && !String(entry.name || '').includes(appliedKeyword.value)) return false;
  if (activeProf.value && profOf(entry) !== activeProf.value) return false;
  if (activeStar.value && starsOf(entry) !== activeStar.value) return false;
  return true;
}));

// 输入防抖与奇波/角色列表一致（规范 03）：停止输入 250ms 后才应用关键字
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
function onSearchConfirm() {
  if (keywordTimer) clearTimeout(keywordTimer);
  keywordTimer = null;
  appliedKeyword.value = keyword.value;
}
function clearKeyword() {
  if (keywordTimer) clearTimeout(keywordTimer);
  keywordTimer = null;
  keyword.value = '';
  appliedKeyword.value = '';
}

// 底部弹窗：单选即生效（picker 行为），选项随当前数据生成
function openSheet(mode) {
  sheetMode.value = mode;
  sheetOpen.value = true;
}
const sheetOptions = computed(() => {
  if (sheetMode.value === 'prof') {
    const options = [{ key: '', label: '全部职业', active: !activeProf.value }];
    profOptions.value.forEach((prof) => options.push({ key: prof, label: prof, active: activeProf.value === prof }));
    return options;
  }
  return [
    { key: 0, label: '全部星级', active: !activeStar.value },
    ...starOptions.map((star) => ({ key: star.key, label: star.label, active: activeStar.value === star.key }))
  ];
});
function pickOption(option) {
  if (sheetMode.value === 'prof') activeProf.value = option.key;
  else activeStar.value = option.key;
  sheetOpen.value = false;
}
function goDetail(id) {
  uni.navigateTo({ url: `/pages/spirit/detail?id=${id}` });
}

onUnload(() => {
  if (keywordTimer) clearTimeout(keywordTimer);
});
onShareAppMessage(() => ({ title: '灵子图鉴 · 奇波小助手', path: '/pages/spirit/list' }));
</script>

<style>
/* 灵子列表：搜索 + 筛选 chips + 图标卡片（对齐奇波列表视觉，仅本页使用） */
.se-list .filter-bar {
  position: sticky;
  top: 0;
  z-index: 10;
  margin: 0 0 16rpx;
  padding: 12rpx 0 8rpx;
  background: var(--bg);
}
.sl-search {
  display: flex;
  align-items: center;
  gap: 12rpx;
  height: 40px;
  padding: 0 24rpx;
  box-sizing: border-box;
  border-radius: 20px;
  background: var(--card-bg);
  border: 1rpx solid var(--line);
  box-shadow: 0 4rpx 14rpx rgba(31, 42, 68, .05);
}
.sl-search__icon { font-size: 30rpx; color: var(--ink-3); }
.sl-search__field { flex: 1; min-width: 0; height: 40px; font-size: 26rpx; color: var(--ink); }
.sl-search__clear { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; margin-right: -12rpx; font-size: 32rpx; color: var(--ink-3); }
/* 方案一：筛选收纳为两个下拉触发器（职业/星级），选项进底部弹窗 */
.sl-filter-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 12rpx;
}
.sl-filter-chip {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  min-height: 40px;
  padding: 0 16rpx;
  box-sizing: border-box;
  border: 1rpx solid var(--line);
  border-radius: 20px;
  background: var(--card-bg);
  font-size: 22rpx;
  color: var(--ink-2);
  white-space: nowrap;
}
.sl-filter-chip__label { color: var(--ink-3); flex: none; }
.sl-filter-chip__value {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--ink);
  font-weight: 600;
}
.sl-filter-chip__arrow { font-size: 20rpx; color: var(--ink-3); flex: none; }
.sl-filter-chip--on { background: var(--brand-soft); border-color: var(--brand); }
.sl-filter-chip--on .sl-filter-chip__value,
.sl-filter-chip--on .sl-filter-chip__label { color: var(--brand-deep); }
.sl-sheet-mask {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: rgba(16, 22, 38, 0.42);
  display: flex;
  align-items: flex-end;
}
.sl-sheet-backdrop { position: absolute; inset: 0; }
.sl-sheet {
  position: relative;
  width: 100%;
  box-sizing: border-box;
  padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
  border-radius: 24rpx 24rpx 0 0;
  background: var(--card-bg);
  animation: sl-sheet-in 180ms ease-out;
}
@keyframes sl-sheet-in { from { transform: translateY(24px); opacity: .7; } to { transform: translateY(0); opacity: 1; } }
.sl-sheet__head { display: flex; align-items: center; justify-content: space-between; padding: 8rpx 0 12rpx; }
.sl-sheet__title { font-size: 30rpx; font-weight: 600; color: var(--ink); }
.sl-sheet__close {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  height: 44px;
  margin-right: -8px;
  font-size: 40rpx;
  color: var(--ink-3);
}
.sl-sheet__options { display: flex; flex-direction: column; padding-bottom: 8rpx; }
.sl-sheet__option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
  padding: 0 12rpx;
  color: var(--ink);
  font-size: 26rpx;
  border-bottom: 1rpx solid var(--line);
}
.sl-sheet__option:last-child { border-bottom: none; }
.sl-sheet__option--on { color: var(--brand); font-weight: 600; }
.sl-sheet__check { color: var(--brand); font-weight: 700; }
.sl-result-row { display: flex; align-items: center; padding: 0 8rpx 12rpx; }
.sl-result-row__count { color: var(--ink); font-size: 25rpx; font-weight: 600; }
.sl-result-row__total { color: var(--ink-2); font-size: 22rpx; font-weight: 400; }
.entry-list { display: grid; grid-template-columns: minmax(0, 1fr); gap: 14rpx; }
.entry-card {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 0;
  min-width: 0;
  min-height: 172rpx;
  padding: 0;
  overflow: hidden;
}
.entry-card__imgwrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 172rpx;
  flex: none;
  background-color: var(--se-c, #7f5bff);
  background-image: linear-gradient(160deg, rgba(255, 255, 255, 0.22) 0%, rgba(0, 0, 0, 0.22) 100%);
}
.entry-card__img { width: 128rpx; height: 128rpx; }
.entry-card__glyph {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
  font-size: 34rpx;
  font-weight: 800;
}
.entry-card__body { flex: 1; min-width: 0; padding: 16rpx 20rpx; display: flex; flex-direction: column; justify-content: center; }
/* 强化标题：加粗加大；名称占剩余宽度超长省略，星级/职业标签同行右置垂直居中 */
.entry-card__title { display: flex; align-items: center; gap: 8rpx; min-width: 0; font-size: 30rpx; font-weight: 800; color: var(--ink); }
.entry-card__title > text:first-child {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
/* 弱化描述：调淡灰 + 最多两行省略 */
.entry-card__desc {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  margin-top: 6rpx;
  color: var(--ink-3);
  font-size: 22rpx;
  line-height: 1.5;
}
.mini-tag { padding: 2rpx 12rpx; border-radius: 8rpx; font-size: 20rpx; font-weight: 600; }
.mini-tag--s3 { background: rgba(74, 141, 240, 0.14); color: #2f6bcc; }
.mini-tag--s4 { background: rgba(138, 108, 255, 0.14); color: #7a4fe8; }
.mini-tag--s5 { background: rgba(242, 176, 12, 0.16); color: #a06b00; }
.mini-tag--ghost { background: var(--soft); color: var(--ink-2); font-weight: 400; }
.sl-empty__reset { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; margin-top: 12rpx; padding: 0 32rpx; border-radius: 22px; background: var(--brand-soft); color: var(--brand-deep); font-size: 26rpx; }
.theme-dark .mini-tag--s3 { background: rgba(74, 141, 240, 0.2); color: #8ab6ff; }
.theme-dark .mini-tag--s4 { background: rgba(138, 108, 255, 0.22); color: #c3aeff; }
.theme-dark .mini-tag--s5 { background: rgba(242, 176, 12, 0.2); color: #ffcf7a; }

/* #ifdef H5 */
/* 隐藏页面纵向滚动条（H5 预览观感；条件编译仅 H5 生效，微信端不受影响） */
::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}
/* #endif */
</style>
