import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  X,
  Calendar,
  Clock,
  User,
  Scissors,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Trash2,
  Phone,
  CalendarPlus,
  ShieldCheck,
  Smartphone,
  RotateCcw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Booking } from '../types';
import { formatTomans, toPersianDigits } from '../lib/dateUtils';
import { getMyBookingIds, getSavedCustomerPhone, saveCustomerPhone } from '../lib/storage';

interface TrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookings: Booking[];
  onCancelBooking: (bookingId: string) => void;
  onGoToBooking?: () => void;
}

// Convert Persian / Arabic digits to English digits for search matching
const toEnglishDigits = (str: string): string => {
  return str
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
};

export const TrackingModal: React.FC<TrackingModalProps> = ({
  isOpen,
  onClose,
  bookings,
  onCancelBooking,
  onGoToBooking,
}) => {
  const savedPhone = getSavedCustomerPhone();
  const [searchInput, setSearchInput] = useState(savedPhone || '');
  const [activeQuery, setActiveQuery] = useState(savedPhone || '');
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  // Sync state whenever modal opens
  useEffect(() => {
    if (isOpen) {
      const phone = getSavedCustomerPhone();
      if (phone && !searchInput) {
        setSearchInput(phone);
        setActiveQuery(phone);
      }
      setConfirmCancelId(null);
    }
  }, [isOpen]);

  const myBookingIds = getMyBookingIds();

  // Filter bookings strictly to protect customer privacy
  const { filteredList, isFilteredBySearch, hasDeviceBookings } = useMemo(() => {
    const rawClean = toEnglishDigits(activeQuery.trim().toLowerCase());
    const digitsOnly = rawClean.replace(/[^0-9]/g, '');

    // 1. If customer explicitly entered a search query (phone or booking ID)
    if (rawClean.length > 0) {
      const results = bookings.filter((b) => {
        const bId = b.id.toLowerCase();
        const bPhoneDigits = toEnglishDigits(b.customerPhone).replace(/[^0-9]/g, '');
        const bName = b.customerName.toLowerCase();

        // Exact or prefix match on tracking code e.g. "BRB-1234"
        const idMatch = bId.includes(rawClean);

        // Match on phone number (at least 5 digits to prevent loose matching)
        const phoneMatch =
          digitsOnly.length >= 4 &&
          (bPhoneDigits.includes(digitsOnly) || digitsOnly.includes(bPhoneDigits));

        // Exact match on full name if typed
        const nameMatch = rawClean.length >= 3 && bName.includes(rawClean);

        return idMatch || phoneMatch || nameMatch;
      });

      return {
        filteredList: results,
        isFilteredBySearch: true,
        hasDeviceBookings: myBookingIds.length > 0,
      };
    }

    // 2. If no search is typed, show ONLY bookings created on this specific device/browser
    const deviceResults = bookings.filter(
      (b) => myBookingIds.includes(b.id) || (savedPhone && b.customerPhone === savedPhone)
    );

    return {
      filteredList: deviceResults,
      isFilteredBySearch: false,
      hasDeviceBookings: deviceResults.length > 0,
    };
  }, [activeQuery, bookings, myBookingIds, savedPhone]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchInput.trim();
    setActiveQuery(clean);
    const digits = toEnglishDigits(clean).replace(/[^0-9]/g, '');
    if (digits.length >= 10) {
      saveCustomerPhone(clean);
    }
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setActiveQuery('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          className="w-full max-w-2xl glass-panel rounded-3xl p-6 sm:p-8 relative border border-white/10 shadow-2xl max-h-[90vh] flex flex-col"
          id="tracking-modal"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 left-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
            title="بستن"
            aria-label="بستن پنجره"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="text-center space-y-2 mb-5">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Calendar className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white">پیگیری و لغو اختصاصی نوبت</h2>
            <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>سامانه امن پیگیری: اطلاعات هر مشتری صرفاً با شماره موبایل یا کد اختصاصی نمایش داده می‌شود.</span>
            </p>
          </div>

          {/* Dedicated Search / Phone lookup Form */}
          <form onSubmit={handleSearchSubmit} className="mb-5 space-y-2">
            <div className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="شماره موبایل (مثلاً ۰۹۱۲۳۴۵۶۷۸۹) یا کد پیگیری (BRB-xxxx)..."
                  className="w-full pr-10 pl-10 py-3 rounded-2xl bg-slate-900/90 border border-white/10 focus:border-amber-500 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none transition-all shadow-inner"
                />
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                  <Phone className="w-4 h-4 text-amber-400/80" />
                </div>
                {searchInput && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 hover:text-white cursor-pointer"
                    title="پاک کردن"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Search className="w-4 h-4" />
                <span>جستجو</span>
              </button>
            </div>

            {/* Hint & active filter tag */}
            {activeQuery && (
              <div className="flex items-center justify-between text-[11px] px-1 text-slate-400">
                <span className="flex items-center gap-1">
                  <span>در حال نمایش نوبت‌های:</span>
                  <strong className="text-amber-300 font-mono">{activeQuery}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>پاک کردن جستجو</span>
                </button>
              </div>
            )}
          </form>

          {/* Bookings List Display */}
          <div className="overflow-y-auto space-y-3.5 flex-1 pr-1">
            {/* Case 1: No query and no bookings on this device */}
            {!isFilteredBySearch && filteredList.length === 0 ? (
              <div className="text-center py-10 glass-card rounded-2xl border border-dashed border-white/10 p-6 space-y-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-900 border border-slate-700/80 flex items-center justify-center text-amber-400 shadow-inner">
                  <Smartphone className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white">نوبتی در این دستگاه ثبت نشده است</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                    جهت حفظ کامل حریم خصوصی مشتریان، نوبت‌های دیگران نمایش داده نمی‌شود. اگر قبلاً نوبت گرفته‌اید، شماره موبایل یا کد رهگیری خود را در کادر بالا وارد کرده و روی «جستجو» بزنید.
                  </p>
                </div>
                {onGoToBooking && (
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        onClose();
                        onGoToBooking();
                      }}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 inline-flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <CalendarPlus className="w-4 h-4" />
                      <span>رزرو نوبت جدید در سالن</span>
                    </button>
                  </div>
                )}
              </div>
            ) : isFilteredBySearch && filteredList.length === 0 ? (
              /* Case 2: Searched, but no matches found */
              <div className="text-center py-10 space-y-3 glass-card rounded-2xl border border-dashed border-white/10 p-6">
                <AlertCircle className="w-10 h-10 text-amber-500/70 mx-auto" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-white">نوبتی با این مشخصات یافت نشد</p>
                  <p className="text-xs text-slate-400">
                    لطفاً شماره موبایل را به درستی (مثلاً ۰۹۱۲۳۴۵۶۷۸۹) یا کد نوبت مانند BRB-1234 را بررسی نمایید.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-amber-400 text-xs hover:bg-slate-700 transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>تلاش مجدد</span>
                </button>
              </div>
            ) : (
              /* Case 3: Display ONLY the customer's own matching bookings */
              <>
                <div className="flex items-center justify-between pb-1 text-xs text-slate-400">
                  <span className="font-medium text-amber-400/90">
                    {isFilteredBySearch ? 'نتیجه جستجوی نوبت شما' : 'نوبت‌های ثبت شده در این دستگاه'}:
                  </span>
                  <span>{toPersianDigits(filteredList.length)} نوبت</span>
                </div>

                {filteredList.map((booking, idx) => {
                  const isCancelled = booking.status === 'cancelled';
                  const isCompleted = booking.status === 'completed';

                  return (
                    <div
                      key={booking.id}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                        isCancelled
                          ? 'bg-rose-950/15 border-rose-900/30 opacity-80'
                          : isCompleted
                          ? 'bg-slate-900/60 border-blue-900/30'
                          : idx === 0
                          ? 'bg-slate-900/90 border-amber-500/40 shadow-lg shadow-amber-500/5'
                          : 'bg-slate-900/70 border-white/10 hover:border-amber-500/30'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/5 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold">
                            {booking.id}
                          </span>
                          <span className="text-xs text-slate-300">
                            مشتری: <strong className="text-white">{booking.customerName}</strong>
                          </span>
                        </div>

                        {/* Status badge */}
                        <div>
                          {booking.status === 'confirmed' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>رزرو فعال و قطعی</span>
                            </span>
                          )}
                          {booking.status === 'completed' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>خدمت انجام شده</span>
                            </span>
                          )}
                          {booking.status === 'cancelled' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/15 text-rose-400 border border-rose-500/30">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>لغو شده ({booking.cancelledBy === 'customer' ? 'توسط شما' : 'مدیریت سالن'})</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Details grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
                        <div className="flex items-center gap-2 text-slate-300">
                          <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>{booking.dateShamsi}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-300">
                          <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                          <span className="font-mono font-bold text-amber-300">ساعت {booking.timeSlot}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-300">
                          <Scissors className="w-4 h-4 text-amber-400 shrink-0" />
                          <span className="truncate">{booking.serviceTitle}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-300">
                          <User className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>{booking.barberName}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs">
                        <div className="flex items-center gap-3">
                          <span className="text-slate-400">
                            مبلغ سالن:{' '}
                            <strong className="text-amber-300 font-semibold">
                              {formatTomans(booking.servicePrice)}
                            </strong>
                          </span>
                          <span className="text-slate-500">|</span>
                          <span className="text-slate-400 font-mono text-[11px] dir-ltr text-right">
                            {booking.customerPhone}
                          </span>
                        </div>

                        {/* Cancellation action button */}
                        {!isCancelled && !isCompleted && (
                          <div>
                            {confirmCancelId === booking.id ? (
                              <div className="flex items-center gap-2 animate-in fade-in duration-150">
                                <span className="text-xs text-rose-400 font-medium">آیا نوبت لغو شود؟</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onCancelBooking(booking.id);
                                    setConfirmCancelId(null);
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors shadow-lg shadow-rose-600/20 cursor-pointer"
                                >
                                  بله، لغو کن
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmCancelId(null)}
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs cursor-pointer"
                                >
                                  انصراف
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmCancelId(booking.id)}
                                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-all hover:scale-[1.02] cursor-pointer"
                                title="لغو نوبت و آزادسازی فوری این ساعت برای دیگران"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>لغو نوبت</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
};
