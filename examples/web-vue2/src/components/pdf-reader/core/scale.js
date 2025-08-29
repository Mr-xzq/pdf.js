// 简化版：统一缩放常量与计算函数，避免分散到多个文件
export const DEFAULT_SCALE_VALUE = 'auto';
export const DEFAULT_SCALE = 1.0;
export const DEFAULT_SCALE_DELTA = 1.1; // 乘法步进
export const MIN_SCALE = 0.1;
export const MAX_SCALE = 10.0;
export const MAX_AUTO_SCALE = 1.25; // 可按需使用

export function clampScale(value) {
  const v = Number(value);
  if (!isFinite(v)) return DEFAULT_SCALE;
  return Math.min(Math.max(v, MIN_SCALE), MAX_SCALE);
}

export function round2(value) {
  return Math.round(value * 100) / 100;
}

/**
 * 计算缩放：支持字符串模式与数值
 * 简化：不考虑旋转（若未来需要，可在外层交换 pageWidth/pageHeight 即可）
 */
export function computeScaleByValue(value, { width, height }, { pageWidth, pageHeight }) {
  const cw = width || 0;
  const ch = height || 0;
  const w = pageWidth || 0;
  const h = pageHeight || 0;
  if (typeof value === 'number') return clampScale(value);
  if (!w || !h || !cw || !ch) return 1.0;

  const scaleWidth = cw / w;
  const scaleHeight = ch / h;

  switch (value) {
    case 'page-actual':
      return 1.0;
    case 'page-width':
      return clampScale(scaleWidth);
    case 'page-height':
      return clampScale(scaleHeight);
    case 'page-fit':
      return clampScale(Math.min(scaleWidth, scaleHeight));
    case 'auto':
    default:
      return clampScale(Math.min(scaleWidth, MAX_AUTO_SCALE));
  }
}

