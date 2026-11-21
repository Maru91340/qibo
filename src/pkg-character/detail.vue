<template>
  <view class="page character-detail" :class="{ 'theme-dark': isDark }">
    <template v-if="item">
      <view class="head hero hero--element" :style="{ '--ele-color': item.elementColor }">
        <view class="hero__inner">
          <view class="banner" hover-class="tap-hover" @tap="previewHero">
            <image v-if="heroImage" class="banner__img" :src="heroImage" mode="aspectFit" @error="onHeroError" />
            <view v-else class="banner__glyph">{{ item.name.slice(0, 1) }}</view>
            <view v-if="heroImage" class="banner__zoom">🔍 查看大图</view>
          </view>
          <view class="banner__meta">
            <view class="head__name"><text>{{ item.name }}</text></view>
            <view class="head__sub">{{ item.title }} · {{ item.role }} · {{ item.rarity }}</view>
            <view class="head__chips">
              <text class="head__chip head__chip--strong">{{ item.elementLabel }}</text>
              <text v-if="item.weapon" class="head__chip">{{ item.weapon }}</text>
              <text v-if="item.camp" class="head__chip">{{ item.camp }}</text>
              <text v-if="item.race" class="head__chip">{{ item.race }}</text>
              <text v-if="birthday" class="head__chip">生日 {{ birthday }}</text>
            </view>
          </view>
          <view class="head__fav" :class="{ 'head__fav--on': isFavNow }" @tap.stop="toggleFavState">{{ isFavNow ? '★ 已收藏' : '☆ 收藏' }}</view>
        </view>
      </view>

      <!-- 阶段5：吸顶导航（规范 03：点击定位优先；滚动时同步高亮，漂移时以点击定位为准） -->
      <view id="cd-nav" class="cd-nav">
        <view
          v-for="sec in navSections"
          :key="sec.key"
          class="cd-nav__item"
          :class="{ 'cd-nav__item--on': activeSec === sec.key }"
          hover-class="tap-hover"
          @tap="onNavTap(sec)"
        >{{ sec.label }}</view>
      </view>

      <view class="panel card cd-sec-overview">
        <view class="panel__title">角色简介</view>
        <view class="panel__desc panel__desc--first">{{ item.desc }}</view>
      </view>

      <view v-if="battle.attributeGroups.length" class="panel card cd-sec-stats">
        <view class="panel__title"><text>基础属性</text><text class="related-count">Lv.1 → 100级满级（满阶）</text></view>
        <view v-for="group in battle.attributeGroups" :key="group.title" class="attr-group">
          <view class="attr-group__title">{{ group.title }}</view>
          <view class="attribute-grid">
            <view v-for="row in group.rows" :key="group.title + row.label" class="attribute-card">
              <image v-if="row.icon" class="attribute-card__icon" :src="row.icon" mode="aspectFit" />
              <view class="attribute-card__body">
                <text class="attribute-card__label">{{ row.label }}</text>
                <text class="attribute-card__value">{{ row.display }}</text>
              </view>
            </view>
          </view>
        </view>
        <view class="attr-note">前后两个值分别为 Lv.1 基准与 100级满级（满阶）；两项相同的恒定属性仅展示单值。</view>
      </view>

      <view v-if="battle.skills.length" class="panel card cd-sec-skills">
        <view class="panel__title">技能</view>
        <scroll-view v-if="skillLvSteps.length" scroll-x enable-flex class="skill-lv-row">
          <view
            v-for="lv in skillLvSteps"
            :key="lv"
            class="lv-chip"
            :class="{ 'lv-chip--on': skillLv === lv || (!skillLv && lv === skillLvSteps[skillLvSteps.length - 1]) }"
            hover-class="lv-chip--hover" hover-stay-time="90"
            @tap="skillLv = lv"
          >Lv.{{ lv }}</view>
        </scroll-view>
        <view v-for="skill in battle.skills" :key="skill.name + skill.index" class="skill-card">
          <view class="skill-card__head"><text class="skill-card__name">{{ skill.name }}</text><text v-if="skill.type" class="mini-tag">{{ skill.type }}</text></view>
          <view class="skill-card__main">
            <image v-if="skill.image" class="skill-card__image" :src="skill.image" mode="aspectFit" />
            <view class="skill-card__desc">{{ skillDescOf(skill) }}</view>
          </view>
        </view>
      </view>

      <view v-if="starGift.stages.length" class="panel card cd-sec-grow">
        <view class="panel__title">临阶 · 星赐<text class="related-count">{{ starGift.stages.length }} 阶</text></view>
        <view v-if="starGift.intro" class="panel__desc">{{ starGift.intro }}</view>
        <scroll-view scroll-x enable-flex class="stage-row">
          <view
            v-for="stage in starGift.stages"
            :key="stage.no"
            class="stage-chip"
            :class="{ 'stage-chip--on': activeStage && stage.no === activeStage.no }"
            hover-class="stage-chip--hover" hover-stay-time="90"
            @tap="stageNo = stage.no"
          >临阶 {{ stage.roman }}</view>
        </scroll-view>
        <view v-for="gift in activeStage.gifts" :key="gift.name" class="gift-card">
          <view class="gift-card__head">
            <image v-if="gift.icon" class="gift-card__img" :src="gift.icon" mode="aspectFit" />
            <view class="gift-card__meta">
              <view class="gift-card__name">{{ gift.name }}</view>
              <view class="gift-card__tags">
                <text v-if="gift.type" class="mini-tag">{{ gift.type }}</text>
                <text v-if="gift.skill" class="mini-tag mini-tag--skill">{{ gift.skill }}</text>
              </view>
            </view>
            <view class="gift-card__buffs">
              <view v-for="buff in gift.buffs" :key="buff.label" class="gift-buff">
                <image v-if="buff.icon" class="gift-buff__icon" :src="buff.icon" mode="aspectFit" />
                <text class="gift-buff__label">{{ buff.label }}</text>
              </view>
            </view>
          </view>
          <view v-if="gift.materials.length" class="gift-costs">
            <view v-for="mat in gift.materials" :key="mat.name" class="gift-cost">
              <image v-if="mat.icon" class="gift-cost__icon" :src="mat.icon" mode="aspectFit" />
              <text class="gift-cost__name">{{ mat.name }}</text>
              <text class="gift-cost__count">{{ mat.count }}</text>
            </view>
          </view>
        </view>
        <view v-if="activeStage && activeStage.ascend" class="ascend-block">
          <view class="ascend-block__head">
            <text class="ascend-block__title">升阶加成</text>
            <text v-if="activeStage.ascend.limit" class="ascend-block__limit">{{ activeStage.ascend.limit }}</text>
          </view>
          <view v-if="activeStage.ascend.buffs.length" class="ascend-block__buffs">
            <view v-for="buff in activeStage.ascend.buffs" :key="buff.label" class="gift-buff">
              <image v-if="buff.icon" class="gift-buff__icon" :src="buff.icon" mode="aspectFit" />
              <text class="gift-buff__label">{{ buff.label }}</text>
            </view>
          </view>
          <view v-if="activeStage.ascend.costs.length" class="gift-costs">
            <view v-for="mat in activeStage.ascend.costs" :key="mat.name" class="gift-cost">
              <image v-if="mat.icon" class="gift-cost__icon" :src="mat.icon" mode="aspectFit" />
              <text class="gift-cost__name">{{ mat.name }}</text>
              <text class="gift-cost__count">{{ mat.count }}</text>
            </view>
          </view>
          <view class="ascend-block__note">当阶加成在晋升至下一阶后生效</view>
        </view>
      </view>

      <view v-if="battle.constellation.length" class="panel card cd-sec-grow">
        <view class="panel__title">定弦</view>
        <view v-for="(entry, index) in battle.constellation" :key="index" class="detail-block">
          <text class="detail-block__title">{{ entry.title }}</text><text class="detail-block__text">{{ entry.text }}</text>
        </view>
      </view>

      <view v-if="recommend.length" class="panel card cd-sec-config">
        <view class="panel__title">推荐配置<text class="related-count">官方推荐</text></view>
        <view v-for="group in recommend" :key="group.title" class="rec-group">
          <view class="rec-group__title">{{ group.title }}</view>
          <view v-if="group.intro" class="rec-group__intro">{{ group.intro }}</view>
          <view v-for="(line, i) in group.lines" :key="i" class="rec-line">{{ line }}</view>
          <view v-if="group.pets.length" class="rec-cards">
            <view v-for="pet in group.pets" :key="pet.tag + pet.name" class="rec-card" hover-class="rec-card--hover" @tap="goQibo(pet.name)">
              <image v-if="pet.icon" class="rec-card__img" :src="pet.icon" mode="aspectFit" />
              <view class="rec-card__body">
                <view class="rec-card__name">{{ pet.name }}</view>
                <view class="rec-card__meta">{{ pet.subtitle }}<template v-if="pet.meta.length"> · {{ pet.meta.join(' / ') }}</template></view>
              </view>
              <text v-if="pet.tag" class="rec-card__tag">{{ pet.tag }}</text>
            </view>
          </view>
          <view v-if="group.spirits.length" class="rec-spirits">
            <view v-for="sp in group.spirits" :key="sp.name + sp.rarity" class="rec-spirit">
              <view class="rec-spirit__head">
                <image v-if="sp.icon" class="rec-spirit__img" :src="sp.icon" mode="aspectFit" />
                <view class="rec-spirit__meta">
                  <view class="rec-spirit__name">{{ sp.name }}<text class="rec-spirit__rarity">{{ sp.rarity }}</text></view>
                  <text v-if="sp.main" class="rec-spirit__main">{{ sp.main }}</text>
                </view>
              </view>
              <view v-if="sp.skill" class="rec-spirit__skill">{{ sp.skill }}</view>
              <view v-if="sp.desc" class="rec-spirit__desc">{{ sp.desc }}</view>
              <view v-for="(note, i) in sp.notes" :key="i" class="rec-spirit__note">{{ note }}</view>
            </view>
          </view>
          <view v-if="group.gears.length" class="rec-gears">
            <view v-for="gear in group.gears" :key="gear.slot + gear.name" class="rec-gear">
              <text class="rec-gear__slot">{{ gear.slot }}</text>
              <image v-if="gear.icon" class="rec-gear__img" :src="gear.icon" mode="aspectFit" />
              <view class="rec-gear__body">
                <view class="rec-gear__name">{{ gear.name }}<text v-if="gear.sub" class="rec-gear__sub">{{ gear.sub }}</text></view>
                <view class="rec-gear__stats">{{ gear.stat }}</view>
                <view v-if="gear.effect" class="rec-gear__effect">{{ gear.effect }}</view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view v-if="profileData.info.length || profileData.intro" class="panel card cd-sec-files">
        <view class="panel__title">角色资料</view>
        <view v-if="profileData.intro" class="panel__desc panel__desc--first">{{ profileData.intro }}</view>
        <view v-if="profileInfoRows.length" class="kv profile-kv">
          <view v-for="row in profileInfoRows" :key="row.label" class="kv__row">
            <text class="kv__key">{{ row.label }}</text>
            <text class="kv__value">{{ row.value }}</text>
          </view>
        </view>
      </view>

      <view v-if="profileData.affinity.length" class="panel card cd-sec-files">
        <view class="panel__title">好感度<text class="related-count">{{ profileData.affinity.length }} 级</text></view>
        <view class="affinity-head">
          <text class="affinity-head__col affinity-head__col--lv">Lv</text>
          <text class="affinity-head__col">所需经验</text>
          <text class="affinity-head__col">属性加成</text>
          <text class="affinity-head__col">好感奖励</text>
        </view>
        <view v-for="row in profileData.affinity" :key="row.lv" class="affinity-row">
          <text class="affinity-row__lv">Lv{{ row.lv }}</text>
          <text class="affinity-row__exp">{{ row.exp }}</text>
          <view class="affinity-row__cell">
            <view v-if="row.buff" class="gift-buff">
              <image v-if="row.buff.icon" class="gift-buff__icon" :src="row.buff.icon" mode="aspectFit" />
              <text class="gift-buff__label">{{ row.buff.label }}</text>
            </view>
            <text v-else class="affinity-row__none">—</text>
          </view>
          <view class="affinity-row__cell">
            <view v-if="row.reward" class="gift-cost">
              <image v-if="row.reward.icon" class="gift-cost__icon" :src="row.reward.icon" mode="aspectFit" />
              <text class="gift-cost__name">{{ row.reward.name }}</text>
              <text class="gift-cost__count">{{ row.reward.count }}</text>
            </view>
            <text v-else class="affinity-row__none">—</text>
          </view>
        </view>
      </view>

      <view v-if="profileData.stories.length" class="panel card cd-sec-files">
        <view class="panel__title">角色故事<text class="related-count">{{ profileData.stories.length }} 篇</text></view>
        <!-- 阶段5：故事按篇章折叠（规范 02），正文不删减 -->
        <view v-for="story in profileData.stories" :key="story.num" class="story-block">
          <view class="story-block__head" hover-class="tap-hover" @tap="toggleSec('story:' + story.num)">
            <text class="story-block__title">{{ story.num }} · {{ story.title }}</text>
            <text class="story-block__arrow">{{ expanded['story:' + story.num] ? '▴' : '▾' }}</text>
          </view>
          <view v-show="expanded['story:' + story.num]" class="story-block__text">{{ story.text }}</view>
        </view>
      </view>

      <view v-if="voiceTotal" class="panel card cd-sec-files">
        <view class="panel__title">角色语音<text class="related-count">{{ profileData.voices.length }} 组 · {{ voiceTotal }} 条</text></view>
        <!-- 阶段5：语音约占页面高度 44%，默认折叠（规范 02），展开后按既有 4 组呈现 -->
        <view class="fold" hover-class="tap-hover" @tap="toggleVoice">
          <text class="fold__label">{{ voiceOpen ? '收起全部语音' : '展开全部语音' }}</text>
          <text class="fold__arrow">{{ voiceOpen ? '▴' : '▾' }}</text>
        </view>
        <view v-show="voiceOpen">
          <view v-for="group in profileData.voices" :key="group.name" class="voice-group">
            <view class="voice-group__name">{{ group.name }}</view>
            <view v-for="entry in group.entries" :key="entry.name + entry.key" class="voice-entry">
              <text class="voice-entry__name">{{ entry.name }}</text>
              <text class="voice-entry__text">{{ entry.text }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="detail__foot"><view class="cx-btn" :class="inTeam ? 'cx-btn--outline' : 'cx-btn--primary'" @tap="toggleTeam">{{ inTeam ? '移出队伍' : '编入队伍' }}</view></view>
      <view class="footnote">资料来自 CBT3 Wiki 与 BWIKI；页面缺失内容暂留空。</view>
    </template>
    <view v-else class="cx-empty"><view class="cx-empty__icon">🐾</view><view class="cx-empty__text">未找到该角色</view></view>
  </view>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue';
import { onLoad, onPageScroll, onUnload, onShareAppMessage } from '@dcloudio/uni-app';
import { useTheme } from '@/utils/theme.js';
import { pushRecent } from '@/utils/recent.js';
import { getCatalog, onCatalogUpdate } from '@/services/content.js';
import { createElementToolkit } from '@/data/element.js';
import { findById, decorateWithElement } from '@/utils/query.js';
import { isFav, toggleFav } from '@/utils/favorites.js';
import { load, toggleMember } from '@/utils/team.js';
import cbt3Details from '../data/generated/character-detail-cbt3.json';
import bwikiDetails from '../data/generated/character-detail-bwiki.json';
import bwikiInfoData from '../data/generated/character-bwiki-info.json';
import { wikiSlotImage, cloudDetailAsset } from '../data/site-images.js';

const { isDark } = useTheme();
const id = ref('');
const catalog = ref({ items: [] });
const toolkit = ref(createElementToolkit(getCatalog('element').data));
const inTeam = ref(false);
const isFavNow = ref(false);

// 读取当前角色条目并补上元素显示字段。
const item = computed(() => decorateWithElement(findById(catalog.value.items, id.value), toolkit.value.elementMap));
// 合并 CBT3 与 BWIKI 的同名详情，保留多个来源形态。
const detailEntries = computed(() => [...(cbt3Details.characters || []), ...(bwikiDetails.characters || [])].filter((entry) => entry.name.replace(/\s/g, '') === String(item.value?.name || '').replace(/\s/g, '')));
// 将来源记录转换为页面可读的章节文本。
function pageRecords(page) { return detailEntries.value.flatMap((entry) => entry.pages?.[page]?.records || []); }
// 从来源记录中提取标题后的正文，避免把导航和重复目录写入页面。
function sectionText(records, starts, ends = []) {
  const out = []; let active = false; let title = '';
  records.forEach((record) => {
    const value = record.value || '';
    if (record.type === 'heading' && starts.includes(value)) { active = true; title = value; return; }
    if (active && record.type === 'heading' && ends.includes(value)) { active = false; return; }
    if (active && record.type === 'text' && value.length > 1) out.push({ title, text: value });
  });
  return out;
}
// 清理技能富文本：换行保留、标签剥离
function cleanSkillText(text) {
  return String(text || '').replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]+>/g, '').trim();
}
// 解析角色战斗页中的技能标题、图片、Lv.1-12 分级描述。
function parseSkills(records) {
  const skills = [];
  records.forEach((record, index) => {
    if (record.type !== 'data-levels' || !Array.isArray(record.value) || !record.value.length) return;
    const next = records.slice(index + 1, index + 12);
    const image = next.find((entry) => entry.type === 'image' && /skill/i.test(entry.url));
    const heading = next.find((entry) => entry.type === 'heading');
    if (!heading) return;
    const type = next.find((entry) => entry.type === 'text');
    const levels = record.value
      .map((entry) => ({ lv: Number(entry.level) || 0, desc: cleanSkillText(entry.describe) }))
      .filter((entry) => entry.desc);
    skills.push({
      name: heading.value,
      type: type?.value || '',
      image: cloudDetailAsset(image?.url || ''),
      levels,
      // 默认展示满级描述（单级技能即唯一描述）
      desc: (levels[levels.length - 1] || {}).desc || '',
      index
    });
  });
  if (skills.length) return skills;
  const images = records.filter((record) => record.type === 'image' && /icon.skill/i.test(record.alt || ''));
  return (item.value?.skills || []).map((skill, index) => ({ ...skill, image: cloudDetailAsset(images[index]?.url || ''), index }));
}
// —— P1：基础/进阶/元素加成 三段属性解析，带图标与双等级值 ——
// 基础/进阶 = 图标+名称+Lv1+满级 四元组；元素加成 = 图标+名称+单值 三元组（无表头）
function parseAttributeGroups(records) {
  const SHORT = { 基础战斗属性: '基础战斗', 进阶战斗属性: '进阶战斗', 元素属性加成: '元素加成' };
  const groups = [];
  records.forEach((record, index) => {
    if (record.type !== 'heading') return;
    // 标题带条数上限（如「元素属性加成 (10 项)」），防止吸收段后附带的摘要卡
    const hit = (String(record.value || '').match(/^(基础战斗属性|进阶战斗属性|元素属性加成)/) || [])[1];
    if (!hit) return;
    const limit = Number((String(record.value || '').match(/(\d+)\s*项/) || [])[1]) || 0;
    const rows = [];
    let i = index + 1;
    while (i < records.length && records[i].type !== 'heading' && (!limit || rows.length < limit)) {
      const row = records[i];
      if (row.type === 'image') {
        const icon = cloudDetailAsset(row.url);
        const next = records.slice(i + 1, i + 4);
        if (hit === '元素属性加成') {
          if (next.length >= 2 && next[0].type === 'text' && next[1].type === 'text') {
            rows.push({ icon, label: next[0].value, display: next[1].value });
            i += 3;
            continue;
          }
        } else if (next.length === 3 && next.every((entry) => entry.type === 'text')) {
          const v1 = next[1].value;
          const v2 = next[2].value;
          rows.push({ icon, label: next[0].value, display: v1 === v2 ? v1 : v1 + ' → ' + v2 });
          i += 4;
          continue;
        }
      }
      i += 1;
    }
    if (rows.length) groups.push({ title: SHORT[hit] || hit, rows });
  });
  return groups;
}
// 按定弦名称汇总对应效果，避免把不同条目拼在一起。
function parseConstellations(records) {
  const start = records.findIndex((record) => record.type === 'heading' && record.value === '定弦');
  if (start < 0) return [];
  const out = []; let current = null;
  for (const record of records.slice(start + 1)) {
    if (record.type === 'heading' && record.value === '升级经验') break;
    if (record.type === 'heading') { current = { title: record.value, text: '' }; out.push(current); }
    else if (current && record.type === 'text' && record.value.length > 12) current.text += (current.text ? ' ' : '') + record.value;
  }
  return out.filter((entry) => entry.text);
}

