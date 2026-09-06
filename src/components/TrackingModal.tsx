import React, { useState } from 'react';
import { Search, X, Calendar, Clock, User, Scissors, AlertCircle, CheckCircle2, XCircle, Trash2, Phone, CalendarPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Booking } from '../types';
import { formatTomans } from '../lib/dateUtils';

interface TrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookings: Booking[];
  onCancelBooking: (bookingId: string) => void;
  onGoToBooking?: () => void;
}

export const TrackingModal: React.FC<TrackingModalProps> = ({
  isOpen,
  onClose,
  bookings,
  onCancelBooking,
  onGoToBooking,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  if (!isOpen) return null;

  const normalizedSearch = searchTerm.trim().toLowerCase();
  
  // Directly display all bookings (newest first), with optional filter if typed
  const displayList = normalizedSearch
    ? bookings.filter((b) => {
        const idMatch = b.id.toLowerCase().includes(normalizedSearch);
        const phoneMatch = b.customerPhone.replace(/[^0-9]/g, '').includes(normalizedSearch.replace(/[^0-9]/g, ''));
        const nameMatch = b.customerName.toLowerCase().includes(normalizedSearch);
        return idMatch || phoneMatch || nameMatch;
      })
    : bookings;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        
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
            className="absolute top-5 left-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
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
            <h2 className="text-xl font-bold text-white">پیگیری و لغو فوری نوبت</h2>
            <p className="text-xs text-slate-400">
              نوبت‌های ثبت شده مستقیماً در زیر قابل مشاهده و لغو هستند. در صورت لغو، ساعت انتخابی بلافاصله آزاد می‌شود.
            </p>
          </div>

          {/* Optional Quick Search / Filter Bar (Only if bookings exist) */}
          {bookings.length > 1 && (
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="فیلتر سریع بر اساس نام، شماره تماس یا کد نوبت (اختیاری)..."
                  className="w-full pr-10 pl-10 py-2.5 rounded-xl bg-slate-900/90 border border-white/10 focus:border-amber-500 text-white placeholder-slate-500 text-xs focus:outline-none transition-all"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500">
                  <Search className="w-4 h-4" />
                </div>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Bookings List - Directly Displayed */}
          <div className="overflow-y-auto space-y-3.5 flex-1 pr-1">
            {bookings.length === 0 ? (
              <div className="text-center py-12 glass-card rounded-2xl border border-dashed border-white/10 p-6 space-y-3">
                <AlertCircle className="w-10 h-10 text-amber-500/70 mx-auto" />
                <h3 className="text-sm font-bold text-white">هیچ نوبتی ثبت نشده است</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  در حال حاضر هیچ نوبتی در سیستم رزرو نشده است. تمام ساعت‌های سالن آزاد هستند و می‌توانید نوبت خود را ثبت فرمایید.
                </p>
                {onGoToBooking && (
                  <button
                    onClick={() => {
                      onClose();
                      onGoToBooking();
                    }}
                    className="mt-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 inline-flex items-center gap-1.5 transition-all"
                  >
                    <CalendarPlus className="w-4 h-4" />
                    <span>رزرو نوبت جدید</span>
                  </button>
                )}
              </div>
            ) : displayList.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto opacity-70" />
                <p className="text-sm font-medium text-slate-300">هیچ نوبتی با این جستجو مطابقت ندارد</p>
                <button
                  onClick={() => setSearchTerm('')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-amber-400 text-xs hover:bg-slate-700"
                >
                  نمایش تمام نوبت‌ها
                </button>
              </div>
            ) : (
              displayList.map((booking, idx) => {
                const isCancelled = booking.status === 'cancelled';
                const isCompleted = booking.status === 'completed';

                return (
                  <div
                    key={booking.id}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                      isCancelled
                        ? 'bg-rose-950/15 border-rose-900/30 opacity-75'
                        : isCompleted
                        ? 'bg-slate-900/60 border-blue-900/30'
                        : idx === 0 && !searchTerm
                        ? 'bg-slate-900/90 border-amber-500/40 shadow-lg shadow-amber-500/5'
                        : 'bg-slate-900/70 border-white/10 hover:border-amber-500/30'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/5 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold">
                          {booking.id}
                        </span>
                        <span className="text-xs text-slate-400">
                          مشتری: <strong className="text-white">{booking.customerName}</strong>
                        </span>
                        {idx === 0 && !searchTerm && !isCancelled && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            جدیدترین نوبت
                          </span>
                        )}
                      </div>

                      {/* Status badge */}
                      <div>
                        {booking.status === 'confirmed' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>رزرو فعال</span>
                          </span>
                        )}
                        {booking.status === 'completed' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>انجام شده</span>
                          </span>
                        )}
                        {booking.status === 'cancelled' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>لغو شده ({booking.cancelledBy === 'customer' ? 'توسط مشتری' : 'مدیریت'})</span>
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
                          مبلغ: <strong className="text-amber-300 font-semibold">{formatTomans(booking.servicePrice)}</strong>
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
                                onClick={() => {
                                  onCancelBooking(booking.id);
                                  setConfirmCancelId(null);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors shadow-lg shadow-rose-600/20"
                              >
                                بله، لغو کن
                              </button>
                              <button
                                onClick={() => setConfirmCancelId(null)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs"
                              >
                                انصراف
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmCancelId(booking.id)}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-all hover:scale-[1.02] cursor-pointer"
                              title="لغو نوبت و آزادسازی این ساعت برای دیگران"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>لغو این نوبت</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
