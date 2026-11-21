import { spawnSync } from 'node:child_process';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const targets = [
  { label: '小程序工程', directory: projectRoot, blockCritical: true },
  { label: '云函数 getCatalog', directory: join(projectRoot, 'cloudfunctions/getCatalog'), blockCritical: process.env.QBXZS_ALLOW_CLOUD_CRITICAL !== '1' },
  { label: '云函数 seedCatalog', directory: join(projectRoot, 'cloudfunctions/seedCatalog'), blockCritical: process.env.QBXZS_ALLOW_CLOUD_CRITICAL !== '1' }
];
const blocking = [];

for (const target of targets) {
  const result = spawnSync('npm audit --omit=dev --json', {
    cwd: target.directory,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    shell: true
  });
  if (result.error) throw result.error;
  let report;
  try {
    report = JSON.parse(result.stdout || '');
  } catch (error) {
    const detail = String(result.stderr || '').trim().slice(0, 500);
    throw new Error(`${target.label} 的 npm audit 未返回有效 JSON：${error.message}${detail ? `；${detail}` : ''}`);
  }
  if (!report.metadata?.vulnerabilities) {
    throw new Error(`${target.label} 的 npm audit 缺少 vulnerabilities 汇总`);
  }
  const vulnerabilities = report.metadata.vulnerabilities;
  console.log(`${target.label}（${relative(projectRoot, target.directory) || '.'}）：critical ${vulnerabilities.critical || 0} / high ${vulnerabilities.high || 0} / moderate ${vulnerabilities.moderate || 0} / low ${vulnerabilities.low || 0}`);
  if ((vulnerabilities.critical || 0) > 0 && target.blockCritical) {
    blocking.push(`${target.label} 有 ${vulnerabilities.critical} 个 critical 漏洞`);
  }
}

if (blocking.length) {
  blocking.forEach((message) => console.error(`✖ ${message}`));
  console.error('仅在已形成书面风险接受且不用于正式发布时，可临时设置 QBXZS_ALLOW_CLOUD_CRITICAL=1 查看其余门禁。');
  process.exit(1);
}
console.log('依赖审计门禁通过（high/moderate 仍需记录并排期处理）');
