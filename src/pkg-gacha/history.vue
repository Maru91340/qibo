<template>
  <view class="page">
    <view class="page__bg" />

    <!-- 顶栏 -->
    <view class="bar">
      <view class="bar__back" hover-class="bar__back--hover" @tap="goBack"><text>‹</text></view>
      <view class="bar__title">
        <text class="bar__en">OBSERVATION / LOCAL HISTORY</text>
        <text class="bar__zh">观测记录</text>
      </view>
      <view class="bar__reset" hover-class="bar__reset--hover" @tap="openReset"><text>重置数据</text></view>
    </view>

    <scroll-view class="body" scroll-y :show-scrollbar="false">
      <!-- 卡池筛选 -->
      <scroll-view class="filters" scroll-x :show-scrollbar="false">
        <view class="filters__row">
          <view
            v-for="tab in filterTabs"
            :key="tab.id"
            class="filter"
            :class="{ 'filter--active': tab.id === filterId }"
            :style="tab.id === filterId ? { '--accent': tab.accent } : null"
            @tap="setFilter(tab.id)"
          >
            <text class="filter__text">{{ tab.name }}</text>
          </view>
        </view>
      </scroll-view>

      <!-- 汇总 -->
      <view class="summary">
        <view class="summary__item">
          <text class="summary__num">{{ records.length }}</text>
          <text class="summary__label">累计观测</text>
        </view>
        <view class="summary__sep" />
        <view class="summary__item">
          <text class="summary__num summary__num--gold">{{ fiveList.length }}</text>
          <text class="summary__label">五星</text>
        </view>
        <view class="summary__sep" />
        <view class="summary__item">
          <text class="summary__num summary__num--purple">{{ fourList.length }}</text>
          <text class="summary__label">四星</text>
        </view>
        <view class="summary__sep" />
        <view class="summary__item">
          <view class="summary__mats">
            <image class="summary__mat" :src="materialLimited" mode="aspectFit" />
            <text class="summary__mat-num">{{ materialCounts.limited }}</text>
            <image class="summary__mat" :src="materialStandard" mode="aspectFit" />
            <text class="summary__mat-num">{{ materialCounts.standard }}</text>
          </view>
          <text class="summary__label">材料</text>
        </view>
      </view>
      <text class="note">{{ noteText }}</text>
      <view v-if="storageIssue" class="warn"><text>{{ storageIssue }}</text></view>

      <!-- 五星收藏 -->
      <view class="section">
        <view class="section__head">
          <text class="section__title">五星物品</text>
          <text class="section__sub">共 {{ fiveList.length }} 个 · 角标为同池间隔</text>
        </view>
        <view v-if="fiveList.length" class="grid grid--five">
          <view v-for="(item, index) in fiveList" :key="'five-' + index" class="card">
            <view class="card__frame">
              <image v-if="cardArt(item)" class="card__img" :src="cardArt(item)" mode="aspectFill" />
              <view v-else class="card__fallback"><text>{{ item.name.slice(0, 1) }}</text></view>
              <text v-if="item.luck" class="card__luck">{{ luckLabel(item.luck) }}</text>
              <text v-if="item.isUp" class="card__up">UP</text>
              <text class="card__gap">{{ item.fiveGap }} 抽</text>
            </view>
            <text class="card__name">{{ item.name }}</text>
            <text class="card__meta">{{ poolNameOf(item.poolId) }} · 第 {{ item.serial }} 抽</text>
          </view>
        </view>
        <view v-else class="empty">
          <text class="empty__symbol">✧</text>
          <text class="empty__title">还没有五星记录</text>
          <text class="empty__sub">抽到五星后会在这里留下卡面与出货抽数</text>
        </view>
      </view>

      <!-- 四星收藏 -->
      <view class="section">
        <view class="section__head">
          <text class="section__title">四星物品</text>
          <text class="section__sub">共 {{ fourList.length }} 次 · 重复按数量汇总</text>
        </view>
        <view v-if="fourGroups.length" class="grid grid--four">
          <view v-for="group in fourGroups" :key="'four-' + group.kind + group.name" class="card">
            <view class="card__frame">
              <image v-if="cardArt(group)" class="card__img" :src="cardArt(group)" mode="aspectFill" />
              <view v-else class="card__fallback"><text>{{ group.name.slice(0, 1) }}</text></view>
              <text class="card__count">×{{ group.count }}</text>
            </view>
            <text class="card__name">{{ group.name }}</text>
            <text class="card__meta">{{ group.kind }}</text>
          </view>
        </view>
        <view v-else class="empty">
          <text class="empty__symbol">✧</text>
          <text class="empty__title">还没有四星记录</text>
        </view>
      </view>

      <!-- 逐抽明细 -->
      <view class="section">
        <view class="section__head">
          <text class="section__title">逐抽明细</text>
          <text class="section__sub">最新记录在前</text>
        </view>
        <view class="toolbar">
          <text class="toolbar__count">共 {{ filteredLog.length }} 条 · 每页 20 条</text>
          <view class="rarity">
            <view
              v-for="option in rarityOptions"
              :key="option.value"
              class="rarity__item"
              :class="{ 'rarity__item--active': option.value === rarity }"
              @tap="setRarity(option.value)"
            >
              <text class="rarity__text">{{ option.label }}</text>
            </view>
          </view>
        </view>

        <view v-if="pageRows.length" class="log">
          <view v-for="(item, index) in pageRows" :key="'log-' + index" class="log__row">
            <image v-if="cardArt(item)" class="log__thumb" :src="cardArt(item)" mode="aspectFill" />
            <view v-else class="log__thumb log__thumb--fallback"><text>{{ item.name.slice(0, 1) }}</text></view>
            <view class="log__main">
              <view class="log__name-row">
                <text class="log__name">{{ item.name }}</text>
                <text v-if="item.isUp" class="log__up">UP</text>
                <text v-if="item.luck" class="log__luck">{{ luckLabel(item.luck) }}</text>
              </view>
              <text class="log__meta">{{ poolNameOf(item.poolId) }} · {{ item.kind }}</text>
            </view>
            <view class="log__right">
              <text class="log__rarity" :class="'log__rarity--r' + item.rarity">{{ item.rarity }}★</text>
              <text class="log__time">#{{ item.serial }} · {{ timeText(item.at) }}</text>
            </view>
          </view>
        </view>
        <view v-else class="empty empty--mini">
          <text class="empty__symbol">✧</text>
          <text class="empty__title">当前筛选下暂无记录</text>
        </view>

        <view v-if="filteredLog.length > PAGE_SIZE" class="pager">
          <view class="pager__btn" :class="{ 'pager__btn--off': page === 1 }" @tap="prevPage"><text>上一页</text></view>
          <text class="pager__label">{{ page }} / {{ pages }}</text>
          <view class="pager__btn" :class="{ 'pager__btn--off': page >= pages }" @tap="nextPage"><text>下一页</text></view>
        </view>
      </view>

      <view class="foot">
        <text>仅保存在本机 · 材料按观测次数折算 · 五星角标为同池距上次五星的抽数</text>
      </view>
      <view class="foot-pad" />
    </scroll-view>

    <!-- 重置确认 -->
    <view v-if="resetOpen" class="modal">
      <view class="modal__mask" @tap="closeReset" />
      <view class="modal__box">
        <text class="modal__title">重置观测数据</text>
        <text class="modal__desc">{{ resetDesc }}</text>
        <text class="modal__callout">重置会清除对应记录、收藏、保底与新手池次数，操作后无法恢复。</text>
        <view class="modal__quota">
          <text class="modal__quota-num">本日仍可抽 {{ remaining }} 抽</text>
          <text class="modal__quota-text">重置只清空观测记录与保底进度，不会改变每日可抽次数。</text>
        </view>
        <view class="modal__actions">
          <view class="modal__btn" hover-class="btn--hover" @tap="closeReset"><text>取消</text></view>
          <view class="modal__btn modal__btn--warn" hover-class="btn--hover" @tap="confirmResetPool"><text>仅重置本池</text></view>
          <view class="modal__btn modal__btn--danger" hover-class="btn--hover" @tap="confirmResetAll"><text>重置全部</text></view>
        </view>
      </view>
    </view>

    <text class="mark">奇波小程序--抽卡模拟</text>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { POOLS, LUCK } from './lib/pools.js';
