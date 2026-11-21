<template>
  <page-meta :page-style="sheetOpen || sortOpen ? 'overflow: hidden;' : ''" />
  <view class="page qibo-page" :class="{ 'theme-dark': isDark }">
    <view class="filter-bar">
      <!-- 3.1 L01：搜索 44px → 一行常用筛选 + 更多筛选 44px → 其余条件进底部面板 -->
      <view class="cl-search">
        <text class="cl-search__icon">⌕</text>
        <input
          class="cl-search__field"
          :value="keyword"
          placeholder="搜索名称或编号，如 13A"
          confirm-type="search"
          placeholder-class="cl-search__ph"
          @input="onKeywordChange"
          @confirm="onKeywordConfirm"
        />
        <text v-if="keyword" class="cl-search__clear" hover-class="tap-hover" @tap="clearKeyword">×</text>
      </view>
      <view class="cl-filter-quick">
        <view class="cl-quick-track">
          <view class="cl-chip-hit" hover-class="tap-hover" @tap="openSheet('element')">
            <view class="cl-chip" :class="{ 'cl-chip--on': element.length > 0 }">元素：{{ selectedElement }} ▾</view>
          </view>
          <view class="cl-chip-hit" hover-class="tap-hover" @tap="openSheet('stage')">
            <view class="cl-chip" :class="{ 'cl-chip--on': stage.length > 0 }">阶段：{{ selectedStage }} ▾</view>
          </view>
        </view>
        <view class="cl-more-btn" :class="{ 'cl-more-btn--on': job.length + race.length + size.length > 0 }" hover-class="tap-hover" @tap="openSheet('more')">
          <text>更多筛选</text>
          <text v-if="job.length + race.length + size.length" class="cl-more-btn__count">{{ job.length + race.length + size.length }}</text>
          <text class="cl-more-btn__arrow">›</text>
        </view>
      </view>
      <view v-if="activeChips.length" class="cl-active-row">
        <view v-for="chip in activeChips" :key="chip.key + chip.value" class="cl-active-chip" hover-class="tap-hover" @tap="clearChip(chip)">
          <text>{{ chip.label }}</text>
          <text class="cl-active-chip__x">×</text>
        </view>
        <view class="cl-active-chip" hover-class="tap-hover" @tap="resetAllFilters">清除条件</view>
      </view>
    </view>

    <!-- 统计行：总数 + 已收集/已收藏快捷筛选 + 排序（一行放不下时自动换行） -->
    <view class="cl-stat-row">
      <text class="cl-result-row__count">{{ list.length === totalCount ? `共 ${totalCount} 只奇波` : `找到 ${list.length} 只奇波` }}<text v-if="list.length !== totalCount" class="cl-result-row__total">（全部 {{ totalCount }} 只）</text></text>
      <view
        class="cl-stat-chip cl-stat-chip--collected"
        :class="{ 'cl-stat-chip--on': onlyCollected }"
        role="switch"
        :aria-checked="onlyCollected"
        aria-label="只看已收集"
        hover-class="tap-hover"
        @tap="onlyCollected = !onlyCollected"
      >
        <view class="cl-stat-icon cl-stat-icon--check"><view class="cl-stat-check" /></view>
        <text>已收集</text>
        <text class="cl-stat-chip__num">{{ collectedCount }}</text>
      </view>
      <view
        class="cl-stat-chip cl-stat-chip--fav"
        :class="{ 'cl-stat-chip--on': onlyFav }"
        role="switch"
        :aria-checked="onlyFav"
        aria-label="只看收藏"
        hover-class="tap-hover"
        @tap="onlyFav = !onlyFav"
      >
        <view class="cl-stat-icon cl-stat-icon--star" />
        <text>已收藏</text>
        <text class="cl-stat-chip__num">{{ favCount }}</text>
      </view>
      <view class="cl-sort-trigger" hover-class="tap-hover" @tap="sortOpen = true">{{ sortLabel }} ▾</view>
    </view>
    <!-- 收集进度（本地已收集，独立于收藏；规范 03 绿=已收集） -->
    <view v-if="totalCount" class="cl-progress">
      <text class="cl-progress__label">收集进度</text>
      <view class="cl-progress__bar">
        <view class="cl-progress__fill" :style="{ width: collectedPct }" />
      </view>
      <text class="cl-progress__num">{{ collectedCount }} / {{ totalCount }}</text>
    </view>

    <view v-if="loading" class="cl-loading">正在加载图鉴…</view>
    <view v-else-if="loadError" class="cl-error">
      <view class="cl-error__icon">!</view>
      <text class="cl-error__title">图鉴暂时加载失败</text>
      <text class="cl-error__text">请检查网络后重试，已保存的筛选条件不会丢失。</text>
      <view class="cl-error__retry" hover-class="tap-hover" @tap="reload">重新加载</view>
    </view>
    <view v-else class="entry-list">
      <view v-for="item in visibleList" :key="item.recordId" class="entry-card card"
        hover-class="entry-card--hover"
        hover-stay-time="90" @tap="goDetail(item.detailId)">
        <view class="entry-card__head">
          <text class="entry-card__number">{{ padNumber(item.displayNumber) }}</text>
          <view class="entry-card__states">
            <view
              class="entry-card__collect"
              :class="{ 'entry-card__collect--on': collectedSet[item.detailId] }"
              :aria-label="collectedSet[item.detailId] ? '取消已收集' : '标记已收集'"
              hover-class="tap-hover"
              @tap.stop="toggleCollectedItem(item)"
            >
              <view class="entry-card__collect-check" />
            </view>
            <view
              class="entry-card__fav"
              :class="{ 'entry-card__fav--on': favSet[item.detailId] }"
              :aria-label="favSet[item.detailId] ? '取消收藏' : '收藏'"
              hover-class="tap-hover"
              @tap.stop="toggleFavItem(item)"
            />
          </view>
        </view>
        <view class="entry-card__media">
          <view class="entry-card__figure" :style="item.elementTint ? { background: item.elementTint } : ''">
            <image
              v-if="srcOf(item, 'qiboWiki', 'icon', { preferMapped: false, widths: [160, 120, 100] })"
              class="entry-card__img"
              :src="srcOf(item, 'qiboWiki', 'icon', { preferMapped: false, widths: [160, 120, 100] })"
              mode="aspectFit"
              lazy-load
              @error="onError(item, 'icon')"
            />
            <view v-else class="entry-card__glyph" :style="{ color: item.elementColor }">{{ (item.name || '?').slice(0, 1) }}</view>
          </view>
        </view>
        <view class="entry-card__name">{{ item.name }}</view>
        <view class="entry-card__tags">
          <text v-if="item.verified === false" class="mini-tag mini-tag--muted">字段暂缺</text>
          <view class="chip-row">
            <view
              v-for="option in itemElementOptions(item)"
              :key="option.key"
              class="cl-element-badge"
              :style="option.tint ? { color: option.color, background: option.tint } : ''"
            >
              <image v-if="elementIcons[option.key] && !brokenElementIcons[option.key]" class="cl-element-icon" :src="elementIcons[option.key]" mode="aspectFit" @error="brokenElementIcons[option.key] = true" />
              <text v-else class="cl-element-fallback" :style="{ background: option.color }">{{ option.name }}</text>
              <text>{{ option.name }}</text>
            </view>
            <text v-if="fieldValue(item, '阶段')" class="chip chip--ghost">{{ fieldValue(item, '阶段') }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="list.length > visibleCount" class="cl-more" hover-class="cl-more--hover" hover-stay-time="90" @tap="visibleCount += 60">
      加载更多（已显示 {{ visibleCount }} / {{ list.length }} 条）
    </view>
    <view v-else-if="list.length > 60" class="cl-more cl-more--end">已加载全部 {{ list.length }} 条</view>

    <!-- 3.4 / L06：空态只在零结果出现，并提供一键重置筛选 -->
    <view v-if="!loading && !loadError && !list.length" class="cx-empty">
      <view class="cx-empty__icon">🐾</view>
      <view class="cx-empty__text">{{ appliedKeyword ? '没有找到符合条件的奇波' : onlyFav && !activeChips.length ? '还没有收藏的奇波' : '没有符合筛选条件的奇波' }}</view>
      <view v-if="appliedKeyword" class="cl-empty__reset" hover-class="tap-hover" @tap="clearKeyword">清除搜索</view>
      <view v-if="activeChips.length" class="cl-empty__reset" hover-class="tap-hover" @tap="resetAllFilters">重置筛选</view>
      <view v-if="onlyFav" class="cl-empty__reset" hover-class="tap-hover" @tap="onlyFav = false">查看全部奇波</view>
    </view>
    <!-- 3.3 / L05：来源说明集中在页面底部，不再无条件给每张卡贴「待核实」 -->
    <view class="footnote"><text v-if="teamCount">已选 {{ teamCount }} 只出战 · </text>{{ sourceNote }}</view>

    <!-- 3.1 L01：更多条件按「类型 / 用途 / 星级 / 元素」分组收进底部面板，带重置与查看结果数 -->
    <view v-if="sheetOpen" class="cl-sheet-mask">
      <view class="cl-sheet-backdrop" @tap="sheetOpen = false" @touchmove.stop.prevent />
      <view class="cl-sheet" @tap.stop>
        <view class="cl-sheet__head">
          <view class="cl-sheet__heading">
            <text class="cl-sheet__title">{{ sheetMode === 'element' ? '选择元素' : sheetMode === 'stage' ? '选择阶段' : '更多筛选' }}</text>
            <text class="cl-sheet__hint">支持多选，查看结果后生效</text>
          </view>
          <text class="cl-sheet__close" aria-label="关闭筛选" hover-class="tap-hover" @tap="sheetOpen = false">×</text>
        </view>
        <scroll-view class="cl-sheet__body" scroll-y>
          <view v-for="group in sheetGroups" :key="group.key" class="cl-sheet__group">
            <view class="cl-sheet__label-row">
              <text class="cl-sheet__label">{{ group.label }}</text>
              <text class="cl-sheet__selected">{{ group.current.length ? `已选 ${group.current.length} 项` : '不限' }}</text>
            </view>
            <view class="cl-sheet__options">
              <view
                v-for="option in group.options"
                :key="option.value"
                class="cl-sheet-chip"
                :class="{ 'cl-sheet-chip--on': isSelected(group, option.value) }"
                hover-class="tap-hover"
                @tap="setSheetOption(group.key, option.value)"
              >
                <image v-if="group.key === 'element' && option.value !== 'all' && elementIcons[option.value] && !brokenElementIcons[option.value]" class="cl-element-icon" :src="elementIcons[option.value]" mode="aspectFit" @error="brokenElementIcons[option.value] = true" />
                <text v-else-if="group.key === 'element' && option.value !== 'all'" class="cl-element-fallback" :style="{ background: option.color }">{{ option.label }}</text>
                <text>{{ option.label }}</text>
                <text v-if="isSelected(group, option.value)" class="cl-sheet-check">✓</text>
              </view>
            </view>
          </view>
        </scroll-view>
        <view class="cl-sheet__foot">
          <view class="cl-sheet__reset" hover-class="tap-hover" @tap="resetDraftFilters">重置</view>
          <view class="cl-sheet__apply" hover-class="tap-hover" @tap="applySheet">查看结果（{{ draftCount }}）</view>
        </view>
      </view>
    </view>
    <view v-if="sortOpen" class="cl-sheet-mask">
      <view class="cl-sheet-backdrop" @tap="sortOpen = false" @touchmove.stop.prevent />
      <view class="cl-sort-menu">
        <view class="cl-sheet__head"><text class="cl-sheet__title">排序方式</text><text class="cl-sheet__close" @tap="sortOpen = false">×</text></view>
        <view v-for="option in sortOptions" :key="option.key" class="cl-sort-option" :class="{ 'cl-sort-option--on': sortKey === option.key }" @tap="selectSort(option.key)">
          <text>{{ option.label }}</text><text v-if="sortKey === option.key">✓</text>
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
import { bundledCatalog } from '@/data/catalog.js';
import { decorateWithElement, filterQibos } from '@/utils/query.js';
import { load } from '@/utils/team.js';
import { listFavs, toggleFav } from '@/utils/favorites.js';
import { listCollected, toggleCollected } from '@/utils/collected.js';
import { useImageSources } from '@/utils/image-source.js';
import { officialItems, LIST_SOURCE_NOTE } from '@/utils/catalog-view.js';
import { qiboIndex } from '@/data/generated/qibo-index.js';
import { cloudDetailAsset } from '@/data/site-images.js';
import { ELEMENT_ICONS } from '@/data/element-icons.js';

const keyword = ref('');
const appliedKeyword = ref('');
let keywordTimer = null;
// 3.2 / L04：只看收藏是列表筛选，不改变全局收藏数量；已收集同样只作筛选
const onlyFav = ref(false);
const onlyCollected = ref(false);
const element = ref([]);
const stage = ref([]);
const job = ref([]);
const race = ref([]);
const size = ref([]);
const loading = ref(true);
const loadError = ref('');
const sortOpen = ref(false);
const sortKey = ref('number-asc');
const sortOptions = [{ key: 'number-asc', label: '编号升序' }, { key: 'number-desc', label: '编号降序' }, { key: 'name-asc', label: '名称升序' }, { key: 'name-desc', label: '名称降序' }];
const sortLabel = computed(() => sortOptions.find((option) => option.key === sortKey.value)?.label || '编号升序');
const teamCount = ref(0);
const { srcOf, onError: nextImageSource } = useImageSources();
// 图片候选链降级：具名函数便于模板事件绑定静态检查识别
function onError(item, role) {
  nextImageSource(item, role);
}

const catalog = ref({ items: [], filters: {}, notice: '' });
const elementToolkit = ref(createElementToolkit(getCatalog('element').data));

// 3.3 / L05：来源与核实范围统一放页面说明，不逐条贴「待核实」
const sourceNote = LIST_SOURCE_NOTE;

const elementIcons = ELEMENT_ICONS;
const brokenElementIcons = ref({});
const elementOptions = computed(() => elementToolkit.value.elements.filter((option) =>
  catalog.value.items.some((item) => (item.elements && item.elements.length ? item.elements : [item.element]).includes(option.key))
));
const selectedElement = computed(() => element.value.length ? element.value.map((key) => (elementOptions.value.find((option) => option.key === key)?.name === '?' ? '未知' : elementOptions.value.find((option) => option.key === key)?.name) || key).join('、') : '全部');
const selectedStage = computed(() => stage.value.length ? stage.value.join('、') : '全部');

// 3.1 L01：常用筛选只保留一行横滑，其余条件收进底部分组面板；已选条件可逐项撤销
const sheetOpen = ref(false);
const sheetMode = ref('more');
const draft = ref({ element: [], stage: [], job: [], race: [], size: [] });
// 3.3 / L05：剔除演示条目后按正式列表实际取值收敛筛选选项，避免出现点了必定零结果的选项
// 根据真实字段生成筛选项，拆分家园工种的组合值。
function fieldOptions(label, order = []) {
  const values = new Set();
  catalog.value.items.forEach((item) => {
    const value = fieldValue(item, label);
    (label === '家园工种' ? value.split(/[、,，]/) : [value]).forEach((part) => { if (part.trim()) values.add(part.trim()); });
  });
  return ['全部', ...order.filter((value) => values.delete(value)), ...values];
}
// 读取资料字段，缺失时返回空字符串。
function fieldValue(item, label) {
  const field = (item.fields || []).find((entry) => entry.label === label);
  return field && field.value ? String(field.value) : '';
}
// 编号统一三位补零（NO.1 → NO.001），仅展示层处理；带后缀的编号（如 13A）原样返回。
function padNumber(display) {
  const match = String(display || '').match(/^(NO\.?\s*)(\d+)$/);
  return match ? `${match[1]}${match[2].padStart(3, '0')}` : display;
}
// 将奇波的全部元素转换为可显示的图标数据。
function itemElementOptions(item) {
  const keys = item.elements && item.elements.length ? item.elements : [item.element];
  return keys.map((key) => elementToolkit.value.elementMap[key]).filter((option) => option && elementIcons[option.key]);
}
const sheetGroups = computed(() => {
  const all = [
    { key: 'element', label: '元素', current: draft.value.element, options: [{ value: 'all', label: '全部' }, ...elementOptions.value.map((option) => ({ value: option.key, label: option.key === 'unknown' || option.key === 'none' ? option.label : option.name, color: option.color }))] },
    { key: 'stage', label: '阶段', current: draft.value.stage, options: fieldOptions('阶段', ['幼年期', '成长期', '成熟期', '完全体', '超限体']).map((value) => ({ value, label: value })) },
    { key: 'job', label: '家园工种', current: draft.value.job, options: fieldOptions('家园工种').map((value) => ({ value, label: value })) },
    { key: 'race', label: '种族', current: draft.value.race, options: fieldOptions('种族').map((value) => ({ value, label: value })) },
    { key: 'size', label: '体型', current: draft.value.size, options: fieldOptions('体型', ['小', '中', '大', '超大']).map((value) => ({ value, label: value })) }
  ];
  return all.filter((group) => group.options.length > 1 && (sheetMode.value === 'more' || group.key === sheetMode.value));
});
const activeChips = computed(() => [
  ...element.value.map((value) => ({ key: 'element', value, label: elementOptions.value.find((option) => option.key === value)?.name === '?' ? '未知' : (elementOptions.value.find((option) => option.key === value)?.name || value) })),
  ...stage.value.map((value) => ({ key: 'stage', value, label: value })),
  ...job.value.map((value) => ({ key: 'job', value, label: value })),
  ...race.value.map((value) => ({ key: 'race', value, label: value })),
  ...size.value.map((value) => ({ key: 'size', value, label: value }))
]);
// 面板选项与已选 chip 共用同一入口，保证「设置」与「撤销」落到同一筛选状态
function setSheetOption(key, value) {
  const current = draft.value[key];
  const next = value === 'all' || value === '全部' ? [] : current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value];
  draft.value = { ...draft.value, [key]: next };
}
// 判断筛选项是否选中，空数组表示全部。
function isSelected(group, value) {
  return value === 'all' || value === '全部' ? group.current.length === 0 : group.current.includes(value);
}
// 打开筛选面板时复制当前条件，关闭面板不会应用草稿。
function openSheet(mode) {
  draft.value = { element: [...element.value], stage: [...stage.value], job: [...job.value], race: [...race.value], size: [...size.value] };
  sheetMode.value = mode;
  sheetOpen.value = true;
}
// 确认面板中的筛选条件。
function applySheet() {
  element.value = [...draft.value.element];
  stage.value = [...draft.value.stage];
  job.value = [...draft.value.job];
  race.value = [...draft.value.race];
  size.value = [...draft.value.size];
  sheetOpen.value = false;
}
// 只重置当前面板展示的条件。
function resetDraftFilters() {
  const keys = sheetMode.value === 'more' ? ['element', 'stage', 'job', 'race', 'size'] : [sheetMode.value];
  const next = { ...draft.value };
  keys.forEach((key) => { next[key] = []; });
  draft.value = next;
}
function clearChip(chip) {
  const refs = { element, stage, job, race, size };
  refs[chip.key].value = refs[chip.key].value.filter((value) => value !== chip.value);
}
function resetAllFilters() {
  element.value = [];
  stage.value = [];
  job.value = [];
  race.value = [];
  size.value = [];
}
// 选择排序方式并关闭菜单。
function selectSort(key) {
  sortKey.value = key;
  sortOpen.value = false;
}

