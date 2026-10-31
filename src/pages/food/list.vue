<template>
  <catalog-list
    type="food"
    search-placeholder="搜料理名称、效果"
    accent="#ff5b7f"
    :facets="['category', 'rarity', 'tags']"
    badge="category"
    detail-path="/pages/food/detail"
  />
</template>

<script setup>
import { onShareAppMessage } from '@dcloudio/uni-app';

onShareAppMessage(() => ({ title: '美食图鉴 · 蓝色星原助手', path: '/pages/food/list' }));
</script>
