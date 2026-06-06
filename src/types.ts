/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  image: string;
  description: string;
  stock: number;
  limit: number; // Purchase limit per person, 0 means no limit
  badge?: string; // e.g. "人气爆款", "新品首发", "限时打折"
  sort_order: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  phone: string;
  items: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
  }[];
  totalPrice: number;
  proxyFee: number;
  grandTotal: number;
  createdAt: string;
  notes?: string;
  address?: string;
  deliveryMethod: 'express' | 'pickup';
  location?: string; // 自提站点/区域
  status: 'pending' | 'completed' | 'cancelled';
}

/** 预设自提站点列表 */
export const PICKUP_LOCATIONS = [
  '万象城站点',
  '南山站点',
  '福田站点',
  '龙岗站点',
  '宝安站点',
  '罗湖站点',
  '龙华站点',
  '光明站点',
] as const;

export interface Category {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
}


