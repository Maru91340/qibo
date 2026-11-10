// 4.8 / H10：当前唯一确认的公测事件（内容配置）。
// 活动变更只改这里；首页不再并列多个时期的测试 / 海外预测，历史信息处置见待确认 #28。
export const RELEASE_EVENT = {
  day: '2026-11-26',
  title: '11 月 26 日正式公测',
  scope: '国服',
  source: 'BWIKI 公测定档公告'
};

// 以北京时间（UTC+8）自然日判定，避免设备时区差异导致「公测当天」错位。
export function beijingDay(ms) {
  return new Date(ms + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

// 4.8 / H10：开始前 / 当天 / 开始后三态；到期不再钳制成永久「距公测 0 天」。
// 纯函数，便于静态核验脚本按指定时间戳实算三态，不依赖运行界面。
export function eventState(ms) {
  const today = beijingDay(ms);
  const phase = today < RELEASE_EVENT.day ? 'before' : today === RELEASE_EVENT.day ? 'today' : 'after';
  const start = Date.parse(`${RELEASE_EVENT.day}T00:00:00Z`);
  const daysBefore = Math.max(0, Math.round((start - Date.parse(`${today}T00:00:00Z`)) / 86400000));
  const desc = phase === 'before'
    ? `距公测 ${daysBefore} 天 · 以官方公告为准`
    : phase === 'today'
      ? '今日正式公测 · 以官方公告为准'
      : '公测已开启 · 以官方公告为准';
  return {
    phase,
    daysBefore,
    title: RELEASE_EVENT.title,
    tag: `${RELEASE_EVENT.scope} · 资料：${RELEASE_EVENT.source}`,
    desc
  };
}
