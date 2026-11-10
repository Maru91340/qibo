<template>
  <view class="page home" :class="{ 'theme-dark': isDark }">
    <!-- #ifdef H5 -->
    <view class="preview-tip">📱 当前为浏览器预览端 · 交付以微信小程序端为准</view>
    <!-- #endif -->

    <!-- 4.1 / H01：查询入口置顶，首屏先给搜索，再给一个主视觉与具体对象 -->
    <view class="searchbar">
      <cx-input
        :value="keyword"
        shape="round"
        placeholder="搜奇波、角色、灵子、物品、成就"
        @change="onKeywordChange"
        @clear="onKeywordClear"
        @submit="submitSearch"
      />
    </view>

    <!-- 4.1 / 4.3：单个静态主视觉，无自动轮播；4.2 明确清单 keyVisual 横图按 16:9 完整展示，不硬裁 -->
    <view class="hero">
      <view class="hero__media">
        <image
          v-if="visualSrc"
          class="hero__img"
          :src="visualSrc"
          mode="aspectFit"
          @error="onVisualError"
        />
        <view v-else class="hero__fallback">
          <text class="hero__fallback-title">{{ releaseState.title }}</text>
          <text class="hero__fallback-desc">图片加载失败 · 公测信息以官方公告为准</text>
          <text class="hero__retry" hover-class="tap-hover" @tap.stop="retryVisual">重试加载图片</text>
        </view>
      </view>
      <view class="hero__bar">
        <view class="hero__copy">
          <!-- 4.8 / H10：日期、范围、出处与三态文案统一由 release-event.js 的内容配置驱动 -->
          <text class="hero__tag">公测信息 · {{ releaseState.tag }}</text>
          <text class="hero__title">{{ releaseState.title }}</text>
          <text class="hero__desc">{{ releaseState.desc }}</text>
        </view>
        <view class="hero__cta" hover-class="tap-hover" @tap="go('/pages/about/about')">
          <text>查看公测信息</text>
          <c-icon name="chevron-right" size="28rpx" color="#ffffff" />
        </view>
      </view>
    </view>

    <!-- 4.5 / H05：固定 4×2 八入口，不再分页横滑；第八格「全部工具」展开页内紧凑目录 -->
    <view class="quick-grid">
      <view
        v-for="cell in quickCells"
        :key="cell.key"
        class="quick-cell"
        hover-class="tap-hover"
        @tap="onQuickTap(cell)"
      >
        <text class="quick-cell__emoji">{{ cell.emoji }}</text>
        <text class="quick-cell__title">{{ cell.title }}</text>
      </view>
    </view>

    <!-- 4.5 / H05：全部工具紧凑目录，默认收起，由第八格展开，不新增路由也不重复大功能卡 -->
    <view v-if="showAllTools" class="tools-dir">
      <view class="tools-dir__head">
        <text class="tools-dir__title">实用工具</text>
        <text class="tools-dir__close" hover-class="tap-hover" @tap="toggleAllTools">收起 ›</text>
      </view>
      <view class="tools-dir__list">
        <view
          v-for="item in toolItems"
          :key="item.key"
          class="tools-dir__cell"
          hover-class="tap-hover"
          @tap="go(item.path)"
        >
          <text class="tools-dir__name">{{ item.title }}</text>
          <text class="tools-dir__arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 4.1 / 4.2：角色速查固定 4 个真实对象，图片用途 avatar；名称在独立文字区固定可见 -->
    <view class="feature">
      <view class="feature__head">
        <text class="feature__title">角色图鉴预览</text>
        <text class="feature__more" hover-class="tap-hover" @tap="go('/pages/character/list')">查看全部 ›</text>
      </view>
      <view class="feature__row">
        <view
          v-for="item in featuredCharacters"
          :key="item.id"
          class="feature__cell"
          hover-class="tap-hover"
          @tap="goCharacterDetail(item.id)"
        >
          <view class="feature__frame">
            <image
              v-if="srcOf(item, 'charWiki', 'avatar')"
              class="feature__img"
              :src="srcOf(item, 'charWiki', 'avatar')"
              mode="aspectFit"
              lazy-load
              @error="onError(item, 'avatar')"
            />
            <view v-else class="feature__badge" @tap.stop="retry(item, 'avatar')">{{ item.name.slice(0, 1) }}</view>
          </view>
          <text class="feature__name">{{ item.name }}</text>
        </view>
      </view>
    </view>

    <!-- 4.1 / 4.2：奇波速查固定 4 个真实对象，图片用途 icon；主体完整、名称固定可见 -->
    <view class="feature">
      <view class="feature__head">
        <text class="feature__title">奇波图鉴预览</text>
        <text class="feature__more" hover-class="tap-hover" @tap="go('/pages/qibo/list')">查看全部 ›</text>
      </view>
      <view class="feature__row">
        <view
          v-for="item in featuredQibo"
          :key="item.id"
          class="feature__cell"
          hover-class="tap-hover"
          @tap="goQiboDetail(item.id)"
        >
          <view class="feature__frame">
            <image
              v-if="srcOf(item, 'qiboWiki', 'icon', { preferMapped: false, widths: [120, 100, 80] })"
              class="feature__img"
              :src="srcOf(item, 'qiboWiki', 'icon', { preferMapped: false, widths: [120, 100, 80] })"
              mode="aspectFit"
              lazy-load
              @error="onError(item, 'icon')"
            />
            <view v-else class="feature__badge" @tap.stop="retry(item, 'icon')">{{ item.name.slice(0, 1) }}</view>
          </view>
          <text class="feature__name">{{ item.name }}</text>
        </view>
      </view>
    </view>

    <!-- 4.4 / H04：首屏四格规模统计已删除；真实数量在列表页「命中 X / 共 Y」与来源说明中呈现 -->

    <!-- 4.7 / H09：原「版本信息」块（公测定档 + 历史测试/海外预测 + 玩法说明混排）整体删除。
         首页只保留主视觉里的一条当前确认公测事件，不同时期的预测不再并列当最新情报。
         玩法内容归「新手必看」：一行标题 + 必要说明，先展示两条并给「查看全部」。 -->
    <view class="starter">
      <view class="starter__head">
        <text class="starter__title">新手必看</text>
        <text class="starter__more" hover-class="tap-hover" @tap="go('/pages/tutorial/list')">查看全部 ›</text>
      </view>
      <view
        v-for="task in starterTasks"
        :key="task.key"
        class="starter__row"
        hover-class="tap-hover"
        @tap="go(task.path)"
      >
        <view class="starter__body">
          <text class="starter__name">{{ task.title }}</text>
          <text class="starter__desc">{{ task.desc }}</text>
        </view>
        <text class="starter__arrow">›</text>
      </view>
    </view>

    <!-- 4.7：数据口径说明落到「奇波百科」（常见问题与数据边界），与文案匹配 -->
    <view class="cx-notice" hover-class="tap-hover" @tap="go('/pages/wiki/wiki')">
      <text class="cx-notice__icon">📢</text>
      <text class="cx-notice__text">{{ notice }}</text>
      <text class="cx-notice__more">详情›</text>
    </view>

    <!-- 4.9 / H11：分组标题改玩家任务语言，删掉「N 个板块」与无信息量的「可用」标签；
         确有功能限制时才在入口旁给一句真实限制短句（如订阅偏好「仅本机记录」）。 -->
    <view class="tools-dir">
      <view class="tools-dir__head" hover-class="tap-hover" @tap="showDirectory = !showDirectory">
        <text class="tools-dir__title">更多分类</text>
        <text class="tools-dir__close">{{ showDirectory ? '收起' : '展开' }} ›</text>
      </view>
      <view v-if="showDirectory">
        <view v-for="group in groups" :key="group.key" class="home-group">
          <view class="section-title"><text>{{ group.title }}</text></view>
          <view class="row-grid">
            <view v-for="item in group.items" :key="item.key" class="row-cell" @tap="go(item.path)">
              <text class="row-cell__title">{{ item.label }}</text>
              <text v-if="item.limitNote" class="row-cell__tag row-cell__tag--limit">{{ item.limitNote }}</text>
              <text v-else-if="item.ready === false" class="row-cell__tag">建设中</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="footnote">{{ footer }}</view>
  </view>
