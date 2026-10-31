<template>
  <catalog-detail type="food" :id="id" list-path="/pages/food/list" accent="#ff5b7f" />
</template>

<script setup>
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';

const id = ref('');
onLoad((options) => {
  id.value = (options && options.id) || '';
});
</script>
