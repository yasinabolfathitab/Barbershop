import React, { useState } from 'react';
import { Scissors, Shield, CalendarCheck, Search, Bell, CheckCircle2, Lock, LogOut, X } from 'lucide-react';
import { AdminNotification, ShopSettings } from '../types';
import { toPersianDigits } from '../lib/dateUtils';

interface NavbarProps {
  currentView: 'booking' | 'tracking' | 'admin';
  onSelectView: (view: 'booking' | 'tracking' | 'admin') => void;
  isAdminLoggedIn: boolean;
  onAdminLogout: () => void;
  notifications: AdminNotification[];
  onMarkNotificationsRead: () => void;
  settings: ShopSettings;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onSelectView,
  isAdminLoggedIn,
  onAdminLogout,
  notifications,
  onMarkNotificationsRead,
  settings,
}) => {
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header id="main-header" className="sticky top-0 z-40 w-full glass-panel border-b border-white/10">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2">
        
        {/* Brand Logo */}
        <div 
          onClick={() => onSelectView('booking')}
          className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group shrink-0"
          id="brand-logo-btn"
          title={settings.shopName}
        >
          <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-300 p-0.5 shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/40 transition-all duration-300">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Scissors className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 group-hover:rotate-12 transition-transform duration-300" />
            </div>
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-white group-hover:text-amber-300 transition-colors whitespace-nowrap">
                {settings.shopName}
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                VIP
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {settings.shopSubtitle}
            </p>
          </div>
        </div>

        {/* Navigation Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          
          {/* Real-time sync badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>سیستم آنلاین و همگام</span>
          </div>

          {/* Book Appointment Button */}
          <button
            id="nav-book-btn"
            onClick={() => onSelectView('booking')}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              currentView === 'booking'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/25'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <CalendarCheck className="w-4 h-4 shrink-0" />
            <span>رزرو نوبت</span>
          </button>

          {/* Track Booking Button */}
          <button
            id="nav-tracking-btn"
            onClick={() => onSelectView('tracking')}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              currentView === 'tracking'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/25'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Search className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">پیگیری و لغو</span>
            <span className="sm:hidden">پیگیری</span>
          </button>

          {/* Admin Notifications (shown when in admin view or logged in) */}
          {isAdminLoggedIn && (
            <div className="relative">
              <button
                id="admin-notif-bell-btn"
                onClick={() => {
                  setShowNotifMenu(!showNotifMenu);
                  if (!showNotifMenu && unreadCount > 0) {
                    onMarkNotificationsRead();
                  }
                }}
                className="relative p-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-slate-300 hover:text-amber-400 transition-colors cursor-pointer"
                title="اعلان‌های مدیریت"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-bounce shadow-md shadow-rose-500/30">
                    {toPersianDigits(unreadCount)}
                  </span>
                )}
              </button>

              {/* Notification dropdown */}
              {showNotifMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs sm:bg-transparent"
                    onClick={() => setShowNotifMenu(false)}
                  />
                  <div 
                    id="admin-notif-dropdown"
                    className="fixed top-[70px] left-3 right-3 max-w-sm mx-auto sm:mx-0 sm:max-w-none sm:absolute sm:top-full sm:left-0 sm:right-auto sm:mt-2.5 sm:w-84 glass-panel rounded-2xl shadow-2xl border border-white/15 p-3.5 z-50 animate-in fade-in zoom-in-95 duration-200 max-h-[75vh] sm:max-h-[500px] flex flex-col"
                  >
                    <div className="flex items-center justify-between pb-2.5 border-b border-white/10 mb-2.5 shrink-0">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5 text-amber-400" />
                        اعلان‌های زنده مدیریت
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400">
                          {toPersianDigits(notifications.length)} رویداد
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowNotifMenu(false)}
                          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                          title="بستن اعلانات"
                          aria-label="بستن اعلانات"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
                      {notifications.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-6">
                          هیچ اعلانی ثبت نشده است
                        </p>
                      ) : (
                        notifications.slice(0, 20).map((n) => (
                          <div
                            key={n.id}
                            className={`p-2.5 rounded-xl text-xs transition-colors ${
                              n.read ? 'bg-slate-900/40 text-slate-400 border border-white/5' : 'bg-amber-500/10 border border-amber-500/20 text-slate-200 font-medium'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-white">{n.title}</span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {new Date(n.timestamp).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-300 leading-relaxed">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Admin Panel Button */}
          {isAdminLoggedIn ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                id="nav-admin-view-btn"
                onClick={() => onSelectView('admin')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                  currentView === 'admin'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                    : 'bg-slate-800 text-amber-400 border border-amber-500/30 hover:bg-slate-700'
                }`}
              >
                <Shield className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">پنل مدیر</span>
                <span className="sm:hidden">مدیریت</span>
              </button>
              <button
                id="nav-admin-logout-btn"
                onClick={onAdminLogout}
                className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
                title="خروج از پنل مدیریت"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              id="nav-admin-login-btn"
              onClick={() => onSelectView('admin')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium border transition-all whitespace-nowrap ${
                currentView === 'admin'
                  ? 'bg-amber-500 text-slate-950 font-bold border-amber-500'
                  : 'bg-slate-900/80 text-slate-300 border-white/10 hover:border-amber-500/40 hover:text-amber-400'
              }`}
            >
              <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden sm:inline">پنل مدیریت</span>
              <span className="sm:hidden">مدیریت</span>
            </button>
          )}

        </div>
      </div>
    </header>
  );
};
