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
        <view class="facet-chip" :class="{ 'facet-chip--active': option === kind }" hover-class="facet-chip--hover" hover-stay-time="90" @tap="kind = option">
        {{ option }}
      </view>
      </scroll-view>
      <scroll-view class="filter-row" scroll-x enable-flex>
        <view class="facet-chip" :class="{ 'facet-chip--active': option === usage }" hover-class="facet-chip--hover" hover-stay-time="90" @tap="usage = option">
        {{ option }}
      </view>
      </scroll-view>
      <scroll-view class="filter-row" scroll-x enable-flex>
        <view class="facet-chip" :class="{ 'facet-chip--active': option === rarity }" hover-class="facet-chip--hover" hover-stay-time="90" @tap="rarity = option">
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

    <view class="entry-list">
      <view v-for="item in visibleList" :key="item.id" class="entry-card card"
        hover-class="entry-card--hover"
        hover-stay-time="90" @tap="goDetail(item.id)">
        <view class="entry-card__badge" :style="{ color: item.elementColor, background: item.elementTint }">
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
  list.value.slice(0, visibleCount.value).map((item) => decorateWithElement(item, elementToolkit.value.elementMap))
);
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
</style>
