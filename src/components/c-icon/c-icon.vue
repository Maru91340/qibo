<template>
  <text class="c-icon" :style="{ fontSize: sizeText, color: color || 'inherit' }">{{ glyph }}</text>
</template>

<script setup>
import { computed } from 'vue';

// 跨端 emoji 图标：H5 与微信端一致渲染（替代 tdesign t-icon 的 H5 空白问题）
const GLYPHS = {
  smile: '🐾',
  usergroup: '🧑‍🚀',
  bookmark: '📘',
  flag: '⚔️',
  star: '⭐',
  swap: '🔄',
  time: '⏳',
  map: '🗺️',
  search: '🔍',
  secured: '🛡️',
  'chevron-right': '›',
  'info-circle': '📢',
  heart: '💚',
  fire: '🔥',
  gift: '🎁',
  bell: '🔔',
  image: '🖼️',
  home: '🏠',
  tool: '🧰',
  book: '📖',
  sword: '🗡️',
  food: '🍚',
  fish: '🎣',
  build: '🏗️',
  trophy: '🏆',
  globe: '🌍',
  spark: '✨'
};

const props = defineProps({
  name: { type: String, default: 'star' },
  size: { type: String, default: '32rpx' },
  color: { type: String, default: '' }
});

const glyph = computed(() => GLYPHS[props.name] || '✦');
const sizeText = computed(() => (String(props.size).includes('rpx') || String(props.size).includes('px') ? props.size : `${props.size}rpx`));
</script>

<style>
.c-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
</style>