// —— P0：临阶·星赐 12 阶结构化解析（数据源为 CBT3 摊平表格记录）——
// 记录形态：礼物 = [gift 图标(alt=名称) / 名称 / 加成对(icon+文本)×n / 类型 / 技能等级 / 材料三元组(icon+名+×n)]，
// 阶段 = [礼物×5 → 临阶·N 标记 → 升阶块(加成对 + 生效附注 + Lv 限制 + 世界难度 + 消耗三元组)]，共 12 阶。
const STAGE_ROMAN = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ', 'Ⅶ', 'Ⅷ', 'Ⅸ', 'Ⅹ', 'Ⅺ', 'Ⅻ'];
function parseStarGift(records) {
  const start = records.findIndex((record) => record.type === 'heading' && /星赐/.test(record.value));
  if (start < 0) return { intro: '', stages: [] };
  let end = records.length;
  for (let i = start + 1; i < records.length; i += 1) if (records[i].type === 'heading') { end = i; break; }
  const seg = records.slice(start + 1, end);
  const intro = (seg.find((row) => row.type === 'text' && /星赐与临阶/.test(row.value)) || {}).value || '';
  const isGift = (row) => row.type === 'image' && /tex_icon_item_gift/.test(row.url || '');
  const stageMark = (row) => (row.type === 'text' && /^临阶·[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫ]$/.test(row.value)) ? STAGE_ROMAN.indexOf(row.value.replace('临阶·', '')) + 1 : 0;
  const stages = []; let pending = []; let gift = null; let mat = null; let stage = null;
  let part = ''; let asc = null; let ascIcon = null; let ascMat = null;
  const flushGift = () => { if (gift && gift.name) pending.push(gift); gift = null; mat = null; };
  for (const row of seg) {
    if (isGift(row)) {
      flushGift();
      asc = null; ascIcon = null; ascMat = null;
      gift = { icon: cloudDetailAsset(row.url), name: row.alt || '', buffs: [], type: '', skill: '', materials: [] };
      part = 'buffs';
      continue;
    }
    const mark = stageMark(row);
    if (mark) {
      flushGift();
      stage = { no: mark, roman: STAGE_ROMAN[mark - 1], gifts: pending, ascend: null };
      pending = [];
      stages.push(stage);
      asc = { buffs: [], limit: '', costs: [] };
      stage.ascend = asc;
      continue;
    }
    if (row.type === 'image') {
      const icon = cloudDetailAsset(row.url);
      if (gift) {
        if (part === 'buffs') { ascIcon = null; mat = null; gift._icon = icon; }
        else { mat = { icon, name: row.alt || '', count: '', _named: false }; gift.materials.push(mat); }
      } else if (asc) {
        if (/status_/.test(row.url || '')) { ascIcon = icon; ascMat = null; }
        else if (/currency_|item_break|item_expitem|petupgrade|item_gift/.test(row.url || '')) { ascIcon = null; ascMat = { icon, name: row.alt || '', count: '', _named: false }; asc.costs.push(ascMat); }
      }
      continue;
    }
    // DATA（技能等级表）等记录意味着升阶块已结束、进入下一章节（如佩式拳掌技能），终止解析
    if (row.type !== 'text') { asc = null; ascIcon = null; ascMat = null; continue; }
    const value = String(row.value || '').trim();
    if (!value || /^临阶\s+Ⅻ?$/.test(value)) continue;
    if (gift) {
      if (part === 'buffs') {
        if (gift._icon) { gift.buffs.push({ icon: gift._icon, label: value }); gift._icon = ''; }
        else if (/^(属性·星赐|技能·星赐)$/.test(value)) { gift.type = value; part = 'skill'; }
        else if (!gift.name) gift.name = value;
      } else if (part === 'skill') { gift.skill = value === '—' ? '' : value; part = 'materials'; }
      else if (mat) {
        if (!mat._named) { mat.name = value; mat._named = true; }
        else { mat.count = value; mat = null; }
      }
      continue;
    }
    if (asc) {
      if (ascIcon) { asc.buffs.push({ icon: ascIcon, label: value }); ascIcon = null; continue; }
      if (/晋升至下一阶/.test(value)) continue;
      if (/^Lv\d+$/.test(value) || /^世界难度/.test(value)) { asc.limit = asc.limit ? asc.limit + ' · ' + value : value; continue; }
      if (ascMat) {
        if (!ascMat._named) { ascMat.name = value; ascMat._named = true; }
        else { ascMat.count = value; ascMat = null; }
      }
    }
  }
  return { intro, stages };
}