// 增量渲染：默认 60 条，筛选变化重置
const visibleCount = ref(60);
const totalCount = computed(() => (catalog.value.items || []).length);
const visibleList = computed(() =>
  sortedList.value.slice(0, visibleCount.value).map((item) => decorateWithElement(item, elementToolkit.value.elementMap))
);

// 排序：默认（数据顺序）/ 稀有度
const list = computed(() => {
  const base = filterQibos(catalog.value.items, {
    keyword: appliedKeyword.value,
    element: element.value,
    stage: stage.value,
    job: job.value,
    race: race.value,
    size: size.value
  });
  // 3.2 / L04：收藏/已收集筛选只作用于列表（可叠加）；计数仍按全量正式条目统计
  let result = base;
  if (onlyCollected.value) result = result.filter((item) => collectedSet.value[item.detailId]);
  if (onlyFav.value) result = result.filter((item) => favSet.value[item.detailId]);
  return result;
});

const sortedList = computed(() => {
  const direction = sortKey.value.endsWith('-asc') ? 1 : -1;
  return list.value.slice().sort((a, b) => {
    if (sortKey.value.startsWith('number-')) {
      const numberResult = a.numberValue - b.numberValue;
      return direction * (numberResult || String(a.suffix || '').localeCompare(String(b.suffix || ''), 'en'));
    }
    return direction * String(a.name || '').localeCompare(String(b.name || ''), 'zh');
  });
});

