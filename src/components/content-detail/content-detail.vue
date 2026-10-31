<template>
  <view class="page" :class="{ 'theme-dark': isDark }">
    <template v-if="item">
      <view class="page-hero detail-hero" :style="{ background: heroBg }">
        <view class="page-hero__inner">
          <text class="page-hero__eyebrow">{{ item.category }}</text>
          <view class="page-hero__title">{{ item.title }}</view>
          <view class="page-hero__sub">{{ item.summary }}</view>
          <view class="page-hero__meta">
            <text v-if="!item.verified" class="page-hero__tag">待核实</text>
            <text class="page-hero__tag">更新于 {{ item.updatedAt || updatedAt }}</text>
            <text v-for="tag in item.tags" :key="tag" class="page-hero__tag">{{ tag }}</text>
          </view>
        </view>
      </view>

      <view v-for="(section, index) in item.sections" :key="section.title" class="panel card">
        <view class="panel__title">
          <text>{{ section.title }}</text>
          <text class="section-index">{{ pad(index + 1) }}</text>
        </view>
        <image
          v-if="section.image && !imgError"
          class="section-image"
          :src="section.image"
          mode="widthFix"
          @error="imgError = true"
        />
        <view v-if="section.text" class="panel__desc panel__desc--first">{{ section.text }}</view>
        <view v-if="section.steps && section.steps.length" class="detail-steps">
          <view v-for="(step, stepIndex) in section.steps" :key="step" class="ct-step">
            <text class="ct-step__num">{{ stepIndex + 1 }}</text>
            <text class="ct-step__text">{{ step }}</text>
          </view>
        </view>
        <view
          v-if="section.link"
          class="ct-link"
          hover-class="ct-link--hover"
          hover-stay-time="90"
          @tap="go(section.link.path)"
        >
          {{ section.link.label }} ›
        </view>
      </view>

      <view v-if="related.length" class="panel card">
        <view class="panel__title">继续阅读</view>
        <view
          v-for="entry in related"
          :key="entry.id"
          class="related-row"
          hover-class="related-row--hover"
          hover-stay-time="90"
          @tap="openRelated(entry)"
        >
          <view class="related-row__text">
            <view class="related-row__title">{{ entry.title }}</view>
            <view class="related-row__desc">{{ entry.summary }}</view>
          </view>
          <text class="related-row__arrow">›</text>
        </view>
      </view>

      <view class="ct-actions">
        <view class="ct-btn ct-btn--ghost" hover-class="ct-btn--hover" @tap="goList">返回列表</view>
        <view class="ct-btn" hover-class="ct-btn--hover" @tap="goSearch">去搜索更多</view>
      </view>

      <view class="ct-source">{{ notice }}</view>
    </template>

    <view v-else class="ct-empty">
      <view class="ct-empty__icon">∅</view>
      <view class="ct-empty__title">未找到这篇内容</view>
      <view class="ct-empty__text">条目可能已被替换或链接不完整，返回列表重新选择。</view>
      <view class="ct-actions">
        <view class="ct-btn" hover-class="ct-btn--hover" @tap="goList">返回列表</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { useTheme } from '@/utils/theme.js';

const { isDark } = useTheme();
import { computed, ref } from 'vue';
import { CONTENT_NOTICE, CONTENT_UPDATED_AT, findContentItem, relatedContent } from '@/data/content.js';

const props = defineProps({
  type: { type: String, required: true },
  id: { type: String, default: '' },
  listPath: { type: String, default: '' },
  accent: { type: String, default: '#2f6bff' }
});

const updatedAt = CONTENT_UPDATED_AT;
const notice = CONTENT_NOTICE;
const item = computed(() => findContentItem(props.type, props.id));
const imgError = ref(false);
const related = computed(() => relatedContent(props.type, item.value));
const heroBg = computed(
  () => `linear-gradient(135deg, #1f3d9e 0%, ${props.accent} 58%, #7f5bff 100%)`
);

function pad(value) {
  return value < 10 ? `0${value}` : String(value);
}

function go(path) {
  if (path) uni.navigateTo({ url: path });
}

function goList() {
  const path = props.listPath || `/pages/${props.type}/list`;
  uni.navigateBack({ fail: () => uni.redirectTo({ url: path }) });
}

function goSearch() {
  uni.navigateTo({ url: '/pages/search/search' });
}

function openRelated(entry) {
  uni.redirectTo({ url: `/pages/${props.type}/detail?id=${entry.id}` });
}
</script>

<style>
.section-image {
  width: 100%;
  border-radius: var(--radius-lg);
  background: var(--card-bg);
  box-shadow: var(--shadow-card);
  margin-bottom: 24rpx;
}

.detail-hero {
  box-shadow: 0 16rpx 40rpx rgba(31, 61, 158, 0.26);
}

.section-index {
  color: var(--ink-3);
  font-size: 22rpx;
  font-weight: 400;
}

.detail-steps {
  margin-top: 8rpx;
}

.related-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 0;
  border-bottom: 1rpx solid var(--line);
  transition: transform 0.16s ease;
}

.related-row:last-child {
  border-bottom: none;
}

.related-row--hover {
  transform: scale(0.98);
}

.related-row__text {
  flex: 1;
  min-width: 0;
}

.related-row__title {
  color: var(--ink);
  font-size: 26rpx;
  font-weight: 600;
}

.related-row__desc {
  margin-top: 6rpx;
  color: var(--ink-3);
  font-size: 22rpx;
  line-height: 1.6;
}

.related-row__arrow {
  color: var(--ink-3);
  font-size: 30rpx;
}
</style>
