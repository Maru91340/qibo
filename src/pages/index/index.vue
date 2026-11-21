<template>
  <view class="page home" :class="{ 'theme-dark': isDark }">
    <!-- #ifdef H5 -->
    <view class="preview-tip">📱 当前为浏览器预览端 · 交付以微信小程序端为准</view>
    <!-- #endif -->

    <!-- 6.1 / N01：查询入口置顶，首屏先给搜索（沿用 4.1 / H01 结论） -->
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

    <!-- 6.2 / N02：主视觉与公测信息合一。原「banner 一遍 + 公测卡片再一遍」的同信息重复取消，
         倒计时做成图上胶囊（三态由 release-event.js 驱动），底部渐变上叠一行标题。
         关于游戏页已删除，横幅改为纯信息卡（不可点）；媒体区仍固定 16:9、aspectFit 完整展示 keyVisual 横图（沿用 4.2 清单，不硬裁）。 -->
    <view class="home-hero">
      <view class="home-hero__media">
        <image
          v-if="visualSrc"
          class="home-hero__img"
          :src="visualSrc"
          mode="aspectFit"
          @error="onVisualError"
        />
        <view v-else class="home-hero__fallback">
          <text class="home-hero__fallback-title">{{ releaseState.title }}</text>
          <text class="home-hero__retry" hover-class="tap-hover" @tap.stop="retryVisual">重试加载图片</text>
        </view>
        <view class="home-hero__veil" />
        <view class="home-hero__chip">
          <text class="home-hero__chip-text">{{ countdownText }}</text>
        </view>
        <view class="home-hero__info">
          <text class="home-hero__title">{{ releaseState.title }}</text>
        </view>
      </view>
    </view>

    <!-- 6.3 / N03：横滑分页金刚区（对标竞品，用户决策恢复分页横滑）。
         旧版 8 宫格 + 「实用工具」页内展开 + 「更多分类」标签墙共 30+ 入口堆在一页，
         展开近一屏且命名互相矛盾；H05「不分页」结论的前提（只有 8 个入口）已不成立。
         现在每页 4×2 = 8 格 × 5 页承载全部 38 个板块：首页长度恒定，页序即优先级
         （常用 → 图鉴 → 工具 → 内容 → 服务），标题随页切换，指示条提示可滑。 -->
    <view v-if="navPages.length" class="navcard">
      <view class="navcard__head">
        <text class="navcard__title">{{ navPages[navPage].title }}</text>
        <text class="navcard__hint">{{ navPage + 1 }}/{{ navPages.length }} · 左右滑动查看更多</text>
      </view>
      <swiper
        class="nav-swiper"
        :current="navPage"
        duration="280"
        @change="onNavChange"
      >
        <swiper-item v-for="page in navPages" :key="page.key">
          <view class="nav-grid">
            <view
              v-for="cell in page.cells"
              :key="cell.key"
              class="nav-cell"
              hover-class="tap-hover"
              @tap="go(cell.path)"
            >
              <view class="nav-cell__tile">
                <image
                  v-if="cell.icon"
                  class="nav-cell__icon"
                  :src="cell.icon"
                  mode="aspectFit"
                />
                <text v-else class="nav-cell__emoji">{{ cell.emoji }}</text>
                <text v-if="!cell.ready" class="nav-cell__wip">建设中</text>
              </view>
              <text class="nav-cell__title">{{ cell.title }}</text>
            </view>
          </view>
        </swiper-item>
      </swiper>
      <view class="nav-dots">
        <view
          v-for="(page, index) in navPages"
          :key="page.key"
          class="nav-dot"
          :class="{ 'nav-dot--on': index === navPage }"
        />
      </view>
    </view>

    <!-- 6.4 / N04：图鉴速览上移到宫格下方（核心价值首屏可见，不再被展开目录推到屏外）。
         角色速查固定 4 个真实对象，图片用途 avatar；名称在独立文字区固定可见（沿用 4.1 / 4.2）。 -->
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

    <!-- 6.4：奇波速查固定 4 个真实对象，图片用途 icon；主体完整、名称固定可见（沿用 4.1 / 4.2） -->
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

    <!-- 6.6：数据口径说明薄条保留，入口仍指向「奇波百科」 -->
    <view class="cx-notice" hover-class="tap-hover" @tap="go('/pages/wiki/wiki')">
      <text class="cx-notice__icon">📢</text>
      <text class="cx-notice__text">{{ notice }}</text>
    </view>

    <!-- 页脚：游戏名 + 适龄提示固定文案（小号灰字；版本号与同步状态已按产品要求移除） -->
    <view class="footnote">
      <text class="footnote__line">{{ GAME_NAME }}</text>
      <text class="footnote__line">适龄提示：本应用适合16周岁以上玩家</text>
      <text class="footnote__line">抵制不良游戏，拒绝盗版游戏</text>
    </view>
  </view>
