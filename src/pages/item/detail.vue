<template>
  <catalog-detail type="item" :id="id" list-path="/pages/item/list" accent="#2f6bff" />
</template>

<script setup>
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';

const id = ref('');
onLoad((options) => {
  id.value = (options && options.id) || '';
});
</script>