const draftCount = computed(() => {
  const matches = filterQibos(catalog.value.items, { ...draft.value, keyword: appliedKeyword.value });
  return onlyFav.value ? matches.filter((item) => favSet.value[item.detailId]).length : matches.length;
});

function reload() {
  loading.value = true;
  loadError.value = '';
  try {
    const data = getCatalog('qibo').data || { items: [], filters: {}, notice: '' };
    const sourceItems = officialItems(data.items);
    const bundledItems = officialItems(bundledCatalog.qibo.items || []);
    const sourceByName = new Map(sourceItems.map((item) => [item.name, item]));
    const bundledByName = new Map(bundledItems.map((item) => [item.name, item]));
    const duplicateNames = qiboIndex.reduce((counts, item) => ({ ...counts, [item.name]: (counts[item.name] || 0) + 1 }), {});
    // 以 CBT3 的 204 条编号记录为骨架，BWIKI 仅补充描述和筛选字段，避免同名形态被合并。
    catalog.value = { ...data, items: qiboIndex.map((entry) => {
      const sourceName = duplicateNames[entry.name] > 1 && entry.suffix ? `${entry.name}（特殊）` : entry.name;
      const fallback = bundledByName.get(sourceName) || bundledByName.get(entry.name) || {};
      const source = sourceByName.get(sourceName) || sourceByName.get(entry.name) || {};
      const item = { ...fallback, ...source };
      return {
        ...item,
        id: `qibo-${entry.wikiId}`,
        detailId: item.id || '',
        recordId: entry.wikiId,
        wikiId: entry.wikiId,
        number: entry.number,
        numberValue: entry.numberValue,
        suffix: entry.suffix,
        code: entry.code,
        displayNumber: entry.displayNumber,
        name: entry.name,
        // 编号图标兜底档：微信端转 cloud:// detail-assets/奇波图标/<原名>，H5 保持 CSXYLIC 热链
        icon: cloudDetailAsset(entry.icon),
        fields: source.fields && source.fields.length ? source.fields : (fallback.fields || []),
        elements: source.elements && source.elements.length ? source.elements : (fallback.elements || []),
        verified: !!item.id && item.verified !== false
      };
    }) };
    elementToolkit.value = createElementToolkit(getCatalog('element').data);
  } catch (error) {
    catalog.value = { items: [], filters: {}, notice: '' };
    loadError.value = 'catalog-load-failed';
  } finally {
    loading.value = false;
  }
}

