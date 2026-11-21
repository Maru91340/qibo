<script>
import { initCloud } from './services/cloud.js';
import { prefetchCatalog } from './services/content.js';
import { initTheme, refreshTheme } from './utils/theme.js';

export default {
  onLaunch() {
    initTheme();
    uni.removeStorageSync('qbxzs:seed-token');
    initCloud();
    prefetchCatalog();
  },
  onShow() {
    // 回到前台时刷新跟随系统的主题，并静默复查内容版本。
    refreshTheme();
    prefetchCatalog({ silent: true });
  }
};
</script>

<style>
@import './styles/theme.css';
@import './styles/content.css';
@import './styles/tools.css';
</style>
