<template>
  <catalog-detail type="dungeon" :id="id" list-path="/pages/dungeon/list" accent="#5a6ad0" />
</template>

<script setup>
import { computed, ref } from 'vue';
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app';
import { getCatalog } from '@/services/content.js';

const id = ref('');
onLoad((options) => {
  id.value = (options && options.id) || '';
});

const item = computed(() => ((getCatalog('dungeon').data || {}).items || []).filter((entry) => entry.id === id.value)[0] || null);

onShareAppMessage(() => ({
  title: item.value ? item.value.name + ' · 副本图鉴' : '副本图鉴',
  path: '/pages/dungeon/detail?id=' + id.value
}));
</script>
