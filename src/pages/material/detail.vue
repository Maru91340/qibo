<template>
  <catalog-detail type="material" :id="id" list-path="/pages/material/list" accent="#00b3a4" />
</template>

<script setup>
import { computed, ref } from 'vue';
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app';
import { getCatalog } from '@/services/content.js';

const id = ref('');
onLoad((options) => {
  id.value = (options && options.id) || '';
});

const item = computed(() => ((getCatalog('material').data || {}).items || []).filter((entry) => entry.id === id.value)[0] || null);

onShareAppMessage(() => ({
  title: item.value ? item.value.name + ' · 材料图鉴' : '材料图鉴',
  path: '/pages/material/detail?id=' + id.value
}));
</script>
