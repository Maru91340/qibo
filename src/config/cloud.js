export const CLOUD_RESOURCE_APP_ID = 'wx175a2a7772b2640c';
export const CLOUD_ENV_ID = 'cloud1-d7gx1tocd9762a9ba';
// 云存储图库前缀（fileID 目录级前缀，尾部带 /）：小程序端本地原图候选档使用 cloud:// 协议，
// 形如 cloud://<envId>.<bucket>/images/wiki/。控制台拖传后复制任一文件的 fileID 截到目录段填入；
// 未配置（含 REPLACE_WITH）时小程序端自动回退热链，不影响构建与发布。
export const CLOUD_STORAGE_BASE = 'cloud://cloud1-d7gx1tocd9762a9ba.636c-cloud1-d7gx1tocd9762a9ba-1485155108/images/wiki/';
// 奇波列表异常补图目录：仅覆盖经人工核图并手动上传的 11 个 CBT3 头像；
// 与 images/wiki 同桶不同目录，不应拼到 CLOUD_STORAGE_BASE 后面。
export const CLOUD_QIBO_CBT3_BASE = 'cloud://cloud1-d7gx1tocd9762a9ba.636c-cloud1-d7gx1tocd9762a9ba-1485155108/images/qibo-cbt3/';
// 详情页杂图目录（技能/资质/灵子等 7 分类，assets/cloud-batch-detail 上传产物）：
// 微信端 combatIcon/soulIcon/角色技能图经 cloudDetailAsset() 转为该目录下的 cloud://。
export const CLOUD_DETAIL_ASSETS_BASE = 'cloud://cloud1-d7gx1tocd9762a9ba.636c-cloud1-d7gx1tocd9762a9ba-1485155108/images/detail-assets/';
export const CATALOG_FUNCTIONS = {
  read: 'getCatalog'
};
