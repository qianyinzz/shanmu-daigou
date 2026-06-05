-- 添加 purchase_limit 列，默认值为 0 (0代表不限购)
ALTER TABLE products ADD COLUMN IF NOT EXISTS purchase_limit INTEGER NOT NULL DEFAULT 0;
