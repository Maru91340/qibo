<template>
  <view class="page" :class="{ 'theme-dark': isDark }">
    <view class="stat-row card">
      <view class="stat">
        <view class="stat__num">{{ items.length }}</view>
        <view class="stat__label">成就总数</view>
      </view>
      <view class="stat">
        <view class="stat__num">{{ categories.length - 1 }}</view>
        <view class="stat__label">成就大类</view>
      </view>
      <view class="stat">
        <view class="stat__num">{{ totalPoints }}</view>
        <view class="stat__label">成就点数</view>
      </view>
    </view>

    <view class="filter-bar card">
      <view class="ac-search">
        <text class="ac-search__icon">⌕</text>
        <input
          class="ac-search__input"
          :value="keyword"
          placeholder="搜成就名称、完成条件"
          confirm-type="search"
          placeholder-class="ac-search__ph"
          @input="keyword = $event.detail.value"
        />
      </view>
      <view v-if="categories.length" class="chip-row ac-cats">
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
    </view>

    <view class="list-head">
      <text>共 {{ totalCount }} 条成就</text>
      <text class="text-muted">{{ category === '全部' ? '全部分类' : category }}</text>
    </view>

    <view v-for="group in list" :key="group.name" class="panel card">
      <view class="panel__title">{{ group.name }}</view>
      <view
        v-for="entry in group.items"
        :key="entry.id"
        class="ac-item"
        :class="{ 'ac-item--open': openId === entry.id }"
        hover-class="ac-item--hover"
        hover-stay-time="90"
        @tap="openId = openId === entry.id ? '' : entry.id"
      >
        <view class="ac-item__head">
          <text class="ac-item__name">{{ entry.name }}</text>
          <view class="ac-item__tags">
            <text v-if="entry.rarity" class="mini-tag mini-tag--cup">{{ entry.rarity }}</text>
            <text v-if="entry.verified === false" class="mini-tag mini-tag--warn">待核实</text>
          </view>
        </view>
        <view class="ac-item__cond">{{ entry.summary || '完成条件待补充' }}</view>
        <view v-if="openId === entry.id" class="ac-item__detail">
          <view v-for="field in entry.fields" :key="field.label" class="kv__row">
            <text class="kv__key">{{ field.label }}</text>
            <text class="kv__value">{{ field.value }}</text>
          </view>
          <view v-if="entry.desc && entry.desc !== entry.summary" class="ac-item__desc">{{ entry.desc }}</view>
        </view>
      </view>
    </view>

    <view v-if="!list.length" class="ac-empty">没有符合条件的成就，试试换个关键词</view>
    <view class="footnote">{{ notice }}</view>
  </view>
</template>

<script setup>
import { useTheme } from '@/utils/theme.js';

const { isDark } = useTheme();
import { computed, ref } from 'vue';
import { onShareAppMessage } from '@dcloudio/uni-app';
import { getCatalog, onCatalogUpdate } from '@/services/content.js';

const keyword = ref('');
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

const totalCount = computed(() =>
  list.value.reduce((sum, group) => sum + group.items.length, 0)
);

const totalPoints = computed(() =>
  items.value.reduce((sum, item) => {
    const point = (item.fields || []).filter((field) => field.label === '成就点数')[0];
    const value = point ? parseInt(point.value, 10) : 0;
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0)
);

const list = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  const filtered = items.value.filter((item) => {
    if (category.value !== '全部' && item.category !== category.value) return false;
    if (kw) {
      const haystack = [item.name, item.summary, item.desc, ...(item.tags || [])].join(' ').toLowerCase();
      if (haystack.indexOf(kw) < 0) return false;
    }
    return true;
  });
  const groups = new Map();
  filtered.forEach((item) => {
    const key = item.category || '其他';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });
  return [...groups.entries()].map(([name, groupItems]) => ({ name, items: groupItems }));
});

function reload() {
  catalog.value = getCatalog('achievement').data || { items: [], notice: '' };
}

reload();
onCatalogUpdate(reload);

onShareAppMessage(() => ({ title: '成就图鉴 · 蓝色星原助手', path: '/pages/achievement/achievement' }));
</script>

<style>
.stat-row {
  display: flex;
  padding: 26rpx 0;
}

.stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}

.stat__num {
  font-size: 40rpx;
  font-weight: 700;
  color: var(--brand);
}

/* 深色下统计大数字换亮蓝，保证与深卡对比度 */
.theme-dark .stat__num {
  color: var(--brand-bright, #7ea4ff);
}

.stat__label {
  font-size: 22rpx;
  color: var(--ink-3);
}

.ac-search {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 14rpx 20rpx;
  border-radius: 40rpx;
  background: var(--soft);
}

.ac-search__icon {
  color: var(--ink-3);
  font-size: 32rpx;
}

.ac-search__input {
  flex: 1;
  font-size: 26rpx;
}

.ac-search__ph {
  color: var(--ink-3);
}

.ac-cats {
  margin-top: 16rpx;
}


.ac-item {
  padding: 18rpx 0;
  border-bottom: 1rpx solid var(--line);
  transition: background 0.2s ease;
}

.ac-item--hover {
  background: var(--soft);
}

.ac-item__detail {
  animation: cl-fade-in 0.22s ease both;
}

.ac-item:last-child {
  border-bottom: none;
}

.ac-item__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.ac-item__name {
  font-size: 27rpx;
  font-weight: 600;
  color: var(--ink);
}

.ac-item__tags {
  display: flex;
  gap: 10rpx;
  flex-shrink: 0;
}

.mini-tag {
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  background: var(--brand-soft);
  color: var(--brand-deep);
  font-size: 20rpx;
}

.mini-tag--cup {
  background: var(--reward-soft);
  color: var(--reward);
}

.mini-tag--warn {
  background: var(--warn-soft);
  color: var(--warn-ink);
}

.ac-item__cond {
  margin-top: 8rpx;
  color: var(--ink-2);
  font-size: 24rpx;
  line-height: 1.55;
}

.ac-item__detail {
  margin-top: 12rpx;
  padding: 14rpx 18rpx;
  border-radius: 14rpx;
  background: var(--soft);
}

.ac-item__desc {
  margin-top: 10rpx;
  color: var(--ink-2);
  font-size: 23rpx;
  line-height: 1.6;
}

.ac-empty {
  padding: 80rpx 0;
  text-align: center;
  color: var(--ink-3);
  font-size: 25rpx;
}
</style>
