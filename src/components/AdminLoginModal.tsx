import React, { useState } from 'react';
import { Shield, Lock, Eye, EyeOff, X, ArrowLeft, KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
  currentPin: string;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  currentPin,
}) => {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validPin = currentPin || '1234';
    if (pin === validPin) {
      setError(false);
      setErrorMessage('');
      setPin('');
      onLoginSuccess();
    } else {
      setError(true);
      setErrorMessage('رمز عبور وارد شده نادرست است.');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className={`w-full max-w-md glass-panel rounded-3xl p-6 sm:p-8 relative border shadow-2xl ${
            error ? 'border-rose-500/50 animate-shake' : 'border-amber-500/30'
          }`}
          id="admin-login-modal"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 left-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon and Title */}
          <div className="text-center space-y-3 mb-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 p-0.5 shadow-xl shadow-amber-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Shield className="w-8 h-8 text-amber-400" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-black text-white">ورود به پنل مدیریت</h2>
              <p className="text-xs text-slate-400 mt-1">
                جهت دسترسی به مدیریت نوبت‌ها، ساعات کاری و آمار مالی رمز را وارد کنید
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                رمز عبور مدیریت
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  id="admin-password-input"
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value);
                    if (error) setError(false);
                  }}
                  placeholder="رمز عبور مدیریت"
                  autoFocus
                  dir="ltr"
                  className={`w-full pr-10 pl-11 py-3 rounded-xl bg-slate-900/90 border text-center text-white tracking-widest text-base focus:outline-none transition-all ${
                    error
                      ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/30'
                      : 'border-white/10 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-rose-400 mt-2 text-center font-medium"
                >
                  {errorMessage}
                </motion.p>
              )}
            </div>

            {/* Submit Button */}
            <button
              id="admin-login-submit-btn"
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 hover:shadow-amber-500/35 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>تایید و ورود به مدیریت</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </form>

        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
};