</template>

<script setup>
import { useTheme } from '@/utils/theme.js';

const { isDark } = useTheme();
import { computed, ref } from 'vue';
import { onLoad, onShow, onUnload, onShareAppMessage } from '@dcloudio/uni-app';
import { getCatalog, catalogNotice, onCatalogUpdate } from '@/services/content.js';
import { APP_VERSION, GAME_NAME } from '@/config/app.js';
import { keyVisualSources } from '@/data/site-images.js';
import { useImageSources } from '@/utils/image-source.js';
import { officialItems } from '@/utils/catalog-view.js';
import { eventState } from '@/utils/release-event.js';

// 4.8 / H10：事件配置与三态判定集中在 utils/release-event.js，活动变更只改那一处；
// 时间源改为响应式 nowTs，进入首页 / 返回首页 / 应用切回前台时刷新，跨天不再停留在旧文案。
const nowTs = ref(Date.now());
function refreshNow() {
  nowTs.value = Date.now();
}
const releaseState = computed(() => eventState(nowTs.value));
const sections = ref([]);
const keyword = ref('');
const notice = ref('');
const footer = ref('');

// 4.2 / H02：首页图片用途清单（不再按哈希给业务入口配图）
// | 图片位 | 业务对象 | 用途 | 来源 | 失败回退 |
// | 主视觉 | 11.26 公测事件 | keyVisual 横图 | BWIKI 公测主视觉 480px 变体 | 同尺寸事件文字卡 + 重试 |
// | 角色速查 | FEATURED_IDS.character | avatar | Tex_icon_hero_l_* | 首字占位 + 名称 + 重试 |
// | 奇波速查 | FEATURED_IDS.qibo | icon | Tex_icon_pet_* | 首字占位 + 名称 + 重试 |
// | 功能卡 / 目录 | 各板块 | 统一 emoji | 项目内置图标 | 文字（本轮不配图） |
// 主视觉走阶段 2 的候选链：缩略图直链 → 站点按需生成 302；全部失败退回文字卡，布局不变
const VISUAL_SOURCES = keyVisualSources();
const visualStage = ref(0);
const visualSrc = computed(() => (visualStage.value < VISUAL_SOURCES.length ? VISUAL_SOURCES[visualStage.value] : ''));

