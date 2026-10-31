<template>
  <catalog-detail type="building" :id="id" list-path="/pages/building/list" accent="#0aa06e" />
</template>

<script setup>
import { computed, ref } from 'vue';
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app';
import { getCatalog } from '@/services/content.js';

const id = ref('');
onLoad((options) => {
  id.value = (options && options.id) || '';
});

const item = computed(() => ((getCatalog('building').data || {}).items || []).filter((entry) => entry.id === id.value)[0] || null);

onShareAppMessage(() => ({
  title: item.value ? item.value.name + ' · 家园建筑' : '家园建筑',
  path: '/pages/building/detail?id=' + id.value
}));
</script>
