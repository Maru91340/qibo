<template>
  <view class="page" :class="{ 'theme-dark': isDark }">
    <template v-if="item">
      <view class="head hero">
        <view class="hero__inner">
          <view class="head__top">
            <view class="head__dot" :style="{ background: item.elementColor }">{{ item.elementName }}</view>
            <view class="head__text">
              <view class="head__name">{{ item.name }}</view>
              <view class="head__sub">{{ item.title }} · {{ item.role }} · {{ item.rarity }}</view>
            </view>
          </view>
          <view class="head__tags">
            <text class="head__tag">{{ item.elementLabel }}</text>
            <text v-for="team in item.teams" :key="team" class="head__tag">{{ team }}</text>
            <text v-if="!item.verified" class="head__tag">示例数据</text>
          </view>
        </view>
      </view>

      <view class="panel card">
        <view class="panel__title">角色简介</view>
        <view class="panel__desc panel__desc--first">{{ item.desc }}</view>
        <view class="kv__row">
          <text class="kv__key">元素</text>
          <text class="kv__value">{{ item.elementLabel }}</text>
        </view>
        <view class="kv__row">
          <text class="kv__key">定位</text>
          <text class="kv__value">{{ item.role }}</text>
        </view>
        <view class="kv__row">
          <text class="kv__key">稀有度</text>
          <text class="kv__value">{{ item.rarity }}</text>
        </view>
      </view>

      <view class="panel card">
        <view class="panel__title">技能组</view>
        <view v-for="skill in item.skills" :key="skill.name" class="skill">
          <view class="skill__head">
            <text class="skill__name">{{ skill.name }}</text>
            <t-tag size="small" variant="light" theme="primary">{{ skill.type }}</t-tag>
          </view>
          <view class="skill__desc">{{ skill.desc }}</view>
        </view>
      </view>

      <view class="panel card">
        <view class="panel__title">元素相克参考</view>
        <view class="counter">
          <view class="counter__col">
            <text class="counter__label">克制</text>
            <text class="counter__value">{{ counters.strongText }}</text>
          </view>
          <view class="counter__col">
            <text class="counter__label">被克</text>
            <text class="counter__value">{{ counters.weakText }}</text>
          </view>
        </view>
        <view class="panel__desc panel__desc--first">{{ elementNotice }}</view>
      </view>

      <view class="detail__foot">
        <t-button
          block
          :theme="inTeam ? 'default' : 'primary'"
          :variant="inTeam ? 'outline' : 'base'"
          @tap="toggleTeam"
        >
          {{ inTeam ? '移出队伍' : '编入队伍' }}
        </t-button>
      </view>

      <view class="footnote">{{ notice }}</view>
    </template>
    <t-empty v-else description="未找到该角色" />
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
import { load, toggleMember } from '@/utils/team.js';

const id = ref('');
const catalog = ref({ items: [], notice: '' });
const toolkit = ref(createElementToolkit(getCatalog('element').data));
const inTeam = ref(false);

const item = computed(() =>
  decorateWithElement(findById(catalog.value.items, id.value), toolkit.value.elementMap)
);
const notice = computed(() => catalog.value.notice || '');
const elementNotice = computed(() => toolkit.value.notice);

const labels = (keys) =>
  (keys || []).map((key) => (toolkit.value.elementMap[key] || {}).label).filter(Boolean).join('、') || '无';

const counters = computed(() => {
  const current = item.value || {};
  return {
    strongText: labels(toolkit.value.counters[current.element]),
    weakText: labels(toolkit.value.counteredBy[current.element])
  };
});

function reload() {
  catalog.value = getCatalog('character').data || { items: [], notice: '' };
  toolkit.value = createElementToolkit(getCatalog('element').data);
  inTeam.value = load().members.indexOf(id.value) >= 0;
  if (item.value) uni.setNavigationBarTitle({ title: item.value.name });
}

function toggleTeam() {
  const result = toggleMember(load(), id.value);
  if (result.error) {
    uni.showToast({ title: result.error, icon: 'none' });
    return;
  }
  inTeam.value = result.team.members.indexOf(id.value) >= 0;
  uni.showToast({ title: inTeam.value ? '已编入队伍' : '已移出队伍', icon: 'none' });
}

let unsubscribe = null;
onLoad((options) => {
  id.value = (options && options.id) || '';
  reload();
  if (!item.value) uni.setNavigationBarTitle({ title: '角色不存在' });
});
unsubscribe = onCatalogUpdate(reload);
onUnload(() => unsubscribe && unsubscribe());
onShareAppMessage(() => ({
  title: `角色图鉴 · ${item.value ? item.value.name : '蓝色星原'}`,
  path: `/pages/character/detail?id=${id.value}`
}));
</script>

<style>
.skill {
  padding: 20rpx 0;
  border-bottom: 1rpx solid var(--line);
}

.skill:last-child {
  border-bottom: none;
}

.skill__head {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.skill__name {
  font-size: 27rpx;
  font-weight: 600;
}

.skill__desc {
  margin-top: 10rpx;
  color: var(--ink-2);
  font-size: 24rpx;
  line-height: 1.65;
}

.counter {
  display: flex;
  gap: 20rpx;
}

.counter__col {
  flex: 1;
  padding: 22rpx 24rpx;
  border-radius: var(--radius-md);
  background: var(--soft);
}

.counter__label {
  color: var(--ink-3);
  font-size: 22rpx;
}

.counter__value {
  display: block;
  margin-top: 10rpx;
  font-size: 26rpx;
  font-weight: 600;
}
</style>