// 4.1 / H01：固定 4 个资料与图片都已核对的真实对象；不伪造「最近浏览 / 热门」
const FEATURED_IDS = {
  character: ['ch-40c2fea853', 'ch-96c1a22a99', 'ch-010d1b5dcb', 'ch-21a34ef5b7'],
  qibo: ['qi-51400da50c', 'qi-7e8470e08b', 'qi-94cfa8e913', 'qi-da92fad19b']
};
const featuredCharacters = ref([]);
const featuredQibo = ref([]);

// 具名包装供模板绑定（阶段 2 的候选链统一失败降级与重试，check.mjs 会校验函数名已声明）
const images = useImageSources();
function srcOf(item, type, role, options) {
  return images.srcOf(item, type, role, options);
}
function onError(item, role) {
  images.onError(item, role);
}
function retry(item, role) {
  images.retry(item, role);
}

// 4.4 / H04：删除首屏四格规模统计。原 stat 把「有 icon 的条目数」当「官方图」，
// 又把有交集的多个目录相加当「图鉴条目」，口径容易误导，且 computed 无响应式资料依赖。
// 真实数量由列表页「命中 X / 共 Y」呈现（3.1），来源说明由 LIST_SOURCE_NOTE 呈现（3.3）。

// 4.5 / H05：固定 4×2 八入口。前七格按 sections 的 path 直达分类/查询页；
// 第八格「全部工具」展开页内紧凑目录，不新增路由。地图探索按方案 H05 暂不进八入口
// （真实找点体验尚未验证，见待确认 #26），仍留在「全部工具」目录。
const QUICK_KEYS = ['qibo', 'character', 'spirit', 'item', 'equipment', 'element', 'team'];
const QUICK_SHORT_TITLES = {
  qibo: '奇波', character: '角色', spirit: '灵子', item: '物品',
  equipment: '装备', element: '元素克制', team: '队伍编成'
};
const quickCells = computed(() => {
  const byKey = {};
  sections.value.forEach((item) => { byKey[item.key] = item; });
  const cells = QUICK_KEYS
    .map((key) => byKey[key])
    .filter(Boolean)
    .map((item) => ({ key: item.key, title: QUICK_SHORT_TITLES[item.key] || item.title, emoji: item.emoji, path: item.path }));
  cells.push({ key: 'all-tools', title: '实用工具', emoji: '🧰', action: 'allTools' });
  return cells.slice(0, 8);
});
// 4.5：全部工具紧凑目录的数据与开关（默认收起，避免首屏再次堆一整套重复大卡）
const showAllTools = ref(false);
const showDirectory = ref(false);
const toolItems = computed(() => sections.value.filter((item) => (item.group || 'catalog') === 'tool'));
function toggleAllTools() {
  showAllTools.value = !showAllTools.value;
}
function onQuickTap(cell) {
  if (cell.action === 'allTools') { toggleAllTools(); return; }
  go(cell.path);
}

