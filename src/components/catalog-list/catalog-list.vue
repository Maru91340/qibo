<template>
  <view class="page catalog-page" :class="{ 'theme-dark': isDark, 'catalog-page--visual': visualMode, 'catalog-page--c3': columns === 3 }">
    <view v-if="columns !== 3" class="cl-hero" :style="{ background: heroBg }">
      <view class="cl-hero__dots" />
      <view class="cl-hero__body">
        <image class="cl-hero__icon" :src="heroIcon" mode="aspectFit" />
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
      <view v-if="visualMode && facetRows.length" class="cl-compact-filters" :class="{ 'cl-compact-filters--flat': !hasMoreFacets }">
        <view
          v-for="row in quickFacetRows"
          :key="row.key"
          class="cl-compact-filter"
          :class="{ 'cl-compact-filter--on': row.active !== '全部' }"
          hover-class="tap-hover"
          @tap="openFacetSheet(row.key)"
        >
          <text class="cl-compact-filter__label">{{ row.label }}</text>
          <text class="cl-compact-filter__value">{{ row.active === '全部' ? '全部' : row.active }}</text>
          <text class="cl-compact-filter__arrow">▾</text>
        </view>
        <view
          v-if="hasMoreFacets"
          class="cl-compact-filter cl-compact-filter--more"
          :class="{ 'cl-compact-filter--on': moreActiveCount > 0 }"
          hover-class="tap-hover"
          @tap="openSheet('more')"
        >
          <text>更多筛选</text>
          <text v-if="moreActiveCount" class="cl-compact-filter__count">{{ moreActiveCount }}</text>
          <text class="cl-compact-filter__arrow">›</text>
        </view>
      </view>
      <scroll-view v-else-if="facetRows.length" scroll-y class="facets">
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

    <!-- P2/I3：已选条件回显——单个 × 移除 + 一键清空 -->
    <view v-if="activeFacets.length" class="cl-active-facets">
      <view
        v-for="row in activeFacets"
        :key="row.key"
        class="cl-active-facet"
        hover-class="tap-hover"
        @tap="setFacet(row.key, '全部')"
      >
        <text class="cl-active-facet__label">{{ row.label }}</text>
        <text class="cl-active-facet__value">{{ row.value }}</text>
        <text class="cl-active-facet__x">×</text>
      </view>
      <view class="cl-active-facet cl-active-facet--clear" hover-class="tap-hover" @tap="resetFilters">清空</view>
    </view>

    <view class="list-head">
      <text v-if="columns !== 3">命中 {{ list.length }} 条{{ titleSuffix }}</text>
      <view class="sort-row">
        <text
          v-for="option in sortOptions"
          :key="option.key"
          class="sort-chip"
          :class="{ 'sort-chip--on': sortKey === option.key }"
          hover-class="tap-hover"
          @tap="sortKey = option.key"
        >{{ option.label }}</text>
      </view>
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
          v-if="srcOf(item, type, 'icon')"
          class="entry-card__img"
          :src="srcOf(item, type, 'icon')"
          :mode="visualMode ? 'aspectFit' : 'aspectFill'"
          lazy-load
          @error="onImageError(item, 'icon')"
        />
        <view v-else class="entry-card__badge" :style="{ color: rarityColor(item), background: hexTint(rarityColor(item)) }">
          {{ badgeText(item) }}
        </view>
        <view class="entry-card__body">
          <view class="entry-card__title">
            <text>{{ item.name }}</text>
            <text v-if="!item.verified" class="mini-tag mini-tag--warn">待核实</text>
            <text v-if="item.rarity && columns !== 3" class="mini-tag" :style="{ color: rarityColor(item), background: hexTint(rarityColor(item)) }">{{ item.rarity }}</text>
          </view>
          <!-- 三列紧凑卡：左类别右星级的元信息行（替代原稀有度角标，星级只保留文字） -->
          <view v-if="columns === 3" class="entry-card__meta">
            <text class="entry-card__meta-kind">{{ badgeText(item) }}</text>
            <text v-if="item.rarity" class="entry-card__meta-stars">{{ starGlyph(item.rarity) }}</text>
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

    <view v-if="visualMode && sheetOpen" class="cl-catalog-sheet-mask">
      <view class="cl-catalog-sheet-backdrop" @tap="sheetOpen = false" @touchmove.stop.prevent />
      <view class="cl-catalog-sheet" @tap.stop>
        <view class="cl-catalog-sheet__head">
          <view>
            <text class="cl-catalog-sheet__title">{{ sheetTitle }}</text>
            <text class="cl-catalog-sheet__hint">选择后立即更新结果</text>
          </view>
          <text class="cl-catalog-sheet__close" aria-label="关闭筛选" hover-class="tap-hover" @tap="sheetOpen = false">×</text>
        </view>
        <view class="cl-catalog-sheet__body">
          <view v-for="row in sheetFacetRows" :key="row.key" class="cl-catalog-sheet__group">
            <view class="cl-catalog-sheet__group-head">
              <text class="cl-catalog-sheet__label">{{ row.label }}</text>
              <text class="cl-catalog-sheet__current">{{ row.active === '全部' ? '不限' : row.active }}</text>
            </view>
            <!-- P2/I2：类别按大组（探索/养成/家园/其他）两级分组展示 -->
            <template v-if="row.key === 'category' && categoryKindGroups.length">
              <view class="cl-catalog-sheet__options">
                <view
                  class="cl-catalog-sheet__option"
                  :class="{ 'cl-catalog-sheet__option--on': row.active === '全部' }"
                  hover-class="tap-hover"
                  @tap="setFacet(row.key, '全部')"
                >
                  <text>全部</text>
                  <text v-if="row.active === '全部'">✓</text>
                </view>
              </view>
              <view v-for="group in categoryKindGroups" :key="group.key" class="cl-catalog-sheet__kind">
                <view class="cl-catalog-sheet__kind-head">
                  <view class="cl-catalog-sheet__kind-dot" :style="{ background: group.color }" />
                  <text class="cl-catalog-sheet__kind-name">{{ group.key }}</text>
                </view>
                <view class="cl-catalog-sheet__options">
                  <view
                    v-for="option in group.options"
                    :key="option"
                    class="cl-catalog-sheet__option"
                    :class="{ 'cl-catalog-sheet__option--on': option === row.active }"
                    hover-class="tap-hover"
                    @tap="setFacet(row.key, option)"
                  >
                    <text>{{ option }}</text>
                    <text v-if="option === row.active">✓</text>
                  </view>
                </view>
              </view>
            </template>
            <view v-else class="cl-catalog-sheet__options">
              <view
                v-for="option in row.options"
                :key="option"
                class="cl-catalog-sheet__option"
                :class="{ 'cl-catalog-sheet__option--on': option === row.active }"
                hover-class="tap-hover"
                @tap="setFacet(row.key, option)"
              >
                <text>{{ optionLabel(row.key, option) }}</text>
                <text v-if="option === row.active">✓</text>
              </view>
            </view>
          </view>
        </view>
        <view class="cl-catalog-sheet__foot">
          <view class="cl-catalog-sheet__reset" hover-class="tap-hover" @tap="resetSheetFilters">重置</view>
          <view class="cl-catalog-sheet__done" hover-class="tap-hover" @tap="sheetOpen = false">查看 {{ list.length }} 条结果</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { useTheme } from '@/utils/theme.js';
