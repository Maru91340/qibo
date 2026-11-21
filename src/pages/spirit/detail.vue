<template>
  <view class="page se" :class="{ 'theme-dark': isDark }">
    <template v-if="item">
      <!-- 头部：稀有度色实底 hero + 星级 + 职业 + B/S 版图标 -->
      <view class="head hero-se" :style="{ '--rarity-color': rarityColor }">
        <view class="hero-se__inner">
          <view class="se-gallery">
            <view
              v-for="(variant, vIdx) in variants"
              :key="vIdx"
              class="se-gallery__item"
              hover-class="tap-hover"
              @tap="previewIcon(variant.ic)"
            >
              <view class="se-gallery__frame">
                <image
                  v-if="variant.ic && !brokenIcons[variant.ic]"
                  class="se-gallery__img"
                  :src="soulIcon(variant.ic)"
                  mode="aspectFit"
                  @error="markIconError(variant.ic)"
                />
                <view v-else class="se-gallery__glyph">{{ (item.name || '?').slice(0, 1) }}</view>
              </view>
              <text class="se-gallery__label">{{ variant.lb || '图标' }}</text>
            </view>
            <view v-if="!variants.length" class="se-gallery__item">
              <view class="se-gallery__frame">
                <image v-if="item.icon" class="se-gallery__img" :src="item.icon" mode="aspectFit" @error="brokenIcons.bwiki = true" />
                <view v-else class="se-gallery__glyph">{{ (item.name || '?').slice(0, 1) }}</view>
              </view>
            </view>
          </view>
          <view class="hero-se__meta">
            <view class="se-name">
              <text class="se-name__text">{{ item.name }}</text>
            </view>
            <view class="se-stars" :class="`se-stars--${stars || 3}`">
              <text v-for="n in stars || 0" :key="n" class="se-stars__star">★</text>
              <text v-if="stars" class="se-stars__text">{{ stars }}星</text>
              <text v-else class="se-stars__text">{{ item.rarity || '灵子' }}</text>
            </view>
            <view class="se-chips">
              <view v-if="prof" class="se-chip se-chip--strong">{{ prof }}</view>
              <view v-for="tag in item.tags || []" :key="tag" class="se-chip">{{ tag }}</view>
              <view v-if="soul && soul.obtain" class="se-chip">{{ soul.obtain }}</view>
            </view>
          </view>
        </view>
        <view v-if="desc" class="hero-se__desc">{{ desc }}</view>
        <!-- 收藏位（对齐奇波详情） -->
        <view class="head__fav" hover-class="tap-hover" @tap.stop="toggleFavState">
          {{ isFavNow ? '★ 已收藏' : '☆ 收藏' }}
        </view>
      </view>

      <!-- ============ 基础属性 ============ -->
      <view class="sec-head">
        <view class="sec-head__bar" />
        <text class="sec-head__cn">基础属性</text>
        <text class="sec-head__en">ATTRS</text>
      </view>

      <view class="panel card">
        <view class="attr-level">
          <text class="attr-level__label">等级</text>
          <view class="attr-level__chips">
            <view
              v-for="lv in LEVEL_STEPS"
              :key="lv"
              class="facet-chip attr-level__chip"
              :class="{ 'facet-chip--active': level === lv }"
              hover-class="facet-chip--hover" hover-stay-time="90"
              @tap="level = lv"
            >Lv.{{ lv }}</view>
          </view>
        </view>
        <view class="attr-grid">
          <view v-for="attr in attrRows" :key="attr.key" class="attr-tile">
            <view class="attr-tile__icon-chip" :style="{ '--chip-c': attr.c }">
              <image
                v-if="!brokenIcons[attr.ic]"
                class="attr-tile__icon"
                :src="attr.ic"
                mode="aspectFit"
                @error="markIconError(attr.ic)"
              />
              <text v-else class="attr-tile__glyph">{{ attr.label.slice(0, 1) }}</text>
            </view>
            <view class="attr-tile__body">
              <text class="attr-tile__label">{{ attr.label }}</text>
              <text class="attr-tile__val">{{ attr.value }}</text>
            </view>
          </view>
        </view>
        <view v-if="!attrRows.length" class="panel__desc">CBT3 属性数据整理中 · 公测后开放。</view>
        <view class="kv se-kv">
          <view v-if="soul && soul.tpl" class="kv__row">
            <text class="kv__key">属性模板</text>
            <text class="kv__value">{{ soul.tpl }}</text>
          </view>
          <view v-if="decomp" class="kv__row">
            <text class="kv__key">分解产出</text>
            <view class="se-mat">
              <image
                v-if="decomp.ic && !brokenIcons[decomp.ic]"
                class="se-mat__icon"
                :src="soulIcon(decomp.ic)"
                mode="aspectFit"
                @error="markIconError(decomp.ic)"
              />
              <text class="se-mat__name">{{ decomp.n }}</text>
              <text class="se-mat__count">{{ decomp.ct }}</text>
            </view>
          </view>
          <view v-for="field in item.fields" :key="field.label" class="kv__row">
            <text class="kv__key">{{ field.label }}</text>
            <text class="kv__value">{{ field.value }}</text>
          </view>
        </view>
      </view>

      <!-- ============ 灵子技能 ============ -->
      <view class="sec-head">
        <view class="sec-head__bar" />
        <text class="sec-head__cn">灵子技能</text>
        <text class="sec-head__en">SKILL</text>
      </view>

      <view v-if="skill" class="panel card">
        <view class="skill">
          <view class="skill__main">
            <view class="skill__avatar" :style="{ '--skill-c': rarityColor }">
              <image
                v-if="skill.ic && !brokenIcons[skill.ic]"
                class="skill__img"
                :src="soulIcon(skill.ic)"
                mode="aspectFit"
                @error="markIconError(skill.ic)"
              />
              <text v-else class="skill__glyph">{{ (skill.n || '?').slice(0, 1) }}</text>
            </view>
            <view class="skill__body">
              <view class="skill__head">
                <text class="skill__name">{{ skill.n }}</text>
                <text v-if="skill.ele" class="mini-tag">{{ skill.ele }}</text>
              </view>
              <view v-if="skillLevels.length > 1" class="skill__lv">
                <view
                  v-for="lvEntry in skillLevels"
                  :key="lvEntry.lv"
                  class="facet-chip skill__lv-chip"
                  :class="{ 'facet-chip--active': skillLv === lvEntry.lv }"
                  hover-class="facet-chip--hover" hover-stay-time="90"
                  @tap="skillLv = lvEntry.lv"
                >Lv.{{ lvEntry.lv }}</view>
              </view>
              <view class="skill__desc">{{ skillDescNow }}</view>
            </view>
          </view>
        </view>
        <view class="skill__note">三测数值 · 公测以官方为准</view>
      </view>
      <view v-else class="panel card">
        <view class="panel__desc">技能数据整理中 · 公测后开放。</view>
      </view>

      <!-- BWIKI 特性文本兜底 -->
      <view v-for="sec in item.sections || []" :key="sec.title" class="panel card">
        <view class="panel__title">{{ sec.title }}</view>
        <view class="panel__desc">{{ sec.text }}</view>
      </view>

      <!-- ============ 升级经验 ============ -->
      <view v-if="expRows.length" class="sec-head">
        <view class="sec-head__bar" />
        <text class="sec-head__cn">升级经验</text>
        <text class="sec-head__en">EXP</text>
      </view>
      <view v-if="expRows.length" class="panel card">
        <view class="exp-table">
          <view class="exp-table__head">
            <text class="exp-table__col exp-table__col--lv">Lv</text>
            <text class="exp-table__col">升下级</text>
            <text class="exp-table__col">累计</text>
          </view>
          <view v-for="row in expView" :key="row[0]" class="exp-table__row">
            <text class="exp-table__col exp-table__col--lv">{{ row[0] }}</text>
            <text class="exp-table__col">{{ row[1] }}</text>
            <text class="exp-table__col">{{ row[2] }}</text>
          </view>
        </view>
        <view class="fold" hover-class="tap-hover" @tap="expAll = !expAll">
          <text class="fold__label">{{ expAll ? '折叠到关键节点' : '展开全等级（100 级）' }}</text>
          <text class="fold__arrow">{{ expAll ? '▴' : '▾' }}</text>
        </view>
      </view>

      <!-- 同职业推荐 -->
      <view v-if="related.length" class="panel card">
        <view class="panel__title">
          <text>同职业灵子</text>
          <text class="related-count">{{ related.length }} 个</text>
        </view>
        <scroll-view scroll-x enable-flex class="related-row">
          <view
            v-for="rel in related"
            :key="rel.id"
            class="related-card"
            hover-class="related-card--hover"
            hover-stay-time="90"
            @tap="goRelated(rel.id)"
          >
            <image v-if="relIcon(rel)" class="related-card__img" :src="relIcon(rel)" mode="aspectFit" lazy-load />
            <view v-else class="related-card__glyph">{{ rel.name.slice(0, 1) }}</view>
            <text class="related-card__name">{{ rel.name }}</text>
          </view>
        </scroll-view>
      </view>

      <view class="footnote">{{ sourceNote }}</view>
    </template>
    <view class="cx-empty"><view class="cx-empty__icon">💠</view><view class="cx-empty__text">未找到该灵子</view></view>
  </view>