</template>

<script setup>
import { useTheme } from '@/utils/theme.js';

const { isDark } = useTheme();
import { computed, ref } from 'vue';
import { onLoad, onShow, onUnload, onShareAppMessage } from '@dcloudio/uni-app';
import { getCatalog, onCatalogUpdate } from '@/services/content.js';
import { GAME_NAME } from '@/config/app.js';
import { keyVisualSources } from '@/data/site-images.js';
import { useImageSources } from '@/utils/image-source.js';
import { officialItems } from '@/utils/catalog-view.js';
import { eventState } from '@/utils/release-event.js';

// 4.8 / H10（沿用）：事件配置与三态判定集中在 utils/release-event.js，活动变更只改那一处；
// 时间源为响应式 nowTs，进入首页 / 返回首页 / 应用切回前台时刷新，跨天不停留在旧文案。
const nowTs = ref(Date.now());
function refreshNow() {
  nowTs.value = Date.now();
}
const releaseState = computed(() => eventState(nowTs.value));
// 6.2 / N02：图上倒计时胶囊的三态文案；到期后显示「已开启」而非钳制成 0 天。
const countdownText = computed(() => {
  const state = releaseState.value;
  if (state.phase === 'today') return '🎉 今日正式公测';
  if (state.phase === 'after') return '🚀 公测已开启';
  return `⏳ 距公测 ${state.daysBefore} 天`;
});

const sections = ref([]);
const keyword = ref('');
const notice = ref('');

// 4.2 / H02（沿用）：主视觉走候选链：缩略图直链 → 站点按需生成 302；全部失败退回文字底 + 重试，布局不变
const VISUAL_SOURCES = keyVisualSources();
const visualStage = ref(0);
const visualSrc = computed(() => (visualStage.value < VISUAL_SOURCES.length ? VISUAL_SOURCES[visualStage.value] : ''));

// 4.1 / H01（沿用）：固定 4 个资料与图片都已核对的真实对象；不伪造「最近浏览 / 热门」
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

// 6.3 / N03：横滑金刚区分页配置。页序即优先级，全部 38 个板块按使用频率归入 5 页；
// 入口短名控制在小宫格 4 字以内，缺数据的板块自动跳过，页结构保持稳定。
const NAV_SHORT_TITLES = {
  qibo: '奇波', character: '角色', spirit: '灵子', item: '物品', equipment: '装备',
  element: '元素克制', team: '队伍编成', evolution: '进化图谱',
  material: '材料', food: '美食', fishing: '钓鱼', enemy: '敌人', dungeon: '副本',
  building: '家园建筑', achievement: '成就', region: '地区阵营',
  search: '搜索', affix: '战斗词条', station: '家园派驻', favorites: '我的收藏',
  compare: '角色对比', cultivation: '养成计算', pity: '保底计算', simulator: '星结模拟',
  beast: '凶兽生态', tutorial: '教程合集', guide: '玩法指南', versus: '奇波对决',
  story: '剧情读物', ridu: '日渡尘影', wallpaper: '壁纸画廊', codes: '福利码',
  rebate: '充值返利', explore: '地图探索', subscribe: '订阅偏好', wiki: '奇波百科',
  settings: '设置'
};
const NAV_PAGES = [
  { key: 'main', title: '常用功能', itemKeys: ['qibo', 'character', 'spirit', 'item', 'equipment', 'enemy', 'building', 'dungeon'] },
  { key: 'catalog', title: '更多图鉴', itemKeys: ['material', 'food', 'fishing', 'achievement', 'region', 'evolution'] },
  { key: 'tool', title: '查询与工具', itemKeys: ['search', 'affix', 'compare', 'cultivation', 'pity', 'simulator', 'element', 'team'] },
  { key: 'content', title: '攻略与内容', itemKeys: ['beast', 'tutorial', 'guide', 'versus', 'story', 'ridu', 'wallpaper', 'codes'] },
  { key: 'service', title: '服务与设置', itemKeys: ['rebate', 'station', 'explore', 'subscribe', 'wiki', 'settings'] }
];
const navPage = ref(0);
const navPages = computed(() => {
  const byKey = {};
  sections.value.forEach((item) => { byKey[item.key] = item; });
  return NAV_PAGES
    .map((page) => ({
      key: page.key,
      title: page.title,
      cells: page.itemKeys
        .map((key) => byKey[key])
        .filter(Boolean)
        .map((item) => ({
          key: item.key,
          title: NAV_SHORT_TITLES[item.key] || item.title,
          emoji: item.emoji,
          icon: SECTION_ICONS[item.key] || '',
          path: item.path,
          ready: item.ready !== false
        }))
    }))
    .filter((page) => page.cells.length);
});
function onNavChange(event) {
  navPage.value = event.detail.current;
}

