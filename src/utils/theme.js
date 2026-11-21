import { ref } from 'vue';

// 主题偏好：light / dark / auto；auto 跟随系统。isDark 供页面根节点绑定 theme-dark 类。
// 状态为模块级单例：所有页面/组件共享同一引用，避免逐实例订阅。
const THEME_KEY = 'qbxzs:theme';
const THEME_EVENT = 'theme:changed';
const VALID_PREFS = ['light', 'dark', 'auto'];

export function normalizeThemePref(value) {
  return VALID_PREFS.indexOf(value) >= 0 ? value : 'auto';
}

export function readThemePref() {
  return normalizeThemePref(uni.getStorageSync(THEME_KEY));
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

const pref = ref(readThemePref());
const isDark = ref(resolveDark(pref.value));
let hooked = false;

// 原生导航与页面回弹区域也跟随主题，避免主体已变深而原生窗口仍露出浅底。
// API 均做能力检测：微信端生效，H5/不支持的平台保持 CSS 主题即可。
function syncNativeTheme(dark) {
  const navigation = dark ? '#151c2b' : '#1f3d9e';
  const background = dark ? '#111621' : '#f3f5fb';
  try {
    if (typeof uni.setNavigationBarColor === 'function') {
      uni.setNavigationBarColor({
        frontColor: '#ffffff',
        backgroundColor: navigation,
        animation: { duration: 180, timingFunc: 'easeIn' },
        fail() {}
      });
    }
    if (typeof uni.setBackgroundColor === 'function') {
      uni.setBackgroundColor({
        backgroundColor: background,
        backgroundColorTop: background,
        backgroundColorBottom: background,
        fail() {}
      });
    }
  } catch (error) {
    // 某些 H5/模拟端虽暴露 API 但不实现；CSS 主题仍可正常工作。
  }
}

function applyTheme(value, notify = false) {
  const next = normalizeThemePref(value);
  pref.value = next;
  isDark.value = resolveDark(next);
  syncNativeTheme(isDark.value);
  if (notify) uni.$emit(THEME_EVENT, next);
  return next;
}

function ensureHooks() {
  if (hooked) return;
  hooked = true;
  uni.$on(THEME_EVENT, (value) => {
    applyTheme(typeof value === 'string' ? value : readThemePref());
  });
  if (typeof uni.onThemeChange === 'function') {
    uni.onThemeChange(() => {
      if (readThemePref() === 'auto') applyTheme('auto', true);
    });
  }
}

export function refreshTheme() {
  ensureHooks();
  return applyTheme(readThemePref());
}

export function initTheme() {
  return refreshTheme();
}

export function setThemePref(value) {
  ensureHooks();
  const next = normalizeThemePref(value);
  uni.setStorageSync(THEME_KEY, next);
  applyTheme(next, true);
}

export function useTheme() {
  ensureHooks();
  return { pref, isDark };
}
