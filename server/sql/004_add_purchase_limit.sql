-- 1. 添加 purchase_limit 列，默认值为 0 (0代表无单日总量限制)
ALTER TABLE products ADD COLUMN IF NOT EXISTS purchase_limit INTEGER NOT NULL DEFAULT 0;

-- 2. 添加 last_restock_date 列，记录最后一次恢复库存的日期
ALTER TABLE products ADD COLUMN IF NOT EXISTS last_restock_date DATE;

-- 3. 创建一个每日自动重置库存的存储过程
-- 当商品设置了单日限购 (purchase_limit > 0) 且今天还没恢复过库存时，将库存重置为单日限购量
CREATE OR REPLACE FUNCTION daily_restock() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE products 
  SET stock = purchase_limit, last_restock_date = CURRENT_DATE 
  WHERE purchase_limit > 0 
    AND (last_restock_date IS NULL OR last_restock_date < CURRENT_DATE);
END;
$$;
