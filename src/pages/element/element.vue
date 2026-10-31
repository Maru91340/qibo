<template>
  <view class="page" :class="{ 'theme-dark': isDark }">
    <view class="page-hero" :style="{ background: 'linear-gradient(132deg, #262c54 0%, #00b3a4 58%, #7f5bff 100%)' }">
      <view class="page-hero__inner">
        <text class="page-hero__eyebrow">信息查询</text>
        <view class="page-hero__title">元素克制速查</view>
        <view class="page-hero__sub">选择一个元素，查看它克制与被克制的关系；表格为全元素两两倍率。</view>
      </view>
    </view>

    <view class="element-row element-row--pick">
      <view
        v-for="option in toolkit.elements"
        :key="option.key"
        class="element-pill" hover-class="tap-hover"
        :class="{ 'element-pill--active': option.key === current }"
        @tap="current = option.key"
      >
        <view class="element-pill__dot" :style="{ background: option.color }">{{ option.name }}</view>
        <text>{{ option.label }}</text>
      </view>
    </view>

    <view class="panel card">
      <view class="panel__title">
        <text>{{ currentElement.label }}的相克关系</text>
        <text class="text-muted">倍率 {{ STRONG_RATIO }}x / {{ WEAK_RATIO }}x</text>
      </view>
      <view class="rel">
        <view class="rel__col">
          <text class="rel__label">克制</text>
          <view class="rel__list">
            <text
              v-for="item in strongList"
              :key="item.key"
              class="rel__item"
              :style="{ background: item.tint, color: item.color }"
            >
              {{ item.label }}
            </text>
            <text v-if="!strongList.length" class="rel__item rel__item--none">无</text>
          </view>
        </view>
        <view class="rel__col">
          <text class="rel__label">被克制</text>
          <view class="rel__list">
            <text
              v-for="item in weakList"
              :key="item.key"
              class="rel__item"
              :style="{ background: item.tint, color: item.color }"
            >
              {{ item.label }}
            </text>
            <text v-if="!weakList.length" class="rel__item rel__item--none">无</text>
          </view>
        </view>
      </view>
    </view>

    <view class="panel card">
      <view class="panel__title">克制矩阵</view>
      <view class="matrix">
        <view class="matrix__row matrix__row--head">
          <view class="matrix__corner">攻\防</view>
          <view
            v-for="col in toolkit.elements"
            :key="col.key"
            class="matrix__cell matrix__cell--head"
            :style="{ color: col.color }"
          >
            {{ col.name }}
          </view>
        </view>
        <view v-for="row in matrix" :key="row.key" class="matrix__row">
          <view class="matrix__label" :style="{ color: row.color }">{{ row.name }}</view>
          <view
            v-for="cell in row.cells"
            :key="cell.id"
            class="matrix__cell"
            :class="'matrix__cell--' + cell.key"
          >
            {{ cell.key === 'self' ? '—' : cell.ratio }}
          </view>
        </view>
      </view>
      <view class="legend">
        <text class="legend__item"><text class="legend__swatch legend__swatch--strong" />克制 {{ STRONG_RATIO }}</text>
        <text class="legend__item"><text class="legend__swatch legend__swatch--neutral" />中立 1</text>
        <text class="legend__item"><text class="legend__swatch legend__swatch--weak" />被克 {{ WEAK_RATIO }}</text>
      </view>
    </view>

    <view v-if="teamView.elements.length" class="panel card">
      <view class="panel__title">当前队伍对「{{ currentElement.label }}」目标</view>
      <view class="team-line">
        <text v-for="item in teamView.elements" :key="item.key" class="team-line__name">{{ item.label }}</text>
      </view>
      <view class="panel__desc panel__desc--first">
        队伍中 {{ teamView.strongCount }} 名可克制该目标，{{ teamView.weakCount }} 名会被反制。
      </view>
    </view>

    <view class="footnote">{{ notice }}</view>
  </view>
</template>

<script setup>
import { useTheme } from '@/utils/theme.js';

const { isDark } = useTheme();
import { computed, ref, watch } from 'vue';
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app';
import { getCatalog, onCatalogUpdate } from '@/services/content.js';
import { createElementToolkit, STRONG_RATIO, WEAK_RATIO } from '@/data/element.js';
import { load, summarize } from '@/utils/team.js';

