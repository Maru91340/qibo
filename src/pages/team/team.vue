<template>
  <view class="page" :class="{ 'theme-dark': isDark }">
    <view class="team-head card">
      <view class="team-head__row">
        <view class="team-head__name">{{ team.name }}</view>
        <text class="team-head__edit" hover-class="tap-hover" @tap="rename">改名</text>
      </view>
      <view class="team-head__meta">
        <text>{{ team.members.length }}/{{ MAX_MEMBERS }} 角色</text>
        <text class="dot">·</text>
        <text>{{ team.qibos.length }}/{{ MAX_QIBO }} 奇波</text>
        <text class="dot">·</text>
        <text>{{ updatedText }}</text>
      </view>
      <view class="coverage">
        <view v-for="item in summary.elements" :key="item.key" class="coverage__item">
          <view class="coverage__dot" :style="{ background: item.color }">{{ item.name }}</view>
          <text>{{ item.label }}</text>
        </view>
        <text v-if="!summary.elements.length" class="coverage__empty">尚未编入任何元素</text>
      </view>
    </view>

    <view class="section-title">
      <text>角色位</text>
      <text class="section-title__more">{{ summary.coverage }}</text>
    </view>

    <view v-if="counterHints.length" class="counter-hints">
      <view v-for="hint in counterHints" :key="hint.key" class="counter-hints__row">
        <view class="counter-hints__tag" :style="{ color: hint.color, background: hint.tint }">{{ hint.name }}</view>
        <text class="counter-hints__text">克制 {{ hint.targets }}</text>
      </view>
    </view>
    <view v-else class="counter-hints counter-hints--empty">
      <text class="counter-hints__text">选择角色后展示其克制目标（克制 ×1.25，被克 ×0.75）</text>
    </view>

    <view class="slots">
      <template v-for="slot in memberViews" :key="slot.key">
        <view v-if="slot.data" class="slot slot--filled" hover-class="tap-hover" @tap="goDetail('character', slot.data.id)">
          <view class="slot__badge" :style="{ color: slot.data.elementColor, background: slot.data.elementTint }">
            {{ slot.data.elementName }}
          </view>
          <view class="slot__name">{{ slot.data.name }}</view>
          <view class="slot__role">{{ slot.data.role }}</view>
          <view class="slot__remove" hover-class="tap-hover" @tap.stop="removeMember(slot.data.id)">
            <c-icon name="close" size="26rpx" color="var(--ink-3)" />
          </view>
        </view>
        <view v-else class="slot slot--empty" hover-class="tap-hover" @tap="openPicker('character')">
          <c-icon name="add" size="44rpx" color="var(--ink-3)" />
          <text class="slot__hint">添加角色</text>
        </view>
      </template>
    </view>

    <view class="section-title">
      <text>出战奇波</text>
      <text class="section-title__more">{{ MAX_QIBO }} 只编成</text>
    </view>

    <view class="slots">
      <template v-for="slot in qiboViews" :key="slot.key">
        <view v-if="slot.data" class="slot slot--filled" hover-class="tap-hover" @tap="goDetail('qibo', slot.data.id)">
          <view class="slot__badge" :style="{ color: slot.data.elementColor, background: slot.data.elementTint }">
            {{ slot.data.elementName }}
          </view>
          <view class="slot__name">{{ slot.data.name }}</view>
          <view class="slot__role">{{ slot.data.role }}</view>
          <view class="slot__remove" hover-class="tap-hover" @tap.stop="removeQibo(slot.data.id)">
            <c-icon name="close" size="26rpx" color="var(--ink-3)" />
          </view>
        </view>
        <view v-else class="slot slot--empty" hover-class="tap-hover" @tap="openPicker('qibo')">
          <c-icon name="add" size="44rpx" color="var(--ink-3)" />
          <text class="slot__hint">添加奇波</text>
        </view>
      </template>
    </view>

    <view class="panel card">
      <view class="panel__title">编队检查</view>
      <view class="checks">
        <view v-for="check in checks" :key="check.label" class="check" :class="{ 'check--ok': check.ok }">
          <c-icon :name="check.ok ? 'check-circle-filled' : 'close-circle'" size="30rpx" />
          <text>{{ check.label }}</text>
        </view>
      </view>
    </view>

    <view class="actions">
      <view class="cx-btn cx-btn--outline" hover-class="tap-hover" @tap="openPicker('character')">
        继续添加角色
      </view>
      <view class="cx-btn cx-btn--ghost" hover-class="tap-hover" @tap="clearTeam">清空队伍</view>
    </view>

    <view v-if="!team.members.length && !team.qibos.length" class="cx-empty"><view class="cx-empty__icon">🐾</view><view class="cx-empty__text">还没有编入角色，先去角色图鉴挑几位</view></view>

    <view v-if="pickerVisible" class="cx-overlay" @tap="pickerVisible = false">
      <view class="cx-sheet" @tap.stop>
      <view class="picker">
        <view class="picker__head">
          <text class="picker__title">{{ pickerType === 'qibo' ? '选择出战奇波' : '选择角色' }}</text>
          <text class="picker__close" hover-class="tap-hover" @tap="pickerVisible = false">完成</text>
        </view>
        <scroll-view class="picker__list" scroll-y>
          <view
            v-for="item in pickerItems"
            :key="item.id"
            class="picker__item"
            hover-class="tap-hover"
            :class="{ 'picker__item--off': item.disabled }"
            @tap="pickItem(item)"
          >
            <view class="picker__badge" :style="{ color: item.elementColor, background: item.elementTint }">
              {{ item.elementName }}
            </view>
            <view class="picker__body">
              <view class="picker__name">{{ item.name }}</view>
              <view class="picker__desc">{{ item.desc }}</view>
            </view>
            <c-icon v-if="item.added" name="check" size="34rpx" color="var(--brand)" />
            <c-icon v-else name="add-circle" size="34rpx" color="var(--ink-3)" />
          </view>
        </scroll-view>
      </view>
          </view>
    </view>
  </view>
