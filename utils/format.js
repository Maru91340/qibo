function hexToRgba(hex, alpha) {
  const value = String(hex || '').replace('#', '');
  if (value.length !== 6) return hex;
  const num = parseInt(value, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function pad(num) {
  return num < 10 ? `0${num}` : String(num);
}

function formatTime(ts) {
  if (!ts) return '';
  const date = new Date(ts);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function tint(hex) {
  return hexToRgba(hex, 0.09);
}

function glow(hex) {
  return hexToRgba(hex, 0.14);
}

module.exports = { hexToRgba, formatTime, tint, glow };
