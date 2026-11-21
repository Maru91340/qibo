import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const projectPath = join(projectRoot, 'dist/cloudfunctions');
const mode = process.argv[2] || 'all';
const groups = { all: ['getCatalog', 'seedCatalog'], read: ['getCatalog'], seed: ['seedCatalog'] };
const functions = groups[mode];
if (!functions) throw new Error(`未知部署模式：${mode}（可选 all / read / seed）`);

const cliCandidates = [
  process.env.WECHAT_DEVTOOLS_CLI,
  'D:\\app\\Tencent\\微信web开发者工具\\cli.bat',
  'D:\\app\\微信web开发者工具\\cli.bat',
  'C:\\Program Files\\Tencent\\微信web开发者工具\\cli.bat',
  'C:\\Program Files (x86)\\Tencent\\微信web开发者工具\\cli.bat'
].filter(Boolean);
const cli = cliCandidates.find((candidate) => existsSync(candidate));
if (!cli) throw new Error(`未找到微信开发者工具 CLI，已尝试：${cliCandidates.join(' | ')}`);
if (!existsSync(projectPath)) throw new Error(`未找到云函数产物：${projectPath}，请先执行 npm run build:mp-weixin`);

const configured = (readFileSync(join(projectRoot, 'src/config/cloud.js'), 'utf8').match(/CLOUD_ENV_ID\s*=\s*'([^']*)'/) || [])[1] || '';
const envId = process.env.QBXZS_CLOUD_ENV || configured;
const resourceAppId = process.env.QBXZS_RESOURCE_APPID
  || (readFileSync(join(projectRoot, 'src/config/cloud.js'), 'utf8').match(/CLOUD_RESOURCE_APP_ID\s*=\s*'([^']*)'/) || [])[1]
  || '';
if (!envId || envId.startsWith('REPLACE_WITH')) {
  throw new Error('云开发环境 ID 未配置：请填写 src/config/cloud.js 的 CLOUD_ENV_ID，或设置环境变量 QBXZS_CLOUD_ENV');
}
if (!resourceAppId) {
  throw new Error('共享云资源方 AppID 未配置：请填写 CLOUD_RESOURCE_APP_ID，或设置 QBXZS_RESOURCE_APPID');
}

for (const name of functions) {
  console.log(`部署 ${name} -> ${envId}`);
  const functionPath = join(projectPath, 'cloudfunctions', name);
  const args = ['cloud', 'functions', 'deploy', '--env', envId, '--paths', functionPath, '--appid', resourceAppId, '--remote-npm-install'];
  const viaCmd = process.platform === 'win32' && /\.bat$/i.test(cli);
  const result = spawnSync(viaCmd ? process.env.ComSpec || 'cmd.exe' : cli, viaCmd ? ['/d', '/s', '/c', cli, ...args] : args, {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw result.error;
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  if (result.status !== 0 || /\[(?:error|错误)\]|IDE service port disabled|服务端口已关闭/i.test(output)) {
    if (/env\s+[^\s]+\s+not exists|ResourceNotFound\.Namespace|未找到指定的Namespace/i.test(output)) {
      throw new Error(`${name} 部署失败：云环境 ${envId} 对当前 AppID/登录账号不可见或不存在。请在开发者工具「云开发」中复制实际环境 ID，并确认当前微信号是该小程序的管理员或开发者`);
    }
    if (/IDE service port disabled|服务端口已关闭|ECONNREFUSED/i.test(output)) {
      throw new Error(`${name} 部署失败：请在微信开发者工具中开启「设置 → 安全设置 → 服务端口」后重试`);
    }
    throw new Error(`${name} 部署失败：微信开发者工具 CLI 返回错误，请查看上方原始日志`);
  }
}
console.log(`已部署 ${functions.join(', ')} 到 ${envId}`);
