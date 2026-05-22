-- ======================================================
-- 山姆代购系统: 数据库迁移
-- 1. 添加 delivery_method 列
-- 2. 创建事务下单函数 (订单创建 + 库存扣减)
-- ======================================================

-- 添加 delivery_method 列 (如果不存在)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'delivery_method'
  ) THEN
    ALTER TABLE orders ADD COLUMN delivery_method text DEFAULT 'pickup';
  END IF;
END $$;

-- ======================================================
-- 事务下单函数: 在同一个事务中完成
--   1. 创建订单
--   2. 创建订单明细
--   3. 扣减库存
-- 任何一步失败都会回滚
-- ======================================================
CREATE OR REPLACE FUNCTION create_order_with_inventory(
  p_phone text,
  p_location text,
  p_delivery_method text,
  p_total_price text,
  p_service_fee text,
  p_grand_total text,
  p_items jsonb  -- [{product_id, product_name, price, quantity}]
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
  -- 生成订单号
  v_order_no := 'SM' || extract(epoch from now())::bigint || upper(substring(md5(random()::text), 1, 4));

  -- 1. 创建订单
  INSERT INTO orders (order_no, phone, location, delivery_method, total_price, service_fee, grand_total)
  VALUES (v_order_no, p_phone, p_location, p_delivery_method, p_total_price, p_service_fee, p_grand_total)
  RETURNING id INTO v_order_id;

  -- 2. 逐条处理订单明细 + 库存扣减
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- 检查并扣减库存 (行级锁防止超卖)
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

    -- 创建订单明细
    INSERT INTO order_items (order_id, product_id, product_name, price, quantity)
    VALUES (
      v_order_id,
      (v_item->>'product_id')::bigint,
      v_item->>'product_name',
      v_item->>'price',
      (v_item->>'quantity')::integer
    );
  END LOOP;

  -- 3. 返回完整订单
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
