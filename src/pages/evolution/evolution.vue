<template>
  <view class="page" :class="{ 'theme-dark': isDark }">
    <view class="page-hero" :style="{ background: 'linear-gradient(132deg, #262c54 0%, #7f5bff 58%, #7f5bff 100%)' }">
      <view class="page-hero__inner">
        <text class="page-hero__eyebrow">信息查询</text>
        <view class="page-hero__title">进化图谱</view>
        <view class="page-hero__sub">按元素分组查看奇波进化链，点击进化链进入奇波详情。</view>
        <view class="page-hero__meta">
          <text class="page-hero__tag">BWIKI 收录 {{ totalCount }} 只</text>
          <text class="page-hero__tag">六系元素</text>
        </view>
      </view>
    </view>


    <view class="chip-row ev-elements">
      <view
        v-for="option in elementOptions"
        :key="option.key"
        class="facet-chip" hover-class="facet-chip--hover"
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
        <text class="ev-count">{{ group.total }} 只</text>
      </view>
      <view v-for="qibo in group.items" :key="qibo.id" class="ev-chain" hover-class="tap-hover" @tap="goQibo(qibo.id)">
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

    <view v-if="shownCount < totalCount" class="cl-more" hover-class="cl-more--hover" hover-stay-time="90" @tap="limit += 12">
      加载更多（已显示 {{ shownCount }} / {{ totalCount }} 只）
    </view>
    <view v-if="!list.length" class="ev-empty">没有匹配的进化链</view>
    <view class="footnote">{{ notice }}</view>
  </view>
</template>

<script setup>
import { useTheme } from '@/utils/theme.js';

const { isDark } = useTheme();
import { computed, ref, watch } from 'vue';
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

// 增量渲染：每系先显示 12 条，避免 212 条进化链一次铺满
const limit = ref(12);
const totalCount = computed(() => (catalog.value.items || []).filter((item) => item.stages && item.stages.length).length);
const shownCount = computed(() =>
  list.value.reduce((sum, group) => sum + group.items.length, 0)
);
const list = computed(() =>
  toolkit.value.elements
    .filter((elementInfo) => element.value === 'all' || elementInfo.key === element.value)
    .map((elementInfo) => {
      const all = (catalog.value.items || []).filter((item) => item.element === elementInfo.key && item.stages && item.stages.length);
      return {
        key: elementInfo.key,
        label: elementInfo.label,
        color: elementInfo.color,
        total: all.length,
        items: all.slice(0, limit.value)
      };
    })
    .filter((group) => group.items.length)
);
watch(element, () => {
  limit.value = 12;
});

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


.ev-dot {
  display: inline-block;
  width: 18rpx;
  height: 18rpx;
  border-radius: 50%;
  margin-right: 12rpx;
  vertical-align: middle;
}

.ev-count {
  margin-left: 12rpx;
  font-size: 22rpx;
  font-weight: 400;
  color: var(--ink-3);
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
  background: var(--warn-soft);
  color: var(--warn-ink);
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