// —— P2：推荐配置分组卡片化（奇波搭配 / 灵子搭配 / 装备推荐 三组）——
const REC_TITLES = ['奇波搭配推荐', '灵子搭配推荐', '装备推荐'];
function parseRecommend(records) {
  const groups = [];
  let group = null; let mode = 'idle'; let field = null;
  let card = null; let mat = null; let recent = [];
  const close = () => { card = null; field = null; };
  for (const row of records) {
    if (row.type === 'heading') {
      if (REC_TITLES.includes(row.value)) {
        group = { title: row.value, intro: '', lines: [], pets: [], spirits: [], gears: [] };
        groups.push(group);
        mode = 'lines'; close(); recent = [];
      } else if (group) { mode = 'idle'; close(); }
      continue;
    }
    if (!group) continue;
    if (row.type === 'image') {
      const url = row.url || '';
      if (/status_star2|formationpetsell|soulessence_bg_|accessory_icon_bg/.test(url)) continue;
      const icon = cloudDetailAsset(url);
      if (mode === 'pets' && /tex_icon_pet_/.test(url)) {
        if (card && !card.icon) { card.icon = icon; card.name = row.alt || card.name; }
        else { card = { tag: card && card.tag ? card.tag : '', subtitle: '', icon, name: row.alt || '', meta: [] }; group.pets.push(card); field = 'pet'; }
        continue;
      }
      if (/tex_icon_soulessence[bs]_/.test(url)) {
        if (!row.alt) continue;
        card = { icon, name: row.alt, rarity: '', tag: '', main: '', skill: '', desc: '', notes: [] };
        group.spirits.push(card);
        mode = 'spirits'; field = 'name';
        continue;
      }
      if (/tex_icon_equipment_/.test(url) && group.title === '装备推荐') {
        card = { slot: recent[0] || '', sub: recent[1] || '', icon, name: row.alt || '', stat: '', effect: '' };
        group.gears.push(card);
        mode = 'gears'; field = 'gear'; recent = [];
        continue;
      }
      continue;
    }
    if (row.type !== 'text') continue;
    const value = String(row.value || '').replace(/\s+/g, ' ').trim();
    if (!value) continue;
    recent.push(value); if (recent.length > 2) recent.shift();
    if (/^查看(奇波|灵子详情|装备详情)/.test(value)) { close(); continue; }
    if (/^推荐\d+$/.test(value)) { card = { tag: value, subtitle: '', icon: '', name: '', meta: [] }; group.pets.push(card); mode = 'pets'; field = 'petSubtitle'; continue; }
    if (/^(核心首选推荐|可选适配灵子)$/.test(value)) { group.lines.push(value); continue; }
    if (card && field) {
      if (field === 'petSubtitle') { card.subtitle = value; field = 'pet'; continue; }
      if (field === 'pet') { card.meta.push(value); continue; }
      if (field === 'name') { field = /^\d+星$/.test(value) ? 'spirit' : 'rarity'; if (field === 'spirit') card.rarity = value; continue; }
      if (field === 'rarity') {
        if (/^\d+星$/.test(value)) { card.rarity = value; continue; }
        if (/专属技能/.test(value)) { card.tag = value; field = 'spirit'; continue; }
        field = 'spirit';
      }
      if (field === 'spirit') {
        if (/专属技能/.test(value)) card.tag = value;
        else if (/^【.+】$/.test(value)) { card.skill = value; field = 'skillDesc'; }
        else if (value === '◆' || /^满级核心主属性/.test(value) || value === '→' || value === card.name) continue;
        else if (/[\d.]+%|^\+\d/.test(value) || card.main) card.main = card.main ? card.main + ' ' + value : value;
        else card.main = value;
        continue;
      }
      if (field === 'skillDesc') { card.desc = value; field = 'spirit'; continue; }
      if (field === 'gear') {
        if (value === '词条') field = 'gearEffect';
        else card.stat = card.stat ? card.stat + ' ' + value : value;
        continue;
      }
      if (field === 'gearEffect') { card.effect = value; field = 'gear'; continue; }
      continue;
    }
    if (mode === 'lines') {
      if (!group.intro && value.length > 12) group.intro = value;
      else group.lines.push(value);
    }
  }
  return groups;
}
// —— P0：角色资料结构化解析（好感度表 / 故事章节 / 语音分类）——
const VOICE_CATS = ['资料档案', '日常养成', '地图探索', '战斗交互'];
const PROFILE_LABELS = ['元素', '生日', '配音', '种族', '所属势力'];
function parseProfile(records) {
  const headAt = (name, from = 0) => records.findIndex((row, i) => i >= from && row.type === 'heading' && row.value === name);
  const out = { info: [], intro: '', affinity: [], stories: [], voices: [] };
  // 资料信息区（角色资料 → 好感度）：标签→值对 + 长简介
  const infoStart = headAt('角色资料');
  if (infoStart >= 0) {
    let stop = records.length;
    for (let i = infoStart + 1; i < records.length; i += 1) if (records[i].type === 'heading') { stop = i; break; }
    let label = null;
    for (let i = infoStart + 1; i < stop; i += 1) {
      const row = records[i];
      if (row.type !== 'text') continue;
      const value = String(row.value || '').trim();
      if (!value) continue;
      if (PROFILE_LABELS.includes(value)) { label = value; out.info.push({ label, value: '' }); continue; }
      if (label) { const hit = out.info[out.info.length - 1]; hit.value = hit.value ? hit.value + ' / ' + value : value; if (label !== '元素') label = null; continue; }
      if (value.length > 20 && !out.intro) out.intro = value;
    }
  }
  // 好感度表：LvN → 所需经验 → 属性加成对（或 —）→ 奖励三元组（或 —）
  const af = headAt('好感度');
  const st = headAt('角色故事');
  if (af >= 0) {
    let row = null; let icon = null;
    for (let i = af + 1; i < (st >= 0 ? st : records.length); i += 1) {
      const record = records[i];
      if (record.type === 'heading') break;
      if (record.type === 'image') { icon = cloudDetailAsset(record.url); continue; }
      if (record.type !== 'text') continue;
      const value = String(record.value || '').trim();
      if (!value || value === '—') { icon = null; continue; }
      const lv = value.match(/^Lv(\d+)$/);
      if (lv) { row = { lv: Number(lv[1]), exp: '', buff: null, reward: null }; out.affinity.push(row); icon = null; continue; }
      if (!row) continue;
      if (icon && /\+\d/.test(value)) { row.buff = { icon, label: value }; icon = null; continue; }
      if (!row.exp) { row.exp = value; icon = null; continue; }
      if (icon) {
        if (!row.reward) row.reward = { icon, name: value, count: '' };
        else if (!row.reward.count) row.reward.count = value;
      }
    }
  }
  // 角色故事：罗马数字标题 → 小标题 → 正文
  if (st >= 0) {
    const vs = headAt('角色语音', st);
    let chapter = null;
    for (let i = st + 1; i < (vs >= 0 ? vs : records.length); i += 1) {
      const record = records[i];
      if (record.type === 'heading') {
        if (/^[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+$/.test(record.value)) { chapter = { num: record.value, title: '', text: '' }; out.stories.push(chapter); }
        else if (chapter && !chapter.title) chapter.title = record.value;
        continue;
      }
      if (record.type === 'text' && chapter) chapter.text += String(record.value || '').trim();
    }
  }
  // 角色语音：4 个分类 → 条目（名称 → 可选英文键 → 内容）
  const vc = headAt('角色语音');
  if (vc >= 0) {
    let group = null;
    for (let i = vc + 1; i < records.length; i += 1) {
      const record = records[i];
      if (record.type === 'heading') {
        if (!VOICE_CATS.includes(record.value)) break;
        group = { name: record.value, entries: [] };
        out.voices.push(group);
        continue;
      }
      if (record.type !== 'text') continue;
      const value = String(record.value || '').trim();
      if (!value || !group) continue;
      const last = group.entries[group.entries.length - 1];
      if (last && !last.key && /^[\x20-\x7e]+$/.test(value)) { last.key = value; continue; }
      if (last && !last.text) { last.text = value; continue; }
      group.entries.push({ name: value, key: '', text: '' });
    }
  }
  return out;
}
const battleRecords = computed(() => pageRecords('battle'));
const battle = computed(() => ({
  attributeGroups: parseAttributeGroups(battleRecords.value),
  skills: parseSkills(battleRecords.value),
  constellation: parseConstellations(battleRecords.value)
}));
// P1：技能等级切换（0 = 满级默认档），取首个多级技能的档位序列
const skillLv = ref(0);
const skillLvSteps = computed(() => {
  const multi = battle.value.skills.find((skill) => skill.levels && skill.levels.length > 1);
  return multi ? multi.levels.map((entry) => entry.lv) : [];
});
function skillDescOf(skill) {
  const levels = skill.levels || [];
  if (!levels.length) return skill.desc || '';
  const hit = levels.find((entry) => entry.lv === skillLv.value) || levels[levels.length - 1];
  return hit.desc;
}
// P2：推荐配置里的奇波卡片按名称跳转奇波详情（找不到则进奇波列表）
function goQibo(name) {
  const qibo = getCatalog('qibo').data || { items: [] };
  const target = (qibo.items || []).find((entry) => entry.name === name) || (qibo.items || []).find((entry) => String(entry.name || '').includes(name));
  if (target && target.id) return uni.navigateTo({ url: `/pkg-qibo/detail?id=${target.id}` });
  uni.navigateTo({ url: '/pages/qibo/list' });
}
// P0：临阶·星赐按 12 阶结构化渲染，阶段切换用
const starGift = computed(() => parseStarGift(battleRecords.value));
const stageNo = ref(1);
const activeStage = computed(() => starGift.value.stages.find((stage) => stage.no === stageNo.value) || starGift.value.stages[0] || null);
// P2：推荐配置按 奇波搭配/灵子搭配/装备推荐 三组卡片化
const recommend = computed(() => parseRecommend(pageRecords('recommend')));
// P0：角色资料按 好感度表 / 故事章节 / 语音分类 结构化渲染
const profileData = computed(() => parseProfile(pageRecords('profile')));
// P2：BWIKI 信息补采字段（生日/配音等），覆盖 CBT3 的 待公开/未知 空值
const normName = (value) => String(value || '').replace(/\s/g, '');
const bwikiInfoMap = new Map((bwikiInfoData.characters || []).map((entry) => [normName(entry.name), entry.fields || {}]));
const bwikiFields = computed(() => bwikiInfoMap.get(normName(item.value?.name)) || {});
const birthday = computed(() => bwikiFields.value['生日'] || '');
const profileInfoRows = computed(() => {
  const rows = profileData.value.info.map((row) => ({ ...row }));
  Object.entries(bwikiFields.value).forEach(([label, value]) => {
    if (!value) return;
    const hit = rows.find((row) => row.label === label);
    if (hit) {
      if (!hit.value || /待公开|未知/.test(hit.value)) hit.value = value;
    } else {
      rows.push({ label, value });
    }
  });
  return rows;
});
// 轮次 12：头图第一优先本地原图（wiki-runtime 槽位），再回退 CBT3 采集原图；
// bundled icon 为无域名的紧凑相对路径，直接作 src 必 404，不再作为兜底档。
const heroStage = ref(0);
const heroCandidates = computed(() => [...new Set([
  wikiSlotImage('charWiki', item.value, ['art', 'avatar', 'icon']),
  cloudDetailAsset(detailEntries.value.flatMap((entry) => entry.pages?.battle?.records || []).find((record) => record.type === 'image' && /hero_get|hero_l|hero_s/.test(record.url))?.url)
].filter(Boolean))]);
const heroImage = computed(() => heroCandidates.value[heroStage.value] || '');
function onHeroError() { heroStage.value += 1; }
// 阶段5：Hero 立绘可预览大图（规范 01，与奇波详情一致）
function previewHero() { if (heroImage.value) uni.previewImage({ urls: [heroImage.value] }); }
watch(id, () => { heroStage.value = 0; stageNo.value = 1; });

// —— 阶段5：吸顶导航（总览/属性/技能/养成/配置/档案）+ 折叠状态 ——
// 区块用 cd-sec-<key> 类标记；同组多个面板共用一个类（定弦归养成、资料四卡归档案），
// select 取 DOM 顺序第一个匹配，天然实现「组内第一个存在的面板」作为定位锚点。
const navSections = [
  { key: 'overview', label: '总览' },
  { key: 'stats', label: '属性' },
  { key: 'skills', label: '技能' },
  { key: 'grow', label: '养成' },
  { key: 'config', label: '配置' },
  { key: 'files', label: '档案' }
];
const activeSec = ref('overview');
// 故事按篇章折叠、语音整卡默认收起（规范 02：不删资料，只改展示）
const expanded = ref({});
const voiceOpen = ref(false);
const voiceTotal = computed(() => profileData.value.voices.reduce((sum, group) => sum + group.entries.length, 0));
function toggleSec(key) { expanded.value = { ...expanded.value, [key]: !expanded.value[key] }; scheduleMeasure(); }
function toggleVoice() { voiceOpen.value = !voiceOpen.value; scheduleMeasure(); }
let secTops = [];
let navH = 48;
let contentBottom = 0;
let windowH = 0;
let windowTop = 0;
let lastScrollTop = 0;
let measureTimer = null;
try {
  const sys = uni.getSystemInfoSync() || {};
  windowH = sys.windowHeight || 0;
  // H5 端为 uni 页头高度（吸顶导航与定位都需让出）；微信端原生导航栏在视图外，windowTop 为 0
  windowTop = sys.windowTop || 0;
} catch (error) { windowH = 0; windowTop = 0; }
// 量取单个节点的视口 rect（节点不存在时返回 null），逐组查询避免批量 exec 的结果错位。
function measureOne(selector) {
  return new Promise((resolve) => {
    uni.createSelectorQuery().select(selector).boundingClientRect().exec((res) => {
      const rect = res && res[0];
      resolve(rect && typeof rect.top === 'number' ? rect : null);
    });
  });
}
// 量取各区块绝对页内位置。rect 均为视口相对，以页面顶部的 hero（页内绝对位置恒为 0）
// 为锚点做差值得到绝对位置，不依赖页面滚动量；面板 v-if 缺失时对应组自然跳过。
async function measureSections() {
  const heroRect = await measureOne('.head.hero');
  if (!heroRect) return false;
  const navRect = await measureOne('#cd-nav');
  if (navRect && navRect.height) navH = navRect.height;
  const pageRect = await measureOne('.character-detail');
  if (pageRect && pageRect.height) contentBottom = pageRect.height;
  const tops = [];
  for (const sec of navSections) {
    const rect = await measureOne('.cd-sec-' + sec.key);
    if (rect) tops.push({ key: sec.key, top: rect.top - heroRect.top });
  }
  secTops = tops;
  return tops.length > 0;
}
function syncHighlight(scrollTop) {
  if (!secTops.length) return;
  let current = '';
  for (const entry of secTops) {
    if (entry.top - windowTop - navH - 12 <= scrollTop) current = entry.key;
  }
  // 顶部时无区块越过阈值，回落到第一组；档案区不足一屏永远触不了顶，接近底部时强制高亮最后一组
  if (!current) current = navSections[0].key;
  if (contentBottom && windowH && scrollTop + windowH >= contentBottom - 40) current = secTops[secTops.length - 1].key;
  if (current !== activeSec.value) activeSec.value = current;
}
function onNavTap(sec) {
  measureSections().then((ok) => {
    if (!ok) return;
    const hit = secTops.find((entry) => entry.key === sec.key);
    if (!hit) return;
    uni.pageScrollTo({ scrollTop: Math.max(hit.top - windowTop - navH - 8, 0), duration: 220 });
    activeSec.value = sec.key;
  });
}
// 折叠/阶段/数据更新后延迟重测（异步图片也会改变高度，挂载后多次兜底）
function scheduleMeasure(delay = 350) {
  if (measureTimer) clearTimeout(measureTimer);
  measureTimer = setTimeout(() => {
    measureSections().then((ok) => { if (ok) syncHighlight(lastScrollTop); });
  }, delay);
}
onPageScroll((e) => { lastScrollTop = e.scrollTop; syncHighlight(e.scrollTop); });
watch([stageNo, skillLv, item], () => scheduleMeasure(500));

// 刷新角色收藏状态。
watch(item, (current) => { isFavNow.value = current ? isFav('charWiki', current.id) : false; }, { immediate: true });
// 切换角色收藏状态。
function toggleFavState() { const current = item.value || {}; isFavNow.value = toggleFav({ type: 'charWiki', id: current.id, name: current.name || '', icon: heroImage.value }); uni.showToast({ title: isFavNow.value ? '已收藏' : '已取消收藏', icon: 'none' }); }
// 重新读取角色目录和队伍状态；最近浏览与奇波详情同口径记录（收藏页「最近浏览」依赖此记录）。
function reload() { catalog.value = getCatalog('character').data || { items: [] }; toolkit.value = createElementToolkit(getCatalog('element').data); inTeam.value = load().members.indexOf(id.value) >= 0; if (item.value) { uni.setNavigationBarTitle({ title: item.value.name }); pushRecent({ type: 'character', id: item.value.id, name: item.value.name, icon: item.value.icon || '' }); } scheduleMeasure(200); }
// 切换当前角色是否编入队伍。
function toggleTeam() { const result = toggleMember(load(), id.value); if (result.error) return uni.showToast({ title: result.error, icon: 'none' }); inTeam.value = result.team.members.indexOf(id.value) >= 0; uni.showToast({ title: inTeam.value ? '已编入队伍' : '已移出队伍', icon: 'none' }); }
let unsubscribe = null;
onLoad((options) => {
  id.value = options?.id || '';
  reload();
  // 挂载后两轮兜底量测：异步立绘/技能图加载会改变区块高度
  nextTick(() => scheduleMeasure(120));
  setTimeout(() => scheduleMeasure(200), 1000);
  setTimeout(() => scheduleMeasure(200), 2500);
});
unsubscribe = onCatalogUpdate(reload);
onUnload(() => { unsubscribe && unsubscribe(); if (measureTimer) clearTimeout(measureTimer); });
onShareAppMessage(() => ({ title: `角色图鉴 · ${item.value?.name || '奇波小助手'}`, path: `/pkg-character/detail?id=${id.value}` }));
</script>

<style>
.character-detail .head__fav--on { background: #f6c653; color: #493000; font-weight: 700; text-shadow: none; }
.attribute-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12rpx; }
.attribute-card { display: flex; align-items: center; gap: 12rpx; padding: 14rpx; border-radius: 14rpx; background: var(--soft); }
.attribute-card__icon { width: 44rpx; height: 44rpx; border-radius: 10rpx; background: rgba(255, 255, 255, 0.45); flex: none; }
.attribute-card__body { flex: 1; min-width: 0; }
.attribute-card__label { display: block; color: var(--ink-2); font-size: 21rpx; }
.attribute-card__value { display: block; margin-top: 6rpx; color: var(--ink); font-size: 23rpx; font-weight: 700; font-variant-numeric: tabular-nums; }
.attr-group__title { margin: 16rpx 0 10rpx; color: var(--ink-2); font-size: 23rpx; font-weight: 700; }
.attr-group:first-of-type .attr-group__title { margin-top: 4rpx; }
.attr-note { margin-top: 14rpx; color: var(--ink-3); font-size: 20rpx; }
.skill-lv-row { display: flex; white-space: nowrap; margin-bottom: 6rpx; }
.lv-chip {
  display: inline-flex; align-items: center; justify-content: center;
  min-height: 50rpx; padding: 0 18rpx; margin-right: 12rpx;
  border: 1rpx solid var(--line); border-radius: 999rpx;
  background: var(--soft); color: var(--ink-2); font-size: 22rpx;
}
.lv-chip--on { background: var(--brand-soft, #eef2ff); border-color: var(--brand, #5a6cff); color: var(--brand-deep, #3a47c4); font-weight: 700; }
.lv-chip--hover { transform: scale(0.95); }
.skill-card, .detail-block { padding: 16rpx 0; border-bottom: 1rpx dashed var(--line); }
.skill-card:last-child, .detail-block:last-child { border-bottom: 0; }
.skill-card__head { display: flex; align-items: center; gap: 12rpx; }
.skill-card__name, .detail-block__title { color: var(--ink); font-size: 27rpx; font-weight: 700; }
.skill-card__main { display: flex; gap: 14rpx; margin-top: 10rpx; }
.skill-card__image { width: 72rpx; height: 72rpx; border-radius: 16rpx; background: var(--soft); flex: none; }
.skill-card__desc { flex: 1; color: var(--ink-2); font-size: 23rpx; line-height: 1.65; white-space: pre-wrap; }
.detail-block__text { display: block; margin-top: 10rpx; color: var(--ink-2); font-size: 23rpx; line-height: 1.65; white-space: pre-wrap; }
.detail-row { padding: 12rpx 0; color: var(--ink-2); font-size: 22rpx; line-height: 1.6; border-bottom: 1rpx dashed var(--line); }

/* ===== P0：临阶·星赐 阶段切换 + 礼物/材料卡片 ===== */
.stage-row { display: flex; white-space: nowrap; margin: 14rpx 0 4rpx; }
.stage-chip {
  display: inline-flex; align-items: center; justify-content: center;
  min-height: 52rpx; padding: 0 20rpx; margin-right: 12rpx;
  border: 1rpx solid var(--line); border-radius: 999rpx;
  background: var(--soft); color: var(--ink-2); font-size: 22rpx;
}
.stage-chip--on { background: var(--brand-soft, #eef2ff); border-color: var(--brand, #5a6cff); color: var(--brand-deep, #3a47c4); font-weight: 700; }
.stage-chip--hover { transform: scale(0.95); }
.gift-card { padding: 16rpx 0; border-bottom: 1rpx dashed var(--line); }
.gift-card:last-of-type { border-bottom: 0; }
.gift-card__head { display: flex; align-items: flex-start; gap: 14rpx; }
.gift-card__img { width: 72rpx; height: 72rpx; border-radius: 16rpx; background: var(--soft); flex: none; }
.gift-card__meta { flex: 1; min-width: 0; }
.gift-card__name { color: var(--ink); font-size: 25rpx; font-weight: 700; }
.gift-card__tags { display: flex; flex-wrap: wrap; gap: 8rpx; margin-top: 8rpx; }
.gift-card__buffs { display: flex; flex-direction: column; gap: 6rpx; flex: none; align-items: flex-end; }
.gift-buff { display: flex; align-items: center; gap: 8rpx; }
.gift-buff__icon { width: 32rpx; height: 32rpx; border-radius: 8rpx; background: var(--soft); }
.gift-buff__label { color: var(--brand-deep, #3a47c4); font-size: 23rpx; font-weight: 700; font-variant-numeric: tabular-nums; }
.gift-costs { display: flex; flex-wrap: wrap; gap: 10rpx 22rpx; margin-top: 12rpx; padding-left: 86rpx; }
.gift-cost { display: flex; align-items: center; gap: 8rpx; }
.gift-cost__icon { width: 32rpx; height: 32rpx; border-radius: 8rpx; background: var(--soft); }
.gift-cost__name { color: var(--ink-2); font-size: 22rpx; }
.gift-cost__count { color: var(--ink); font-size: 22rpx; font-weight: 700; font-variant-numeric: tabular-nums; }
.mini-tag { padding: 2rpx 12rpx; border-radius: 8rpx; background: var(--brand-soft); color: var(--brand); font-size: 20rpx; }
.mini-tag--skill { background: rgba(63, 191, 107, 0.14); color: #2f8f57; }
.ascend-block { margin-top: 14rpx; padding: 16rpx; border-radius: 14rpx; background: var(--soft); }
.ascend-block__head { display: flex; align-items: center; gap: 12rpx; }
.ascend-block__title { color: var(--ink); font-size: 24rpx; font-weight: 700; }
.ascend-block__limit { color: var(--ink-3); font-size: 21rpx; }
.ascend-block__buffs { display: flex; flex-wrap: wrap; gap: 8rpx 26rpx; margin-top: 10rpx; }
.ascend-block__note { margin-top: 10rpx; color: var(--ink-3); font-size: 20rpx; }

/* ===== P0：角色资料 好感度表 / 故事章节 / 语音分类 ===== */
.profile-kv { margin-top: 12rpx; }
.affinity-head, .affinity-row { display: flex; align-items: center; gap: 10rpx; padding: 10rpx 0; }
.affinity-head { border-bottom: 1rpx solid var(--line); color: var(--ink-3); font-size: 20rpx; }
.affinity-row { border-bottom: 1rpx dashed var(--line); }
.affinity-row:last-of-type { border-bottom: 0; }
.affinity-head__col, .affinity-row__lv, .affinity-row__exp, .affinity-row__cell { flex: 1; }
.affinity-head__col--lv, .affinity-row__lv { flex: 0 0 72rpx; text-align: left; }
.affinity-row__lv { color: var(--ink); font-weight: 700; font-size: 23rpx; }
.affinity-row__exp, .affinity-head__col { text-align: center; }
.affinity-row__exp { color: var(--ink-2); font-size: 22rpx; font-variant-numeric: tabular-nums; }
.affinity-row__cell { display: flex; justify-content: center; }
.affinity-row__none { color: var(--ink-3); font-size: 22rpx; }
.story-block { padding: 16rpx 0; border-bottom: 1rpx dashed var(--line); }
.story-block:last-of-type { border-bottom: 0; }
.story-block__title { color: var(--ink); font-size: 26rpx; font-weight: 700; }
.story-block__text { display: block; margin-top: 10rpx; color: var(--ink-2); font-size: 23rpx; line-height: 1.7; }
.voice-group { padding: 14rpx 0 6rpx; border-bottom: 1rpx dashed var(--line); }
.voice-group:last-of-type { border-bottom: 0; }
.voice-group__name { color: var(--brand-deep, #3a47c4); font-size: 24rpx; font-weight: 700; }
.voice-entry { display: flex; gap: 14rpx; padding: 10rpx 0; }
.voice-entry__name { flex: 0 0 168rpx; color: var(--ink); font-size: 22rpx; font-weight: 600; }
.voice-entry__text { flex: 1; color: var(--ink-2); font-size: 22rpx; line-height: 1.65; }

/* ===== P2：推荐配置分组卡片 ===== */
.rec-group { padding: 14rpx 0; border-bottom: 1rpx dashed var(--line); }
.rec-group:last-of-type { border-bottom: 0; }
.rec-group__title { color: var(--ink); font-size: 25rpx; font-weight: 700; }
.rec-group__intro { margin-top: 8rpx; color: var(--ink-3); font-size: 21rpx; line-height: 1.6; }
.rec-line { margin-top: 8rpx; color: var(--ink-2); font-size: 22rpx; line-height: 1.6; }
.rec-cards, .rec-gears { display: flex; flex-direction: column; gap: 10rpx; margin-top: 12rpx; }
.rec-card { display: flex; align-items: center; gap: 14rpx; padding: 14rpx; border: 1rpx solid var(--line); border-radius: 14rpx; background: var(--soft); }
.rec-card--hover { transform: scale(0.98); }
.rec-card__img { width: 72rpx; height: 72rpx; border-radius: 16rpx; background: rgba(255, 255, 255, 0.45); flex: none; }
.rec-card__body { flex: 1; min-width: 0; }
.rec-card__name { color: var(--ink); font-size: 24rpx; font-weight: 700; }
.rec-card__meta { margin-top: 4rpx; color: var(--ink-3); font-size: 20rpx; }
.rec-card__tag { color: var(--brand-deep, #3a47c4); font-size: 20rpx; flex: none; }
.rec-spirits { display: flex; flex-direction: column; gap: 12rpx; margin-top: 12rpx; }
.rec-spirit { padding: 14rpx; border: 1rpx solid var(--line); border-radius: 14rpx; background: var(--soft); }
.rec-spirit__head { display: flex; align-items: center; gap: 14rpx; }
.rec-spirit__img { width: 64rpx; height: 64rpx; border-radius: 14rpx; background: rgba(255, 255, 255, 0.45); flex: none; }
.rec-spirit__meta { flex: 1; min-width: 0; }
.rec-spirit__name { color: var(--ink); font-size: 24rpx; font-weight: 700; }
.rec-spirit__rarity { margin-left: 10rpx; color: var(--ink-3); font-size: 20rpx; font-weight: 400; }
.rec-spirit__main { display: block; margin-top: 4rpx; color: var(--brand-deep, #3a47c4); font-size: 21rpx; font-weight: 600; font-variant-numeric: tabular-nums; }
.rec-spirit__skill { margin-top: 8rpx; color: var(--ink); font-size: 22rpx; font-weight: 600; }
.rec-spirit__desc { margin-top: 6rpx; color: var(--ink-2); font-size: 22rpx; line-height: 1.6; }
.rec-spirit__note { margin-top: 4rpx; color: var(--ink-3); font-size: 20rpx; }
.rec-gear { display: flex; align-items: center; gap: 14rpx; padding: 12rpx 14rpx; border: 1rpx solid var(--line); border-radius: 14rpx; background: var(--soft); }
.rec-gear__slot { flex: 0 0 84rpx; color: var(--ink-3); font-size: 21rpx; text-align: center; }
.rec-gear__img { width: 60rpx; height: 60rpx; border-radius: 12rpx; background: rgba(255, 255, 255, 0.45); flex: none; }
.rec-gear__body { flex: 1; min-width: 0; }
.rec-gear__name { color: var(--ink); font-size: 23rpx; font-weight: 700; }
.rec-gear__sub { margin-left: 10rpx; color: var(--ink-3); font-size: 20rpx; font-weight: 400; }
.rec-gear__stats { margin-top: 4rpx; color: var(--brand-deep, #3a47c4); font-size: 21rpx; font-weight: 600; }
.rec-gear__effect { margin-top: 4rpx; color: var(--ink-2); font-size: 21rpx; line-height: 1.5; }

/* ===== 阶段5：吸顶导航（规范 02「吸顶式导航 + 分类堆叠」）===== */
.cd-nav {
  position: sticky;
  top: var(--window-top, 0);
  z-index: 30;
  display: flex;
  gap: 8rpx;
  margin: 16rpx -24rpx 16rpx;
  padding: 12rpx 20rpx;
  background: var(--bg);
  border-bottom: 1rpx solid var(--line);
}
.cd-nav__item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60rpx;
  border-radius: 999rpx;
  color: var(--ink-2);
  font-size: 24rpx;
  white-space: nowrap;
}
.cd-nav__item--on { background: var(--brand); color: #fff; font-weight: 600; }
/* ===== 阶段5：hero 装饰收敛（同奇波详情：关闭全局点阵）===== */
.character-detail .hero::after { content: none; }
/* ===== 阶段5：故事篇章折叠头部 ===== */
.story-block__head { display: flex; align-items: center; justify-content: space-between; gap: 12rpx; min-height: 56rpx; }
.story-block__arrow { color: var(--ink-3); font-size: 22rpx; }
</style>