// 8.1 / I01：星晶幻想双色图标（docs/icon-set 设计稿导出的 128px PNG，文件名 = 板块 key）。
// 微信小程序 image 组件不支持本地 SVG，PNG 由浏览器栅格化流程从 SVG 源稿转出；
// 缺图时回退 SECTION_EMOJI，保证新增板块在图标未生成前依然可用。
const ICON_KEYS = [
  'qibo', 'character', 'spirit', 'item', 'equipment', 'element', 'team', 'evolution',
  'material', 'food', 'fishing', 'enemy', 'dungeon', 'building', 'achievement', 'region',
  'search', 'affix', 'station', 'favorites', 'compare', 'cultivation', 'pity', 'simulator',
  'beast', 'tutorial', 'guide', 'versus', 'story', 'ridu', 'wallpaper', 'codes',
  'rebate', 'explore', 'subscribe', 'wiki', 'settings'
];
const SECTION_ICONS = Object.fromEntries(ICON_KEYS.map((key) => [key, `/static/icons/${key}.png`]));

// 每个板块专属图标（emoji 双端一致渲染，青少年向视觉；沿用 4.2 / H02 决策）
const SECTION_EMOJI = {
  qibo: '🐾', character: '🥇', spirit: '💎', item: '🎒', equipment: '🗡️',
  material: '🧬', food: '🍚', fishing: '🎣', enemy: '👾', dungeon: '🏰',
  building: '🏗️', achievement: '🏆', region: '🗺️',
  element: '🔄', affix: '⚔️', evolution: '⏳', station: '🏠', search: '🔍', favorites: '⭐',
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
  sections.value = (meta.sections || []).map((item) =>
    Object.assign({}, item, { emoji: SECTION_EMOJI[item.key] || '✦', ready: item.ready !== false })
  );
  featuredCharacters.value = pickFeatured('character', FEATURED_IDS.character);
  featuredQibo.value = pickFeatured('qibo', FEATURED_IDS.qibo);
  notice.value = meta.notice || '';
}

// 4.2（沿用）：主视觉候选链逐档降级；全部失败显示同尺寸事件文字底，不改变布局
function onVisualError() {
  visualStage.value += 1;
}
function retryVisual() {
  visualStage.value = 0;
}

function onKeywordChange(event) {
  keyword.value = event.detail.value;
}

// 3.4 / L06（沿用）：输入组件只发出 clear 事件，父级必须清空值，否则点 × 后框里仍留旧词
function onKeywordClear() {
  keyword.value = '';
}

function submitSearch() {
  uni.navigateTo({ url: `/pages/search/search?keyword=${encodeURIComponent(keyword.value.trim())}` });
}

// 4.1（沿用）：速查整卡进对应详情；「查看全部」进分类列表，两种目标不藏在同一个箭头里
function goCharacterDetail(id) {
  uni.navigateTo({ url: '/pkg-character/detail?id=' + encodeURIComponent(id) });
}
function goQiboDetail(id) {
  uni.navigateTo({ url: '/pkg-qibo/detail?id=' + encodeURIComponent(id) });
}

function go(path) {
  if (path) uni.navigateTo({ url: path });
}

