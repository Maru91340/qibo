<template>
  <tool-shell
    title="养成计算"
    sub="选择目标阶段并勾选要准备的材料类别；具体消耗数量公测后开放，先记录你的准备进度。"
    :tags="['4 个阶段', '本机记录', '数量待定']"
    hero="linear-gradient(135deg, #1f3d9e 0%, #0aa06e 55%, #7f5bff 100%)"
  >
    <view class="tool-panel">
      <view class="tool-panel__head">
        <text class="tool-panel__title">目标阶段</text>
        <text class="tool-panel__hint">{{ stage.hint }}</text>
      </view>
      <view class="tool-picker">
        <view
          v-for="item in cultivationStages"
          :key="item.key"
          class="tool-picker__item"
          :class="{ 'tool-picker__item--active': item.key === stageKey }"
          hover-class="tool-picker__item--hover"
          hover-stay-time="90"
          @tap="chooseStage(item.key)"
        >{{ item.label }}</view>
      </view>
    </view>

    <view class="tool-panel">
      <view class="tool-panel__head">
        <text class="tool-panel__title">材料清单</text>
        <text class="tool-panel__hint">已备 {{ checkedCount }} / {{ stage.materials.length }}</text>
      </view>

      <view class="tool-progress">
        <view class="tool-progress__bar" :style="{ width: percent + '%' }" />
      </view>

      <view class="tool-bar">
        <view class="ct-btn ct-btn--ghost" hover-class="ct-btn--hover" @tap="resetStage">清空本阶段</view>
      </view>

      <view
        v-for="material in stage.materials"
        :key="material"
        class="tool-check"
        hover-class="tool-check--hover"
        hover-stay-time="90"
        @tap="toggleMaterial(material)"
      >
        <view class="tool-check__box" :class="{ 'tool-check__box--on': isChecked(material) }">{{ isChecked(material) ? '✓' : '' }}</view>
        <view class="tool-check__text">
          <view class="tool-check__title">{{ material }}</view>
          <view class="tool-check__desc">类别待核实 · 数量公测后开放</view>
        </view>
        <text class="ct-tag" :class="isChecked(material) ? 'ct-tag--ok' : 'ct-tag--ghost'">{{ isChecked(material) ? '已备' : '待补' }}</text>
      </view>
    </view>

    <view class="tool-panel">
      <view class="tool-panel__head">
        <text class="tool-panel__title">准备进度</text>
        <text class="tool-panel__hint">{{ stage.label }}</text>
      </view>

      <view v-if="checkedCount" class="tool-result">
        <text class="tool-result__label">当前阶段完成度</text>
        <text class="tool-result__hero">{{ percent }}%</text>
        <text class="tool-result__text">{{ statusText }}</text>
      </view>

      <view v-else class="tool-empty">
        <view class="tool-empty__icon">☑</view>
        <view class="tool-empty__title">还没有勾选任何材料</view>
        <view class="tool-empty__text">点上方材料行记录准备状态；勾选只保存在本机，可随时清空。</view>
      </view>

      <view class="tool-result__row">
        <text class="tool-result__key">经验材料消耗</text>
        <text class="tool-result__value tool-result__value--pending">公测后开放</text>
      </view>
      <view class="tool-result__row">
        <text class="tool-result__key">突破 / 技能消耗</text>
        <text class="tool-result__value tool-result__value--pending">公测后开放</text>
      </view>
    </view>
  </tool-shell>
</template>

<script setup>
import { computed, ref } from 'vue';
import { onShareAppMessage } from '@dcloudio/uni-app';
import { cultivationStages } from '@/data/tools.js';

const STORAGE_KEY = 'qbxzs:cultivation';

function readState() {
  const stored = uni.getStorageSync(STORAGE_KEY) || {};
  const stage = cultivationStages.some((item) => item.key === stored.stage) ? stored.stage : cultivationStages[0].key;
  return {
    stage,
    checkedByStage: stored.checkedByStage && typeof stored.checkedByStage === 'object' ? stored.checkedByStage : {}
  };
}

const state = ref(readState());
const stageKey = computed(() => state.value.stage);
const stage = computed(() => cultivationStages.find((item) => item.key === state.value.stage) || cultivationStages[0]);
const checkedList = computed(() => state.value.checkedByStage[stage.value.key] || []);
const checkedCount = computed(() => stage.value.materials.filter((item) => checkedList.value.includes(item)).length);
const percent = computed(() => Math.round((checkedCount.value / stage.value.materials.length) * 100));

const statusText = computed(() => {
  if (percent.value === 100) return '本阶段材料类别已全部勾选；具体数量待公测后核对。';
  return `还差 ${stage.value.materials.length - checkedCount.value} 类材料，完成度 ${percent.value}%。`;
});

function save() {
  uni.setStorageSync(STORAGE_KEY, state.value);
}

function isChecked(material) {
  return checkedList.value.includes(material);
}

function toggleMaterial(material) {
  const current = checkedList.value.slice();
  const index = current.indexOf(material);
  if (index >= 0) current.splice(index, 1);
  else current.push(material);
  const nextChecked = Object.assign({}, state.value.checkedByStage);
  nextChecked[stage.value.key] = current;
  state.value = { stage: stage.value.key, checkedByStage: nextChecked };
  save();
}

function chooseStage(key) {
  state.value = { stage: key, checkedByStage: state.value.checkedByStage };
  save();
}

function resetStage() {
  const nextChecked = Object.assign({}, state.value.checkedByStage);
  nextChecked[stage.value.key] = [];
  state.value = { stage: stage.value.key, checkedByStage: nextChecked };
  save();
  uni.showToast({ title: '已清空本阶段', icon: 'none' });
}

onShareAppMessage(() => ({ title: '养成计算 · 蓝色星原助手', path: '/pages/cultivation/cultivation' }));
</script>
