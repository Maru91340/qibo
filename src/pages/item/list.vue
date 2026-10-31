<template>
  <catalog-list
    type="item"
    search-placeholder="搜物品名称、功能"
    accent="#2f6bff"
    :facets="['category', 'rarity', 'tags']"
    badge="category"
    detail-path="/pages/item/detail"
  />
</template>

<script setup>
import { onShareAppMessage } from '@dcloudio/uni-app';

onShareAppMessage(() => ({ title: '物品图鉴 · 蓝色星原助手', path: '/pages/item/list' }));
</script>
