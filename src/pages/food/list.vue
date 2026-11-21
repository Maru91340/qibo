<template>
  <page-meta :page-style="sheetOpen ? 'overflow: hidden;' : ''" />
  <catalog-list
    @sheet="sheetOpen = $event"
    type="food"
    search-placeholder="搜料理名称、效果"
    accent="#ff5b7f"
    :facets="['category', 'rarity', 'tags']"
    badge="category"
    detail-path="/pages/food/detail"
  />
</template>

<script setup>
import { ref } from 'vue';
import { onShareAppMessage } from '@dcloudio/uni-app';

const sheetOpen = ref(false);
onShareAppMessage(() => ({ title: '美食图鉴 · 奇波小助手', path: '/pages/food/list' }));
</script>
