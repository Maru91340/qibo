<template>
  <catalog-list
    type="region"
    search-placeholder="搜地区名称、阵营"
    accent="#3f7fe0"
    :facets="['category', 'rarity']"
    badge="category"
    detail-path="/pages/region/detail"
  />
</template>

<script setup>
import { onShareAppMessage } from '@dcloudio/uni-app';

onShareAppMessage(() => ({ title: '地区阵营 · 蓝色星原助手', path: '/pages/region/list' }));
</script>
