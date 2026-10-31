<template>
  <view class="page" :class="{ 'theme-dark': isDark }">
    <view class="page-hero subscribe-hero">
      <view class="page-hero__inner">
        <text class="page-hero__eyebrow">内容与运营</text>
        <view class="page-hero__title">订阅提醒</view>
        <view class="page-hero__sub">选择你关心的更新类型；当前只做本机记录，消息模板配置后才会真正推送。</view>
        <view class="page-hero__meta">
          <text class="page-hero__tag">已开启 {{ enabledCount }} / {{ topics.length }}</text>
          <text class="page-hero__tag">本地保存</text>
        </view>
      </view>
    </view>

    <view class="sub-list card">
      <view
        v-for="topic in topics"
        :key="topic.id"
        class="sub-row"
        hover-class="sub-row--hover"
        hover-stay-time="90"
        @tap="toggle(topic.id)"
      >
        <view class="sub-row__text">
          <view class="sub-row__title">
            <text>{{ topic.title }}</text>
            <text class="ct-tag ct-tag--ghost">{{ topic.cadence }}</text>
          </view>
          <view class="sub-row__desc">{{ topic.desc }}</view>
        </view>
        <view class="sub-switch" :class="{ 'sub-switch--on': active[topic.id] }">
          <view class="sub-switch__knob" />
        </view>
      </view>
    </view>

    <view class="ct-actions">
      <view class="ct-btn" hover-class="ct-btn--hover" @tap="setAll(true)">全部开启</view>
      <view class="ct-btn ct-btn--ghost" hover-class="ct-btn--hover" @tap="setAll(false)">全部关闭</view>
    </view>

    <view class="panel card">
      <view class="panel__title">当前状态</view>
      <view class="panel__desc panel__desc--first">{{ statusText }}</view>
      <view class="kv__row">
        <text class="kv__key">保存位置</text>
        <text class="kv__value">本机小程序存储</text>
      </view>
      <view class="kv__row">
        <text class="kv__key">推送方式</text>
        <text class="kv__value">订阅消息（待配置）</text>
      </view>
    </view>

    <view class="panel card">
      <view class="panel__title">为什么还没收到推送</view>
      <view class="panel__desc panel__desc--first">
        小程序订阅消息需要在微信后台配置模板 ID，并在用户授权后由服务端下发。当前版本先把订阅项和本地记录做好，模板配置完成后即可接入。
      </view>
    </view>

    <view class="ct-source">订阅偏好只保存在本机，不上传云端；清理小程序缓存会重置。</view>
  </view>
</template>

<script setup>
import { useTheme } from '@/utils/theme.js';

const { isDark } = useTheme();
import { computed, ref } from 'vue';
import { onShareAppMessage } from '@dcloudio/uni-app';
import { subscribeTopics } from '@/data/content.js';

const STORAGE_KEY = 'qbxzs:subscribe';
const topics = subscribeTopics;

function readActive() {
  const stored = uni.getStorageSync(STORAGE_KEY);
  const base = {};
  topics.forEach((topic) => {
    base[topic.id] = Boolean(stored && stored[topic.id]);
  });
  return base;
}

const active = ref(readActive());

const enabledCount = computed(() => topics.filter((topic) => active.value[topic.id]).length);

const statusText = computed(() => {
  if (!enabledCount.value) return '还没有开启任何提醒，点上方开关选择关注的内容。';
  const names = topics.filter((topic) => active.value[topic.id]).map((topic) => topic.title);
  return `已记录 ${enabledCount.value} 项：${names.join('、')}。`;
});

function save() {
  uni.setStorageSync(STORAGE_KEY, active.value);
}

function toggle(id) {
  active.value = Object.assign({}, active.value, { [id]: !active.value[id] });
  save();
}

function setAll(value) {
  const next = {};
  topics.forEach((topic) => {
    next[topic.id] = value;
  });
  active.value = next;
  save();
  uni.showToast({ title: value ? '已全部开启' : '已全部关闭', icon: 'none' });
}

onShareAppMessage(() => ({ title: '订阅提醒 · 蓝色星原助手', path: '/pages/subscribe/subscribe' }));
</script>

<style>
.subscribe-hero {
  background: linear-gradient(135deg, #1f3d9e 0%, #2f6bff 55%, #00b3a4 100%);
}

.sub-list {
  padding: 6rpx 26rpx;
}

.sub-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx 0;
  border-bottom: 1rpx solid var(--line);
  transition: transform 0.16s ease;
}

.sub-row:last-child {
  border-bottom: none;
}

.sub-row--hover {
  transform: scale(0.99);
}

.sub-row__text {
  flex: 1;
  min-width: 0;
}

.sub-row__title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10rpx;
  color: var(--ink);
  font-size: 27rpx;
  font-weight: 600;
}

.sub-row__desc {
  margin-top: 6rpx;
  color: var(--ink-3);
  font-size: 22rpx;
  line-height: 1.6;
}

.sub-switch {
  position: relative;
  flex: none;
  width: 88rpx;
  height: 48rpx;
  border-radius: 999rpx;
  background: var(--soft);
  border: 1rpx solid var(--line);
  transition: background 0.2s ease;
}

.sub-switch--on {
  background: var(--brand);
  border-color: var(--brand);
}

.sub-switch__knob {
  position: absolute;
  top: 4rpx;
  left: 4rpx;
  width: 38rpx;
  height: 38rpx;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2rpx 6rpx rgba(17, 21, 44, 0.2);
  transition: transform 0.2s ease;
}

.sub-switch--on .sub-switch__knob {
  transform: translateX(40rpx);
}
</style>
