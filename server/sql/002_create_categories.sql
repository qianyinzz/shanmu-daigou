-- ======================================================
-- 山姆代购系统: 分类管理表
-- ======================================================

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📦',
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- 插入默认分类
INSERT INTO categories (id, name, icon, sort_order)
VALUES
  ('bakery', '烘焙糕点', '🍰', 1),
  ('deli', '熟食速食', '🔥', 2),
  ('fresh', '生鲜果蔬', '🍎', 3),
  ('drinks', '酒水饮料', '☕', 4),
  ('snacks', '休闲零食', '🍪', 5)
ON CONFLICT (id) DO NOTHING;
