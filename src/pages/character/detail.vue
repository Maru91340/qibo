<template>
  <!-- 阶段5：角色详情唯一实现收敛到分包 /pkg-character/detail（规范 02 路由）。
       本页仅作旧链接兼容跳转：带 id 重定向到分包详情；无 id 回角色列表。
       历史分享卡片与旧入口经此页中转，实现代码不再双份维护。 -->
  <view class="page character-detail-redirect" :class="{ 'theme-dark': isDark }">
    <view class="cx-empty">
      <view class="cx-empty__icon">🐾</view>
      <view class="cx-empty__text">正在进入角色详情…</view>
    </view>
  </view>
</template>

<script setup>
import { useTheme } from '@/utils/theme.js';

const { isDark } = useTheme();
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app';

onLoad((options) => {
  const id = (options && options.id) || '';
  if (id) {
    uni.redirectTo({ url: `/pkg-character/detail?id=${encodeURIComponent(id)}` });
    return;
  }
  uni.redirectTo({ url: '/pages/character/list' });
});
// 分享口径与分包详情页一致，避免再产出旧路由的分享卡片。
onShareAppMessage(() => ({ title: '角色图鉴 · 奇波小助手', path: '/pages/character/list' }));
</script>