import { useImageSources } from '@/utils/image-source.js';
import { ITEM_KIND_META, itemKindOf } from '@/data/catalog.js';

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
  titleSuffix: { type: String, default: '' },
  visualMode: { type: Boolean, default: false },
  // 列数：2=双列大卡（默认），3=三列紧凑竖卡（竞品对齐，物品页先行）
  columns: { type: Number, default: 2 }
});

// 9.1 / S01：Hero 头使用星晶双色图标（与首页宫格同一套 PNG，文件名 = 板块 key）
const heroIcon = `/static/icons/${props.type}.png`;

const FACET_LABELS = { kind: '种类', category: '类别', rarity: '稀有度', tags: '标签', usage: '用途' };
const SEARCH_FIELDS = ['name', 'summary', 'desc', 'category', 'rarity'];
// 常驻筛选栏的维度（对齐竞品：种类/类别/稀有度 一行 + 更多筛选收纳其余）
const QUICK_FACETS = ['kind', 'category', 'rarity'];

const keyword = ref('');
const active = ref({ kind: '全部', category: '全部', rarity: '全部', tags: '全部', usage: '全部' });
const openRows = ref({});
const emit = defineEmits(['sheet']);
const sheetOpen = ref(false);
const sheetMode = ref('category');
watch(sheetOpen, (open) => emit('sheet', open));
// 图标走统一候选链（wiki 本地/云原图 → 映射 CDN → 原 icon 热链），微信端物品/装备等列表
// 不再直连 patchwiki（未配下载域名白名单会被拦截，表现为整页无图）。
const { srcOf, onError: onImageError } = useImageSources();
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
  const counts = { kind: new Map(), category: new Map(), rarity: new Map(), tags: new Map(), usage: new Map() };
  items.value.forEach((item) => {
    bump(counts.kind, item.kind);
    // 类别按多标签统计：组合值（如“材料、食物作物”）拆分为独立标签去重，避免选项重复混乱
    (item.categories && item.categories.length ? item.categories : [item.category]).forEach((cat) => {
      String(cat || '').split(/[、,，]/).forEach((part) => {
        const token = part.trim();
        if (token) bump(counts.category, token);
      });
    });
    bump(counts.rarity, item.rarity);
    (item.tags || []).forEach((tag) => bump(counts.tags, tag));
    (item.usage || []).forEach((usage) => bump(counts.usage, usage));
  });
  const sorted = (map, max) =>
    [...map.entries()]
      .filter(([name]) => name && name !== '未分类')
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'))
      .slice(0, max)
      .map(([name]) => name);
  // 种类按 BWIKI 大组固定顺序（探索/养成/家园/其他）
  const kindSorted = ITEM_KIND_META.order.filter((key) => counts.kind.has(key));
  return {
    kind: kindSorted,
    category: sorted(counts.category, 40),
    rarity: sorted(counts.rarity, 16),
    tags: sorted(counts.tags, 20),
    usage: sorted(counts.usage, 12)
  };
});

