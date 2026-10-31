<template>
  <content-detail
    type="story"
    :id="id"
    list-path="/pages/story/list"
    accent="#d9a514"
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
