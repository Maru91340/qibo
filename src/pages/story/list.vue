<template>
  <content-list
    type="story"
    detail-path="/pages/story/detail"
    accent="#d9a514"
    search-placeholder="搜标题、地区或关键词"
    :initial-category="category"
  />
</template>

<script setup>
import { ref } from 'vue';
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app';

const category = ref('全部');
onLoad((options) => {
  category.value = (options && options.category) || '全部';
});

onShareAppMessage(() => ({ title: '剧情读物 · 蓝色星原助手', path: '/pages/story/list' }));
</script>
