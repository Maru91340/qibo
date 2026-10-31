<template>
  <catalog-detail type="equipment" :id="id" list-path="/pages/equipment/list" accent="#ff8a3d" />
</template>

<script setup>
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';

const id = ref('');
onLoad((options) => {
  id.value = (options && options.id) || '';
});
</script>
