<template>
  <catalog-detail type="building" :id="id" list-path="/pages/building/list" accent="#0aa06e" />
</template>

<script setup>
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';

const id = ref('');
onLoad((options) => {
  id.value = (options && options.id) || '';
});
</script>
