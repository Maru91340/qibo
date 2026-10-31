<template>
  <view class="page" :class="{ 'theme-dark': isDark }">
    <view class="panel card">
      <view class="panel__title">进化图谱</view>
      <view class="panel__desc">按元素分组展示奇波进化链；点击任一阶段名称进入奇波详情。</view>
    </view>

    <view class="chip-row ev-elements">
      <view
        v-for="option in elementOptions"
        :key="option.key"
        class="facet-chip"
        :class="{ 'facet-chip--active': option.key === element }"
        @tap="element = option.key"
      >
        {{ option.label }}
      </view>
    </view>

    <view v-for="group in list" :key="group.key" class="panel card">
      <view class="panel__title">
        <view class="ev-dot" :style="{ background: group.color }" />
        {{ group.label }}系
      </view>
      <view v-for="qibo in group.items" :key="qibo.id" class="ev-chain" @tap="goQibo(qibo.id)">
        <view class="ev-chain__top">
          <text class="ev-chain__name">{{ qibo.name }}</text>
          <text v-if="!qibo.verified" class="mini-tag mini-tag--warn">待核实</text>
          <text class="ev-chain__arrow">›</text>
        </view>
        <view class="stages">
          <view v-for="(stage, index) in qibo.stages" :key="stage" class="stage">
            <view class="stage__dot" :style="index === qibo.stages.length - 1 ? { background: group.color, color: '#fff' } : {}">
              {{ index + 1 }}
            </view>
            <view class="stage__name">{{ stage }}</view>
          </view>
        </view>
        <view v-if="qibo.forms && qibo.forms.length" class="chip-row ev-forms">
          <text v-for="form in qibo.forms" :key="form" class="chip chip--ghost">{{ form }}</text>
        </view>
      </view>
    </view>

    <view v-if="!list.length" class="ev-empty">没有匹配的进化链</view>
    <view class="footnote">{{ notice }}</view>
  </view>
</template>

<script setup>
import { useTheme } from '@/utils/theme.js';

const { isDark } = useTheme();
import { computed, ref } from 'vue';
import { onShareAppMessage } from '@dcloudio/uni-app';
import { getCatalog, onCatalogUpdate } from '@/services/content.js';
import { createElementToolkit } from '@/data/element.js';

const element = ref('all');
const catalog = ref({ items: [], notice: '' });
const toolkit = ref(createElementToolkit(getCatalog('element').data));

const notice = computed(() => catalog.value.notice || '');

const elementOptions = computed(() => [
  { key: 'all', label: '全部元素', color: '#5a6480' },
  ...toolkit.value.elements
]);

const list = computed(() =>
  toolkit.value.elements
    .filter((elementInfo) => element.value === 'all' || elementInfo.key === element.value)
    .map((elementInfo) => ({
      key: elementInfo.key,
      label: elementInfo.label,
      color: elementInfo.color,
      items: (catalog.value.items || []).filter((item) => item.element === elementInfo.key && item.stages && item.stages.length)
    }))
    .filter((group) => group.items.length)
);

function reload() {
  catalog.value = getCatalog('qibo').data || { items: [], notice: '' };
  toolkit.value = createElementToolkit(getCatalog('element').data);
}

function goQibo(id) {
  uni.navigateTo({ url: `/pages/qibo/detail?id=${id}` });
}

reload();
onCatalogUpdate(reload);

onShareAppMessage(() => ({ title: '进化图谱 · 蓝色星原助手', path: '/pages/evolution/evolution' }));
</script>

<style>
.ev-elements {
  padding: 4rpx 0;
}

.facet-chip {
  padding: 10rpx 24rpx;
  border-radius: 30rpx;
  background: var(--card-bg);
  border: 1rpx solid var(--line);
  color: var(--ink-2);
  font-size: 23rpx;
}

.facet-chip--active {
  background: #2f6bff;
  border-color: #2f6bff;
  color: #ffffff;
}

.ev-dot {
  display: inline-block;
  width: 18rpx;
  height: 18rpx;
  border-radius: 50%;
  margin-right: 12rpx;
  vertical-align: middle;
}

.ev-chain {
  padding: 18rpx 0;
  border-bottom: 1rpx solid var(--line);
}

.ev-chain:last-child {
  border-bottom: none;
}

.ev-chain__top {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 14rpx;
}

.ev-chain__name {
  font-size: 27rpx;
  font-weight: 600;
  color: var(--ink);
}

.mini-tag {
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  background: #fff4e6;
  color: #c77700;
  font-size: 20rpx;
}

.ev-chain__arrow {
  margin-left: auto;
  color: var(--ink-3);
  font-size: 30rpx;
}

.stages {
  display: flex;
  align-items: flex-start;
}

.stage {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
}

.stage:not(:last-child)::after {
  content: "";
  position: absolute;
  top: 24rpx;
  left: calc(50% + 32rpx);
  width: calc(100% - 64rpx);
  height: 2rpx;
  background: linear-gradient(90deg, var(--ink-3), var(--line));
}

.stage__dot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50rpx;
  height: 50rpx;
  border-radius: 50%;
  background: var(--brand-soft);
  color: var(--brand-deep);
  font-size: 23rpx;
  font-weight: 600;
}

.stage__name {
  color: var(--ink-2);
  font-size: 21rpx;
}

.ev-forms {
  margin-top: 12rpx;
}

.ev-empty {
  padding: 80rpx 0;
  text-align: center;
  color: var(--ink-3);
  font-size: 25rpx;
}
</style>
