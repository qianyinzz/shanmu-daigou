/** 代购跑腿费率 */
export const PROXY_FEE_RATE = 0.08;

/** 获取根据商品 ID 固定的随机销量 */
export function getSalesVolume(productId: string): number {
  let hash = 0;
  for (let i = 0; i < productId.length; i++) {
    hash = ((hash << 5) - hash) + productId.charCodeAt(i);
    hash |= 0;
  }
  return 100 + (Math.abs(hash) % 900);
}