// 4.7 / H09：玩法内容从「版本信息」搬到新手必看；每条一行标题 + 必要说明，
// 路径均为已注册的真实页面，不虚构专题页，标题 / 说明 / 落地三者一致。
const starterTasks = [
  { key: 'element', title: '元素克制怎么查', desc: '相克矩阵与组队元素覆盖', path: '/pages/element/element' },
  { key: 'team', title: '角色与奇波如何编队', desc: '3 名角色 + 3 只奇波的搭配与保存', path: '/pages/team/team' }
];

// 4.9 / H11：分组标题改玩家任务语言，首页不出现内部开发优先级与运营分类。
// 4.8 / H10：订阅页只保存本机偏好（模板 ID 为空），首页入口不承诺「提醒」，并给一句真实限制。
// 只做视图层映射，不改 meta.js 的共享 sections 数据，避免影响其他页面。
const HOME_LABELS = { subscribe: '订阅偏好' };
const HOME_LIMITS = { subscribe: '仅本机记录' };
const HOME_GROUPS = [
  { key: 'catalog', title: '更多图鉴', itemKeys: ['material', 'food', 'fishing', 'enemy', 'dungeon', 'building', 'achievement', 'region'] },
  { key: 'query', title: '进阶查询', itemKeys: ['affix', 'evolution', 'station', 'favorites'] },
  { key: 'guide', title: '攻略与玩法', itemKeys: ['beast', 'guide', 'versus'] },
  { key: 'content', title: '剧情与内容', itemKeys: ['story', 'ridu', 'wallpaper'] },
  { key: 'service', title: '福利与服务', itemKeys: ['codes', 'subscribe'] },
  { key: 'support', title: '关于与设置', itemKeys: ['about', 'settings'] }
];
const groups = computed(() => {
  const byKey = Object.fromEntries(sections.value.map((item) => [item.key, item]));
  return HOME_GROUPS
    .map((group) => ({
      key: group.key,
      title: group.title,
      items: group.itemKeys
        .map((key) => byKey[key])
        .filter(Boolean)
        .map((item) => Object.assign({}, item, {
          label: HOME_LABELS[item.key] || item.title,
          limitNote: HOME_LIMITS[item.key] || ''
        }))
    }))
    .filter((group) => group.items.length);
});

