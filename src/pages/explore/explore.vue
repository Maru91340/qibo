<template>
  <tool-shell
    title="地图探索"
    sub="按区域整理采集、奇波、传送与副本入口点位，支持搜索和分类筛选；点位为示例整理，公测后按实际地图校正。"
    :tags="['点位 ' + explorePoints.length + ' 个', '区域联动', '待核实']"
    hero="linear-gradient(135deg, #0d2f4f 0%, #12a5c9 55%, #28b37a 100%)"
    note="点位名称与分布为示例整理，交互地图与精确坐标待官方地图资料公开；本页不提供采集路线收益承诺。"
  >
    <view class="tool-panel">
      <view class="ct-search">
        <text class="ct-search__icon">⌕</text>
        <input
          class="ct-search__input"
          :value="keyword"
          placeholder="搜点位或区域，如「夏露露」"
          confirm-type="search"
          placeholder-class="ct-search__ph"
          @input="onKeywordInput"
        />
        <text v-if="keyword" class="ct-search__clear" hover-class="tap-hover" @tap="clearKeyword">×</text>
      </view>

      <view class="tool-picker">
        <view
          v-for="item in exploreCategories"
          :key="item"
          class="tool-picker__item"
          :class="{ 'tool-picker__item--active': item === category }"
          hover-class="tool-picker__item--hover"
          hover-stay-time="90"
          @tap="setCategory(item)"
        >{{ item }} {{ categoryCount(item) }}</view>
      </view>

      <view class="list-head explore-count">
        <text>命中 {{ filteredPoints.length }} / 共 {{ explorePoints.length }} 个点位</text>
        <text v-if="isFiltering" class="explore-reset" hover-class="tap-hover" @tap="resetFilters">清空筛选</text>
      </view>
    </view>

    <view class="tool-panel">
      <view class="tool-panel__head">
        <text class="tool-panel__title">点位清单</text>
        <text class="tool-panel__hint">点行展开</text>
      </view>

      <view v-if="filteredPoints.length">
        <view
          v-for="point in filteredPoints"
          :key="point.id"
          class="tool-point"
          hover-class="tool-point--hover"
          hover-stay-time="90"
          @tap="togglePoint(point.id)"
        >
          <view class="tool-point__top">
            <text class="tool-point__cat">{{ point.category }}</text>
            <text class="tool-point__name">{{ point.name }}</text>
            <text class="tool-point__arrow" :class="{ 'tool-point__arrow--open': openId === point.id }">›</text>
          </view>
          <view class="tool-point__meta">
            <text class="ct-tag ct-tag--ghost">{{ point.regionName }}</text>
            <text v-if="point.element" class="ct-tag">{{ point.element }}元素</text>
            <text v-if="!point.verified" class="ct-tag ct-tag--warn">待核实</text>
          </view>
          <view v-if="openId === point.id" class="tool-point__body">
            <text>{{ point.desc }}</text>
            <view class="ct-actions">
              <view class="ct-link tool-point__link" hover-class="ct-link--hover" @tap.stop="openRegion(point.regionId)">查看地区阵营 ›</view>
            </view>
          </view>
        </view>
      </view>

      <view v-else class="tool-empty">
        <view class="tool-empty__icon">⌖</view>
        <view class="tool-empty__title">没有匹配的点位</view>
        <view class="tool-empty__text">换个关键词，或把分类切回「全部」；当前点位为示例整理，数量会随资料补充增加。</view>
        <view class="ct-actions">
          <view class="ct-btn" hover-class="ct-btn--hover" @tap="resetFilters">清空筛选</view>
        </view>
      </view>
    </view>

    <view class="tool-panel">
      <view class="tool-panel__head">
        <text class="tool-panel__title">探索提示</text>
        <text class="tool-panel__hint">示例整理</text>
      </view>
      <view class="ct-step">
        <text class="ct-step__num">1</text>
        <text class="ct-step__text">先用传送点打卡区域，再按分类查看采集与奇波点位。</text>
      </view>
      <view class="ct-step">
        <text class="ct-step__num">2</text>
        <text class="ct-step__text">点位详情可跳到「地区阵营」，查看该区域已有的公开资料。</text>
      </view>
      <view class="ct-step">
        <text class="ct-step__num">3</text>
        <text class="ct-step__text">公测后需要按实际地图校正坐标与刷新规则，当前不提供收益承诺。</text>
      </view>
    </view>
  </tool-shell>
</template>

<script setup>
import { computed, ref } from 'vue';
import { onShareAppMessage } from '@dcloudio/uni-app';
import { exploreCategories, explorePoints } from '@/data/tools.js';

const keyword = ref('');
const category = ref('全部');
const openId = ref('');

const normalizedKeyword = computed(() => keyword.value.trim().toLowerCase());

const filteredPoints = computed(() => explorePoints.filter((point) => {
  const matchCategory = category.value === '全部' || point.category === category.value;
  if (!matchCategory) return false;
  if (!normalizedKeyword.value) return true;
  const haystack = [point.name, point.regionName, point.category, point.desc].join(' ').toLowerCase();
  return haystack.includes(normalizedKeyword.value);
}));

const isFiltering = computed(() => category.value !== '全部' || Boolean(normalizedKeyword.value));

function categoryCount(item) {
  if (item === '全部') return explorePoints.length;
  return explorePoints.filter((point) => point.category === item).length;
}

function onKeywordInput(event) {
  keyword.value = (event.detail && event.detail.value) || '';
}

function clearKeyword() {
  keyword.value = '';
}

function setCategory(item) {
  category.value = item;
}

function resetFilters() {
  keyword.value = '';
  category.value = '全部';
}

function togglePoint(id) {
  openId.value = openId.value === id ? '' : id;
}

function openRegion(id) {
  uni.navigateTo({ url: `/pages/region/detail?id=${id}` });
}

onShareAppMessage(() => ({ title: '地图探索 · 蓝色星原助手', path: '/pages/explore/explore' }));
</script>

<style>
.explore-count {
  margin-top: 8rpx;
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

.theme-dark .explore-reset {
  color: var(--brand-bright);
}
</style>
