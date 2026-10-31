<template>
  <tool-shell
    title="星结模拟"
    sub="用你自定的单抽概率做本地随机模拟，观察抽数内命中次数与最长未命中；结果不代表官方掉率。"
    :tags="['自定概率', '本地运算', '非官方']"
    hero="linear-gradient(135deg, #1f3d9e 0%, #7f5bff 55%, #4fd2e8 100%)"
    note="官方卡池概率未公开，本页概率由你手动输入，仅用于理解随机分布，不构成任何抽卡建议或结果预测。"
  >
    <view class="tool-panel">
      <view class="tool-panel__head">
        <text class="tool-panel__title">模拟参数</text>
        <text class="tool-panel__hint">自定概率</text>
      </view>

      <view class="tool-field">
        <view class="tool-field__label">
          <text>单抽命中概率</text>
          <view class="tool-stepper">
            <view class="tool-stepper__btn" hover-class="tool-stepper__btn--hover" hover-stay-time="90" @tap="stepRate(-0.1)">−</view>
            <text class="tool-stepper__num">{{ rateText }}</text>
            <view class="tool-stepper__btn" hover-class="tool-stepper__btn--hover" hover-stay-time="90" @tap="stepRate(0.1)">＋</view>
          </view>
        </view>
        <view class="tool-picker">
          <view
            v-for="preset in simulatorPresets.rates"
            :key="preset"
            class="tool-picker__item"
            :class="{ 'tool-picker__item--active': Math.abs(rate - preset) < 0.0001 }"
            hover-class="tool-picker__item--hover"
            hover-stay-time="90"
            @tap="setRate(preset)"
          >{{ preset.toFixed(1) }}%（示例）</view>
        </view>
      </view>

      <view class="tool-field">
        <view class="tool-field__label">
          <text>模拟抽数</text>
          <view class="tool-stepper">
            <view class="tool-stepper__btn" hover-class="tool-stepper__btn--hover" hover-stay-time="90" @tap="stepPulls(-10)">−</view>
            <text class="tool-stepper__num">{{ pulls }} 抽</text>
            <view class="tool-stepper__btn" hover-class="tool-stepper__btn--hover" hover-stay-time="90" @tap="stepPulls(10)">＋</view>
          </view>
        </view>
        <view class="tool-picker">
          <view
            v-for="preset in simulatorPresets.pulls"
            :key="preset"
            class="tool-picker__item"
            :class="{ 'tool-picker__item--active': pulls === preset }"
            hover-class="tool-picker__item--hover"
            hover-stay-time="90"
            @tap="setPulls(preset)"
          >{{ preset }} 抽</view>
        </view>
      </view>

      <view class="tool-bar">
        <view class="ct-btn" hover-class="ct-btn--hover" @tap="run">开始模拟</view>
        <view class="ct-btn ct-btn--ghost" hover-class="ct-btn--hover" @tap="clearHistory">清空记录</view>
      </view>
    </view>

    <view class="tool-panel">
      <view class="tool-panel__head">
        <text class="tool-panel__title">模拟结果</text>
        <text class="tool-panel__hint">{{ history.length ? '最近 ' + history.length + ' 次' : '等待运行' }}</text>
      </view>

      <template v-if="results">
        <view class="tool-result">
          <text class="tool-result__label">本次命中</text>
          <text class="tool-result__hero">{{ results.hits }} 次</text>
          <text class="tool-result__text">在 {{ results.pulls }} 抽、单抽 {{ results.rate.toFixed(1) }}% 的设定下随机模拟；理论期望约 {{ results.expected }} 次。</text>
        </view>

        <view class="tool-result__row">
          <text class="tool-result__key">至少命中一次</text>
          <text class="tool-result__value">{{ results.atLeastOnce ? '是' : '否' }}</text>
        </view>
        <view class="tool-result__row">
          <text class="tool-result__key">首次命中抽数</text>
          <text class="tool-result__value">{{ results.firstHit ? '第 ' + results.firstHit + ' 抽' : '本次未命中' }}</text>
        </view>
        <view class="tool-result__row">
          <text class="tool-result__key">最长连续未命中</text>
          <text class="tool-result__value">{{ results.maxMiss }} 抽</text>
        </view>
        <view class="tool-result__row">
          <text class="tool-result__key">官方掉率 / 保底</text>
          <text class="tool-result__value tool-result__value--pending">公测后开放</text>
        </view>
      </template>

      <view v-else class="tool-empty">
        <view class="tool-empty__icon">✦</view>
        <view class="tool-empty__title">还没有模拟结果</view>
        <view class="tool-empty__text">设置自定概率与抽数后点「开始模拟」；每次结果为本地随机，刷新后保留最近一次。</view>
        <view class="ct-actions">
          <view class="ct-btn" hover-class="ct-btn--hover" @tap="run">开始模拟</view>
        </view>
      </view>

      <view v-if="history.length > 1" class="sim-history">
        <view class="tool-panel__head">
          <text class="tool-panel__title">历史记录</text>
          <text class="tool-panel__hint">最多 3 条</text>
        </view>
        <view v-for="(item, index) in history" :key="index" class="tool-result__row">
          <text class="tool-result__key">{{ item.pulls }} 抽 · {{ item.rate.toFixed(1) }}%</text>
          <text class="tool-result__value">{{ item.hits }} 次命中</text>
        </view>
      </view>
    </view>
  </tool-shell>
