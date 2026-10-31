import { CLOUD_ENV_ID, CATALOG_FUNCTIONS } from '../config/cloud.js';

let initialized = false;

export function isCloudAvailable() {
  // #ifdef MP-WEIXIN
  return typeof wx !== 'undefined' && Boolean(wx.cloud);
  // #endif
  // #ifndef MP-WEIXIN
  return false;
  // #endif
}

export function initCloud() {
  if (initialized) return true;
  if (!isCloudAvailable()) return false;
  // #ifdef MP-WEIXIN
  if (!CLOUD_ENV_ID || CLOUD_ENV_ID.startsWith('REPLACE_WITH')) return false;
  wx.cloud.init({ env: CLOUD_ENV_ID, traceUser: true });
  initialized = true;
  return true;
  // #endif
  return false;
}

export function callCloudFunction(name, data = {}, timeout = 20000) {
  return new Promise((resolve, reject) => {
    if (!initCloud()) {
      reject(new Error('云端内容服务未配置，使用内置资料'));
      return;
    }
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
    wx.cloud.callFunction({
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
        if (/FUNCTION_NOT_FOUND|-501000|could not be found/i.test(message)) {
          finish(new Error(`云函数 ${CATALOG_FUNCTIONS.read} 尚未部署，使用内置资料`));
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
