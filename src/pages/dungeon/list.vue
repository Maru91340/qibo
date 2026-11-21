<template>
  <page-meta :page-style="sheetOpen ? 'overflow: hidden;' : ''" />
  <catalog-list
    @sheet="sheetOpen = $event"
    type="dungeon"
    search-placeholder="搜副本名称、类型"
    accent="#5a6ad0"
    :facets="['category', 'rarity']"
    badge="category"
    detail-path="/pages/dungeon/detail"
  />
</template>

<script setup>
import { ref } from 'vue';
import { onShareAppMessage } from '@dcloudio/uni-app';

const sheetOpen = ref(false);
onShareAppMessage(() => ({ title: '副本图鉴 · 奇波小助手', path: '/pages/dungeon/list' }));
</script>
