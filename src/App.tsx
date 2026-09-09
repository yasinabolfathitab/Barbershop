/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { CustomerBooking } from './components/CustomerBooking';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminLoginModal } from './components/AdminLoginModal';
import { TrackingModal } from './components/TrackingModal';
import { Footer } from './components/Footer';
import {
  getBookings,
  getServices,
  getBarbers,
  getSettings,
  getBlockedSlots,
  getNotifications,
  createBooking,
  cancelBooking,
  updateBookingStatus,
  deleteBooking,
  clearAllBookings,
  toggleBlockSlot,
  saveServices,
  saveBarbers,
  saveSettings,
  markAllNotificationsAsRead,
  resetToDemoData,
  subscribeToRealtimeSync,
} from './lib/storage';
import { Booking, Service, Barber, ShopSettings, BlockedSlot, AdminNotification } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, CheckCircle2, X } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<'booking' | 'tracking' | 'admin'>('booking');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return sessionStorage.getItem('admin_logged_in') === 'true';
  });
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showTrackingModal, setShowTrackingModal] = useState<boolean>(false);

  // Application Data States
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [settings, setSettings] = useState<ShopSettings>(() => getSettings());
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);

  // Live Toast notification
  const [liveToast, setLiveToast] = useState<{ title: string; message: string } | null>(null);

  // Refresh all data from storage
  const reloadData = useCallback(() => {
    setBookings(getBookings());
    setServices(getServices());
    setBarbers(getBarbers());
    setSettings(getSettings());
    setBlockedSlots(getBlockedSlots());
    setNotifications(getNotifications());
  }, []);

  // Initial load & real-time sync subscription
  useEffect(() => {
    reloadData();

    const unsubscribe = subscribeToRealtimeSync((event) => {
      reloadData();

      if (event.type === 'booking_created') {
        const b = event.payload as Booking;
        setLiveToast({
          title: 'رزرو جدید دریافت شد 🎉',
          message: `${b.customerName} برای ساعت ${b.timeSlot} نوبت گرفت.`,
        });
      } else if (event.type === 'booking_cancelled') {
        setLiveToast({
          title: 'یک نوبت لغو شد ⚠️',
          message: 'نوبت در تقویم آزاد شد و در دسترس سایر مشتریان قرار گرفت.',
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [reloadData]);

  // Auto hide toast after 4.5 seconds
  useEffect(() => {
    if (liveToast) {
      const timer = setTimeout(() => {
        setLiveToast(null);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [liveToast]);

  // Handle navigation requests
  const handleSelectView = (view: 'booking' | 'tracking' | 'admin') => {
    if (view === 'admin') {
      if (isAdminLoggedIn) {
        setCurrentView('admin');
      } else {
        setShowLoginModal(true);
      }
    } else if (view === 'tracking') {
      setShowTrackingModal(true);
    } else {
      setCurrentView('booking');
    }
  };

  const handleAdminLoginSuccess = () => {
    setIsAdminLoggedIn(true);
    sessionStorage.setItem('admin_logged_in', 'true');
    setShowLoginModal(false);
    setCurrentView('admin');
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    sessionStorage.removeItem('admin_logged_in');
    setCurrentView('booking');
  };

  // Booking action handlers
  const handleCompleteBooking = async (data: {
    customerName: string;
    customerPhone: string;
    customerNotes?: string;
    serviceId: string;
    barberId: string;
    dateStr: string;
    dateShamsi: string;
    timeSlot: string;
  }) => {
    const res = await createBooking(data);
    if (res.success) {
      reloadData();
    }
    return res;
  };

  const handleCustomerCancelBooking = async (bookingId: string) => {
    const res = await cancelBooking(bookingId, 'customer');
    if (res.success) {
      reloadData();
      setLiveToast({
        title: 'نوبت شما با موفقیت لغو شد',
        message: 'این ساعت برای سایر متقاضیان آزاد شد.',
      });
    }
  };

  const handleAdminCancelBooking = async (bookingId: string, reason?: string) => {
    const res = await cancelBooking(bookingId, 'admin', reason);
    if (res.success) {
      reloadData();
    }
  };

  const handleAdminUpdateStatus = async (bookingId: string, status: 'confirmed' | 'completed' | 'cancelled') => {
    await updateBookingStatus(bookingId, status);
    reloadData();
  };

  const handleAdminDeleteBooking = async (bookingId: string) => {
    await deleteBooking(bookingId);
    reloadData();
  };

  const handleToggleBlockSlot = async (dateStr: string, timeSlot: string, barberId?: string) => {
    await toggleBlockSlot(dateStr, timeSlot, barberId);
    reloadData();
  };

  const handleUpdateServices = (newServices: Service[]) => {
    saveServices(newServices);
    reloadData();
  };

  const handleUpdateBarbers = (newBarbers: Barber[]) => {
    saveBarbers(newBarbers);
    reloadData();
  };

  const handleUpdateSettings = async (newSettings: ShopSettings) => {
    await saveSettings(newSettings);
    reloadData();
  };

  const handleResetData = () => {
    resetToDemoData();
    reloadData();
    setLiveToast({
      title: 'داده‌ها بازنشانی شدند',
      message: 'نوبت‌ها و تنظیمات اولیه بازگردانی گردیدند.',
    });
  };

  const handleAdminClearAllBookings = async () => {
    await clearAllBookings();
    reloadData();
    setLiveToast({
      title: 'تمام نوبت‌ها پاکسازی شدند',
      message: 'نوبت‌ها پاک و تمام ساعت‌ها در تقویم آزاد گردیدند.',
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#080c14] text-slate-100 selection:bg-amber-500 selection:text-black">
      
      {/* Dynamic Ambient Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-40 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 -left-40 w-96 h-96 bg-yellow-500/5 rounded-full blur-[140px]" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-amber-600/10 rounded-full blur-[130px]" />
      </div>

      {/* Main Navigation Bar */}
      <Navbar
        currentView={currentView}
        onSelectView={handleSelectView}
        isAdminLoggedIn={isAdminLoggedIn}
        onAdminLogout={handleAdminLogout}
        notifications={notifications}
        onMarkNotificationsRead={() => {
          markAllNotificationsAsRead();
          reloadData();
        }}
        settings={settings}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentView === 'booking' && (
          <CustomerBooking
            services={services}
            barbers={barbers}
            settings={settings}
            bookings={bookings}
            blockedSlots={blockedSlots}
            onCompleteBooking={handleCompleteBooking}
            onOpenTracking={() => setShowTrackingModal(true)}
          />
        )}

        {currentView === 'admin' && isAdminLoggedIn && (
          <AdminDashboard
            bookings={bookings}
            services={services}
            barbers={barbers}
            settings={settings}
            blockedSlots={blockedSlots}
            notifications={notifications}
            onUpdateBookingStatus={handleAdminUpdateStatus}
            onCancelBooking={handleAdminCancelBooking}
            onDeleteBooking={handleAdminDeleteBooking}
            onToggleBlockSlot={handleToggleBlockSlot}
            onUpdateServices={handleUpdateServices}
            onUpdateBarbers={handleUpdateBarbers}
            onUpdateSettings={handleUpdateSettings}
            onResetDemoData={handleResetData}
            onClearAllBookings={handleAdminClearAllBookings}
          />
        )}
      </main>

      {/* Footer with Mandatory Developer Credit */}
      <Footer settings={settings} />

      {/* Admin Login Modal with Password Check */}
      <AdminLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleAdminLoginSuccess}
        currentPin={settings.adminPin}
      />

      {/* Customer Tracking & Cancellation Modal */}
      <TrackingModal
        isOpen={showTrackingModal}
        onClose={() => setShowTrackingModal(false)}
        bookings={bookings}
        onCancelBooking={handleCustomerCancelBooking}
        onGoToBooking={() => setCurrentView('booking')}
      />

      {/* Real-time Floating Toast Notification */}
      <AnimatePresence>
        {liveToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-4 sm:bottom-6 left-4 right-4 sm:right-auto sm:left-6 sm:max-w-sm z-50 glass-panel rounded-2xl p-4 border border-amber-500/40 shadow-2xl shadow-amber-500/20 flex items-start gap-3"
            id="live-toast-notification"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <Bell className="w-4 h-4" />
            </div>
            <div className="flex-1 space-y-0.5">
              <h4 className="text-xs font-bold text-white">{liveToast.title}</h4>
              <p className="text-[11px] text-slate-300 leading-relaxed">{liveToast.message}</p>
            </div>
            <button
              onClick={() => setLiveToast(null)}
              className="text-slate-400 hover:text-white p-1 cursor-pointer transition-colors"
              title="بستن اعلان"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
