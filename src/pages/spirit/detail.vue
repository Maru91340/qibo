<template>
  <catalog-detail type="spirit" :id="id" list-path="/pages/spirit/list" accent="#7f5bff" />
</template>

<script setup>
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';

const id = ref('');
onLoad((options) => {
  id.value = (options && options.id) || '';
});
</script>
