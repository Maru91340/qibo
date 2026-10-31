<template>
  <view class="page" :class="{ 'theme-dark': isDark }">
    <template v-if="item">
      <view class="head hero">
        <view class="hero__inner">
          <view class="head__top">
            <view class="head__dot" :style="{ background: item.elementColor }">{{ item.elementName }}</view>
            <view class="head__text">
              <view class="head__name">{{ item.name }}</view>
              <view class="head__sub">{{ item.kind }} · {{ item.rarity }}形态</view>
            </view>
          </view>
          <view class="head__tags">
            <text v-for="use in item.usage" :key="use" class="head__tag">{{ use }}</text>
            <text v-if="!item.verified" class="head__tag">数据待核实</text>
          </view>
        </view>
      </view>

      <view class="panel card">
        <view class="panel__title">基础信息</view>
        <view class="kv__row">
          <text class="kv__key">栖息地</text>
          <text class="kv__value">{{ item.habitat }}</text>
        </view>
        <view class="kv__row">
          <text class="kv__key">定位</text>
          <text class="kv__value">{{ item.kind }}</text>
        </view>
        <view class="kv__row">
          <text class="kv__key">元素</text>
          <text class="kv__value">{{ item.elementLabel }}</text>
        </view>
        <view class="kv__row">
          <text class="kv__key">进化阶段</text>
          <text class="kv__value">{{ item.stages.length }} 阶</text>
        </view>
        <view class="panel__desc">{{ item.desc }}</view>
      </view>

      <view class="panel card">
        <view class="panel__title">进化链</view>
        <view class="stages">
          <view v-for="(stage, index) in item.stages" :key="stage" class="stage">
            <view class="stage__dot">{{ index + 1 }}</view>
            <view class="stage__name">{{ stage }}</view>
          </view>
        </view>
        <template v-if="item.forms.length">
          <view class="panel__sub">稀有形态</view>
          <view class="chip-row">
            <text v-for="form in item.forms" :key="form" class="chip">{{ form }}</text>
          </view>
        </template>
      </view>

      <view class="panel card">
        <view class="panel__title">能力与玩法</view>
        <view v-for="skill in item.skills" :key="skill" class="skill">
          <c-icon name="star" size="30rpx" color="#2f6bff" />
          <text class="skill__name">{{ skill }}</text>
        </view>
      </view>

      <view class="detail__foot">
        <view
          class="cx-btn"
          :class="inTeam ? 'cx-btn--outline' : 'cx-btn--primary'"
          hover-class="tap-hover"
          @tap="toggleTeam"
        >
          {{ inTeam ? '移出出战奇波' : '设为出战奇波' }}
        </view>
      </view>

      <view class="footnote">{{ notice }}</view>
    </template>
    <view class="cx-empty"><view class="cx-empty__icon">🐾</view><view class="cx-empty__text">未找到该奇波</view></view>
  </view>
</template>

<script setup>
import { useTheme } from '@/utils/theme.js';

const { isDark } = useTheme();
import { computed, ref } from 'vue';
import { onLoad, onUnload, onShareAppMessage } from '@dcloudio/uni-app';
import { getCatalog, onCatalogUpdate } from '@/services/content.js';
import { createElementToolkit } from '@/data/element.js';
import { decorateWithElement, findById } from '@/utils/query.js';
import { load, toggleQibo } from '@/utils/team.js';

const id = ref('');
const catalog = ref({ items: [], notice: '' });
const toolkit = ref(createElementToolkit(getCatalog('element').data));
const inTeam = ref(false);

const item = computed(() =>
  decorateWithElement(findById(catalog.value.items, id.value), toolkit.value.elementMap)
);
const notice = computed(() => catalog.value.notice || '');

function reload() {
  catalog.value = getCatalog('qibo').data || { items: [], notice: '' };
  toolkit.value = createElementToolkit(getCatalog('element').data);
  inTeam.value = load().qibos.indexOf(id.value) >= 0;
}

function toggleTeam() {
  const next = toggleQibo(load(), id.value);
  inTeam.value = next.qibos.indexOf(id.value) >= 0;
  uni.showToast({ title: inTeam.value ? '已设为出战' : '已移出出战', icon: 'none' });
}

let unsubscribe = null;
onLoad((options) => {
  id.value = (options && options.id) || '';
  reload();
  if (!item.value) uni.setNavigationBarTitle({ title: '奇波不存在' });
});
unsubscribe = onCatalogUpdate(reload);
onUnload(() => unsubscribe && unsubscribe());
onShareAppMessage(() => ({
  title: `奇波图鉴 · ${item.value ? item.value.name : '蓝色星原'}`,
  path: `/pages/qibo/detail?id=${id.value}`
}));
</script>

<style>
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
  gap: 12rpx;
}

.stage:not(:last-child)::after {
  content: "";
  position: absolute;
  top: 26rpx;
  left: calc(50% + 34rpx);
  width: calc(100% - 68rpx);
  height: 2rpx;
  background: linear-gradient(90deg, var(--ink-3), var(--line));
}

.stage__dot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 54rpx;
  height: 54rpx;
  border-radius: 50%;
  background: var(--brand-soft);
  color: var(--brand-deep);
  font-size: 24rpx;
  font-weight: 600;
}

.stage:last-child .stage__dot {
  background: var(--brand);
  color: #fff;
}

.stage__name {
  color: var(--ink-2);
  font-size: 22rpx;
}

.skill {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx solid var(--line);
}

.skill:last-child {
  border-bottom: none;
}

.skill__name {
  font-size: 26rpx;
}
</style>
