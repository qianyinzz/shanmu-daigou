# 山姆代购快捷点单系统

专为山姆会员店代购打造的移动端点单、购物车、清单复制及商品后台库存管理系统。

**技术栈：** React 19 + Express 4 + TypeScript + Tailwind CSS v4 + Supabase (PostgreSQL)

## 快速开始

### 开发环境

```bash
pnpm dev
```

启动后在浏览器打开 [http://localhost:5000](http://localhost:5000)。

### 生产构建

```bash
pnpm build
```

前端构建到 `dist/`，后端编译到 `dist-server/`。

### 生产启动

```bash
pnpm start
```

## 环境变量

| 变量 | 说明 | 必须 |
|------|------|------|
| `SUPABASE_URL` | Supabase 项目 URL | 是 |
| `SUPABASE_ANON_KEY` | Supabase 匿名密钥 | 是 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服务角色密钥（管理操作） | 是 |
| `SUPABASE_STORAGE_BUCKET` | 图片存储桶名称 | 否（默认 `products`） |
| `ADMIN_PASSWORD` | 后台管理密码 | 否（默认 `sam888`） |
| `TOKEN_SECRET` | Token 签名密钥 | 否（自动生成） |
| `NODE_ENV` | 运行环境（`production` 启用生产模式） | 否 |

## 项目结构

```
├── server/                  # 后端 Express 服务
│   ├── middleware/auth.ts   # 认证中间件
│   ├── routes/index.ts      # API 路由（商品/订单/图片/认证）
│   ├── sql/                 # 数据库迁移 SQL
│   ├── src/storage/         # Supabase 客户端
│   ├── server.ts            # 服务入口
│   └── vite.ts              # Vite 集成
├── src/                     # 前端 React 应用
│   ├── components/          # React 组件
│   │   ├── AdminPanel.tsx   # 后台管理面板
│   │   ├── CartDrawer.tsx   # 购物车抽屉
│   │   ├── CheckoutModal.tsx # 结算/清单生成
│   │   ├── MobileFrame.tsx  # 移动端容器
│   │   ├── ProductCard.tsx  # 商品卡片
│   │   └── ProductDetail.tsx # 商品详情
│   ├── api.ts               # API 客户端
│   ├── App.tsx              # 主应用组件
│   ├── data.ts              # 初始商品数据
│   ├── types.ts             # TypeScript 类型
│   └── utils.ts             # 工具函数
├── scripts/                 # Shell 脚本
│   ├── build.sh             # 生产构建
│   ├── dev.sh               # 开发启动
│   ├── prepare.sh           # 开发前准备
│   ├── start.sh             # 生产启动
│   └── validate.sh          # 代码验证
└── package.json
```

## 数据库初始化

在 Supabase SQL Editor 中执行 `server/sql/000_init_schema.sql` 创建表结构和事务下单函数。

## 管理后台

访问 `http://你的域名/#/admin`，输入管理密码进入后台面板。

默认密码：`sam888`（请通过环境变量 `ADMIN_PASSWORD` 修改）。

## 包管理规范

**仅允许使用 pnpm**，禁止 npm 或 yarn。

```bash
pnpm install              # 安装依赖
pnpm add <package>        # 添加依赖
pnpm add -D <package>     # 添加开发依赖
```
