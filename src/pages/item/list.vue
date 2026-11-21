<template>
  <page-meta :page-style="sheetOpen ? 'overflow: hidden;' : ''" />
  <catalog-list
    @sheet="sheetOpen = $event"
    type="item"
    search-placeholder="搜物品名称、功能"
    accent="#2f6bff"
    :facets="['kind', 'category', 'rarity']"
    badge="category"
    detail-path="/pages/item/detail"
    visual-mode
    :columns="3"
  />
</template>

<script setup>
import { ref } from 'vue';
import { onShareAppMessage } from '@dcloudio/uni-app';

const sheetOpen = ref(false);
onShareAppMessage(() => ({ title: '物品图鉴 · 奇波小助手', path: '/pages/item/list' }));
</script>