// 每个板块专属图标（emoji 双端一致渲染，青少年向视觉）
const SECTION_EMOJI = {
  qibo: '🐾', character: '🥇', spirit: '💎', item: '🎒', equipment: '🗡️',
  material: '🧬', food: '🍚', fishing: '🎣', enemy: '👾', dungeon: '🏰',
  building: '🏗️', achievement: '🏆', region: '🗺️',
  element: '🔄', affix: '⚔️', evolution: '⏳', station: '🏠', search: '🔍',
  team: '🛡️', beast: '🐉', tutorial: '📚', guide: '🧭', story: '📜',
  versus: '⚡', ridu: '🌙', wallpaper: '🖼️', codes: '🎁', subscribe: '🔔',
  wiki: '📖', about: '💙', settings: '⚙️', compare: '⚖️', cultivation: '📈',
  pity: '🎯', simulator: '🎲', rebate: '💰', explore: '🧭'
};

// 速查对象与列表页同口径：先剔除演示条目与同名重复，再按固定 id 取，缺数据时不伪造补位
function pickFeatured(type, ids) {
  const items = officialItems((getCatalog(type).data || {}).items || []);
  return ids.map((id) => items.find((item) => item.id === id)).filter(Boolean).slice(0, 4);
}

function loadMeta() {
  const meta = getCatalog('meta').data || {};
  // 4.2 / H02：不再从灵子 icon 收集装饰图并用哈希分配给轮播/功能卡，功能卡统一用 emoji
  // 4.5：大功能卡已移除，不再计算 tint / accentGradient 渐变条
  sections.value = (meta.sections || []).map((item) =>
    Object.assign({}, item, { emoji: SECTION_EMOJI[item.key] || '✦', ready: item.ready !== false })
  );
  featuredCharacters.value = pickFeatured('character', FEATURED_IDS.character);
  featuredQibo.value = pickFeatured('qibo', FEATURED_IDS.qibo);
  notice.value = meta.notice || '';
  footer.value = `v${APP_VERSION} · ${GAME_NAME} · ${catalogNotice()}`;
}

// 4.2：主视觉候选链逐档降级；全部失败显示同尺寸事件文字卡，不改变布局
function onVisualError() {
  visualStage.value += 1;
}
function retryVisual() {
  visualStage.value = 0;
}

function onKeywordChange(event) {
  keyword.value = event.detail.value;
}

// 3.4 / L06：输入组件只发出 clear 事件，父级必须清空值，否则点 × 后框里仍留旧词
function onKeywordClear() {
  keyword.value = '';
}

function submitSearch() {
  uni.navigateTo({ url: `/pages/search/search?keyword=${encodeURIComponent(keyword.value.trim())}` });
}

// 4.1：速查整卡进对应详情；「查看全部」进分类列表，两种目标不藏在同一个箭头里
function goCharacterDetail(id) {
  uni.navigateTo({ url: '/pages/character/detail?id=' + encodeURIComponent(id) });
}
function goQiboDetail(id) {
  uni.navigateTo({ url: '/pages/qibo/detail?id=' + encodeURIComponent(id) });
}

function go(path) {
  if (path) uni.navigateTo({ url: path });
}

let unsubscribe = null;
let offAppShow = null;
onLoad(() => {
  loadMeta();
  refreshNow();
  // 4.8：应用从后台切回前台也重算；H5 端若无该 API 则只靠页面 onShow
  if (typeof uni.onAppShow === 'function' && typeof uni.offAppShow === 'function') {
    uni.onAppShow(refreshNow);
    offAppShow = () => uni.offAppShow(refreshNow);
  }
});
// 4.8：进入首页 / 从详情页返回时重新计算事件状态，跨天不再显示旧倒计时
onShow(refreshNow);
onShareAppMessage(() => ({ title: '奇波小助手 · 奇波/角色图鉴与队伍编成', path: '/pages/index/index' }));
unsubscribe = onCatalogUpdate(loadMeta);
onUnload(() => {
  unsubscribe && unsubscribe();
  offAppShow && offAppShow();
});
</script>

<style>
/* 4.6 / H06：首页统一 16px 设计基准外边距（390px 屏约 32rpx）。
   仅用 .home 限定首页，不改 theme.css 的全局 .page，避免顺手重排几十个页面。 */
.page.home {
  padding-left: 32rpx;
  padding-right: 32rpx;
}