</template>

<script setup>
import { useTheme } from '@/utils/theme.js';

const { isDark } = useTheme();
import { computed, ref } from 'vue';
import { onLoad, onShow, onUnload, onShareAppMessage } from '@dcloudio/uni-app';
import { getCatalog, onCatalogUpdate } from '@/services/content.js';
import { createElementToolkit } from '@/data/element.js';
import { formatTime } from '@/utils/format.js';
import {
  load,
  reset,
  save,
  summarize,
  toggleMember,
  toggleQibo,
  MAX_MEMBERS,
  MAX_QIBO
} from '@/utils/team.js';

const emptySummary = { elements: [], roles: [], coverage: '', hasCarry: false, hasHealer: false, elementCount: 0 };

const team = ref(load());
const summary = ref(emptySummary);
const characterIndex = ref({});
const qiboIndex = ref({});
const toolkit = ref(createElementToolkit(getCatalog('element').data));
const pickerVisible = ref(false);
const pickerType = ref('character');
const pickerItems = ref([]);

const updatedText = computed(() =>
  team.value.updatedAt ? `更新于 ${formatTime(team.value.updatedAt)}` : '未保存'
);

const memberViews = computed(() => slots(team.value.members, characterIndex.value, MAX_MEMBERS));
const qiboViews = computed(() => slots(team.value.qibos, qiboIndex.value, MAX_QIBO));

// R2-8 克制提示（对齐竞品队伍编成「克制提示」区块：展示出战角色元素的克制目标）
const counterHints = computed(() => {
  const seen = new Set();
  const hints = [];
  team.value.members.forEach((id) => {
    const item = characterIndex.value[id];
    const key = item && item.element;
    if (!key || seen.has(key)) return;
    const element = toolkit.value.elementMap[key];
    const targets = (toolkit.value.counters && toolkit.value.counters[key]) || [];
    if (!element || !targets.length) return;
    seen.add(key);
    hints.push({
      key,
      name: element.name || key,
      color: element.color || '#2f9bff',
      tint: element.tint || '#eaf4ff',
      targets: targets
        .map((t) => (toolkit.value.elementMap[t] || {}).name || t)
        .join('、')
    });
  });
  return hints;
});

