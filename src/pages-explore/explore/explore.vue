<template>
  <tool-shell
    title="地图探索"
    sub="真实游戏坐标点位（BWIKI Data:Map 数据页采集，与竞品 6139 点位同源）；类型编号语义官方未公开，待公测核实。"
    :tags="['点位 ' + totalText + ' 个', '双区域', 'BWIKI 数据']"
    hero="linear-gradient(135deg, #0d2f4f 0%, #12a5c9 55%, #28b37a 100%)"
    note="示意地图为代码自绘（非官方底图，版权安全）；点位为 BWIKI 采集的真实游戏坐标，采集与刷新规则以游戏内实际为准。"
  >
    <view class="tool-panel">
      <view class="ct-search">
        <text class="ct-search__icon">⌕</text>
        <input
          class="ct-search__input"
          :value="keyword"
          placeholder="搜点位名称，如「星脉节点」「宝箱」"
          confirm-type="search"
          placeholder-class="ct-search__ph"
          @input="onKeywordInput"
        />
        <text v-if="keyword" class="ct-search__clear" hover-class="tap-hover" @tap="clearKeyword">×</text>
      </view>

      <view class="tool-picker">
        <view
          v-for="region in regionTabs"
          :key="region.code"
          class="tool-picker__item"
          :class="{ 'tool-picker__item--active': region.code === regionCode }"
          hover-class="tool-picker__item--hover"
          hover-stay-time="90"
          @tap="setRegion(region.code)"
        >{{ region.label }} {{ region.count }}</view>
      </view>

      <scroll-view scroll-x class="explore-types">
        <view class="explore-types__inner">
          <view
            v-for="typeEntry in typeChips"
            :key="typeEntry.key"
            class="facet-chip"
            :class="{ 'facet-chip--active': typeEntry.type === activeType }"
            hover-class="facet-chip--hover"
            hover-stay-time="90"
            @tap="setType(typeEntry.type)"
          >{{ typeEntry.label }} {{ typeEntry.count }}</view>
        </view>
      </scroll-view>

      <view class="list-head explore-count">
        <text>命中 {{ filteredPoints.length }} / 共 {{ regionPoints.length }} 个点位</text>
        <text v-if="isFiltering" class="explore-reset" hover-class="tap-hover" @tap="resetFilters">清空筛选</text>
      </view>
    </view>

    <view class="tool-panel">
      <view class="tool-panel__head">
        <text class="tool-panel__title">示意地图</text>
        <text class="tool-panel__hint">拖拽平移 · 点簇点按放大</text>
      </view>
      <explore-map :points="filteredPoints" />
    </view>

    <view class="tool-panel">
      <view class="tool-panel__head">
        <text class="tool-panel__title">点位清单</text>
        <text class="tool-panel__hint">点行展开看坐标</text>
      </view>

      <view v-if="visiblePoints.length">
        <view
          v-for="point in visiblePoints"
          :key="point.key"
          class="tool-point"
          hover-class="tool-point--hover"
          hover-stay-time="90"
          @tap="togglePoint(point.key)"
        >
          <view class="tool-point__top">
            <text class="tool-point__cat">{{ point.typeLabel }}</text>
            <text class="tool-point__name">{{ point.name }}</text>
            <text class="tool-point__arrow" :class="{ 'tool-point__arrow--open': openId === point.key }">›</text>
          </view>
          <view class="tool-point__meta">
            <text class="ct-tag ct-tag--ghost">{{ point.regionLabel }}</text>
            <text class="ct-tag">坐标 {{ point.x }}, {{ point.y }}</text>
            <text class="ct-tag ct-tag--warn">待核实</text>
          </view>
          <view v-if="openId === point.key" class="tool-point__body">
            <text>游戏内地图坐标：X {{ point.x }} · Y {{ point.y }}；图层 {{ point.layer || '默认' }}。类型编号 {{ point.type }} 的语义官方未公开，公测后校正。</text>
            <view class="ct-actions">
              <view class="ct-link tool-point__link" hover-class="ct-link--hover" @tap.stop="copyPoint(point)">复制坐标</view>
            </view>
          </view>
        </view>
        <view v-if="visiblePoints.length < filteredPoints.length" class="ct-actions explore-more">
          <view class="ct-btn" hover-class="ct-btn--hover" @tap="loadMore">加载更多（还有 {{ filteredPoints.length - visiblePoints.length }} 个）</view>
        </view>
      </view>

      <view v-else class="tool-empty">
        <view class="tool-empty__icon">⌖</view>
        <view class="tool-empty__title">没有匹配的点位</view>
        <view class="tool-empty__text">换个关键词，或把类型切回「全部」。</view>
        <view class="ct-actions">
          <view class="ct-btn" hover-class="ct-btn--hover" @tap="resetFilters">清空筛选</view>
        </view>
      </view>
    </view>

    <view class="tool-panel">
      <view class="tool-panel__head">
        <text class="tool-panel__title">数据说明</text>
        <text class="tool-panel__hint">BWIKI 来源</text>
      </view>
      <view class="ct-step">
        <text class="ct-step__num">1</text>
        <text class="ct-step__text">点位数据来自 BWIKI「地图点位数据」（Data:Map 数据页），与竞品手册的 6139 点位同源。</text>
      </view>
      <view class="ct-step">
        <text class="ct-step__num">2</text>
        <text class="ct-step__text">类型编号（类型N）的语义官方未公开，公测后按官方图鉴校正并更新筛选命名。</text>
      </view>
      <view class="ct-step">
        <text class="ct-step__num">3</text>
        <text class="ct-step__text">示意地图为纯代码自绘色块/曲线（R2 升级），不含任何官方素材；官方真实底图待版权方案批准后再接入。</text>
      </view>
    </view>
  </tool-shell>
