/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, type FormEvent } from 'react';
import { CartItem, Order } from '../types';
import { PROXY_FEE_RATE } from '../utils';
import { X, Copy, Check, Info, Phone, NotepadText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onSubmitOrder: (order: Order) => void;
}

export default function CheckoutModal({ isOpen, onClose, cartItems, onSubmitOrder }: CheckoutModalProps) {
  if (!isOpen) return null;

  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'express'>('pickup');
  
  const [copied, setCopied] = useState(false);
  const [checkoutFinished, setCheckoutFinished] = useState(false);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  const totalItemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const totalProductsPrice = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const totalProxyFee = totalProductsPrice * PROXY_FEE_RATE;
  const grandTotal = totalProductsPrice + totalProxyFee;

  // Pattern Validator for Chinese Phone
  const [phoneError, setPhoneError] = useState('');

  // Built compiled text for copy-paste
  const generateManifestText = (orderData: Order | null) => {
    if (!orderData) return '';
    const dateStr = new Date(orderData.createdAt).toLocaleString('zh-CN', {
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    let manifest = `🛒 山姆会员店快送代购单 🛒\n`;
    manifest += `--------------------------------\n`;
    manifest += `单号: ${orderData.id}\n`;
    manifest += `时间: ${dateStr}\n`;
    manifest += `买家手机: ${orderData.phone}\n`;
    manifest += `配送类型: ${orderData.deliveryMethod === 'express' ? '骑手配送' : '站点自提'}\n`;
    
    if (orderData.address) {
      manifest += `详细地址: ${orderData.address}\n`;
    }
    if (orderData.notes) {
      manifest += `买家备注: ${orderData.notes}\n`;
    }
    
    manifest += `--------------------------------\n`;
    manifest += `代购商品清单：\n`;

    orderData.items.forEach((item, index) => {
      manifest += `${index + 1}. 【${item.name}】 x ${item.quantity} (单价¥${item.price.toFixed(1)})\n`;
    });

    manifest += `--------------------------------\n`;
    manifest += `商品原价小计: ¥${orderData.totalPrice.toFixed(1)}\n`;
    manifest += `代购包装跑腿: ¥${orderData.proxyFee.toFixed(1)} (按商品金额 ${(PROXY_FEE_RATE * 100).toFixed(0)}%)\n`;
    manifest += `订单应付总计: ¥${orderData.grandTotal.toFixed(1)}\n`;
    manifest += `--------------------------------\n`;
    manifest += `⚠️ 说明：\n`;
    manifest += `1. 请直接一键复制此账单\n`;
    manifest += `2. 发送给山姆代购微信客服进行确认\n`;
    manifest += `3. 完成微信转账后，我们即刻为您配货自提！`;

    return manifest;
  };

  const handleCopy = () => {
    if (!activeOrder) return;
    const text = generateManifestText(activeOrder);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }).catch(() => {
      alert('抱歉，复制失败，请手动在框中长按全选复制');
    });
  };

  const handleFinishCheckoutSubmit = (e: FormEvent) => {
    e.preventDefault();
    setPhoneError('');

    // Primary Validation
    if (!phone) {
      setPhoneError('请输入您的手机号');
      return;
    }
    if (phone.length < 7 || phone.length > 15) {
      setPhoneError('请输入有效的手机号码');
      return;
    }
    if (deliveryMethod === 'express' && !address.trim()) {
      setPhoneError('骑手配送请填写配送地址');
      return;
    }

    // Assembly standard order item structure
    const newOrder: Order = {
      id: `SAM-${Date.now().toString().slice(-8)}`,
      phone,
      items: cartItems.map((item) => ({
        productId: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
      })),
      totalPrice: totalProductsPrice,
      proxyFee: totalProxyFee,
      grandTotal: grandTotal,
      createdAt: new Date().toISOString(),
      notes: notes.trim() || undefined,
      address: address.trim() || undefined,
      deliveryMethod,
      status: 'pending',
    };

    setActiveOrder(newOrder);
    onSubmitOrder(newOrder);
    setCheckoutFinished(true);
  };

  return (
    <AnimatePresence>
      <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
        {/* Dark Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          onClick={onClose}
        ></motion.div>

        {/* Modal Window Container */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col border border-slate-100 max-h-[90%] text-left"
        >
          {/* Header Row */}
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <span className="font-extrabold text-slate-800 text-xs tracking-wider flex items-center gap-1">
              🎉 提交代购订单
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200"
            >
              <X size={15} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!checkoutFinished ? (
              // Step 1: Input shipping options & cellular details
              <form onSubmit={handleFinishCheckoutSubmit} className="space-y-4">
                {/* Visual order preview header */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between select-none">
                  <div className="text-xs">
                    <p className="text-slate-400 font-medium">代购商品合计</p>
                    <p className="font-extrabold text-slate-800 mt-0.5">{totalItemCount}件商品</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400 font-medium">代购终极总计</p>
                    <p className="font-extrabold text-red-500 font-mono text-sm">¥{grandTotal.toFixed(1)}</p>
                  </div>
                </div>

                {/* Delivery Option Details */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
                    配送方式 Delivery Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { setDeliveryMethod('pickup'); setAddress(''); }}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all border ${
                        deliveryMethod === 'pickup'
                          ? 'border-sky-200 bg-sky-50/80 text-sky-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <NotepadText size={14} className={deliveryMethod === 'pickup' ? 'text-sky-500' : 'text-slate-400'} />
                      <span>站点自提</span>
                      {deliveryMethod === 'pickup' && (
                        <span className="text-[8px] text-sky-600 bg-sky-100 px-1.5 py-0.5 rounded font-extrabold uppercase">
                          推荐
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryMethod('express')}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all border ${
                        deliveryMethod === 'express'
                          ? 'border-orange-200 bg-orange-50/80 text-orange-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <span className={deliveryMethod === 'express' ? 'text-orange-500' : 'text-slate-400'}>🛵</span>
                      <span>骑手配送</span>
                      {deliveryMethod === 'express' && (
                        <span className="text-[8px] text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded font-extrabold uppercase">
                          送货上门
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Contact Phone details */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                    <Phone size={10} className="text-slate-400" />
                    <span>买家联系手机 (必填)</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^\d\-+]/g, ''))}
                    placeholder="请输入收货联系电话/微信号"
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-sans font-semibold placeholder:font-normal"
                    maxLength={15}
                    required
                  />
                </div>

                {/* Contact Shipping address details — only for express delivery */}
                {deliveryMethod === 'express' && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block flex justify-between">
                      <span>📍 配送地址 (必填)</span>
                    </label>
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="请输入详细配送地址，例：xx小区x栋x楼x号"
                      className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 resize-none h-14"
                      required
                    />
                  </div>
                )}

                {/* Additional notes details */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
                    备注说明 (选填)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="如：烤鸡不要太焦的、草莓要当天的"
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                {/* Error messages panel */}
                {phoneError && (
                  <div className="text-red-500 text-[10px] bg-red-50 p-2.5 rounded-lg font-semibold flex items-center gap-1 select-none">
                    ⚠️ {phoneError}
                  </div>
                )}

                {/* Dynamic instructional rules */}
                <div className="bg-amber-50 rounded-lg p-2.5 text-[9px] text-amber-700 leading-normal flex items-start gap-1 select-none border border-amber-100">
                  <Info size={11} className="shrink-0 mt-0.5 text-amber-500" />
                  <span>
                    代购规则：点击提交后，我们将自动为您锁定所配商品库存额度，随后系统将生成 <b>代购复制账单清单</b>。复制该文字并发给代购小哥即可安排采购！
                  </span>
                </div>

                {/* Trigger Buttons */}
                <button
                  type="submit"
                  className="w-full bg-sky-500 hover:bg-sky-600 active:scale-98 transition-all text-white py-2.5 text-xs font-bold rounded-xl shadow-md cursor-pointer text-center"
                >
                  ☑️ 立即登记并生成购买清单
                </button>
              </form>
            ) : (
              // Step 2: Display manifest texts for user to copy-paste
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center p-3 text-center bg-emerald-50 rounded-xl border border-emerald-100 select-none">
                  <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-1 bg-opacity-95">
                    <Check size={18} strokeWidth={3} />
                  </div>
                  <h3 className="font-extrabold text-emerald-800 text-xs">名单登记锁定成功！</h3>
                  <p className="text-[10px] text-emerald-600 mt-1">请复制下方文字发给代购小哥进行付款排单</p>
                </div>

                {/* Text Blocks */}
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                    📋 清单文本
                  </span>
                  <div className="relative">
                    <pre className="w-full bg-slate-900 text-slate-200 text-[10px] rounded-xl p-3 pt-4 font-mono select-all overflow-x-auto overflow-y-auto max-h-[180px] leading-relaxed border border-slate-800 whitespace-pre">
                      {generateManifestText(activeOrder)}
                    </pre>

                    {/* Copied Banner Overlay */}
                    {copied && (
                      <div className="absolute inset-0 bg-slate-900/95 rounded-xl flex items-center justify-center text-emerald-400 font-extrabold text-xs select-none">
                        ✨ 复制成功！快去微信黏贴发给代购吧！
                      </div>
                    )}
                  </div>
                </div>

                {/* Copier Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleCopy}
                    className="col-span-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold py-2.5 rounded-xl shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Copy size={13} />
                    <span>点击一键复制清单</span>
                  </button>

                  {/* QR Code for customer service WeChat */}
                  <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-4 flex flex-col items-center gap-3 mt-1">
                    <div className="text-center">
                      <p className="text-xs font-extrabold text-slate-800">扫码添加客服核销</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">长按识别二维码，添加微信确认订单</p>
                    </div>
                    <img
                      src="/qrcode.jpg"
                      alt="客服微信二维码"
                      className="w-40 h-40 rounded-lg border border-slate-100 object-cover"
                    />
                  </div>

                  <button
                    onClick={onClose}
                    className="col-span-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-[11px] font-semibold py-2 rounded-xl transition-all cursor-pointer text-center"
                  >
                    完成下单并返回点单界面
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