watch([appliedKeyword, element, stage, job, race, size, onlyFav, onlyCollected, sortKey], () => {
  visibleCount.value = 60;
});

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
function onKeywordConfirm(event) {
  if (keywordTimer) clearTimeout(keywordTimer);
  keywordTimer = null;
  keyword.value = event.detail.value;
  appliedKeyword.value = keyword.value;
}
// 清空搜索时同步清除待应用的关键字。
function clearKeyword() {
  if (keywordTimer) clearTimeout(keywordTimer);
  keywordTimer = null;
  keyword.value = '';
  appliedKeyword.value = '';
}

function goDetail(id) {
  if (!id) return;
  uni.navigateTo({ url: `/pkg-qibo/detail?id=${id}` });
}

let unsubscribe = null;
onLoad((options) => {
  if (options && options.keyword) {
    keyword.value = decodeURIComponent(options.keyword);
    appliedKeyword.value = keyword.value;
  }
  reload();
});
onShow(() => {
  teamCount.value = load().qibos.length;
  // 3.4 / L06：从详情返回时同步收藏与已收集状态；查询条件由页面栈保留，不在此重置
  refreshFavs();
  refreshCollected();
});
unsubscribe = onCatalogUpdate(reload);
onUnload(() => {
  if (keywordTimer) clearTimeout(keywordTimer);
  if (unsubscribe) unsubscribe();
});

