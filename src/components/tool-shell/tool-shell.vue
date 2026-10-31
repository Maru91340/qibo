<template>
  <view class="page" :class="{ 'theme-dark': isDark }">
    <view class="page-hero tool-hero" :style="{ background: hero }">
      <view class="page-hero__inner">
        <text class="page-hero__eyebrow">{{ eyebrow }}</text>
        <view class="page-hero__title">{{ title }}</view>
        <view class="page-hero__sub">{{ sub }}</view>
        <view v-if="tags.length" class="page-hero__meta">
          <text v-for="tag in tags" :key="tag" class="page-hero__tag">{{ tag }}</text>
        </view>
      </view>
    </view>

    <slot />

    <view class="tool-note card">
      <text class="tool-note__badge">公测后开放</text>
      <view class="tool-note__text">{{ note }}</view>
    </view>

    <view class="ct-source">{{ footer }}</view>
  </view>
</template>

<script setup>
import { useTheme } from '@/utils/theme.js';
import { TOOLS_NOTICE } from '@/data/tools.js';

const { isDark } = useTheme();

defineProps({
  eyebrow: { type: String, default: '工具 · P2' },
  title: { type: String, required: true },
  sub: { type: String, default: '' },
  tags: { type: Array, default: () => [] },
  hero: { type: String, default: 'linear-gradient(135deg, #1f3d9e 0%, #2f6bff 55%, #00b3a4 100%)' },
  note: { type: String, default: TOOLS_NOTICE },
  footer: { type: String, default: '工具页只做本地计算与记录，不上传任何数据；数值以官方公告为准。' }
});
</script>
