<template>
  <page-meta :page-style="sheetOpen ? 'overflow: hidden;' : ''" />
  <catalog-list
    @sheet="sheetOpen = $event"
    type="enemy"
    search-placeholder="搜敌人名称、元素"
    accent="#e0553f"
    :facets="['category', 'rarity', 'tags']"
    badge="tag"
    detail-path="/pages/enemy/detail"
  />
</template>

<script setup>
import { ref } from 'vue';
import { onShareAppMessage } from '@dcloudio/uni-app';

const sheetOpen = ref(false);
onShareAppMessage(() => ({ title: '敌人图鉴 · 奇波小助手', path: '/pages/enemy/list' }));
</script>