import { findPool, pityOf } from './lib/rate.js';
import { cardArt } from './lib/cards.js';
import { gachaAsset } from './lib/assets.js';
import { getStorageIssue, loadQuota, loadStore, quotaRemaining, resetStore } from './lib/store.js';

const PAGE_SIZE = 20;
const store = ref(loadStore());
const filterId = ref('all');
const rarity = ref('all');
const page = ref(1);
const resetOpen = ref(false);
const storageIssue = ref(getStorageIssue());
const quota = ref(loadQuota());
const remaining = computed(() => quotaRemaining(quota.value));

const materialLimited = gachaAsset('gacha-assets/material-limited.png');
const materialStandard = gachaAsset('gacha-assets/material-standard.png');

const filterTabs = computed(() => [{ id: 'all', name: '全部卡池', accent: '#88739c' }, ...POOLS.map((pool) => ({ id: pool.id, name: pool.name, accent: pool.accent }))]);
const rarityOptions = [
  { value: 'all', label: '全部' },
  { value: '5', label: '五星' },
  { value: '4', label: '四星' },
  { value: '3', label: '三星' }
];

const records = computed(() => (filterId.value === 'all' ? store.value.history : store.value.history.filter((item) => item.poolId === filterId.value)));
const fiveList = computed(() => records.value.filter((item) => item.rarity === 5).slice().reverse());
const fourList = computed(() => records.value.filter((item) => item.rarity === 4));
const materialCounts = computed(() => {
  const counts = { limited: 0, standard: 0 };
  for (const item of records.value) {
    const pool = POOLS.find((entry) => entry.id === item.poolId);
    const limited = pool && pool.group.indexOf('limited') === 0;
    counts[limited ? 'limited' : 'standard'] += 1;
  }
  return counts;
});
const fourGroups = computed(() => {
  const groups = new Map();
  for (const item of fourList.value) {
    const key = item.kind + ':' + item.name;
    const group = groups.get(key) || { name: item.name, kind: item.kind, count: 0 };
    group.count += 1;
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => b.count - a.count);
});
const filteredLog = computed(() => {
  const list = rarity.value === 'all' ? records.value : records.value.filter((item) => item.rarity === Number(rarity.value));
  return list.slice().reverse();
});
const pages = computed(() => Math.max(1, Math.ceil(filteredLog.value.length / PAGE_SIZE)));
const pageRows = computed(() => {
  const safePage = Math.min(Math.max(page.value, 1), pages.value);
  return filteredLog.value.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
});
const noteText = computed(() => {
  const pool = POOLS.find((item) => item.id === filterId.value);
  if (!pool) return '全部卡池合计 · 五星角标为同池距上次五星的抽数 · 同类限定池保底跨池累计';
  if (pool.limit) return '「' + pool.name + '」不设概率递增，不标注好运标识 · 已抽 ' + store.value.pools[pool.id].total + ' / 30';
  const legend = Math.round(pool.cap * 0.22);
  const lucky = Math.round(pool.cap * 0.44);
  const progress = pool.up ? pityOf(store.value, pool).sinceUp : pityOf(store.value, pool).sinceFive;
  return '「' + pool.name + '」前 ' + legend + ' 抽内出金记「天选」，前 ' + lucky + ' 抽内记「欧皇」· 保底进度 ' + progress + ' / ' + pool.cap + (pool.up ? '（UP）' : '');
});
const resetPool = computed(() => {
  const id = filterId.value === 'all' ? POOLS[0].id : filterId.value;
  return findPool(id);
});
const resetDesc = computed(() => {
  const pool = resetPool.value;
  return '当前可单独重置「' + pool.name + '」（' + store.value.pools[pool.id].total + ' 抽），或清空全部 ' + POOLS.length + ' 个卡池（' + store.value.history.length + ' 抽）。';
});

