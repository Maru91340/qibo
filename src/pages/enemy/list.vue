<template>
  <catalog-list
    type="enemy"
    search-placeholder="搜敌人名称、元素"
    accent="#e0553f"
    :facets="['category', 'rarity', 'tags']"
    badge="tag"
    detail-path="/pages/enemy/detail"
  />
</template>

<script setup>
import { onShareAppMessage } from '@dcloudio/uni-app';

onShareAppMessage(() => ({ title: '敌人图鉴 · 蓝色星原助手', path: '/pages/enemy/list' }));
</script>
