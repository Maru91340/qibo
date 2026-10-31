<template>
  <catalog-list
    type="material"
    search-placeholder="搜材料名称、用途"
    accent="#00b3a4"
    :facets="['category', 'rarity', 'tags']"
    badge="category"
    detail-path="/pages/material/detail"
  />
</template>

<script setup>
import { onShareAppMessage } from '@dcloudio/uni-app';

onShareAppMessage(() => ({ title: '材料图鉴 · 蓝色星原助手', path: '/pages/material/list' }));
</script>
