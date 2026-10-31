<template>
  <view class="page" :class="{ 'theme-dark': isDark }">
    <view class="filter-bar card">
      <t-search
        :value="keyword"
        shape="round"
        placeholder="搜奇波名称、栖息地、技能"
        @change="onKeywordChange"
        @clear="keyword = ''"
      />
      <scroll-view class="filter-row" scroll-x enable-flex>
        <t-check-tag
          v-for="option in filters.kinds"
          :key="option"
          :checked="option === kind"
          variant="light"
          size="large"
          :content="option"
          @change="kind = option"
        />
      </scroll-view>
      <scroll-view class="filter-row" scroll-x enable-flex>
        <t-check-tag
          v-for="option in filters.usages"
          :key="option"
          :checked="option === usage"
          variant="light"
          size="large"
          :content="option"
          @change="usage = option"
        />
      </scroll-view>
      <scroll-view class="filter-row" scroll-x enable-flex>
        <t-check-tag
          v-for="option in filters.rarities"
          :key="option"
          :checked="option === rarity"
          variant="light"
          size="large"
          :content="option"
          @change="rarity = option"
        />
      </scroll-view>
      <view class="element-row">
        <view
          v-for="option in elementOptions"
          :key="option.key"
          class="element-pill"
          :class="{ 'element-pill--active': option.key === element }"
          @tap="element = option.key"
        >
          <view class="element-pill__dot" :style="{ background: option.color }">{{ option.name }}</view>
          <text>{{ option.label }}</text>
        </view>
      </view>
    </view>

    <view class="list-head">
      <text>共 {{ list.length }} 只奇波</text>
      <text v-if="teamCount" class="text-muted">已选 {{ teamCount }} 只出战</text>
    </view>

    <view class="entry-list">
      <view v-for="item in list" :key="item.id" class="entry-card card" @tap="goDetail(item.id)">
        <view class="entry-card__badge" :style="{ color: item.elementColor, background: item.elementTint }">
          {{ item.elementName }}
        </view>
        <view class="entry-card__body">
          <view class="entry-card__title">
            <text>{{ item.name }}</text>
            <t-tag v-if="!item.verified" size="small" variant="light" theme="warning">待核实</t-tag>
            <t-tag size="small" variant="light" theme="primary">{{ item.rarity }}</t-tag>
          </view>
          <view class="entry-card__desc">{{ item.desc }}</view>
          <view class="chip-row">
            <text class="chip">{{ item.kind }}</text>
            <text v-for="use in item.usage" :key="use" class="chip chip--ghost">{{ use }}</text>
            <text class="chip chip--ghost">{{ item.habitat }}</text>
          </view>
        </view>
        <t-icon name="chevron-right" size="32rpx" color="#c2c9d6" />
      </view>
    </view>

    <t-empty v-if="!list.length" description="没有符合条件的奇波，试试放宽筛选" />
    <view class="footnote">{{ notice }}</view>
  </view>
</template>

<script setup>
import { useTheme } from '@/utils/theme.js';

const { isDark } = useTheme();
import { computed, ref } from 'vue';
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

const list = computed(() =>
  decorateWithElement(
    filterQibos(catalog.value.items, {
      keyword: keyword.value,
      kind: kind.value,
      usage: usage.value,
      rarity: rarity.value,
      element: element.value
    }),
    elementToolkit.value.elementMap
  )
);

function reload() {
  catalog.value = getCatalog('qibo').data || { items: [], filters: {}, notice: '' };
  elementToolkit.value = createElementToolkit(getCatalog('element').data);
}

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
