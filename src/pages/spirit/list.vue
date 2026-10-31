<template>
  <catalog-list
    type="spirit"
    search-placeholder="搜灵子名称、属性"
    accent="#7f5bff"
    :facets="['category', 'rarity', 'tags']"
    badge="category"
    detail-path="/pages/spirit/detail"
  />
</template>

<script setup>
import { onShareAppMessage } from '@dcloudio/uni-app';

onShareAppMessage(() => ({ title: '灵子图鉴 · 蓝色星原助手', path: '/pages/spirit/list' }));
</script>
