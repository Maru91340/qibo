<template>
  <page-meta :page-style="sheetOpen ? 'overflow: hidden;' : ''" />
  <catalog-list
    @sheet="sheetOpen = $event"
    type="fishing"
    search-placeholder="搜鱼类、鱼竿、钓点"
    accent="#12a5c9"
    :facets="['category', 'rarity', 'tags']"
    badge="tag"
    detail-path="/pages/fishing/detail"
  />
</template>

<script setup>
import { ref } from 'vue';
import { onShareAppMessage } from '@dcloudio/uni-app';

const sheetOpen = ref(false);
onShareAppMessage(() => ({ title: '钓鱼图鉴 · 奇波小助手', path: '/pages/fishing/list' }));
</script>
