/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, type MouseEvent } from 'react';
import { Product, CartItem, Order, type Category, ALL_CATEGORY } from './types';
import { INITIAL_PRODUCTS, DEFAULT_CATEGORIES } from './data';
import * as api from './api';
import { PROXY_FEE_RATE } from './utils';
import MobileFrame from './components/MobileFrame';
import ProductCard from './components/ProductCard';
import ProductDetail from './components/ProductDetail';
import CartDrawer from './components/CartDrawer';
import CheckoutModal from './components/CheckoutModal';
import AdminPanel from './components/AdminPanel';
import { Search, ShoppingCart, AlertCircle } from 'lucide-react';

/** 将数据库 ProductRow 转为前端 Product */
function rowToProduct(row: api.ProductRow): Product {
  return {
    id: String(row.id),
    name: row.name,
    category: row.category,
    price: row.price,
    image: row.image_url || '',
    description: row.description || '',
    stock: row.stock,
    limit: 0,
  };
}

/** 将前端 Order 转为数据库 order_items 格式 */
function orderToApiItems(items: CartItem[]): Array<{ product_id: number; product_name: string; price: number; quantity: number }> {
  return items.map(item => ({
    product_id: Number(item.product.id),
    product_name: item.product.name,
    price: item.product.price,
    quantity: item.quantity,
  }));
}

/** 将数据库 OrderRow 转为前端 Order */
function rowToOrder(row: api.OrderRow): Order {
  const dm = row.delivery_method;
  return {
    id: String(row.id),
    phone: row.phone,
    items: (row.order_items || []).map(oi => ({
      productId: String(oi.product_id),
      name: oi.product_name,
      price: oi.price,
      quantity: oi.quantity,
    })),
    totalPrice: row.total_price,
    proxyFee: row.service_fee,
    grandTotal: row.grand_total,
    createdAt: row.created_at,
    deliveryMethod: (dm === 'express' || dm === 'pickup') ? dm : 'pickup',
    location: row.location || undefined,
    status: row.status,
  };
}

