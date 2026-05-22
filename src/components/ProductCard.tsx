/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product } from '../types';
import { Plus, Flame, Sparkles } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  cartQuantity: number;
}

export default function ProductCard({ product, onSelect, onAddToCart, cartQuantity }: ProductCardProps) {
  const isOutOfStock = product.stock <= 0;
  const isLimitReached = product.limit > 0 && cartQuantity >= product.limit;
  
  // Choose custom icon for badges
  const getBadgeIcon = (badgeText: string) => {
    if (badgeText.includes('爆款') || badgeText.includes('人气')) {
      return <Flame size={10} className="inline mr-0.5 text-amber-500 fill-amber-500 animate-pulse" />;
    }
    return <Sparkles size={10} className="inline mr-0.5 text-sky-500" />;
  };

  return (
    <div
      onClick={() => onSelect(product)}
      id={`product-card-${product.id}`}
      className={`group relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col cursor-pointer border border-slate-100 ${
        isOutOfStock ? 'opacity-65' : ''
      }`}
    >
      {/* Product Image & Badges */}
      <div className="relative aspect-square w-full bg-slate-100 overflow-hidden">
        <img
          src={product.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600'}
          alt={product.name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            // Fallback image in case the Unsplash link runs into access issues
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600';
          }}
        />

        {/* Popularity Badge */}
        {product.badge && (
          <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[9px] shadow-sm border border-amber-100 flex items-center">
            {getBadgeIcon(product.badge)}
            {product.badge}
          </span>
        )}

        {/* Purchase Limit Indicator */}
        {product.limit > 0 && (
          <span className="absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded bg-slate-900/80 backdrop-blur-mobile text-white text-[9px] font-medium tracking-wide">
            每人限购 {product.limit} 件
          </span>
        )}

        {/* Stock Status Badge */}
        {product.stock > 0 && product.stock <= 5 && (
          <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-red-500 text-white text-[9px] font-semibold tracking-wide animate-pulse shadow-sm">
            🔥 仅剩 {product.stock} 件
          </div>
        )}

        {/* Sold Out Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-10">
            <span className="px-3 py-1.5 rounded-full bg-slate-900/80 text-white font-bold text-xs uppercase tracking-widest border border-slate-600 shadow-md">
              已售罄 (Sold Out)
            </span>
          </div>
        )}
      </div>

      {/* Info details */}
      <div className="p-3 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-slate-800 text-xs sm:text-sm line-clamp-1 group-hover:text-sky-600 transition-colors">
            {product.name}
          </h3>
          <p className="text-slate-400 text-[10px] line-clamp-2 mt-1 leading-normal">
            {product.description}
          </p>
        </div>

        <div className="mt-2.5 pt-2 border-t border-slate-50 flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-bold text-red-500">¥</span>
              <span className="text-sm sm:text-base font-extrabold text-red-500 font-mono leading-none">
                {product.price.toFixed(1)}
              </span>
              {product.originalPrice && (
                <span className="text-[10px] text-slate-400 line-through font-mono">
                  ¥{product.originalPrice.toFixed(1)}
                </span>
              )}
            </div>
            <span className="text-[9px] text-slate-400 font-medium">代购跑腿费 8%</span>
          </div>

          {/* Rapid Add To Cart Trigger */}
          <button
            onClick={(e) => {
              e.stopPropagation(); // Avoid popping details drawer
              if (!isOutOfStock && !isLimitReached) {
                onAddToCart(product);
              }
            }}
            disabled={isOutOfStock || isLimitReached}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
              isOutOfStock
                ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                : isLimitReached
                ? 'bg-indigo-50 text-indigo-400 border border-indigo-100 cursor-not-allowed text-[10px] font-semibold'
                : 'bg-sky-500 text-white hover:bg-sky-600 shadow-md active:scale-95'
            }`}
            title={isLimitReached ? '已达限购' : '加入购物车'}
          >
            {isLimitReached ? (
              <span className="text-[9px] font-bold">满</span>
            ) : (
              <Plus size={14} strokeWidth={2.5} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
