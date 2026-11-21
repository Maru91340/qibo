<template>
  <tool-shell
    title="充值返利"
    sub="记录计划累计充值的金额，对照示例档位查看自己处于哪一档；返利比例与发放规则公测后开放。"
    :tags="['示例档位', '本地记录', '规则待核实']"
    hero="linear-gradient(135deg, #4a2a10 0%, #b96a00 55%, #f2b50c 100%)"
    note="档位金额为交互示例，返利比例、发放形式与上限均未公开；本页不提供任何充值建议，也不会发起支付。"
  >
    <view class="tool-panel">
      <view class="tool-panel__head">
        <text class="tool-panel__title">累计充值金额</text>
        <text class="tool-panel__hint">仅本地记录</text>
      </view>

      <view class="tool-field">
        <view class="tool-field__label">
          <text>输入金额（元）</text>
          <view class="tool-stepper" :class="{ 'tool-stepper--disabled': amount <= 0 }">
            <view class="tool-stepper__btn" hover-class="tool-stepper__btn--hover" hover-stay-time="90" @tap="stepAmount(-6)">−</view>
            <text class="tool-stepper__num">{{ amountLabel }}</text>
            <view class="tool-stepper__btn" hover-class="tool-stepper__btn--hover" hover-stay-time="90" @tap="stepAmount(6)">＋</view>
          </view>
        </view>
        <view class="tool-bar">
          <input
            class="tool-input"
            type="number"
            :value="amountInput"
            placeholder="直接输入金额"
            placeholder-class="ct-search__ph"
            @input="onAmountInput"
          />
        </view>
      </view>

      <view class="tool-picker">
        <view
          v-for="quick in rebateQuickAmounts"
          :key="quick"
          class="tool-picker__item"
          :class="{ 'tool-picker__item--active': amount === quick }"
          hover-class="tool-picker__item--hover"
          hover-stay-time="90"
          @tap="setAmount(quick)"
        >¥{{ quick }}</view>
      </view>

      <view class="tool-bar">
        <view class="ct-btn ct-btn--ghost" hover-class="ct-btn--hover" @tap="reset">清零</view>
      </view>
    </view>

    <view class="tool-panel">
      <view class="tool-panel__head">
        <text class="tool-panel__title">星虹返利估算</text>
        <text class="tool-panel__hint">2000 内 200% · 更高 150%</text>
      </view>

      <view class="tool-ladder">
        <view
          v-for="tier in rebateTiers"
          :key="tier.amount"
          class="tool-ladder__row"
          :class="{ 'tool-ladder__row--on': amount >= tier.amount }"
        >
          <text>¥{{ tier.amount }} · {{ tier.reward }}</text>
          <text>{{ amount >= tier.amount ? '已达' : '未达' }}</text>
        </view>
      </view>
    </view>

    <view class="tool-panel">
      <view class="tool-panel__head">
        <text class="tool-panel__title">计算结果</text>
        <text class="tool-panel__hint">不发起支付</text>
      </view>

      <view v-if="amount > 0" class="tool-result">
        <text class="tool-result__label">累计充值（本地输入）</text>
        <text class="tool-result__hero">¥{{ amount }}</text>
        <text class="tool-result__text">{{ tierText }}</text>
        <view class="tool-result__row">
          <text class="tool-result__key">预估返利星虹</text>
          <text class="tool-result__value">{{ rebateEstimate }} 星虹</text>
        </view>
      </view>

      <view v-else class="tool-empty">
        <view class="tool-empty__icon">￥</view>
        <view class="tool-empty__title">还没有输入充值金额</view>
        <view class="tool-empty__text">输入计划金额或点选示例档位，先看看自己处于哪一档；本页不会发起任何支付。</view>
      </view>

      <view class="tool-result__row">
        <text class="tool-result__key">已达示例档位</text>
        <text class="tool-result__value">{{ highestTier ? '¥' + highestTier : '暂无' }}</text>
      </view>
      <view class="tool-result__row">
        <text class="tool-result__key">返利发放</text>
        <text class="tool-result__value">星虹邮件 · 365 天有效</text>
      </view>
      <view class="tool-result__row">
        <text class="tool-result__key">发放形式 / 上限</text>
        <text class="tool-result__value tool-result__value--pending">待核实</text>
      </view>
    </view>
    <view class="tool-panel">
      <view class="tool-panel__head">
        <text class="tool-panel__title">返还规则要点</text>
      </view>
      <view class="rebate-rules">
        <text v-for="(rule, idx) in rebateRules" :key="idx" class="rebate-rules__item">· {{ rule }}</text>
        <text class="rebate-rules__note">规则以官方『旅途测试充值返还规则说明』为准；本工具仅做预演，不构成任何承诺。</text>
      </view>
    </view>
  </tool-shell>
</template>

<script setup>
import { computed, ref } from 'vue';
import { onShareAppMessage } from '@dcloudio/uni-app';
import { rebateQuickAmounts, rebateRules, calcRebate } from '@/data/tools.js';

const STORAGE_KEY = 'qbxzs:rebate';
const MAX_AMOUNT = 99999;

function clamp(value) {
  return Math.min(MAX_AMOUNT, Math.max(0, Math.round(value)));
}

function readAmount() {
  const stored = Number(uni.getStorageSync(STORAGE_KEY));
  return Number.isFinite(stored) ? clamp(stored) : 0;
}

const amount = ref(readAmount());
const amountLabel = computed(() => `¥${amount.value}`);
const amountInput = computed(() => (amount.value ? String(amount.value) : ''));
const rebateEstimate = computed(() => calcRebate(amount.value));
const tierText = computed(() => {
  if (!amount.value) return '输入金额或点选快捷档位，查看星虹返利估算。';
  return amount.value <= 2000
    ? '2,000 元以内按 200% 返星虹。'
    : '2,000 元以内按 200%，超出部分按 150% 估算（125% 档位分界待核实）。';
});

function save(value) {
  amount.value = value;
  uni.setStorageSync(STORAGE_KEY, value);
}

function stepAmount(delta) {
  save(clamp(amount.value + delta));
}

function setAmount(value) {
  save(clamp(value));
}

function onAmountInput(event) {
  const value = Number((event.detail && event.detail.value) || 0);
  save(Number.isFinite(value) ? clamp(value) : 0);
}

function reset() {
  save(0);
  uni.showToast({ title: '已清零', icon: 'none' });
}

onShareAppMessage(() => ({ title: '充值返利 · 奇波小助手', path: '/pages/rebate/rebate' }));
</script>
