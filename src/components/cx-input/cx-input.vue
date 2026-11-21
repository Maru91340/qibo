<template>
  <view class="cx-input">
    <text class="cx-input__icon">🔍</text>
    <input
      class="cx-input__field"
      :value="value"
      :placeholder="placeholder"
      :focus="focus"
      confirm-type="search"
      :placeholder-class="'cx-input__ph'"
      @input="onInput"
      @confirm="$emit('submit')"
    />
    <!-- 3.4 / L06：外层撑 44px 可触面积，内层保持原 42rpx 视觉圆点 -->
    <view v-if="value" class="cx-input__clear-hit" hover-class="tap-hover" @tap="$emit('clear')">
      <text class="cx-input__clear">×</text>
    </view>
  </view>
</template>

<script setup>
defineProps({
  value: { type: String, default: '' },
  placeholder: { type: String, default: '搜索' },
  focus: { type: Boolean, default: false }
});
const emit = defineEmits(['change', 'clear', 'submit']);

function onInput(event) {
  emit('change', { detail: { value: event.detail.value } });
}
</script>

<style>
.cx-input {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 24rpx;
  border-radius: 999rpx;
  background: var(--card-bg);
  border: 1rpx solid var(--line);
  box-shadow: var(--shadow-card);
}

.cx-input__icon {
  font-size: 30rpx;
}

.cx-input__field {
  flex: 1;
  min-width: 0;
  font-size: 26rpx;
  color: var(--ink);
}

.cx-input__ph {
  color: var(--ink-3);
}

/* 3.4 / L06：热区 44×44px，视觉尺寸维持 42rpx */
.cx-input__clear-hit {
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: -12rpx;
}

.cx-input__clear {
  width: 42rpx;
  height: 42rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--soft);
  color: var(--ink-2);
  font-size: 26rpx;
}
</style>
