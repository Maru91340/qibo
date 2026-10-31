<template>
  <tool-shell
    title="角色对比"
    sub="选择两名角色，先看元素、定位与配队思路；技能倍率与基础数值公测后补充。"
    :tags="['已收录 ' + compareCharacters.length + ' 名', '示例条目', '本地不保存']"
    hero="linear-gradient(135deg, #1f3d9e 0%, #7f5bff 55%, #ff8a3d 100%)"
  >
    <view class="tool-panel">
      <view class="tool-panel__head">
        <text class="tool-panel__title">选择角色</text>
        <text class="tool-panel__hint">点选择位后再点角色</text>
      </view>

      <view class="tool-split">
        <view
          class="tool-slot"
          :class="{ 'tool-slot--active': activeSlot === 'left' }"
          hover-class="tool-slot--hover"
          hover-stay-time="90"
          @tap="setActive('left')"
        >
          <text class="tool-slot__label">左侧</text>
          <template v-if="leftItem">
            <text class="tool-slot__name">{{ leftItem.name }}</text>
            <text class="tool-slot__meta">{{ elementLabel(leftItem.element) }} · {{ leftItem.role }} · {{ leftItem.rarity }}</text>
            <text v-if="!leftItem.verified" class="ct-tag ct-tag--warn">待核实</text>
          </template>
          <text v-else class="tool-slot__ph">点击下方角色填入</text>
        </view>

        <view
          class="tool-slot"
          :class="{ 'tool-slot--active': activeSlot === 'right' }"
          hover-class="tool-slot--hover"
          hover-stay-time="90"
          @tap="setActive('right')"
        >
          <text class="tool-slot__label">右侧</text>
          <template v-if="rightItem">
            <text class="tool-slot__name">{{ rightItem.name }}</text>
            <text class="tool-slot__meta">{{ elementLabel(rightItem.element) }} · {{ rightItem.role }} · {{ rightItem.rarity }}</text>
            <text v-if="!rightItem.verified" class="ct-tag ct-tag--warn">待核实</text>
          </template>
          <text v-else class="tool-slot__ph">点击下方角色填入</text>
        </view>
      </view>

      <view class="tool-picker">
        <view
          v-for="item in compareCharacters"
          :key="item.id"
          class="tool-picker__item"
          :class="{ 'tool-picker__item--active': activeId === item.id }"
          hover-class="tool-picker__item--hover"
          hover-stay-time="90"
          @tap="choose(item.id)"
        >{{ item.name }}</view>
      </view>

      <view class="tool-bar">
        <view class="ct-btn ct-btn--ghost" hover-class="ct-btn--hover" @tap="swap">交换左右</view>
        <view class="ct-btn ct-btn--ghost" hover-class="ct-btn--hover" @tap="reset">恢复示例</view>
      </view>
    </view>

    <view class="tool-panel">
      <view class="tool-panel__head">
        <text class="tool-panel__title">对比结果</text>
        <text class="tool-panel__hint">不展示未公开数值</text>
      </view>

      <view v-if="leftItem && rightItem" class="cmp">
        <view class="cmp__head">
          <text class="cmp__name">{{ leftItem.name }}</text>
          <text class="cmp__vs">VS</text>
          <text class="cmp__name">{{ rightItem.name }}</text>
        </view>
        <view v-for="dim in compareDimensions" :key="dim.key" class="cmp__row">
          <text class="cmp__value" :class="{ 'cmp__value--pending': dim.key === 'stats' }">{{ dimensionValue(leftItem, dim.key) }}</text>
          <text class="cmp__label">{{ dim.label }}</text>
          <text class="cmp__value" :class="{ 'cmp__value--pending': dim.key === 'stats' }">{{ dimensionValue(rightItem, dim.key) }}</text>
        </view>
        <view v-if="leftItem.id === rightItem.id" class="tool-empty">
          <view class="tool-empty__icon">↔</view>
          <view class="tool-empty__title">两侧是同一名角色</view>
          <view class="tool-empty__text">换一名角色再对比，配队与定位差异才有参考价值。</view>
        </view>
      </view>

      <view v-else class="tool-empty">
        <view class="tool-empty__icon">＋</view>
        <view class="tool-empty__title">先选齐左右两名角色</view>
        <view class="tool-empty__text">在上方选择位点一下，再从角色列表里挑选；全部条目均标注数据状态。</view>
      </view>
    </view>
  </tool-shell>
</template>

<script setup>
import { computed, ref } from 'vue';
import { onShareAppMessage } from '@dcloudio/uni-app';
import { elements } from '@/data/element.js';
import { compareCharacters, compareDimensions } from '@/data/tools.js';

const DEFAULT_LEFT = 'ainisi';
const DEFAULT_RIGHT = 'shiyi-kela';

const selected = ref({ left: DEFAULT_LEFT, right: DEFAULT_RIGHT });
const activeSlot = ref('left');

const elementMap = elements.reduce((map, item) => {
  map[item.key] = item.label;
  return map;
}, {});

const activeId = computed(() => selected.value[activeSlot.value]);
const leftItem = computed(() => compareCharacters.find((item) => item.id === selected.value.left));
const rightItem = computed(() => compareCharacters.find((item) => item.id === selected.value.right));

function elementLabel(key) {
  return elementMap[key] || '待核实';
}

function dimensionValue(item, key) {
  if (!item) return '待核实';
  if (key === 'element') return elementLabel(item.element);
  if (key === 'stats') return '公测后开放';
  if (key === 'teams') return item.teams.length ? item.teams.join('、') : '待核实';
  return item[key] || '待核实';
}

function setActive(slot) {
  activeSlot.value = slot;
}

function choose(id) {
  selected.value = Object.assign({}, selected.value, { [activeSlot.value]: id });
}

function swap() {
  selected.value = { left: selected.value.right, right: selected.value.left };
}

function reset() {
  selected.value = { left: DEFAULT_LEFT, right: DEFAULT_RIGHT };
  activeSlot.value = 'left';
}

onShareAppMessage(() => ({ title: '角色对比 · 蓝色星原助手', path: '/pages/compare/compare' }));
</script>

<style>
.cmp__head {
  display: grid;
  grid-template-columns: 1fr 72rpx 1fr;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 0 20rpx;
  border-bottom: 1rpx solid var(--line);
}

.cmp__name {
  color: var(--ink);
  font-size: 28rpx;
  font-weight: 700;
  text-align: center;
  word-break: break-all;
}

.cmp__vs {
  color: var(--ink-3);
  font-size: 22rpx;
  text-align: center;
}

.cmp__row {
  display: grid;
  grid-template-columns: 1fr 96rpx 1fr;
  align-items: start;
  gap: 8rpx;
  padding: 18rpx 0;
  border-bottom: 1rpx solid var(--line);
}

.cmp__row:last-child {
  border-bottom: none;
}

.cmp__value {
  color: var(--ink);
  font-size: 24rpx;
  font-weight: 600;
  line-height: 1.55;
  text-align: center;
  word-break: break-all;
}

.cmp__value--pending {
  color: var(--ink-3);
  font-weight: 500;
}

.cmp__label {
  color: var(--ink-3);
  font-size: 21rpx;
  text-align: center;
  padding-top: 4rpx;
}
</style>
