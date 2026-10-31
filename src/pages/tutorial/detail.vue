<template>
  <content-detail
    type="tutorial"
    :id="id"
    list-path="/pages/tutorial/list"
    accent="#7f5bff"
  />
</template>

<script setup>
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';

const id = ref('');
onLoad((options) => {
  id.value = (options && options.id) || '';
});
</script>