// 3.2 / L04：收藏只是本地标记，不代表「已获得」；数量按全量正式条目，筛选不改变它
const favSet = ref({});
const favCount = computed(() => (catalog.value.items || []).filter((item) => favSet.value[item.detailId]).length);
function refreshFavs() {
  const map = {};
  listFavs().forEach((f) => { if (f.type === 'qiboWiki') map[f.id] = true; });
  favSet.value = map;
}
// 列表收藏与详情页共用 qiboWiki 类型和详情 id，保证两处状态同步。
function toggleFavItem(item) {
  if (!item.detailId) return;
  const on = toggleFav({ type: 'qiboWiki', id: item.detailId, name: item.name || '', icon: item.icon || '' });
  favSet.value = { ...favSet.value, [item.detailId]: on };
  uni.showToast({ title: on ? '已收藏' : '已取消收藏', icon: 'none' });
}
refreshFavs();

// 已收集=游戏内已获得（本地，独立于收藏；规范 03 绿=已收集）。角标点击即标记/取消。
const collectedSet = ref({});
const collectedCount = computed(() => (catalog.value.items || []).filter((item) => collectedSet.value[item.detailId]).length);
const collectedPct = computed(() => {
  const total = totalCount.value || 0;
  return total ? Math.round((collectedCount.value / total) * 100) + '%' : '0%';
});
function refreshCollected() {
  const map = {};
  listCollected().forEach((entry) => { if (entry.type === 'qiboWiki') map[entry.id] = true; });
  collectedSet.value = map;
}
function toggleCollectedItem(item) {
  if (!item.detailId) return;
  const on = toggleCollected({ type: 'qiboWiki', id: item.detailId, name: item.name || '', icon: item.icon || '' });
  collectedSet.value = { ...collectedSet.value, [item.detailId]: on };
  uni.showToast({ title: on ? '已标记收集' : '已取消收集', icon: 'none' });
}
refreshCollected();
</script>

