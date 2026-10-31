<template>
  <content-list
    type="tutorial"
    detail-path="/pages/tutorial/detail"
    accent="#7f5bff"
    search-placeholder="搜教程标题、摘要或标签"
  />
</template>

<script setup>
import { onShareAppMessage } from '@dcloudio/uni-app';

onShareAppMessage(() => ({ title: '教程合集 · 蓝色星原助手', path: '/pages/tutorial/list' }));
</script>
