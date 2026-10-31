<template>
  <catalog-list
    type="building"
    search-placeholder="搜建筑名称、功能"
    accent="#0aa06e"
    :facets="['category', 'tags']"
    badge="category"
    detail-path="/pages/building/detail"
  />
</template>

<script setup>
import { onShareAppMessage } from '@dcloudio/uni-app';

onShareAppMessage(() => ({ title: '家园建筑 · 蓝色星原助手', path: '/pages/building/list' }));
</script>
