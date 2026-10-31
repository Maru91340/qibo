<template>
  <catalog-detail type="enemy" :id="id" list-path="/pages/enemy/list" accent="#e0553f" />
</template>

<script setup>
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';

const id = ref('');
onLoad((options) => {
  id.value = (options && options.id) || '';
});
</script>
