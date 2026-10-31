<template>
  <tool-shell
    title="保底计算"
    sub="输入当前垫抽数与目标抽数，只做「还差多少抽」的减法估算；官方保底规则尚未公开。"
    :tags="['本地记录', '只做减法', '规则待核实']"
    hero="linear-gradient(135deg, #1f3d9e 0%, #2f6bff 55%, #ff5b7f 100%)"
    note="官方卡池概率、保底继承与软保底规则均未公开；本页只计算抽数差，不预测出货概率，不代表游戏内实际结果。"
  >
    <view class="tool-panel">
      <view class="tool-panel__head">
        <text class="tool-panel__title">抽数输入</text>
        <text class="tool-panel__hint">点 ± 调整</text>
      </view>

      <view class="tool-field">
        <view class="tool-field__label">
          <text>当前已垫抽数</text>
          <view class="tool-stepper" :class="{ 'tool-stepper--disabled': current <= 0 }">
            <view class="tool-stepper__btn" hover-class="tool-stepper__btn--hover" hover-stay-time="90" @tap="step('current', -1)">−</view>
            <text class="tool-stepper__num">{{ current }}</text>
            <view class="tool-stepper__btn" hover-class="tool-stepper__btn--hover" hover-stay-time="90" @tap="step('current', 1)">＋</view>
          </view>
        </view>
      </view>

      <view class="tool-field">
        <view class="tool-field__label">
          <text>目标抽数（示例）</text>
          <view class="tool-stepper">
            <view class="tool-stepper__btn" hover-class="tool-stepper__btn--hover" hover-stay-time="90" @tap="step('target', -10)">−</view>
            <text class="tool-stepper__num">{{ target }}</text>
            <view class="tool-stepper__btn" hover-class="tool-stepper__btn--hover" hover-stay-time="90" @tap="step('target', 10)">＋</view>
          </view>
        </view>
      </view>

      <view class="tool-bar">
        <view class="ct-btn ct-btn--ghost" hover-class="ct-btn--hover" @tap="reset">重置为示例值</view>
        <view class="ct-btn ct-btn--ghost" hover-class="ct-btn--hover" @tap="saveAsTarget">把当前值设为目标</view>
      </view>
    </view>

    <view class="tool-panel">
      <view class="tool-panel__head">
        <text class="tool-panel__title">计算结果</text>
        <text class="tool-panel__hint">本地保存</text>
      </view>

      <view v-if="remaining > 0" class="tool-result">
        <text class="tool-result__label">距离目标还需</text>
        <text class="tool-result__hero">{{ remaining }} 抽</text>
        <text class="tool-result__text">按「目标 {{ target }} − 当前 {{ current }}」估算，未计入任何官方保底机制。</text>
        <view class="tool-progress">
          <view class="tool-progress__bar" :style="{ width: percent + '%' }" />
        </view>
        <text class="tool-result__label">当前进度 {{ percent }}%</text>
      </view>

      <view v-else class="tool-empty">
        <view class="tool-empty__icon">✓</view>
        <view class="tool-empty__title">已达到目标抽数</view>
        <view class="tool-empty__text">当前垫抽 {{ current }}，目标 {{ target }}；可以调高目标，或重置后重新估算。</view>
        <view class="ct-actions">
          <view class="ct-btn" hover-class="ct-btn--hover" @tap="reset">重置为示例值</view>
        </view>
      </view>

      <view class="tool-result__row">
        <text class="tool-result__key">当前垫抽</text>
        <text class="tool-result__value">{{ current }} 抽</text>
      </view>
      <view class="tool-result__row">
        <text class="tool-result__key">目标抽数（示例）</text>
        <text class="tool-result__value">{{ target }} 抽</text>
      </view>
      <view class="tool-result__row">
        <text class="tool-result__key">单抽概率 / 软保底</text>
        <text class="tool-result__value tool-result__value--pending">公测后开放</text>
      </view>
      <view class="tool-result__row">
        <text class="tool-result__key">保底是否继承</text>
        <text class="tool-result__value tool-result__value--pending">待核实</text>
      </view>
    </view>
  </tool-shell>
</template>

<script setup>
import { computed, ref } from 'vue';
import { onShareAppMessage } from '@dcloudio/uni-app';
import { pityDefaults } from '@/data/tools.js';

const STORAGE_KEY = 'qbxzs:pity';
const MIN_TARGET = 10;
const MAX_TARGET = 300;
const MAX_CURRENT = 300;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function readState() {
  const stored = uni.getStorageSync(STORAGE_KEY) || {};
  const current = Number(stored.current);
  const target = Number(stored.target);
  return {
    current: Number.isFinite(current) ? clamp(current, 0, MAX_CURRENT) : pityDefaults.current,
    target: Number.isFinite(target) ? clamp(target, MIN_TARGET, MAX_TARGET) : pityDefaults.target
  };
}

const state = ref(readState());
const current = computed(() => state.value.current);
const target = computed(() => state.value.target);
const remaining = computed(() => Math.max(target.value - current.value, 0));
const percent = computed(() => (target.value ? clamp(Math.round((current.value / target.value) * 100), 0, 100) : 0));

function save(next) {
  state.value = next;
  uni.setStorageSync(STORAGE_KEY, next);
}

function step(field, delta) {
  const next = Object.assign({}, state.value);
  if (field === 'current') next.current = clamp(next.current + delta, 0, MAX_CURRENT);
  else next.target = clamp(next.target + delta, MIN_TARGET, MAX_TARGET);
  if (field === 'target' && next.target < next.current) next.current = next.target;
  save(next);
}

function reset() {
  save({ current: pityDefaults.current, target: pityDefaults.target });
  uni.showToast({ title: '已重置', icon: 'none' });
}

function saveAsTarget() {
  const nextTarget = clamp(Math.max(current.value, MIN_TARGET), MIN_TARGET, MAX_TARGET);
  save({ current: current.value, target: nextTarget });
  uni.showToast({ title: '目标已更新', icon: 'none' });
}

onShareAppMessage(() => ({ title: '保底计算 · 蓝色星原助手', path: '/pages/pity/pity' }));
</script>
