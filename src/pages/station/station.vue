<template>
  <view class="page" :class="{ 'theme-dark': isDark }">
    <view class="page-hero" :style="{ background: 'linear-gradient(132deg, #262c54 0%, #0aa06e 58%, #7f5bff 100%)' }">
      <view class="page-hero__inner">
        <text class="page-hero__eyebrow">信息查询</text>
        <view class="page-hero__title">家园派驻</view>
        <view class="page-hero__sub">按工种汇总可派驻家园生产的奇波，点击查看元素与技能详情。</view>
        <view class="page-hero__meta">
          <text class="page-hero__tag">工种分组</text>
          <text class="page-hero__tag">一键跳详情</text>
        </view>
      </view>
    </view>


    <view v-for="group in groups" :key="group.name" class="panel card">
      <view class="panel__title">
        {{ group.name }}
        <text class="st-count">{{ group.items.length }} 只可派驻</text>
      </view>
      <view
        v-for="entry in group.items"
        :key="entry.id"
        class="st-item" hover-class="tap-hover"
        @tap="goQibo(entry.id)"
      >
        <view class="st-item__badge" :style="{ color: entry.color, background: entry.tint }">
          {{ entry.elementLabel }}
        </view>
        <view class="st-item__body">
          <view class="st-item__name">{{ entry.name }}</view>
          <view class="st-item__skills">{{ entry.skills.join(' · ') || '暂无技能记录' }}</view>
        </view>
        <text class="st-item__arrow">›</text>
      </view>
    </view>

    <view v-if="!groups.length" class="st-empty">暂无可派驻的奇波数据</view>
    <view class="footnote">{{ notice }}</view>
  </view>
</template>

<script setup>
import { useTheme } from '@/utils/theme.js';

const { isDark } = useTheme();
import { computed } from 'vue';
import { onShareAppMessage } from '@dcloudio/uni-app';
import { getCatalog } from '@/services/content.js';
import { createElementToolkit } from '@/data/element.js';
import { decorateWithElement } from '@/utils/query.js';

const catalog = getCatalog('qibo').data || { items: [], notice: '' };
const toolkit = createElementToolkit(getCatalog('element').data);

const notice = computed(() => catalog.notice || '');

const groups = computed(() => {
  const workers = (catalog.items || [])
    .filter((item) => (item.usage || []).indexOf('家园生产') >= 0)
    .map((item) => decorateWithElement(item, toolkit.elementMap));
  const bySkill = new Map();
  workers.forEach((item) => {
    // 每只奇波只归入首个工种，避免同一奇波在多个分组重复出现
    const skills = (item.skills || []).length ? item.skills.slice(0, 1) : ['通用劳作'];
    skills.forEach((skill) => {
      if (!bySkill.has(skill)) bySkill.set(skill, []);
      bySkill.get(skill).push(item);
    });
  });
  return [...bySkill.entries()]
    .map(([name, items]) => ({ name, items }))
    .sort((a, b) => b.items.length - a.items.length);
});

function goQibo(id) {
  uni.navigateTo({ url: `/pages/qibo/detail?id=${id}` });
}

onShareAppMessage(() => ({ title: '家园派驻指南 · 蓝色星原助手', path: '/pages/station/station' }));
</script>

<style>
.st-count {
  margin-left: 12rpx;
  font-size: 22rpx;
  font-weight: 400;
  color: var(--ink-3);
}

.st-item {
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 18rpx 0;
  border-bottom: 1rpx solid var(--line);
}

.st-item:last-child {
  border-bottom: none;
}

.st-item__badge {
  width: 88rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20rpx;
  font-size: 24rpx;
  font-weight: 600;
  flex-shrink: 0;
}

.st-item__body {
  flex: 1;
  min-width: 0;
}

.st-item__name {
  font-size: 27rpx;
  font-weight: 600;
  color: var(--ink);
}

.st-item__skills {
  margin-top: 6rpx;
  color: var(--ink-2);
  font-size: 23rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.st-item__arrow {
  color: var(--ink-3);
  font-size: 32rpx;
}

.st-empty {
  padding: 80rpx 0;
  text-align: center;
  color: var(--ink-3);
  font-size: 25rpx;
}
</style>