</template>

<script setup>
import { computed, ref } from 'vue';
import { onShareAppMessage } from '@dcloudio/uni-app';
import mapPoints from '@/data/generated/map-points.json';
import ExploreMap from '@/components/explore-map/explore-map.vue';

const PAGE_SIZE = 120;
const keyword = ref('');
const regionCode = ref('全部');
const activeType = ref('全部');
const openId = ref('');
const visibleCount = ref(PAGE_SIZE);

const regionTabs = computed(() => {
  const tabs = [{ code: '全部', label: '全部', count: mapPoints.total || 0 }];
  (mapPoints.regions || []).forEach((region) => {
    tabs.push({ code: region.code, label: region.label, count: region.types.reduce((sum, t) => sum + t.points.length, 0) });
  });
  return tabs;
});

const flatPoints = computed(() => {
  const rows = [];
  (mapPoints.regions || []).forEach((region) => {
    region.types.forEach((typeEntry) => {
      typeEntry.points.forEach((point) => {
        rows.push({
          key: `${region.code}-${point.name}-${point.x}-${point.y}`,
          name: point.name,
          type: point.type,
          typeLabel: `类型${point.type}`,
          x: point.x,
          y: point.y,
          layer: point.layer,
          regionCode: region.code,
          regionLabel: region.label
        });
      });
    });
  });
  return rows;
});

const regionPoints = computed(() =>
  regionCode.value === '全部' ? flatPoints.value : flatPoints.value.filter((point) => point.regionCode === regionCode.value)
);

const typeChips = computed(() => {
  const counts = {};
  regionPoints.value.forEach((point) => {
    counts[point.type] = (counts[point.type] || 0) + 1;
  });
  const chips = [{ key: 'all', type: '全部', label: '全部', count: regionPoints.value.length }];
  Object.keys(counts)
    .map(Number)
    .sort((a, b) => counts[b] - counts[a])
    .forEach((type) => {
      chips.push({ key: `t${type}`, type, label: `类型${type}`, count: counts[type] });
    });
  return chips;
});

const normalizedKeyword = computed(() => keyword.value.trim().toLowerCase());

const filteredPoints = computed(() =>
  regionPoints.value.filter((point) => {
    if (activeType.value !== '全部' && point.type !== activeType.value) return false;
    if (!normalizedKeyword.value) return true;
    return [point.name, point.typeLabel, point.regionLabel].join(' ').toLowerCase().includes(normalizedKeyword.value);
  })
);

const visiblePoints = computed(() => filteredPoints.value.slice(0, visibleCount.value));
const isFiltering = computed(() => regionCode.value !== '全部' || activeType.value !== '全部' || Boolean(normalizedKeyword.value));
const totalText = computed(() => String(mapPoints.total || flatPoints.value.length));

function setRegion(code) {
  regionCode.value = code;
  activeType.value = '全部';
  visibleCount.value = PAGE_SIZE;
}

function setType(type) {
  activeType.value = type;
  visibleCount.value = PAGE_SIZE;
}

function onKeywordInput(event) {
  keyword.value = (event.detail && event.detail.value) || '';
  visibleCount.value = PAGE_SIZE;
}

function clearKeyword() {
  keyword.value = '';
  visibleCount.value = PAGE_SIZE;
}

function resetFilters() {
  keyword.value = '';
  regionCode.value = '全部';
  activeType.value = '全部';
  visibleCount.value = PAGE_SIZE;
}

function loadMore() {
  visibleCount.value += PAGE_SIZE;
}

function togglePoint(key) {
  openId.value = openId.value === key ? '' : key;
}

function copyPoint(point) {
  uni.setClipboardData({ data: `${point.name} 坐标 X ${point.x}, Y ${point.y}` });
}

onShareAppMessage(() => ({ title: '地图探索 · 奇波小助手', path: '/pages-explore/explore/explore' }));
</script>

<style>
.explore-count {
  margin-top: 8rpx;
}

.explore-types {
  white-space: nowrap;
  margin-top: 16rpx;
}

.explore-types__inner {
  display: inline-flex;
  flex-wrap: nowrap;
  gap: 12rpx;
  padding: 4rpx 2rpx 8rpx;
}

.explore-reset {
  display: inline-flex;
  align-items: center;
  min-height: 64rpx;
  margin-right: -12rpx;
  padding: 0 12rpx;
  border-radius: 999rpx;
  color: var(--brand);
  font-weight: 600;
}

.explore-more {
  margin-top: 16rpx;
}

.theme-dark .explore-reset {
  color: var(--brand-bright);
}
</style>