let unsubscribe = null;
let offAppShow = null;
onLoad(() => {
  loadMeta();
  refreshNow();
  // 4.8（沿用）：应用从后台切回前台也重算；H5 端若无该 API 则只靠页面 onShow
  if (typeof uni.onAppShow === 'function' && typeof uni.offAppShow === 'function') {
    uni.onAppShow(refreshNow);
    offAppShow = () => uni.offAppShow(refreshNow);
  }
});
// 4.8（沿用）：进入首页 / 从详情页返回时重新计算事件状态，跨天不再显示旧倒计时
onShow(refreshNow);
onShareAppMessage(() => ({ title: '奇波小助手 · 奇波/角色图鉴与队伍编成', path: '/pages/index/index' }));
unsubscribe = onCatalogUpdate(loadMeta);
onUnload(() => {
  unsubscribe && unsubscribe();
  offAppShow && offAppShow();
});
</script>

<style>
/* 4.6 / H06（沿用）：首页统一 16px 设计基准外边距，全部区块共用一条对齐线。
   仅用 .home 限定首页，不改 theme.css 的全局 .page。 */
.page.home {
  padding-left: 32rpx;
  padding-right: 32rpx;
}

.home .footnote {
  margin-left: 0;
  margin-right: 0;
}

/* 6.1：查询入口置顶 */
.searchbar {
  padding: 4rpx 0 16rpx;
}

/* 6.2 / N02：主视觉 + 公测信息合一卡。媒体区固定 16:9、aspectFit 完整展示；
   底部深色渐变保证叠层白字可读；整卡即公测详情入口（44px+ 触达区）。 */
.home-hero {
  overflow: hidden;
  border: 1rpx solid var(--line);
  border-radius: var(--radius-lg);
}

.home-hero__media {
  position: relative;
  width: 100%;
  height: 0;
  padding-bottom: 56.25%;
  overflow: hidden;
  /* 5.1 / H07（沿用）：占位底固定单主蓝，不随主题翻转，保证回退白字可读 */
  background: #1f3d9e;
}

.home-hero__img,
.home-hero__fallback {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.home-hero__fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}

.home-hero__fallback-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #fff;
}

.home-hero__retry {
  margin-top: 8rpx;
  padding: 10rpx 28rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 24rpx;
}

.home-hero__veil {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 54%;
  background: linear-gradient(180deg, rgba(10, 14, 38, 0) 0%, rgba(10, 14, 38, 0.88) 100%);
  pointer-events: none;
}

/* 6.2：倒计时胶囊。白底高对比，公测后切「已开启」仍可常驻（回访动机） */
.home-hero__chip {
  position: absolute;
  top: 16rpx;
  left: 16rpx;
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.94);
}

.home-hero__chip-text {
  font-size: 24rpx;
  font-weight: 700;
  color: var(--hero-chip-ink);
}

.home-hero__info {
  position: absolute;
  left: 20rpx;
  right: 168rpx;
  bottom: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.home-hero__title {
  font-size: 34rpx;
  font-weight: 700;
  color: #ffffff;
}

.home-hero__cta {
  position: absolute;
  right: 16rpx;
  bottom: 20rpx;
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.22);
  border: 1rpx solid rgba(255, 255, 255, 0.42);
  font-size: 24rpx;
  color: #ffffff;
}

/* 6.3 / N03：横滑分页金刚区。白卡承载，高度恒定（2 行 × 150rpx + 行距 12rpx + 顶部 4rpx），
   首屏信息密度与扩展性兼得；指示条当前页为长条主蓝、其余为短线。 */
.navcard {
  margin-top: 20rpx;
  padding: 12rpx 12rpx 12rpx;
  border: 1rpx solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--card-bg);
}

.navcard__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 64rpx;
  padding: 0 8rpx;
}

.navcard__title {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--ink);
}

.navcard__hint {
  font-size: 24rpx;
  color: var(--ink-2);
  font-variant-numeric: tabular-nums;
}

.nav-swiper {
  height: 316rpx;
}

.nav-grid {
  display: flex;
  flex-wrap: wrap;
  row-gap: 12rpx;
  padding-top: 4rpx;
}

.nav-cell {
  box-sizing: border-box;
  width: 25%;
  height: 150rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  border-radius: 16rpx;
}

/* 6.3：统一浅蓝托底容器收拢 emoji，观感成套（解决旧版图标色彩重量不一）；
   深色主题走 --brand-soft 自动翻转 */
.nav-cell__tile {
  position: relative;
  width: 88rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 24rpx;
  background: var(--brand-soft);
}

.nav-cell__emoji {
  font-size: 40rpx;
  line-height: 1.2;
}

