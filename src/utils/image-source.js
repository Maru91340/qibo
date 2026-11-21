// 图片候选链的统一失败降级（阶段 2.1 接入层配套，2.5 的「统一缺图回退」基础）。
// 同一 (条目, 用途) 的某个地址加载失败时切换到下一个候选；全部失败返回空串，
// 由页面渲染首字/元素徽章占位，图片区域尺寸固定，不会因失败改动布局。
import { ref } from 'vue';
import { imageSources } from '@/data/site-images.js';
import { resolveCloudFileURL } from '@/services/cloud.js';

export function useImageSources() {
  const stages = ref({});
  const cloudUrls = ref({});
  const cloudRequests = new Set();
  const keyOf = (id, role) => `${id}::${role}`;

  // 异步解析跨应用云存储地址；解析失败时继续使用候选链的下一档。
  function cloudSourceOf(source, item, role, stage) {
    if (!source.startsWith('cloud://')) return source;
    if (Object.prototype.hasOwnProperty.call(cloudUrls.value, source)) return cloudUrls.value[source];
    const requestKey = `${keyOf(item.id, role)}::${source}`;
    if (!cloudRequests.has(requestKey)) {
      cloudRequests.add(requestKey);
      resolveCloudFileURL(source).then((url) => {
        cloudRequests.delete(requestKey);
        if (url) {
          cloudUrls.value = Object.assign({}, cloudUrls.value, { [source]: url });
          return;
        }
        const key = keyOf(item.id, role);
        if ((stages.value[key] || 0) === stage) {
          stages.value = Object.assign({}, stages.value, { [key]: stage + 1 });
        }
      });
    }
    return '';
  }

  // 模板中调用：srcOf(item, 'charWiki', 'avatar', { widths: [240, 120] })
  function srcOf(item, type, role, options = {}) {
    if (!item) return '';
    const fallback = Object.prototype.hasOwnProperty.call(options, 'fallback') ? options.fallback : (item.icon || '');
    const list = imageSources(type, item, role, fallback, options);
    const stage = stages.value[keyOf(item.id, role)] || 0;
    return stage < list.length ? cloudSourceOf(list[stage], item, role, stage) : '';
  }

  // 图片 @error：切下一档；没有更多候选时 srcOf 返回空串，页面显示占位
  function onError(item, role) {
    if (!item) return;
    const key = keyOf(item.id, role);
    stages.value[key] = (stages.value[key] || 0) + 1;
  }

  // 切换详情页 id 或资料更新时清空失败状态，允许重新尝试（支持重试）
  function reset() {
    stages.value = {};
  }

  // 2.5：占位上的「重试」把该条目候选链回到第一档，网络恢复后可重新加载图片
  function retry(item, role) {
    if (!item) return;
    const key = keyOf(item.id, role);
    stages.value = Object.assign({}, stages.value, { [key]: 0 });
  }

  return { srcOf, onError, reset, retry };
}
