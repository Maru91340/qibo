<template>
  <view class="page" :class="{ 'theme-dark': isDark }">
    <view class="page-hero" :style="{ background: 'linear-gradient(132deg, #262c54 0%, #e0553f 58%, #7f5bff 100%)' }">
      <view class="page-hero__inner">
        <text class="page-hero__eyebrow">信息查询</text>
        <view class="page-hero__title">战斗词条</view>
        <view class="page-hero__sub">按机制、输出、增益、减益四类整理释义，点开条目看作用与叠加方式。</view>
        <view class="page-hero__meta">
          <text class="page-hero__tag">四类词条</text>
          <text class="page-hero__tag">点击展开</text>
        </view>
      </view>
    </view>


    <view class="chip-row af-cats">
      <view
        v-for="option in categories"
        :key="option"
        class="facet-chip"
        :class="{ 'facet-chip--active': option === category }"
        hover-class="facet-chip--hover" hover-stay-time="90" @tap="category = option"
      >
        {{ option }}
      </view>
    </view>

    <view v-for="group in list" :key="group.name" class="panel card">
      <view class="panel__title">{{ group.name }}</view>
      <view
        v-for="entry in group.items"
        :key="entry.id"
        class="af-item"
        hover-class="af-item--hover"
        hover-stay-time="90"
        @tap="openId = openId === entry.id ? '' : entry.id"
      >
        <view class="af-item__head">
          <text class="af-item__name">{{ entry.name }}</text>
          <view class="af-item__tags">
            <text v-for="tag in entry.tags" :key="tag" class="mini-tag">{{ tag }}</text>
          </view>
          <text class="af-item__arrow" :class="{ 'af-item__arrow--open': openId === entry.id }">›</text>
        </view>
        <view class="af-item__summary">{{ entry.summary }}</view>
        <view v-if="openId === entry.id" class="af-item__detail">
          <view v-if="entry.desc" class="af-item__desc">{{ entry.desc }}</view>
          <view v-for="field in entry.fields" :key="field.label" class="kv__row">
            <text class="kv__key">{{ field.label }}</text>
            <text class="kv__value">{{ field.value }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="!list.length" class="af-empty">没有匹配的词条</view>
    <view class="footnote">{{ notice }}</view>
  </view>
</template>

<script setup>
import { useTheme } from '@/utils/theme.js';

const { isDark } = useTheme();
import { computed, ref } from 'vue';
import { onShareAppMessage } from '@dcloudio/uni-app';
import { getCatalog, onCatalogUpdate } from '@/services/content.js';

const category = ref('全部');
const openId = ref('');
const catalog = ref({ items: [], notice: '' });

const items = computed(() => catalog.value.items || []);
const notice = computed(() => catalog.value.notice || '');

const categories = computed(() => {
  const seen = new Map();
  items.value.forEach((item) => {
    if (item.category) seen.set(item.category, (seen.get(item.category) || 0) + 1);
  });
  return ['全部', ...[...seen.keys()].sort((a, b) => seen.get(b) - seen.get(a))];
});

const list = computed(() => {
  const groups = new Map();
  items.value
    .filter((item) => category.value === '全部' || item.category === category.value)
    .forEach((item) => {
      const key = item.category || '其他';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });
  return [...groups.entries()].map(([name, groupItems]) => ({ name, items: groupItems }));
});

function reload() {
  catalog.value = getCatalog('affix').data || { items: [], notice: '' };
}

reload();
onCatalogUpdate(reload);

onShareAppMessage(() => ({ title: '战斗词条 · 蓝色星原助手', path: '/pages/affix/affix' }));
</script>

<style>
.af-lead .panel__desc {
  line-height: 1.6;
}

.af-cats {
  padding: 4rpx 0;
}


.af-item {
  padding: 18rpx 0;
  border-bottom: 1rpx solid var(--line);
  transition: background 0.2s ease;
}

.af-item--hover {
  background: var(--soft);
}

.af-item__detail {
  animation: cl-fade-in 0.22s ease both;
}

.af-item:last-child {
  border-bottom: none;
}

.af-item__head {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.af-item__name {
  font-size: 27rpx;
  font-weight: 600;
  color: var(--ink);
}

.af-item__tags {
  flex: 1;
  display: flex;
  gap: 10rpx;
  flex-wrap: wrap;
}

.mini-tag {
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  background: var(--brand-soft);
  color: var(--brand);
  font-size: 20rpx;
}

.af-item__arrow {
  color: var(--ink-3);
  font-size: 30rpx;
  transform: rotate(90deg);
  transition: transform 0.2s ease;
}

.af-item__arrow--open {
  transform: rotate(-90deg);
}

.af-item__summary {
  margin-top: 8rpx;
  color: var(--ink-2);
  font-size: 24rpx;
  line-height: 1.55;
}

.af-item__detail {
  margin-top: 12rpx;
  padding: 14rpx 18rpx;
  border-radius: 14rpx;
  background: var(--soft);
}

.af-item__desc {
  color: var(--ink-2);
  font-size: 24rpx;
  line-height: 1.6;
  margin-bottom: 6rpx;
}

.af-empty {
  padding: 80rpx 0;
  text-align: center;
  color: var(--ink-3);
  font-size: 25rpx;
}
</style>
