<template>
  <view class="page" :class="{ 'theme-dark': isDark }">
    <template v-if="item">
      <view class="head hero">
        <view class="hero__inner">
          <view class="head__top">
            <image
              v-if="bigIcon && !iconBroken"
              class="head__img"
              :src="bigIcon"
              mode="aspectFill"
              @error="iconBroken = true"
              @tap="preview(bigIcon)"
            />
            <view v-else class="head__dot" :style="{ background: accent, color: '#fff' }">
              {{ badgeText }}
            </view>
            <view class="head__text">
              <view class="head__name">{{ item.name }}</view>
              <view class="head__sub">{{ subtitle }}</view>
            </view>
          </view>
          <view class="head__fav" hover-class="tap-hover" @tap="toggleFavState">
            {{ isFavNow ? '★ 已收藏' : '☆ 收藏' }}
          </view>
          <view class="head__tags">
            <text v-if="item.rarity" class="head__tag">{{ item.rarity }}</text>
            <text v-for="tag in item.tags" :key="tag" class="head__tag">{{ tag }}</text>
            <text v-if="!item.verified" class="head__tag">数据待核实</text>
          </view>
        </view>
      </view>

      <view v-if="item.summary" class="panel card">
        <view class="panel__title">概要</view>
        <view class="panel__desc">{{ item.summary }}</view>
      </view>

      <view v-if="item.fields && item.fields.length" class="panel card">
        <view class="panel__title">基础信息</view>
        <view v-for="field in item.fields" :key="field.label" class="kv__row">
          <text class="kv__key">{{ field.label }}</text>
          <text class="kv__value">{{ field.value }}</text>
        </view>
      </view>

      <view v-if="item.desc && item.desc !== item.summary" class="panel card">
        <view class="panel__title">详情</view>
        <view class="panel__desc">{{ item.desc }}</view>
      </view>

      <view v-for="section in item.sections" :key="section.title" class="panel card">
        <view class="panel__title">{{ section.title }}</view>
        <view class="panel__desc">{{ section.text }}</view>
      </view>

      <view class="detail__foot">
        <view class="foot-btn" hover-class="tap-hover" @tap="goBack">返回列表</view>
      </view>

      <view class="footnote">{{ notice }}</view>
    </template>
    <view v-else class="cl-missing">
      <view class="cl-missing__icon">∅</view>
      <view class="cl-missing__text">未找到该条目，可能已被更新替换</view>
      <view class="cl-missing__back" hover-class="tap-hover" @tap="goBack">返回列表</view>
    </view>
  </view>
</template>

<script setup>
import { useTheme } from '@/utils/theme.js';

const { isDark } = useTheme();
import { computed, ref } from 'vue';
import { getCatalog, onCatalogUpdate } from '@/services/content.js';
import { pushRecent } from '@/utils/recent.js';
import { isFav, toggleFav } from '@/utils/favorites.js';

const props = defineProps({
  type: { type: String, required: true },
  id: { type: String, default: '' },
  listPath: { type: String, default: '' },
  subtitleFields: { type: Array, default: () => ['category', 'rarity'] },
  accent: { type: String, default: '#2f6bff' }
});

const catalog = ref({ items: [], notice: '' });
const iconBroken = ref(false);
// 详情页用 240px 大图（BWIKI 缩略图支持改前缀尺寸），失败回退 120px 原图
const bigIcon = computed(() => {
  const icon = item.value && item.value.icon;
  return icon ? icon.replace('/120px-', '/240px-') : '';
});

const item = computed(() => (catalog.value.items || []).filter((entry) => entry.id === props.id)[0] || null);
const notice = computed(() => catalog.value.notice || '');
// 收藏（本地）
const isFavNow = ref(false);
function refreshFav() {
  isFavNow.value = isFav(props.type, props.id);
}
function toggleFavState() {
  const it = item.value || {};
  const on = toggleFav({ type: props.type, id: props.id, name: it.name || '', icon: it.icon || '' });
  isFavNow.value = on;
  uni.showToast({ title: on ? '已收藏' : '已取消收藏', icon: 'none' });
}
const subtitle = computed(() =>
  props.subtitleFields
    .map((field) => item.value && item.value[field])
    .filter((value) => value && value !== '未分类')
    .join(' · ') || '图鉴条目'
);

// 「未分类」条目改用首个标签作徽章文案
const badgeText = computed(() => {
  if (!item.value) return '—';
  const category = item.value.category;
  if (category && category !== '未分类') return category.slice(0, 2);
  return (item.value.tags && item.value.tags[0]) || item.value.rarity || '条目';
});

function reload() {
  catalog.value = getCatalog(props.type).data || { items: [], notice: '' }
  // 最近浏览记录
  const it = (catalog.value.items || []).filter((entry) => entry.id === props.id)[0];
  if (it) pushRecent({ type: props.type, id: it.id, name: it.name, icon: it.icon || '' });;
}

function goBack() {
  const path = props.listPath || `pages/${props.type}/list`;
  uni.navigateBack({
    fail: () => uni.redirectTo({ url: `/${path}` })
  });
}

reload();
function preview(src) {
  if (!src) return;
  uni.previewImage({ urls: [src] });
}

let unsubscribe = onCatalogUpdate(reload);
</script>

<style>
.head__img {
  flex: none;
  width: 128rpx;
  height: 128rpx;
  border-radius: 32rpx;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 8rpx 20rpx rgba(10, 14, 38, 0.28);
}

.cl-missing {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18rpx;
  padding: 160rpx 0;
}

.cl-missing__icon {
  width: 120rpx;
  height: 120rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--soft);
  color: var(--ink-3);
  font-size: 56rpx;
}

.cl-missing__text {
  color: var(--ink-3);
  font-size: 26rpx;
}

.cl-missing__back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 64rpx;
  margin-top: 10rpx;
  padding: 0 48rpx;
  border-radius: 34rpx;
  background: var(--brand);
  color: #fff;
  font-size: 25rpx;
}

.foot-btn {
  padding: 20rpx 0;
  text-align: center;
  border-radius: 40rpx;
  border: 1rpx solid var(--line);
  color: var(--brand);
  font-size: 27rpx;
  background: var(--card-bg);
}
</style>
