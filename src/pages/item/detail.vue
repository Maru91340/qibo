<template>
  <catalog-detail type="item" :id="id" list-path="/pages/item/list" accent="#2f6bff" />
</template>

<script setup>
import { computed, ref } from 'vue';
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app';
import { getCatalog } from '@/services/content.js';

const id = ref('');
onLoad((options) => {
  id.value = (options && options.id) || '';
});

const item = computed(() => ((getCatalog('item').data || {}).items || []).filter((entry) => entry.id === id.value)[0] || null);

onShareAppMessage(() => ({
  title: item.value ? item.value.name + ' · 物品图鉴' : '物品图鉴',
  path: '/pages/item/detail?id=' + id.value
}));
</script>
