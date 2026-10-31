<template>
  <catalog-detail type="enemy" :id="id" list-path="/pages/enemy/list" accent="#e0553f" />
</template>

<script setup>
import { computed, ref } from 'vue';
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app';
import { getCatalog } from '@/services/content.js';

const id = ref('');
onLoad((options) => {
  id.value = (options && options.id) || '';
});

const item = computed(() => ((getCatalog('enemy').data || {}).items || []).filter((entry) => entry.id === id.value)[0] || null);

onShareAppMessage(() => ({
  title: item.value ? item.value.name + ' · 敌人图鉴' : '敌人图鉴',
  path: '/pages/enemy/detail?id=' + id.value
}));
</script>
