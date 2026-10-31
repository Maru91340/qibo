<template>
  <catalog-list
    type="fishing"
    search-placeholder="搜鱼类名称、产地"
    accent="#12a5c9"
    :facets="['category', 'rarity', 'tags']"
    badge="tag"
    detail-path="/pages/fishing/detail"
  />
</template>

<script setup>
import { onShareAppMessage } from '@dcloudio/uni-app';

onShareAppMessage(() => ({ title: '钓鱼图鉴 · 蓝色星原助手', path: '/pages/fishing/list' }));
</script>
