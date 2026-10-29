const elementData = require('../../utils/data/element');
const characterData = require('../../utils/data/character');
const qiboData = require('../../utils/data/qibo');
const teamUtil = require('../../utils/team');

const elements = elementData.elements;

function relationView(key) {
  const strong = (elementData.counters[key] || []).map((item) => elementData.elementMap[item]);
  const weak = (elementData.counteredBy[key] || []).map((item) => elementData.elementMap[item]);
  return {
    list: strong,
    ratio: 1.5,
    weakList: weak
  };
}

const initial = relationView(elements[0].key);

Page({
  data: {
    elements,
    matrixCols: elements,
    matrix: elementData.matrix(),
    current: elements[0].key,
    currentElement: elements[0],
    strong: { list: initial.list, ratio: initial.ratio },
    weak: { list: initial.weakList, ratio: 0.75 },
    team: { elements: [], strongCount: 0, weakCount: 0 },
    notice: elementData.notice
  },

  onShow() {
    this.computeTeam();
  },

  onPick(event) {
    const key = event.currentTarget.dataset.value;
    const view = relationView(key);
    this.setData({
      current: key,
      currentElement: elementData.elementMap[key],
      strong: { list: view.list, ratio: view.ratio },
      weak: { list: view.weakList, ratio: 0.75 }
    });
    this.computeTeam();
  },

  computeTeam() {
    const team = teamUtil.load();
    const characterMap = characterData.characters.reduce((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
    const qiboMap = qiboData.qibos.reduce((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
    const summary = teamUtil.summarize(team, characterMap, qiboMap);
    let strongCount = 0;
    let weakCount = 0;
    summary.elements.forEach((element) => {
      const rel = elementData.relation(element.key, this.data.current);
      if (rel.key === 'strong') strongCount += 1;
      if (rel.key === 'weak') weakCount += 1;
    });
    this.setData({ team: { elements: summary.elements, strongCount, weakCount } });
  }
});