/* 4.6：清掉模块自带的左右边距，让搜索 / 主视觉 / 快捷区 / 分区标题 / 预览共用一条对齐线 */
.home .section-title,
.home .footnote {
  margin-left: 0;
  margin-right: 0;
}

/* 4.6：theme.css 旧 .hero 的渐变 / 圆点装饰不再叠加到首页静态主视觉 */
.home .hero {
  color: var(--ink);
  /* 5.1 / H07：显式固定卡片底，避免全局渐变叠到首页主视觉 */
  background: var(--card-bg);
}

.home .hero::after {
  display: none;
}

/* 4.1 / H01：查询入口置顶 */
.searchbar {
  padding: 4rpx 0 16rpx;
}

/* 4.1 / 4.3：单个静态主视觉。媒体区固定 16:9，图片 aspectFit 完整展示，不把海报硬裁成窄横条 */
.hero {
  overflow: hidden;
  border: 1rpx solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--card-bg);
}

.hero__media {
  position: relative;
  width: 100%;
  height: 0;
  padding-bottom: 56.25%;
  overflow: hidden;
  /* 5.1 / H07：占位底改成单主蓝（复用主题 --brand-deep 浅色值），
     去掉多色渐变；固定不随主题翻转，保证回退白字可读 */
  background: #1f3d9e;
}

.hero__img,
.hero__fallback {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.hero__fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}

.hero__fallback-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #fff;
}

.hero__fallback-desc {
  font-size: 24rpx;
  /* 5.2 / H08：固定深蓝底上的说明文字用不透明白，避免半透明降低对比度 */
  color: #ffffff;
}

.hero__retry {
  margin-top: 8rpx;
  padding: 10rpx 28rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 24rpx;
}

.hero__bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 20rpx;
  background: var(--card-bg);
}

.hero__copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.hero__tag {
  align-self: flex-start;
  /* 5.2 / H08：说明文字不低于 12px（24rpx 约 12.5px） */
  font-size: 24rpx;
  color: var(--brand);
}

.hero__title {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--ink);
}

.hero__desc {
  font-size: 24rpx;
  color: var(--ink-2);
}

/* 4.1：主按钮 44px 可触高度，视觉尺寸不放大到整块 */
.hero__cta {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 6rpx;
  min-height: 88rpx;
  padding: 0 20rpx;
  border-radius: 999rpx;
  background: var(--brand);
  color: #fff;
  /* 5.2 / H08：按钮文字按正文 14px 下限（28rpx） */
  font-size: 28rpx;
  font-weight: 600;
}

/* 4.1 / 4.2：角色、奇波速查各 4 张；图片位固定尺寸，失败占位同尺寸不改布局 */
.feature {
  margin-top: 20rpx;
}

.feature__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
}

.feature__title {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--ink);
}

.feature__more {
  padding: 12rpx 0 12rpx 24rpx;
  font-size: 24rpx;
  color: var(--brand);
}

.feature__row {
  display: flex;
  gap: 12rpx;
}

.feature__cell {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.feature__frame {
  position: relative;
  width: 100%;
  height: 156rpx;
  overflow: hidden;
  border: 1rpx solid var(--line);
  border-radius: 16rpx;
  background: var(--soft);
}

.feature__img,
.feature__badge {
  width: 100%;
  height: 100%;
}

.feature__badge {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 44rpx;
  font-weight: 700;
  color: var(--ink-2);
}

.feature__name {
  width: 100%;
  margin-top: 8rpx;
  overflow: hidden;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 28rpx;
  color: var(--ink);
}

.home-group {
  margin-bottom: 8rpx;
}

/* 4.5 / 4.6：低频目录为紧凑行，不再套一层有内边距的白盒 */
.row-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
  padding: 0;
}

.row-cell {
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  min-height: 64rpx;
  padding: 0 24rpx;
  border-radius: 32rpx;
  background: var(--soft);
  border: 1rpx solid var(--line);
  transition: transform 0.16s ease;
}

.row-cell:active {
  transform: scale(0.97);
}

.row-cell__title {
  /* 5.2 / H08：入口名称按正文 14px 下限（28rpx） */
  font-size: 28rpx;
  color: var(--ink);
}