</template>

<script setup>
import { useTheme } from '@/utils/theme.js';
import { pushRecent } from '@/utils/recent.js';
import { isFav, toggleFav } from '@/utils/favorites.js';

const { isDark } = useTheme();
import { computed, ref, watch } from 'vue';
import { onLoad, onUnload, onShareAppMessage } from '@dcloudio/uni-app';
import { getCatalog, onCatalogUpdate } from '@/services/content.js';
import { soulOf, soulIcon, expForStars, expandSoulLevels, statAt } from '@/data/soul-essence.js';

const id = ref('');
const catalog = ref({ items: [] });

const item = computed(() => ((catalog.value.items || []).filter((entry) => entry.id === id.value)[0]) || null);
const soul = computed(() => (item.value ? soulOf(item.value.name) : null));

// ---- 头部字段 ----
const stars = computed(() => (soul.value && soul.value.stars) || 0);
const prof = computed(() => (soul.value && soul.value.prof) || (item.value && item.value.category) || '');
const desc = computed(() => (soul.value && soul.value.desc) || (item.value && item.value.desc) || '');
const variants = computed(() => (soul.value && soul.value.vars) || []);
// 稀有度主色：3星蓝 / 4星紫 / 5星金
const RARITY_COLORS = { 3: '#4a8df0', 4: '#9b6cff', 5: '#f2b50c' };
const rarityColor = computed(() => RARITY_COLORS[stars.value] || '#7f5bff');

