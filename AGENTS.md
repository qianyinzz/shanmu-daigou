# 项目上下文

## 项目概述

**山姆代购快捷点单系统** — 专为山姆会员店代购打造的微信小程序风移动端点单、购物车、清单复制及商品后台库存管理系统。

## 技术栈

- **核心**: Vite 6, React 19, TypeScript, Express
- **UI**: Tailwind CSS v4 (via @tailwindcss/vite)
- **图标**: lucide-react
- **动画**: motion (framer-motion 继任者)
- **数据持久化**: localStorage (前端本地存储)

## 目录结构

```
├── scripts/            # 构建与启动脚本
│   ├── build.sh        # 构建脚本
│   ├── dev.sh          # 开发环境启动脚本
│   ├── prepare.sh      # 预处理脚本
│   └── start.sh        # 生产环境启动脚本
├── server/             # 服务端逻辑
│   ├── routes/         # API 路由
│   ├── server.ts       # Express 服务入口
│   └── vite.ts         # Vite 中间件集成
├── src/                # 前端源码
│   ├── components/     # React 组件
│   │   ├── AdminPanel.tsx      # 后台管理面板
│   │   ├── CartDrawer.tsx      # 购物车抽屉
│   │   ├── CheckoutModal.tsx   # 结算弹窗
│   │   ├── MobileFrame.tsx     # 移动端框架容器
│   │   ├── ProductCard.tsx     # 商品卡片
│   │   └── ProductDetail.tsx   # 商品详情
│   ├── App.tsx         # 主应用组件
│   ├── data.ts         # 初始商品数据
│   ├── index.css       # 全局样式 (Tailwind v4)
│   ├── main.tsx        # 客户端入口
│   ├── types.ts        # TypeScript 类型定义
│   └── vite-env.d.ts   # Vite 类型声明
├── index.html          # 入口 HTML
├── package.json        # 项目依赖管理
├── tsconfig.json       # TypeScript 配置
└── vite.config.ts      # Vite 配置
```

## 核心功能模块

- **前台点单**: 商品浏览、搜索、分类筛选、加购、购物车管理
- **结算流程**: 手机号验证、配送方式选择、代购清单生成与一键复制
- **后台管理**: 商品增删改、库存/价格实时调整、订单审批与归档、出厂重置
- **移动端适配**: MobileFrame 组件提供手机模拟框，支持宽屏/手机双模式切换

## 包管理规范

**仅允许使用 pnpm** 作为包管理器，**严禁使用 npm 或 yarn**。
**常用命令**：
- 安装依赖：`pnpm add <package>`
- 安装开发依赖：`pnpm add -D <package>`
- 安装所有依赖：`pnpm install`
- 移除依赖：`pnpm remove <package>`

## 开发规范

- 使用 Tailwind CSS v4 进行样式开发
- React 组件使用函数式组件 + Hooks
- 数据存储使用 localStorage，键名前缀 `sam_`

### 编码规范

- 默认按 TypeScript `strict` 心智写代码；优先复用当前作用域已声明的变量、函数、类型和导入，禁止引用未声明标识符或拼错变量名。
- 禁止隐式 `any` 和 `as any`；函数参数、返回值、解构项、事件对象、Express `req`/`res`、`catch` 错误在使用前应有明确类型或先完成类型收窄，并清理未使用的变量和导入。
