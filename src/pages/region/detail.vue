<template>
  <catalog-detail type="region" :id="id" list-path="/pages/region/list" accent="#3f7fe0" />
</template>

<script setup>
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';

const id = ref('');
onLoad((options) => {
  id.value = (options && options.id) || '';
});
</script>
