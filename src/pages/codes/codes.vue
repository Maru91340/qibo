<template>
  <view class="page" :class="{ 'theme-dark': isDark }">
    <view class="page-hero codes-hero">
      <view class="page-hero__inner">
        <text class="page-hero__eyebrow">内容与运营</text>
        <view class="page-hero__title">福利码</view>
        <view class="page-hero__sub">只收录官方发布且能核实的兑换码；公测前的「内部码」一律不收。</view>
        <view class="page-hero__meta">
          <text class="page-hero__tag">已核实 {{ codeEntries.length }} 条</text>
          <text class="page-hero__tag">公测 11 月 26 日</text>
          <text class="page-hero__tag">订阅开码提醒</text>
        </view>
      </view>
    </view>

    <view v-if="codeEntries.length" class="entry-list">
      <view v-for="code in codeEntries" :key="code.code" class="panel card">
        <view class="panel__title">
          <text class="code-value">{{ code.code }}</text>
          <text class="ct-tag ct-tag--ok">{{ code.status }}</text>
        </view>
        <view class="panel__desc panel__desc--first">{{ code.reward }}</view>
        <view class="ct-actions">
          <view class="ct-btn" hover-class="ct-btn--hover" @tap="copyCode(code.code)">复制兑换码</view>
        </view>
      </view>
    </view>

    <view v-else class="ct-empty card">
      <view class="ct-empty__icon">⌘</view>
      <view class="ct-empty__title">暂无可核实的兑换码</view>
      <view class="ct-empty__text">公测开启后，官方发布的第一批福利码会在这里更新；订阅提醒可以第一时间收到。</view>
      <view class="ct-actions">
        <view class="ct-btn" hover-class="ct-btn--hover" @tap="goSubscribe">订阅开码提醒</view>
        <view class="ct-btn ct-btn--ghost" hover-class="ct-btn--hover" @tap="copyGuide">复制兑换步骤</view>
      </view>
    </view>

    <view class="panel card">
      <view class="panel__title">兑换步骤</view>
      <view class="ct-step">
        <text class="ct-step__num">1</text>
        <text class="ct-step__text">进入游戏，在主界面或设置里找到「兑换码 / 礼包码」入口。</text>
      </view>
      <view class="ct-step">
        <text class="ct-step__num">2</text>
        <text class="ct-step__text">输入或粘贴兑换码，注意大小写与前后空格。</text>
      </view>
      <view class="ct-step">
        <text class="ct-step__num">3</text>
        <text class="ct-step__text">奖励通常发送到游戏内邮件，以实际提示为准。</text>
      </view>
    </view>

    <view class="section-title">
      <text>常见问题</text>
      <text class="section-title__more">防骗提示</text>
    </view>

    <view class="ct-accordion card">
      <view v-for="faq in codeFaq" :key="faq.q" class="code-faq">
        <view class="ct-accordion__head" hover-class="facet-chip--hover" @tap="toggleFaq(faq.q)">
          <text class="ct-accordion__title">{{ faq.q }}</text>
          <text class="ct-accordion__arrow" :class="{ 'ct-accordion__arrow--open': openFaq === faq.q }">›</text>
        </view>
        <view v-if="openFaq === faq.q" class="ct-accordion__body">
          <text class="faq-text">{{ faq.a }}</text>
        </view>
      </view>
    </view>

    <view class="ct-source">不要向任何第三方提供账号、验证码或支付信息；本页不收录需要付费或拉新的「福利码」。</view>
  </view>
</template>

<script setup>
import { useTheme } from '@/utils/theme.js';

const { isDark } = useTheme();
import { ref } from 'vue';
import { onShareAppMessage } from '@dcloudio/uni-app';
import { codeEntries, codeFaq } from '@/data/content.js';

const openFaq = ref(codeFaq[0].q);

function toggleFaq(key) {
  openFaq.value = openFaq.value === key ? '' : key;
}

function copyCode(code) {
  uni.setClipboardData({ data: code });
}

function copyGuide() {
  uni.setClipboardData({
    data: '兑换步骤：游戏内找到兑换码入口 → 输入兑换码（注意大小写与空格）→ 奖励发送到游戏内邮件。入口位置以游戏内实际提示为准。'
  });
}

function goSubscribe() {
  uni.navigateTo({ url: '/pages/subscribe/subscribe' });
}

onShareAppMessage(() => ({ title: '福利码 · 蓝色星原助手', path: '/pages/codes/codes' }));
</script>

<style>
.codes-hero {
  background: linear-gradient(135deg, #4a2a10 0%, #b96a00 55%, #f2b50c 100%);
}

.code-value {
  color: var(--ink);
  font-size: 32rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
}

.code-faq {
  border-bottom: 1rpx solid var(--line);
}

.code-faq:last-child {
  border-bottom: none;
}

.faq-text {
  display: block;
  color: var(--ink-2);
  font-size: 24rpx;
  line-height: 1.7;
}
</style>