const facetRows = computed(() =>
  props.facets
    .map((key) => {
      // 页面可能声明未统计的 facet（如旧数据无 usage），兜底空数组避免展开 undefined 崩溃
      const options = ['全部', ...(facetOptions.value[key] || [])];
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

const hasActiveFacet = computed(() => props.facets.some((key) => active.value[key] && active.value[key] !== '全部'));
const quickFacetRows = computed(() => facetRows.value.filter((row) => QUICK_FACETS.includes(row.key)));
// 「更多筛选」只在确有剩余维度时出现，避免空弹窗（物品页 usage 无数据的历史问题）
const hasMoreFacets = computed(() => facetRows.value.some((row) => !QUICK_FACETS.includes(row.key)));
const sheetFacetRows = computed(() => sheetMode.value === 'more'
  ? facetRows.value.filter((row) => !QUICK_FACETS.includes(row.key))
  : facetRows.value.filter((row) => row.key === sheetMode.value));
const moreActiveCount = computed(() => props.facets.filter((key) => !QUICK_FACETS.includes(key) && active.value[key] && active.value[key] !== '全部').length);
// P2：已选条件回显（I3）——供筛选栏下方的 chips 使用，单个移除 + 一键清空
const activeFacets = computed(() => facetRows.value
  .filter((row) => row.active && row.active !== '全部')
  .map((row) => ({ key: row.key, label: row.label, value: row.active })));
// P2：类别弹层两级分组（I2）——子类按大组（探索/养成/家园/其他）归组展示
const categoryKindGroups = computed(() => {
  const row = facetRows.value.find((row) => row.key === 'category');
  if (!row) return [];
  const groups = ITEM_KIND_META.order.map((key) => ({ key, color: ITEM_KIND_META.colors[key] || '#8a93a8', options: [] }));
  const byKey = new Map(groups.map((group) => [group.key, group]));
  row.options.filter((option) => option !== '全部').forEach((option) => {
    (byKey.get(itemKindOf(option)) || byKey.get('其他')).options.push(option);
  });
  return groups.filter((group) => group.options.length);
});
// P2：稀有度选项图形化（U1）——1~5 星渲染对应数量的菱形
function optionLabel(key, option) {
  if (key === 'rarity') {
    const stars = parseInt(option, 10);
    if (Number.isFinite(stars) && stars > 0) return '★'.repeat(Math.min(stars, 5)) + ' ' + option;
  }
  return option;
}
// 卡片元信息星形：按星级渲染金色五角星（对齐竞品，省去“N星”文字）
function starGlyph(rarity) {
  const n = parseInt(rarity, 10);
  return Number.isFinite(n) && n > 0 ? '★'.repeat(Math.min(n, 5)) : '';
}
const sheetTitle = computed(() => sheetMode.value === 'more'
  ? '更多筛选'
  : `选择${FACET_LABELS[sheetMode.value] || '条件'}`);

const list = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  return items.value.filter((item) => {
    if (active.value.kind && active.value.kind !== '全部' && item.kind !== active.value.kind) return false;
    // 类别按多标签任一命中：选项已拆分去重，匹配时同样拆分组合值（“材料、食物作物”可被“材料”命中）
    if (active.value.category !== '全部') {
      const labels = (item.categories && item.categories.length ? item.categories : [item.category])
        .flatMap((cat) => String(cat || '').split(/[、,，]/))
        .map((part) => part.trim())
        .filter(Boolean);
      if (!labels.includes(active.value.category)) return false;
    }
    if (active.value.rarity !== '全部' && item.rarity !== active.value.rarity) return false;
    if (active.value.tags !== '全部' && (item.tags || []).indexOf(active.value.tags) < 0) return false;
    if (active.value.usage !== '全部' && (item.usage || []).indexOf(active.value.usage) < 0) return false;
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

// 排序：默认（采集顺序）/ 稀有度 / 星级
const RARITY_ORDER = ['UR', 'SSR', 'SR', 'R', '五星', '四星', '三星', '未知'];
const sortKey = ref('default');
const sortOptions = computed(() => {
  const hasRarity = list.value.some((item) => item.rarity);
  const hasStar = list.value.some((item) => /\d星/.test(item.rarity || '') || (item.fields || []).some((f) => f.label === '星数'));
  const opts = [{ key: 'default', label: '默认' }];
  if (hasRarity) opts.push({ key: 'rarity', label: '稀有度' });
  if (hasStar) opts.push({ key: 'star', label: '星级' });
  return opts;
});
const starOf = (item) => {
  const m = (item.rarity || '').match(/(\d)星/);
  if (m) return parseInt(m[1], 10);
  const f = (item.fields || []).filter((x) => x.label === '星数')[0];
  return f ? parseInt(f.value, 10) || 0 : 0;
};
const rarityRank = (item) => {
  const idx = RARITY_ORDER.indexOf(item.rarity);
  return idx >= 0 ? RARITY_ORDER.length - idx : 0;
};
const sortedList = computed(() => {
  const arr = list.value.slice();
  if (sortKey.value === 'rarity') arr.sort((a, b) => rarityRank(b) - rarityRank(a));
  if (sortKey.value === 'star') arr.sort((a, b) => starOf(b) - starOf(a));
  return arr;
});
const visibleList = computed(() => sortedList.value.slice(0, visibleCount.value));

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
  if (props.visualMode && sheetMode.value !== 'more') sheetOpen.value = false;
}

// 打开物品页的分组筛选面板。
function openFacetSheet(mode) {
  sheetMode.value = mode;
  sheetOpen.value = true;
}

// 只重置当前筛选面板中展示的条件。
function resetSheetFilters() {
  const next = { ...active.value };
  sheetFacetRows.value.forEach((row) => { next[row.key] = '全部'; });
  active.value = next;
}

function resetFilters() {
  keyword.value = '';
  active.value = { kind: '全部', category: '全部', rarity: '全部', tags: '全部', usage: '全部' };
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

.cl-hero__icon {
  width: 76rpx;
  height: 76rpx;
  filter: drop-shadow(0 4rpx 10rpx rgba(10, 14, 38, 0.25));
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


.sort-row {
  display: flex;
  gap: 10rpx;
}

.sort-chip {
  padding: 18rpx 20rpx;
  line-height: 1;
  border-radius: 999rpx;
  background: var(--soft);
  color: var(--ink-2);
  font-size: 22rpx;
}

.sort-chip--on {
  background: var(--brand);
  color: #fff;
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

.catalog-page--visual .cl-hero {
  padding: 20rpx 28rpx;
  margin-bottom: 12rpx;
  box-shadow: 0 8rpx 22rpx rgba(31, 61, 158, 0.18);
}

.catalog-page--visual .cl-hero__icon {
  width: 60rpx;
  height: 60rpx;
}

.catalog-page--visual .cl-hero__title {
  font-size: 30rpx;
}

.catalog-page--visual .cl-hero__sub {
  margin-top: 2rpx;
  font-size: 22rpx;
}

.catalog-page--visual .filter-bar {
  padding: 10rpx 18rpx;
  margin-bottom: 12rpx;
}

.catalog-page--visual .cl-search {
  min-height: 40px;
  box-sizing: border-box;
  padding: 0 20rpx;
}

.cl-compact-filters {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  gap: 8rpx;
  margin-top: 10rpx;
}

.cl-compact-filter {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  min-width: 0;
  min-height: 40px;
  padding: 0 12rpx;
  box-sizing: border-box;
  border-radius: 20px;
  background: var(--soft);
  color: var(--ink-2);
  font-size: 22rpx;
}

.cl-compact-filter--on {
  background: var(--brand-soft);
  color: var(--brand-deep);
  font-weight: 600;
}

.cl-compact-filter__label,
.cl-compact-filter__value {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.cl-compact-filter__value {
  flex: 1;
  text-align: right;
}

.cl-compact-filter__arrow {
  flex: none;
  font-size: 24rpx;
}

.cl-compact-filter--more {
  padding: 0 18rpx;
  white-space: nowrap;
}

.cl-compact-filter__count {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 28rpx;
  height: 28rpx;
  padding: 0 6rpx;
  box-sizing: border-box;
  border-radius: 14rpx;
  background: var(--brand);
  color: #ffffff;
  font-size: 18rpx;
}

/* 无剩余维度时三触发器等宽平铺（更多筛选隐藏后不留空列） */
.cl-compact-filters--flat {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.catalog-page--visual .list-head {
  padding-bottom: 12rpx;
}

.catalog-page--visual .entry-card__img,
.catalog-page--visual .entry-card__badge {
  width: 100%;
  height: 250rpx;
  box-sizing: border-box;
  padding: 14rpx;
  background: var(--soft);
}

.catalog-page--visual .entry-card__body {
  padding: 14rpx 16rpx 18rpx;
}

.catalog-page--visual .entry-card__title {
  align-items: flex-start;
  gap: 8rpx;
  min-height: 72rpx;
  padding-right: 0;
  font-size: 27rpx;
  line-height: 1.35;
}

.catalog-page--visual .entry-card__desc {
  min-height: 38rpx;
  margin-top: 6rpx;
  font-size: 22rpx;
}

/* 三列紧凑竖卡（columns=3）：竞品对齐，保留蓝色主题；desc/chips/箭头收起，元信息行替代稀有度角标 */
.catalog-page--c3 .entry-list {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12rpx;
}
/* hero 与命中数在 c3 收起（用户要求：更快看到列表） */
.catalog-page--c3 .cl-hero,
.catalog-page--c3 .list-head > text:first-child {
  display: none;
}
.catalog-page--c3 .list-head {
  justify-content: flex-end;
  padding-bottom: 8rpx;
}
.catalog-page--c3 .entry-card {
  border: 1rpx solid var(--line);
  border-radius: 12rpx;
  overflow: hidden;
}
.catalog-page--c3 .entry-card__img,
.catalog-page--c3 .entry-card__badge {
  width: 100%;
  height: 190rpx;
  padding: 20rpx;
  border-radius: 12rpx;
  box-sizing: border-box;
}
.catalog-page--c3 .entry-card__body {
  padding: 10rpx 10rpx 14rpx;
}
.catalog-page--c3 .entry-card__title {
  justify-content: center;
  min-height: 0;
  gap: 6rpx;
  font-size: 26rpx;
  line-height: 1.25;
}
.catalog-page--c3 .entry-card__title > text:first-child {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.catalog-page--c3 .entry-card__title .mini-tag {
  display: none;
}
.catalog-page--c3 .entry-card__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8rpx;
  margin-top: 10rpx;
  min-width: 0;
  color: var(--ink-2);
  font-size: 20rpx;
}
.catalog-page--c3 .entry-card__meta-kind {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.catalog-page--c3 .entry-card__meta-stars {
  flex: none;
  color: #ffb02e;
  font-size: 20rpx;
  letter-spacing: 2rpx;
}
.catalog-page--c3 .entry-card__desc,
.catalog-page--c3 .entry-card .chip-row,
.catalog-page--c3 .entry-card__arrow {
  display: none;
}
/* hero 减高：更快看到列表 */
.catalog-page--c3 .cl-hero {
  padding: 12rpx 24rpx;
  margin-bottom: 8rpx;
}
.catalog-page--c3 .cl-hero__icon {
  width: 52rpx;
  height: 52rpx;
}
.catalog-page--c3 .cl-hero__title {
  font-size: 28rpx;
}
.catalog-page--c3 .cl-hero__sub {
  margin-top: 2rpx;
  font-size: 20rpx;
}

.cl-catalog-sheet-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: flex-end;
  background: rgba(16, 22, 38, 0.42);
}

.cl-catalog-sheet-backdrop {
  position: absolute;
  inset: 0;
}

.cl-catalog-sheet {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: 76vh;
  padding: 20rpx 24rpx 0;
  box-sizing: border-box;
  border-radius: 24rpx 24rpx 0 0;
  overflow: hidden;
  background: var(--card-bg);
}

.cl-catalog-sheet__head,
.cl-catalog-sheet__group-head,
.cl-catalog-sheet__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cl-catalog-sheet__head {
  flex: none;
  padding-bottom: 16rpx;
}

.cl-catalog-sheet__title,
.cl-catalog-sheet__hint {
  display: block;
}

.cl-catalog-sheet__title {
  color: var(--ink);
  font-size: 30rpx;
  font-weight: 600;
}

.cl-catalog-sheet__hint,
.cl-catalog-sheet__current {
  margin-top: 4rpx;
  color: var(--ink-2);
  font-size: 22rpx;
}

.cl-catalog-sheet__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  color: var(--ink-3);
  font-size: 40rpx;
}

.cl-catalog-sheet__body {
  flex: 1;
  min-height: 0;
  /* 普通 view + overflow-y：跨端稳定的内部滚动（uni H5 scroll-view 在此场景不裁剪内容） */
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.cl-catalog-sheet__group {
  padding: 8rpx 0 26rpx;
}

.cl-catalog-sheet__label {
  color: var(--ink);
  font-size: 25rpx;
  font-weight: 600;
}

.cl-catalog-sheet__options {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
  margin-top: 14rpx;
}

.cl-catalog-sheet__option {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  min-height: 44px;
  padding: 0 24rpx;
  box-sizing: border-box;
  border: 1rpx solid var(--line);
  border-radius: 22px;
  background: var(--soft);
  color: var(--ink-2);
  font-size: 24rpx;
}

.cl-catalog-sheet__option--on {
  border-color: var(--brand);
  background: var(--brand);
  color: #ffffff;
  font-weight: 600;
}

/* ===== P2：类别两级分组 + 已选条件回显 ===== */
.cl-catalog-sheet__kind { margin-top: 16rpx; }
.cl-catalog-sheet__kind-head { display: flex; align-items: center; gap: 10rpx; padding: 8rpx 4rpx; }
.cl-catalog-sheet__kind-dot { width: 14rpx; height: 14rpx; border-radius: 50%; }
.cl-catalog-sheet__kind-name { color: var(--ink-2); font-size: 22rpx; font-weight: 700; }
.cl-active-facets { display: flex; flex-wrap: wrap; gap: 10rpx; margin: 12rpx 4rpx 0; }
.cl-active-facet {
  display: inline-flex; align-items: center; gap: 8rpx;
  padding: 6rpx 16rpx;
  border: 1rpx solid var(--brand, #2f6bff);
  border-radius: 999rpx;
  background: var(--brand-soft, rgba(47, 107, 255, 0.08));
  color: var(--brand-deep, #2f4dd0);
  font-size: 21rpx;
}
.cl-active-facet__label { color: var(--ink-3); font-size: 20rpx; }
.cl-active-facet__value { font-weight: 600; }
.cl-active-facet__x { color: var(--ink-3); font-size: 24rpx; line-height: 1; }
.cl-active-facet--clear { border-style: dashed; color: var(--ink-2); background: transparent; }

/* 实底操作栏：盖住弹窗内任何溢出内容，收口干净 */
.cl-catalog-sheet__foot {
  flex: none;
  gap: 16rpx;
  margin: 12rpx -24rpx 0;
  padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid var(--line);
  background: var(--card-bg);
}

.cl-catalog-sheet__reset,
.cl-catalog-sheet__done {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  border-radius: 22px;
  font-size: 26rpx;
}

.cl-catalog-sheet__reset {
  flex: 0 0 30%;
  background: var(--soft);
  color: var(--ink-2);
}

.cl-catalog-sheet__done {
  flex: 1;
  background: var(--brand);
  color: #ffffff;
  font-weight: 600;
}
</style>
