<template>
  <catalog-list
    type="equipment"
    search-placeholder="搜装备名称、套装"
    accent="#ff8a3d"
    :facets="['category', 'rarity', 'tags']"
    badge="category"
    detail-path="/pages/equipment/detail"
  />
</template>

<script setup>
import { onShareAppMessage } from '@dcloudio/uni-app';

onShareAppMessage(() => ({ title: '装备图鉴 · 蓝色星原助手', path: '/pages/equipment/list' }));
</script>
