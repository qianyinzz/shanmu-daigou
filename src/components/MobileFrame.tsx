/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, type FormEvent, type ReactNode } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { login, setAuthToken, clearAuthToken } from '../api';

interface MobileFrameProps {
  children: ReactNode;
  isAdminMode: boolean;
  onExitAdmin: () => void;
}

export default function MobileFrame({ children, isAdminMode, onExitAdmin }: MobileFrameProps) {
  const isMobileMode = true;

  // Admin password gate state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // When entering admin mode via URL, show password modal
  useEffect(() => {
    if (isAdminMode) {
      // Check if already authenticated this session
      const authenticated = sessionStorage.getItem('sam_admin_authed');
      if (!authenticated) {
        setShowPasswordModal(true);
        setPasswordInput('');
        setPasswordError('');
      }
    }
  }, [isAdminMode]);

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setLoginLoading(true);

    try {
      const token = await login(passwordInput);
      setAuthToken(token);
      setShowPasswordModal(false);
      setPasswordInput('');
      sessionStorage.setItem('sam_admin_authed', '1');
    } catch (loginErr) {
      console.error('Login error:', loginErr);
      setPasswordError('密码错误，请重试');
    } finally {
      setLoginLoading(false);
    }
  };

  const handlePasswordModalClose = () => {
    setShowPasswordModal(false);
    setPasswordInput('');
    setPasswordError('');
    // If closing without auth, go back to front page
    onExitAdmin();
  };

  const handleExitAdmin = () => {
    sessionStorage.removeItem('sam_admin_authed');
    clearAuthToken();
    onExitAdmin();
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-start items-center p-0 md:p-6 font-sans">
      {/* Admin floating controls - only visible in admin mode */}
      {isAdminMode && (
        <div className="w-full max-w-md md:max-w-4xl flex items-center justify-between px-4 py-2 mb-1 bg-amber-50 md:rounded-xl shadow-sm border border-amber-200">
          <div className="flex items-center gap-2">
            <div className="bg-amber-500 text-white p-1.5 rounded-lg">
              <span className="font-bold text-xs tracking-tight">管理</span>
            </div>
            <h1 className="font-bold text-amber-800 text-sm">后台管理系统</h1>
          </div>
          <button
            onClick={handleExitAdmin}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all duration-300 bg-amber-500 hover:bg-amber-600 text-white"
          >
            返回前台点单
          </button>
        </div>
      )}

      {/* Admin Password Modal */}
      <AnimatePresence>
        {showPasswordModal && isAdminMode && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={handlePasswordModalClose}
            />

            {/* Password Dialog */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden z-10 border border-slate-100"
            >
              {/* Header */}
              <div className="px-5 pt-5 pb-3 text-center">
                <div className="w-11 h-11 rounded-full bg-slate-900 text-white flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <Lock size={20} />
                </div>
                <h3 className="font-extrabold text-slate-800 text-sm">后台管理验证</h3>
                <p className="text-[10px] text-slate-400 mt-1">请输入管理员密码以进入后台</p>
              </div>

              {/* Form */}
              <form onSubmit={handlePasswordSubmit} className="px-5 pb-5 space-y-3">
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      setPasswordError('');
                    }}
                    placeholder="输入管理密码"
                    className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 pr-10 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 font-medium placeholder:font-normal text-center tracking-widest"
                    autoFocus
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                {passwordError && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[10px] text-red-500 font-bold text-center bg-red-50 py-1.5 rounded-lg border border-red-100"
                  >
                    {passwordError}
                  </motion.p>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handlePasswordModalClose}
                    className="flex-1 py-2.5 text-xs font-bold text-slate-600 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="flex-1 py-2.5 text-xs font-extrabold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-md transition-colors active:scale-95 disabled:opacity-50"
                  >
                    {loginLoading ? '验证中...' : '验证进入'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Container Wrapper */}
      <div
        className={`w-full transition-all duration-300 ease-in-out ${
          isMobileMode
            ? 'max-w-md border-0 md:border-8 md:border-slate-950 md:rounded-[40px] md:shadow-2xl relative md:aspect-[9/19] h-screen md:h-[820px] bg-slate-50 overflow-hidden flex flex-col'
            : 'max-w-4xl w-full bg-slate-50 rounded-2xl shadow-xl border border-slate-200 flex flex-col h-[780px] overflow-hidden'
        }`}
      >


        {/* Dynamic Nested Visual Elements */}
        <div className="flex-1 overflow-hidden relative flex flex-col bg-slate-50">
          {children}
        </div>


      </div>
    </div>
  );
}