<style>
/* 3.1 L01：搜索 / 常用筛选 / 结果排序 / 更多筛选面板，仅本页使用，不改 theme.css 共享样式 */
.cl-search {
  display: flex;
  align-items: center;
  gap: 12rpx;
  height: 44px;
  padding: 0 24rpx;
  box-sizing: border-box;
  border-radius: 22px;
  background: var(--card-bg);
  border: 1rpx solid var(--line);
}
.cl-search__icon { font-size: 30rpx; color: var(--ink-3); }
.cl-search__field { flex: 1; min-width: 0; height: 44px; font-size: 26rpx; color: var(--ink); }
.cl-search__ph { color: var(--ink-2); opacity: .85; }
.cl-search__clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin-right: -12rpx;
  font-size: 34rpx;
  color: var(--ink-3);
}
.cl-filter-quick { position: relative; display: flex; align-items: center; height: 44px; margin-top: 8px; }
.cl-quick-track {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  gap: 12rpx;
  height: 44px;
  padding-right: 32rpx;
  box-sizing: border-box;
}
.cl-chip-hit { flex: 1 1 0; min-width: 0; display: flex; align-items: center; height: 44px; padding: 4px 0; box-sizing: border-box; }
.cl-chip {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  padding: 0 24rpx;
  border-radius: 18px;
  background: var(--soft);
  color: var(--ink-2);
  font-size: 24rpx;
  white-space: nowrap;
  min-width: 0;
  overflow: hidden;
}
.cl-chip--on { background: var(--brand); color: #fff; font-weight: 600; }
.cl-element-badge { display: inline-flex; align-items: center; gap: 4px; color: var(--ink-2); font-size: 24rpx; }
.cl-element-icon { width: 20px; height: 20px; flex: none; }
.cl-element-fallback { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 50%; color: #fff; font-size: 11px; flex: none; }
.cl-sheet-check { margin-left: 4px; font-weight: 700; }
.cl-more-btn {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  height: 44px;
  padding: 0 4rpx 0 16rpx;
  color: var(--brand-deep);
  font-size: 24rpx;
  white-space: nowrap;
}
.cl-more-btn__arrow { font-size: 30rpx; }
.cl-more-btn--on { background: var(--brand-soft); color: var(--brand-deep); font-weight: 600; }
.cl-more-btn__count { display: flex; align-items: center; justify-content: center; min-width: 28rpx; height: 28rpx; padding: 0 6rpx; border-radius: 14rpx; background: var(--brand); color: #fff; font-size: 18rpx; line-height: 1; }
.cl-active-row { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 8px; }
.cl-active-chip {
  display: flex;
  align-items: center;
  gap: 8rpx;
  min-height: 32px;
  padding: 0 20rpx;
  border-radius: 16px;
  background: var(--brand-soft);
  color: var(--brand-deep);
  font-size: 22rpx;
}
.cl-active-chip__x { font-size: 28rpx; }
.cl-result-row__count { color: var(--ink); font-size: 24rpx; font-weight: 600; margin-right: auto; }
.cl-result-row__total { color: var(--ink-2); font-size: 22rpx; font-weight: 400; }
.cl-sheet-mask { position: fixed; top: 0; right: 0; bottom: 0; left: 0; z-index: 90; background: rgba(16, 22, 38, 0.42); display: flex; align-items: flex-end; }
.cl-sheet {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: 72vh;
  padding: 24rpx 24rpx 32rpx;
  box-sizing: border-box;
  border-radius: 24rpx 24rpx 0 0;
  background: var(--card-bg);
}
.cl-sheet__head { display: flex; align-items: center; justify-content: space-between; padding-bottom: 16rpx; }
.cl-sheet__heading { display: flex; flex-direction: column; gap: 4rpx; }
.cl-sheet__title { font-size: 30rpx; font-weight: 600; color: var(--ink); }
.cl-sheet__hint { color: var(--ink-2); font-size: 22rpx; }
.cl-sheet__close { display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; font-size: 40rpx; color: var(--ink-3); }
.cl-sheet__body { max-height: 52vh; }
.cl-sheet__group { padding: 12rpx 0 20rpx; }
.cl-sheet__label-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12rpx; }
.cl-sheet__label { font-size: 25rpx; color: var(--ink); font-weight: 600; }
.cl-sheet__selected { color: var(--ink-2); font-size: 22rpx; }
.cl-sheet__options { display: flex; flex-wrap: wrap; gap: 12rpx; }
.cl-sheet-chip {
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 24rpx;
  border-radius: 22px;
  background: var(--soft);
  border: 1rpx solid var(--line);
  color: var(--ink-2);
  font-size: 24rpx;
}
.cl-sheet-chip--on { background: var(--brand); border-color: var(--brand); color: #fff; font-weight: 600; }
.cl-sheet__foot { display: flex; gap: 16rpx; padding-top: 16rpx; }
.cl-sheet__reset { flex: 0 0 30%; display: flex; align-items: center; justify-content: center; min-height: 44px; border-radius: 22px; background: var(--soft); color: var(--ink-2); font-size: 26rpx; }
.cl-sheet__apply { flex: 1; display: flex; align-items: center; justify-content: center; min-height: 44px; border-radius: 22px; background: var(--brand); color: #fff; font-size: 26rpx; font-weight: 600; }

/* 3.3 / L05：字段缺失提示降级，不与名称抢视觉等级 */
.mini-tag--muted { color: var(--ink-3); background: var(--soft); font-weight: 400; }
.qibo-page .filter-bar { padding: 4rpx 0 8rpx; margin-bottom: 8rpx; background: var(--bg); border: 0; box-shadow: none; }
.qibo-page .cl-search, .qibo-page .cl-search__field { height: 40px; }
.qibo-page .cl-search { border-color: var(--line); box-shadow: 0 4rpx 14rpx rgba(31, 42, 68, .05); }
.qibo-page .cl-filter-quick { gap: 10rpx; margin-top: 8px; }
.qibo-page .cl-quick-track { gap: 8rpx; padding-right: 0; }
.qibo-page .cl-chip { width: 100%; box-sizing: border-box; padding: 0 10rpx; border: 1rpx solid var(--line); font-size: 23rpx; }
.qibo-page .cl-chip--on { border-color: var(--brand); }
.qibo-page .cl-more-btn { height: 36px; padding: 0 16rpx; border: 1rpx solid var(--line); border-radius: 18px; background: var(--soft); }
.qibo-page .cl-more-btn--on { border-color: var(--brand); background: var(--brand-soft); }
.qibo-page .cl-active-chip { min-height: 40px; }
.qibo-page .cl-sort-trigger { min-height: 40px; display: flex; align-items: center; padding: 0 16rpx; border-radius: 20px; background: var(--soft); color: var(--brand-deep); font-size: 24rpx; }
.qibo-page .entry-list { gap: 14rpx; }
.qibo-page .entry-card { position: relative; min-width: 0; }
.qibo-page .chip-row { gap: 8rpx; }
.qibo-page .cl-element-badge, .qibo-page .chip { min-height: 28px; box-sizing: border-box; }
.qibo-page .cl-element-badge { padding: 0 8rpx; border-radius: 14px; background: var(--brand-soft); }
.qibo-page .cl-sheet-mask { overflow: hidden; }
.qibo-page .cl-sheet-backdrop { position: absolute; inset: 0; }
.qibo-page .cl-sheet { position: relative; height: 76vh; max-height: 90vh; padding: 16rpx 24rpx 0; animation: qibo-sheet-in 180ms ease-out; }
.qibo-page .cl-sheet__head { flex: none; }
.qibo-page .cl-sheet__body { flex: 1; min-height: 0; max-height: none; overflow: hidden; }
.qibo-page .cl-sheet__foot { flex: none; padding: 16rpx 0 calc(16rpx + env(safe-area-inset-bottom)); background: var(--card-bg); }
.qibo-page .cl-sheet__options { gap: 8rpx; }
.qibo-page .cl-sheet-chip { box-sizing: border-box; min-width: 64px; max-width: 100%; white-space: normal; overflow-wrap: anywhere; transition: background-color 140ms ease, color 140ms ease; }
.qibo-page .cl-sort-menu { position: relative; width: 100%; box-sizing: border-box; padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom)); border-radius: 24rpx 24rpx 0 0; background: var(--card-bg); animation: qibo-sheet-in 180ms ease-out; }
.qibo-page .cl-sort-option { min-height: 48px; display: flex; justify-content: space-between; align-items: center; color: var(--ink); padding: 0 16rpx; }
.qibo-page .cl-sort-option--on { color: var(--brand); font-weight: 600; }
@keyframes qibo-sheet-in { from { transform: translateY(24px); opacity: .7; } to { transform: translateY(0); opacity: 1; } }

/* 状态快捷筛选 chips（点击即只看已收集/已收藏，再点取消；规范 03 绿=已收集、金=已收藏） */
.qibo-page .cl-stat-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8rpx;
  padding: 0 8rpx 10rpx;
}

.qibo-page .cl-stat-chip {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  min-height: 40px;
  padding: 0 14rpx;
  box-sizing: border-box;
  border: 1rpx solid var(--line);
  border-radius: 20px;
  font-size: 21rpx;
}

.qibo-page .cl-stat-chip--collected {
  background: var(--ok-soft);
  color: var(--ok);
}

.qibo-page .cl-stat-chip--fav {
  background: var(--reward-soft);
  color: var(--reward);
}

.qibo-page .cl-stat-chip--on {
  border-color: transparent;
  color: #fff;
  font-weight: 600;
}

.qibo-page .cl-stat-chip--collected.cl-stat-chip--on {
  background: var(--accent-mint);
}

.qibo-page .cl-stat-chip--fav.cl-stat-chip--on {
  background: var(--accent-gold);
}

.qibo-page .cl-stat-chip__num {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

/* chip 内小图标：迷你勾圈 / 迷你星形（与卡片角标同语言） */
.qibo-page .cl-stat-icon--check {
  position: relative;
  flex: none;
  width: 26rpx;
  height: 26rpx;
  border-radius: 50%;
  background: var(--accent-mint);
}

.qibo-page .cl-stat-check {
  width: 10px;
  height: 5px;
  border-left: 2px solid #fff;
  border-bottom: 2px solid #fff;
  transform: rotate(-45deg);
  margin: 3px auto 0;
}

.qibo-page .cl-stat-chip--on .cl-stat-icon--check {
  background: #fff;
}

.qibo-page .cl-stat-chip--on .cl-stat-check {
  border-color: var(--accent-mint);
}

.qibo-page .cl-stat-icon--star {
  flex: none;
  width: 26rpx;
  height: 26rpx;
  background: var(--accent-gold);
  clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
}

.qibo-page .cl-stat-chip--on .cl-stat-icon--star {
  background: #fff;
}

/* 竞品对齐：三列网格竖卡（头部行=编号+双状态图标；图；居中名称；居中标签），保留深蓝主题 */
.qibo-page.qibo-page .entry-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12rpx;
}

.qibo-page.qibo-page .entry-card {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-width: 0;
  padding: 8rpx 10rpx 12rpx;
  position: relative;
}

/* 头部行：编号居左，收集/收藏双状态图标居右（flex 撑开，不与名称重叠） */
.qibo-page .entry-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4rpx;
  min-height: 32px;
}

