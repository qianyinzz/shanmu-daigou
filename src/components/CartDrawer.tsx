/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { type CartItem } from '../types';
import { PROXY_FEE_RATE } from '../utils';
import { Trash2, X, ShoppingCart, ShoppingBag, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onClearCart: () => void;
  onCheckout: () => void;
}

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onClearCart,
  onCheckout,
}: CartDrawerProps) {
  if (!isOpen) return null;

  // Calculators
  const totalItemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const totalProductsPrice = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const totalProxyFee = totalProductsPrice * PROXY_FEE_RATE;
  const grandTotal = totalProductsPrice + totalProxyFee;

  return (
    <AnimatePresence>
      <div className="absolute inset-0 z-50 flex items-end justify-center">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          onClick={onClose}
        ></motion.div>

        {/* Sliding Panel */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="relative bg-white w-full rounded-t-[24px] max-h-[80%] z-50 shadow-2xl flex flex-col border-t border-slate-100"
        >
          {/* Header row */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 select-none">
            <div className="flex items-center gap-2">
              <ShoppingCart size={16} className="text-sky-500" />
              <span className="font-extrabold text-slate-800 text-sm">已选代购车 ({totalItemCount}件)</span>
            </div>
            
            <div className="flex items-center gap-3">
              {cartItems.length > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm('确认清空代购车吗？')) {
                      onClearCart();
                    }
                  }}
                  className="text-slate-400 hover:text-red-500 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                >
                  <Trash2 size={12} />
                  <span>清空</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1 rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Cart Contents list */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <ShoppingBag size={48} className="stroke-1 text-slate-300 mb-2 animate-bounce" />
                <span className="text-xs font-semibold">购物车空空如也，快去选购吧！</span>
              </div>
            ) : (
              cartItems.map((item) => {
                const isLimitReached = item.product.limit > 0 && item.quantity >= item.product.limit;
                
                return (
                  <div
                    key={item.product.id}
                    className="flex justify-between items-center gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0"
                  >
                    {/* Item Thumbnail */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-lg object-cover bg-slate-100 shrink-0 border border-slate-100"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600';
                        }}
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 truncate leading-snug">
                          {item.product.name}
                        </h4>
                        
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-extrabold text-red-500 font-mono">
                            ¥{item.product.price.toFixed(1)}
                          </span>
                          {item.product.limit > 0 && (
                            <span className="text-[9px] bg-amber-50 text-amber-700 px-1 py-0.2 rounded border border-amber-100 font-medium">
                              限购 {item.product.limit}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Adjusters */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                        className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold flex items-center justify-center transition-colors text-xs active:scale-90"
                      >
                        -
                      </button>
                      <span className="text-xs font-extrabold text-slate-800 font-mono w-5 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => {
                          if (!isLimitReached && item.quantity < item.product.stock) {
                            onUpdateQuantity(item.product.id, item.quantity + 1);
                          }
                        }}
                        disabled={isLimitReached || item.quantity >= item.product.stock}
                        className={`w-6 h-6 rounded-full font-extrabold flex items-center justify-center transition-colors text-xs active:scale-90 ${
                          isLimitReached || item.quantity >= item.product.stock
                            ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
                            : 'bg-sky-500 text-white hover:bg-sky-600'
                        }`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })
            )}

            {/* Quality control notices */}
            {cartItems.length > 0 && (
              <div className="flex items-start gap-1 p-2.5 bg-sky-50 rounded-lg text-[10px] text-sky-700 leading-normal border border-sky-100/50">
                <ShieldAlert size={12} className="shrink-0 mt-0.5 text-sky-500" />
                <span>
                  <b>跑腿说明：</b>所有货物直接经由山姆实体冷链采购配货。由于代购体积、分拣和装箱代领等劳务，我们将按照订单金额收取 <b>{(PROXY_FEE_RATE * 100).toFixed(0)}%</b> 的跑腿劳务服务费。
                </span>
              </div>
            )}
          </div>

          {/* Checkout pricing panel */}
          {cartItems.length > 0 && (
            <div className="p-5 border-t border-slate-100 bg-slate-50 shrink-0">
              {/* Detailed Bills row */}
              <div className="space-y-1 bg-white p-3 rounded-xl border border-slate-100 shadow-xs mb-3">
                <div className="flex justify-between items-center text-xs text-slate-500">
                  <span>商品合计 (原价)</span>
                  <span className="font-mono">¥{totalProductsPrice.toFixed(1)}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-500">
                  <span>代购跑腿服务费 (商品金额的 {(PROXY_FEE_RATE * 100).toFixed(0)}%)</span>
                  <span className="text-amber-600 font-mono font-semibold">+ ¥{totalProxyFee.toFixed(1)}</span>
                </div>
                <div className="h-[1px] bg-slate-100 my-1.5" />
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-800">代购预计总额</span>
                  <span className="text-red-500 font-extrabold text-base font-mono">¥{grandTotal.toFixed(1)}</span>
                </div>
              </div>

              {/* Action checkout button */}
              <button
                onClick={onCheckout}
                className="w-full bg-sky-500 hover:bg-sky-600 text-white text-xs font-extrabold py-3 rounded-full shadow-md active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                <span>准备结算 ({totalItemCount} 件商品)</span>
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
