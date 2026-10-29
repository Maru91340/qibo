const { sections } = require('./data/meta');
const qiboData = require('./data/qibo');
const characterData = require('./data/character');

function search(keyword) {
  const kw = (keyword || '').trim().toLowerCase();
  if (!kw) return { groups: [], total: 0 };
  const hit = (text) => String(text).toLowerCase().indexOf(kw) >= 0;

  const characters = characterData.characters.filter(
    (item) => hit(item.name) || hit(item.title) || hit(item.desc) || hit(item.role)
  );
  const qibos = qiboData.qibos.filter(
    (item) => hit(item.name) || hit(item.desc) || hit(item.habitat) || hit(item.skills.join(' '))
  );
  const pages = sections.filter((item) => hit(item.title) || hit(item.desc));

  const groups = [];
  if (characters.length) {
    groups.push({
      title: '角色',
      items: characters.map((item) => ({
        id: item.id,
        name: item.name,
        desc: `${item.title} · ${item.role}`,
        icon: 'usergroup',
        path: `/pages/character/detail?id=${item.id}`
      }))
    });
  }
  if (qibos.length) {
    groups.push({
      title: '奇波',
      items: qibos.map((item) => ({
        id: item.id,
        name: item.name,
        desc: `${item.kind} · ${item.habitat}`,
        icon: 'smile',
        path: `/pages/qibo/detail?id=${item.id}`
      }))
    });
  }
  if (pages.length) {
    groups.push({
      title: '板块',
      items: pages.map((item) => ({ id: item.key, name: item.title, desc: item.desc, icon: item.icon, path: item.path }))
    });
  }

  return { groups, total: characters.length + qibos.length + pages.length };
}

module.exports = { search };