.qibo-page .entry-card__number {
  min-width: 0;
  flex: 1;
  color: var(--ink-3);
  font-size: 17rpx;
  font-weight: 600;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.qibo-page .entry-card__states {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: none;
}

/* 收集圈：未收集=虚线空心环，已收集=绿底白勾（CSS 对勾），深色下清晰 */
.qibo-page .entry-card__collect {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: var(--ink-3);
}

.qibo-page .entry-card__collect::after {
  content: "";
  position: absolute;
  top: 6px;
  left: 6px;
  right: 6px;
  bottom: 6px;
  border: 2rpx dashed currentColor;
  border-radius: 50%;
  opacity: .6;
}

.qibo-page .entry-card__collect--on {
  color: #fff;
}

.qibo-page .entry-card__collect--on::after {
  background: var(--accent-mint);
  border-color: transparent;
  border-style: solid;
  opacity: 1;
}

.qibo-page .entry-card__collect-check {
  display: none;
  /* 相对定位抬高一层：绿底由 ::after 定位元素绘制，不抬升会被盖住只剩绿圆 */
  position: relative;
  z-index: 1;
  width: 12px;
  height: 7px;
  border-left: 2px solid #fff;
  border-bottom: 2px solid #fff;
  transform: rotate(-45deg);
}

.qibo-page .entry-card__collect--on .entry-card__collect-check {
  display: block;
}

/* 收藏星：未收藏=灰星，已收藏=金星（clip-path 矢量，跨端一致） */
.qibo-page .entry-card__fav {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
}

.qibo-page .entry-card__fav::after {
  content: "";
  position: absolute;
  inset: 6px;
  background: var(--ink-3);
  opacity: .6;
  clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
}

.qibo-page .entry-card__fav--on::after {
  background: var(--accent-gold);
  opacity: 1;
}

/* 图区：元素淡色底圆角图块，固定高度保持整排卡片等高（深色下 tint 压暗） */
.qibo-page .entry-card__media {
  position: relative;
  width: 100%;
  height: 150rpx;
  margin-top: 4rpx;
}

.qibo-page .entry-card__figure {
  position: absolute;
  inset: 0;
  border-radius: 12rpx;
  overflow: hidden;
}

.qibo-page .entry-card__figure::before {
  content: "";
  position: absolute;
  inset: 0;
  background: rgba(17, 22, 33, 0);
}

.qibo-page.theme-dark .entry-card__figure::before {
  background: rgba(17, 22, 33, 0.28);
}

.qibo-page.qibo-page .entry-card__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  background: transparent;
}