function poolNameOf(poolId) {
  const pool = POOLS.find((item) => item.id === poolId);
  return pool ? pool.name : poolId;
}

function luckLabel(key) {
  return (LUCK[key] && LUCK[key].label) || '';
}

function timeText(at) {
  const date = new Date(at);
  const pad = (value) => String(value).padStart(2, '0');
  return pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
}

function setFilter(id) {
  filterId.value = id;
  page.value = 1;
}

function setRarity(value) {
  rarity.value = value;
  page.value = 1;
}

function prevPage() {
  if (page.value > 1) page.value -= 1;
}

function nextPage() {
  if (page.value < pages.value) page.value += 1;
}

function goBack() {
  uni.navigateBack();
}

function openReset() {
  quota.value = loadQuota();
  resetOpen.value = true;
}

function closeReset() {
  resetOpen.value = false;
}

function refresh() {
  store.value = loadStore();
  storageIssue.value = getStorageIssue();
  quota.value = loadQuota();
  page.value = 1;
}

function confirmResetPool() {
  store.value = resetStore(store.value, resetPool.value.id);
  resetOpen.value = false;
  quota.value = loadQuota();
  uni.showToast({ title: '已重置该卡池，本日仍可抽 ' + remaining.value + ' 抽', icon: 'none' });
  page.value = 1;
}