const checks = computed(() => [
  { label: '有明确输出位', ok: summary.value.hasCarry },
  { label: '有生存位（辅助/坦克）', ok: summary.value.hasHealer },
  { label: '元素覆盖 ≥ 3 系', ok: summary.value.elementCount >= 3 },
  { label: '已带出战奇波', ok: team.value.qibos.length > 0 }
]);

function withElement(item) {
  if (!item) return null;
  const element = toolkit.value.elementMap[item.element] || {};
  return {
    id: item.id,
    name: item.name,
    role: item.role || item.kind,
    desc: item.title || item.habitat,
    elementName: element.name || '—',
    elementColor: element.color || 'var(--ink-2)',
    elementTint: element.tint || 'var(--soft)'
  };
}

function slots(ids, map, max) {
  const views = [];
  for (let i = 0; i < max; i += 1) {
    const id = ids[i];
    views.push({ key: `slot-${i}`, data: id ? withElement(map[id]) : null });
  }
  return views;
}

function buildItems(items, selectedIds, isFull) {
  return (items || []).map((item) => {
    const added = selectedIds.indexOf(item.id) >= 0;
    return Object.assign({}, withElement(item), { added, disabled: isFull && !added });
  });
}

function refreshPicker() {
  if (pickerType.value === 'qibo') {
    pickerItems.value = buildItems(catalogItems('qibo'), team.value.qibos, false);
    return;
  }
  const isFull = team.value.members.length >= MAX_MEMBERS;
  pickerItems.value = buildItems(catalogItems('character'), team.value.members, isFull);
}

function catalogItems(type) {
  return (getCatalog(type).data || {}).items || [];
}

function indexById(items) {
  return (items || []).reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});
}

function refresh() {
  characterIndex.value = indexById(catalogItems('character'));
  qiboIndex.value = indexById(catalogItems('qibo'));
  toolkit.value = createElementToolkit(getCatalog('element').data);
  team.value = load();
  summary.value = summarize(team.value, characterIndex.value, qiboIndex.value, toolkit.value.elementMap);
  if (pickerVisible.value) refreshPicker();
}

function openPicker(type) {
  pickerType.value = type;
  pickerVisible.value = true;
  refreshPicker();
}

function pickItem(item) {
  if (item.disabled) return;
  if (pickerType.value === 'qibo') {
    toggleQibo(load(), item.id);
  } else {
    const wasAdded = team.value.members.indexOf(item.id) >= 0;
    const result = toggleMember(load(), item.id);
    if (result.error) {
      uni.showToast({ title: result.error, icon: 'none' });
      return;
    }
    uni.showToast({ title: wasAdded ? '已移出队伍' : '已编入队伍', icon: 'none' });
  }
  refresh();
  refreshPicker();
}

function removeMember(id) {
  toggleMember(load(), id);
  refresh();
}

function removeQibo(id) {
  toggleQibo(load(), id);
  refresh();
}

function goDetail(type, id) {
  // 阶段5：奇波/角色详情唯一入口在分包；其余图鉴仍在主包
  if (type === 'character') return uni.navigateTo({ url: `/pkg-character/detail?id=${id}` });
  if (type === 'qibo') return uni.navigateTo({ url: `/pkg-qibo/detail?id=${id}` });
  uni.navigateTo({ url: `/pages/${type}/detail?id=${id}` });
}

function rename() {
  uni.showModal({
    title: '队伍名称',
    editable: true,
    placeholderText: team.value.name,
    success: (res) => {
      const name = (res.content || '').trim();
      if (!res.confirm || !name) return;
      save(Object.assign({}, load(), { name }));
      refresh();
    }
  });
}

function clearTeam() {
  uni.showModal({
    title: '清空队伍',
    content: '将清除本地保存的角色与出战奇波，确定继续？',
    confirmColor: '#d54941',
    success: (res) => {
      if (!res.confirm) return;
      team.value = reset();
      refresh();
      uni.showToast({ title: '已清空', icon: 'none' });
    }
  });
}

let unsubscribe = null;
onLoad(refresh);
onShow(refresh);
unsubscribe = onCatalogUpdate(refresh);
onUnload(() => unsubscribe && unsubscribe());
onShareAppMessage(() => ({ title: `我的队伍：${team.value.name} · 奇波小助手`, path: '/pages/index/index' }));
</script>

