-- ======================================================
-- 为 products 表添加 sort_order 字段
-- 用于后台自定义商品展示排序
-- ======================================================

-- 添加 sort_order 列，默认值为 0
ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- 为已有商品按 created_at 顺序初始化 sort_order
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) - 1 AS rn
  FROM products
)
UPDATE products
SET sort_order = ranked.rn
FROM ranked
WHERE products.id = ranked.id;

-- 添加索引以加速排序查询
CREATE INDEX IF NOT EXISTS idx_products_sort_order ON products(sort_order);
