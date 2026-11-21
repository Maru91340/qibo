<template>
  <page-meta :page-style="sheetOpen ? 'overflow: hidden;' : ''" />
  <catalog-list
    @sheet="sheetOpen = $event"
    type="equipment"
    search-placeholder="搜装备名称、套装"
    accent="#ff8a3d"
    :facets="['category', 'rarity', 'tags']"
    badge="category"
    detail-path="/pages/equipment/detail"
  />
</template>

<script setup>
import { ref } from 'vue';
import { onShareAppMessage } from '@dcloudio/uni-app';

const sheetOpen = ref(false);
onShareAppMessage(() => ({ title: '装备图鉴 · 奇波小助手', path: '/pages/equipment/list' }));
</script>