/* 8.1 / I01：星晶双色图标。PNG 与 emoji 同位替换，尺寸略小于托底形成呼吸感 */
.nav-cell__icon {
  width: 56rpx;
  height: 56rpx;
}

.nav-cell__wip {
  position: absolute;
  top: -10rpx;
  right: -18rpx;
  padding: 2rpx 10rpx;
  border-radius: 999rpx;
  background: var(--warn-soft);
  color: var(--warn-ink);
  font-size: 20rpx;
}

.nav-cell__title {
  max-width: 100%;
  padding: 0 4rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  /* 5.2 / H08（沿用）：入口名称按正文 14px 下限（28rpx） */
  font-size: 28rpx;
  font-weight: 600;
  color: var(--ink-2);
}

.nav-dots {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding-top: 6rpx;
}

.nav-dot {
  width: 12rpx;
  height: 6rpx;
  border-radius: 999rpx;
  background: var(--line);
  transition: width 0.2s ease, background 0.2s ease;
}

.nav-dot--on {
  width: 32rpx;
  background: var(--brand);
}

/* 6.4：图鉴速览（沿用 4.1 / 4.2 结构：固定 4 张、失败占位同尺寸不改布局） */
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
  color: var(--brand-text);
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

.preview-tip {
  padding: 12rpx 0 4rpx;
  text-align: center;
  color: var(--ink-2);
  font-size: 24rpx;
}

/* 页脚：适龄提示固定两行，小号灰字 */
.home .footnote {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  color: var(--ink-3);
  font-size: 20rpx;
}

/* 公告行：与上方奇波图鉴预览拉开距离 */
.home .cx-notice {
  margin-top: 20rpx;
}

.home .cx-notice__text {
  font-size: 26rpx;
}

/* 7.1 / D01：首页深色主题不是机械反色，而是三层深海蓝黑表面：
   页面底（--bg）→ 主卡（--card-bg）→ 次级托底（--soft / --brand-soft）。
   仅作用于首页，保持其他页面当前深色样式稳定。 */
.home.theme-dark {
  background:
    radial-gradient(circle at 84% 8%, rgba(83, 111, 181, 0.1), transparent 34%),
    var(--bg);
}

.home.theme-dark .searchbar .cx-input {
  border-color: #303c55;
  background: #1a2232;
  box-shadow: inset 0 1rpx 0 rgba(255, 255, 255, 0.03), 0 10rpx 30rpx rgba(0, 0, 0, 0.2);
}

.home.theme-dark .searchbar .cx-input__ph {
  color: #9eabc3;
}

.home.theme-dark .home-hero {
  border-color: #35415b;
  box-shadow: 0 12rpx 34rpx rgba(0, 0, 0, 0.24);
}

.home.theme-dark .navcard {
  border-color: #303b52;
  background: linear-gradient(180deg, #1c2536 0%, #192131 100%);
  box-shadow: inset 0 1rpx 0 rgba(255, 255, 255, 0.03);
}

.home.theme-dark .nav-cell__tile {
  border: 1rpx solid rgba(126, 164, 255, 0.16);
  background: linear-gradient(145deg, #273654 0%, #202c44 100%);
}

.home.theme-dark .nav-cell:active {
  background: rgba(126, 164, 255, 0.08);
}

.home.theme-dark .nav-dot {
  background: #3c4860;
}

.home.theme-dark .nav-dot--on {
  background: #6f9cff;
  box-shadow: 0 0 14rpx rgba(111, 156, 255, 0.4);
}

.home.theme-dark .feature__frame {
  border-color: #303b52;
  background: linear-gradient(160deg, #242f44 0%, #1d2637 100%);
  box-shadow: inset 0 1rpx 0 rgba(255, 255, 255, 0.03);
}

.home.theme-dark .cx-notice {
  border-color: #31405d;
  background: linear-gradient(135deg, #202e48 0%, #1d283c 100%);
  box-shadow: inset 0 1rpx 0 rgba(255, 255, 255, 0.03);
}

.home.theme-dark .preview-tip {
  color: #aeb9cf;
}

/* 6.x 收敛原则（沿用 5.x）：行为色只用主蓝，静态内容卡不加浮起阴影；
   正文不低于 28rpx（约 14px）、说明不低于 24rpx（约 12px）；
   深色下不写死文字色，全部由主题变量驱动（主视觉叠层白字区域除外，其底色固定深蓝）。 */
</style>