// ---- 基础属性：Lv 里程碑切换，四维随等级变化 ----
const LEVEL_STEPS = [1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const level = ref(100);
const ATTR_META = [
  { key: 'hp', label: '生命', ic: soulIcon('icons/soulessence/tex_icon_status_hp.png'), c: '#3fbf6b' },
  { key: 'atk', label: '攻击', ic: soulIcon('icons/soulessence/tex_icon_status_atk.png'), c: '#ff7043' },
  { key: 'def', label: '防御', ic: soulIcon('icons/soulessence/tex_icon_status_def.png'), c: '#4a8df0' },
  { key: 'brk', label: '破韧值', ic: soulIcon('icons/pet/tex_petupgrade_icon_brk.png'), c: '#9b6cff' }
];
const attrRows = computed(() => {
  const stats = soul.value && soul.value.stats;
  if (!stats) return [];
  return ATTR_META.map((meta) => ({
    ...meta,
    value: statAt(stats, meta.key, level.value) != null ? statAt(stats, meta.key, level.value).toLocaleString('en-US') : '—'
  }));
});
const decomp = computed(() => (soul.value && soul.value.decomp) || null);

// ---- 技能 ----
const skill = computed(() => (soul.value && soul.value.skill) || null);
const skillLevels = computed(() => expandSoulLevels(skill.value));
const skillLv = ref(5);
const skillDescNow = computed(() => {
  if (!skill.value) return '';
  if (skillLevels.value.length) {
    const hit = skillLevels.value.find((entry) => entry.lv === skillLv.value) || skillLevels.value[skillLevels.value.length - 1];
    return hit.desc;
  }
  return skill.value.d || '';
});

// ---- 升级经验（按星级分档） ----
const expRows = computed(() => expForStars(stars.value || 4));
const EXP_MILESTONES = new Set(['1', '10', '20', '30', '40', '50', '60', '70', '80', '90', '100']);
const expAll = ref(false);
const expView = computed(() => (expAll.value ? expRows.value : expRows.value.filter((row) => EXP_MILESTONES.has(String(row[0])))));

// ---- 图标失败降级 ----
const brokenIcons = ref({});
function markIconError(path) {
  if (!path) return;
  brokenIcons.value = { ...brokenIcons.value, [path]: true };
}
function previewIcon(path) {
  const url = soulIcon(path);
  if (url) uni.previewImage({ urls: [url] });
}

// ---- 收藏 ----
const isFavNow = ref(false);
watch(item, (it) => {
  isFavNow.value = it ? isFav('spirit', it.id) : false;
}, { immediate: true });
function toggleFavState() {
  const it = item.value || {};
  const on = toggleFav({ type: 'spirit', id: it.id, name: it.name || '', icon: (variants.value[0] && soulIcon(variants.value[0].ic)) || it.icon || '' });
  isFavNow.value = on;
  uni.showToast({ title: on ? '已收藏' : '已取消收藏', icon: 'none' });
}

// ---- 同职业推荐 ----
const related = computed(() => {
  const it = item.value;
  if (!it || !prof.value) return [];
  return (catalog.value.items || [])
    .filter((entry) => entry.id !== it.id && entry.category === prof.value)
    .slice(0, 8);
});
function relIcon(entry) {
  const soulEntry = soulOf(entry.name);
  return soulEntry && soulEntry.icon ? soulIcon(soulEntry.icon) : entry.icon || '';
}
function goRelated(rid) {
  uni.redirectTo({ url: '/pages/spirit/detail?id=' + rid });
}

const sourceNote = '资料来自 BWIKI 收录与公开 CBT3 数据 · 收录不等于官方核实 · 公测后以官方为准';

function reload() {
  catalog.value = getCatalog('spirit').data || { items: [] };
  const it = (catalog.value.items || []).filter((entry) => entry.id === id.value)[0];
  if (it) pushRecent({ type: 'spirit', id: it.id, name: it.name, icon: it.icon || '' });
}

let unsubscribe = null;
onLoad((options) => {
  id.value = (options && options.id) || '';
  reload();
  if (!item.value) uni.setNavigationBarTitle({ title: '灵子不存在' });
});
unsubscribe = onCatalogUpdate(reload);
onUnload(() => unsubscribe && unsubscribe());
onShareAppMessage(() => ({
  title: item.value ? `${item.value.name} · 灵子图鉴` : '灵子图鉴',
  path: '/pages/spirit/detail?id=' + id.value
}));
</script>

<style>
/* ===== 稀有度实底 hero（同奇波详情视觉语言） ===== */
.hero-se {
  position: relative;
  padding: 24rpx;
  border-radius: var(--radius-lg);
  overflow: hidden;
  color: #fff;
  background-color: var(--rarity-color, #7f5bff);
  background-image:
    radial-gradient(120% 90% at 16% 6%, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0) 48%),
    linear-gradient(150deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0) 40%, rgba(0, 0, 0, 0.26) 100%);
}
.theme-dark .hero-se {
  background-image:
    radial-gradient(120% 90% at 16% 6%, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0) 46%),
    linear-gradient(150deg, rgba(0, 0, 0, 0.06) 0%, rgba(0, 0, 0, 0.14) 42%, rgba(0, 0, 0, 0.5) 100%);
}
.hero-se__inner {
  display: flex;
  gap: 24rpx;
  align-items: flex-start;
}
.se-gallery {
  display: flex;
  gap: 16rpx;
  flex: none;
}
.se-gallery__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}
.se-gallery__frame {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 148rpx;
  height: 148rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.4);
  border-radius: 24rpx;
  background: radial-gradient(closest-side, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0.06) 60%, rgba(255, 255, 255, 0) 78%);
}
.se-gallery__img {
  width: 120rpx;
  height: 120rpx;
}
.se-gallery__glyph {
  color: #fff;
  font-size: 44rpx;
  font-weight: 800;
}
.se-gallery__label {
  padding: 0 14rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.22);
  font-size: 18rpx;
  white-space: nowrap;
}
.hero-se__meta {
  flex: 1;
  min-width: 0;
}
.se-name__text {
  font-size: 34rpx;
  font-weight: 800;
  overflow-wrap: anywhere;
}
.se-stars {
  display: flex;
  align-items: center;
  gap: 4rpx;
  margin-top: 8rpx;
}
.se-stars__star {
  font-size: 26rpx;
}
.se-stars--4 .se-stars__star, .se-stars--5 .se-stars__star {
  text-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.3);
}
.se-stars__text {
  margin-left: 6rpx;
  font-size: 22rpx;
  font-weight: 700;
}
.se-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-top: 12rpx;
}
.se-chip {
  max-width: 100%;
  padding: 2rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.18);
  font-size: 20rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.se-chip--strong {
  background: rgba(255, 255, 255, 0.3);
  font-weight: 700;
}
.hero-se__desc {
  margin-top: 16rpx;
  padding-top: 14rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.22);
  font-size: 22rpx;
  line-height: 1.6;
  opacity: 0.94;
}
.head__fav {
  position: absolute;
  top: 20rpx;
  right: 20rpx;
  padding: 6rpx 18rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.5);
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  font-size: 22rpx;
}

