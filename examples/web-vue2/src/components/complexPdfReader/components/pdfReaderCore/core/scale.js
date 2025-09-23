// 缩放相关常量与工具函数（仅数值模式）
export const DEFAULT_SCALE = 1.0;
export const DEFAULT_SCALE_DELTA = 1.1; // 乘法步进
export const MIN_SCALE = 0.1;
export const MAX_SCALE = 10.0;

export function clampScale(value) {
  const v = Number(value);
  if (!isFinite(v)) return DEFAULT_SCALE;
  return Math.min(Math.max(v, MIN_SCALE), MAX_SCALE);
}

export function round2(value) {
  return Math.round(value * 100) / 100;
}
