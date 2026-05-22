-- ======================================================
-- 山姆代购系统: 数据库完整迁移
-- 1. 创建 products 表
-- 2. 创建 orders 表
-- 3. 创建 order_items 表
-- 4. 添加 delivery_method 列
-- 5. 创建事务下单函数
-- ======================================================

-- ==================== 商品表 ====================
CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'bakery',
  price TEXT NOT NULL DEFAULT '0',
  unit TEXT NOT NULL DEFAULT '份',
  stock INTEGER NOT NULL DEFAULT 99,
  image_key TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==================== 订单表 ====================
CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  order_no TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  location TEXT,
  delivery_method TEXT DEFAULT 'pickup',
  status TEXT NOT NULL DEFAULT 'pending',
  total_price TEXT NOT NULL DEFAULT '0',
  service_fee TEXT NOT NULL DEFAULT '0',
  grand_total TEXT NOT NULL DEFAULT '0',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==================== 订单明细表 ====================
CREATE TABLE IF NOT EXISTS order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL,
  product_name TEXT NOT NULL,
  price TEXT NOT NULL DEFAULT '0',
  quantity INTEGER NOT NULL DEFAULT 1
);

-- ==================== 索引 ====================
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- ==================== 事务下单函数 ====================
CREATE OR REPLACE FUNCTION create_order_with_inventory(
  p_phone text,
  p_location text,
  p_delivery_method text,
  p_total_price text,
  p_service_fee text,
  p_grand_total text,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_order_no text;
  v_order_id bigint;
  v_item jsonb;
  v_current_stock integer;
  v_new_stock integer;
  v_result jsonb;
BEGIN
  v_order_no := 'SM' || extract(epoch from now())::bigint || upper(substring(md5(random()::text), 1, 4));

  INSERT INTO orders (order_no, phone, location, delivery_method, total_price, service_fee, grand_total)
  VALUES (v_order_no, p_phone, p_location, p_delivery_method, p_total_price, p_service_fee, p_grand_total)
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT stock INTO v_current_stock
    FROM products
    WHERE id = (v_item->>'product_id')::bigint
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION '商品 ID % 不存在', (v_item->>'product_id');
    END IF;

    v_new_stock := v_current_stock - (v_item->>'quantity')::integer;
    IF v_new_stock < 0 THEN
      RAISE EXCEPTION '商品 % 库存不足 (当前: %, 请求: %)',
        v_item->>'product_name', v_current_stock, (v_item->>'quantity');
    END IF;

    UPDATE products SET stock = v_new_stock, updated_at = now()
    WHERE id = (v_item->>'product_id')::bigint;

    INSERT INTO order_items (order_id, product_id, product_name, price, quantity)
    VALUES (
      v_order_id,
      (v_item->>'product_id')::bigint,
      v_item->>'product_name',
      v_item->>'price',
      (v_item->>'quantity')::integer
    );
  END LOOP;

  SELECT jsonb_build_object(
    'id', o.id,
    'order_no', o.order_no,
    'phone', o.phone,
    'location', o.location,
    'delivery_method', o.delivery_method,
    'status', o.status,
    'total_price', o.total_price,
    'service_fee', o.service_fee,
    'grand_total', o.grand_total,
    'created_at', o.created_at,
    'order_items', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', oi.id,
        'order_id', oi.order_id,
        'product_id', oi.product_id,
        'product_name', oi.product_name,
        'price', oi.price,
        'quantity', oi.quantity
      ))
      FROM order_items oi
      WHERE oi.order_id = o.id
    )
  ) INTO v_result
  FROM orders o
  WHERE o.id = v_order_id;

  RETURN v_result;
END;
$$;
