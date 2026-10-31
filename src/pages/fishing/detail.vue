<template>
  <catalog-detail type="fishing" :id="id" list-path="/pages/fishing/list" accent="#12a5c9" />
</template>

<script setup>
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';

const id = ref('');
onLoad((options) => {
  id.value = (options && options.id) || '';
});
</script>
