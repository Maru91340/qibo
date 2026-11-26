// 由 scripts/build-gacha-char-info.mjs 生成，勿手改。
// 源：src/data/generated/catalogs.json → types.charWiki.items（BWIKI，抓取 2026-11-22T14:32:49.078Z）。
// role = 定位（辅助 / 猛攻 / 生存 …），elements = 元素（首个为主元素），rarity = 星级数字。
export const CHAR_INFO = {
  "佩佩": { role: "输出", elements: ["地", "光"], rarity: 5, summary: "佩佩来帮你了" },
  "兰香子": { role: "输出", elements: ["暗", "冰"], rarity: 5, summary: "那个，我是兰香子，会一点符箓术…至少，吓唬吓唬人…肯定没问题" },
  "卡塔露": { role: "坦克", elements: ["地", "火"], rarity: 4, summary: "伟大的祖灵们，如果星临者可以选择我…欸" },
  "夏儿": { role: "输出", elements: ["水", "光"], rarity: 5, summary: "赶上了…" },
  "姬瑟贝露": { role: "输出", elements: ["雷", "暗"], rarity: 5, summary: "为您扫清障碍是我的职责" },
  "寒悠悠": { role: "辅助", elements: ["火", "木"], rarity: 4, summary: "我叫寒悠悠…嘘…不要这么大声啦" },
  "忒拉拉": { role: "输出", elements: ["火", "风"], rarity: 4, summary: "呀" },
  "星临者": { role: "辅助", elements: ["无"], rarity: 4, summary: "暂无简介，详见 BWIKI 页面" },
  "末音": { role: "输出", elements: ["雷", "风"], rarity: 5, summary: "阿瓦利安御座，哈库茵家族继承人，「聆剑之心」末音·哈库茵代表家族向你致以问候，在终焉之日来临" },
  "枫糖": { role: "辅助", elements: ["光", "木"], rarity: 4, summary: "我是枫糖，请多多指教" },
  "法兰塔": { role: "输出", elements: ["风", "雷"], rarity: 5, summary: "无需多言，需要力量的话，由我来成为你的羽翼" },
  "洛卿": { role: "待核实", elements: ["水"], rarity: 5, summary: "看你那副表情，似乎有些许啊…所谓云从龙，当我现身的时候，有些天气变化是很正常的现象，不要大惊" },
  "涂山小玉": { role: "输出", elements: ["风", "光"], rarity: 5, summary: "缘分其实是很不讲道理的，有时候需要你不顾一切牢牢抓紧，但有时候它又会因为你抓得太紧而悄悄溜走" },
  "源 千代": { role: "爆发", elements: ["暗"], rarity: 5, summary: "这场相遇虽不在计划之中，但也是必然的…你我目标一致的前提下，此身此刃，会与你相伴同行" },
  "璐璐卡": { role: "辅助", elements: ["水", "冰"], rarity: 5, summary: "那个…初次见面，你好，我是夏露露村的璐璐卡" },
  "米砂": { role: "辅助", elements: ["木", "风"], rarity: 5, summary: "叶片上的脉络预示了你我的相逢" },
  "米蒂": { role: "待核实", elements: ["雷"], rarity: 4, summary: "哼，你就好好看着未来的翼人战士有多强吧" },
  "红宝石": { role: "输出", elements: ["火", "雷"], rarity: 5, summary: "「焚尽罪恶、灼烧烈火，此战将以赤红的胜利告终，破开黑暗吧——Das feuer des eh" },
  "艾妮丝": { role: "输出", elements: ["光", "地"], rarity: 4, summary: "我是艾妮丝，来自卡尔侬疗养院，随时为您提供护理服务" },
  "芃芃": { role: "输出", elements: ["火", "地"], rarity: 4, summary: "哟，你是功夫初学者吗" },
  "莉莉": { role: "坦克", elements: ["风"], rarity: 4, summary: "我是莉莉，目前还只是一名见习骑士" },
  "西芙莉雅": { role: "输出", elements: ["风", "木"], rarity: 4, summary: "我的名字是西芙莉雅" },
  "诺诺": { role: "输出", elements: ["地"], rarity: 4, summary: "已经…打起精神来了" },
  "阿比": { role: "输出", elements: ["水", "木"], rarity: 5, summary: "阿比，肚子饿了" }
};

/** 取某角色的定位与元素；查不到返回空对象，由调用方降级不显示。 */
export function charInfoOf(name) {
  return CHAR_INFO[name] || null;
}
