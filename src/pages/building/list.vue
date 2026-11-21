<template>
  <page-meta :page-style="sheetOpen ? 'overflow: hidden;' : ''" />
  <catalog-list
    @sheet="sheetOpen = $event"
    type="building"
    search-placeholder="搜建筑名称、功能"
    accent="#0aa06e"
    :facets="['category', 'tags']"
    badge="category"
    detail-path="/pages/building/detail"
  />
</template>

<script setup>
import { ref } from 'vue';
import { onShareAppMessage } from '@dcloudio/uni-app';

const sheetOpen = ref(false);
onShareAppMessage(() => ({ title: '家园建筑 · 奇波小助手', path: '/pages/building/list' }));
</script>