function confirmResetAll() {
  store.value = resetStore(store.value, null);
  resetOpen.value = false;
  quota.value = loadQuota();
  uni.showToast({ title: '已重置全部记录，本日仍可抽 ' + remaining.value + ' 抽', icon: 'none' });
  page.value = 1;
}

onLoad((options) => {
  if (options && options.pool && POOLS.some((pool) => pool.id === options.pool)) filterId.value = options.pool;
});

onShow(() => {
  // 从抽卡页返回时同步最新记录
  refresh();
});
</script>

<style scoped>
.page {
  position: relative;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: radial-gradient(60% 46% at 18% 0%, #fffdf7 0%, #f7f2e9 46%, #ece3d4 100%);
  color: #4a4550;
  overflow: hidden;
}
.page__bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.bar {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: calc(24rpx + env(safe-area-inset-top)) 32rpx 16rpx;
}
.bar__back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 4rpx 14rpx rgba(76, 67, 53, 0.12);
  font-size: 36rpx;
  color: #6c675c;
  line-height: 1;
}
.bar__back--hover { transform: scale(0.96); }
.bar__title { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.bar__en { font-size: 16rpx; letter-spacing: 3rpx; color: #a49d90; }
.bar__zh { font-size: 36rpx; letter-spacing: 4rpx; color: #3f3a44; font-weight: 600; }
.bar__reset {
  padding: 10rpx 20rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  color: #7d6122;
  background: rgba(253, 246, 226, 0.95);
  box-shadow: inset 0 0 0 1rpx #e8d59c;
}
.bar__reset--hover { transform: translateY(1rpx); }

.body { position: relative; flex: 1; min-height: 0; }

.filters {
  white-space: nowrap;
  padding: 4rpx 0 0;
}
.filters__row { display: flex; gap: 12rpx; padding: 0 32rpx 4rpx; }
.filter {
  flex: none;
  padding: 12rpx 22rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: inset 0 0 0 1rpx rgba(200, 188, 170, 0.7);
}
.filter--active { background: var(--accent, #88739c); box-shadow: none; }
.filter__text { font-size: 22rpx; color: #6c675c; letter-spacing: 1rpx; }
.filter--active .filter__text { color: #fffdf8; }

.summary {
  display: flex;
  align-items: center;
  margin: 20rpx 32rpx 0;
  padding: 20rpx 8rpx;
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 6rpx 20rpx rgba(120, 100, 80, 0.08);
}
.summary__item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4rpx; }
.summary__num { font-size: 34rpx; font-weight: 600; color: #3c374a; }
.summary__num--gold { color: #a47727; }
.summary__num--purple { color: #7c5aa6; }
.summary__label { font-size: 18rpx; color: #9c9384; letter-spacing: 1rpx; }
.summary__sep { width: 1rpx; height: 44rpx; background: #e2d6c0; }
.summary__mats { display: flex; align-items: center; gap: 4rpx; height: 38rpx; }
.summary__mat { width: 26rpx; height: 26rpx; }
.summary__mat-num { font-size: 22rpx; color: #6c675c; }

.note {
  display: block;
  margin: 14rpx 32rpx 0;
  font-size: 20rpx;
  line-height: 1.7;
  color: #8b837c;
}
.warn {
  margin: 12rpx 32rpx 0;
  padding: 14rpx 18rpx;
  border-radius: 14rpx;
  background: rgba(255, 243, 235, 0.96);
  box-shadow: inset 0 0 0 1rpx #ead3c0;
  font-size: 20rpx;
  line-height: 1.7;
  color: #8a5a34;
}

.section { margin: 28rpx 32rpx 0; }
.section__head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 14rpx; }
.section__title { font-size: 28rpx; font-weight: 600; letter-spacing: 2rpx; color: #4d4756; }
.section__sub { font-size: 19rpx; color: #a39884; }

.grid { display: flex; flex-wrap: wrap; gap: 14rpx; }
.grid--five .card { width: calc((100% - 28rpx) / 3); }
.grid--four .card { width: calc((100% - 42rpx) / 4); }
.grid--five .card__frame { height: 274rpx; }
.grid--four .card__frame { height: 200rpx; }
.card { display: flex; flex-direction: column; gap: 6rpx; }
.card__frame {
  position: relative;
  width: 100%;
  height: 240rpx;
  border-radius: 12rpx;
  overflow: hidden;
  background: #efe7da;
  box-shadow: 0 6rpx 16rpx rgba(76, 67, 53, 0.14), inset 0 0 0 1rpx rgba(255, 255, 255, 0.8);
}
.card__img { width: 100%; height: 100%; }
.card__fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  color: #ad9e87;
  font-weight: 600;
}
.card__luck {
  position: absolute;
  left: 6rpx;
  top: 6rpx;
  padding: 2rpx 10rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #f9e79a, #e9c65a);
  color: #5d4318;
  font-size: 16rpx;
}
.card__up {
  position: absolute;
  right: 6rpx;
  top: 6rpx;
  padding: 2rpx 8rpx;
  border-radius: 999rpx;
  background: rgba(157, 47, 63, 0.86);
  color: #fff6ef;
  font-size: 15rpx;
}
.card__gap {
  position: absolute;
  right: 6rpx;
  bottom: 6rpx;
  padding: 2rpx 10rpx;
  border-radius: 999rpx;
  background: rgba(36, 31, 46, 0.82);
  color: #fdf8ee;
  font-size: 16rpx;
}
.card__count {
  position: absolute;
  right: 6rpx;
  bottom: 6rpx;
  padding: 2rpx 10rpx;
  border-radius: 999rpx;
  background: rgba(36, 31, 46, 0.76);
  color: #fdf8ee;
  font-size: 16rpx;
}
.card__name {
  font-size: 21rpx;
  color: #4d4756;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.card__meta {
  font-size: 17rpx;
  color: #a39884;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  padding: 40rpx 24rpx;
  border-radius: 18rpx;
  border: 1rpx dashed #d3c6ae;
  background: rgba(255, 253, 246, 0.6);
}
.empty--mini { padding: 26rpx 20rpx; }
.empty__symbol { font-size: 30rpx; color: #c8bda9; }
.empty__title { font-size: 22rpx; color: #8b837c; }
.empty__sub { font-size: 19rpx; color: #a39884; }

.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12rpx; margin-bottom: 12rpx; }
.toolbar__count { font-size: 19rpx; color: #9c9384; }
.rarity { display: flex; gap: 8rpx; }
.rarity__item {
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: inset 0 0 0 1rpx rgba(200, 188, 170, 0.7);
}
.rarity__item--active { background: #4e4c55; box-shadow: none; }
.rarity__text { font-size: 18rpx; color: #6c675c; }
.rarity__item--active .rarity__text { color: #f7f3ea; }

.log { border-radius: 18rpx; overflow: hidden; background: rgba(255, 255, 255, 0.72); }
.log__row { display: flex; align-items: center; gap: 14rpx; padding: 12rpx 16rpx; border-bottom: 1rpx solid rgba(226, 214, 192, 0.6); }
.log__row:last-child { border-bottom: 0; }
.log__thumb { width: 56rpx; height: 68rpx; border-radius: 8rpx; background: #efe7da; flex: none; }
.log__thumb--fallback { display: flex; align-items: center; justify-content: center; font-size: 24rpx; color: #ad9e87; }
.log__main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4rpx; }
.log__name-row { display: flex; align-items: center; gap: 8rpx; }
.log__name { font-size: 23rpx; color: #3f3a44; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.log__up { font-size: 15rpx; color: #fff6ef; background: rgba(157, 47, 63, 0.86); padding: 1rpx 8rpx; border-radius: 999rpx; }
.log__luck { font-size: 15rpx; color: #5d4318; background: linear-gradient(135deg, #f9e79a, #e9c65a); padding: 1rpx 8rpx; border-radius: 999rpx; }
.log__meta { font-size: 18rpx; color: #a39884; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.log__right { flex: none; display: flex; flex-direction: column; align-items: flex-end; gap: 4rpx; }
.log__rarity { font-size: 22rpx; color: #8b837c; font-weight: 600; }
.log__rarity--r5 { color: #a47727; }
.log__rarity--r4 { color: #7c5aa6; }
.log__time { font-size: 17rpx; color: #a99a8b; }

.pager { display: flex; align-items: center; justify-content: center; gap: 20rpx; margin-top: 16rpx; }
.pager__btn {
  padding: 10rpx 24rpx;
  border-radius: 999rpx;
  font-size: 21rpx;
  color: #6c675c;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: inset 0 0 0 1rpx rgba(200, 188, 170, 0.8);
}
.pager__btn--off { opacity: 0.4; }
.pager__label { font-size: 21rpx; color: #8b837c; }

.foot { margin: 26rpx 32rpx 0; font-size: 18rpx; line-height: 1.7; color: #a39884; }
.foot-pad { height: calc(60rpx + env(safe-area-inset-bottom)); }

.modal { position: fixed; inset: 0; z-index: 120; display: flex; align-items: center; justify-content: center; }
.modal__mask { position: absolute; inset: 0; background: rgba(30, 26, 40, 0.45); }
.modal__box {
  position: relative;
  width: 580rpx;
  padding: 32rpx 28rpx 24rpx;
  border-radius: 24rpx;
  background: #fffdf8;
  box-shadow: 0 20rpx 50rpx rgba(40, 34, 30, 0.28);
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.modal__title { font-size: 30rpx; font-weight: 600; color: #3f3a44; letter-spacing: 2rpx; }
.modal__desc { font-size: 21rpx; line-height: 1.8; color: #6c675c; }
.modal__callout { font-size: 20rpx; line-height: 1.8; color: #8a5a34; padding: 12rpx 14rpx; border-radius: 12rpx; background: rgba(255, 243, 235, 0.9); }
/* 重置不改每日次数：这条要显眼，避免用户以为重置能「刷新次数」 */
.modal__quota {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  padding: 14rpx 16rpx;
  border-radius: 12rpx;
  background: rgba(238, 245, 240, 0.95);
  box-shadow: inset 0 0 0 1rpx rgba(100, 140, 129, 0.24);
}
.modal__quota-num { font-size: 23rpx; font-weight: 600; letter-spacing: 1rpx; color: #3f6b5f; }
.modal__quota-text { font-size: 19rpx; line-height: 1.7; color: #5f7a70; }
.modal__actions { display: flex; gap: 10rpx; margin-top: 8rpx; }
.modal__btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 76rpx;
  border-radius: 14rpx;
  font-size: 21rpx;
  color: #5c5560;
  background: #f3ede3;
}
.modal__btn--warn { background: #fdf6e2; color: #7d6122; }
.modal__btn--danger { background: #fbe9e6; color: #9d2f3f; }
.btn--hover { transform: scale(0.98); }

.mark {
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(8rpx + env(safe-area-inset-bottom));
  text-align: center;
  font-size: 18rpx;
  letter-spacing: 1rpx;
  /* 与结果层统一：小字按 WCAG AA ≥4.5:1，原 0.72 透明仅约 2.9:1 */
  color: #655b50;
}

/* 横屏小程序布局：摘要、卡面和逐抽记录使用更宽的多列空间。 */
@media screen and (orientation: landscape) {
  .bar { padding: 12rpx 28rpx 10rpx; }
  .bar__back { width: 48rpx; height: 48rpx; font-size: 28rpx; }
  .bar__zh { font-size: 28rpx; }
  .bar__en { font-size: 13rpx; }
  .bar__reset { padding: 7rpx 14rpx; font-size: 17rpx; }
  .filters__row { padding: 0 28rpx 4rpx; gap: 8rpx; }
  .filter { padding: 8rpx 14rpx; }
  .filter__text { font-size: 17rpx; }
  .summary { margin: 12rpx 28rpx 0; padding: 12rpx 8rpx; border-radius: 14rpx; }
  .summary__num { font-size: 26rpx; }
  .summary__label { font-size: 14rpx; }
  .summary__sep { height: 32rpx; }
  .summary__mat { width: 21rpx; height: 21rpx; }
  .summary__mat-num { font-size: 17rpx; }
  .note { margin: 8rpx 28rpx 0; font-size: 15rpx; }
  .section { margin: 16rpx 28rpx 0; }
  .section__head { margin-bottom: 8rpx; }
  .section__title { font-size: 22rpx; }
  .section__sub { font-size: 15rpx; }
  .grid { gap: 10rpx; }
  .grid--five .card { width: calc((100% - 40rpx) / 5); }
  .grid--four .card { width: calc((100% - 30rpx) / 4); }
  .grid--five .card__frame { height: 190rpx; }
  .grid--four .card__frame { height: 150rpx; }
  .card__frame { height: 170rpx; }
  .card__name { font-size: 17rpx; }
  .card__meta { font-size: 14rpx; }
  .toolbar { margin-bottom: 8rpx; }
  .toolbar__count { font-size: 15rpx; }
  .rarity { gap: 5rpx; }
  .rarity__item { padding: 4rpx 9rpx; }
  .rarity__text { font-size: 14rpx; }
  .log { display: flex; flex-wrap: wrap; }
  .log__row { box-sizing: border-box; width: 50%; padding: 8rpx 12rpx; gap: 10rpx; }
  .log__thumb { width: 42rpx; height: 52rpx; }
  .log__name { font-size: 18rpx; }
  .log__meta, .log__time { font-size: 14rpx; }
  .log__rarity { font-size: 18rpx; }
  .pager { margin-top: 10rpx; }
  .pager__btn, .pager__label { font-size: 16rpx; }
  .foot { margin: 14rpx 28rpx 0; font-size: 14rpx; }
  .modal__box { width: 520rpx; }
}
</style>
