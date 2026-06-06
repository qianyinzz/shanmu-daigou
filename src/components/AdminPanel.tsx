/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useRef, useEffect, type FormEvent } from 'react';
import { Product, Order, type Category } from '../types';
import * as api from '../api';
import { Trash2, ClipboardList, PackagePlus, RotateCcw, ShoppingBag, Lock, BarChart3, Download, MapPin, TrendingUp, Package, Filter, Upload, X, Pencil, Tag, ChevronDown, GripVertical, Check } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface AdminPanelProps {
  products: Product[];
  orders: Order[];
  categories: Category[];
  onClearOrders: () => void;
  onResetToDefaults: () => void;
  onDataChange: () => void;
}

/** 可拖拽排序的单个商品项 */
function SortableProductItem({ product, index, onManualSort }: { product: Product; index: number; onManualSort: (id: string, newIndexStr: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id });

  const [inputValue, setInputValue] = useState(String(index + 1));

  // 当外部索引改变时（例如拖拽后），同步更新输入框的值
  useEffect(() => {
    setInputValue(String(index + 1));
  }, [index]);

  const handleSubmit = () => {
    // 只有当值真的改变且不为空时才提交
    if (inputValue.trim() !== '' && inputValue !== String(index + 1)) {
      onManualSort(product.id, inputValue);
    } else {
      // 还原旧值
      setInputValue(String(index + 1));
    }
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    position: 'relative' as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-xl p-2.5 border shadow-xs flex items-center gap-2.5 transition-shadow ${
        isDragging
          ? 'border-violet-400 shadow-lg shadow-violet-200/50 ring-2 ring-violet-300/40 opacity-95 scale-[1.02]'
          : 'border-violet-200'
      }`}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="touch-none p-1.5 rounded-lg bg-violet-50 text-violet-400 hover:bg-violet-100 hover:text-violet-600 transition-colors cursor-grab active:cursor-grabbing shrink-0"
        title="按住拖拽排序"
      >
        <GripVertical size={16} />
      </button>

      {/* Manual Sort Input */}
      <input
        type="number"
        min="1"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur();
          }
        }}
        className="text-[11px] font-mono font-bold text-violet-600 bg-violet-50 w-8 py-0.5 text-center shrink-0 border border-violet-200 rounded focus:outline-none focus:border-violet-500 focus:bg-white transition-colors"
        title="直接输入序号可快速排序"
      />

      <img
        src={product.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600'}
        alt={product.name}
        referrerPolicy="no-referrer"
        className="w-10 h-10 rounded-lg object-cover bg-slate-50 shrink-0 border border-slate-100"
        onError={(e) => {
          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600';
        }}
      />

      <div className="flex-1 min-w-0">
        <h4 className="font-extrabold text-slate-800 text-xs truncate">{product.name}</h4>
        <span className="text-[10px] text-slate-400 font-mono">¥{product.price}</span>
      </div>
    </div>
  );
}

export default function AdminPanel({
  products,
  orders,
  categories,
  onClearOrders,
  onResetToDefaults,
  onDataChange,
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'analytics' | 'categories' | 'add'>('products');

  // Password change state
  const [showPwdChange, setShowPwdChange] = useState(false);
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Order filter state
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');

  const handleChangePassword = async () => {
    setPwdMsg(null);
    if (newPwd.length < 4) {
      setPwdMsg({ type: 'err', text: '新密码至少4位' });
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdMsg({ type: 'err', text: '两次输入的密码不一致' });
      return;
    }
    try {
      const newToken = await api.changePassword(oldPwd, newPwd);
      api.setAuthToken(newToken);
      setPwdMsg({ type: 'ok', text: '密码修改成功！' });
      setOldPwd('');
      setNewPwd('');
      setConfirmPwd('');
      setTimeout(() => {
        setShowPwdChange(false);
        setPwdMsg(null);
      }, 1500);
    } catch (err) {
      setPwdMsg({ type: 'err', text: (err as Error).message || '修改密码失败' });
    }
  };

  // Category form state
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catId, setCatId] = useState('');
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('📦');
  const [catSortOrder, setCatSortOrder] = useState('0');
  const [catFormError, setCatFormError] = useState('');
  const [catFormSuccess, setCatFormSuccess] = useState(false);

  const startEditCategory = (cat: Category) => {
    setEditingCatId(cat.id);
    setCatId(cat.id);
    setCatName(cat.name);
    setCatIcon(cat.icon);
    setCatSortOrder(String(cat.sort_order));
    setCatFormError('');
    setCatFormSuccess(false);
    setActiveTab('categories');
  };

  const cancelCategoryEdit = () => {
    setEditingCatId(null);
    setCatId('');
    setCatName('');
    setCatIcon('📦');
    setCatSortOrder('0');
    setCatFormError('');
    setCatFormSuccess(false);
  };

  const handleCategorySubmit = async (e: FormEvent) => {
    e.preventDefault();
    setCatFormError('');
    setCatFormSuccess(false);

    if (!catId.trim() || !catName.trim()) {
      setCatFormError('请填写分类ID和名称');
      return;
    }

    const sortOrder = parseInt(catSortOrder) || 0;

    try {
      if (editingCatId) {
        await api.updateCategory(editingCatId, { name: catName.trim(), icon: catIcon, sort_order: sortOrder });
      } else {
        await api.createCategory({ id: catId.trim(), name: catName.trim(), icon: catIcon, sort_order: sortOrder });
      }
      await onDataChange();
      setCatFormSuccess(true);
      cancelCategoryEdit();
      setTimeout(() => setCatFormSuccess(false), 1500);
    } catch (err) {
      console.error('保存分类失败:', err);
      setCatFormError((err as Error).message || '保存分类失败');
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    if (!window.confirm(`确认删除分类"${cat.name}"？如果该分类下有商品则无法删除。`)) return;
    try {
      await api.deleteCategory(cat.id);
      await onDataChange();
    } catch (err) {
      console.error('删除分类失败:', err);
      alert((err as Error).message || '删除分类失败');
    }
  };

  // --- CSV EXPORT ---
  const exportOrdersCSV = () => {
    if (orders.length === 0) return;
    const headers = ['订单号', '状态', '下单时间', '手机号', '自提站点', '详细地址', '商品清单', '商品金额', '代购费', '应付总计', '备注'];
    const statusMap: Record<string, string> = { pending: '待处理', completed: '已完成', cancelled: '已取消' };
    const rows = orders.map((o) => {
      const itemsStr = o.items.map((it) => `${it.name}x${it.quantity}`).join('; ');
      return [
        o.id,
        statusMap[o.status] || o.status,
        new Date(o.createdAt).toLocaleString('zh-CN'),
        o.phone,
        o.location || '',
        o.address || '',
        `"${itemsStr}"`,
        o.totalPrice.toFixed(2),
        o.proxyFee.toFixed(2),
        o.grandTotal.toFixed(2),
        o.notes || '',
      ];
    });
    const bom = '\uFEFF';
    const csvContent = bom + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `山姆代购订单_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // --- ANALYTICS COMPUTATIONS ---
  const analytics = useMemo(() => {
    const pendingOrders = orders.filter((o) => o.status === 'pending');
    const completedOrders = orders.filter((o) => o.status === 'completed');

    // Location distribution (from all orders with location)
    const locationMap = new Map<string, { count: number; revenue: number }>();
    orders.forEach((o) => {
      const loc = o.location || '未选择站点';
      const cur = locationMap.get(loc) || { count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += o.grandTotal;
      locationMap.set(loc, cur);
    });
    const locationData = Array.from(locationMap.entries())
      .map(([name, data]) => ({ name, count: data.count, revenue: data.revenue }))
      .sort((a, b) => b.count - a.count);
    const maxLocationCount = Math.max(...locationData.map((d) => d.count), 1);

    // Product sales ranking
    const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    orders.forEach((o) => {
      o.items.forEach((item) => {
        const cur = productMap.get(item.productId) || { name: item.name, quantity: 0, revenue: 0 };
        cur.quantity += item.quantity;
        cur.revenue += item.price * item.quantity;
        productMap.set(item.productId, cur);
      });
    });
    const productSales = Array.from(productMap.values()).sort((a, b) => b.quantity - a.quantity);
    const maxProductQty = Math.max(...productSales.map((p) => p.quantity), 1);

    // Daily trend (last 14 days)
    const now = new Date();
    const dailyMap = new Map<string, { count: number; revenue: number }>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      dailyMap.set(key, { count: 0, revenue: 0 });
    }
    orders.forEach((o) => {
      const d = new Date(o.createdAt);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      const cur = dailyMap.get(key);
      if (cur) {
        cur.count += 1;
        cur.revenue += o.grandTotal;
      }
    });
    const dailyTrend = Array.from(dailyMap.entries()).map(([date, data]) => ({ date, ...data }));
    const maxDailyCount = Math.max(...dailyTrend.map((d) => d.count), 1);

    // Totals
    const totalRevenue = orders.reduce((s, o) => s + o.grandTotal, 0);
    const totalItems = orders.reduce((s, o) => s + o.items.reduce((si, it) => si + it.quantity, 0), 0);

    return {
      pendingOrders,
      completedOrders,
      locationData,
      maxLocationCount,
      productSales,
      maxProductQty,
      dailyTrend,
      maxDailyCount,
      totalRevenue,
      totalItems,
    };
  }, [orders]);

  // New Product Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('bakery');
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [stock, setStock] = useState('20');
  const [limit, setLimit] = useState('2');
  const [isHot, setIsHot] = useState(false);
  const [imageKey, setImageKey] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const uploadingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState('');
  const [badge, setBadge] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Admin Product Category Filter
  const [adminCategoryFilter, setAdminCategoryFilter] = useState<string>('all');
  const displayProducts = useMemo(() => {
    if (adminCategoryFilter === 'all') return products;
    return products.filter(p => {
      if (adminCategoryFilter === 'hot') {
        return p.category === 'hot' || p.is_hot;
      }
      return p.category === adminCategoryFilter;
    });
  }, [products, adminCategoryFilter]);

  // Product sort mode state
  const [sortMode, setSortMode] = useState(false);
  const [sortedProducts, setSortedProducts] = useState<Product[]>([]);
  const [savingSortOrder, setSavingSortOrder] = useState(false);
  const [sortSaveSuccess, setSortSaveSuccess] = useState(false);
  const [isCategorizing, setIsCategorizing] = useState(false);

  // Enter sort mode: copy current products for reordering
  const enterSortMode = () => {
    setSortedProducts([...displayProducts]);
    setSortMode(true);
    setSortSaveSuccess(false);
  };

  const exitSortMode = () => {
    setSortMode(false);
    setSortedProducts([]);
    setSortSaveSuccess(false);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortedProducts.findIndex((p) => p.id === String(active.id));
    const newIndex = sortedProducts.findIndex((p) => p.id === String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    setSortedProducts(arrayMove(sortedProducts, oldIndex, newIndex));
  };

  const handleManualSort = (id: string, newIndexStr: string) => {
    const parsed = parseInt(newIndexStr, 10);
    if (isNaN(parsed) || parsed < 1) return;
    const oldIndex = sortedProducts.findIndex((p) => p.id === id);
    if (oldIndex === -1) return;
    
    // 转换为 0-based index，并限制在合法范围内
    let newIndex = parsed - 1;
    newIndex = Math.max(0, Math.min(newIndex, sortedProducts.length - 1));
    
    if (oldIndex !== newIndex) {
      setSortedProducts(arrayMove(sortedProducts, oldIndex, newIndex));
    }
  };

  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 5 } });
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } });
  const sensors = useSensors(pointerSensor, touchSensor);

  const handleSaveSortOrder = async () => {
    setSavingSortOrder(true);
    try {
      const originalSortOrders = displayProducts.map(p => p.sort_order || 0).sort((a, b) => a - b);
      const items = sortedProducts.map((p, idx) => ({
        id: Number(p.id),
        sort_order: (typeof originalSortOrders[idx] === 'number' && !isNaN(originalSortOrders[idx])) ? originalSortOrders[idx] : idx,
      }));
      await api.reorderProducts(items);
      await onDataChange();
      setSortSaveSuccess(true);
      setTimeout(() => {
        exitSortMode();
      }, 1200);
    } catch (err) {
      console.error('保存排序失败:', err);
      alert('保存排序失败: ' + ((err as Error).message || err));
    } finally {
      setSavingSortOrder(false);
    }
  };

  const handleAutoCategorize = async () => {
    if (!window.confirm('是否使用 AI 对当前显示的所有商品进行一键智能分类？\n注意：分类结果可能会被直接覆盖保存。')) return;
    setIsCategorizing(true);
    try {
      const productIds = displayProducts.map(p => Number(p.id));
      const res = await api.autoCategorizeProducts(productIds);
      await onDataChange();
      alert(`智能分类完成！成功更新了 ${res.updated} 个商品。`);
    } catch (err) {
      console.error('智能分类失败:', err);
      alert('智能分类失败: ' + ((err as Error).message || err));
    } finally {
      setIsCategorizing(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };
    if (showCategoryDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCategoryDropdown]);

  const startEditProduct = (p: Product) => {
    setEditingProductId(Number(p.id));
    setName(p.name);
    setCategory(p.category);
    setPrice(String(p.price));
    setStock(String(p.stock));
    setImageKey('');
    setImagePreview(p.image || '');
    setImageFile(null);
    setDescription(p.description || '');
    setBadge(p.badge || '');
    setLimit(String(p.limit || 0));
    setIsHot(Boolean(p.is_hot));
    setFormError('');
    setFormSuccess(false);
    setActiveTab('add');
  };

  const cancelEdit = () => {
    setEditingProductId(null);
    setName('');
    setCategory('bakery');
    setPrice('');
    setOriginalPrice('');
    setStock('20');
    setLimit('2');
    setIsHot(false);
    setImageKey('');
    setImageFile(null);
    setImagePreview('');
    setDescription('');
    setBadge('');
    setFormError('');
    setFormSuccess(false);
    setActiveTab('products');
  };

  const handleProductSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setFormError('');
    setFormSuccess(false);

    if (!name.trim() || !category || !price) {
      setFormError('请填写商品名称、分类和原价/代购价');
      return;
    }

    const numericalPrice = parseFloat(price);
    if (isNaN(numericalPrice) || numericalPrice <= 0) {
      setFormError('请输入正数价格');
      return;
    }

    const numericalStock = 99999;

    const numericalLimit = parseInt(limit);
    if (isNaN(numericalLimit) || numericalLimit < 0) {
      setFormError('限购数量必须为不小于0的整数(0为不限购)');
      return;
    }

    setSubmitting(true);

    let finalImageKey = imageKey.trim();
    // Upload image file if selected
    if (imageFile) {
      try {
        uploadingRef.current = true;
        const result = await api.uploadImage(imageFile);
        finalImageKey = result.key;
        setImageKey(finalImageKey);
        setImageFile(null);
      } catch (err) {
        console.error('图片上传失败:', err);
        setFormError('图片上传失败，请重试');
        uploadingRef.current = false;
        setSubmitting(false);
        return;
      }
      uploadingRef.current = false;
    }

    try {
      if (editingProductId) {
        // Update existing product — only send image_key if a new image was uploaded
        const updates: Record<string, unknown> = {
          name: name.trim(),
          category,
          price: numericalPrice,
          unit: '份',
          stock: numericalStock,
          purchase_limit: numericalLimit,
          is_hot: isHot,
          description: description.trim() || '山姆精选代购商品。由于商品抢购火爆，请在下单后向代购确认具体交货时效。',
        };
        if (finalImageKey) {
          updates.image_key = finalImageKey;
        }
        await api.updateProduct(editingProductId, updates);
      } else {
        // Create new product
        await api.createProduct({
          name: name.trim(),
          category,
          price: numericalPrice,
          unit: '份',
          stock: numericalStock,
          purchase_limit: numericalLimit,
          is_hot: isHot,
          image_key: finalImageKey || null,
          description: description.trim() || '山姆精选代购商品。由于商品抢购火爆，请在下单后向代购确认具体交货时效。',
        });
      }
      // 立即刷新数据以获取最新图片URL，再切回列表
      await onDataChange();
      setFormSuccess(true);
      setEditingProductId(null);

      setName('');
      setPrice('');
      setOriginalPrice('');
      setStock('20');
      setLimit('2');
      setIsHot(false);
      setImageKey('');
      setImageFile(null);
      setImagePreview('');
      setDescription('');
      setBadge('');

      setTimeout(() => {
        setActiveTab('products');
        setFormSuccess(false);
      }, 1500);
    } catch (err) {
      console.error(editingProductId ? '修改商品失败:' : '添加商品失败:', err);
      setFormError(editingProductId ? '修改商品失败，请重试' : '添加商品失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLimitUpdate = async (p: Product, newLimitStr: string) => {
    const val = parseInt(newLimitStr);
    if (!isNaN(val) && val >= 0) {
      try {
        await api.updateProduct(Number(p.id), { purchase_limit: val });
        await onDataChange();
      } catch (err) {
        console.error('更新限购失败:', err);
      }
    }
  };

  const handlePriceUpdate = async (p: Product, newPriceStr: string) => {
    const val = parseFloat(newPriceStr);
    if (!isNaN(val) && val >= 0) {
      try {
        await api.updateProduct(Number(p.id), { price: val });
        await onDataChange();
      } catch (err) {
        console.error('更新价格失败:', err);
      }
    }
  };

  const handleCategoryUpdate = async (p: Product, newCategoryId: string) => {
    try {
      await api.updateProduct(Number(p.id), { category: newCategoryId });
      await onDataChange();
    } catch (err) {
      console.error('更新分类失败:', err);
    }
  };

  const handleHotToggle = async (p: Product) => {
    try {
      await api.updateProduct(Number(p.id), { is_hot: !p.is_hot });
      await onDataChange();
    } catch (err) {
      console.error('更新推荐爆款状态失败:', err);
    }
  };

  const filteredOrders = orderFilter === 'all' ? orders : orders.filter((o) => o.status === orderFilter);
  const statusMap: Record<string, { label: string; color: string }> = {
    pending: { label: '待处理', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    completed: { label: '已完成', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    cancelled: { label: '已取消', color: 'bg-slate-100 text-slate-500 border-slate-200' },
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-slate-50 font-sans">
      {/* Top Admin Dashboard Control Rail */}
      <div className="bg-slate-900 text-white px-4 py-2.5 flex flex-wrap gap-2 items-center justify-between shadow-md shrink-0">
        <span className="text-xs font-bold tracking-wider flex items-center gap-1">
          ⚙️ 商家后台管理控制台
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowPwdChange(!showPwdChange); setPwdMsg(null); }}
            className="text-sky-300 hover:text-sky-200 font-bold text-[10px] flex items-center gap-1 border border-sky-500/30 px-2 py-0.5 rounded hover:bg-sky-500/10 cursor-pointer"
          >
            <Lock size={11} />
            <span>修改密码</span>
          </button>
          <button
            onClick={() => {
              if (window.confirm('重置会还原默认产品列表，自定义产品将会被清空，确定吗？')) {
                onResetToDefaults();
              }
            }}
            className="text-amber-400 hover:text-amber-500 font-bold text-[10px] flex items-center gap-1 border border-amber-500/30 px-2 py-0.5 rounded hover:bg-amber-500/10 cursor-pointer"
          >
            <RotateCcw size={11} />
            <span>初始化出厂名单</span>
          </button>
        </div>
      </div>

      {/* Password Change Panel */}
      {showPwdChange && (
        <div className="bg-slate-800 px-4 py-3 shrink-0 border-b border-slate-700">
          <div className="max-w-xs mx-auto space-y-2">
            <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">修改后台管理密码</h4>
            <input
              type="password"
              value={oldPwd}
              onChange={(e) => setOldPwd(e.target.value)}
              placeholder="原密码"
              className="w-full text-xs bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
            />
            <input
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="新密码 (至少4位)"
              className="w-full text-xs bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
            />
            <input
              type="password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              placeholder="确认新密码"
              className="w-full text-xs bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
            />
            {pwdMsg && (
              <p className={`text-[10px] font-bold text-center py-1 rounded ${pwdMsg.type === 'ok' ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>
                {pwdMsg.text}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => { setShowPwdChange(false); setPwdMsg(null); }}
                className="flex-1 text-[10px] font-bold text-slate-400 py-1.5 rounded-lg border border-slate-600 hover:bg-slate-700 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleChangePassword}
                className="flex-1 text-[10px] font-extrabold text-white bg-sky-600 hover:bg-sky-500 py-1.5 rounded-lg transition-colors"
              >
                确认修改
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Local Navigation Tabs */}
      <div className="bg-white border-b border-slate-200 flex select-none shrink-0 text-xs">
        <button
          onClick={() => setActiveTab('products')}
          className={`flex-1 py-3 text-center font-bold tracking-wide transition-colors border-b-2 flex items-center justify-center gap-1 ${
            activeTab === 'products'
              ? 'border-sky-500 text-sky-600 font-extrabold bg-sky-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <ShoppingBag size={14} />
          <span>商品 ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`relative flex-1 py-3 text-center font-bold tracking-wide transition-colors border-b-2 flex items-center justify-center gap-1 ${
            activeTab === 'orders'
              ? 'border-sky-500 text-sky-600 font-extrabold bg-sky-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <ClipboardList size={14} />
          <span>订单 ({orders.length})</span>
          {analytics.pendingOrders.length > 0 && (
            <span className="absolute top-2 right-4 w-4 h-4 rounded-full bg-red-500 text-[9px] font-extrabold text-white flex items-center justify-center">
              {analytics.pendingOrders.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex-1 py-3 text-center font-bold tracking-wide transition-colors border-b-2 flex items-center justify-center gap-1 ${
            activeTab === 'analytics'
              ? 'border-sky-500 text-sky-600 font-extrabold bg-sky-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <BarChart3 size={14} />
          <span>分析</span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`flex-1 py-3 text-center font-bold tracking-wide transition-colors border-b-2 flex items-center justify-center gap-1 ${
            activeTab === 'categories'
              ? 'border-sky-500 text-sky-600 font-extrabold bg-sky-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Tag size={14} />
          <span>分类 ({categories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('add')}
          className={`flex-1 py-3 text-center font-bold tracking-wide transition-colors border-b-2 flex items-center justify-center gap-1 ${
            activeTab === 'add'
              ? 'border-sky-500 text-sky-600 font-extrabold bg-sky-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <PackagePlus size={14} />
          <span>{editingProductId ? '编辑' : '添品'}</span>
        </button>
      </div>

      {/* Main Back-office view window */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* ===== Products Manager View ===== */}
        {activeTab === 'products' && (
          <div className="space-y-3 pb-8">
            <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-2 border-l-4 border-sky-500 pl-2 flex items-center justify-between">
              <span>{sortMode ? '拖拽排序模式 — 调整后点“保存排序”' : '实时商品价格与限购调整 (修改立即生效)'}</span>
              <div className="flex items-center gap-1.5">
                {!sortMode ? (
                  <>
                  <button
                    onClick={() => {
                      if (adminCategoryFilter === 'all') {
                        alert('请先在下方选择一个具体分类，然后再进行排序');
                        return;
                      }
                      if (displayProducts.length === 0) {
                        alert('当前分类下没有商品，无法排序');
                        return;
                      }
                      enterSortMode();
                    }}
                    className={`text-[10px] font-bold flex items-center gap-1 border px-2 py-1 rounded-lg transition-colors ${
                      adminCategoryFilter === 'all'
                        ? 'text-slate-400 border-slate-200 bg-slate-50 cursor-not-allowed'
                        : 'text-violet-600 border-violet-300 hover:bg-violet-50 cursor-pointer'
                    }`}
                    title={adminCategoryFilter === 'all' ? '请先选择一个分类' : '对当前分类进行排序'}
                  >
                    <GripVertical size={12} />
                    <span>分类排序</span>
                  </button>
                  <button
                    onClick={handleAutoCategorize}
                    disabled={isCategorizing || displayProducts.length === 0}
                    className="text-[10px] font-bold flex items-center gap-1 border border-blue-300 text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 cursor-pointer"
                    title="使用大模型对当前商品智能分类"
                  >
                    <span>{isCategorizing ? '分类中...' : '🤖 智能分类'}</span>
                  </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={exitSortMode}
                      className="text-[10px] font-bold text-slate-500 flex items-center gap-1 border border-slate-300 px-2 py-1 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <X size={11} />
                      <span>取消</span>
                    </button>
                    <button
                      onClick={handleSaveSortOrder}
                      disabled={savingSortOrder}
                      className="text-[10px] font-extrabold text-white bg-violet-500 hover:bg-violet-600 flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Check size={11} />
                      <span>{savingSortOrder ? '保存中...' : '保存排序'}</span>
                    </button>
                  </>
                )}
              </div>
            </h3>

            {sortSaveSuccess && (
              <div className="text-emerald-700 text-[10px] bg-emerald-50 p-2 rounded-lg border border-emerald-100 font-bold text-center">
                ✨ 排序已保存，前台展示顺序已更新！
              </div>
            )}

            {!sortMode && (
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 mb-2">
                <button
                  onClick={() => setAdminCategoryFilter('all')}
                  className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold transition-colors ${
                    adminCategoryFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 border border-slate-200'
                  }`}
                >
                  全部商品
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setAdminCategoryFilter(cat.id)}
                    className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold transition-colors flex items-center gap-1 ${
                      adminCategoryFilter === cat.id ? 'bg-sky-500 text-white border-sky-500' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-[12px] leading-none">{cat.icon}</span>
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>
            )}

            {displayProducts.length === 0 ? (
              <div className="bg-white rounded-xl p-8 border border-slate-200 text-center text-slate-400">
                <p className="text-xs font-semibold">{products.length === 0 ? '暂无在售商品，点击上方"添品"自主上架！' : '该分类下暂无商品'}</p>
              </div>
            ) : sortMode ? (
              /* === Drag-and-Drop Sort Mode UI === */
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={sortedProducts.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1.5">
                    {sortedProducts.map((p, idx) => (
                      <SortableProductItem key={p.id} product={p} index={idx} onManualSort={handleManualSort} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="space-y-2.5">
                {displayProducts.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs flex items-center gap-3"
                  >
                    <img
                      src={p.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600'}
                      alt={p.name}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-lg object-cover bg-slate-50 shrink-0 border border-slate-100"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600';
                      }}
                    />

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <select
                          value={p.category}
                          onChange={(e) => handleCategoryUpdate(p, e.target.value)}
                          className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-1 py-0.5 rounded shrink-0 border-none outline-none focus:ring-0 cursor-pointer max-w-[80px] truncate"
                        >
                          {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                          ))}
                        </select>
                        <h4 className="font-extrabold text-slate-800 text-xs truncate">{p.name}</h4>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400 font-bold">单价:¥</span>
                          <input
                            type="number"
                            step="0.1"
                            value={p.price}
                            onChange={(e) => handlePriceUpdate(p, e.target.value)}
                            className="w-14 bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-[11px] font-mono font-bold focus:bg-white text-slate-800 focus:outline-none"
                            placeholder="价格"
                          />
                        </div>

                        <div className="flex items-center gap-1 justify-end">
                          <span className="text-[10px] text-slate-400 font-bold">限购:</span>
                          <input
                            type="number"
                            value={p.limit}
                            onChange={(e) => handleLimitUpdate(p, e.target.value)}
                            className="w-12 border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white rounded px-1 py-0.5 text-[11px] font-mono font-bold text-center focus:outline-none"
                            title="0为不限购"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleHotToggle(p)}
                      className={`p-1.5 rounded-lg transition-colors shrink-1 cursor-pointer ${
                        p.is_hot 
                          ? 'bg-amber-100 text-amber-600 border border-amber-200 shadow-inner' 
                          : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                      }`}
                      title={p.is_hot ? "取消推荐爆款" : "设为推荐爆款"}
                    >
                      <span className="text-[14px] leading-none select-none">{p.is_hot ? '🔥' : '♨️'}</span>
                    </button>
                    <button
                      onClick={() => startEditProduct(p)}
                      className="p-1.5 rounded-lg bg-sky-50 text-sky-500 hover:bg-sky-100 transition-colors shrink-1 cursor-pointer"
                      title="编辑商品"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={async () => {
                        if (window.confirm(`确认永久删除"${p.name}"商品吗？`)) {
                          await api.deleteProduct(Number(p.id));
                          await onDataChange();
                        }
                      }}
                      className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors shrink-1 cursor-pointer"
                      title="删除产品"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== Orders Management View ===== */}
        {activeTab === 'orders' && (
          <div className="space-y-3 pb-8">
            <div className="flex flex-col gap-2 mb-2">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider border-l-4 border-sky-500 pl-2">
                  代购订单登记台账
                </h3>
                <div className="flex items-center gap-2">
                  {orders.length > 0 && (
                    <button
                      onClick={exportOrdersCSV}
                      className="text-emerald-600 hover:text-emerald-700 text-[10px] font-extrabold flex items-center gap-0.5 border border-emerald-300 px-2 py-0.5 rounded hover:bg-emerald-50 cursor-pointer"
                    >
                      <Download size={11} />
                      <span>导出CSV</span>
                    </button>
                  )}
                  {orders.length > 0 && (
                    <button
                      onClick={() => {
                        if (window.confirm('确定一键清空全部历史记录吗？')) {
                          onClearOrders();
                        }
                      }}
                      className="text-red-500 hover:text-red-600 text-[10px] font-extrabold flex items-center gap-0.5"
                    >
                      <Trash2 size={11} />
                      <span>清空</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Order status filter tabs */}
              <div className="flex gap-1">
                {(['all', 'pending', 'completed', 'cancelled'] as const).map((f) => {
                  const count = f === 'all' ? orders.length : orders.filter((o) => o.status === f).length;
                  const labels = { all: '全部', pending: '待处理', completed: '已完成', cancelled: '已取消' };
                  return (
                    <button
                      key={f}
                      onClick={() => setOrderFilter(f)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer ${
                        orderFilter === f
                          ? 'bg-sky-500 text-white'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      <Filter size={10} />
                      {labels[f]} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="bg-white rounded-xl p-8 border border-slate-200 text-center text-slate-400">
                <p className="text-xs font-semibold">{orderFilter === 'all' ? '暂无任何客户提交代购登记数据' : `没有${statusMap[orderFilter]?.label || ''}订单`}</p>
                <p className="text-[10px] text-slate-400 mt-1">当买家在前台购物车勾选"结算"并登记电话时，即会显示在此处。</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map((o) => (
                  <div
                    key={o.id}
                    className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3 text-xs"
                  >
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <div className="flex flex-col">
                        <span className="font-extrabold text-slate-800 text-[11px] font-mono">{o.id}</span>
                        <span className="text-[9px] text-slate-400">
                          {new Date(o.createdAt).toLocaleString('zh-CN')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusMap[o.status]?.color || 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                          {statusMap[o.status]?.label || o.status}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700">
                          {o.deliveryMethod === 'express' ? '🛵 派送' : '🏪 自提'}
                        </span>
                      </div>
                    </div>

                    {/* Order items summary */}
                    <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider select-none mb-1">
                        订购明细：
                      </p>
                      {o.items.map((it) => (
                        <div key={it.productId} className="flex justify-between text-[11px] text-slate-700 font-medium">
                          <span>{it.name}</span>
                          <span className="font-mono text-slate-500">
                            x{it.quantity} (¥{it.price.toFixed(1)})
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Client meta specs */}
                    <div className="space-y-1 text-[11px]">
                      <div>
                        <span className="text-slate-400 font-bold">客户电话: </span>
                        <span className="font-bold text-slate-800 bg-sky-50/50 px-1 py-0.2 rounded border border-sky-100 font-mono">
                          {o.phone}
                        </span>
                      </div>
                      
                      {o.location && (
                        <div>
                          <span className="text-slate-400 font-bold">自提站点: </span>
                          <span className="font-bold text-violet-700 bg-violet-50 px-1 py-0.2 rounded border border-violet-100">
                            📍 {o.location}
                          </span>
                        </div>
                      )}

                      {o.address && (
                        <div>
                          <span className="text-slate-400 font-bold">详细地址: </span>
                          <span className="text-slate-700">{o.address}</span>
                        </div>
                      )}

                      {o.notes && (
                        <div className="text-amber-700 bg-amber-50 p-1.5 rounded border border-amber-100/30 text-[10px]">
                          <b>客户备注: </b> {o.notes}
                        </div>
                      )}
                    </div>

                    {/* Pricing aggregates and actions */}
                    <div className="flex justify-between items-center pt-2.5 border-t border-slate-100">
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase">预计收款额</span>
                        <span className="text-red-500 font-extrabold font-mono text-xs">
                          ¥{o.grandTotal.toFixed(1)}
                        </span>
                      </div>

                      <div className="flex gap-1.5">
                        {o.status === 'pending' && (
                          <>
                            <button
                              onClick={async () => { await api.updateOrderStatus(Number(o.id), 'completed'); onDataChange(); }}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer"
                            >
                              ✔ 办结
                            </button>
                            <button
                              onClick={async () => {
                                if (window.confirm('确认取消此订单？库存将自动回补')) {
                                  await api.updateOrderStatus(Number(o.id), 'cancelled');
                                  onDataChange();
                                }
                              }}
                              className="bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold text-[10px] px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                            >
                              ✕ 取消
                            </button>
                          </>
                        )}
                        {o.status === 'completed' && (
                          <span className="text-emerald-600 text-[10px] font-bold">✔ 已办结</span>
                        )}
                        {o.status === 'cancelled' && (
                          <span className="text-slate-400 text-[10px] font-bold">已取消</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== Analytics Dashboard View ===== */}
        {activeTab === 'analytics' && (
          <div className="space-y-4 pb-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">总订单数</p>
                <p className="text-xl font-extrabold text-slate-800 mt-1">{orders.length}</p>
                <p className="text-[9px] text-amber-500 font-bold mt-0.5">待处理 {analytics.pendingOrders.length}</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">总营业额</p>
                <p className="text-xl font-extrabold text-red-500 mt-1">¥{analytics.totalRevenue.toFixed(0)}</p>
                <p className="text-[9px] text-emerald-500 font-bold mt-0.5">已入账 ¥{analytics.completedOrders.reduce((s, o) => s + o.grandTotal, 0).toFixed(0)}</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">售出商品总数</p>
                <p className="text-xl font-extrabold text-sky-600 mt-1">{analytics.totalItems}</p>
                <p className="text-[9px] text-slate-400 font-bold mt-0.5">SKU {analytics.productSales.length}种</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">客单价</p>
                <p className="text-xl font-extrabold text-violet-600 mt-1">
                  ¥{orders.length > 0 ? (analytics.totalRevenue / orders.length).toFixed(0) : '0'}
                </p>
                <p className="text-[9px] text-slate-400 font-bold mt-0.5">平均每单</p>
              </div>
            </div>

            {/* Export Button */}
            {orders.length > 0 && (
              <button
                onClick={exportOrdersCSV}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-extrabold py-2.5 rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Download size={14} />
                导出全部订单为 CSV 文件
              </button>
            )}

            {/* Location Distribution */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
              <div className="flex items-center gap-1.5 mb-3">
                <MapPin size={14} className="text-violet-500" />
                <h4 className="font-extrabold text-slate-800 text-xs">自提站点分布</h4>
                <span className="text-[9px] text-slate-400 font-bold ml-auto">{analytics.locationData.length} 个站点</span>
              </div>
              {analytics.locationData.length === 0 ? (
                <p className="text-[11px] text-slate-400 text-center py-4">暂无订单数据</p>
              ) : (
                <div className="space-y-2.5">
                  {analytics.locationData.map((loc) => (
                    <div key={loc.name} className="space-y-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="font-bold text-slate-700 truncate max-w-[60%]">{loc.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-mono">{loc.count}单</span>
                          <span className="text-red-500 font-bold font-mono">¥{loc.revenue.toFixed(0)}</span>
                        </div>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-violet-400 to-sky-400 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max((loc.count / analytics.maxLocationCount) * 100, 4)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Product Sales Ranking */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
              <div className="flex items-center gap-1.5 mb-3">
                <Package size={14} className="text-sky-500" />
                <h4 className="font-extrabold text-slate-800 text-xs">商品销量排行</h4>
                <span className="text-[9px] text-slate-400 font-bold ml-auto">TOP {Math.min(analytics.productSales.length, 10)}</span>
              </div>
              {analytics.productSales.length === 0 ? (
                <p className="text-[11px] text-slate-400 text-center py-4">暂无销售数据</p>
              ) : (
                <div className="space-y-2">
                  {analytics.productSales.slice(0, 10).map((p, i) => (
                    <div key={p.name} className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full text-[9px] font-extrabold flex items-center justify-center shrink-0 ${
                        i < 3 ? 'bg-amber-400 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-bold text-slate-700 truncate">{p.name}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-slate-400 font-mono">{p.quantity}件</span>
                            <span className="text-red-500 font-bold font-mono">¥{p.revenue.toFixed(0)}</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max((p.quantity / analytics.maxProductQty) * 100, 4)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Daily Order Trend */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
              <div className="flex items-center gap-1.5 mb-3">
                <TrendingUp size={14} className="text-emerald-500" />
                <h4 className="font-extrabold text-slate-800 text-xs">近14日订单趋势</h4>
              </div>
              {orders.length === 0 ? (
                <p className="text-[11px] text-slate-400 text-center py-4">暂无趋势数据</p>
              ) : (
                <div className="flex items-end gap-1 h-28">
                  {analytics.dailyTrend.map((d) => (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                      <span className="text-[8px] text-slate-400 font-mono">{d.count > 0 ? d.count : ''}</span>
                      <div className="w-full bg-slate-50 rounded-t-sm relative" style={{ height: '80px' }}>
                        <div
                          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-emerald-400 to-sky-400 rounded-t-sm transition-all duration-500"
                          style={{ height: `${Math.max((d.count / analytics.maxDailyCount) * 100, d.count > 0 ? 8 : 0)}%` }}
                        />
                      </div>
                      <span className="text-[7px] text-slate-400 font-mono truncate w-full text-center">{d.date}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* No data hint */}
            {orders.length === 0 && (
              <div className="bg-slate-50 rounded-xl p-6 border border-dashed border-slate-300 text-center">
                <BarChart3 size={28} className="text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-bold">暂无分析数据</p>
                <p className="text-[10px] text-slate-400 mt-1">当有用户下单后，这里将展示站点分布、商品排行和趋势分析</p>
              </div>
            )}
          </div>
        )}

        {/* ===== Categories Manager View ===== */}
        {activeTab === 'categories' && (
          <div className="space-y-4 pb-8">
            <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider border-l-4 border-sky-500 pl-2">
              商品分类管理
            </h3>

            {/* Category list */}
            <div className="space-y-2">
              {categories.length === 0 ? (
                <div className="bg-white rounded-xl p-6 border border-slate-200 text-center text-slate-400">
                  <p className="text-xs font-semibold">暂无分类，请添加</p>
                </div>
              ) : (
                categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs flex items-center gap-3"
                  >
                    <span className="text-2xl">{cat.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-extrabold text-slate-800 text-xs">{cat.name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">ID: {cat.id} · 排序: {cat.sort_order}</p>
                    </div>
                    <button
                      onClick={() => startEditCategory(cat)}
                      className="p-1.5 rounded-lg bg-sky-50 text-sky-500 hover:bg-sky-100 transition-colors cursor-pointer"
                      title="编辑分类"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat)}
                      className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors cursor-pointer"
                      title="删除分类"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Category add/edit form */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
              <h4 className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                {editingCatId ? `编辑分类: ${editingCatId}` : '添加新分类'}
              </h4>
              <form onSubmit={handleCategorySubmit} className="space-y-2.5 text-xs">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">分类ID (英文标识)</label>
                    <input
                      type="text"
                      value={catId}
                      onChange={(e) => setCatId(e.target.value)}
                      placeholder="例: bakery"
                      disabled={!!editingCatId}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:bg-white focus:outline-none disabled:opacity-50"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">分类名称</label>
                    <input
                      type="text"
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      placeholder="例: 烘焙糕点"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:bg-white focus:outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">图标 (Emoji)</label>
                    <input
                      type="text"
                      value={catIcon}
                      onChange={(e) => setCatIcon(e.target.value)}
                      placeholder="🍰"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:bg-white focus:outline-none text-lg text-center"
                      maxLength={4}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">排序 (数字越小越前)</label>
                    <input
                      type="number"
                      value={catSortOrder}
                      onChange={(e) => setCatSortOrder(e.target.value)}
                      placeholder="0"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                {catFormError && (
                  <div className="text-red-500 text-[10px] bg-red-50 p-2 rounded border border-red-100 font-bold">
                    {catFormError}
                  </div>
                )}
                {catFormSuccess && (
                  <div className="text-emerald-700 text-[10px] bg-emerald-50 p-2 rounded border border-emerald-100 font-bold text-center">
                    分类保存成功
                  </div>
                )}

                <div className="flex gap-2">
                  {editingCatId && (
                    <button
                      type="button"
                      onClick={cancelCategoryEdit}
                      className="flex-1 text-[10px] font-bold text-slate-500 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      取消编辑
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-1 bg-sky-500 hover:bg-sky-600 text-white text-[10px] font-extrabold py-2 rounded-lg transition-colors cursor-pointer"
                  >
                    {editingCatId ? '保存修改' : '添加分类'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ===== Add Product Form View ===== */}
        {activeTab === 'add' && (
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-4 pb-8">
            <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider border-l-4 border-sky-500 pl-2 flex items-center justify-between">
              <span>{editingProductId ? '编辑商品信息' : '上架新商超代理品'}</span>
              {editingProductId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <X size={12} /> 取消编辑
                </button>
              )}
            </h3>

            <form onSubmit={handleProductSubmit} className="space-y-3 text-xs text-left">
              <div className="grid grid-cols-2 gap-3">
                {/* Product Title */}
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">商品完整正规名称 (必填)</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例：山姆爆款巧克力牛角包 (9个装)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:bg-white focus:outline-none"
                    required
                  />
                </div>

                {/* Categories */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">所属商品分类</label>
                  <div className="relative" ref={categoryDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 flex items-center justify-between cursor-pointer"
                    >
                      <span className="text-xs">
                        {categories.find(c => c.id === category)?.icon}{' '}
                        {categories.find(c => c.id === category)?.name || '选择分类'}
                      </span>
                      <ChevronDown size={14} className={`text-slate-400 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {showCategoryDropdown && (
                      <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                        {categories.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => { setCategory(cat.id); setShowCategoryDropdown(false); }}
                            className={`w-full text-left px-3 py-2.5 text-xs hover:bg-sky-50 transition-colors flex items-center gap-2 ${
                              cat.id === category ? 'bg-sky-50 text-sky-700 font-bold' : 'text-slate-700'
                            }`}
                          >
                            <span>{cat.icon}</span>
                            <span>{cat.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {/* Popularity Badge text */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">推荐爆款设定</label>
                  <label className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2 cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={isHot}
                      onChange={(e) => setIsHot(e.target.checked)}
                      className="w-4 h-4 text-sky-500 rounded border-slate-300 focus:ring-sky-500"
                    />
                    <span className="text-xs font-bold text-slate-700">将此商品加入「推荐爆款」列表</span>
                  </label>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">运营亮点角标 (选填)</label>
                  <input
                    type="text"
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    placeholder="例：人气爆款、今日特发"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:bg-white focus:outline-none"
                    maxLength={6}
                  />
                </div>

                {/* Price */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">山姆原价 (结算参考价)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="39.8"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:bg-white focus:outline-none"
                    required
                  />
                </div>

                {/* Original/Discount comparison Price */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">划线原价 (对比划线/选填)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(e.target.value)}
                    placeholder="45.0"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:bg-white focus:outline-none"
                  />
                </div>



                {/* Purchase Limits */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">每日全局限购总量 (0=不限购/每日自动恢复库存)</label>
                  <input
                    type="number"
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                    placeholder="2"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:bg-white focus:outline-none animate-none"
                    required
                  />
                </div>

                {/* Image Upload */}
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block uppercase">
                    商品图片
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setImageFile(file);
                        const reader = new FileReader();
                        reader.onloadend = () => setImagePreview(reader.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  {imagePreview ? (
                    <div className="relative w-full h-32 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                      <img src={imagePreview} alt="预览" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => { setImageFile(null); setImagePreview(''); setImageKey(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                        className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 hover:bg-black/70"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-24 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-sky-400 hover:text-sky-500 transition-colors cursor-pointer bg-slate-50"
                    >
                      <Upload size={20} />
                      <span className="text-[10px] font-bold">点击上传图片</span>
                      <span className="text-[9px]">支持 JPG/PNG，最大 10MB</span>
                    </button>
                  )}
                </div>

                {/* Custom Image URL fallback */}
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">或填写图片URL (不上传图片时可填写)</label>
                  <input
                    type="url"
                    value={imageKey.startsWith('http') ? imageKey : ''}
                    onChange={(e) => { setImageKey(e.target.value); setImageFile(null); setImagePreview(e.target.value); }}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:bg-white focus:outline-none"
                  />
                </div>

                {/* Description details */}
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">商品详情文字及保质承诺 (选填)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="例：当天采购，绝对烘焙新鲜！香气四溢，推荐搭配鲜榨纯天然椰子水。"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:bg-white focus:outline-none resize-none h-16"
                  />
                </div>
              </div>

              {/* Status panel feedback */}
              {formError && (
                <div className="text-red-500 text-[10px] bg-red-50 p-2 rounded border border-red-100 font-bold">
                  ⚠️ {formError}
                </div>
              )}
              {formSuccess && (
                <div className="text-emerald-700 text-[10px] bg-emerald-50 p-2 rounded border border-emerald-100 font-bold text-center">
                  ✨ 上架成功！系统正在自动重定向返回前台...
                </div>
              )}

              {/* Submitting act */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-sky-500 hover:bg-sky-600 active:scale-98 transition-all text-white text-xs font-extrabold py-2.5 rounded-lg shadow-md cursor-pointer text-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? '提交中...' : '➕ 点击确认加入在售货架'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
