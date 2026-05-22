// ABOUTME: API 路由 - 商品管理、订单管理、图片上传
import { Router, type Request, type Response } from 'express';
import { getSupabaseClient } from '../src/storage/database/supabase-client';
import { S3Storage } from 'coze-coding-dev-sdk';
import multer from 'multer';
import { verifyPassword, generateToken, changePassword, authMiddleware } from '../middleware/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: "",
  secretKey: "",
  bucketName: process.env.COZE_BUCKET_NAME,
  region: "cn-beijing",
});

// ==================== 认证 API ====================

// 管理员登录
router.post('/api/auth/login', (req: Request, res: Response) => {
  const { password } = req.body;
  if (!password || typeof password !== 'string') {
    res.status(400).json({ success: false, error: '请提供密码' });
    return;
  }
  if (!verifyPassword(password)) {
    res.status(401).json({ success: false, error: '密码错误' });
    return;
  }
  const token = generateToken();
  res.json({ success: true, data: { token } });
});

// 修改管理员密码
router.put('/api/auth/password', authMiddleware, (req: Request, res: Response) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword || typeof oldPassword !== 'string' || typeof newPassword !== 'string') {
    res.status(400).json({ success: false, error: '请提供原密码和新密码' });
    return;
  }
  const newToken = changePassword(oldPassword, newPassword);
  if (!newToken) {
    res.status(400).json({ success: false, error: '原密码不正确或新密码少于4位' });
    return;
  }
  res.json({ success: true, data: { token: newToken } });
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
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;
    const offset = (page - 1) * pageSize;

    let query = client
      .from('products')
      .select('*', { count: 'exact' })
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
          const imageUrl = await storage.generatePresignedUrl({
            key,
            expireTime: 3600,
          });
          return { ...p, image_url: imageUrl };
        } catch {
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
    const { name, category, price, unit, stock, image_key, description } = req.body;
    if (!name || !category || !price || !unit) {
      res.status(400).json({ success: false, error: '缺少必填字段' });
      return;
    }
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('products')
      .insert({ name, category, price: String(price), unit, stock: stock || 0, image_key: image_key || null, description: description || null })
      .select()
      .single();
    if (error) throw new Error(`新增商品失败: ${error.message}`);
    res.json({ success: true, data });
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
    const allowedFields = ['name', 'category', 'price', 'unit', 'stock', 'image_key', 'description'];
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
    if (updates.price !== undefined) updates.price = String(updates.price);
    if (updates.stock !== undefined) updates.stock = Number(updates.stock);
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
      try { await storage.deleteFile({ fileKey: product.image_key as string }); } catch { /* ignore */ }
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
    const key = await storage.uploadFile({
      fileContent: file.buffer,
      fileName,
      contentType: file.mimetype,
    });
    const imageUrl = await storage.generatePresignedUrl({ key, expireTime: 3600 });
    res.json({ success: true, data: { key, url: imageUrl } });
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
          try { await storage.deleteFile({ fileKey: p.image_key as string }); } catch { /* ignore */ }
        }
      }
    } catch { /* ignore */ }

    // 2. 清空旧商品数据
    await client.from('products').delete().neq('id', 0);

    // 3. 插入新数据
    const rows = products.map((p: Record<string, unknown>) => ({
      name: p.name,
      category: p.category,
      price: String(p.price),
      unit: p.unit,
      stock: Number(p.stock ?? 99),
      image_key: (p.image_key as string) || null,
      description: (p.description as string) || null,
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

    // 优先使用 PostgreSQL 事务函数 (RPC)
    try {
      const { data, error } = await client.rpc('create_order_with_inventory', {
        p_phone: phone,
        p_location: location || null,
        p_delivery_method: delivery_method || 'pickup',
        p_total_price: String(total_price),
        p_service_fee: String(service_fee),
        p_grand_total: String(grand_total),
        p_items: items.map((item: Record<string, unknown>) => ({
          product_id: Number(item.product_id),
          product_name: String(item.product_name),
          price: String(item.price),
          quantity: Number(item.quantity),
        })),
      });

      if (error) {
        // RPC 不可用时回退到应用层逻辑
        throw error;
      }
      res.json({ success: true, data });
      return;
    } catch (rpcErr) {
      // 如果 RPC 函数不存在，回退到分步操作（带补偿逻辑）
      console.warn('RPC 不可用，使用应用层回退:', (rpcErr as Error).message);
    }

    // --- 应用层回退: 分步创建订单 + 库存扣减 ---
    const orderNo = `SM${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const { data: order, error: orderError } = await client
      .from('orders')
      .insert({
        order_no: orderNo,
        phone,
        location: location || null,
        delivery_method: delivery_method || 'pickup',
        total_price: String(total_price),
        service_fee: String(service_fee),
        grand_total: String(grand_total),
      })
      .select()
      .single();
    if (orderError) throw new Error(`创建订单失败: ${orderError.message}`);

    const orderId = (order as Record<string, unknown>).id;

    // 创建订单明细 & 扣减库存
    const rollbackItems: Array<{ productId: number; quantity: number }> = [];
    try {
      for (const item of items as Array<Record<string, unknown>>) {
        // 插入订单明细
        const { error: itemsError } = await client.from('order_items').insert({
          order_id: orderId,
          product_id: Number(item.product_id),
          product_name: String(item.product_name),
          price: String(item.price),
          quantity: Number(item.quantity),
        });
        if (itemsError) throw new Error(`创建订单明细失败: ${itemsError.message}`);

        // 扣减库存
        const { data: prod, error: prodErr } = await client
          .from('products')
          .select('stock')
          .eq('id', Number(item.product_id))
          .maybeSingle();
        if (prodErr) throw new Error(`查询库存失败: ${prodErr.message}`);

        if (!prod) throw new Error(`商品 ${item.product_id} 不存在`);
        const currentStock = Number(prod.stock);
        const deductQty = Number(item.quantity);
        if (currentStock < deductQty) {
          throw new Error(`商品 ${item.product_name} 库存不足 (当前: ${currentStock}, 请求: ${deductQty})`);
        }

        const newStock = currentStock - deductQty;
        const { error: updErr } = await client
          .from('products')
          .update({ stock: newStock, updated_at: new Date().toISOString() })
          .eq('id', Number(item.product_id));
        if (updErr) throw new Error(`扣减库存失败: ${updErr.message}`);

        rollbackItems.push({ productId: Number(item.product_id), quantity: deductQty });
      }
    } catch (innerErr) {
      // 补偿回滚: 恢复已扣库存 + 删除已创建明细
      for (const rb of rollbackItems) {
        try {
          const { data: cur } = await client.from('products').select('stock').eq('id', rb.productId).maybeSingle();
          if (cur) {
            await client.from('products').update({
              stock: Number(cur.stock) + rb.quantity,
              updated_at: new Date().toISOString(),
            }).eq('id', rb.productId);
          }
        } catch { /* ignore compensation errors */ }
      }
      try { await client.from('order_items').delete().eq('order_id', orderId); } catch { /* ignore */ }
      try { await client.from('orders').delete().eq('id', orderId); } catch { /* ignore */ }
      throw innerErr;
    }

    // 返回完整订单
    const { data: fullOrder, error: fetchErr } = await client
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .single();
    if (fetchErr) throw new Error(`获取订单失败: ${fetchErr.message}`);

    res.json({ success: true, data: fullOrder });
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
    env: process.env.COZE_PROJECT_ENV,
    timestamp: new Date().toISOString(),
  });
});

export default router;
