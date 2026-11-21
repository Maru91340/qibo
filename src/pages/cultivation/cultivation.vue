<template>
  <tool-shell
    title="养成计算"
    sub="选择目标阶段并勾选要准备的材料类别；具体消耗数量公测后开放，先记录你的准备进度。"
    :tags="['4 个阶段', '本机记录', '数量待定']"
    hero="linear-gradient(135deg, #1f3d9e 0%, #0aa06e 55%, #7f5bff 100%)"
  >
    <view class="tool-panel">
      <view class="tool-panel__head">
        <text class="tool-panel__title">养成清单计算</text>
        <text class="tool-panel__hint">升级经验+印记突破 → 材料缺口清单</text>
      </view>

      <view class="tool-result__row">
        <text class="tool-result__key">英雄</text>
        <picker mode="selector" :range="charNames" @change="onCharPick">
          <text class="tool-result__value">{{ charName }}（点按更换）</text>
        </picker>
      </view>
      <view class="tool-result__row">
        <text class="tool-result__key">当前等级 → 目标等级</text>
        <picker mode="selector" :range="levelOptions" @change="onFromPick">
          <text class="tool-result__value">Lv.{{ levelFrom }}</text>
        </picker>
        <text class="tool-result__key">→</text>
        <picker mode="selector" :range="levelOptions" @change="onToPick">
          <text class="tool-result__value">Lv.{{ levelTo }}</text>
        </picker>
      </view>
      <view class="cult-seg">
        <view v-for="seg in levelPresets" :key="seg.label" class="cult-seg__btn" :class="{ 'cult-seg__btn--on': seg.from === levelFrom && seg.to === levelTo }" hover-class="tap-hover" @tap="applyPreset(seg)">{{ seg.label }}</view>
      </view>
      <view class="tool-result__row">
        <text class="tool-result__key">印记突破</text>
        <picker mode="selector" :range="[1,2,3,4,5,6]" @change="onStageFromPick">
          <text class="tool-result__value">{{ stageFrom }} 阶</text>
        </picker>
        <text class="tool-result__key">→</text>
        <picker mode="selector" :range="[1,2,3,4,5,6]" @change="onStageToPick">
          <text class="tool-result__value">{{ stageTo }} 阶</text>
        </picker>
      </view>
      <view class="tool-result__row">
        <text class="tool-result__key">含符文消耗</text>
        <switch :checked="withRune" color="#d9841f" style="transform:scale(0.7)" @change="withRune = $event.detail.value" />
      </view>
      <view class="tool-result__row">
        <text class="tool-result__key">含突破材料</text>
        <switch :checked="withBreak" color="#d9841f" style="transform:scale(0.7)" @change="withBreak = $event.detail.value" />
      </view>

      <view class="cult-cards">
        <view class="cult-card">
          <text class="cult-card__num">{{ expText }}</text>
          <text class="cult-card__label">所需经验（估）</text>
        </view>
        <view class="cult-card">
          <text class="cult-card__num">{{ uniText }}</text>
          <text class="cult-card__label">所需尤尼（估）</text>
        </view>
        <view class="cult-card">
          <text class="cult-card__num">{{ matKinds }}</text>
          <text class="cult-card__label">材料种类（估）</text>
        </view>
      </view>
      <text class="panel__desc">估算说明：官方曲线未公开，锚点取自竞品实机（Lv1→60·6阶=13.7万经验/12.4万尤尼；满养成 Lv1→100·12阶=82.9万经验/16.6万尤尼），区间内线性插值，公测后校正。</text>
    </view>

    <view class="tool-panel">
      <view class="tool-panel__head">
        <text class="tool-panel__title">满养成合计</text>
        <text class="tool-result__value">Lv1→100 · 12阶 · 经验 82.9万 · 尤尼 16.6万</text>
      </view>
      <view class="tool-result__row">
        <text class="tool-result__key">材料缺口</text>
        <text class="tool-result__value">距满养成 {{ gapPercent }}%</text>
      </view>
      <view class="tool-result__row">
        <text class="tool-result__key">材料获取途径</text>
        <text class="tool-result__value">体力效率推荐 · 5 条（材料详情页可查）</text>
      </view>
    </view>

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
import { cultivationStages, charNameList } from '@/data/tools.js';

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

onShareAppMessage(() => ({ title: '养成计算 · 奇波小助手', path: '/pages/cultivation/cultivation' }));

// 养成清单计算（锚点线性估算，锚点来自竞品实机）
const charNames = ref(charNameList);
const charName = ref('寒悠悠');
const levelOptions = Array.from({ length: 100 }, (_, i) => i + 1);
const levelFrom = ref(1);
const levelTo = ref(60);
const stageFrom = ref(1);
const stageTo = ref(6);
const withRune = ref(true);
const withBreak = ref(true);
const levelPresets = [
  { label: '1→60', from: 1, to: 60 },
  { label: '1→80', from: 1, to: 80 },
  { label: '60→100', from: 60, to: 100 },
  { label: '满级 1→100', from: 1, to: 100 }
];
const ANCHOR = { exp60: 137000, uni60: 124000, exp100: 829000, uni100: 166000, kinds60: 30 };

function lerpCost(fromLv, toLv, anchorTotal, splitLv) {
  if (fromLv >= toLv) return 0;
  const perLow = anchorTotal / (splitLv - 1);
  const perHigh = (ANCHOR.exp100 - anchorTotal) / (100 - splitLv) || perLow;
  let total = 0;
  for (let lv = fromLv + 1; lv <= toLv; lv++) {
    total += lv <= splitLv ? perLow : perHigh;
  }
  return Math.round(total);
}

const expText = computed(() => {
  const v = lerpCost(levelFrom.value, levelTo.value, ANCHOR.exp60, 60);
  return v >= 10000 ? (v / 10000).toFixed(1) + '万' : String(v);
});
const uniText = computed(() => {
  const base = lerpCost(levelFrom.value, levelTo.value, ANCHOR.uni60, 60);
  const v = withRune.value ? base : Math.round(base * 0.85);
  return v >= 10000 ? (v / 10000).toFixed(1) + '万' : String(v);
});
const matKinds = computed(() => {
  const stageDelta = Math.max(stageTo.value - stageFrom.value, 0);
  const kindBase = Math.round((ANCHOR.kinds60 * stageDelta) / 5) || 0;
  const levelAdd = levelTo.value > 60 ? 5 : 0;
  return withBreak.value ? kindBase + levelAdd : Math.max(kindBase - 6, 0);
});
const gapPercent = computed(() => {
  const full = 100;
  const cur = Math.round(((levelTo.value - levelFrom.value) / (full - 1)) * 100);
  return Math.max(full - cur, 0);
});
function applyPreset(seg) {
  levelFrom.value = seg.from;
  levelTo.value = seg.to;
}
function onCharPick(event) {
  charName.value = charNames.value[Number(event.detail.value)] || charName.value;
}
function onFromPick(event) {
  levelFrom.value = levelOptions[Number(event.detail.value)] || 1;
}
function onToPick(event) {
  levelTo.value = levelOptions[Number(event.detail.value)] || 60;
}
function onStageFromPick(event) {
  stageFrom.value = [1,2,3,4,5,6][Number(event.detail.value)] || 1;
}
function onStageToPick(event) {
  stageTo.value = [1,2,3,4,5,6][Number(event.detail.value)] || 6;
}
</script>
