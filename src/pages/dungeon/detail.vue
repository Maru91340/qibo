<template>
  <catalog-detail type="dungeon" :id="id" list-path="/pages/dungeon/list" accent="#5a6ad0" />
</template>

<script setup>
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';

const id = ref('');
onLoad((options) => {
  id.value = (options && options.id) || '';
});
</script>
