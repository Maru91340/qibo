import { CLOUD_ENV_ID, CLOUD_RESOURCE_APP_ID } from '../config/cloud.js';

let cloud = null;
let initPromise = null;
const cloudFileUrlCache = new Map();
const cloudFileUrlPending = new Map();
const cloudFileUrlQueue = [];
let cloudFileUrlTimer = null;

export function isCloudAvailable() {
  // #ifdef MP-WEIXIN
  return typeof wx !== 'undefined' && Boolean(wx.cloud);
  // #endif
  // #ifndef MP-WEIXIN
  return false;
  // #endif
}

export function initCloud() {
  if (initPromise) return initPromise;
  if (!isCloudAvailable()) return Promise.resolve(false);
  // #ifdef MP-WEIXIN
  if (!CLOUD_RESOURCE_APP_ID || !CLOUD_ENV_ID || CLOUD_ENV_ID.startsWith('REPLACE_WITH')) return Promise.resolve(false);
  cloud = new wx.cloud.Cloud({
    resourceAppid: CLOUD_RESOURCE_APP_ID,
    resourceEnv: CLOUD_ENV_ID
  });
  initPromise = Promise.resolve(cloud.init())
    .then(() => true)
    .catch((error) => {
      cloud = null;
      initPromise = null;
      throw error;
    });
  return initPromise;
  // #endif
  return Promise.resolve(false);
}

// 分批把云存储 fileID 换成可由跨应用小程序直接加载的临时 HTTPS 地址。
async function flushCloudFileUrlBatch() {
  cloudFileUrlTimer = null;
  const fileList = cloudFileUrlQueue.splice(0, 50);
  if (!fileList.length) return;
  let rows = [];
  try {
    if (!await initCloud()) throw new Error('云开发未初始化');
    const response = await new Promise((resolve, reject) => {
      cloud.getTempFileURL({ fileList, success: resolve, fail: reject });
    });
    rows = (response && response.fileList) || [];
  } catch (error) {
    rows = [];
  }
  const resultMap = new Map(rows.map((item) => [item.fileID, item.tempFileURL || '']));
  fileList.forEach((fileID) => {
    const url = resultMap.get(fileID) || '';
    if (url) cloudFileUrlCache.set(fileID, url);
    const pending = cloudFileUrlPending.get(fileID);
    cloudFileUrlPending.delete(fileID);
    if (pending) pending.resolve(url);
  });
  if (cloudFileUrlQueue.length) scheduleCloudFileUrlBatch();
}

// 合并同一轮渲染产生的 fileID 请求，避免列表逐张调用云 API。
function scheduleCloudFileUrlBatch() {
  if (cloudFileUrlTimer) return;
  cloudFileUrlTimer = setTimeout(flushCloudFileUrlBatch, 0);
}

// 解析单个云存储 fileID；同一地址在当前小程序会话中复用结果。
export function resolveCloudFileURL(fileID) {
  const value = String(fileID || '');
  if (!value.startsWith('cloud://')) return Promise.resolve(value);
  if (cloudFileUrlCache.has(value)) return Promise.resolve(cloudFileUrlCache.get(value));
  if (cloudFileUrlPending.has(value)) return cloudFileUrlPending.get(value).promise;
  let resolvePending;
  const promise = new Promise((resolve) => { resolvePending = resolve; });
  cloudFileUrlPending.set(value, { promise, resolve: resolvePending });
  cloudFileUrlQueue.push(value);
  scheduleCloudFileUrlBatch();
  return promise;
}

export async function callCloudFunction(name, data = {}, timeout = 20000) {
  if (!await initCloud()) throw new Error('云端内容服务未配置，使用内置资料');
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(value);
    };
    const timer = setTimeout(() => finish(new Error('云端内容请求超时')), timeout);
    // #ifdef MP-WEIXIN
    cloud.callFunction({
      name,
      data,
      success(response) {
        const result = response && response.result;
        if (!result || result.code !== 0) {
          finish(new Error((result && result.message) || '云端内容响应异常'));
          return;
        }
        finish(null, result.data);
      },
      fail(error) {
        const message = (error && error.errMsg) || '云端内容请求失败';
        // -501000 是通用的「云函数执行失败」：超时、函数抛错都会返回它，
        // 只有明确报「函数不存在」才提示未部署，避免把超时误判成未部署。
        if (/FUNCTION_NOT_FOUND|could not be found|not\s*found/i.test(message) && !/timed?\s*out|timeout/i.test(message)) {
          finish(new Error(`云函数 ${name} 尚未部署，使用内置资料`));
          return;
        }
        if (/timed?\s*out|timeout|433/i.test(message)) {
          finish(new Error('云函数响应超时（可能是冷启动或超时上限过低），请重试或调高函数超时时间'));
          return;
        }
        finish(new Error(message));
      }
    });
    // #endif
    // #ifndef MP-WEIXIN
    finish(new Error('当前平台不支持微信云开发'));
    // #endif
  });
}
