/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product } from './types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'sam-01',
    name: '山姆美式奥尔良烤鸡',
    category: 'deli',
    price: 39.8,
    originalPrice: 45.0,
    image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&q=80&w=600',
    description: '山姆镇店之宝！热气腾腾、皮脆肉嫩、汁水充盈。精选优质整鸡，配成经典奥尔良美味，趁热吃超级过瘾。',
    stock: 12,
    limit: 2,
    badge: '人气爆款'
  },
  {
    id: 'sam-02',
    name: '原味双色瑞士卷 (16片装)',
    category: 'bakery',
    price: 68.0,
    originalPrice: 75.0,
    image: 'https://images.unsplash.com/photo-1600431521340-491eca880813?auto=format&fit=crop&q=80&w=600',
    description: '风靡全网的代购必入！精选进口鲜奶油与松软蛋糕坯，口感丝滑细腻，甜而不腻，下午茶及早餐不二之选。',
    stock: 8,
    limit: 1,
    badge: '限时特产'
  },
  {
    id: 'sam-03',
    name: '经典芝士肉酱牛肉卷 (3只装)',
    category: 'deli',
    price: 59.9,
    image: 'https://images.unsplash.com/photo-1618083707368-b3823daa2726?auto=format&fit=crop&q=80&w=600',
    description: '超人气熟食！香浓马苏里拉干酪包裹滑嫩牛肉片与浓郁番茄肉酱，酥脆饼皮微波或空气炸锅加热5分钟即享拉丝拉手。',
    stock: 15,
    limit: 3,
    badge: '常青爆款'
  },
  {
    id: 'sam-04',
    name: '金枕头榴莲千层蛋糕 (6英寸)',
    category: 'bakery',
    price: 128.0,
    originalPrice: 139.0,
    image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&q=80&w=600',
    description: '真材实料！铺设厚实饱满的苏丹王或金枕头榴莲果肉，层层薄如蝉翼的班杰饼配以轻盈动物鲜奶油，入口即化，榴莲控狂喜。',
    stock: 5,
    limit: 1,
    badge: '榴莲狂欢'
  },
  {
    id: 'sam-05',
    name: 'Member’s Mark 小青柠汁饮料 (280ml*8)',
    category: 'drinks',
    price: 49.9,
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=600',
    description: '清爽解腻神器！精选菲律宾进口新鲜小青柠，NFC非浓缩还原压榨，100%纯果汁黄金比例，酸甜解渴，冰镇后风味更佳。',
    stock: 22,
    limit: 4,
    badge: '解腻神器'
  },
  {
    id: 'sam-06',
    name: 'Member’s Mark 黑糖麻薯面包 (24个)',
    category: 'bakery',
    price: 39.8,
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=600',
    description: 'Q弹有嚼劲！表皮撒有香脆黑芝麻，软韧麻薯内里带有淡淡麦芽微甜，分量扎实，是全家老少皆宜的营养小糕点。',
    stock: 18,
    limit: 2,
    badge: '口碑常客'
  },
  {
    id: 'sam-07',
    name: '澳洲安格斯西冷牛肉 (精选级/1kg装)',
    category: 'fresh',
    price: 188.0,
    originalPrice: 199.0,
    image: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&q=80&w=600',
    description: '进口品质！草饲安格斯，雪花红肉比例极佳，肉质紧实多汁，自带天然牛油香气，适合香煎、炙烤，居家享受星级牛排。',
    stock: 6,
    limit: 2,
    badge: '生鲜尖货'
  },
  {
    id: 'sam-08',
    name: '鲜美香甜红颜草莓 (500g礼盒装)',
    category: 'fresh',
    price: 49.9,
    image: 'https://images.unsplash.com/photo-1518635017498-87f514b751ba?auto=format&fit=crop&q=80&w=600',
    description: '颗颗精选！人工早晨采摘直达，果实饱满红润，香甜浓郁多汁，硬度适中。不催熟不催大，给您最纯粹的自然芬芳。',
    stock: 10,
    limit: 2,
    badge: '产地直供'
  }
];
