<template>
  <catalog-detail type="food" :id="id" list-path="/pages/food/list" accent="#ff5b7f" />
</template>

<script setup>
import { computed, ref } from 'vue';
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app';
import { getCatalog } from '@/services/content.js';

const id = ref('');
onLoad((options) => {
  id.value = (options && options.id) || '';
});

const item = computed(() => ((getCatalog('food').data || {}).items || []).filter((entry) => entry.id === id.value)[0] || null);

onShareAppMessage(() => ({
  title: item.value ? item.value.name + ' · 美食图鉴' : '美食图鉴',
  path: '/pages/food/detail?id=' + id.value
}));
</script>
