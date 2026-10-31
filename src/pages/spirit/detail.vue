<template>
  <catalog-detail type="spirit" :id="id" list-path="/pages/spirit/list" accent="#7f5bff" />
</template>

<script setup>
import { computed, ref } from 'vue';
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app';
import { getCatalog } from '@/services/content.js';

const id = ref('');
onLoad((options) => {
  id.value = (options && options.id) || '';
});

const item = computed(() => ((getCatalog('spirit').data || {}).items || []).filter((entry) => entry.id === id.value)[0] || null);

onShareAppMessage(() => ({
  title: item.value ? item.value.name + ' · 灵子图鉴' : '灵子图鉴',
  path: '/pages/spirit/detail?id=' + id.value
}));
</script>
