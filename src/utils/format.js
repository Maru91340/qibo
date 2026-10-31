export function hexToRgba(hex, alpha) {
  const value = String(hex || '').replace('#', '');
  if (value.length !== 6) return hex;
  const num = parseInt(value, 16);
  return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
}

const pad = (num) => (num < 10 ? `0${num}` : String(num));

export function formatTime(ts) {
  if (!ts) return '';
  const date = new Date(ts);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function tint(hex) {
  return hexToRgba(hex, 0.09);
}

export function glow(hex) {
  return hexToRgba(hex, 0.14);
}
