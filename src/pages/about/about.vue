<template>
  <view class="page" :class="{ 'theme-dark': isDark }">
    <view class="page-hero about-hero">
      <view class="page-hero__inner">
        <text class="page-hero__eyebrow">非官方玩家工具</text>
        <view class="page-hero__title">{{ gameName }}</view>
        <view class="page-hero__sub">图鉴与查询助手 · 让信息更好查，也让数据边界更清楚。</view>
        <view class="page-hero__meta">
          <text class="page-hero__tag">v{{ version }}</text>
          <text class="page-hero__tag">公开资料整理</text>
          <text class="page-hero__tag">公测 11 月 26 日</text>
        </view>
      </view>
    </view>

    <view v-for="section in sections" :key="section.title" class="panel card">
      <view class="panel__title">{{ section.title }}</view>
      <view v-if="section.text" class="panel__desc panel__desc--first">{{ section.text }}</view>
      <view v-for="row in section.rows" :key="row.label" class="kv__row">
        <text class="kv__key">{{ row.label }}</text>
        <text class="kv__value">{{ row.value }}</text>
      </view>
      <view v-for="step in section.steps" :key="step" class="ct-step">
        <text class="ct-step__num">·</text>
        <text class="ct-step__text">{{ step }}</text>
      </view>
    </view>

    <view class="panel card">
      <view class="panel__title">快捷入口</view>
      <view class="about-links">
        <view class="about-link" hover-class="about-link--hover" hover-stay-time="90" @tap="go('/pages/settings/settings')">
          <text class="about-link__title">设置</text>
          <text class="about-link__desc">主题、缓存与版本</text>
          <text class="about-link__arrow">›</text>
        </view>
        <view class="about-link" hover-class="about-link--hover" hover-stay-time="90" @tap="go('/pages/subscribe/subscribe')">
          <text class="about-link__title">订阅提醒</text>
          <text class="about-link__desc">公测与版本更新</text>
          <text class="about-link__arrow">›</text>
        </view>
        <view class="about-link" hover-class="about-link--hover" hover-stay-time="90" @tap="go('/pages/wiki/wiki')">
          <text class="about-link__title">奇波百科</text>
          <text class="about-link__desc">常见问题与数据边界</text>
          <text class="about-link__arrow">›</text>
        </view>
      </view>
    </view>

    <view class="ct-source">本工具与游戏官方无关；游戏名称、角色与图片版权归原作者所有。</view>
  </view>
</template>

<script setup>
import { useTheme } from '@/utils/theme.js';

const { isDark } = useTheme();
import { onShareAppMessage } from '@dcloudio/uni-app';
import { APP_VERSION, GAME_NAME } from '@/config/app.js';
import { aboutSections } from '@/data/content.js';

const version = APP_VERSION;
const gameName = GAME_NAME;
const sections = aboutSections;

function go(path) {
  uni.navigateTo({ url: path });
}

onShareAppMessage(() => ({ title: '关于游戏 · 蓝色星原助手', path: '/pages/about/about' }));
</script>

<style>
.about-hero {
  background: linear-gradient(135deg, #1f2a4a 0%, #2f6bff 55%, #00b3a4 100%);
}

.about-links {
  margin-top: 8rpx;
}

.about-link {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 22rpx 0;
  border-bottom: 1rpx solid var(--line);
  transition: transform 0.16s ease;
}

.about-link:last-child {
  border-bottom: none;
}

.about-link--hover {
  transform: scale(0.98);
}

.about-link__title {
  color: var(--ink);
  font-size: 26rpx;
  font-weight: 600;
}

.about-link__desc {
  flex: 1;
  color: var(--ink-3);
  font-size: 22rpx;
  text-align: right;
}

.about-link__arrow {
  color: var(--ink-3);
  font-size: 30rpx;
}
</style>
