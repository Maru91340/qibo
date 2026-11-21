<template>
  <view class="page qd" :class="{ 'theme-dark': isDark }">
    <template v-if="item">
      <!-- 头部：全幅立绘 hero（图即背景 + 底部遮罩，对齐效果图）+ 元素/编号 + 收藏与已收集 -->
      <view class="head hero hero--element" :style="{ '--ele-color': item.elementColor }" hover-class="tap-hover" @tap="previewHero">
        <!-- 双层：放大裁切层做氛围底（模糊+降透明），前景完整立绘右锚定，避免方图 aspectFill 裁成脸部特写 -->
        <image v-if="heroIcon" class="head__bg" :src="heroIcon" mode="aspectFill" @error="onHeroError" />
        <view class="head__scrim" />
        <image v-if="heroIcon" class="head__fg" :src="heroIcon" mode="aspectFit" @error="onHeroError" />
        <view v-if="!heroIcon" class="head__glyph">{{ (item.name || '?').slice(0, 1) }}</view>
        <view class="hero__inner">
          <view class="head__top">
            <!-- 元素徽章：与收藏/收集同一毛玻璃胶囊语言；全名保留在「基础分类与特征」中 -->
            <view class="head__element">
              <image v-if="elementIcon" class="head__element-icon" :src="elementIcon" mode="aspectFit" />
              <text>{{ item.elementName }}</text>
            </view>
            <!-- 右上双药丸：图标+文字，统一同宽等高（收藏星 / 收集勾） -->
            <view class="head__actions">
              <view class="head__pill head__pill--fav" :class="{ 'head__pill--fav-on': isFavNow }" :aria-label="isFavNow ? '取消收藏' : '收藏'" hover-class="tap-hover" @tap.stop="toggleFavState">
                <view class="head__pill-star"><view class="head__pill-star-hole" /></view>
                <text>{{ isFavNow ? '已收藏' : '收藏' }}</text>
              </view>
              <view class="head__pill head__pill--collect" :class="{ 'head__pill--on': isCollectedNow }" :aria-label="isCollectedNow ? '取消已收集' : '标记收集'" hover-class="tap-hover" @tap.stop="toggleCollectedState">
                <view v-if="isCollectedNow" class="head__pill-check" />
                <view v-else class="head__pill-plus" />
                <text>{{ isCollectedNow ? '已收集' : '标记收集' }}</text>
              </view>
            </view>
          </view>
          <view class="banner__meta">
            <view class="head__meta-row">
              <view class="head__name">
                <text>{{ item.name }}</text>
                <text v-if="displayNumber" class="head__no">{{ displayNumber }}</text>
              </view>
              <view class="head__zoom" @tap.stop="previewHero">🔍 查看大图</view>
            </view>
            <view class="head__chips">
              <view v-if="classify.raw.stage" class="head__chip">{{ classify.raw.stage }}</view>
              <view v-if="classify.raw.size" class="head__chip">{{ classify.raw.size }}</view>
              <view v-if="classify.raw.race" class="head__chip">{{ classify.raw.race }}</view>
            </view>
          </view>
        </view>
      </view>

      <!-- ============ 战斗信息 BATTLE INFO ============ -->
      <view class="sec-head">
        <view class="sec-head__bar" />
        <text class="sec-head__cn">战斗信息</text>
        <text class="sec-head__en">BATTLE INFO</text>
      </view>

      <view v-if="!combat" class="panel card">
        <view class="panel__desc">CBT3 战斗数据整理中 · 公测后开放。</view>
      </view>

      <template v-else>
        <!-- 1. 六维能力资质 -->
        <view v-if="rating" class="panel card">
          <view class="panel__title">
            <text>六维能力资质</text>
            <text class="related-count">RADAR</text>
          </view>
          <view class="six-grid">
            <view
              v-for="stat in sixStats"
              :key="stat.k"
              class="six-tile"
              :class="[`six-tile--${stat.g.toLowerCase()}`, { 'six-tile--rec': stat.rec }]"
            >
              <view class="six-tile__icon-chip" :style="{ '--chip-c': stat.c }">
                <image
                  v-if="!brokenIcons[stat.ic]"
                  class="six-tile__icon"
                  :src="stat.ic"
                  mode="aspectFit"
                  @error="markIconError(stat.ic)"
                />
                <view v-else class="six-tile__glyph">{{ stat.label.slice(0, 1) }}</view>
              </view>
              <view class="six-tile__name">
                <text>{{ stat.label }}</text>
                <text v-if="stat.rec" class="six-tile__rec">👍</text>
              </view>
              <view class="six-tile__foot">
                <text class="six-tile__val">{{ stat.v }}</text>
                <text class="six-tile__grade" :class="gradeClass(stat.g)">{{ stat.g }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 2. 战斗技能 / 对决技能 -->
        <view v-if="currentSkills.length" class="panel card">
          <view class="panel__title">
            <text>技能</text>
            <text class="related-count">SKILLS</text>
          </view>
          <view class="seg">
            <view
              class="seg__item"
              :class="{ 'seg__item--on': skillTab === 'battle' }"
              hover-class="tap-hover"
              @tap="setSkillTab('battle')"
            >战斗技能 {{ battleSkills.length }}</view>
            <view
              class="seg__item"
              :class="{ 'seg__item--on': skillTab === 'duel' }"
              hover-class="tap-hover"
              @tap="setSkillTab('duel')"
            >对决技能 {{ duelSkills.length }}</view>
          </view>
          <view v-for="(skill, sIdx) in currentSkills" :key="skillTab + sIdx + skill.n" class="skill">
            <view class="skill__main">
              <view class="skill__avatar" :style="{ '--ele-c': skillEleColor(skill) }">
                <image
                  v-if="skill.ic && !brokenIcons[skill.ic]"
                  class="skill__img"
                  :src="combatIcon(skill.ic)"
                  mode="aspectFit"
                  @error="markIconError(skill.ic)"
                />
                <text v-else class="skill__glyph">{{ (skill.n || '?').slice(0, 1) }}</text>
                <text class="skill__lvnum">Lv.{{ skillLvAt(skill, sIdx) }}</text>
              </view>
              <view class="skill__body">
                <view class="skill__head">
                  <text class="skill__name">{{ skill.n }}</text>
                  <view v-if="skill.el" class="skill__ele" :style="{ color: skillEleColor(skill), background: skillEleTint(skill) }">
                    <image
                      v-if="skillEleIcon(skill) && !brokenIcons[skillEleIcon(skill)]"
                      class="skill__ele-icon"
                      :src="skillEleIcon(skill)"
                      mode="aspectFit"
                      @error="markIconError(skillEleIcon(skill))"
                    />
                    {{ skill.el }}
                  </view>
                  <text v-if="skill.tp" class="mini-tag" :class="`mini-tag--${skillTypeKey(skill.tp)}`">{{ skill.tp }}</text>
                </view>
                <view class="skill__meta">
                  <text v-if="skill.cd" class="skill__meta-item">⏱ {{ skill.cd }}</text>
                  <text v-if="skill.pw" class="skill__meta-item">⚡ {{ skill.pw }}</text>
                </view>
                <view v-if="skillLevelsOf(skill).length > 1" class="skill__lv">
                  <view
                    v-for="lvEntry in skillLevelsOf(skill)"
                    :key="lvEntry.lv"
                    class="facet-chip skill__lv-chip"
                    :class="{ 'facet-chip--active': skillLvAt(skill, sIdx) === lvEntry.lv }"
                    hover-class="facet-chip--hover" hover-stay-time="90"
                    @tap="setSkillLv(skillTab, sIdx, lvEntry.lv)"
                  >Lv.{{ lvEntry.lv }}</view>
                </view>
                <view class="skill__desc">{{ skillDescAt(skill, skillLvAt(skill, sIdx)) }}</view>
                <view v-if="skill.lvls || skill.segs || skill.bufs" class="fold" hover-class="tap-hover" @tap="toggleSec('sk' + skillTab + sIdx)">
                  <text class="fold__label">{{ astSummary(skill) }}</text>
                  <text class="fold__arrow">{{ expanded['sk' + skillTab + sIdx] ? '▴ 收起解析' : '▾ 展开解析' }}</text>
                </view>
                <view v-if="expanded['sk' + skillTab + sIdx]" class="fold__body fold__body--tables">
                  <template v-if="skill.segs && skill.segs.length">
                    <view class="tbl-title">攻击段落与伤害倍率</view>
                    <view v-for="(seg, gIdx) in skill.segs" :key="gIdx" class="tbl-row">
                      <view class="tbl-row__name">{{ seg.n }}</view>
                      <view class="tbl-row__cells">
                        <text class="tbl-cell tbl-cell--dmg">倍率 {{ astCellAt(seg, skillLvAt(skill, sIdx)) }}</text>
                        <text v-if="seg.brk && seg.brk !== '—'" class="tbl-cell">破韧 {{ seg.brk }}</text>
                        <text v-if="seg.it && seg.it !== '—'" class="tbl-cell">打断 {{ seg.it }}</text>
                        <text v-if="seg.sp && seg.sp !== '—'" class="tbl-cell">能量 {{ seg.sp }}</text>
                      </view>
                    </view>
                  </template>
                  <template v-if="skill.bufs && skill.bufs.length">
                    <view class="tbl-title">技能属性变动</view>
                    <view v-for="(buf, bIdx) in skill.bufs" :key="bIdx" class="tbl-row">
                      <view class="tbl-row__name">{{ buf.n }}</view>
                      <view class="tbl-row__cells">
                        <text class="tbl-cell tbl-cell--attr">{{ buf.attr }}</text>
                        <text class="tbl-cell tbl-cell--dmg">{{ astCellAt(buf, skillLvAt(skill, sIdx)) }}</text>
                        <text v-if="buf.calc" class="tbl-cell">{{ buf.calc }}</text>
                      </view>
                    </view>
                  </template>
                </view>
              </view>
            </view>
          </view>
          <view class="skill__note">三测数值 · 公测以官方为准</view>
        </view>

        <!-- 3. 专属特性 -->
        <view v-if="trait" class="panel card trait-panel">
          <view class="panel__title">
            <text>专属特性</text>
            <text class="related-count">TRAIT</text>
          </view>
          <view class="trait">
            <view class="trait__head">
              <text class="trait__name">{{ trait.n }}</text>
              <text v-if="trait.b" class="trait__badge">{{ trait.b }}</text>
            </view>
            <view class="trait__desc">{{ trait.d }}</view>
            <view v-if="trait.bufs && trait.bufs.length" class="fold" hover-class="tap-hover" @tap="toggleSec('trait')">
              <text class="fold__label">战斗机制与数值解析（{{ trait.bufs.length }} 项属性变动）</text>
              <text class="fold__arrow">{{ expanded.trait ? '▴ 收起解析' : '▾ 展开解析' }}</text>
            </view>
            <view v-if="expanded.trait && trait.bufs && trait.bufs.length" class="fold__body fold__body--tables">
              <view v-for="(buf, bIdx) in trait.bufs" :key="bIdx" class="tbl-row">
                <view class="tbl-row__name">{{ buf.n }}</view>
                <view class="tbl-row__cells">
                  <text class="tbl-cell tbl-cell--attr">{{ buf.attr }}</text>
                  <text class="tbl-cell tbl-cell--dmg">{{ astCellAt(buf, 1) }}</text>
                  <text v-if="buf.calc" class="tbl-cell">{{ buf.calc }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 4. 基因技能 -->
        <view v-if="geneSlots.length" class="panel card">
          <view class="panel__title">
            <text>基因技能</text>
          </view>
          <view class="gene-list">
            <view v-for="slot in geneSlots" :key="slot.index" class="gene-desc" :class="{ 'gene-desc--innate': slot.index === 0 }">
              <image
                v-if="slot.typeIcon && !brokenIcons[slot.typeIcon]"
                class="gene-desc__icon"
                :src="combatIcon(slot.typeIcon)"
                mode="aspectFit"
                @error="markIconError(slot.typeIcon)"
              />
              <view class="gene-desc__body">
                <view class="gene-desc__title">
                  <text class="gene-desc__name">{{ slot.name }}</text>
                  <text class="gene-desc__flag" :class="{ 'gene-desc__flag--innate': slot.index === 0 }">{{ slot.index === 0 ? '先天必带' : '推荐' }}</text>
                  <text v-if="slot.tier" class="gene-slot__tier" :class="`gene-slot__tier--${geneTierKey(slot.tier)}`">{{ slot.tier }}</text>
                  <text v-if="slot.typeName" class="gene-desc__type">{{ slot.typeName }}</text>
                </view>
                <view class="gene-desc__text">{{ slot.desc }}</view>
              </view>
            </view>
          </view>
        </view>
      </template>

      <!-- ============ 基础信息 BASIC INFO ============ -->
      <view class="sec-head">
        <view class="sec-head__bar" />
        <text class="sec-head__cn">基础信息</text>
        <text class="sec-head__en">BASIC INFO</text>
      </view>

      <!-- 1. 基础分类与特征 -->
      <view class="panel card">
        <view class="panel__title">基础分类与特征</view>
        <view v-if="classify.rows.length" class="kv">
          <view v-for="row in classify.rows" :key="row.k" class="kv__row">
            <text class="kv__key">{{ row.k }}</text>
            <text class="kv__value">{{ row.v }}</text>
          </view>
        </view>
        <template v-else>
          <view v-if="item.habitat && item.habitat !== '详见 BWIKI'" class="kv__row">
            <text class="kv__key">栖息地</text>
            <text class="kv__value">{{ item.habitat }}</text>
          </view>
          <view class="kv__row">
            <text class="kv__key">元素</text>
            <text class="kv__value">{{ item.elementLabel }}</text>
          </view>
          <view v-for="field in item.fields" :key="field.label" class="kv__row">
            <text class="kv__key">{{ field.label }}</text>
            <text class="kv__value">{{ field.value }}</text>
          </view>
        </template>
        <view class="panel__desc">{{ item.desc }}</view>
      </view>

      <!-- 2. 家园 -->
      <view v-if="home && (home.jobs || home.drops)" class="panel card">
        <view class="panel__title">
          <text>家园</text>
          <text v-if="home.cycle" class="related-count">{{ home.cycle }}</text>
        </view>
        <view v-if="home.jobs && home.jobs.length" class="home-jobs">
          <view v-for="job in home.jobs" :key="job.n" class="home-job">
            <image
              v-if="job.ic && !brokenIcons[job.ic]"
              class="home-job__icon"
              :src="combatIcon(job.ic)"
              mode="aspectFit"
              @error="markIconError(job.ic)"
            />
            <view class="home-job__body">
              <text class="home-job__name">{{ job.n }}</text>
              <text v-if="job.score" class="home-job__score">初始评分 {{ job.score }}</text>
            </view>
          </view>
        </view>
        <view v-if="home.drops && home.drops.length" class="panel__sub">牧场掉落</view>
        <view v-for="drop in home.drops" :key="drop.n" class="drop-row">
          <image
            v-if="drop.ic && !brokenIcons[drop.ic]"
            class="drop-row__icon"
            :src="combatIcon(drop.ic)"
            mode="aspectFit"
            @error="markIconError(drop.ic)"
          />
          <view v-else class="drop-row__glyph">{{ drop.n.slice(0, 1) }}</view>
          <view class="drop-row__body">
            <view class="drop-row__title">
              <text class="drop-row__name">{{ drop.n }}</text>
              <text v-if="drop.cat" class="drop-row__cat" :class="{ 'drop-row__cat--rare': /稀有|史诗|传说/.test(drop.cat) }">{{ drop.cat }}</text>
            </view>
            <view class="drop-row__meta">
              <text v-if="drop.rate" class="drop-row__rate">出率 {{ drop.rate }}</text>
              <text v-if="drop.qty" class="drop-row__qty">数量 {{ drop.qty }}</text>
            </view>
          </view>
        </view>
        <view v-if="home.tip" class="fold" hover-class="tap-hover" @tap="toggleSec('homeTip')">
          <text class="fold__label">牧场保底与效率机制</text>
          <text class="fold__arrow">{{ expanded.homeTip ? '▴' : '▾' }}</text>
        </view>
        <view v-if="expanded.homeTip && home.tip" class="fold__body">{{ home.tip }}</view>
      </view>

      <!-- 3. 家族（进化链） -->
      <view class="panel card">
        <view class="panel__title">
          <text>家族</text>
          <text v-if="family && family.name" class="related-count">{{ family.name }}</text>
        </view>
        <scroll-view v-if="family && family.chain.length" scroll-x enable-flex class="evo-scroll">
          <view class="evo-track">
            <template v-for="(node, idx) in family.chain">
              <view
                v-if="node.n"
                :key="'n' + idx"
                class="evo-node"
                :class="{ 'evo-node--cur': node.cur }"
                hover-class="tap-hover"
                @tap="goFamily(node)"
              >
                <image
                  v-if="node.icon && !brokenIcons[node.icon]"
                  class="evo-node__img"
                  :src="node.icon"
                  mode="aspectFit"
                  @error="markIconError(node.icon)"
                />
                <view v-else class="evo-node__glyph">{{ node.n.slice(0, 1) }}</view>
                <text class="evo-node__name">{{ node.n }}</text>
                <text v-if="node.st" class="evo-node__stage">{{ node.st }}</text>
              </view>
              <view v-else :key="'a' + idx" class="evo-arrow">
                <text class="evo-arrow__line">→</text>
                <text v-if="node.lv" class="evo-arrow__lv">{{ node.lv }}</text>
              </view>
            </template>
          </view>
        </scroll-view>
        <view v-else class="stages">
          <view v-for="(stage, index) in item.stages" :key="stage" class="stage">
            <view class="stage__dot">{{ index + 1 }}</view>
            <view class="stage__name">{{ stage }}</view>
          </view>
        </view>
      </view>

      <!-- 4. 星临图志 -->
      <view v-if="(atlas && atlas.groups.length) || atlasLevels.length" class="panel card">
        <view class="panel__title">
          <text>星临图志</text>
          <text class="related-count">ATLAS</text>
        </view>
        <view v-if="atlasBonus.length" class="atlas-bonus">
          <text v-for="bonus in atlasBonus" :key="bonus" class="atlas-bonus__item">{{ bonus }}</text>
        </view>
        <view v-for="group in (atlas && atlas.groups) || []" :key="group.t" class="atlas-group">
          <view class="atlas-group__head" hover-class="tap-hover" @tap="toggleSec(`atlas:${group.t}`)">
            <view class="atlas-group__type">{{ group.t }}</view>
            <text class="atlas-group__count">共 {{ group.steps.length }} 项</text>
            <text class="atlas-group__arrow">{{ expanded[`atlas:${group.t}`] ? '▴' : '▾' }}</text>
          </view>
          <view v-show="expanded['atlas:' + group.t]" class="atlas-group__body">
            <view v-for="(step, idx) in group.steps" :key="idx" class="atlas-step">
              <text class="atlas-step__name">{{ step.n }}</text>
              <text class="atlas-step__val">{{ step.v }}</text>
            </view>
          </view>
        </view>
        <view v-if="atlasLevels.length" class="fold" hover-class="tap-hover" @tap="toggleSec('atlasLv')">
          <text class="fold__label">图志等级与奖励（{{ atlasLevels.length }} 级）</text>
          <text class="fold__arrow">{{ expanded.atlasLv ? '▴' : '▾' }}</text>
        </view>
        <view v-if="expanded.atlasLv && atlasLevels.length" class="fold__body fold__body--tables">
          <view v-for="(row, idx) in atlasLevels" :key="idx" class="tbl-row">
            <view class="tbl-row__name">{{ row[0] }}</view>
            <view class="tbl-row__cells">
              <text v-if="row[3] && row[3] !== '—'" class="tbl-cell tbl-cell--attr">{{ row[3] }}</text>
              <text v-if="row[4] && row[4] !== '—'" class="tbl-cell">{{ row[4] }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 5. 奇波升级经验 -->
      <view v-if="expRows.length" class="panel card">
        <view class="panel__title">
          <text>奇波升级经验</text>
          <text class="related-count">EXP</text>
        </view>
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
        <view class="fold" hover-class="tap-hover" @tap="toggleSec('expAll')">
          <text class="fold__label">{{ expanded.expAll ? '折叠到突破节点' : '展开全等级（100 级）' }}</text>
          <text class="fold__arrow">{{ expanded.expAll ? '▴' : '▾' }}</text>
        </view>
      </view>

      <!-- BWIKI 特性文本兜底（无 CBT3 专属特性数据时展示） -->
      <view v-for="sec in fallbackSections" :key="sec.title" class="panel card">
        <view class="panel__title">{{ sec.title }}</view>
        <view class="panel__desc">{{ sec.text }}</view>
      </view>

      <view v-if="related.length" class="panel card">
        <view class="panel__title">
          <text>同元素奇波</text>
          <text class="related-count">{{ related.length }} 只</text>
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
            <image v-if="srcOf(rel, 'qiboWiki', 'icon', { preferMapped: false, widths: [120, 100, 80] })" class="related-card__img" :src="srcOf(rel, 'qiboWiki', 'icon', { preferMapped: false, widths: [120, 100, 80] })" mode="aspectFit" lazy-load @error="onError(rel, 'icon')" />
            <view v-else class="related-card__glyph">{{ rel.name.slice(0, 1) }}</view>
            <text class="related-card__name">{{ rel.name }}</text>
          </view>
        </scroll-view>
      </view>

      <view class="panel card">
        <view class="panel__title">元素相克参考</view>
        <view class="counter">
          <view class="counter__col">
            <text class="counter__label">克制</text>
            <text class="counter__value">{{ counters.strongText }}</text>
          </view>
          <view class="counter__col">
            <text class="counter__label">被克制</text>
            <text class="counter__value">{{ counters.weakText }}</text>
          </view>
        </view>
        <view class="panel__desc panel__desc--first">{{ elementNotice }}</view>
      </view>

      <view class="detail__foot">
        <view
          class="cx-btn"
          :class="inTeam ? 'cx-btn--outline' : 'cx-btn--primary'"
          hover-class="tap-hover"
          @tap="toggleTeam"
        >
          {{ inTeam ? '移出出战奇波' : '设为出战奇波' }}
        </view>
      </view>

      <view class="footnote">{{ sourceNote }}</view>
    </template>
    <view v-if="!item" class="cx-empty"><view class="cx-empty__icon">🐾</view><view class="cx-empty__text">未找到该奇波</view></view>
  </view>
</template>

<script setup>
import { useTheme } from '@/utils/theme.js';
import { pushRecent } from '@/utils/recent.js';
import { isFav, toggleFav } from '@/utils/favorites.js';
import { isCollected, toggleCollected } from '@/utils/collected.js';

const { isDark } = useTheme();
import { computed, ref, watch } from 'vue';
import { onLoad, onUnload, onShareAppMessage } from '@dcloudio/uni-app';
import { getCatalog, onCatalogUpdate } from '@/services/content.js';
import { createElementToolkit } from '@/data/element.js';
import { ELEMENT_ICONS } from '@/data/element-icons.js';
import { qiboIndex } from '@/data/generated/qibo-index.js';
import { decorateWithElement, findById } from '@/utils/query.js';
import { load, toggleQibo } from '@/utils/team.js';
import { useImageSources } from '@/utils/image-source.js';
import { combatOf, combatIcon, combatStatic, skillDescAt, astCellAt, expandSkillLevels } from './combat.js';

const id = ref('');
const catalog = ref({ items: [], notice: '' });
const toolkit = ref(createElementToolkit(getCatalog('element').data));
const inTeam = ref(false);

const item = computed(() =>
  decorateWithElement(findById(catalog.value.items, id.value), toolkit.value.elementMap)
);
// 奇波详情大图用 Tex_icon_pet_* 图标按宽度降级（阶段 2.3）：失败回退原有 icon，最后走占位
const heroIcon = computed(() => (item.value ? srcOf(item.value, 'qiboWiki', 'icon', { widths: [200, 120, 100, 80] }) : ''));
// hero 元素徽章图标（与列表卡同一元素图标库）
const elementIcon = computed(() => (item.value ? ELEMENT_ICONS[item.value.element] || '' : ''));

// ---- CBT3 编号口径（与列表页同源）：名称 → wikiId，关联战斗数据；同名特殊形态规则与 list.vue 一致 ----
const duplicateNames = qiboIndex.reduce((counts, entry) => ({ ...counts, [entry.name]: (counts[entry.name] || 0) + 1 }), {});
const nameToWiki = new Map();
qiboIndex.forEach((entry) => {
  const key = duplicateNames[entry.name] > 1 && entry.suffix ? `${entry.name}（特殊）` : entry.name;
  if (!nameToWiki.has(key)) nameToWiki.set(key, entry.wikiId);
});
function wikiIdOf(entry) {
  if (!entry) return '';
  const name = String(entry.name || '');
  return nameToWiki.get(name) || nameToWiki.get(name.replace(/（特殊）$/, '')) || '';
}

const wikiId = computed(() => wikiIdOf(item.value));
const combat = computed(() => combatOf(wikiId.value));
const displayNumber = computed(() => {
  const entry = qiboIndex.find((row) => row.wikiId === wikiId.value);
  return entry ? entry.displayNumber : '';
});

// ---- 六维资质 ----
const SIX_META = {
  atk: '攻击', hp: '生命', def: '防御', bjl: '暴击率', brk: '破韧值', jstk: '超限强度'
};
// 每维专属色（图标座渐变底）：CBT3 图标是白色系图形，必须落在彩色/深色座上才可见，同时形成色彩编码
const STAT_COLORS = {
  atk: '#ff7043', hp: '#3fbf6b', def: '#4a8df0', bjl: '#f2b50c', brk: '#9b6cff', jstk: '#22c3b4'
};
const rating = computed(() => (combat.value && combat.value.r) || null);
const sixStats = computed(() => {
  if (!rating.value) return [];
  return rating.value.six.map((stat) => ({
    ...stat,
    label: SIX_META[stat.k] || stat.k,
    c: STAT_COLORS[stat.k] || '#5a6480',
    ic: combatIcon(`icons/pet/tex_petupgrade_icon_${stat.k}.png`)
  }));
});
function gradeClass(grade) {
  const key = String(grade || '').toLowerCase();
  return `grade--${key || 'd'}`;
}

// ---- 技能 ----
const battleSkills = computed(() => (combat.value && combat.value.b) || []);
const duelSkills = computed(() => (combat.value && combat.value.d) || []);
const skillTab = ref('battle');
if (!battleSkills.value.length && duelSkills.value.length) skillTab.value = 'duel';
const currentSkills = computed(() => (skillTab.value === 'battle' ? battleSkills.value : duelSkills.value));
const skillLvMap = ref({});
function setSkillTab(tab) {
  skillTab.value = tab;
}
function skillLevelsOf(skill) {
  return expandSkillLevels(skill);
}
// 同名技能在战斗/对决两个页签各自记忆等级档（键：页签+序号，对齐参考站逐卡独立滑档）
function skillLvAt(skill, sIdx) {
  const levels = skillLevelsOf(skill);
  if (!levels.length) return 1;
  const key = `${skillTab.value}-${sIdx}`;
  const saved = skillLvMap.value[key];
  return saved || levels[0].lv;
}
function setSkillLv(tab, sIdx, lv) {
  skillLvMap.value = { ...skillLvMap.value, [`${tab}-${sIdx}`]: lv };
}
function skillTypeKey(type) {
  if (/特技/.test(type)) return 'special';
  if (/合击/.test(type)) return 'union';
  if (/特性/.test(type)) return 'trait';
  return 'skill';
}
// 技能元素名（木/火…）反查元素表拿颜色与图标
const eleByName = computed(() => {
  const map = {};
  (toolkit.value.elements || []).forEach((ele) => { map[ele.name] = ele; map[ele.label] = ele; });
  return map;
});
function skillEle(skill) {
  return eleByName.value[skill.el] || null;
}
function skillEleColor(skill) {
  return (skillEle(skill) || {}).color || '#5a6480';
}
function skillEleTint(skill) {
  return (skillEle(skill) || {}).tint || 'var(--soft)';
}
function skillEleIcon(skill) {
  const key = (skillEle(skill) || {}).key;
  return key ? ELEMENT_ICONS[key] : '';
}
function astSummary(skill) {
  const parts = [];
  if (skill.segs && skill.segs.length) parts.push(`${skill.segs.length} 段攻击`);
  if (skill.bufs && skill.bufs.length) parts.push(`${skill.bufs.length} 项属性变动`);
  return parts.length ? `战斗机制与数值解析（${parts.join(' · ')}）` : '战斗机制与数值解析';
}

// ---- 专属特性 ----
const trait = computed(() => (combat.value && combat.value.tr) || null);

// ---- 基因 ----
// 槽位的档位名/评分/描述已在采集时就地解析；字典只补类型名称与图标
const geneDict = combatStatic.genes || {};
const geneSlots = computed(() => {
  const slots = (combat.value && combat.value.g && combat.value.g.slots) || [];
  return slots.map((slot, index) => {
    if (!slot) return null;
    const dict = geneDict[slot.b] || {};
    return {
      index,
      name: slot.b,
      tier: slot.tn || '',
      score: slot.s || 0,
      desc: slot.d || '',
      typeName: dict.t || '',
      typeIcon: dict.ti || ''
    };
  }).filter(Boolean);
});
// WXSS 编译器不支持非 ASCII 类名（压缩时转义成 \5353… 反斜杠形式直接编译失败），
// 档位中文名映射为 ASCII 样式键，展示仍用原文
function geneTierKey(tier) {
  if (tier === '卓越') return 'epic';
  if (tier === '优良') return 'rare';
  return 'common';
}

// ---- 基础分类与特征 ----
const classify = computed(() => {
  const source = (combat.value && combat.value.c) || {};
  const raw = { ...source, size: String(source.size || '').replace(/\s*[（(][\d,，\s]+[）)]\s*$/, '').trim() };
  const rows = [];
  // 元素全名（如 冰=寒霜）落在资料区，hero 徽章只展示简称，避免两套叫法混用
  if (item.value && item.value.elementLabel) rows.push({ k: '元素', v: item.value.elementLabel });
  if (raw.stage) rows.push({ k: '进化阶段', v: raw.stage });
  if (raw.size) rows.push({ k: '体型', v: raw.size });
  if (raw.catch) rows.push({ k: '可捕捉', v: raw.catch });
  if (raw.race) rows.push({ k: '种族与族系', v: raw.race });
  if (raw.echo && (raw.echo.prob || raw.echo.item)) rows.push({ k: '星结回响', v: `${raw.echo.prob || ''} ${raw.echo.item || ''}`.trim() });
  return { raw, rows };
});
const home = computed(() => (combat.value && combat.value.h) || null);

// ---- 家族进化链 ----
const family = computed(() => {
  const raw = combat.value && combat.value.f;
  if (!raw || !raw.chain || !raw.chain.length) return null;
  const chain = raw.chain.map((node) => node.n
    ? { ...node, icon: combatIcon(`icons/pet/tex_icon_pet_${node.id}.png`) }
    : node);
  return { name: raw.name, chain };
});
function goFamily(node) {
  if (!node || !node.n || node.cur) return;
  const target = catalog.value.items.find((entry) => entry.name === node.n || entry.name === `${node.n}（特殊）`);
  if (!target || !target.id) {
    uni.showToast({ title: `${node.n} 暂无详情数据`, icon: 'none' });
    return;
  }
  uni.redirectTo({ url: '/pkg-qibo/detail?id=' + target.id });
}

// ---- 星临图志 ----
const atlas = computed(() => (combat.value && combat.value.a) || null);
// 图志等级表的「解锁加成」列是每只奇波专属，随采集逐只存储（combat.al）
const atlasLevels = computed(() => (combat.value && combat.value.al) || []);
const atlasBonus = computed(() => {
  const bonus = new Set();
  atlasLevels.value.forEach((row) => { if (row[3] && row[3] !== '—') bonus.add(row[3]); });
  return [...bonus];
});

// ---- 升级经验（全站共享表，默认只看突破节点） ----
const expRows = computed(() => combatStatic.exp || []);
const EXP_MILESTONES = new Set(['1', '20', '30', '40', '50', '60', '70', '80', '90', '100']);
const expanded = ref({});
function toggleSec(key) {
  expanded.value = { ...expanded.value, [key]: !expanded.value[key] };
}
const expView = computed(() => {
  if (expanded.value.expAll) return expRows.value;
  return expRows.value.filter((row) => EXP_MILESTONES.has(String(row[0])));
});

// ---- 图标失败降级（首字占位，同 list.vue 模式） ----
const brokenIcons = ref({});
function markIconError(path) {
  if (!path) return;
  brokenIcons.value = { ...brokenIcons.value, [path]: true };
}

// 9.3 / S03：收藏位（对齐 catalog-detail，收藏口径与列表页一致，仅本机存储）
// 已收集=游戏内已获得（本地方案，独立于收藏），列表/详情共用 qiboWiki 类型同步状态
const isFavNow = ref(false);
const isCollectedNow = ref(false);
watch(item, (it) => {
  isFavNow.value = it ? isFav('qiboWiki', it.id) : false;
  isCollectedNow.value = it ? isCollected('qiboWiki', it.id) : false;
}, { immediate: true });
function toggleFavState() {
  const it = item.value || {};
  const on = toggleFav({ type: 'qiboWiki', id: it.id, name: it.name || '', icon: heroIcon.value || '' });
  isFavNow.value = on;
  uni.showToast({ title: on ? '已收藏' : '已取消收藏', icon: 'none' });
}
function toggleCollectedState() {
  const it = item.value || {};
  const on = toggleCollected({ type: 'qiboWiki', id: it.id, name: it.name || '', icon: heroIcon.value || '' });
  isCollectedNow.value = on;
  uni.showToast({ title: on ? '已标记收集' : '已取消收集', icon: 'none' });
}
function onHeroError() {
  onError(item.value, 'icon');
}
function previewHero() {
  if (!heroIcon.value) return;
  uni.previewImage({ urls: [heroIcon.value] });
}
const { srcOf, onError: nextImageSource, reset } = useImageSources();
// 图片候选链降级：具名函数便于模板事件绑定静态检查识别
function onError(entry, role) {
  nextImageSource(entry, role);
}

const counters = computed(() => {
  const it = item.value || {};
  const names = (keys) =>
    (keys || []).map((key) => (toolkit.value.elementMap[key] || {}).label).filter(Boolean).join('、') || '无';
  return {
    strongText: names(toolkit.value.counters && toolkit.value.counters[it.element]),
    weakText: names(toolkit.value.counteredBy && toolkit.value.counteredBy[it.element])
  };
});
const elementNotice = computed(() => toolkit.value.notice);

// BWIKI 特性文本：已有 CBT3 专属特性时不再重复展示
const fallbackSections = computed(() => {
  if (trait.value) return [];
  return ((item.value && item.value.sections) || []).filter((sec) => sec && sec.title === '特性');
});

// 同元素推荐：同元素其他奇波，最多 8 只
const related = computed(() => {
  const it = item.value;
  if (!it) return [];
  return (catalog.value.items || [])
    .filter((entry) => entry.id !== it.id && entry.element === it.element)
    .slice(0, 8);
});
function goRelated(rid) {
  uni.redirectTo({ url: '/pkg-qibo/detail?id=' + rid });
}

// 3.3 / L05：页脚口径统一为 CBT3 编号索引（与列表页 204 一致，不再引用 catalog.notice 的 BWIKI 原始计数）
const sourceNote = `资料来自 BWIKI 收录与公开 CBT3 编号索引 · 图鉴共 ${qiboIndex.length} 条 · 收录不等于官方核实 · 公测后以官方为准`;

function reload() {
  catalog.value = getCatalog('qibo').data || { items: [], notice: '' }
  // 最近浏览记录
  const it = catalog.value.items.filter((entry) => entry.id === id.value)[0];
  if (it) pushRecent({ type: 'qibo', id: it.id, name: it.name, icon: it.icon || '' });;
  toolkit.value = createElementToolkit(getCatalog('element').data);
  inTeam.value = load().qibos.indexOf(id.value) >= 0;
  reset();
}

function toggleTeam() {
  const next = toggleQibo(load(), id.value);
  inTeam.value = next.qibos.indexOf(id.value) >= 0;
  uni.showToast({ title: inTeam.value ? '已设为出战' : '已移出出战', icon: 'none' });
}

let unsubscribe = null;
onLoad((options) => {
  id.value = (options && options.id) || '';
  reload();
  if (!item.value) uni.setNavigationBarTitle({ title: '奇波不存在' });
});
unsubscribe = onCatalogUpdate(reload);
onUnload(() => unsubscribe && unsubscribe());
onShareAppMessage(() => ({
  title: `奇波图鉴 · ${item.value ? item.value.name : '奇波小助手'}`,
  path: `/pkg-qibo/detail?id=${id.value}`
}));
</script>

<style>
/* ===== 页内设计令牌：六维等级色 / 品质色（亮暗主题通用，深色下自动降饱和） ===== */
.qd {
  --g-sss: #f2b50c;
  --g-s: #f2b50c;
  --g-a: #8a6cff;
  --g-b: #2f9bff;
  --g-c: #52c7b8;
  --g-d: #9aa2b1;
  --g-e: #9aa2b1;
  --g-f: #9aa2b1;
  --gold-soft: rgba(242, 176, 12, 0.14);
  --purple-soft: rgba(138, 108, 255, 0.14);
  --blue-soft: rgba(47, 155, 255, 0.12);
}
/* 深色主题：S/A/B 高亮 tile 的淡彩底加浓一档，保证在暗卡上可感知 */
.qd.theme-dark {
  --gold-soft: rgba(242, 176, 12, 0.2);
  --purple-soft: rgba(138, 108, 255, 0.22);
  --blue-soft: rgba(47, 155, 255, 0.18);
}

/* ===== 大板块标题：brand 竖条 + 中文 + 英文小字 ===== */
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

/* ===== 头部：编号徽章 / 元素 chips / 资质评分徽章 ===== */
.head__name {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-wrap: wrap;
}
.head__no {
  padding: 2rpx 12rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.5);
  border-radius: 8rpx;
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  font-size: 20rpx;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.head__side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12rpx;
}

/* ===== 等级章：实底色块 + 白字（评分徽章与六维 tile 共用，浅/深主题通用） ===== */
.grade--sss, .grade--s { background: #f2b50c; }
.grade--a { background: #8a6cff; }
.grade--b { background: #2f9bff; }
.grade--c { background: #26a69a; }
.grade--d, .grade--e, .grade--f { background: #9aa2b1; }
.grade--sss, .grade--s, .grade--a, .grade--b, .grade--c, .grade--d, .grade--e, .grade--f {
  color: #fff;
  padding: 0 12rpx;
  border-radius: 8rpx;
  line-height: 1.5;
}

.six-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12rpx;
  margin-top: 6rpx;
}
.six-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  padding: 16rpx 8rpx 12rpx;
  border: 1rpx solid var(--line);
  border-radius: 16rpx;
  background: var(--soft);
}
.six-tile--s, .six-tile--sss { background: var(--gold-soft); border-color: rgba(242, 176, 12, 0.4); }
.six-tile--a { background: var(--purple-soft); border-color: rgba(138, 108, 255, 0.35); }
.six-tile--b { background: var(--blue-soft); }
.six-tile__icon-chip {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56rpx;
  height: 56rpx;
  border-radius: 14rpx;
  background-color: var(--chip-c, #5a6480);
  background-image: linear-gradient(160deg, rgba(255, 255, 255, 0.22) 0%, rgba(0, 0, 0, 0.26) 100%);
  box-shadow: 0 4rpx 10rpx rgba(31, 42, 68, 0.18);
}
.six-tile__icon {
  width: 40rpx;
  height: 40rpx;
}
.six-tile__glyph {
  color: #fff;
  font-size: 22rpx;
  font-weight: 800;
}
.six-tile__name {
  display: flex;
  align-items: center;
  gap: 4rpx;
  color: var(--ink-2);
  font-size: 22rpx;
}
.six-tile__rec { font-size: 20rpx; }
.six-tile__foot {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}
.six-tile__val {
  color: var(--ink);
  font-size: 28rpx;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.six-tile__grade {
  font-size: 22rpx;
  font-weight: 800;
}

/* ===== 技能页签（分段切换） ===== */
.seg {
  display: flex;
  gap: 12rpx;
  padding: 6rpx;
  margin-bottom: 8rpx;
  border-radius: 18rpx;
  background: var(--soft);
}
.seg__item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60rpx;
  border-radius: 14rpx;
  color: var(--ink-2);
  font-size: 24rpx;
}
.seg__item--on {
  background: var(--brand);
  color: #fff;
  font-weight: 600;
}

.skill {
  padding: 16rpx 0;
  border-bottom: 1rpx solid var(--line);
}
.skill:last-child {
  border-bottom: none;
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
  background-color: var(--ele-c, #5a6480);
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
.skill__lvnum {
  position: absolute;
  right: -6rpx;
  bottom: -6rpx;
  padding: 2rpx 10rpx;
  border-radius: 10rpx;
  background: var(--brand);
  color: #fff;
  font-size: 18rpx;
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
.skill__ele {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  padding: 2rpx 12rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  font-weight: 600;
}
.skill__ele-icon {
  width: 22rpx;
  height: 22rpx;
}
.mini-tag {
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  background: var(--brand-soft);
  color: var(--brand);
  font-size: 20rpx;
}
.mini-tag--special { background: var(--brand-soft); color: var(--brand); }
.mini-tag--skill { background: var(--soft); color: var(--ink-2); }
.mini-tag--union { background: var(--warn-soft); color: var(--warn-ink); }
.mini-tag--trait { background: var(--ok-soft); color: var(--ok); }
.skill__meta {
  display: flex;
  gap: 16rpx;
  margin-top: 6rpx;
  color: var(--ink-3);
  font-size: 20rpx;
  font-variant-numeric: tabular-nums;
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

/* ===== 折叠块（头部样式已迁 theme.css 共享；此处仅保留解析表格主体） ===== */
.fold__body {
  margin-top: 6rpx;
  padding: 14rpx 16rpx;
  border-radius: 14rpx;
  background: var(--soft);
  color: var(--ink-2);
  font-size: 22rpx;
  line-height: 1.6;
}
.fold__body--tables {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.tbl-title {
  color: var(--ink);
  font-size: 22rpx;
  font-weight: 700;
}
.tbl-row {
  padding: 8rpx 0;
  border-bottom: 1rpx dashed var(--line);
}
.tbl-row:last-child {
  border-bottom: none;
}
.tbl-row__name {
  color: var(--ink-2);
  font-size: 20rpx;
  margin-bottom: 4rpx;
}
.tbl-row__cells {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}
.tbl-cell {
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  background: var(--card-bg);
  border: 1rpx solid var(--line);
  color: var(--ink-2);
  font-size: 20rpx;
  font-variant-numeric: tabular-nums;
}
.tbl-cell--dmg {
  color: var(--brand-deep);
  font-weight: 600;
}
.tbl-cell--attr {
  color: var(--ok);
}

/* ===== 专属特性（金底强调卡） ===== */
.trait-panel {
  border: 1rpx solid rgba(242, 176, 12, 0.35);
  background: linear-gradient(160deg, var(--gold-soft), var(--card-bg) 60%);
}
.trait__head {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-wrap: wrap;
}
.trait__name {
  color: var(--ink);
  font-size: 28rpx;
  font-weight: 700;
}
.trait__badge {
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  background: var(--warn-soft);
  color: var(--warn-ink);
  font-size: 20rpx;
}
.trait__desc {
  margin-top: 8rpx;
  color: var(--ink-2);
  font-size: 23rpx;
  line-height: 1.6;
}

/* ===== 基因槽位（档位徽章仍被 gene-desc 列表复用） ===== */
.gene-slot__tier {
  padding: 0 10rpx;
  border-radius: 8rpx;
  font-size: 18rpx;
  font-weight: 600;
}
.gene-slot__tier--epic { color: var(--g-a); background: var(--purple-soft); }
.gene-slot__tier--rare { color: var(--g-b); background: var(--blue-soft); }
.gene-slot__tier--common { color: var(--g-d); background: var(--soft); }
.gene-desc {
  display: flex;
  gap: 12rpx;
  padding: 12rpx 0;
  border-bottom: 1rpx dashed var(--line);
}
.gene-desc:last-child {
  border-bottom: none;
}
.gene-desc__icon {
  width: 40rpx;
  height: 40rpx;
  flex: none;
  margin-top: 2rpx;
}
.gene-desc__body {
  flex: 1;
  min-width: 0;
}
.gene-desc__title {
  display: flex;
  align-items: center;
  gap: 10rpx;
  flex-wrap: wrap;
}
.gene-desc__name {
  color: var(--ink);
  font-size: 24rpx;
  font-weight: 600;
}
.gene-desc__type {
  color: var(--ink-3);
  font-size: 20rpx;
}
.gene-desc__text {
  margin-top: 4rpx;
  color: var(--ink-2);
  font-size: 22rpx;
  line-height: 1.55;
}

/* ===== 家园 / 掉落 ===== */
.home-jobs {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}
.home-job {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 10rpx 18rpx;
  border: 1rpx solid var(--line);
  border-radius: 14rpx;
  background: var(--soft);
}
.home-job__icon {
  width: 40rpx;
  height: 40rpx;
}
.home-job__body {
  display: flex;
  flex-direction: column;
}
.home-job__name {
  color: var(--ink);
  font-size: 24rpx;
  font-weight: 600;
}
.home-job__score {
  color: var(--ink-3);
  font-size: 20rpx;
}
.drop-row {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 10rpx 0;
  border-bottom: 1rpx dashed var(--line);
}
.drop-row:last-of-type {
  border-bottom: none;
}
.drop-row__icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 12rpx;
  background: var(--soft);
  flex: none;
}
.drop-row__glyph {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
  border-radius: 12rpx;
  background: var(--soft);
  color: var(--ink-2);
  font-size: 26rpx;
  font-weight: 700;
  flex: none;
}
.drop-row__body {
  flex: 1;
  min-width: 0;
}
.drop-row__title {
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.drop-row__name {
  color: var(--ink);
  font-size: 24rpx;
  font-weight: 600;
}
.drop-row__cat {
  padding: 0 10rpx;
  border-radius: 8rpx;
  background: var(--soft);
  color: var(--ink-2);
  font-size: 18rpx;
}
.drop-row__cat--rare {
  background: var(--warn-soft);
  color: var(--warn-ink);
}
.drop-row__meta {
  display: flex;
  gap: 16rpx;
  margin-top: 2rpx;
  color: var(--ink-3);
  font-size: 20rpx;
  font-variant-numeric: tabular-nums;
}

/* ===== 家族进化链（横向图像链） ===== */
.evo-scroll {
  width: 100%;
  white-space: nowrap;
}
.evo-track {
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  padding: 4rpx 2rpx;
}
.evo-node {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  width: 152rpx;
  padding: 12rpx 6rpx;
  border: 1rpx solid var(--line);
  border-radius: 16rpx;
  background: var(--soft);
}
.evo-node--cur {
  border-color: var(--brand);
  background: var(--brand-soft);
}
.evo-node__img {
  width: 88rpx;
  height: 88rpx;
}
.evo-node__glyph {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: var(--brand-soft);
  color: var(--brand);
  font-size: 32rpx;
  font-weight: 700;
}
.evo-node__name {
  max-width: 100%;
  color: var(--ink);
  font-size: 22rpx;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.evo-node__stage {
  color: var(--ink-3);
  font-size: 18rpx;
}
.evo-arrow {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 2rpx;
  flex: none;
}
.evo-arrow__line {
  color: var(--brand);
  font-size: 30rpx;
  font-weight: 700;
}
.evo-arrow__lv {
  color: var(--ink-3);
  font-size: 18rpx;
  white-space: nowrap;
}

/* ===== 星临图志 / 经验表 ===== */
.atlas-bonus {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-bottom: 8rpx;
}
.atlas-bonus__item {
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  background: var(--ok-soft);
  color: var(--ok);
  font-size: 20rpx;
}
.atlas-group {
  margin-top: 10rpx;
}
.atlas-group__head {
  display: flex;
  align-items: center;
  gap: 10rpx;
  min-height: 56rpx;
  padding: 0 4rpx;
}
.atlas-group__type {
  display: inline-flex;
  padding: 2rpx 14rpx;
  border-radius: 999rpx;
  background: var(--brand-soft);
  color: var(--brand-deep);
  font-size: 20rpx;
  font-weight: 600;
}
.atlas-group__count {
  color: var(--ink-3);
  font-size: 20rpx;
}
.atlas-group__arrow {
  margin-left: auto;
  color: var(--ink-3);
  font-size: 20rpx;
}
.atlas-group__body {
  padding: 2rpx 14rpx 4rpx;
  border-radius: 12rpx;
  background: var(--soft);
}
.atlas-step {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  padding: 8rpx 0;
  border-bottom: 1rpx dashed var(--line);
}
.atlas-step:last-child {
  border-bottom: none;
}
.atlas-step__name {
  flex: 1;
  min-width: 0;
  color: var(--ink-2);
  font-size: 22rpx;
}
.atlas-step__val {
  flex: none;
  padding: 2rpx 10rpx;
  border-radius: 8rpx;
  background: var(--brand-soft);
  color: var(--brand-deep);
  font-size: 20rpx;
  font-variant-numeric: tabular-nums;
}
.exp-table {
  margin-top: 4rpx;
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

/* ===== 旧板块复用样式（stages / related / counter） ===== */
.stages {
  display: flex;
  align-items: flex-start;
}
.stage {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}
.stage:not(:last-child)::after {
  content: "";
  position: absolute;
  top: 26rpx;
  left: calc(50% + 34rpx);
  width: calc(100% - 68rpx);
  height: 2rpx;
  background: linear-gradient(90deg, var(--ink-3), var(--line));
}
.stage__dot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 54rpx;
  height: 54rpx;
  border-radius: 50%;
  background: var(--brand-soft);
  color: var(--brand-deep);
  font-size: 24rpx;
  font-weight: 600;
}
.stage:last-child .stage__dot {
  background: var(--brand);
  color: #fff;
}
.stage__name {
  color: var(--ink-2);
  font-size: 22rpx;
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
/* 详情 hero 已用元素色实底，关闭全局 .hero 的蓝紫底与点阵装饰（规范 01：局部 hero、少装饰） */
.qd .hero::after {
  content: none;
}
/* ===== 元素色实底 hero：左上高光 + 右下暗角，浅色亮丽 / 深色压暗，白字对比稳定 ===== */
.qd .hero--element {
  background-color: var(--ele-color, #5a6480);
  background-image:
    radial-gradient(120% 90% at 16% 6%, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0) 48%),
    linear-gradient(150deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0) 40%, rgba(0, 0, 0, 0.26) 100%);
}
.qd.theme-dark .hero--element {
  background-color: var(--ele-color, #3a445c);
  background-image:
    radial-gradient(120% 90% at 16% 6%, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0) 46%),
    linear-gradient(150deg, rgba(0, 0, 0, 0.06) 0%, rgba(0, 0, 0, 0.14) 42%, rgba(0, 0, 0, 0.5) 100%);
}
/* 大图光晕衬底：透明立绘从实底里浮出来 */
/* 效果图对齐：全幅立绘 hero（图即背景 + 底部遮罩，白字压图）；元素色实底作为无图/加载兜底 */
.qd .head.hero--element {
  position: relative;
  height: 560rpx;
}
.qd .head__bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0.55;
  filter: blur(10px);
  transform: scale(1.08);
}
.qd .head__fg {
  position: absolute;
  right: 6rpx;
  bottom: 0;
  width: 82%;
  height: 100%;
}
.qd .head__glyph {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.72);
  font-size: 160rpx;
  font-weight: 800;
}
.qd .head__scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(10, 14, 38, 0.1) 30%, rgba(10, 14, 38, 0.75) 100%);
}
.qd.theme-dark .head__scrim {
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.18) 30%, rgba(0, 0, 0, 0.78) 100%);
}
.qd .hero__inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20rpx;
  box-sizing: border-box;
}
.qd .head__top {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 16rpx;
  min-width: 0;
}
/* 元素徽章：Ghost 线框（透明底 + 半透明白边框），字号图标略小降低存在感 */
.qd .head__element {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5rpx;
  max-width: 100%;
  height: 48rpx;
  padding: 0 16rpx;
  box-sizing: border-box;
  border-radius: 999rpx;
  /* 更小更轻：极淡白底、无边框；margin-right:auto 与右侧按钮拉开左右分组 */
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 18rpx;
  font-weight: 600;
  white-space: nowrap;
  margin-right: auto;
}
.qd .head__element-icon {
  width: 22rpx;
  height: 22rpx;
}
.qd .head__actions {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex: none;
}
/* 双药丸 Ghost 线框：透明底 + 半透明白边框 + 轻模糊，on 态仅换底色微透明与图标/文字颜色 */
.qd .head__pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  min-width: 176rpx;
  height: 52rpx;
  padding: 0 24rpx;
  box-sizing: border-box;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(4px);
  color: #fff;
  font-size: 22rpx;
  font-weight: 600;
  white-space: nowrap;
}
.qd .head__pill-star {
  position: relative;
  flex: none;
  width: 26rpx;
  height: 26rpx;
  background: rgba(255, 255, 255, 0.9);
  clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
}
/* 空心星：内嵌同形暗星缩小形成描边观感 */
.qd .head__pill-star-hole {
  position: absolute;
  inset: 0;
  background: rgba(16, 22, 33, 0.85);
  clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
  transform: scale(0.58);
}
.qd .head__pill-plus {
  position: relative;
  flex: none;
  width: 24rpx;
  height: 24rpx;
}

.qd .head__pill-plus::before,
.qd .head__pill-plus::after {
  content: "";
  position: absolute;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 2rpx;
}

.qd .head__pill-plus::before {
  left: 50%;
  top: 0;
  bottom: 0;
  width: 3rpx;
  transform: translateX(-50%);
}

.qd .head__pill-plus::after {
  top: 50%;
  left: 0;
  right: 0;
  height: 3rpx;
  transform: translateY(-50%);
}

.qd .head__pill-check {
  flex: none;
  width: 15px;
  height: 8px;
  border-left: 2.5px solid #4caf50;
  border-bottom: 2.5px solid #4caf50;
  transform: rotate(-45deg);
}
/* on 态：极微弱的主题色透明底（不压主图），图标实心 + 文字同色 */
.qd .head__pill--fav-on {
  /* 暖黄降饱和：#E6B800，文字/边框同色，底为极微弱黄 */
  background: rgba(230, 184, 0, 0.1);
  border-color: rgba(230, 184, 0, 0.5);
  color: #e6b800;
}

.qd .head__pill--fav-on .head__pill-star {
  background: #e6b800;
}

.qd .head__pill--fav-on .head__pill-star-hole {
  display: none;
}

.qd .head__pill--collect.head__pill--on {
  /* 柔和绿降明度：底/边 10%-50% 绿，对勾同色 */
  background: rgba(76, 175, 80, 0.1);
  border-color: rgba(76, 175, 80, 0.5);
}

.qd .head__pill--collect.head__pill--on .head__pill-check {
  border-left-color: #66bb6a;
  border-bottom-color: #66bb6a;
}
.qd .banner__meta {
  margin-top: auto;
  padding-bottom: 4rpx;
}
.qd .head__meta-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12rpx;
}
.qd .head__name {
  min-width: 0;
  text-shadow: 0 2rpx 10rpx rgba(10, 14, 38, 0.55);
}
.qd .head__name > text:first-child {
  font-size: 34rpx;
  font-weight: 800;
}
.qd .head__no {
  background: rgba(10, 14, 38, 0.38);
  border-color: transparent;
  backdrop-filter: blur(4px);
}
.qd .head__chip {
  background: rgba(10, 14, 38, 0.38);
  backdrop-filter: blur(4px);
}
.qd .head__zoom {
  flex: none;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(10, 14, 38, 0.45);
  color: #fff;
  font-size: 20rpx;
  backdrop-filter: blur(6rpx);
  white-space: nowrap;
}
.gene-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.gene-list .gene-desc {
  align-items: flex-start;
  padding: 18rpx;
  border: 1rpx solid var(--line);
  border-radius: 16rpx;
  background: var(--soft);
}
.gene-list .gene-desc--innate {
  border-color: #d69b28;
  background: var(--gold-soft);
}
.gene-desc__flag {
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  background: var(--brand-soft);
  color: var(--brand-deep);
  font-size: 20rpx;
  font-weight: 600;
}
.gene-desc__flag--innate {
  background: #e2a72f;
  color: #392700;
  font-weight: 700;
}
.gene-list .gene-desc__name {
  font-size: 26rpx;
}
.gene-list .gene-desc__text {
  margin-top: 8rpx;
  font-size: 23rpx;
}
</style>