<style>
.team-head {
  padding: 30rpx 28rpx;
  margin-bottom: 8rpx;
}

.team-head__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.team-head__name {
  font-size: 36rpx;
  font-weight: 700;
}

.team-head__edit {
  display: inline-flex;
  align-items: center;
  min-height: 64rpx;
  padding: 0 20rpx;
  border-radius: 999rpx;
  background: var(--brand-soft);
  color: var(--brand-deep);
  font-size: 22rpx;
}

.team-head__meta {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-top: 12rpx;
  color: var(--ink-3);
  font-size: 22rpx;
}

.team-head__meta .dot {
  color: var(--ink-3);
}

.coverage {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 20rpx;
  margin-top: 24rpx;
}

.counter-hints {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx 20rpx;
  margin-top: 14rpx;
}

.counter-hints--empty {
  opacity: 0.7;
}

.counter-hints__row {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
}

.counter-hints__tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44rpx;
  height: 36rpx;
  padding: 0 10rpx;
  border-radius: 8rpx;
  font-size: 20rpx;
  font-weight: 600;
}

.counter-hints__text {
  color: var(--ink-2);
  font-size: 22rpx;
}

.coverage__item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  color: var(--ink-2);
  font-size: 23rpx;
}

.coverage__dot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  color: #fff;
  font-size: 22rpx;
  font-weight: 600;
}

.coverage__empty {
  color: var(--ink-3);
  font-size: 23rpx;
}

.slots {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18rpx;
}

.slot {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-sizing: border-box;
  min-height: 200rpx;
  padding: 22rpx 12rpx;
  border-radius: var(--radius-md);
  background: var(--card-bg);
  box-shadow: var(--shadow-card);
}

.slot--empty {
  justify-content: center;
  gap: 10rpx;
  border: 2rpx dashed var(--line);
  background: var(--soft);
  box-shadow: none;
}

.slot__hint {
  color: var(--ink-3);
  font-size: 22rpx;
}

.slot__badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 68rpx;
  height: 68rpx;
  border-radius: 20rpx;
  font-size: 30rpx;
  font-weight: 700;
}

.slot__name {
  margin-top: 14rpx;
  max-width: 100%;
  overflow: hidden;
  font-size: 25rpx;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.slot__role {
  margin-top: 6rpx;
  color: var(--ink-3);
  font-size: 21rpx;
}

.slot__remove {
  position: absolute;
  top: 4rpx;
  right: 4rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: var(--soft);
}

.checks {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.check {
  display: flex;
  align-items: center;
  gap: 12rpx;
  color: var(--ink-3);
  font-size: 25rpx;
}

.check--ok {
  color: var(--ok);
}

.actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  margin: 32rpx 0 8rpx;
  /* 9.5 / T01：双按钮等宽分布，避免短文案描边按钮贴边与基线错位（P1 修复） */
  padding: 0 8rpx;
}

.actions .cx-btn {
  flex: 1;
}

.picker {
  display: flex;
  flex-direction: column;
  max-height: 72vh;
  padding: 28rpx 28rpx calc(28rpx + env(safe-area-inset-bottom));
  border-radius: 32rpx 32rpx 0 0;
  background: var(--card-bg);
}

.picker__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 20rpx;
}

.picker__title {
  font-size: 32rpx;
  font-weight: 700;
}

.picker__close {
  display: inline-flex;
  align-items: center;
  min-height: 64rpx;
  padding: 0 12rpx;
  color: var(--brand);
  font-size: 26rpx;
}

.picker__list {
  flex: 1;
  max-height: 58vh;
}

.picker__item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx 8rpx;
  border-bottom: 1rpx solid var(--line);
}

.picker__item--off {
  opacity: 0.45;
}

.picker__badge {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
  border-radius: 18rpx;
  font-size: 28rpx;
  font-weight: 700;
}

.picker__body {
  flex: 1;
  min-width: 0;
}

.picker__name {
  font-size: 28rpx;
  font-weight: 600;
}

.picker__desc {
  margin-top: 6rpx;
  overflow: hidden;
  color: var(--ink-3);
  font-size: 22rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
