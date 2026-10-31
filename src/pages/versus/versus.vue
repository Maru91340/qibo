<template>
  <view class="page" :class="{ 'theme-dark': isDark }">
    <view class="page-hero versus-hero">
      <view class="page-hero__inner">
        <text class="page-hero__eyebrow">内容与运营</text>
        <view class="page-hero__title">奇波对决</view>
        <view class="page-hero__sub">规则细节尚未公开，先把编队、克制与复盘流程准备好。</view>
        <view class="page-hero__meta">
          <text class="page-hero__tag">准备清单</text>
          <text class="page-hero__tag">阵容速记</text>
          <text class="page-hero__tag">公测后补规则</text>
        </view>
      </view>
    </view>

    <view class="notice card">
      <text class="ct-tag ct-tag--warn">待核实</text>
      <text class="notice__text">本页不提供胜负条件、数值与段位结论；规则以公测后官方说明为准。</text>
    </view>

    <view class="section-title">
      <text>对决前 3 步</text>
      <text class="section-title__more">{{ versusChecklist.length }} 组检查</text>
    </view>

    <view v-for="(group, index) in versusChecklist" :key="group.title" class="panel card">
      <view class="panel__title">
        <text>{{ group.title }}</text>
        <text class="check-index">{{ pad(index + 1) }}</text>
      </view>
      <view v-for="(step, stepIndex) in group.steps" :key="step" class="ct-step">
        <text class="ct-step__num">{{ stepIndex + 1 }}</text>
        <text class="ct-step__text">{{ step }}</text>
      </view>
    </view>

    <view class="section-title">
      <text>阵容速记</text>
      <text class="section-title__more">示例组合</text>
    </view>

    <view class="lineup-grid">
      <view
        v-for="lineup in versusLineups"
        :key="lineup.id"
        class="lineup-card card"
        hover-class="lineup-card--hover"
        hover-stay-time="90"
        @tap="goTeam"
      >
        <view class="lineup-card__badge" :style="{ background: tint(lineup.accent), color: lineup.accent }">
          {{ lineup.element }}
        </view>
        <view class="lineup-card__title">{{ lineup.title }}</view>
        <view class="lineup-card__desc">{{ lineup.desc }}</view>
        <view class="chip-row">
          <text v-for="tag in lineup.tags" :key="tag" class="chip chip--ghost">{{ tag }}</text>
        </view>
        <text class="lineup-card__hint">去队伍编成试排 ›</text>
      </view>
    </view>

    <view class="section-title">
      <text>规则资料</text>
      <text class="section-title__more">公开信息整理</text>
    </view>

    <view class="ct-accordion card">
      <view class="ct-accordion__head" hover-class="facet-chip--hover" @tap="toggleFaq('rules')">
        <text class="ct-accordion__title">对决规则什么时候补？</text>
        <text class="ct-accordion__arrow" :class="{ 'ct-accordion__arrow--open': openFaq === 'rules' }">›</text>
      </view>
      <view v-if="openFaq === 'rules'" class="ct-accordion__body">
        <text class="faq-text">目前只有「奇波对决」这一玩法名称与入口信息，官方未公开完整规则。公测后按实际规则重写本页，并补充阵容与数值核对。</text>
      </view>
      <view class="ct-accordion__head" hover-class="facet-chip--hover" @tap="toggleFaq('prep')">
        <text class="ct-accordion__title">现在能做什么准备？</text>
        <text class="ct-accordion__arrow" :class="{ 'ct-accordion__arrow--open': openFaq === 'prep' }">›</text>
      </view>
      <view v-if="openFaq === 'prep'" class="ct-accordion__body">
        <text class="faq-text">先按元素覆盖选 3 只主力，确认进化阶段与技能，再到队伍编成保存阵容；元素克制页和战斗词条页可以先熟悉。</text>
        <view class="ct-actions">
          <view class="ct-btn" hover-class="ct-btn--hover" @tap.stop="goPage('/pages/team/team')">队伍编成</view>
          <view class="ct-btn ct-btn--ghost" hover-class="ct-btn--hover" @tap.stop="goPage('/pages/element/element')">元素克制</view>
        </view>
      </view>
    </view>

    <view class="ct-source">对决规则、胜负条件与奖励均为待公开信息；示例阵容仅用于演示交互，不构成强度结论。</view>
  </view>
</template>

<script setup>
import { useTheme } from '@/utils/theme.js';

const { isDark } = useTheme();
import { ref } from 'vue';
import { onShareAppMessage } from '@dcloudio/uni-app';
import { versusChecklist, versusLineups } from '@/data/content.js';
import { tint } from '@/utils/format.js';

const openFaq = ref('rules');

function pad(value) {
  return value < 10 ? `0${value}` : String(value);
}

function toggleFaq(key) {
  openFaq.value = openFaq.value === key ? '' : key;
}

function goTeam() {
  uni.navigateTo({ url: '/pages/team/team' });
}

function goPage(path) {
  uni.navigateTo({ url: path });
}

onShareAppMessage(() => ({ title: '奇波对决 · 蓝色星原助手', path: '/pages/versus/versus' }));
</script>

<style>
.versus-hero {
  background: linear-gradient(135deg, #4a2a10 0%, #b96a00 55%, #e8a75c 100%);
}

.notice {
  display: flex;
  align-items: flex-start;
  gap: 14rpx;
  margin-bottom: 24rpx;
  padding: 22rpx 24rpx;
}

.notice__text {
  flex: 1;
  color: var(--ink-2);
  font-size: 23rpx;
  line-height: 1.65;
}

.check-index {
  color: var(--ink-3);
  font-size: 22rpx;
  font-weight: 400;
}

.lineup-grid {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.lineup-card {
  padding: 26rpx;
  transition: transform 0.16s ease;
}

.lineup-card--hover {
  transform: scale(0.985);
}

.lineup-card__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
  border-radius: 20rpx;
  font-size: 30rpx;
  font-weight: 700;
}

.lineup-card__title {
  margin-top: 16rpx;
  color: var(--ink);
  font-size: 29rpx;
  font-weight: 600;
}

.lineup-card__desc {
  margin: 8rpx 0 14rpx;
  color: var(--ink-2);
  font-size: 24rpx;
  line-height: 1.6;
}

.lineup-card__hint {
  display: block;
  margin-top: 14rpx;
  color: var(--brand);
  font-size: 22rpx;
  font-weight: 600;
}

.faq-text {
  display: block;
  color: var(--ink-2);
  font-size: 24rpx;
  line-height: 1.7;
}
</style>