.qibo-page .entry-card__glyph {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 44rpx;
  font-weight: 800;
}

/* 名称：居中，单行省略（优先保证同排卡片等高；两行换行会使图片基线错位） */
.qibo-page.qibo-page .entry-card__name {
  margin-top: 8rpx;
  padding: 0 2rpx;
  text-align: center;
  color: var(--ink);
  font-size: 24rpx;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 标签：居中横排，放不下自动换行仍居中 */
.qibo-page .entry-card__tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 8rpx;
  min-width: 0;
}

.qibo-page.qibo-page .entry-card .chip-row {
  flex-wrap: wrap;
  justify-content: center;
  gap: 6rpx;
  margin: 0;
  min-width: 0;
}

.qibo-page.qibo-page .entry-card .chip-row .chip,
.qibo-page.qibo-page .entry-card .chip-row .cl-element-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  min-height: 22px;
  box-sizing: border-box;
  font-size: 18rpx;
  line-height: 1;
  white-space: nowrap;
}

.qibo-page.qibo-page .entry-card .chip-row .chip {
  padding: 0 8rpx;
  background: var(--brand-soft);
  color: var(--ink);
}

.qibo-page.qibo-page .entry-card .chip-row .cl-element-badge {
  gap: 2px;
  padding: 0 6rpx;
  color: var(--brand-deep);
}

.qibo-page.qibo-page .entry-card .chip-row .cl-element-icon,
.qibo-page.qibo-page .entry-card .chip-row .cl-element-fallback {
  width: 14px;
  height: 14px;
}

/* 收集进度条（本地已收集） */
.qibo-page .cl-progress {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 0 8rpx 12rpx;
}

.qibo-page .cl-progress__label {
  flex: none;
  color: var(--ink-2);
  font-size: 22rpx;
}

.qibo-page .cl-progress__bar {
  flex: 1;
  height: 12rpx;
  border-radius: 999rpx;
  background: var(--soft);
  overflow: hidden;
}

.qibo-page .cl-progress__fill {
  height: 100%;
  border-radius: 999rpx;
  background: var(--accent-mint);
  transition: width 0.2s ease;
}

.qibo-page .cl-progress__num {
  flex: none;
  color: var(--ink-2);
  font-size: 22rpx;
  font-variant-numeric: tabular-nums;
}

/* #ifdef H5 */
/* 隐藏页面纵向滚动条（H5 预览观感；条件编译仅 H5 生效，微信端不受影响） */
::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}
/* #endif */

</style>
