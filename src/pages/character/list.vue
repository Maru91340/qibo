<template>
  <view class="page" :class="{ 'theme-dark': isDark }">
    <view class="filter-bar card">
      <t-search
        :value="keyword"
        shape="round"
        placeholder="搜角色、定位、配队思路"
        @change="onKeywordChange"
        @clear="keyword = ''"
      />
      <scroll-view class="filter-row" scroll-x enable-flex>
        <t-check-tag
          v-for="option in filters.roles"
          :key="option"
          :checked="option === role"
          variant="light"
          size="large"
          :content="option"
          @change="role = option"
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
      <text>共 {{ list.length }} 名角色</text>
      <text v-if="teamCount" class="text-muted">已编入 {{ teamCount }} 名</text>
    </view>

    <view class="entry-list">
      <view v-for="item in list" :key="item.id" class="entry-card card"
        hover-class="entry-card--hover"
        hover-stay-time="90" @tap="goDetail(item.id)">
        <view class="entry-card__badge" :style="{ color: item.elementColor, background: item.elementTint }">
          {{ item.elementName }}
        </view>
        <view class="entry-card__body">
          <view class="entry-card__title">
            <text>{{ item.name }}</text>
            <t-tag v-if="!item.verified" size="small" variant="light" theme="warning">示例</t-tag>
            <t-tag size="small" variant="light" theme="primary">{{ item.rarity }}</t-tag>
            <t-tag size="small" variant="light" theme="success">{{ item.role }}</t-tag>
          </view>
          <view class="entry-card__desc">{{ item.desc }}</view>
          <view class="chip-row">
            <text v-for="team in item.teams" :key="team" class="chip chip--ghost">{{ team }}</text>
          </view>
        </view>
        <t-icon name="chevron-right" size="32rpx" color="#c2c9d6" />
      </view>
    </view>

    <t-empty v-if="!list.length" description="没有符合条件的角色" />
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
import { decorateWithElement, filterCharacters } from '@/utils/query.js';
import { load } from '@/utils/team.js';

const keyword = ref('');
const role = ref('全部');
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
    filterCharacters(catalog.value.items, {
      keyword: keyword.value,
      role: role.value,
      rarity: rarity.value,
      element: element.value
    }),
    elementToolkit.value.elementMap
  )
);

function reload() {
  catalog.value = getCatalog('character').data || { items: [], filters: {}, notice: '' };
  elementToolkit.value = createElementToolkit(getCatalog('element').data);
}

function onKeywordChange(event) {
  keyword.value = event.detail.value;
}

function goDetail(id) {
  uni.navigateTo({ url: `/pages/character/detail?id=${id}` });
}

let unsubscribe = null;
onLoad((options) => {
  if (options && options.keyword) keyword.value = decodeURIComponent(options.keyword);
  reload();
});
onShow(() => {
  teamCount.value = load().members.length;
});
unsubscribe = onCatalogUpdate(reload);
onUnload(() => unsubscribe && unsubscribe());
</script>

<style>
.filter-row {
  gap: 12rpx;
}
</style>