</template>

<script setup>
import { computed, ref } from 'vue';
import { onShareAppMessage } from '@dcloudio/uni-app';
import { simulatorPresets } from '@/data/tools.js';

const STORAGE_KEY = 'qbxzs:simulator';
const MIN_RATE = 0.1;
const MAX_RATE = 100;
const MIN_PULLS = 10;
const MAX_PULLS = 300;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function readState() {
  const stored = uni.getStorageSync(STORAGE_KEY) || {};
  const rate = Number(stored.rate);
  const pulls = Number(stored.pulls);
  return {
    rate: Number.isFinite(rate) ? clamp(rate, MIN_RATE, MAX_RATE) : 0.6,
    pulls: Number.isFinite(pulls) ? clamp(Math.round(pulls), MIN_PULLS, MAX_PULLS) : 10,
    history: Array.isArray(stored.history) ? stored.history.slice(0, 3) : []
  };
}

const state = ref(readState());
const rate = computed(() => state.value.rate);
const pulls = computed(() => state.value.pulls);
const history = computed(() => state.value.history);
const results = computed(() => (history.value.length ? history.value[0] : null));
const rateText = computed(() => rate.value.toFixed(1) + '%');

function save(next) {
  state.value = next;
  uni.setStorageSync(STORAGE_KEY, next);
}

function stepRate(delta) {
  const next = Number(clamp(rate.value + delta, MIN_RATE, MAX_RATE).toFixed(1));
  save(Object.assign({}, state.value, { rate: next }));
}

function setRate(value) {
  save(Object.assign({}, state.value, { rate: value }));
}

function stepPulls(delta) {
  save(Object.assign({}, state.value, { pulls: clamp(pulls.value + delta, MIN_PULLS, MAX_PULLS) }));
}

function setPulls(value) {
  save(Object.assign({}, state.value, { pulls: value }));
}

function run() {
  const probability = rate.value / 100;
  let hits = 0;
  let miss = 0;
  let maxMiss = 0;
  let firstHit = 0;
  for (let index = 1; index <= pulls.value; index += 1) {
    if (Math.random() < probability) {
      hits += 1;
      if (!firstHit) firstHit = index;
      miss = 0;
    } else {
      miss += 1;
      maxMiss = Math.max(maxMiss, miss);
    }
  }
  const result = {
    hits,
    maxMiss,
    firstHit,
    atLeastOnce: hits > 0,
    pulls: pulls.value,
    rate: rate.value,
    expected: (pulls.value * probability).toFixed(2)
  };
  save(Object.assign({}, state.value, { history: [result].concat(history.value).slice(0, 3) }));
  uni.showToast({ title: `本次命中 ${hits} 次`, icon: 'none' });
}

function clearHistory() {
  save(Object.assign({}, state.value, { history: [] }));
  uni.showToast({ title: '已清空记录', icon: 'none' });
}

onShareAppMessage(() => ({ title: '星结模拟 · 蓝色星原助手', path: '/pages/simulator/simulator' }));
</script>

<style>
.sim-history {
  margin-top: 20rpx;
  padding-top: 12rpx;
  border-top: 1rpx solid var(--line);
}
</style>