export default function App() {
  // --- STATE ---
  const [products, setProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter Status
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Router / Nav State
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Success Feedback Toast or Banner
  const [toastMessage, setToastMessage] = useState('');

  // --- HASH ROUTING: #/admin → admin mode ---
  useEffect(() => {
    const checkHash = () => {
      setIsAdminMode(window.location.hash === '#/admin');
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  // --- DATA LOADING ---
  const loadProducts = useCallback(async () => {
    try {
      const rows = await api.fetchProducts();
      setProducts(rows.map(rowToProduct));
    } catch (err) {
      console.error('加载商品失败:', err);
      // Fallback to initial data and seed
      setProducts(INITIAL_PRODUCTS);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      const rows = await api.fetchOrders();
      setOrders(rows.map(rowToOrder));
    } catch (err) {
      console.error('加载订单失败:', err);
      setOrders([]);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const cats = await api.fetchCategories();
      setCategories(cats);
    } catch (err) {
      console.error('加载分类失败:', err);
      setCategories(DEFAULT_CATEGORIES);
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      const isAdmin = window.location.hash === '#/admin';
      const tasks: Promise<unknown>[] = [loadProducts(), loadCategories()];
      if (isAdmin) tasks.push(loadOrders());
      await Promise.all(tasks);
      // Load cart from localStorage (user-specific, not synced to DB)
      try {
        const storedCart = localStorage.getItem('sam_buyer_cart');
        if (storedCart) setCartItems(JSON.parse(storedCart));
      } catch (parseErr) { console.error('Cart parse error:', parseErr); }
      setLoading(false);
    }
    init();
  }, [loadProducts, loadOrders, loadCategories]);

  // Load orders when entering admin mode
  useEffect(() => {
    if (isAdminMode) loadOrders();
  }, [isAdminMode, loadOrders]);

  // --- PERSISTENCE (Cart only uses localStorage) ---
  const saveCartToLocal = (newCartList: CartItem[]) => {
    setCartItems(newCartList);
    localStorage.setItem('sam_buyer_cart', JSON.stringify(newCartList));
  };

  // --- BUSINESS LOGIC CONTROLS ---

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const handleAddToCart = async (product: Product) => {
    // 实时查询单个商品库存，避免全量拉取
    try {
      const fresh = await api.fetchProductStock(Number(product.id));
      if (fresh.stock <= 0) {
        triggerToast('⚠️ 抱歉，该商品库存不足');
        return;
      }
      const currentStock = fresh.stock;
      const existingIndex = cartItems.findIndex((item) => item.product.id === product.id);
      if (existingIndex > -1) {
        if (cartItems[existingIndex].quantity >= currentStock) {
          triggerToast('⚠️ 购物车数量已达当前库存上限');
          return;
        }
        const updatedCart = [...cartItems];
        updatedCart[existingIndex] = { ...updatedCart[existingIndex], quantity: updatedCart[existingIndex].quantity + 1, product: { ...product, stock: currentStock } };
        saveCartToLocal(updatedCart);
      } else {
        saveCartToLocal([...cartItems, { product: { ...product, stock: currentStock }, quantity: 1 }]);
      }
      triggerToast(`🛒 "${product.name}" 已加购`);
    } catch (stockErr) {
      console.error('Stock check failed, using cached stock:', stockErr);
      // 降级：使用本地缓存的库存
      if (product.stock <= 0) {
        triggerToast('⚠️ 抱歉，该商品库存不足');
        return;
      }
      const existingIndex = cartItems.findIndex((item) => item.product.id === product.id);
      if (existingIndex > -1) {
        if (cartItems[existingIndex].quantity >= product.stock) {
          triggerToast('⚠️ 购物车数量已达当前库存上限');
          return;
        }
        const updatedCart = [...cartItems];
        updatedCart[existingIndex].quantity += 1;
        saveCartToLocal(updatedCart);
      } else {
        saveCartToLocal([...cartItems, { product, quantity: 1 }]);
      }
      triggerToast(`🛒 "${product.name}" 已加购`);
    }
  };

  const handleRemoveFromCart = (product: Product) => {
    const existingIndex = cartItems.findIndex((item) => item.product.id === product.id);
    if (existingIndex === -1) return;
    const newQty = cartItems[existingIndex].quantity - 1;
    let updatedCart: CartItem[];
    if (newQty <= 0) {
      updatedCart = cartItems.filter((item) => item.product.id !== product.id);
    } else {
      updatedCart = [...cartItems];
      updatedCart[existingIndex].quantity = newQty;
    }
    saveCartToLocal(updatedCart);
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    let updatedCart: CartItem[];
    if (quantity <= 0) {
      updatedCart = cartItems.filter((item) => item.product.id !== productId);
    } else {
      const targetItem = cartItems.find((item) => item.product.id === productId);
      if (!targetItem) return;
      if (quantity > targetItem.product.stock) {
        triggerToast(`⚠️ 数量最多为 ${targetItem.product.stock} 件 (受库存限制)`);
        return;
      }
      updatedCart = cartItems.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      );
    }
    saveCartToLocal(updatedCart);
  };

  const handleClearCart = () => {
    saveCartToLocal([]);
    setIsCartOpen(false);
  };

  // Submit order via API
  const handleSubmitOrder = async (order: Order) => {
    try {
      const cartItemsForOrder = cartItems;
      await api.createOrder({
        phone: order.phone,
        location: order.location,
        delivery_method: order.deliveryMethod,
        items: orderToApiItems(cartItemsForOrder),
        total_price: order.totalPrice,
        service_fee: order.proxyFee,
        grand_total: order.grandTotal,
      });
      // Reload data
      await loadProducts();
      await loadOrders();
      saveCartToLocal([]);
      setIsCartOpen(false);
      triggerToast('🎉 登记成功，记得复制清单发至微信哦');
    } catch (err) {
      console.error('提交订单失败:', err);
      triggerToast('❌ 提交失败，请重试');
    }
  };

  // --- ADMIN PANEL BACK-OFFICE CONTROLS ---

  const handleClearOrders = async () => {
    try {
      await api.clearOrders();
      await loadOrders();
      triggerToast('🗑️ 所有订单已清空');
    } catch (err) {
      console.error('清空订单失败:', err);
      triggerToast('❌ 清空订单失败');
    }
  };

  const handleResetToDefaults = async () => {
    try {
      await api.seedCategories(DEFAULT_CATEGORIES);
      await api.seedProducts(INITIAL_PRODUCTS.map(p => ({
        name: p.name,
        category: p.category,
        price: p.price,
        unit: '份',
        stock: p.stock,
        description: p.description,
      })));
      await Promise.all([loadProducts(), loadCategories()]);
      saveCartToLocal([]);
      triggerToast('🔄 系统参数成功初始化');
    } catch (err) {
      console.error('重置失败:', err);
      triggerToast('❌ 重置失败');
    }
  };

  // --- FILTERING GRAPHICS ---
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchText.toLowerCase()) ||
                          p.description.toLowerCase().includes(searchText.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categoryCount = (catId: string) => {
    if (catId === 'all') return products.length;
    return products.filter((p) => p.category === catId).length;
  };

  const cartTotalQty = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotalPrice = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  const renderCategoryIcon = (icon: string) => (
    <span style={{ fontSize: 15, lineHeight: 1 }}>{icon}</span>
  );

  if (loading) {
    return (
      <MobileFrame isAdminMode={false} onExitAdmin={() => {}}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500">加载中...</p>
          </div>
        </div>
      </MobileFrame>
    );
  }

  return (
    <MobileFrame isAdminMode={isAdminMode} onExitAdmin={() => { window.location.hash = '#/'; }}>
      {isAdminMode ? (
        <AdminPanel
          products={products}
          orders={orders}
          categories={categories}
          onClearOrders={handleClearOrders}
          onResetToDefaults={handleResetToDefaults}
          onDataChange={async () => { await Promise.all([loadProducts(), loadOrders(), loadCategories()]); }}
        />
      ) : (
        <div className="flex-1 flex flex-col relative h-full">
          {/* Premium Branded Header Billboard Section */}
          <div className="bg-gradient-to-br from-[#0c4088] to-[#041c40] text-white p-5 text-left select-none shadow-md relative overflow-hidden shrink-0">
            <div className="absolute -right-12 -top-12 w-32 h-32 rounded-full bg-sky-500/10 blur-2xl pointer-events-none" />
            <div className="absolute left-1/4 bottom-0 w-36 h-12 bg-sky-400/5 blur-xl pointer-events-none" />
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="bg-amber-400 text-slate-950 p-1.5 rounded-lg shadow-sm flex items-center justify-center font-black text-xs tracking-wider border border-amber-300">
                  SAM
                </div>
                <div>
                  <h2 className="text-sm font-extrabold tracking-tight flex items-center gap-1.5">
                    <span>山姆快捷代购小铺</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  </h2>
                  <p className="text-[10px] text-sky-200/90 font-medium">Sam's Club Personal Shopper Service</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-white font-extrabold text-[9px] tracking-wide border border-white/10 backdrop-blur-sm shadow-xs shrink-0">
                ⭐ 100% 正品保证
              </span>
            </div>
            <div className="mt-4 flex items-start gap-1 text-[10px] text-sky-100/90 leading-tight">
              <span className="text-amber-300 font-extrabold mr-1 shrink-0">❖</span>
              <p>
                <b>资费说明：</b>代购跑腿代排队劳务服务费按<b>订单商品总额的 8%</b> 收取，提供专业保冷保鲜箱配送。如有疑问请微信对接。
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/5">
              <span className="text-[9px] text-sky-300/80 font-bold tracking-widest uppercase block mb-2">
                限制要求：24小时内配送 • 自助下单流程：
              </span>
              <div className="grid grid-cols-4 gap-1.5 text-center">
                <div className="bg-white/5 rounded-lg p-1.5 border border-white/5 hover:bg-white/10 transition-colors">
                  <span className="text-[8px] font-bold text-sky-300 block mb-0.5">STEP 1</span>
                  <span className="text-[10px] font-extrabold text-sky-50">🛒 选商品</span>
                </div>
                <div className="bg-white/5 rounded-lg p-1.5 border border-white/5 hover:bg-white/10 transition-colors">
                  <span className="text-[8px] font-bold text-sky-300 block mb-0.5">STEP 2</span>
                  <span className="text-[10px] font-extrabold text-sky-50">📝 点结算</span>
                </div>
                <div className="bg-white/5 rounded-lg p-1.5 border border-white/5 hover:bg-white/10 transition-colors">
                  <span className="text-[8px] font-bold text-sky-300 block mb-0.5">STEP 3</span>
                  <span className="text-[10px] font-extrabold text-sky-50">📞 留电话</span>
                </div>
                <div className="bg-white/5 rounded-lg p-1.5 border border-white/5 hover:bg-white/10 transition-colors">
                  <span className="text-[8px] font-bold text-sky-300 block mb-0.5">STEP 4</span>
                  <span className="text-[10px] font-extrabold text-sky-50">📋 复清单</span>
                </div>
              </div>
            </div>
            <div className="mt-3 text-center text-[9px] text-sky-200/50 tracking-wider select-none">
              代购跑腿服务 · 非山姆官方
            </div>
          </div>

          {/* Search Bar */}
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm px-3 py-2.5 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="搜索商品..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
              />
            </div>
            {/* Category Pills */}
            <div className="flex gap-1.5 mt-2 overflow-x-auto no-scrollbar pb-1">
              {[ALL_CATEGORY, ...categories].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                    selectedCategory === cat.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {renderCategoryIcon(cat.icon)}
                  <span>{cat.name}</span>
                  <span className={`text-[10px] ${selectedCategory === cat.id ? 'text-blue-200' : 'text-gray-400'}`}>
                    ({categoryCount(cat.id)})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className={`flex-1 overflow-y-auto no-scrollbar px-3 py-3${cartTotalQty > 0 ? ' pb-28' : ''}`}>
            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <AlertCircle size={40} className="mb-3" />
                <p className="text-sm">暂无商品</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onSelect={setSelectedProduct}
                    onAddToCart={handleAddToCart}
                    cartQuantity={cartItems.find(c => c.product.id === product.id)?.quantity || 0}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Floating Cart Bar */}
          {cartTotalQty > 0 && (
            <div className="absolute bottom-4 left-4 right-4 z-40">
              <div
                onClick={() => setIsCartOpen(true)}
                className="bg-slate-900/90 backdrop-blur-sm text-white rounded-full pl-4 pr-3 py-2.5 shadow-xl flex items-center justify-between border border-slate-800 cursor-pointer hover:bg-slate-950 active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="relative bg-sky-500 p-2 rounded-full text-white shadow-md">
                    <ShoppingCart size={15} strokeWidth={2.5} />
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center border-2 border-slate-900/90">
                      {cartTotalQty}
                    </span>
                  </div>
                  <div className="text-left">
                    <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider select-none">代购车费预估</span>
                    <span className="text-sm font-extrabold font-mono text-red-400 leading-none">
                      ¥{(cartTotalPrice * (1 + PROXY_FEE_RATE)).toFixed(1)}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5 leading-none">
                      含 ${(PROXY_FEE_RATE * 100).toFixed(0)}% 跑腿费 ¥{(cartTotalPrice * PROXY_FEE_RATE).toFixed(1)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e: MouseEvent) => {
                    e.stopPropagation();
                    setIsCheckoutOpen(true);
                  }}
                  className="bg-sky-500 hover:bg-sky-600 text-white text-xs font-extrabold px-5 py-2 rounded-full cursor-pointer transition-colors shadow-sm"
                >
                  去结算 (复制清单)
                </button>
              </div>
            </div>
          )}

          {/* Bottom spacer when cart is visible */}
          {cartTotalQty > 0 && <div className="h-20 shrink-0" />}
        </div>
      )}

      {/* Drawers & Modals */}
      {selectedProduct && (
        <ProductDetail
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
          onRemoveFromCart={handleRemoveFromCart}
          cartQuantity={cartItems.find(c => c.product.id === selectedProduct.id)?.quantity || 0}
        />
      )}

      <CartDrawer
        isOpen={isCartOpen}
        cartItems={cartItems}
        onClose={() => setIsCartOpen(false)}
        onUpdateQuantity={handleUpdateQuantity}
        onClearCart={handleClearCart}
        onCheckout={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        cartItems={cartItems}
        onClose={() => setIsCheckoutOpen(false)}
        onSubmitOrder={handleSubmitOrder}
      />

      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-gray-900/90 text-white text-sm px-4 py-2.5 rounded-xl shadow-xl backdrop-blur-sm animate-bounce">
          {toastMessage}
        </div>
      )}
    </MobileFrame>
  );
}
