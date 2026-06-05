// ABOUTME: API 路由 - 商品管理、订单管理、图片上传
import { Router, type Request, type Response } from 'express';
import { getSupabaseClient } from '../src/storage/database/supabase-client';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { verifyPassword, generateToken, changePassword, authMiddleware } from '../middleware/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'products';

// 登录频率限制: 每 IP 每分钟最多 5 次
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { success: false, error: '登录尝试过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 全局 API 限流: 每 IP 每秒最多 30 次
const apiLimiter = rateLimit({
  windowMs: 1000,
  max: 30,
  message: { success: false, error: '请求过于频繁' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use('/api', apiLimiter);

// ==================== 认证 API ====================

// 管理员登录（带频率限制）
router.post('/api/auth/login', loginLimiter, async (req: Request, res: Response) => {
  const { password } = req.body;
  if (!password || typeof password !== 'string') {
    res.status(400).json({ success: false, error: '请提供密码' });
    return;
  }
  const valid = await verifyPassword(password);
  if (!valid) {
    res.status(401).json({ success: false, error: '密码错误' });
    return;
  }
  const token = generateToken();
  res.json({ success: true, data: { token } });
});

// 修改管理员密码
router.put('/api/auth/password', authMiddleware, async (req: Request, res: Response) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword || typeof oldPassword !== 'string' || typeof newPassword !== 'string') {
    res.status(400).json({ success: false, error: '请提供原密码和新密码' });
    return;
  }
  const newToken = await changePassword(oldPassword, newPassword);
  if (!newToken) {
    res.status(400).json({ success: false, error: '原密码不正确或新密码少于4位' });
    return;
  }
  res.json({ success: true, data: { token: newToken } });
});

// ==================== 分类 API ====================

// 获取所有分类
router.get('/api/categories', async (_req: Request, res: Response) => {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) throw new Error(`查询分类失败: ${error.message}`);
    res.json({ success: true, data: data || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// 新增分类
router.post('/api/categories', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id, name, icon, sort_order } = req.body;
    if (!id || !name) {
      res.status(400).json({ success: false, error: '缺少必填字段(id, name)' });
      return;
    }
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('categories')
      .insert({ id: String(id), name, icon: icon || '📦', sort_order: Number(sort_order ?? 0) })
      .select()
      .single();
    if (error) throw new Error(`新增分类失败: ${error.message}`);
    res.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// 更新分类
router.put('/api/categories/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const allowedFields = ['name', 'icon', 'sort_order'];
    const raw = req.body as Record<string, unknown>;
    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (raw[key] !== undefined) {
        updates[key] = raw[key];
      }
    }
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ success: false, error: '无有效更新字段' });
      return;
    }
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(`更新分类失败: ${error.message}`);
    res.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// 删除分类
router.delete('/api/categories/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const client = getSupabaseClient();
    // 检查是否有商品引用此分类
    const { count } = await client
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('category', id);
    if (count && count > 0) {
      res.status(400).json({ success: false, error: `该分类下有 ${count} 件商品，无法删除` });
      return;
    }
    const { error } = await client
      .from('categories')
      .delete()
      .eq('id', id);
    if (error) throw new Error(`删除分类失败: ${error.message}`);
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// 初始化分类数据
router.post('/api/categories/seed', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { categories } = req.body;
    if (!Array.isArray(categories) || categories.length === 0) {
      res.status(400).json({ success: false, error: '分类数据为空' });
      return;
    }
    const client = getSupabaseClient();
    // 清空旧数据
    await client.from('categories').delete().neq('id', '');
    // 插入新数据
    const rows = categories.map((c: Record<string, unknown>) => ({
      id: String(c.id),
      name: String(c.name),
      icon: String(c.icon || '📦'),
      sort_order: Number(c.sort_order ?? 0),
    }));
    const { data, error } = await client.from('categories').insert(rows).select();
    if (error) throw new Error(`导入分类失败: ${error.message}`);
    res.json({ success: true, data, count: data?.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// ==================== 商品 API ====================

// 查询单个商品库存
router.get('/api/products/:id/stock', async (req: Request, res: Response) => {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('products')
      .select('id, name, stock')
      .eq('id', Number(req.params.id))
      .maybeSingle();
    if (error) throw new Error(`查询库存失败: ${error.message}`);
    if (!data) {
      res.status(404).json({ success: false, error: '商品不存在' });
      return;
    }
    res.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// 获取所有商品 (支持分页)
router.get('/api/products', async (req: Request, res: Response) => {
  try {
    const client = getSupabaseClient();
    
    // 每次获取商品列表前，静默触发一次每日自动恢复库存逻辑
    // 这个存储过程只会更新那些 purchase_limit > 0 且今天还没恢复过的商品
    await client.rpc('daily_restock').catch(e => console.error('每日库存重置失败(可能还未创建RPC):', e));

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;
    const offset = (page - 1) * pageSize;

    const query = client
      .from('products')
      .select('*', { count: 'exact' })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
      .range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;
    if (error) throw new Error(`查询商品失败: ${error.message}`);

    // 为有 image_key 的商品生成签名 URL
    const products = await Promise.all((data || []).map(async (p: Record<string, unknown>) => {
      if (p.image_key) {
        const key = p.image_key as string;
        // 如果 image_key 是完整 URL，直接使用
        if (key.startsWith('http://') || key.startsWith('https://')) {
          return { ...p, image_url: key };
        }
        try {
          const { data: signed } = await client.storage.from(BUCKET).createSignedUrl(key, 3600);
          return { ...p, image_url: signed?.signedUrl || null };
        } catch (signErr) {
          console.error('Signed URL generation failed:', signErr);
          return { ...p, image_url: null };
        }
      }
      return { ...p, image_url: null };
    }));

    res.json({ success: true, data: products, total: count ?? products.length, page, pageSize });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// 新增商品
router.post('/api/products', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { name, category, price, unit, stock, image_key, description, purchase_limit } = req.body;
    if (!name || !category || !price || !unit) {
      res.status(400).json({ success: false, error: '缺少必填字段' });
      return;
    }
    const client = getSupabaseClient();
    // 新商品默认排在最后：取当前最大 sort_order + 1
    const { data: maxRow } = await client
      .from('products')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextSort = ((maxRow?.sort_order as number) ?? 0) + 1;

    const { data, error } = await client
      .from('products')
      .insert({ name, category, price: Number(price), unit, stock: stock || 0, image_key: image_key || null, description: description || null, sort_order: nextSort, purchase_limit: Number(purchase_limit) || 0 })
      .select()
      .single();
    if (error) throw new Error(`新增商品失败: ${error.message}`);
    res.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// 批量调整商品排序
router.put('/api/products/reorder', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, error: '缺少排序数据' });
      return;
    }
    const client = getSupabaseClient();
    // 逐条更新 sort_order
    for (const item of items as Array<{ id: number; sort_order: number }>) {
      const { error } = await client
        .from('products')
        .update({ sort_order: Number(item.sort_order), updated_at: new Date().toISOString() })
        .eq('id', Number(item.id));
      if (error) throw new Error(`更新排序失败 (id=${item.id}): ${error.message}`);
    }
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// 更新商品
router.put('/api/products/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // 字段白名单，防止注入任意字段
    const allowedFields = ['name', 'category', 'price', 'unit', 'stock', 'image_key', 'description', 'sort_order', 'purchase_limit'];
    const raw = req.body as Record<string, unknown>;
    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (raw[key] !== undefined) {
        updates[key] = raw[key];
      }
    }
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ success: false, error: '无有效更新字段' });
      return;
    }
    if (updates.price !== undefined) updates.price = Number(updates.price);
    if (updates.stock !== undefined) updates.stock = Number(updates.stock);
    if (updates.sort_order !== undefined) updates.sort_order = Number(updates.sort_order);
    if (updates.purchase_limit !== undefined) updates.purchase_limit = Number(updates.purchase_limit);
    updates.updated_at = new Date().toISOString();

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('products')
      .update(updates)
      .eq('id', Number(id))
      .select()
      .single();
    if (error) throw new Error(`更新商品失败: ${error.message}`);
    res.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// 删除商品
router.delete('/api/products/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // 先查商品获取 image_key，删除后也要删除对象存储文件
    const client = getSupabaseClient();
    const { data: product, error: findError } = await client
      .from('products')
      .select('image_key')
      .eq('id', Number(id))
      .maybeSingle();
    if (findError) throw new Error(`查找商品失败: ${findError.message}`);

    const { error } = await client
      .from('products')
      .delete()
      .eq('id', Number(id));
    if (error) throw new Error(`删除商品失败: ${error.message}`);

    // 删除关联的对象存储图片
    if (product?.image_key) {
      try { await client.storage.from(BUCKET).remove([product.image_key as string]); } catch (cleanupErr) { console.error('Storage cleanup error:', cleanupErr); }
    }
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// 上传商品图片
router.post('/api/upload', authMiddleware, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, error: '未上传文件' });
      return;
    }
    const ext = file.originalname.split('.').pop() || 'jpg';
    const fileName = `products/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const client = getSupabaseClient();
    const { data: uploadData, error: uploadErr } = await client.storage.from(BUCKET).upload(fileName, file.buffer, { contentType: file.mimetype });
    if (uploadErr) throw new Error(`上传图片失败: ${uploadErr.message}`);
    const key = uploadData.path;
    const { data: signed } = await client.storage.from(BUCKET).createSignedUrl(key, 3600);
    res.json({ success: true, data: { key, url: signed?.signedUrl || '' } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// 初始化商品数据（先清空旧数据，再导入）
router.post('/api/products/seed', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { products } = req.body;
    if (!Array.isArray(products) || products.length === 0) {
      res.status(400).json({ success: false, error: '商品数据为空' });
      return;
    }
    const client = getSupabaseClient();

    // 1. 先删除旧商品的对象存储图片
    try {
      const { data: oldProducts } = await client.from('products').select('image_key');
      for (const p of (oldProducts || [])) {
        if (p.image_key) {
          try { await client.storage.from(BUCKET).remove([p.image_key as string]); } catch (cleanupErr) { console.error('Storage cleanup error:', cleanupErr); }
        }
      }
    } catch (cleanupErr) { console.error('Storage cleanup error:', cleanupErr); }

    // 2. 清空旧商品数据
    await client.from('products').delete().neq('id', 0);

    // 3. 插入新数据
    const rows = products.map((p: Record<string, unknown>, idx: number) => ({
      name: p.name,
      category: p.category,
      price: Number(p.price),
      unit: p.unit,
      stock: Number(p.stock ?? 99),
      image_key: (p.image_key as string) || null,
      description: (p.description as string) || null,
      sort_order: Number(p.sort_order ?? idx),
      purchase_limit: Number(p.purchase_limit ?? 0),
    }));
    const { data, error } = await client.from('products').insert(rows).select();
    if (error) throw new Error(`导入商品失败: ${error.message}`);
    res.json({ success: true, data, count: data?.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});


// ==================== 订单 API ====================

// 获取所有订单 (支持分页)
router.get('/api/orders', authMiddleware, async (req: Request, res: Response) => {
  try {
    const client = getSupabaseClient();
    const { status, location } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const offset = (page - 1) * pageSize;

    let query = client
      .from('orders')
      .select('*, order_items(*)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (status) query = query.eq('status', status as string);
    if (location) query = query.eq('location', location as string);

    const { data, error, count } = await query;
    if (error) throw new Error(`查询订单失败: ${error.message}`);
    res.json({ success: true, data: data || [], total: count ?? 0, page, pageSize });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// 创建订单 (使用数据库事务函数保证原子性)
router.post('/api/orders', async (req: Request, res: Response) => {
  try {
    const { phone, location, delivery_method, items, total_price, service_fee, grand_total } = req.body;
    if (!phone || !items || items.length === 0) {
      res.status(400).json({ success: false, error: '缺少必填字段' });
      return;
    }

    const client = getSupabaseClient();

    const { data, error } = await client.rpc('create_order_with_inventory', {
      p_phone: phone,
      p_location: location || null,
      p_delivery_method: delivery_method || 'pickup',
      p_total_price: Number(total_price),
      p_service_fee: Number(service_fee),
      p_grand_total: Number(grand_total),
      p_items: items.map((item: Record<string, unknown>) => ({
        product_id: Number(item.product_id),
        product_name: String(item.product_name),
        price: String(item.price),
        quantity: Number(item.quantity),
      })),
    });

    if (error) throw new Error(`创建订单失败: ${error.message}`);
    res.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// 更新订单状态（办结/取消）
router.put('/api/orders/:id/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status || !['pending', 'completed', 'cancelled'].includes(status)) {
      res.status(400).json({ success: false, error: '无效的状态值' });
      return;
    }

    const client = getSupabaseClient();

    // 如果取消订单，回补库存
    if (status === 'cancelled') {
      const { data: order, error: findErr } = await client
        .from('orders')
        .select('status, order_items(*)')
        .eq('id', Number(id))
        .single();
      if (findErr) throw new Error(`查询订单失败: ${findErr.message}`);
      if ((order as Record<string, unknown>).status === 'cancelled') {
        res.json({ success: true, message: '订单已取消' });
        return;
      }
      const items = ((order as Record<string, unknown>).order_items || []) as Array<Record<string, unknown>>;
      for (const item of items) {
        const { data: prod } = await client
          .from('products')
          .select('stock')
          .eq('id', item.product_id)
          .maybeSingle();
        if (prod) {
          await client
            .from('products')
            .update({
              stock: (prod.stock as number) + Number(item.quantity),
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.product_id);
        }
      }
    }

    const { data, error } = await client
      .from('orders')
      .update({ status })
      .eq('id', Number(id))
      .select('*, order_items(*)')
      .single();
    if (error) throw new Error(`更新订单状态失败: ${error.message}`);
    res.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// 订单数据分析
router.get('/api/orders/analytics', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const client = getSupabaseClient();

    // 获取所有订单（含明细）
    const { data: orders, error } = await client
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });
    if (error) throw new Error(`查询订单失败: ${error.message}`);

    const allOrders = orders || [];
    const completedOrders = allOrders.filter((o: Record<string, unknown>) => o.status !== 'cancelled');

    // 汇总
    const totalOrders = completedOrders.length;
    const totalRevenue = completedOrders.reduce((sum: number, o: Record<string, unknown>) => sum + Number(o.grand_total || 0), 0);
    const allItems = completedOrders.flatMap((o: Record<string, unknown>) => (o.order_items || []) as Array<Record<string, unknown>>);
    const totalProducts = allItems.reduce((sum: number, item: Record<string, unknown>) => sum + Number(item.quantity || 0), 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // 站点分布
    const locationMap: Record<string, { count: number; revenue: number }> = {};
    for (const o of completedOrders) {
      const loc = (o as Record<string, unknown>).location as string || '未知';
      if (!locationMap[loc]) locationMap[loc] = { count: 0, revenue: 0 };
      locationMap[loc].count++;
      locationMap[loc].revenue += Number((o as Record<string, unknown>).grand_total || 0);
    }
    const locationStats = Object.entries(locationMap).map(([location, v]) => ({ location, ...v }));

    // 商品销量排行
    const productMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
    for (const item of allItems) {
      const name = item.product_name as string;
      if (!productMap[name]) productMap[name] = { name, quantity: 0, revenue: 0 };
      productMap[name].quantity += Number(item.quantity || 0);
      productMap[name].revenue += Number(item.price || 0) * Number(item.quantity || 0);
    }
    const productRanking = Object.values(productMap).sort((a, b) => b.quantity - a.quantity).slice(0, 10);

    // 近14日趋势
    const now = new Date();
    const dailyMap: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dailyMap[key] = 0;
    }
    for (const o of completedOrders) {
      const dateKey = new Date((o as Record<string, unknown>).created_at as string).toISOString().slice(0, 10);
      if (dateKey in dailyMap) dailyMap[dateKey]++;
    }
    const trend = Object.entries(dailyMap).map(([date, count]) => ({ date, count }));

    res.json({
      success: true,
      data: {
        summary: { totalOrders, totalRevenue, totalProducts, avgOrderValue },
        locationStats,
        productRanking,
        trend,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// 清空所有订单
router.delete('/api/orders', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const client = getSupabaseClient();
    // 先删除 order_items（外键依赖）
    await client.from('order_items').delete().neq('id', 0);
    // 再删除 orders
    const { error } = await client.from('orders').delete().neq('id', 0);
    if (error) throw new Error(`清空订单失败: ${error.message}`);
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// 健康检查接口
router.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    env: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

export default router;
