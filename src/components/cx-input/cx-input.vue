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
    <text v-if="value" class="cx-input__clear" hover-class="tap-hover" @tap="$emit('clear')">×</text>
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