.row-cell__tag {
  /* 5.2 / H08：标签提到 24rpx，颜色提升到二级语义色 */
  font-size: 24rpx;
  color: var(--ink-2);
}

.preview-tip {
  padding: 12rpx 0 4rpx;
  text-align: center;
  color: var(--ink-2);
  font-size: 24rpx;
}

/* 4.5 / H05：固定 4×2 八入口，无分页横滑、无金色指示点、无白盒阴影；
   用 flex 25% 而非 grid，兼容小程序 wxss 渲染 */
.quick-grid {
  display: flex;
  flex-wrap: wrap;
  margin-top: 20rpx;
}

.quick-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  box-sizing: border-box;
  width: 25%;
  min-height: 116rpx;
  border-radius: 16rpx;
}

/* 4.5：全部工具紧凑目录（默认收起，由第八格展开） */
.tools-dir {
  margin-top: 16rpx;
  padding: 8rpx 0;
  border-top: 1rpx solid var(--line);
}

.tools-dir__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 64rpx;
}

.tools-dir__title {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--ink);
}

.tools-dir__close {
  padding: 12rpx 0 12rpx 24rpx;
  font-size: 24rpx;
  color: var(--brand);
}

.tools-dir__list {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.tools-dir__cell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
  width: calc(50% - 6rpx);
  min-height: 88rpx;
  padding: 0 20rpx;
  border: 1rpx solid var(--line);
  border-radius: 12rpx;
  background: var(--soft);
}

.tools-dir__name {
  font-size: 28rpx;
  color: var(--ink);
}

.tools-dir__arrow {
  font-size: 28rpx;
  color: var(--ink-2);
}

.quick-cell__emoji {
  font-size: 40rpx;
  line-height: 1.2;
}

.quick-cell__title {
  /* 5.2 / H08：快捷名称按正文 14px 下限（28rpx） */
  font-size: 28rpx;
  font-weight: 600;
  /* 5.2 / 5.3：不再用 opacity 压低对比度，也不在深色下写死固定文字色，统一走主题语义色 */
  color: var(--ink-2);
}

/* 4.7 / H09：原「版本信息」白盒（不同时期情报 + 玩法说明混排）整体删除。
   新手必看用薄条列表，不再套一层阴影白卡；新样式只用语义色变量，不引入深色硬编码色。 */
.starter {
  margin-top: 24rpx;
}

.starter__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
}

.starter__title {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--ink);
}

.starter__more {
  padding: 12rpx 0 12rpx 24rpx;
  font-size: 24rpx;
  color: var(--brand);
}

.starter__row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  min-height: 88rpx;
  padding: 8rpx 0;
  border-bottom: 1rpx solid var(--line);
}

.starter__row:last-child {
  border-bottom: none;
}

.starter__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.starter__name {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--ink);
}

.starter__desc {
  font-size: 24rpx;
  color: var(--ink-2);
}

.starter__arrow {
  font-size: 28rpx;
  color: var(--ink-2);
}

/* 4.9 / H11：只在确有功能限制时显示短句，正常入口不再贴「可用」 */
.row-cell__tag--limit {
  color: var(--ink-2);
}

/* 5.2 / H08：全局页脚（22rpx）与公告文案（23rpx）在首页局部提到说明下限，
   页脚次级文字提升到二级语义色；只作用于 .home 子树，全局主题样式保持原样。 */
.home .footnote {
  color: var(--ink-2);
  font-size: 24rpx;
}

.home .cx-notice__text,
.home .cx-notice__more {
  font-size: 26rpx;
}

/* 5.1 / 5.2 / 5.3 本轮样式收敛原则：行为色只用主蓝，静态内容卡不加浮起阴影；
   正文不低于 28rpx（约 14px）、说明不低于 24rpx（约 12px）；
   首页不再使用低对比的三级文字色，深色下不写死文字色，全部由主题变量驱动。
   以上只完成静态检查与对比度核算，浅/深色实拍与交互仍需运行验证（见阶段 5 报告）。 */
</style>
