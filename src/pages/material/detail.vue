<template>
  <catalog-detail type="material" :id="id" list-path="/pages/material/list" accent="#00b3a4" />
</template>

<script setup>
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';

const id = ref('');
onLoad((options) => {
  id.value = (options && options.id) || '';
});
</script>