const toolkit = ref(createElementToolkit(getCatalog('element').data));
const current = ref((toolkit.value.elements[0] || {}).key);
const teamElements = ref([]);

const notice = computed(() => toolkit.value.notice);
const currentElement = computed(
  () => toolkit.value.elementMap[current.value] || { key: '', name: '—', label: '未选择元素', color: '#5a6480', tint: '#f2f4f9' }
);
const strongList = computed(() =>
  (toolkit.value.counters[current.value] || []).map((key) => toolkit.value.elementMap[key]).filter(Boolean)
);
const weakList = computed(() =>
  (toolkit.value.counteredBy[current.value] || []).map((key) => toolkit.value.elementMap[key]).filter(Boolean)
);
const matrix = computed(() => toolkit.value.matrix());

const teamView = computed(() => {
  let strongCount = 0;
  let weakCount = 0;
  teamElements.value.forEach((element) => {
    const relation = toolkit.value.relation(element.key, current.value);
    if (relation.key === 'strong') strongCount += 1;
    if (relation.key === 'weak') weakCount += 1;
  });
  return { elements: teamElements.value, strongCount, weakCount };
});

function reloadTeam() {
  const team = load();
  const index = (items) =>
    (items || []).reduce((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
  const characters = getCatalog('character').data || {};
  const qibos = getCatalog('qibo').data || {};
  teamElements.value = summarize(
    team,
    index(characters.items),
    index(qibos.items),
    toolkit.value.elementMap
  ).elements;
}

function reload() {
  toolkit.value = createElementToolkit(getCatalog('element').data);
  if (!toolkit.value.elementMap[current.value]) current.value = (toolkit.value.elements[0] || {}).key;
  reloadTeam();
}

let unsubscribe = null;
onLoad(reload);
onShow(reloadTeam);
watch(current, reloadTeam);
unsubscribe = onCatalogUpdate(reload);
onUnload(() => unsubscribe && unsubscribe());
</script>

<style>
.tip {
  margin-bottom: 24rpx;
  padding: 36rpx 40rpx;
}

.tip__title {
  font-size: 36rpx;
  font-weight: 700;
}

.tip__desc {
  margin-top: 12rpx;
  font-size: 24rpx;
  line-height: 1.65;
  opacity: 0.88;
}

.element-row--pick {
  margin-bottom: 24rpx;
}

.rel {
  display: flex;
  gap: 20rpx;
}

.rel__col {
  flex: 1;
}

.rel__label {
  color: var(--ink-3);
  font-size: 22rpx;
}

.rel__list {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 14rpx;
}

.rel__item {
  padding: 10rpx 22rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 600;
}

.rel__item--none {
  background: var(--soft);
  color: var(--ink-3);
  font-weight: 400;
}

.matrix {
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--soft);
}

.matrix__row {
  display: flex;
}

.matrix__row--head {
  background: var(--brand-soft);
}

.matrix__corner,
.matrix__label {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 92rpx;
  height: 72rpx;
  font-size: 24rpx;
  font-weight: 600;
}

.matrix__corner {
  color: var(--ink-3);
  font-size: 20rpx;
}

.matrix__cell {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  height: 72rpx;
  border-left: 1rpx solid #fff;
  border-top: 1rpx solid #fff;
  font-size: 22rpx;
  color: var(--ink-3);
}

.matrix__cell--head {
  border-top: none;
  font-size: 26rpx;
  font-weight: 700;
}

.matrix__cell--strong {
  background: var(--ok-soft);
  color: var(--ok);
  font-weight: 600;
}

.matrix__cell--weak {
  background: var(--danger-soft);
  color: var(--danger);
  font-weight: 600;
}

.matrix__cell--self {
  background: var(--brand-soft);
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 26rpx;
  margin-top: 20rpx;
  color: var(--ink-2);
  font-size: 22rpx;
}

.legend__item {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.legend__swatch {
  width: 22rpx;
  height: 22rpx;
  border-radius: 6rpx;
}

.legend__swatch--strong {
  background: var(--ok-soft);
}

.legend__swatch--neutral {
  background: var(--soft);
}

.legend__swatch--weak {
  background: var(--danger-soft);
}

.team-line {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.team-line__name {
  padding: 8rpx 22rpx;
  border-radius: 999rpx;
  background: var(--brand-soft);
  color: var(--brand-deep);
  font-size: 24rpx;
}
</style>
