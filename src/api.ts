/**
 * API 客户端 - 封装所有与后端的数据交互
 */

// ========== Auth Token 管理 ==========
const TOKEN_KEY = 'sam_admin_token';

export function getAuthToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

// ========== 类型定义 ==========
export interface ProductRow {
  id: number;
  name: string;
  category: string;
  price: number;
  unit: string;
  stock: number;
  sort_order: number;
  purchase_limit: number;
  image_key: string | null;
  image_url: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItemRow {
  id: number;
  order_id: number;
  product_id: number;
  product_name: string;
  price: number;
  quantity: number;
}

export interface CategoryRow {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
}

export interface OrderRow {
  id: number;
  order_no: string;
  phone: string;
  location: string | null;
  delivery_method: string | null;
  status: 'pending' | 'completed' | 'cancelled';
  total_price: number;
  service_fee: number;
  grand_total: number;
  created_at: string;
  order_items: OrderItemRow[];
}

export interface AnalyticsData {
  summary: { totalOrders: number; totalRevenue: number; totalProducts: number; avgOrderValue: number };
  locationStats: Array<{ location: string; count: number; revenue: number }>;
  productRanking: Array<{ name: string; quantity: number; revenue: number }>;
  trend: Array<{ date: string; count: number }>;
}

// ========== 通用请求函数 ==========
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(url, {
    headers,
    ...options,
  });
  const json = await res.json() as { success?: boolean; data?: T; error?: string };
  if (!res.ok || json.success === false) {
    throw new Error(json.error || `请求失败: ${res.status}`);
  }
  return json.data as T;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

async function requestPaginated<T>(url: string): Promise<PaginatedResult<T>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  const json = await res.json() as { success?: boolean; data?: T[]; total?: number; page?: number; pageSize?: number; error?: string };
  if (!res.ok || json.success === false) {
    throw new Error(json.error || `请求失败: ${res.status}`);
  }
  return { data: json.data || [], total: json.total ?? 0, page: json.page ?? 1, pageSize: json.pageSize ?? 50 };
}

// ========== 认证 API ==========
export async function login(password: string): Promise<string> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const json = await res.json() as { success?: boolean; data?: { token: string }; error?: string };
  if (!res.ok || json.success === false) {
    throw new Error(json.error || '登录失败');
  }
  return json.data!.token;
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<string> {
  const res = await fetch('/api/auth/password', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`,
    },
    body: JSON.stringify({ oldPassword, newPassword }),
  });
  const json = await res.json() as { success?: boolean; data?: { token: string }; error?: string };
  if (!res.ok || json.success === false) {
    throw new Error(json.error || '修改密码失败');
  }
  return json.data!.token;
}

// ========== 商品 API ==========
export async function fetchProducts(page?: number, pageSize?: number): Promise<ProductRow[]> {
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (pageSize) params.set('pageSize', String(pageSize));
  else params.set('pageSize', '200'); // 默认取足够多
  const qs = params.toString();
  return request<ProductRow[]>(`/api/products?${qs}`);
}

export async function fetchProductsPaginated(page?: number, pageSize?: number): Promise<PaginatedResult<ProductRow>> {
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (pageSize) params.set('pageSize', String(pageSize));
  else params.set('pageSize', '50');
  const qs = params.toString();
  return requestPaginated<ProductRow>(`/api/products?${qs}`);
}

export async function fetchProductStock(id: number): Promise<{ id: number; name: string; stock: number }> {
  return request<{ id: number; name: string; stock: number }>(`/api/products/${id}/stock`);
}

export async function createProduct(product: Omit<ProductRow, 'id' | 'created_at' | 'updated_at' | 'image_url' | 'sort_order'>): Promise<ProductRow> {
  return request<ProductRow>('/api/products', {
    method: 'POST',
    body: JSON.stringify(product),
  });
}

export async function updateProduct(id: number, updates: Partial<ProductRow>): Promise<ProductRow> {
  return request<ProductRow>(`/api/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteProduct(id: number): Promise<void> {
  await request<void>(`/api/products/${id}`, { method: 'DELETE' });
}

export async function uploadImage(file: File): Promise<{ key: string; url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const headers: Record<string, string> = {};
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch('/api/upload', { method: 'POST', headers, body: formData });
  const json = await res.json() as { success: boolean; data: { key: string; url: string }; error?: string };
  if (!res.ok || json.success === false) {
    throw new Error(json.error || '上传失败');
  }
  return json.data;
}

export async function reorderProducts(items: Array<{ id: number; sort_order: number }>): Promise<void> {
  await request<void>('/api/products/reorder', {
    method: 'PUT',
    body: JSON.stringify({ items }),
  });
}

export async function seedProducts(products: Array<{ name: string; category: string; price: number; unit: string; stock: number; description?: string }>): Promise<{ count: number }> {
  return request<{ count: number }>('/api/products/seed', {
    method: 'POST',
    body: JSON.stringify({ products }),
  });
}

// ========== 订单 API ==========
export async function fetchOrders(filters?: { status?: string; location?: string; page?: number; pageSize?: number }): Promise<OrderRow[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.location) params.set('location', filters.location);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.pageSize) params.set('pageSize', String(filters.pageSize));
  else params.set('pageSize', '200'); // 默认取足够多
  const qs = params.toString();
  return request<OrderRow[]>(`/api/orders?${qs}`);
}

export async function createOrder(order: {
  phone: string;
  location?: string;
  delivery_method?: string;
  items: Array<{ product_id: number; product_name: string; price: number; quantity: number }>;
  total_price: number;
  service_fee: number;
  grand_total: number;
}): Promise<OrderRow> {
  return request<OrderRow>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(order),
  });
}

export async function updateOrderStatus(id: number, status: 'pending' | 'completed' | 'cancelled'): Promise<OrderRow> {
  return request<OrderRow>(`/api/orders/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

export async function fetchAnalytics(): Promise<AnalyticsData> {
  return request<AnalyticsData>('/api/orders/analytics');
}

export async function clearOrders(): Promise<void> {
  await request<void>('/api/orders', { method: 'DELETE' });
}

// ========== 分类 API ==========
export async function fetchCategories(): Promise<CategoryRow[]> {
  return request<CategoryRow[]>('/api/categories');
}

export async function createCategory(cat: { id: string; name: string; icon?: string; sort_order?: number }): Promise<CategoryRow> {
  return request<CategoryRow>('/api/categories', {
    method: 'POST',
    body: JSON.stringify(cat),
  });
}

export async function updateCategory(id: string, updates: { name?: string; icon?: string; sort_order?: number }): Promise<CategoryRow> {
  return request<CategoryRow>(`/api/categories/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteCategory(id: string): Promise<void> {
  await request<void>(`/api/categories/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function seedCategories(cats: Array<{ id: string; name: string; icon: string; sort_order: number }>): Promise<{ count: number }> {
  return request<{ count: number }>('/api/categories/seed', {
    method: 'POST',
    body: JSON.stringify({ categories: cats }),
  });
}