/* ===== 大板块标题（同奇波） ===== */
.sec-head {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  margin: 28rpx 4rpx 14rpx;
}
.sec-head__bar {
  align-self: center;
  width: 8rpx;
  height: 30rpx;
  border-radius: 4rpx;
  background: var(--brand);
}
.sec-head__cn {
  color: var(--ink);
  font-size: 30rpx;
  font-weight: 700;
}
.sec-head__en {
  padding: 2rpx 14rpx;
  border-radius: 999rpx;
  background: var(--brand-soft);
  color: var(--brand-deep);
  font-size: 18rpx;
  font-weight: 600;
  letter-spacing: 2rpx;
}

/* ===== 等级切换 + 四维属性 tile ===== */
.attr-level {
  display: flex;
  align-items: center;
  gap: 14rpx;
  margin-bottom: 14rpx;
}
.attr-level__label {
  flex: none;
  color: var(--ink-3);
  font-size: 22rpx;
}
.attr-level__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}
.attr-level__chip {
  min-height: 48rpx;
  padding: 0 16rpx;
  font-size: 22rpx;
}
.attr-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12rpx;
}
.attr-tile {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 14rpx;
  border: 1rpx solid var(--line);
  border-radius: 16rpx;
  background: var(--soft);
}
.attr-tile__icon-chip {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  flex: none;
  background-color: var(--chip-c, #5a6480);
  background-image: linear-gradient(160deg, rgba(255, 255, 255, 0.22) 0%, rgba(0, 0, 0, 0.26) 100%);
  box-shadow: 0 4rpx 10rpx rgba(31, 42, 68, 0.18);
}
.attr-tile__icon {
  width: 44rpx;
  height: 44rpx;
}
.attr-tile__glyph {
  color: #fff;
  font-size: 24rpx;
  font-weight: 800;
}
.attr-tile__body {
  display: flex;
  flex-direction: column;
  gap: 2rpx;
  min-width: 0;
}
.attr-tile__label {
  color: var(--ink-2);
  font-size: 22rpx;
}
.attr-tile__val {
  color: var(--ink);
  font-size: 30rpx;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.se-mat {
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.se-mat__icon {
  width: 40rpx;
  height: 40rpx;
  border-radius: 8rpx;
  background: var(--soft);
}
.se-mat__name {
  color: var(--ink);
  font-size: 24rpx;
}
.se-mat__count {
  color: var(--brand-deep);
  font-size: 22rpx;
  font-variant-numeric: tabular-nums;
}

/* ===== 技能卡（同奇波：实底头像座 + Lv chips） ===== */
.skill {
  padding: 0;
}
.skill__main {
  display: flex;
  gap: 16rpx;
}
.skill__avatar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 96rpx;
  height: 96rpx;
  border-radius: 20rpx;
  flex: none;
  background-color: var(--skill-c, #7f5bff);
  background-image: linear-gradient(160deg, rgba(255, 255, 255, 0.2) 0%, rgba(0, 0, 0, 0.24) 100%);
  box-shadow: 0 4rpx 12rpx rgba(31, 42, 68, 0.16);
}
.skill__img {
  width: 84rpx;
  height: 84rpx;
}
.skill__glyph {
  color: #fff;
  font-size: 34rpx;
  font-weight: 700;
}
.skill__body {
  flex: 1;
  min-width: 0;
}
.skill__head {
  display: flex;
  align-items: center;
  gap: 10rpx;
  flex-wrap: wrap;
}
.skill__name {
  color: var(--ink);
  font-size: 28rpx;
  font-weight: 700;
}
.mini-tag {
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  background: var(--brand-soft);
  color: var(--brand);
  font-size: 20rpx;
}
.skill__lv {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin: 10rpx 0 0;
}
.skill__lv-chip {
  min-height: 48rpx;
  padding: 0 18rpx;
  font-size: 22rpx;
}
.skill__desc {
  margin-top: 8rpx;
  color: var(--ink-2);
  font-size: 23rpx;
  line-height: 1.6;
}
.skill__note {
  margin-top: 10rpx;
  color: var(--ink-3);
  font-size: 20rpx;
  text-align: right;
}

/* ===== 折叠 / 经验表（同奇波） ===== */
.fold {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  min-height: 56rpx;
  margin-top: 10rpx;
  padding: 0 4rpx;
  color: var(--brand-deep);
  font-size: 22rpx;
}
.fold__arrow {
  color: var(--ink-3);
  font-size: 20rpx;
}
.exp-table__head, .exp-table__row {
  display: flex;
  align-items: center;
  padding: 8rpx 4rpx;
}
.exp-table__head {
  border-bottom: 1rpx solid var(--line);
  color: var(--ink-3);
  font-size: 20rpx;
}
.exp-table__row {
  border-bottom: 1rpx dashed var(--line);
  color: var(--ink-2);
  font-size: 22rpx;
  font-variant-numeric: tabular-nums;
}
.exp-table__col {
  flex: 1;
  text-align: right;
}
.exp-table__col--lv {
  flex: 0 0 30%;
  text-align: left;
  color: var(--ink);
  font-weight: 600;
}

/* ===== 同职业推荐（同奇波 related） ===== */
.related-count {
  padding: 2rpx 14rpx;
  border-radius: 999rpx;
  background: var(--soft);
  font-size: 20rpx;
  font-weight: 400;
  color: var(--ink-2);
}
.related-row {
  white-space: nowrap;
}
.related-card {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  width: 120rpx;
  margin-right: 18rpx;
  transition: transform 0.16s ease;
}
.related-card--hover {
  transform: scale(0.95);
}
.related-card__img {
  width: 96rpx;
  height: 96rpx;
  border-radius: 24rpx;
  background: var(--soft);
}
.related-card__glyph {
  width: 96rpx;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 24rpx;
  background: var(--brand-soft);
  color: var(--brand);
  font-size: 34rpx;
  font-weight: 700;
}
.related-card__name {
  max-width: 116rpx;
  color: var(--ink);
  font-size: 22rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.se-kv {
  margin-top: 14rpx;
}
</style>
