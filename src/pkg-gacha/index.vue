<template>
  <view class="gacha" :style="{ '--accent': activePool.accent, '--soft': activePool.soft }">
    <view class="gacha__bg" />

    <view class="scene" :class="{ 'scene--poster': activePool.scene }">
      <image v-if="activePool.scene" class="scene__poster" :src="gachaAsset(activePool.scene)" mode="aspectFill" />
      <image v-if="!activePool.scene && activePool.cover && gachaAsset(activePool.cover.bg)" class="scene__backdrop" :src="gachaAsset(activePool.cover.bg)" mode="aspectFill" />
      <image v-if="!activePool.scene && gachaAsset(activePool.art)" class="scene__art" :class="{ 'scene__art--cover': activePool.artMode === 'cover' }" :src="gachaAsset(activePool.art)" :mode="activePool.artMode === 'cover' ? 'aspectFill' : 'aspectFit'" />
      <image v-if="!activePool.scene && gachaAsset(activePool.face)" class="scene__portrait" :src="gachaAsset(activePool.face)" mode="aspectFill" />
      <view v-if="activePool.cover && activePool.cover.cards" class="scene__cover">
        <image v-for="(card, index) in activePool.cover.cards" :key="index" class="scene__card" :src="gachaAsset(card.src)" mode="widthFix" :style="{ width: card.w * .72 + 'vw', left: parseFloat(activePool.cover.x || '44') + card.x * .72 + 'vw', top: parseFloat(activePool.cover.y || '49') + card.y * 1.4 + 'vh', transform: 'translate(-50%, -50%) rotate(' + card.r + 'deg)', zIndex: card.z || 1, opacity: card.o || 1 }" />
      </view>
      <view class="scene__veil" />
      <view class="scene__theme">
        <text class="scene__theme-en">AZUR PROMILIA</text>
        <text class="scene__theme-title">{{ activePool.scene ? activePool.up : activePool.themeTitle }}</text>
        <text class="scene__theme-caption">✦ {{ activePool.scene ? activePool.theme : activePool.themeCaption }}</text>
      </view>
    </view>
    <view class="scene-info">
      <text class="scene-info__overline">AZUR PROMILIA / OBSERVATION</text>
      <text class="scene-info__title">{{ activePool.name }}</text>
      <text class="scene-info__tag">✦ {{ activePool.type }} ✦</text>
      <text class="scene-info__desc">{{ activePool.desc }}</text>
      <text v-if="activePool.up" class="scene-info__up">UP · {{ activePool.up }}</text>
      <text v-if="activePool.upFour.length" class="scene-info__four">四星 UP · {{ activePool.upFour.join(' · ') }}</text>
      <text class="scene-info__guarantee">至多 {{ activePool.cap }} 抽必得{{ activePool.up ? ' UP 五星' : '五星' }}</text>
    </view>


    <!-- 顶部：标题 + 本日剩余 -->
    <view class="top">
      <view class="top__back" @tap="goHome"><text>‹</text></view>
      <view class="top__brand">
        <text class="top__title">星原观测</text>
        <text class="top__sub">公测概率口径 · 本地模拟</text>
      </view>
      <view class="quota" :class="{ 'quota--low': remaining <= 30 }" @tap="onQuotaTap">
        <text class="quota__num">{{ remaining }}</text>
        <text class="quota__label">本日剩余</text>
      </view>
    </view>

    <!-- 卡池选择 -->
    <scroll-view class="pools" scroll-y :show-scrollbar="false">
      <view class="pools__grid">
        <view
          v-for="pool in pools"
          :key="pool.id"
          class="pool"
          :class="{ 'pool--active': pool.id === activeId }"
          :style="{ '--accent': pool.accent, '--soft': pool.soft }"
          hover-class="pool--hover"
          :hover-stay-time="80"
          @tap="selectPool(pool.id)"
        >
          <image v-if="coverOf(pool)" class="pool__cover" :src="coverOf(pool)" mode="aspectFill" />
          <view v-else class="pool__cover pool__cover--empty" :style="{ background: pool.soft }">
            <text class="pool__symbol">{{ pool.symbol }}</text>
          </view>
          <view class="pool__body">
            <view class="pool__row">
              <text class="pool__name">{{ pool.name }}</text>
              <text v-if="pool.limit" class="pool__tag">限 {{ pool.limit }} 抽</text>
              <text v-else-if="pool.up" class="pool__tag pool__tag--up">UP</text>
            </view>
            <text class="pool__type">{{ pool.type }}</text>
            <view class="pool__meta">
              <text>{{ pool.kind }} · 保底 {{ pool.cap }} 抽</text>
              <text class="pool__pity">距保底 {{ pityGap(pool) }} 抽</text>
            </view>
          </view>
          <view class="pool__check" :style="{ background: pool.accent }">✓</view>
        </view>
        <view class="pools__pad" />
      </view>
    </scroll-view>

    <!-- 底部操作 -->
    <view class="bar" :style="{ '--accent': activePool.accent }">
      <view class="bar__quota">
        <text>本日剩余 {{ remaining }} 抽</text>
        <text v-if="remaining < 10 && quota.adUsed < AD_MAX" class="bar__ad" @tap="onWatchAd">看广告 +{{ AD_BONUS }} 次</text>
      </view>
      <view class="bar__actions">
        <view
          class="btn btn--ghost"
          :class="{ 'btn--disabled': !canDraw(1) }"
          hover-class="btn--hover"
          :hover-stay-time="80"
          @tap="draw(1)"
        >
          <image class="btn__mat" :src="materialIcon" mode="aspectFit" />
          <text class="btn__text">观测一次</text>
        </view>
        <view
          class="btn btn--main"
          :class="{ 'btn--disabled': !canDraw(10) }"
          hover-class="btn--hover"
          :hover-stay-time="80"
          @tap="draw(10)"
        >
          <image class="btn__mat" :src="materialIcon" mode="aspectFit" />
          <text class="btn__text">观测十次</text>
        </view>
      </view>
      <view class="bar__links">
        <text class="link" @tap="goHistory">观测记录</text>
        <text class="link__dot">·</text>
        <button class="link link--btn" open-type="share">分享</button>
        <text class="link__dot">·</text>
        <text class="link" @tap="onReport">生成分享图</text>
      </view>
      <text class="bar__mark">奇波小程序--抽卡模拟</text>
    </view>

    <!-- 抽卡结果：载入 → 翻牌 → 五星过场/召唤 → 再抽一次 -->
      <view v-if="stageOpen" class="stage" :style="{ '--accent': activePool.accent, '--soft': activePool.soft }">
        <view class="stage__bg" />

        <!-- 顶部：标题 + 本轮小结 -->
        <view class="head">
          <text class="head__en">FATE RESONANCE</text>
          <text class="head__zh">{{ headText }}</text>
        </view>
        <view class="rule" />

        <!-- 结果板块：单抽 = 一张大卡，十连 = 5 × 2 竖板 -->
        <view class="cards" :class="{ 'cards--solo': isSolo }" @tap="onSkip">
          <view
            v-for="(item, index) in batch"
            :key="index"
            class="slab"
            :class="[
              'slab--r' + item.rarity,
              item.kind === '角色' ? 'slab--char' : 'slab--soul',
              { 'slab--show': revealed[index], 'slab--featured': revealed[index] && isFeatured(item) }
            ]"
          >
            <view class="slab__pane">
              <view class="slab__back"><text class="slab__glyph">✦</text></view>
              <view class="slab__front">
                <image v-if="artOf(item)" class="slab__art" :src="artOf(item)" mode="aspectFill" />
                <view v-else class="slab__fallback"><text>{{ item.name.slice(0, 1) }}</text></view>
                <view class="slab__scrim" />
                <view v-if="item.rarity === 5" class="slab__halo" />
              </view>
              <view class="slab__shine" />
            </view>

            <view v-if="item.rarity >= 5" class="slab__plate">
              <text class="slab__plate-name">{{ item.name }}</text>
              <text class="slab__plate-sub">{{ item.kind }} · {{ item.fiveGap }} 抽</text>
            </view>

            <view class="slab__bar">
              <view class="slab__stars">
                <text v-for="star in item.rarity" :key="star" class="slab__star">★</text>
              </view>
              <text class="slab__name">{{ item.name }}</text>
              <view class="slab__type-row">
                <image v-if="elemIcon(item)" class="slab__elem" :src="elemIcon(item)" mode="aspectFit" />
                <text class="slab__type">{{ typeLine(item) }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 底部操作 -->
        <view class="footer">
          <text v-if="phase === 'flip'" class="footer__hint">点击空白处跳过动画</text>
          <text v-else class="footer__hint">{{ footerHint }}</text>
          <view class="footer__row">
            <view class="sbtn sbtn--ghost" hover-class="sbtn--hover" @tap="onBack">
              <text class="sbtn__text">返回卡池</text>
              <text class="sbtn__sub">BACK</text>
            </view>
            <view class="sbtn sbtn--main" :class="{ 'sbtn--off': phase !== 'done' }" hover-class="sbtn--hover" @tap="onAgain">
              <text class="sbtn__text">再抽一次</text>
              <text class="sbtn__sub">DRAW AGAIN</text>
            </view>
          </view>
          <view class="footer__quota">
            <text class="footer__quota-text">本日剩余 {{ remaining }} 抽</text>
            <text v-if="remaining < lastCount && quota.adUsed < AD_MAX" class="footer__ad" @tap="onWatchAd">看广告 +{{ AD_BONUS }}</text>
          </view>
        </view>

        <!-- 载入层：卡池名单行文案单行居中，长名自动缩字号 -->
        <view v-if="phase === 'loading'" class="loading">
          <view class="load">
            <view class="load__ring"><view class="load__ring-in" /><text class="load__star">✦</text></view>
            <view class="load__track"><view class="load__bar" /></view>
            <text class="load__pool" :style="{ fontSize: loadingSize }">{{ activePool.name }} · 观测中</text>
            <text class="load__caption">循 星 观 测 中</text>
          </view>
        </view>

        <!-- 方形文字过场 -->
        <view v-if="phase === 'ritual'" class="ritual">
          <view class="ritual__frame ritual__frame--a" />
          <view class="ritual__frame ritual__frame--b" />
          <view class="ritual__frame ritual__frame--c" />
          <view class="ritual__core" />
          <text class="ritual__text">{{ ritualText }}</text>
        </view>

        <!-- 五星召唤 -->
        <view v-if="phase === 'summon' && summonItem" class="summon">
          <view class="summon__glow" />
          <view class="summon__rays" />
          <image v-if="summonArt(summonItem)" class="summon__art" :src="summonArt(summonItem)" mode="aspectFit" />
          <image v-if="summonArt(summonItem)" class="summon__portrait" :src="summonArt(summonItem)" mode="aspectFill" />
          <view class="summon__fade" />
          <view class="summon__info">
            <text class="summon__kicker">{{ summonItem.kind === '角色' ? 'CHARACTER' : 'SPIRIT' }} · FIVE STAR</text>
            <text class="summon__name">{{ summonItem.name }}</text>
            <text class="summon__stars">★★★★★</text>
            <view v-if="summonTraits.role || summonTraits.elements.length" class="summon__traits">
              <text v-if="summonTraits.role" class="summon__role">{{ summonTraits.role }}</text>
              <text v-if="summonTraits.role && summonTraits.elements.length" class="summon__dot">·</text>
              <view v-for="element in summonTraits.elements" :key="element.label" class="summon__trait">
                <image v-if="element.icon" class="summon__trait-icon" :src="element.icon" mode="aspectFit" />
                <text class="summon__trait-label">{{ element.label }}</text>
              </view>
            </view>
            <text class="summon__summary">{{ summonTraits.summary || '星光回应了这次观测，与你的相遇如约而至。' }}</text>
          </view>
          <view class="summon__confirm" hover-class="sbtn--hover" @tap="confirmSummon">
            <text class="summon__confirm-text">确 认</text>
            <text class="summon__confirm-sub">CONFIRM</text>
          </view>
        </view>

        <!-- 水印：五个界面共用（卡池页另有一处，记录页单独一处） -->
        <text class="mark" :class="{ 'mark--dark': phase === 'summon' || phase === 'ritual' }">奇波小程序--抽卡模拟</text>
      </view>

    <!-- 分享图预览： canvas 出图后弹层展示，可保存到相册再转发 -->
    <view v-if="reportOpen" class="report">
      <view class="report__mask" @tap="closeReport" />
      <view class="report__body">
        <image class="report__img" :src="reportPath" mode="widthFix" show-menu-by-longpress />
        <text class="report__tip">长按图片可保存 · 本地模拟记录，不代表游戏真实概率</text>
        <view class="report__btns">
          <view class="report__btn" hover-class="sbtn--hover" @tap="closeReport"><text>关闭</text></view>
          <view class="report__btn report__btn--main" hover-class="sbtn--hover" @tap="saveReport">
            <text>{{ reportSaved ? '再存一次' : '保存到相册' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 离屏画布：750×1000，分享图专用 -->
    <canvas canvas-id="gachaReport" id="gachaReport" class="report-canvas" />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue';
import { onLoad, onShareAppMessage, onUnload } from '@dcloudio/uni-app';
import { POOLS } from './lib/pools.js';
import { gachaAsset } from './lib/assets.js';
import { findPool, pityOf, rollOne } from './lib/rate.js';
import { slabArt, summonArt, traitOf } from './lib/cards.js';
import { buildReport, canvasToFile, flushCanvas, loadReportImages, paintReport } from './lib/report.js';
import { AD_BONUS, AD_MAX, addAdBonus, consumeQuota, loadQuota, loadStore, quotaRemaining, saveStore } from './lib/store.js';

const pools = POOLS;
const activeId = ref(POOLS[0].id);
const store = ref(loadStore());
const quota = ref(loadQuota());
const batch = ref([]);
const stageOpen = ref(false);
const lastCount = ref(1);
const STEP = 260;
const phase = ref('loading');
const revealed = ref([]);
const cursor = ref(0);
const summonIndex = ref(-1);
const reportOpen = ref(false);
const reportPath = ref('');
const reportBusy = ref(false);
const reportSaved = ref(false);
let timer = null;
let ritualTimer = null;


const isSolo = computed(() => batch.value.length === 1);
const summonItem = computed(() => (summonIndex.value >= 0 ? batch.value[summonIndex.value] : null));
const summonTraits = computed(() => (summonItem.value ? traitOf(summonItem.value.name) : { role: '', elements: [], summary: '' }));
const counts = computed(() => {
  const five = batch.value.filter((item) => item.rarity === 5).length;
  const four = batch.value.filter((item) => item.rarity === 4).length;
  return { five, four };
});
const headText = computed(() => {
  const pool = activePool.value.name;
  return isSolo.value ? '观测结果 · ' + pool + ' · 单次' : '观测结果 · ' + pool + ' · 十次';
});
const footerHint = computed(() => {
  if (phase.value === 'loading') return '星光正在汇聚';
  if (phase.value === 'ritual') return '命运的红线正在显现';
  if (phase.value === 'summon') return '点击「确认」继续揭示';
  if (phase.value === 'done') return '本次五星 ' + counts.value.five + ' · 四星 ' + counts.value.four;
  return '逐张揭示中';
});
const ritualText = computed(() => '星光汇聚之时\n命运的红线正在显现');
const loadingSize = computed(() => {
  // 单行不换行：按「池名 · 观测中」总字数把字号压进容器宽度（620rpx，字距 4rpx），
  // 6 字池名约 58rpx、8 字约 48rpx、更长继续缩，不会截字也不会折行。
  const chars = Math.max(1, ((activePool.value.name || '') + ' · 观测中').length);
  const size = Math.floor((620 - (chars - 1) * 4) / chars);
  return Math.min(60, Math.max(30, size)) + 'rpx';
});

function isFeatured(item) {
  return item && item.rarity === 5 && item.kind === '角色';
}

function artOf(item) {
  return slabArt(item);
}

/** 五星角色的主元素图标：只在有定位/元素数据时显示。 */
function elemIcon(item) {
  if (item.rarity !== 5) return '';
  const trait = traitOf(item.name);
  const first = trait.elements[0];
  return first ? first.icon : '';
}

function typeLine(item) {
  if (item.rarity === 5 && item.kind === '角色') {
    const trait = traitOf(item.name);
    const element = trait.elements[0] ? trait.elements[0].label : '';
    if (trait.role && element) return trait.role + ' · ' + element;
    if (trait.role) return trait.role;
    if (element) return element;
  }
  return item.kind;
}

function clearTimers() {
  if (timer) clearTimeout(timer);
  if (ritualTimer) clearTimeout(ritualTimer);
  timer = null;
  ritualTimer = null;
}

/** 逐张揭示；碰到五星角色先播过场，确认后才继续。 */
function tick() {
  if (cursor.value >= batch.value.length) {
    phase.value = 'done';
    return;
  }
  const item = batch.value[cursor.value];
  if (isFeatured(item) && !revealed.value[cursor.value]) {
    summonIndex.value = cursor.value;
    phase.value = 'ritual';
    ritualTimer = setTimeout(() => {
      phase.value = 'summon';
    }, 1500);
    return;
  }
  revealed.value[cursor.value] = true;
  cursor.value += 1;
  timer = setTimeout(tick, STEP);
}

/** 跳过：直接揭示普通卡，但每张五星角色仍要走召唤。 */
function onSkip() {
  if (phase.value !== 'flip') return;
  clearTimers();
  while (cursor.value < batch.value.length) {
    const item = batch.value[cursor.value];
    if (isFeatured(item) && !revealed.value[cursor.value]) break;
    revealed.value[cursor.value] = true;
    cursor.value += 1;
  }
  if (cursor.value >= batch.value.length) phase.value = 'done';
  else tick();
}

function confirmSummon() {
  if (summonIndex.value < 0) return;
  revealed.value[summonIndex.value] = true;
  cursor.value = summonIndex.value + 1;
  summonIndex.value = -1;
  phase.value = 'flip';
  timer = setTimeout(tick, 320);
}

function onBack() {
  clearTimers();
  closeStage();
}

function onAgain() {
  if (phase.value !== 'done') return;
  clearTimers();
  replayStage();
}

function startStage() {
  phase.value = 'loading';
  revealed.value = batch.value.map(() => false);
  cursor.value = 0;
  summonIndex.value = -1;
  clearTimers();
  timer = setTimeout(() => {
    phase.value = 'flip';
    timer = setTimeout(tick, 240);
  }, 780);
}

const activePool = computed(() => findPool(activeId.value));
const remaining = computed(() => quotaRemaining(quota.value));
const materialIcon = computed(() => {
  const limited = activePool.value.group.indexOf('limited') === 0;
  return gachaAsset(limited ? 'gacha-assets/material-limited.png' : 'gacha-assets/material-standard.png');
});

onUnload(() => {
  clearTimers();
});

onLoad((options) => {
  // 每次进入同步一次次数，跨 0 点会在这里自动重置
  quota.value = loadQuota();
  // 分享链接带卡池参数时直接定位到该池
  if (options && options.pool && POOLS.some((pool) => pool.id === options.pool)) {
    activeId.value = options.pool;
  }
});

function coverOf(pool) {
  // 优先单张缩略图；限定灵子池只有拼贴背景（cover.bg + 7 张卡）时先退到背景，拼贴在阶段 B 还原
  return gachaAsset(pool.thumb) || gachaAsset(pool.art) || gachaAsset(pool.cover && pool.cover.bg);
}

function pityGap(pool) {
  const gap = pityOf(store.value, pool).sinceFive;
  return Math.max(0, pool.cap - gap);
}

function selectPool(id) {
  activeId.value = id;
}

function canDraw(count) {
  if (activePool.value.limit) {
    const total = store.value.pools[activePool.value.id].total;
    if (total + count > activePool.value.limit) return false;
  }
  return remaining.value >= count;
}

function draw(count) {
  const pool = activePool.value;
  if (!canDraw(count)) {
    // 次数不足或新手池达上限：优先引导加次
    if (remaining.value < count) onWatchAd();
    else uni.showToast({ title: '该卡池最多 ' + pool.limit + ' 抽', icon: 'none' });
    return;
  }
  const records = [];
  for (let i = 0; i < count; i += 1) {
    const record = rollOne(pool, store.value);
    if (!record) break;
    records.push(record);
  }
  if (!records.length) return;
  consumeQuota(quota.value, records.length);
  saveStore(store.value);
  lastCount.value = records.length;
  batch.value = records;
  stageOpen.value = true;
  startStage();
}

/** 结果页关闭：重读存档与次数，刷新保底进度与剩余次数。 */
function closeStage() {
  stageOpen.value = false;
  store.value = loadStore();
  quota.value = loadQuota();
  batch.value = [];
}

/** 结果页「再抽一次」：沿用同一卡池与抽数重新抽取，次数不足时回到卡池页。 */
function replayStage() {
  const pool = activePool.value;
  if (!canDraw(lastCount.value)) {
    closeStage();
    uni.showToast({ title: '本日次数不足，剩余 ' + remaining.value + ' 抽', icon: 'none' });
    return;
  }
  const records = [];
  for (let i = 0; i < lastCount.value; i += 1) {
    const record = rollOne(pool, store.value);
    if (!record) break;
    records.push(record);
  }
  if (!records.length) return;
  consumeQuota(quota.value, records.length);
  saveStore(store.value);
  batch.value = records;
  startStage();
}

function onQuotaTap() {
  uni.showModal({
    title: '本日抽卡次数',
    content: '每天 0 点重置，免费 ' + 300 + ' 抽；看一次广告 +' + AD_BONUS + ' 抽，每日最多 ' + AD_MAX + ' 次。当前剩余 ' + remaining.value + ' 抽。',
    showCancel: false,
    confirmText: '知道了'
  });
}

function onWatchAd() {
  if (quota.value.adUsed >= AD_MAX) {
    uni.showToast({ title: '今日加次已用完', icon: 'none' });
    return;
  }
  // 广告位未配置（待确认 #2）：先用测试确认弹框，确认即 +300
  uni.showModal({
    title: '看广告增加次数',
    content: '广告位尚未配置，本次为测试加次：确认后增加 ' + AD_BONUS + ' 次（今日剩余 ' + (AD_MAX - quota.value.adUsed) + ' 次机会）。',
    confirmText: '确认加次',
    success: (res) => {
      if (!res.confirm) return;
      const result = addAdBonus(quota.value);
      if (!result.ok) {
        uni.showToast({ title: result.reason, icon: 'none' });
        return;
      }
      quota.value = result.quota;
      uni.showToast({ title: '+' + AD_BONUS + ' 次', icon: 'none' });
    }
  });
}

/** 返回首页；通过分享链接直接进入时也能离开抽卡板块。 */
function goHome() {
  uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/index/index' }) });
}

function goHistory() {
  uni.navigateTo({ url: '/pkg-gacha/history?pool=' + activeId.value });
}

function onReport() {
  if (reportBusy.value) return;
  const { scope, stat } = buildReport(store.value, activeId.value);
  if (!stat.total) {
    uni.showToast({ title: '还没有观测记录，先抽一次再生成', icon: 'none' });
    return;
  }
  reportBusy.value = true;
  uni.showLoading({ title: '生成中', mask: true });
  renderReport(scope, stat, true)
    .catch(() => {
      // 卡面读不到时退回首字色块，保证任何环境都能出图
      return renderReport(scope, stat, false);
    })
    .then(() => {
      uni.hideLoading();
      reportBusy.value = false;
    })
    .catch(() => {
      uni.hideLoading();
      reportBusy.value = false;
      uni.showToast({ title: '当前环境无法出图，截屏记录页也可以', icon: 'none' });
    });
}

async function renderReport(scope, stat, withImages) {
  const images = withImages ? await loadReportImages(stat) : [];
  const ctx = uni.createCanvasContext('gachaReport');
  paintReport(ctx, scope, stat, images);
  await flushCanvas(ctx);
  const path = await canvasToFile('gachaReport');
  reportPath.value = path;
  reportSaved.value = false;
  reportOpen.value = true;
}

function closeReport() {
  reportOpen.value = false;
}

function saveReport() {
  if (!reportPath.value) return;
  // H5 没有「保存到相册」API：提示长按保存，避免按钮点了没反应
  if (typeof uni.saveImageToPhotosAlbum !== 'function') {
    uni.showToast({ title: '长按图片可保存', icon: 'none' });
    return;
  }
  uni.saveImageToPhotosAlbum({
    filePath: reportPath.value,
    success: () => {
      reportSaved.value = true;
      uni.showToast({ title: '已保存到相册', icon: 'none' });
    },
    fail: (error) => {
      const message = String((error && error.errMsg) || '');
      if (message.indexOf('auth') >= 0 || message.indexOf('authorize') >= 0) {
        uni.showModal({
          title: '需要相册权限',
          content: '保存分享图需要「保存到相册」权限，可在设置中开启后重试。',
          confirmText: '去设置',
          success: (res) => {
            if (res.confirm) uni.openSetting();
          }
        });
        return;
      }
      uni.showToast({ title: '保存失败，可长按图片保存', icon: 'none' });
    }
  });
}

onShareAppMessage(() => ({
  title: '奇波小程序--抽卡模拟｜星原观测，来试试手气',
  path: '/pkg-gacha/index?pool=' + activeId.value,
  imageUrl: gachaAsset('gacha-assets/share-icon.png') || undefined
}));
</script>

<style scoped>
.gacha {
  position: relative;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f7f4ee;
  color: #4a4550;
  overflow: hidden;
}
.gacha__bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(120% 60% at 20% 0%, #efe7f2 0%, rgba(239, 231, 242, 0) 60%),
    radial-gradient(100% 50% at 100% 10%, #e8eef4 0%, rgba(232, 238, 244, 0) 55%),
    linear-gradient(180deg, #fbf9f4 0%, #f7f4ee 100%);
}

.top {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 28rpx 32rpx 12rpx;
}
.top__brand { display: flex; flex-direction: column; }
.top__title {
  font-size: 44rpx;
  font-weight: 600;
  letter-spacing: 4rpx;
  color: #3f3a44;
}
.top__sub {
  margin-top: 8rpx;
  font-size: 22rpx;
  letter-spacing: 2rpx;
  color: #9a9189;
}
.quota {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 132rpx;
  padding: 12rpx 18rpx;
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 6rpx 18rpx rgba(120, 100, 80, 0.12), inset 0 0 0 1rpx rgba(255, 255, 255, 0.9);
}
.quota--low { background: rgba(255, 243, 235, 0.95); }
.quota__num { font-size: 34rpx; font-weight: 700; color: #8a6a4f; line-height: 1.1; }
.quota__label { margin-top: 2rpx; font-size: 20rpx; color: #a99a8b; letter-spacing: 1rpx; }

.pools {
  position: relative;
  flex: 1;
  min-height: 0;
  padding: 8rpx 24rpx 0;
  box-sizing: border-box;
}
.pools__pad { height: 24rpx; }
.pool {
  position: relative;
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 18rpx;
  padding: 16rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 6rpx 20rpx rgba(120, 100, 80, 0.08), inset 0 0 0 1rpx rgba(255, 255, 255, 0.7);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.pool--hover { transform: scale(0.99); }
.pool--active {
  background: #fffdf9;
  box-shadow: 0 10rpx 26rpx rgba(120, 100, 80, 0.16), inset 0 0 0 3rpx var(--accent);
}
.pool__cover {
  width: 116rpx;
  height: 148rpx;
  border-radius: 14rpx;
  flex: none;
  background: #eee7dc;
}
.pool__cover--empty { display: flex; align-items: center; justify-content: center; }
.pool__symbol { font-size: 46rpx; color: var(--accent); font-weight: 600; }
.pool__body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6rpx; }
.pool__row { display: flex; align-items: center; gap: 10rpx; }
.pool__name { font-size: 32rpx; font-weight: 600; color: #3f3a44; letter-spacing: 2rpx; }
.pool__tag {
  padding: 2rpx 10rpx;
  border-radius: 8rpx;
  font-size: 18rpx;
  color: #8d8378;
  background: rgba(140, 125, 105, 0.1);
}
.pool__tag--up { color: #fff; background: var(--accent); }
.pool__type { font-size: 22rpx; color: #9a9189; letter-spacing: 1rpx; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.pool__meta { display: flex; align-items: center; gap: 14rpx; font-size: 21rpx; color: #a99a8b; }
.pool__pity { color: var(--accent); }
.pool__check {
  position: absolute;
  right: 16rpx;
  top: 16rpx;
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  color: #fff;
  font-size: 20rpx;
  line-height: 32rpx;
  text-align: center;
  opacity: 0;
  transform: scale(0.6);
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.pool--active .pool__check { opacity: 1; transform: scale(1); }

.bar {
  position: relative;
  padding: 16rpx 28rpx calc(20rpx + env(safe-area-inset-bottom));
  background: rgba(255, 253, 249, 0.94);
  box-shadow: 0 -8rpx 26rpx rgba(120, 100, 80, 0.1);
}
.bar__quota {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14rpx;
  font-size: 21rpx;
  color: #9a9189;
  padding-bottom: 10rpx;
}
.bar__ad { color: #b8874a; text-decoration: underline; }
.bar__actions { display: flex; gap: 18rpx; }
.btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  height: 96rpx;
  border-radius: 22rpx;
  font-size: 30rpx;
  letter-spacing: 2rpx;
}
.btn--main {
  color: #fffdf8;
  background: linear-gradient(135deg, var(--accent) 0%, #8d7fa8 100%);
  box-shadow: 0 10rpx 22rpx rgba(120, 100, 130, 0.28);
}
.btn--ghost {
  color: #5c5560;
  background: #fffdf8;
  box-shadow: inset 0 0 0 2rpx rgba(140, 125, 145, 0.35);
}
.btn--hover { transform: translateY(2rpx); }
.btn--disabled { opacity: 0.45; }
.btn__mat { width: 44rpx; height: 44rpx; }
.btn__text { line-height: 1; }
.bar__links {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding-top: 14rpx;
  font-size: 22rpx;
  color: #8d8378;
}
.link { padding: 4rpx 8rpx; }
/* 转发按钮：抹掉小程序 button 默认外观，和左右的文字链接保持一致 */
.link--btn {
  margin: 0;
  padding: 4rpx 8rpx;
  border: 0;
  border-radius: 0;
  background: transparent;
  font-size: 22rpx;
  line-height: 1.5;
  color: inherit;
  letter-spacing: inherit;
}
.link--btn::after { border: 0; }
.link__dot { color: #cdc3b8; }
.bar__mark {
  display: block;
  padding-top: 8rpx;
  text-align: right;
  font-size: 18rpx;
  letter-spacing: 1rpx;
  /* 18rpx 小字按 WCAG AA（≥4.5:1）：#b0a496 在 #fefcf8 上仅 2.38:1，实测偏浅难读 */
  color: #655b50;
}

/* ===== 抽卡结果层（自 src/components/gacha-stage 内联，避免占用主包） ===== */
.stage {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  flex-direction: column;
  background: #f3ede3;
  overflow: hidden;
}
.stage__bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(58% 42% at 12% 8%, #ffffff 0%, rgba(255, 255, 255, 0) 62%),
    radial-gradient(50% 46% at 92% 92%, #ffffff 0%, rgba(255, 255, 255, 0) 60%),
    radial-gradient(80% 70% at 50% 46%, #f8f3ea 0%, #efe7da 74%, #e7ddcd 100%);
}

.head {
  position: relative;
  display: flex;
  align-items: baseline;
  gap: 16rpx;
  padding: calc(24rpx + env(safe-area-inset-top)) 40rpx 0;
}
.head__en {
  font-size: 34rpx;
  letter-spacing: 4rpx;
  color: #5a5860;
}
.head__zh {
  font-size: 21rpx;
  letter-spacing: 1rpx;
  color: #8d877f;
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.rule {
  position: relative;
  margin: 16rpx 40rpx 0;
  height: 1rpx;
  background: linear-gradient(to right, #b9b2a6 0%, #cfc8bb 60%, rgba(207, 200, 187, 0) 100%);
}

.cards {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  justify-content: center;
  gap: 12rpx;
  padding: 16rpx 40rpx;
  box-sizing: border-box;
}
.cards--solo {
  flex-wrap: nowrap;
  align-items: center;
}

.slab {
  position: relative;
  width: 118rpx;
  height: 470rpx;
  border-radius: 10rpx;
  --h5: #b98b3a;
  --h4: #7c5aa6;
  --h3: #55708f;
}
.cards--solo .slab {
  width: 400rpx;
  height: 620rpx;
}
.slab--r5 { --rarity: var(--h5); --rarity-soft: rgba(255, 224, 160, 0.22); }
.slab--r4 { --rarity: var(--h4); --rarity-soft: rgba(214, 180, 255, 0.2); }
.slab--r3 { --rarity: var(--h3); --rarity-soft: rgba(178, 208, 240, 0.18); }

.slab__pane {
  position: absolute;
  inset: 0;
  border-radius: 10rpx;
  overflow: hidden;
  border: 1rpx solid rgba(255, 255, 255, 0.82);
  box-shadow: 0 12rpx 26rpx rgba(76, 67, 53, 0.15), 0 3rpx 8rpx rgba(76, 67, 53, 0.12);
  background: radial-gradient(120% 60% at 50% 0%, #3d5878 0%, #2b3f5c 52%, #223450 100%);
}
.slab__back {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.slab__glyph {
  font-size: 46rpx;
  color: #e8d5a8;
  opacity: 0.9;
}
.slab__front {
  position: absolute;
  inset: 0;
  opacity: 0;
  transform: scale(1.04);
  transition: opacity 0.45s ease, transform 0.55s cubic-bezier(0.2, 0.8, 0.2, 1);
  background: linear-gradient(170deg, var(--rarity-soft) 0%, rgba(255, 255, 255, 0) 60%);
}
.slab--show .slab__front {
  opacity: 1;
  transform: scale(1);
}
.slab__art {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.slab--soul .slab__art {
  padding: 6rpx;
  box-sizing: border-box;
  background: linear-gradient(180deg, #fffefb 0%, #fdfaf3 52%, #f3ebdc 100%);
}
.slab__fallback {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ad9e87;
  font-size: 52rpx;
  font-weight: 600;
  background: #efe7da;
}
.slab__scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0) 34%, rgba(30, 26, 40, 0.16) 66%, rgba(30, 26, 40, 0.55) 100%);
}
.slab__halo {
  position: absolute;
  inset: 0;
  background: radial-gradient(60% 40% at 50% 24%, rgba(255, 226, 160, 0.55) 0%, rgba(255, 226, 160, 0) 72%);
}
.slab__shine {
  position: absolute;
  top: -20%;
  bottom: -20%;
  width: 40rpx;
  left: -60rpx;
  background: linear-gradient(100deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.7) 50%, rgba(255, 255, 255, 0) 100%);
  opacity: 0;
}
.slab--show .slab__shine {
  animation: sweep 0.85s ease-out 0.16s 1 both;
}
@keyframes sweep {
  0% { opacity: 0; transform: translateX(0); }
  20% { opacity: 0.9; }
  100% { opacity: 0; transform: translateX(340rpx); }
}

.slab__plate {
  position: absolute;
  left: 0;
  right: 0;
  top: 14rpx;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  opacity: 0;
  transition: opacity 0.4s ease 0.5s;
}
.slab--show .slab__plate { opacity: 1; }
.slab__plate-name {
  font-size: 20rpx;
  letter-spacing: 1rpx;
  color: #403d49;
  text-shadow: 0 1rpx 0 rgba(255, 255, 255, 0.8), 0 0 10rpx rgba(255, 255, 255, 0.9);
  white-space: nowrap;
}
.slab__plate-sub {
  margin-top: 4rpx;
  font-size: 16rpx;
  letter-spacing: 1rpx;
  color: rgba(60, 58, 72, 0.72);
  white-space: nowrap;
}
.cards--solo .slab__plate-name { font-size: 34rpx; }
.cards--solo .slab__plate-sub { font-size: 22rpx; }

.slab__bar {
  position: absolute;
  left: 6rpx;
  right: 6rpx;
  bottom: 8rpx;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rpx;
  padding: 8rpx 4rpx;
  border-radius: 12rpx;
  background: linear-gradient(180deg, rgba(30, 26, 40, 0.78) 0%, rgba(18, 16, 26, 0.92) 100%);
  border: 1rpx solid rgba(255, 255, 255, 0.16);
  opacity: 0;
  transform: translateY(12rpx);
  transition: opacity 0.4s ease 0.42s, transform 0.45s cubic-bezier(0.22, 1, 0.36, 1) 0.42s;
}
.slab--show .slab__bar {
  opacity: 1;
  transform: none;
}
.cards--solo .slab__bar {
  left: 24rpx;
  right: 24rpx;
  bottom: 24rpx;
  gap: 6rpx;
  padding: 16rpx;
  border-radius: 18rpx;
}
.slab__stars {
  display: flex;
  gap: 2rpx;
  color: #f0d9a0;
  font-size: 16rpx;
  line-height: 1;
}
.cards--solo .slab__stars { font-size: 26rpx; gap: 4rpx; }
.slab--r4 .slab__stars { color: #dcc0ff; }
.slab--r3 .slab__stars { color: #cfe0f2; }
.slab__name {
  max-width: 100%;
  font-size: 18rpx;
  font-weight: 600;
  color: #f5f7fc;
  letter-spacing: 1rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.cards--solo .slab__name { font-size: 32rpx; }
.slab__type-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3rpx;
  max-width: 100%;
  padding: 0 2rpx;
}
.slab__elem {
  width: 16rpx;
  height: 16rpx;
  flex: none;
}
.cards--solo .slab__elem {
  width: 24rpx;
  height: 24rpx;
}
.slab__type {
  max-width: 100%;
  font-size: 15rpx;
  color: rgba(226, 220, 240, 0.82);
  letter-spacing: 1rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.cards--solo .slab__type { font-size: 22rpx; }

.footer {
  position: relative;
  /* 底部留出 52rpx：给「本日剩余 n 抽」与下方水印之间留空，避免叠字 */
  padding: 0 40rpx calc(52rpx + env(safe-area-inset-bottom));
}
.footer__hint {
  display: block;
  padding-bottom: 12rpx;
  text-align: center;
  font-size: 20rpx;
  letter-spacing: 2rpx;
  color: #a49d90;
}
.footer__row {
  display: flex;
  gap: 18rpx;
}
.footer__quota {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding-top: 12rpx;
}
.footer__quota-text { font-size: 20rpx; color: #9a9189; letter-spacing: 1rpx; }
.footer__ad {
  font-size: 20rpx;
  color: #b8874a;
  text-decoration: underline;
}
.sbtn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rpx;
  height: 92rpx;
  border-radius: 999rpx;
  transition: transform 0.15s ease;
}
.sbtn--hover { transform: translateY(2rpx); }
.sbtn--main {
  color: #f7f3ea;
  background: linear-gradient(180deg, #4e4c55 0%, #37363e 100%);
  box-shadow: 0 10rpx 22rpx rgba(44, 42, 50, 0.3);
}
.sbtn--ghost {
  color: #5c5560;
  background: rgba(255, 253, 249, 0.92);
  box-shadow: inset 0 0 0 2rpx rgba(180, 170, 155, 0.6);
}
.sbtn--off { opacity: 0.45; }
.sbtn__text { font-size: 28rpx; letter-spacing: 3rpx; }
.sbtn__sub { font-size: 16rpx; letter-spacing: 2rpx; opacity: 0.5; }

/* ===== 载入层 ===== */
.loading {
  position: fixed;
  inset: 0;
  z-index: 96;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(58% 58% at 50% 46%, rgba(255, 254, 250, 0.96) 0%, rgba(244, 238, 228, 0.92) 58%, rgba(232, 223, 210, 0.9) 100%);
}
.load {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18rpx;
}
.load__ring {
  position: relative;
  width: 220rpx;
  height: 220rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.load__ring-in {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2rpx solid rgba(136, 115, 156, 0.55);
  border-top-color: rgba(0, 0, 0, 0);
  animation: load-spin 2s linear infinite;
}
.load__ring::after {
  content: '';
  position: absolute;
  inset: 40rpx;
  border-radius: 50%;
  border: 1rpx solid rgba(136, 115, 156, 0.3);
  border-right-color: rgba(0, 0, 0, 0);
  animation: load-spin 3.1s linear infinite reverse;
}
.load__star {
  font-size: 44rpx;
  color: var(--accent, #88739c);
  animation: load-pulse 1.9s ease-in-out infinite;
}
.load__track {
  width: 260rpx;
  height: 3rpx;
  border-radius: 3rpx;
  background: #e4dccd;
  overflow: hidden;
}
.load__bar {
  width: 42%;
  height: 100%;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, var(--accent, #88739c) 50%, rgba(255, 255, 255, 0) 100%);
  animation: load-slide 1.5s ease-in-out infinite;
}
.load__pool {
  max-width: 560rpx;
  text-align: center;
  line-height: 1.2;
  font-weight: 500;
  letter-spacing: 4rpx;
  color: #333d49;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: clip;
}
.load__caption {
  font-size: 18rpx;
  letter-spacing: 8rpx;
  color: #8f8678;
}
@keyframes load-spin { to { transform: rotate(360deg); } }
@keyframes load-pulse {
  0%, 100% { opacity: 0.35; transform: scale(0.92); }
  50% { opacity: 1; transform: scale(1.04); }
}
@keyframes load-slide {
  0% { transform: translateX(-110%); }
  100% { transform: translateX(340%); }
}

/* ===== 方形文字过场 ===== */
.ritual {
  position: fixed;
  inset: 0;
  z-index: 94;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(60% 55% at 50% 48%, #16203c 0%, #0b1226 58%, #05070f 100%);
}
.ritual__frame {
  position: absolute;
  border: 2rpx solid rgba(245, 217, 149, 0.45);
  box-shadow: 0 0 40rpx rgba(245, 217, 149, 0.18) inset;
}
.ritual__frame--a {
  width: 300rpx;
  height: 300rpx;
  animation: square-spin 8.5s linear infinite;
}
.ritual__frame--b {
  width: 400rpx;
  height: 400rpx;
  border-color: rgba(245, 217, 149, 0.3);
  animation: square-spin-rev 11s linear infinite;
}
.ritual__frame--c {
  width: 500rpx;
  height: 500rpx;
  border-color: rgba(245, 217, 149, 0.16);
  animation: square-spin 14s linear infinite;
}
.ritual__text {
  position: relative;
  z-index: 2;
  max-width: 420rpx;
  text-align: center;
  font-size: 26rpx;
  line-height: 2;
  letter-spacing: 6rpx;
  color: #f2e6c8;
  text-shadow: 0 0 20rpx rgba(245, 217, 149, 0.5);
  animation: ritual-in 0.9s ease both;
}
@keyframes square-spin {
  from { transform: rotate(0deg) scale(0.82); }
  to { transform: rotate(360deg) scale(1); }
}
@keyframes square-spin-rev {
  from { transform: rotate(0deg) scale(1); }
  to { transform: rotate(-360deg) scale(0.86); }
}
@keyframes ritual-in {
  from { opacity: 0; transform: translateY(12rpx); }
  to { opacity: 1; transform: none; }
}

/* ===== 五星召唤 ===== */
.summon {
  position: fixed;
  inset: 0;
  z-index: 95;
  overflow: hidden;
  background: radial-gradient(70% 55% at 50% 42%, #1a2547 0%, #0c1226 58%, #05070f 100%);
}
.summon__glow {
  position: absolute;
  left: 50%;
  top: 30%;
  width: 900rpx;
  height: 900rpx;
  margin-left: -450rpx;
  margin-top: -450rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(246, 216, 148, 0.3) 0%, rgba(198, 139, 56, 0.12) 42%, rgba(0, 0, 0, 0) 70%);
}
.summon__rays {
  position: absolute;
  left: 50%;
  top: 32%;
  width: 1200rpx;
  height: 1200rpx;
  margin-left: -600rpx;
  margin-top: -600rpx;
  background: repeating-conic-gradient(from 10deg, rgba(255, 229, 161, 0.3) 0deg 1.2deg, rgba(255, 229, 161, 0) 1.2deg 18deg);
  animation: rays-spin 42s linear infinite;
  opacity: 0.5;
  mask-image: radial-gradient(circle at 50% 50%, #000 0%, rgba(0, 0, 0, 0) 62%);
  -webkit-mask-image: radial-gradient(circle at 50% 50%, #000 0%, rgba(0, 0, 0, 0) 62%);
}
.summon__art {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  width: 100%;
  height: 62%;
  animation: art-in 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}
.summon__fade {
  position: absolute;
  left: 0;
  right: 0;
  top: 36%;
  height: 32%;
  background: linear-gradient(180deg, rgba(5, 7, 15, 0) 0%, rgba(5, 7, 15, 0.55) 62%, #05070f 100%);
}
.summon__info {
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(160rpx + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  padding: 0 60rpx;
  animation: info-in 0.7s ease 0.24s both;
}
.summon__kicker {
  font-size: 18rpx;
  letter-spacing: 6rpx;
  color: rgba(245, 217, 149, 0.72);
}
.summon__name {
  font-size: 56rpx;
  font-weight: 600;
  letter-spacing: 6rpx;
  color: #fbf3dd;
  text-shadow: 0 4rpx 24rpx rgba(246, 216, 148, 0.4);
}
.summon__traits {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 6rpx 20rpx;
  border-radius: 999rpx;
  background: rgba(255, 244, 219, 0.1);
  border: 1rpx solid rgba(245, 217, 149, 0.3);
}
.summon__role {
  font-size: 22rpx;
  letter-spacing: 2rpx;
  color: #f4e3bd;
}
.summon__dot { color: rgba(245, 217, 149, 0.6); font-size: 22rpx; }
.summon__trait { display: flex; align-items: center; gap: 6rpx; }
.summon__trait-icon { width: 28rpx; height: 28rpx; }
.summon__trait-label { font-size: 22rpx; color: #f4e3bd; letter-spacing: 1rpx; }
.summon__summary {
  margin-top: 6rpx;
  max-width: 560rpx;
  text-align: center;
  font-size: 21rpx;
  line-height: 1.9;
  letter-spacing: 1rpx;
  color: rgba(236, 230, 216, 0.7);
}
.summon__confirm {
  position: absolute;
  left: 50%;
  bottom: calc(56rpx + env(safe-area-inset-bottom));
  width: 300rpx;
  margin-left: -150rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rpx;
  padding: 16rpx 0;
  border-radius: 999rpx;
  background: linear-gradient(180deg, rgba(255, 244, 219, 0.96) 0%, rgba(240, 213, 156, 0.92) 100%);
  box-shadow: 0 12rpx 28rpx rgba(0, 0, 0, 0.4);
}
.summon__confirm-text {
  font-size: 26rpx;
  letter-spacing: 8rpx;
  color: #4a3413;
}
.summon__confirm-sub {
  font-size: 15rpx;
  letter-spacing: 4rpx;
  color: rgba(74, 52, 19, 0.55);
}
@keyframes rays-spin { to { transform: rotate(360deg); } }
@keyframes art-in {
  from { opacity: 0; transform: translateY(20rpx) scale(1.04); }
  to { opacity: 1; transform: none; }
}
@keyframes info-in {
  from { opacity: 0; transform: translateY(16rpx); }
  to { opacity: 1; transform: none; }
}

.mark {
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(6rpx + env(safe-area-inset-bottom));
  z-index: 96;
  text-align: center;
  font-size: 18rpx;
  letter-spacing: 1rpx;
  /* 原 rgba(110,100,86,.72) 在底部渐变（约 #e8dfd0）上只有 2.9:1，小字发虚；
     改实色 #655b50 → 5.36:1，仍比正文（#4a4136）浅一档 */
  color: #655b50;
}
.mark--dark {
  /* 原 0.5 在渐变最亮处（#1a2547）只有 4.18:1，压线不合格；0.58 → 5.71:1 */
  color: rgba(240, 232, 210, 0.58);
}

/* 分享图：离屏画布 + 预览弹层 */
.report-canvas {
  position: fixed;
  left: 0;
  top: 0;
  z-index: -1;
  width: 750px;
  height: 1000px;
  opacity: 0;
  pointer-events: none;
}
.report {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  align-items: center;
  justify-content: center;
}
.report__mask {
  position: absolute;
  inset: 0;
  background: rgba(28, 24, 32, 0.82);
}
.report__body {
  position: relative;
  width: 620rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18rpx;
}
.report__img {
  width: 620rpx;
  border-radius: 20rpx;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.4);
}
.report__tip {
  font-size: 20rpx;
  letter-spacing: 1rpx;
  color: rgba(240, 232, 210, 0.72);
  text-align: center;
}
.report__btns {
  display: flex;
  gap: 24rpx;
}
.report__btn {
  min-width: 200rpx;
  padding: 18rpx 28rpx;
  border-radius: 999rpx;
  text-align: center;
  font-size: 26rpx;
  color: #f6efe2;
  background: rgba(255, 255, 255, 0.12);
  box-shadow: inset 0 0 0 1rpx rgba(255, 255, 255, 0.28);
}
.report__btn--main {
  color: #3f3a44;
  background: linear-gradient(180deg, #fdf7ea, #efe2c8);
  box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.24);
}


.scene, .scene-info, .top__back, .summon__portrait { display: none; }
@media screen and (orientation: landscape) {
  .gacha { --safe-left: max(20px, env(safe-area-inset-left)); --safe-right: max(24px, env(safe-area-inset-right)); position: fixed; inset: 0; width: auto; height: auto; }
  .scene { display: block; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(112deg, #fbf9f4, var(--soft) 52%, #fdfcf9); }
  .scene__poster { position: absolute; inset: 0; width: 100%; height: 100%; }
  .scene--poster .scene__veil { background: linear-gradient(90deg, #211e301a, transparent 24%, transparent 66%, #faf8f526); }
  .scene__backdrop { position: absolute; inset: -10%; width: 120%; height: 120%; filter: blur(16px); opacity: .42; }
  .scene__art { position: absolute; left: 21%; top: 5%; width: 48%; height: 94%; }
  .scene__art--cover { left: 0; top: 0; width: 100%; height: 100%; opacity: .85; }
  .scene__portrait { position: absolute; right: -4%; top: -6%; width: 45%; height: 112%; opacity: .12; }
  .scene__cover { position: absolute; inset: 0; }
  .scene__card { position: absolute; filter: drop-shadow(0 10px 14px #2c224642); }
  .scene__veil { position: absolute; inset: 0; background: linear-gradient(94deg, transparent 40%, #faf6ee70 60%, #faf6eef0 78%); }
  .scene__theme { position: absolute; left: 30%; bottom: 15%; display: flex; flex-direction: column; gap: 3px; color: #fff; text-shadow: 0 1px 8px #182034cc; }
  .scene__theme-en { font-size: 9px; letter-spacing: 3px; }
  .scene__theme-title { font-size: clamp(18px, 5.8vh, 28px); letter-spacing: 4px; }
  .scene__theme-caption { font-size: 10px; color: #f6e6c2; }
  .top { position: absolute; z-index: 3; left: var(--safe-left); right: var(--safe-right); top: max(8px, env(safe-area-inset-top)); height: 38px; padding: 0; align-items: center; gap: 8px; }
  .top__back { display: flex; align-items: center; justify-content: center; flex: none; width: 36px; height: 36px; border-radius: 50%; background: #fffdf8d9; font-size: 28px; line-height: 1; }
  .top__brand { flex: 1; }
  .top__title { font-size: 16px; letter-spacing: 2px; color: #fff; text-shadow: 0 1px 5px #28233b; }
  .top__sub { margin-top: 1px; font-size: 9px; letter-spacing: 1px; color: #eee6d9; text-shadow: 0 1px 4px #28233b; }
  .quota { min-width: 58px; padding: 4px 10px; margin-right: 110px; border-radius: 12px; }
  .quota__num { font-size: 18px; }
  .quota__label { font-size: 9px; }
  .pools { position: absolute; z-index: 3; left: var(--safe-left); top: 62px; bottom: auto; width: 19%; min-width: 136px; max-width: 174px; height: calc(100% - 108px - env(safe-area-inset-bottom)); padding: 2px 4px 0 0; }
  .pool { box-sizing: border-box; width: 100%; min-height: 44px; height: clamp(44px, 12vh, 62px); margin-bottom: 7px; gap: 6px; padding: 4px 16px 4px 4px; border-radius: 6px; background: #28233b99; box-shadow: inset 0 0 0 1px #ffffff42; }
  .pool--active { background: var(--accent); box-shadow: inset 0 0 0 2px #fff, 0 4px 10px #1c274033; }
  .pool__cover { width: 36px; height: 36px; border-radius: 4px; }
  .pool__body { gap: 2px; }
  .pool__row { gap: 4px; }
  .pool__name { font-size: 12px; white-space: nowrap; letter-spacing: 1px; color: #fff; }
  .pool__tag { padding: 1px 3px; font-size: 8px; background: #ffffff2b; color: #fff; }
  .pool__type { font-size: 8px; letter-spacing: 0; color: #f5f3ed; }
  .pool__meta { gap: 3px; font-size: 8px; color: #f5f3ed; }
  .pool__meta > text:first-child { display: none; }
  .pool__pity { color: #fff; }
  .pool__check { right: 5px; top: 50%; margin-top: -8px; width: 16px; height: 16px; line-height: 16px; font-size: 10px; }
  .pools__pad { height: 2px; }
  .scene-info { position: absolute; z-index: 2; right: var(--safe-right); top: 58px; bottom: 100px; width: 29%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
  .scene-info__overline { font-size: 8px; color: #7b7165; letter-spacing: 1px; }
  .scene-info__title { font-family: SimSun, serif; font-size: clamp(24px, 8vh, 40px); font-weight: 600; letter-spacing: 4px; color: var(--accent); margin: 6px 0 8px; }
  .scene-info__tag { padding: 4px 10px; background: var(--accent); color: #fff; font-size: 10px; border-radius: 20px; }
  .scene-info__desc { font-size: 10px; margin-top: 10px; line-height: 1.5; color: #6d6a72; }
  .scene-info__up { margin-top: 8px; color: #8a6420; font-size: 13px; }
  .scene-info__four { margin-top: 3px; color: #75568f; font-size: 10px; }
  .scene-info__guarantee { margin-top: 8px; font-size: 11px; color: #8a6420; }
  .bar { position: absolute; z-index: 3; left: var(--safe-left); right: var(--safe-right); bottom: calc(10px + env(safe-area-inset-bottom)); width: auto; height: 76px; box-sizing: border-box; padding: 0; background: transparent; box-shadow: none; pointer-events: none; }
  .bar__quota, .bar__actions { position: absolute; left: auto; right: 0; width: 36%; box-sizing: border-box; pointer-events: auto; }
  .bar__quota { top: 0; padding: 0; font-size: 10px; gap: 6px; }
  .bar__actions { top: 18px; gap: 8px; }
  .btn { box-sizing: border-box; flex: 1; width: 0; min-width: 0; height: 40px; border-radius: 24px; font-size: 12px; letter-spacing: 0; gap: 5px; }
  .btn--main { color: #5d4423; background: linear-gradient(135deg, #f9e79a, #eecf5e 55%, #e0ba4a); }
  .btn__mat { width: 20px; height: 20px; }
  .bar__links { position: absolute; left: 0; bottom: 0; gap: 4px; padding: 0; font-size: 11px; pointer-events: auto; }
  .link { padding: 5px 2px; }
  .link--btn { padding: 5px 2px; font-size: 11px; }
  .bar__mark { position: absolute; right: 0; bottom: 0; padding: 0; font-size: 9px; }
  .head { flex: none; box-sizing: border-box; height: 44px; padding: 12px calc(var(--safe-right) + 110px) 0 var(--safe-left); gap: 12px; align-items: baseline; }
  .head__en { font-size: 14px; letter-spacing: 2px; white-space: nowrap; }
  .head__zh { font-size: 10px; letter-spacing: 0; }
  .rule { flex: none; height: 1px; margin: 0 var(--safe-right) 0 var(--safe-left); }
  .cards { position: absolute; left: var(--safe-left); right: var(--safe-right); top: 54px; bottom: calc(100px + env(safe-area-inset-bottom)); padding: 0; flex-wrap: nowrap; align-items: center; justify-content: center; gap: .7%; }
  .slab { flex: none; width: 9.37%; height: 100%; max-height: 270px; border-radius: 6px; }
  .slab__pane { border-radius: 6px; }
  .slab__front { transform: scaleY(0); transform-origin: top; transition: transform .48s cubic-bezier(.2,.8,.2,1), opacity .3s; }
  .slab--show .slab__front { transform: scaleY(1); }
  .slab__glyph { font-size: 24px; }
  .slab__plate { top: 8px; }
  .slab__plate-name { font-size: 9px; letter-spacing: 0; }
  .slab__plate-sub { font-size: 8px; letter-spacing: 0; margin-top: 2px; }
  .slab__bar { left: 2px; right: 2px; bottom: 4px; padding: 5px 1px; gap: 2px; border-radius: 5px; }
  .slab__stars { font-size: 8px; gap: 0; }
  .slab__name { font-size: 10px; letter-spacing: 0; }
  .slab__type { font-size: 8px; letter-spacing: 0; }
  .slab__elem { width: 10px; height: 10px; }
  .cards--solo .slab { width: 30%; max-width: 210px; height: 100%; }
  .cards--solo .slab__plate-name { font-size: 15px; }
  .cards--solo .slab__plate-sub { font-size: 10px; }
  .cards--solo .slab__bar { left: 10px; right: 10px; bottom: 8px; padding: 6px; gap: 3px; }
  .cards--solo .slab__stars { font-size: 12px; }
  .cards--solo .slab__name { font-size: 15px; }
  .cards--solo .slab__type { font-size: 10px; }
  .cards--solo .slab__elem { width: 14px; height: 14px; }
  .footer { position: absolute; left: var(--safe-left); right: var(--safe-right); bottom: calc(18px + env(safe-area-inset-bottom)); padding: 0; }
  .footer__hint { padding-bottom: 6px; font-size: 10px; letter-spacing: 1px; }
  .footer__row { justify-content: center; gap: 14px; }
  .sbtn { flex: none; width: 28%; height: 40px; gap: 1px; }
  .sbtn__text { font-size: 13px; letter-spacing: 2px; }
  .sbtn__sub { font-size: 8px; letter-spacing: 1px; }
  .footer__quota { padding-top: 5px; gap: 6px; }
  .footer__quota-text, .footer__ad { font-size: 10px; letter-spacing: 0; }
  .mark { bottom: 3px; font-size: 9px; letter-spacing: 0; pointer-events: none; }
  .load { gap: 12px; }
  .load__ring { width: 32vh; height: 32vh; }
  .load__ring::after { inset: 6vh; }
  .load__star { font-size: 26px; }
  .load__track { width: 36vw; height: 2px; }
  .load__pool { font-size: 20px !important; max-width: 80vw; letter-spacing: 2px; }
  .load__caption { font-size: 10px; letter-spacing: 5px; }
  .ritual__frame { animation-duration: 1.5s; animation-iteration-count: 1; animation-fill-mode: both; }
  .ritual__frame--a { width: 45vh; height: 45vh; }
  .ritual__frame--b { width: 65vh; height: 65vh; }
  .ritual__frame--c { width: 90vh; height: 90vh; }
  .ritual__core { position: absolute; width: 45vh; height: 45vh; border-radius: 50%; background: radial-gradient(circle, #f3dea866, #f3dea800 68%); animation: load-pulse 1s ease-in-out infinite; }
  .ritual__text { max-width: 66vw; font-size: 15px; letter-spacing: 3px; white-space: pre-line; }
  .summon { background: radial-gradient(ellipse at 38% 40%, #fffaf0, #efe0c9 66%, #d5c3ad); }
  .summon__glow { left: 35%; top: 48%; width: 90vh; height: 90vh; margin: -45vh 0 0 -45vh; background: radial-gradient(circle, #fff5d7dd, #f9df9a55 45%, transparent 70%); }
  .summon__rays { left: 35%; top: 48%; width: 140vh; height: 140vh; margin: -70vh 0 0 -70vh; opacity: .32; }
  .summon__art { left: 3%; right: auto; top: 0; width: 61%; height: 100%; }
  .summon__portrait { display: block; position: absolute; right: -7%; top: -9%; width: 46%; height: 118%; opacity: .12; }
  .summon__fade { left: 45%; right: 0; top: 0; width: auto; height: 100%; background: linear-gradient(90deg, transparent, #f6ead4bb 50%, #f6ead4e6); }
  .summon__info { left: 60%; right: var(--safe-right); top: 18%; bottom: 80px; padding: 0; gap: 7px; align-items: flex-start; justify-content: center; }
  .summon__kicker { font-size: 9px; letter-spacing: 3px; color: #806c48; }
  .summon__name { font-family: SimSun, serif; font-size: clamp(24px, 8vh, 42px); letter-spacing: 4px; color: #4a3a28; text-shadow: 0 2px 14px #fff; }
  .summon__stars { color: #a47727; font-size: 16px; letter-spacing: 3px; }
  .summon__traits { gap: 5px; padding: 5px 9px; background: #fff9ed88; border-color: #a4772744; }
  .summon__role, .summon__trait-label, .summon__dot { font-size: 11px; color: #665137; letter-spacing: 0; }
  .summon__trait { gap: 3px; }
  .summon__trait-icon { width: 16px; height: 16px; }
  .summon__summary { margin-top: 2px; max-width: 100%; max-height: 54px; overflow: hidden; text-align: left; font-size: 11px; line-height: 1.6; letter-spacing: 0; color: #6e6557; }
  .summon__confirm { left: 60%; right: var(--safe-right); bottom: calc(24px + env(safe-area-inset-bottom)); width: auto; margin: 0; padding: 9px 0; }
  .summon__confirm-text { font-size: 13px; letter-spacing: 5px; }
  .summon__confirm-sub { font-size: 8px; letter-spacing: 3px; }
  .mark--dark { color: #f2e6c8; }
  .summon ~ .mark--dark { color: #655b50; }
  .report__body { width: auto; max-width: 88vw; max-height: 92vh; gap: 7px; }
  .report__img { width: 44vh; border-radius: 10px; flex: none; }
  .report__tip { max-width: 70vw; font-size: 10px; letter-spacing: 0; }
  .report__btns { gap: 10px; }
  .report__btn { min-width: 90px; padding: 8px 12px; font-size: 12px; }
}
</style>
