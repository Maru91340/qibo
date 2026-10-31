<template>
  <catalog-detail type="region" :id="id" list-path="/pages/region/list" accent="#3f7fe0" />
</template>

<script setup>
import { computed, ref } from 'vue';
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app';
import { getCatalog } from '@/services/content.js';

const id = ref('');
onLoad((options) => {
  id.value = (options && options.id) || '';
});

const item = computed(() => ((getCatalog('region').data || {}).items || []).filter((entry) => entry.id === id.value)[0] || null);

onShareAppMessage(() => ({
  title: item.value ? item.value.name + ' · 地区阵营' : '地区阵营',
  path: '/pages/region/detail?id=' + id.value
}));
</script>
