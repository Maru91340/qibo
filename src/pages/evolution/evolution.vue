<template>
  <view class="page" :class="{ 'theme-dark': isDark }">
    <view class="page-hero" :style="{ background: 'linear-gradient(132deg, #262c54 0%, #7f5bff 58%, #7f5bff 100%)' }">
      <view class="page-hero__inner">
        <text class="page-hero__eyebrow">信息查询</text>
        <view class="page-hero__title">进化图谱</view>
        <view class="page-hero__sub">按进化系列分组查看奇波进化链，点击链进入最终形态详情。</view>
        <view class="page-hero__meta">
          <text class="page-hero__tag">{{ totalCount }} 个系列</text>
          <text class="page-hero__tag">BWIKI 收录</text>
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
        {{ group.label }}
        <text class="ev-count">{{ group.total }} 阶</text>
      </view>
      <view class="ev-chain" hover-class="tap-hover" @tap="goQibo(group.members[group.members.length - 1].id)">
        <view class="chain-row">
          <template v-for="(member, idx) in group.members" :key="member.id">
            <view class="chain-member">
              <image
                v-if="srcOf(member, 'qiboWiki', 'icon', { widths: [120] })"
                class="chain-member__img"
                :src="srcOf(member, 'qiboWiki', 'icon', { widths: [120] })"
                mode="aspectFill"
                lazy-load
                @error="onError(member, 'icon')"
              />
              <view v-else class="chain-member__img chain-member__img--ph">{{ member.name.slice(0, 1) }}</view>
              <text class="chain-member__name">{{ member.name }}</text>
              <text v-if="!member.verified" class="mini-tag mini-tag--warn">待核实</text>
            </view>
            <view v-if="idx < group.members.length - 1" class="chain-arrow">
              <text class="chain-arrow__lv">{{ member.toLv ? 'Lv.' + member.toLv : '' }}</text>
              <text class="chain-arrow__icon">→</text>
            </view>
          </template>
        </view>
      </view>
    </view>

    <view v-if="shownCount < totalCount" class="cl-more" hover-class="cl-more--hover" hover-stay-time="90" @tap="limit += 12">
      加载更多系列（{{ shownCount }} / {{ totalCount }}）
    </view>
    <view v-if="!list.length" class="ev-empty">没有匹配的进化链</view>
    <view class="footnote">{{ notice }}</view>
  </view>
</template>

<script setup>
import { useTheme } from '@/utils/theme.js';

const { isDark } = useTheme();
import { computed, ref, watch } from 'vue';
import { onShareAppMessage, onUnload } from '@dcloudio/uni-app';
import { getCatalog, onCatalogUpdate } from '@/services/content.js';
import { createElementToolkit } from '@/data/element.js';
import { useImageSources } from '@/utils/image-source.js';

const element = ref('all');
// P2：进化链头像走统一图片候选链（wiki 云图优先，patchwiki 缩略图/热链仅兜底），失败自动降档
const { srcOf, onError: nextImageSource } = useImageSources();
function onError(item, role) { nextImageSource(item, role); }
const catalog = ref({ items: [], notice: '' });
const toolkit = ref(createElementToolkit(getCatalog('element').data));

const notice = computed(() => catalog.value.notice || '');

const elementOptions = computed(() => [
  { key: 'all', label: '全部元素', color: '#5a6480' },
  ...toolkit.value.elements
]);

// 增量渲染：每系先显示 12 条，避免 212 条进化链一次铺满
const limit = ref(12);
const fieldOf = (item, label) => {
  const hit = (item.fields || []).find((field) => field.label === label);
  return hit ? hit.value : '';
};
// 按「进化系列」分组（BWIKI fields），链内按进化下级等级排序
const allSeries = computed(() => {
  const bySeries = new Map();
  (catalog.value.items || []).forEach((item) => {
    const series = fieldOf(item, '进化系列');
    if (!series) return;
    if (!bySeries.has(series)) bySeries.set(series, { key: series, label: series, color: '#5a6480', members: [] });
    const group = bySeries.get(series);
    const toLvText = fieldOf(item, '进化下级等级');
    group.members.push({
      id: item.id,
      name: item.name,
      icon: item.icon,
      element: item.element,
      verified: item.verified,
      toLv: toLvText ? parseInt(toLvText, 10) || null : null
    });
  });
  return [...bySeries.values()]
    .map((group) => {
      group.members.sort((a, b) => (a.toLv ?? Infinity) - (b.toLv ?? Infinity));
      group.total = group.members.length;
      const eleInfo = toolkit.value.elementMap[group.members[0].element];
      group.color = (eleInfo && eleInfo.color) || '#5a6480';
      return group;
    })
    .sort((a, b) => b.total - a.total || a.key.localeCompare(b.key, 'zh'));
});
const totalCount = computed(() => allSeries.value.length);
const list = computed(() =>
  allSeries.value
    .filter((group) => element.value === 'all' || group.members.some((member) => member.element === element.value))
    .slice(0, limit.value)
);
const shownCount = computed(() => list.value.length);
watch(element, () => {
  limit.value = 12;
});

function reload() {
  catalog.value = getCatalog('qibo').data || { items: [], notice: '' };
  toolkit.value = createElementToolkit(getCatalog('element').data);
}

function goQibo(id) {
  uni.navigateTo({ url: `/pkg-qibo/detail?id=${id}` });
}

reload();
const unsubscribe = onCatalogUpdate(reload);
onUnload(() => unsubscribe && unsubscribe());

onShareAppMessage(() => ({ title: '进化图谱 · 奇波小助手', path: '/pages/evolution/evolution' }));
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

.ev-chain__img {
  flex: none;
  width: 56rpx;
  height: 56rpx;
  border-radius: 16rpx;
  background: var(--soft);
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

.chain-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12rpx;
}

.chain-member {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.chain-member__img {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #f2f4f9;
}

.chain-member__img--ph {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8a93a8;
  font-size: 28rpx;
}

.chain-member__name {
  font-size: 26rpx;
  color: #333;
}

.chain-arrow {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 0 4rpx;
}

.chain-arrow__lv {
  font-size: 20rpx;
  color: #d9841f;
}

.chain-arrow__icon {
  font-size: 24rpx;
  color: #8a93a8;
}
</style>
