<template>
  <catalog-detail type="fishing" :id="id" list-path="/pages/fishing/list" accent="#12a5c9" />
</template>

<script setup>
import { computed, ref } from 'vue';
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app';
import { getCatalog } from '@/services/content.js';

const id = ref('');
onLoad((options) => {
  id.value = (options && options.id) || '';
});

const item = computed(() => ((getCatalog('fishing').data || {}).items || []).filter((entry) => entry.id === id.value)[0] || null);

onShareAppMessage(() => ({
  title: item.value ? item.value.name + ' · 钓鱼图鉴' : '钓鱼图鉴',
  path: '/pages/fishing/detail?id=' + id.value
}));
</script>
