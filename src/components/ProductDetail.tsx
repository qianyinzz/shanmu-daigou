/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product } from '../types';
import { X, ShoppingBag, ShieldAlert, Package, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProductDetailProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
  onRemoveFromCart: (product: Product) => void;
  cartQuantity: number;
}

export default function ProductDetail({
  product,
  onClose,
  onAddToCart,
  onRemoveFromCart,
  cartQuantity,
}: ProductDetailProps) {
  if (!product) return null;

  const isOutOfStock = product.stock <= 0;
  const isLimitReached = product.limit > 0 && cartQuantity >= product.limit;

  return (
    <AnimatePresence>
      <div className="absolute inset-0 z-50 flex items-end justify-center">
        {/* Dark Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          onClick={onClose}
        ></motion.div>

        {/* Swipe-Up Modal Drawer Container */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="relative bg-white w-full rounded-t-[24px] overflow-hidden max-h-[85%] z-50 shadow-2xl flex flex-col border-t border-slate-100"
        >
          {/* Header Action Row */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <span className="text-slate-800 text-sm font-bold flex items-center gap-1">
              <ShoppingBag size={15} className="text-sky-500" />
              <span>山姆精选代购商品详情</span>
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 hover:text-slate-800 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Scrolling Details Container */}
          <div className="flex-1 overflow-y-auto pb-8 text-left">
            {/* Main Picture */}
            <div className="relative aspect-video w-full bg-slate-100">
              <img
                src={product.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600'}
                alt={product.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600';
                }}
              />
              {product.badge && (
                <div className="absolute top-4 left-4 px-2.5 py-0.5 rounded-full bg-amber-500 text-white font-extrabold text-[10px] shadow-sm uppercase tracking-wider">
                  {product.badge}
                </div>
              )}
            </div>

            {/* Core Specs */}
            <div className="p-5">
              <h2 className="text-lg font-extrabold text-slate-800 leading-snug">{product.name}</h2>
              
              {/* Cost Section */}
              <div className="mt-3 bg-red-50/70 p-3 rounded-xl flex items-center justify-between border border-red-100/50">
                <div className="flex flex-col">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-extrabold text-2xl text-red-500 font-mono">
                      ¥{product.price.toFixed(1)}
                    </span>
                    {product.originalPrice && (
                      <span className="text-slate-400 line-through text-xs font-mono">
                        ¥{product.originalPrice.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                    💡 【山姆会员店采购原价】。代购提供打包、装箱、送货服务。
                  </div>
                </div>
                
                {/* Meta details */}
                <div className="text-right text-[10px] text-red-600 font-bold bg-white px-2 py-1 rounded border border-red-100 shadow-xs">
                  代购跑腿费 8%
                </div>
              </div>

              {/* Purchase Rules Alert Board */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-2.5 rounded-lg border border-slate-100">
                  <Package size={14} className="text-slate-400" />
                  <span className="font-semibold text-slate-700">实时库存：</span>
                  <span className={`font-bold ${product.stock > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {product.stock > 0 ? `限时仓储 仅剩 ${product.stock} 件` : '商品已售罄，正在紧急采购补货中'}
                  </span>
                </div>

                {product.limit > 0 && (
                  <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-3 py-2.5 rounded-lg border border-amber-100/80">
                    <ShieldAlert size={14} className="text-amber-500" />
                    <span className="font-semibold text-amber-800">代购限购规则：</span>
                    <span>因商品火爆排队及限购限制，每人终极大额代购限购 <b className="text-amber-600 text-sm font-extrabold">{product.limit}</b> 件</span>
                  </div>
                )}
              </div>

              {/* Description Details Panel */}
              <div className="mt-5 space-y-2">
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider border-l-4 border-sky-500 pl-2">
                  商品描述及代购说明
                </h3>
                <p className="text-slate-600 text-xs leading-relaxed bg-slate-50/50 p-3 rounded-lg border border-dotted border-slate-200">
                  {product.description}
                  <br />
                  <br />
                  <span className="text-[10px] text-sky-600 leading-snug">
                    📢 【品质保障】所有货物直接经由山姆实体采购，均保障优质新鲜，极速装配配送。建议顾客收到后根据商品属性置于常温、冷冻或冷藏妥善保存。
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Floating Sticky Bottom Control Bar */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
            <div>
              {cartQuantity > 0 ? (
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-bold">已选数量</span>
                  <span className="text-sm font-extrabold text-sky-600 font-mono">
                    {cartQuantity} 件
                  </span>
                </div>
              ) : (
                <span className="text-xs text-slate-400 font-medium">尚未选择商品</span>
              )}
            </div>

            <div className="flex items-center gap-4">
              {cartQuantity > 0 ? (
                // Counter stepper
                <div className="flex items-center gap-3 bg-white border border-slate-200/80 rounded-full px-2 py-1 shadow-sm">
                  <button
                    onClick={() => onRemoveFromCart(product)}
                    className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700 active:scale-95 transition-transform"
                  >
                    -
                  </button>
                  <span className="font-extrabold text-slate-800 text-sm font-mono min-w-[20px] text-center">
                    {cartQuantity}
                  </span>
                  <button
                    onClick={() => {
                      if (!isLimitReached && cartQuantity < product.stock) {
                        onAddToCart(product);
                      }
                    }}
                    disabled={isLimitReached || cartQuantity >= product.stock}
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold active:scale-95 transition-transform ${
                      isLimitReached || cartQuantity >= product.stock
                        ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
                        : 'bg-sky-500 text-white hover:bg-sky-600 shadow-sm'
                    }`}
                  >
                    +
                  </button>
                </div>
              ) : (
                // Primary action trigger
                <button
                  onClick={() => {
                    if (!isOutOfStock) {
                      onAddToCart(product);
                    }
                  }}
                  disabled={isOutOfStock}
                  className={`px-6 py-2.5 rounded-full font-bold text-xs flex items-center gap-2 shadow-md transition-all active:scale-95 ${
                    isOutOfStock
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                      : 'bg-sky-500 hover:bg-sky-600 text-white hover:shadow-lg'
                  }`}
                >
                  <ShoppingCart size={13} strokeWidth={2.5} />
                  <span>{isOutOfStock ? '今日已抢光' : '加入代购车'}</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
