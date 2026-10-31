import { ref } from 'vue';

// 主题偏好：light / dark / auto；auto 跟随系统。isDark 供页面根节点绑定 theme-dark 类。
// 状态为模块级单例：所有页面/组件共享同一引用，避免逐实例订阅。
const THEME_KEY = 'qbxzs:theme';
const THEME_EVENT = 'theme:changed';

const pref = ref(readThemePref());
const isDark = ref(resolveDark(pref.value));
let hooked = false;

export function readThemePref() {
  const stored = uni.getStorageSync(THEME_KEY);
  return ['light', 'dark', 'auto'].indexOf(stored) >= 0 ? stored : 'auto';
}

function resolveDark(current) {
  if (current === 'dark') return true;
  if (current === 'light') return false;
  try {
    const info = uni.getSystemInfoSync();
    return info.theme === 'dark';
  } catch (error) {
    return false;
  }
}

function ensureHooks() {
  if (hooked) return;
  hooked = true;
  uni.$on(THEME_EVENT, (value) => {
    pref.value = typeof value === 'string' ? value : readThemePref();
    isDark.value = resolveDark(pref.value);
  });
  if (typeof uni.onThemeChange === 'function') {
    uni.onThemeChange(() => {
      if (readThemePref() === 'auto') uni.$emit(THEME_EVENT, 'auto');
    });
  }
}

export function setThemePref(value) {
  uni.setStorageSync(THEME_KEY, value);
  uni.$emit(THEME_EVENT, value);
}

export function useTheme() {
  ensureHooks();
  return { pref, isDark };
}
