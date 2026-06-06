-- 添加是否为爆款字段
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_hot boolean DEFAULT false;

-- 为现有的分类为 'hot' 的商品设置 is_hot = true
UPDATE products SET is_hot = true WHERE category = 'hot';
