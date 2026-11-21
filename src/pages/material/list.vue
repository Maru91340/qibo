<template>
  <page-meta :page-style="sheetOpen ? 'overflow: hidden;' : ''" />
  <catalog-list
    @sheet="sheetOpen = $event"
    type="material"
    search-placeholder="搜材料名称、用途"
    accent="#00b3a4"
    :facets="['category', 'rarity', 'usage', 'tags']"
    badge="category"
    detail-path="/pages/material/detail"
  />
</template>

<script setup>
import { ref } from 'vue';
import { onShareAppMessage } from '@dcloudio/uni-app';

const sheetOpen = ref(false);
onShareAppMessage(() => ({ title: '材料图鉴 · 奇波小助手', path: '/pages/material/list' }));
</script>
