<template>
  <catalog-list
    type="dungeon"
    search-placeholder="搜副本名称、类型"
    accent="#5a6ad0"
    :facets="['category', 'rarity']"
    badge="category"
    detail-path="/pages/dungeon/detail"
  />
</template>

<script setup>
import { onShareAppMessage } from '@dcloudio/uni-app';

onShareAppMessage(() => ({ title: '副本图鉴 · 蓝色星原助手', path: '/pages/dungeon/list' }));
</script>
