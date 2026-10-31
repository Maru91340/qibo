<template>
  <catalog-detail type="equipment" :id="id" list-path="/pages/equipment/list" accent="#ff8a3d" />
</template>

<script setup>
import { computed, ref } from 'vue';
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app';
import { getCatalog } from '@/services/content.js';

const id = ref('');
onLoad((options) => {
  id.value = (options && options.id) || '';
});

const item = computed(() => ((getCatalog('equipment').data || {}).items || []).filter((entry) => entry.id === id.value)[0] || null);

onShareAppMessage(() => ({
  title: item.value ? item.value.name + ' · 装备图鉴' : '装备图鉴',
  path: '/pages/equipment/detail?id=' + id.value
}));
</script>
