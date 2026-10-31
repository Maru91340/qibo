<template>
  <view class="page" :class="{ 'theme-dark': isDark }">
    <view class="filter-bar card">
      <cx-input
        :value="keyword"
        shape="round"
        placeholder="搜奇波名称、栖息地、技能"
        @change="onKeywordChange"
        @clear="keyword = ''"
      />
      <scroll-view class="filter-row" scroll-x enable-flex>
        <view v-for="option in filters.kinds" :key="option" class="facet-chip" :class="{ 'facet-chip--active': option === kind }" hover-class="facet-chip--hover" hover-stay-time="90" @tap="kind = option">
        {{ option }}
      </view>
      </scroll-view>
      <scroll-view class="filter-row" scroll-x enable-flex>
        <view v-for="option in filters.usages" :key="option" class="facet-chip" :class="{ 'facet-chip--active': option === usage }" hover-class="facet-chip--hover" hover-stay-time="90" @tap="usage = option">
        {{ option }}
      </view>
      </scroll-view>
      <scroll-view class="filter-row" scroll-x enable-flex>
        <view v-for="option in filters.rarities" :key="option" class="facet-chip" :class="{ 'facet-chip--active': option === rarity }" hover-class="facet-chip--hover" hover-stay-time="90" @tap="rarity = option">
        {{ option }}
      </view>
      </scroll-view>
      <view class="element-row">
        <view
          v-for="option in elementOptions"
          :key="option.key"
          class="element-pill" hover-class="tap-hover"
          :class="{ 'element-pill--active': option.key === element }"
          @tap="element = option.key"
        >
          <view class="element-pill__dot" :style="{ background: option.color }">{{ option.name }}</view>
          <text>{{ option.label }}</text>
        </view>
      </view>
    </view>

    <view class="list-head">
      <text>命中 {{ list.length }} 只奇波</text>
      <text class="text-muted">共 {{ totalCount }} 只 · 数据源 BWIKI</text>
      <text v-if="teamCount" class="text-muted">已选 {{ teamCount }} 只出战</text>
    </view>

    <view class="sort-row card">
      <text class="sort-row__label">排序</text>
      <text v-for="option in sortOptions" :key="option.key" class="sort-chip" :class="{ 'sort-chip--on': sortKey === option.key }" hover-class="tap-hover" @tap="sortKey = option.key">{{ option.label }}</text>
    </view>

    <view class="entry-list">
      <view v-for="item in visibleList" :key="item.id" class="entry-card card"
        hover-class="entry-card--hover"
        hover-stay-time="90" @tap="goDetail(item.id)">
        <image
          v-if="item.icon && !brokenIcons[item.id]"
          class="entry-card__img"
          :src="item.icon"
          mode="aspectFill"
          lazy-load
          @error="brokenIcons[item.id] = true"
        />
        <view v-else class="entry-card__badge" :style="{ color: item.elementColor, background: item.elementTint }">
          {{ item.elementName }}
        </view>
        <view class="entry-card__body">
          <view class="entry-card__title">
            <text>{{ item.name }}</text>
            <text class="mini-tag mini-tag--warn">待核实</text>
            <text class="mini-tag">{{ item.rarity }}</text>
          </view>
          <view class="entry-card__desc">{{ item.desc }}</view>
          <view class="chip-row">
            <text class="chip">{{ item.kind }}</text>
            <text v-for="use in item.usage" :key="use" class="chip chip--ghost">{{ use }}</text>
            <text class="chip chip--ghost">{{ item.habitat }}</text>
          </view>
        </view>
        <c-icon name="chevron-right" size="32rpx" color="#c2c9d6" />
      </view>
    </view>

    <view v-if="list.length > visibleCount" class="cl-more" hover-class="cl-more--hover" hover-stay-time="90" @tap="visibleCount += 60">
      加载更多（已显示 {{ visibleCount }} / {{ list.length }} 条）
    </view>
    <view v-else-if="list.length > 60" class="cl-more cl-more--end">已加载全部 {{ list.length }} 条</view>

    <view class="cx-empty"><view class="cx-empty__icon">🐾</view><view class="cx-empty__text">没有符合条件的奇波，试试放宽筛选</view></view>
    <view class="footnote">{{ notice }}</view>
  </view>
</template>

<script setup>
import { useTheme } from '@/utils/theme.js';

const { isDark } = useTheme();
import { computed, ref, watch } from 'vue';
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app';
import { getCatalog, onCatalogUpdate } from '@/services/content.js';
import { createElementToolkit } from '@/data/element.js';
import { decorateWithElement, filterQibos } from '@/utils/query.js';
import { load } from '@/utils/team.js';

const keyword = ref('');
const kind = ref('全部');
const usage = ref('全部');
const rarity = ref('全部');
const element = ref('all');
const teamCount = ref(0);
const brokenIcons = ref({});

const catalog = ref({ items: [], filters: {}, notice: '' });
const elementToolkit = ref(createElementToolkit(getCatalog('element').data));

const filters = computed(() => catalog.value.filters || {});
const notice = computed(() => catalog.value.notice || '');

const elementOptions = computed(() => [
  { key: 'all', name: '全', label: '全部元素', color: '#5a6480' },
  ...elementToolkit.value.elements
]);

// 增量渲染：默认 60 条，筛选变化重置
const visibleCount = ref(60);
const totalCount = computed(() => (catalog.value.items || []).length);
const visibleList = computed(() =>
  sortedList.value.slice(0, visibleCount.value).map((item) => decorateWithElement(item, elementToolkit.value.elementMap))
);

// 排序：默认（数据顺序）/ 稀有度
const RARITY_ORDER = ['SSR', 'SR', 'R', '五星', '四星', '闪光', '星彩', '稀有', '普通', '未知'];
const sortKey = ref('default');
const sortOptions = [{ key: 'default', label: '默认' }, { key: 'rarity', label: '稀有度' }];
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

const list = computed(() =>
  filterQibos(catalog.value.items, {
    keyword: keyword.value,
    kind: kind.value,
    usage: usage.value,
    rarity: rarity.value,
    element: element.value
  })
);

function reload() {
  catalog.value = getCatalog('qibo').data || { items: [], filters: {}, notice: '' };
  elementToolkit.value = createElementToolkit(getCatalog('element').data);
}

watch([keyword, kind, usage, rarity, element], () => {
  visibleCount.value = 60;
});

function onKeywordChange(event) {
  keyword.value = event.detail.value;
}

function goDetail(id) {
  uni.navigateTo({ url: `/pages/qibo/detail?id=${id}` });
}

let unsubscribe = null;
onLoad((options) => {
  if (options && options.keyword) keyword.value = decodeURIComponent(options.keyword);
  reload();
});
onShow(() => {
  teamCount.value = load().qibos.length;
});
unsubscribe = onCatalogUpdate(reload);
onUnload(() => unsubscribe && unsubscribe());
</script>

<style>
.filter-row {
  gap: 12rpx;
}
.sort-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 14rpx 20rpx;
  margin-bottom: 16rpx;
}

.sort-row__label {
  color: var(--ink-3);
  font-size: 22rpx;
}

.sort-chip {
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
  background: var(--soft);
  color: var(--ink-2);
  font-size: 21rpx;
}

.sort-chip--on {
  background: var(--brand);
  color: #fff;
}
</style>
