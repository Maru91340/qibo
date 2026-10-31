<script>
import { initCloud } from './services/cloud.js';
import { prefetchCatalog } from './services/content.js';

export default {
  onLaunch() {
    initCloud();
    prefetchCatalog();
  },
  onShow() {
    // 冷启动后回到前台时静默复查一次内容版本
    prefetchCatalog({ silent: true });
  }
};
</script>

<style>
@import './styles/theme.css';
</style>
