import React, { useState, useMemo } from 'react';
import {
  Scissors,
  Sparkles,
  Crown,
  Smile,
  Palette,
  ShieldCheck,
  Calendar,
  Clock,
  User,
  Phone,
  CheckCircle2,
  Lock,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  MessageSquare,
  Sparkle,
  Star,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Service, Barber, Booking, ShopSettings, BlockedSlot } from '../types';
import { getUpcomingDays, generateTimeSlots, formatTomans, toPersianDigits, DayOption } from '../lib/dateUtils';
import { isSlotBooked, isSlotBlocked } from '../lib/storage';

interface CustomerBookingProps {
  services: Service[];
  barbers: Barber[];
  settings: ShopSettings;
  bookings: Booking[];
  blockedSlots: BlockedSlot[];
  onCompleteBooking: (data: {
    customerName: string;
    customerPhone: string;
    customerNotes?: string;
    serviceId: string;
    barberId: string;
    dateStr: string;
    dateShamsi: string;
    timeSlot: string;
  }) => Promise<{ success: boolean; booking?: Booking; error?: string }> | { success: boolean; booking?: Booking; error?: string };
  onOpenTracking: () => void;
}

export const CustomerBooking: React.FC<CustomerBookingProps> = ({
  services,
  barbers,
  settings,
  bookings,
  blockedSlots,
  onCompleteBooking,
  onOpenTracking,
}) => {
  // Booking Steps: 1: Service, 2: Barber, 3: Date & Slot, 4: Contact info, 5: Confirmation Ticket
  const [step, setStep] = useState<number>(1);
  const [selectedServiceId, setSelectedServiceId] = useState<string>(services[0]?.id || '');
  const [selectedBarberId, setSelectedBarberId] = useState<string>(barbers[0]?.id || '');
  const [selectedDay, setSelectedDay] = useState<DayOption>(() => getUpcomingDays(14)[0]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  
  // Customer info inputs
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Result after booking
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Service filter category
  const [activeCategory, setActiveCategory] = useState<'all' | 'hair' | 'beard' | 'vip' | 'care'>('all');

  const upcomingDays = useMemo(() => getUpcomingDays(14), []);
  const allTimeSlots = useMemo(
    () => generateTimeSlots(settings.openHour, settings.closeHour, settings.slotDurationMinutes),
    [settings.openHour, settings.closeHour, settings.slotDurationMinutes]
  );

  const selectedService = services.find((s) => s.id === selectedServiceId);
  const selectedBarber = barbers.find((b) => b.id === selectedBarberId);

  // Filtered services
  const filteredServices = services.filter((s) =>
    activeCategory === 'all' ? true : s.category === activeCategory
  );

  // Check slots availability for selected day and barber
  const slotStatuses = useMemo(() => {
    return allTimeSlots.map((time) => {
      const bookedInfo = isSlotBooked(selectedDay.dateStr, time, selectedBarberId);
      const blocked = isSlotBlocked(selectedDay.dateStr, time, selectedBarberId);
      const isLocked = bookedInfo.booked || blocked;

      return {
        time,
        isLocked,
        isBooked: bookedInfo.booked,
        isBlocked: blocked,
      };
    });
  }, [allTimeSlots, selectedDay.dateStr, selectedBarberId, bookings, blockedSlots]);

  const availableCount = slotStatuses.filter((s) => !s.isLocked).length;

  const handleStepSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (step === 1) {
      if (!selectedServiceId) {
        setValidationError('لطفاً یک خدمت را انتخاب کنید.');
        return;
      }
      setValidationError('');
      setStep(2);
    } else if (step === 2) {
      if (!selectedBarberId) {
        setValidationError('لطفاً آرایشگر مورد نظر را انتخاب کنید.');
        return;
      }
      setValidationError('');
      setStep(3);
    } else if (step === 3) {
      if (!selectedTimeSlot) {
        setValidationError('لطفاً یک ساعت آزاد را انتخاب کنید.');
        return;
      }
      setValidationError('');
      setStep(4);
    } else if (step === 4) {
      if (!customerName.trim()) {
        setValidationError('لطفاً نام و نام خانوادگی خود را وارد کنید.');
        return;
      }
      const cleanPhone = customerPhone.trim().replace(/[^0-9]/g, '');
      if (cleanPhone.length < 10 || (!cleanPhone.startsWith('09') && !cleanPhone.startsWith('9'))) {
        setValidationError('لطفاً یک شماره موبایل معتبر (مثلاً ۰۹۱۲۳۴۵۶۷۸۹) وارد کنید.');
        return;
      }

      setValidationError('');
      setIsSubmitting(true);

      const res = await onCompleteBooking({
        customerName,
        customerPhone,
        customerNotes,
        serviceId: selectedServiceId,
        barberId: selectedBarberId,
        dateStr: selectedDay.dateStr,
        dateShamsi: selectedDay.fullShamsi,
        timeSlot: selectedTimeSlot,
      });

      setIsSubmitting(false);

      if (!res.success) {
        setValidationError(res.error || 'خطا در ثبت نوبت');
      } else if (res.booking) {
        setConfirmedBooking(res.booking);
        setStep(5);
        // Trigger celebratory confetti
        try {
          confetti({
            particleCount: 90,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#f59e0b', '#fbbf24', '#d97706', '#ffffff'],
          });
        } catch {
          // ignore
        }
      }
    }
  };

  const handleCopyCode = () => {
    if (confirmedBooking) {
      navigator.clipboard.writeText(confirmedBooking.id);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  const resetBookingForm = () => {
    setStep(1);
    setSelectedTimeSlot('');
    setConfirmedBooking(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerNotes('');
  };

  const getServiceIcon = (iconName: string) => {
    switch (iconName) {
      case 'Scissors': return <Scissors className="w-5 h-5 text-amber-400" />;
      case 'Sparkles': return <Sparkles className="w-5 h-5 text-amber-400" />;
      case 'Crown': return <Crown className="w-5 h-5 text-yellow-400" />;
      case 'Smile': return <Smile className="w-5 h-5 text-amber-400" />;
      case 'Palette': return <Palette className="w-5 h-5 text-amber-400" />;
      default: return <Scissors className="w-5 h-5 text-amber-400" />;
    }
  };

  return (
    <div id="booking-container" className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      
      {/* Hero Header */}
      {step < 5 && (
        <div className="text-center space-y-3 mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
            <Sparkle className="w-3.5 h-3.5 fill-amber-400" />
            <span>رزرو آنلاین سریع و بدون معطلی</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            نوبت‌دهی هوشمند <span className="gold-gradient-text">{settings.shopName}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
            در چند گام کوتاه ساعت دلخواه خود را رزرو کنید؛ زمان انتخابی بلافاصله برای دیگران قفل خواهد شد.
          </p>

          {/* Stepper Indicator */}
          <div className="pt-6 max-w-md mx-auto">
            <div className="flex items-center justify-between relative">
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-800 -translate-y-1/2 -z-0" />
              <div
                className="absolute top-1/2 right-0 h-0.5 bg-amber-500 -translate-y-1/2 -z-0 transition-all duration-500"
                style={{ width: `${((step - 1) / 3) * 100}%` }}
              />

              {[
                { s: 1, label: 'خدمت' },
                { s: 2, label: 'آرایشگر' },
                { s: 3, label: 'زمان' },
                { s: 4, label: 'مشخصات' },
              ].map((item) => (
                <div key={item.s} className="relative z-10 flex flex-col items-center gap-1.5">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                      step === item.s
                        ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-500/20 shadow-lg shadow-amber-500/30'
                        : step > item.s
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-slate-900 border border-slate-700 text-slate-400'
                    }`}
                  >
                    {step > item.s ? <Check className="w-4 h-4 stroke-[3]" /> : toPersianDigits(item.s)}
                  </div>
                  <span className={`text-[11px] font-medium ${step >= item.s ? 'text-amber-300' : 'text-slate-500'}`}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Validation Error Message */}
      {validationError && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-center gap-2"
        >
          <div className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
          <span>{validationError}</span>
        </motion.div>
      )}

      {/* STEP 1: SERVICE SELECTION */}
      {step === 1 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-6"
        >
          {/* Category Filter Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              { id: 'all', label: 'همه خدمات' },
              { id: 'hair', label: 'اصلاح مو و سر' },
              { id: 'beard', label: 'ریش و آنکارد' },
              { id: 'vip', label: 'پکیج‌های طلایی VIP' },
              { id: 'care', label: 'پوست و مراقبت' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as typeof activeCategory)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                  activeCategory === cat.id
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                    : 'bg-slate-900/80 text-slate-400 border border-white/5 hover:border-white/20 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredServices.map((service) => {
              const isSelected = selectedServiceId === service.id;

              return (
                <div
                  key={service.id}
                  onClick={() => {
                    setSelectedServiceId(service.id);
                    setValidationError('');
                  }}
                  className={`p-5 rounded-2xl cursor-pointer transition-all duration-300 relative group flex flex-col justify-between ${
                    isSelected
                      ? 'bg-gradient-to-b from-slate-900 to-amber-950/40 border-2 border-amber-500 shadow-xl shadow-amber-500/10 -translate-y-1'
                      : 'bg-slate-900/60 border border-white/10 hover:border-amber-500/40 hover:bg-slate-900/90'
                  }`}
                >
                  {service.popular && (
                    <div className="absolute -top-3 left-4 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-[10px] font-black shadow-md flex items-center gap-1">
                      <Star className="w-3 h-3 fill-slate-950" />
                      <span>محبوب‌ترین</span>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        {getServiceIcon(service.iconName)}
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-amber-500 border-amber-500 text-slate-950' : 'border-slate-700'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-white text-base group-hover:text-amber-300 transition-colors">
                        {service.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {service.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>{service.durationMinutes} دقیقه</span>
                    </div>
                    <div className="font-bold text-amber-400 text-sm">
                      {formatTomans(service.price)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => handleStepSubmit()}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/20 flex items-center gap-2 cursor-pointer"
            >
              <span>مرحله بعد: انتخاب آرایشگر</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP 2: BARBER SELECTION */}
      {step === 2 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-6"
        >
          <div className="text-center mb-4">
            <h2 className="text-lg font-bold text-white">آرایشگر و استایلیست مد نظرتان را انتخاب نمایید</h2>
            <p className="text-xs text-slate-400 mt-1">
              تمام استایلیست‌های ما دارای مدارک بین‌المللی و تجربه کار با متدهای روز هستند
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {barbers.map((barber) => {
              const isSelected = selectedBarberId === barber.id;

              return (
                <div
                  key={barber.id}
                  onClick={() => {
                    setSelectedBarberId(barber.id);
                    setValidationError('');
                  }}
                  className={`p-6 rounded-3xl cursor-pointer transition-all duration-300 relative text-center group flex flex-col items-center justify-between ${
                    isSelected
                      ? 'bg-gradient-to-b from-slate-900 to-amber-950/40 border-2 border-amber-500 shadow-2xl shadow-amber-500/15 -translate-y-1'
                      : 'bg-slate-900/60 border border-white/10 hover:border-amber-500/40 hover:bg-slate-900/80'
                  }`}
                >
                  <div className="space-y-4 w-full flex flex-col items-center">
                    {/* Avatar */}
                    <div className="relative">
                      <div className="w-24 h-24 rounded-2xl overflow-hidden p-0.5 bg-gradient-to-tr from-amber-500 to-yellow-300 shadow-lg shadow-amber-500/10 group-hover:scale-105 transition-transform">
                        <img
                          src={barber.avatar}
                          alt={barber.name}
                          className="w-full h-full object-cover rounded-[14px]"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="absolute -bottom-2 -left-2 px-2 py-0.5 rounded-full bg-slate-950 border border-amber-500/50 text-amber-400 text-[10px] font-bold flex items-center gap-1 shadow">
                        <Star className="w-3 h-3 fill-amber-400" />
                        <span>{barber.rating}</span>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-white text-base group-hover:text-amber-300 transition-colors">
                        {barber.name}
                      </h3>
                      <p className="text-xs text-amber-400/90 font-medium mt-0.5">
                        {barber.title}
                      </p>
                      <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                        {barber.specialty}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-white/5 w-full flex items-center justify-between text-xs text-slate-400">
                    <span>سابقه: {barber.experienceYears} سال</span>
                    <span>{toPersianDigits(barber.reviewsCount)} نظر مثبت</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-3 rounded-xl bg-slate-900 border border-white/10 hover:border-white/20 text-slate-300 text-xs sm:text-sm font-medium flex items-center gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              <span>مرحله قبل</span>
            </button>
            <button
              onClick={() => handleStepSubmit()}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/20 flex items-center gap-2 cursor-pointer"
            >
              <span>مرحله بعد: تقویم و انتخاب ساعت</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP 3: SMART CALENDAR & REAL-TIME SLOT LOCKING */}
      {step === 3 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-6"
        >
          {/* Summary of chosen service & barber */}
          <div className="p-4 rounded-2xl glass-panel border border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Scissors className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-400">خدمت انتخابی:</span>
                <p className="text-sm font-bold text-white">{selectedService?.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <User className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-400">آرایشگر:</span>
                <p className="text-sm font-bold text-white">{selectedBarber?.name}</p>
              </div>
            </div>
            <div className="text-left">
              <span className="text-xs text-slate-400">مبلغ قابل پرداخت در سالن:</span>
              <p className="text-sm font-bold text-amber-400">{formatTomans(selectedService?.price || 0)}</p>
            </div>
          </div>

          {/* Days Strip Picker */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>انتخاب روز نوبت (تقویم هوشمند ۱۴ روزه)</span>
              </label>
              <span className="text-xs text-amber-400/90 font-medium">
                {selectedDay.fullShamsi}
              </span>
            </div>

            {/* Horizontal scrollable days */}
            <div className="flex gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar">
              {upcomingDays.map((day) => {
                const isSelected = selectedDay.dateStr === day.dateStr;

                return (
                  <button
                    key={day.dateStr}
                    type="button"
                    onClick={() => {
                      setSelectedDay(day);
                      setSelectedTimeSlot('');
                      setValidationError('');
                    }}
                    className={`shrink-0 w-24 sm:w-28 py-3 px-2 rounded-2xl text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/25 -translate-y-0.5'
                        : 'bg-slate-900/80 border border-white/10 hover:border-amber-500/40 text-slate-300'
                    }`}
                  >
                    <div className="text-[11px] opacity-80 mb-0.5">
                      {day.dayName}
                    </div>
                    <div className="text-base sm:text-lg font-black">
                      {day.dayOfMonth} {day.monthName}
                    </div>
                    <div className="text-[10px] opacity-70 mt-0.5">
                      {day.dayOfWeek}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Slots Grid with Instant Lock */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>ساعت‌های آزاد در {selectedDay.dayName} ({selectedDay.dayOfMonth} {selectedDay.monthName})</span>
              </label>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>آزاد ({toPersianDigits(availableCount)} ساعت)</span>
                </span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Lock className="w-3 h-3 text-rose-400" />
                  <span>رزرو شده / قفل</span>
                </span>
              </div>
            </div>

            {/* Smart notice */}
            <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 text-xs text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                سیستم به‌محض انتخاب و ثبت شما این ساعت را به صورت آنی قفل می‌کند تا فرد دیگری نتواند آن را رزرو کند.
              </span>
            </div>

            {/* Slots Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 pt-2">
              {slotStatuses.map(({ time, isLocked, isBooked, isBlocked }) => {
                const isSelected = selectedTimeSlot === time;

                if (isLocked) {
                  return (
                    <div
                      key={time}
                      className="py-3 px-2 rounded-xl bg-slate-900/40 border border-slate-800/80 text-slate-500 flex flex-col items-center justify-center gap-1 cursor-not-allowed select-none opacity-60"
                      title={isBooked ? 'این ساعت رزرو شده است' : 'توسط مدیریت مسدود شده'}
                    >
                      <div className="flex items-center gap-1 text-rose-400/90 text-xs font-mono font-bold">
                        <Lock className="w-3 h-3" />
                        <span>{time}</span>
                      </div>
                      <span className="text-[10px] text-rose-400/75">
                        {isBooked ? 'رزرو شد' : 'مسدود'}
                      </span>
                    </div>
                  );
                }

                return (
                  <button
                    key={time}
                    type="button"
                    onClick={() => {
                      setSelectedTimeSlot(time);
                      setValidationError('');
                    }}
                    className={`py-3 px-2 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 font-bold ring-2 ring-amber-300 shadow-lg shadow-amber-500/30 -translate-y-0.5'
                        : 'bg-slate-900/90 border border-white/10 hover:border-amber-500/50 hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    <span className="font-mono text-sm font-bold">{time}</span>
                    <span className={`text-[10px] ${isSelected ? 'text-slate-950 font-bold' : 'text-emerald-400'}`}>
                      آزاد
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-6">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-3 rounded-xl bg-slate-900 border border-white/10 hover:border-white/20 text-slate-300 text-xs sm:text-sm font-medium flex items-center gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              <span>مرحله قبل</span>
            </button>
            <button
              onClick={() => handleStepSubmit()}
              disabled={!selectedTimeSlot}
              className={`px-8 py-3.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
                selectedTimeSlot
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-xl shadow-amber-500/20 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <span>مرحله بعد: ثبت مشخصات</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP 4: CUSTOMER CONTACT & CONFIRMATION DETAILS */}
      {step === 4 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-6"
        >
          {/* Summary Card */}
          <div className="glass-card rounded-3xl p-6 border border-amber-500/30">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <span className="text-xs text-amber-400 font-bold flex items-center gap-1.5">
                <Scissors className="w-4 h-4" />
                خلاصه رزرو شما
              </span>
              <span className="text-sm font-bold text-amber-300">
                {formatTomans(selectedService?.price || 0)}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-1">خدمت:</span>
                <span className="text-white font-bold">{selectedService?.title}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">آرایشگر:</span>
                <span className="text-white font-bold">{selectedBarber?.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">تاریخ نوبت:</span>
                <span className="text-white font-bold">{selectedDay.fullShamsi}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">ساعت رزرو:</span>
                <span className="text-amber-400 font-bold font-mono text-sm">ساعت {selectedTimeSlot}</span>
              </div>
            </div>
          </div>

          {/* Customer Input Form */}
          <form onSubmit={handleStepSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  نام و نام خانوادگی <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="مثال: محمد امینی"
                    className="w-full pr-10 pl-4 py-3 rounded-xl bg-slate-900/90 border border-white/10 focus:border-amber-500 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  شماره موبایل جهت پیامک تایید <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    required
                    dir="ltr"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="09123456789"
                    className="w-full pr-10 pl-4 py-3 rounded-xl bg-slate-900/90 border border-white/10 focus:border-amber-500 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-left font-mono"
                  />
                </div>
              </div>

            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                توضیحات و ترجیحات شما (اختیاری)
              </label>
              <textarea
                rows={2}
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                placeholder="مثلاً: حساسیت پوستی، سبک خاص اصلاح یا مدل موی مد نظر..."
                className="w-full p-3 rounded-xl bg-slate-900/90 border border-white/10 focus:border-amber-500 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                پرداخت هزینه خدمات پس از اتمام کار در سالن انجام خواهد شد. نیازی به پرداخت آنلاین در این مرحله نیست.
              </span>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-6 py-3 rounded-xl bg-slate-900 border border-white/10 hover:border-white/20 text-slate-300 text-xs sm:text-sm font-medium flex items-center gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                <span>مرحله قبل</span>
              </button>
              
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/25 flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>در حال قفل و ثبت نوبت...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تایید نهایی و ثبت نوبت</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* STEP 5: LUXURY CONFIRMATION TICKET & SMS PREVIEW */}
      {step === 5 && confirmedBooking && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-xl mx-auto space-y-6"
        >
          {/* Success Banner */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-amber-500 to-emerald-400 p-0.5 shadow-2xl shadow-emerald-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
                <Check className="w-8 h-8 text-emerald-400 stroke-[3]" />
              </div>
            </div>
            <h2 className="text-2xl font-black text-white">نوبت شما با موفقیت رزرو شد!</h2>
            <p className="text-xs text-slate-400">
              این ساعت بلافاصله در سیستم مرکزی ثبت و برای شما قفل گردید.
            </p>
          </div>

          {/* Digital Luxury Ticket */}
          <div className="relative rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-amber-500/40 p-6 sm:p-8 shadow-2xl shadow-amber-500/10 overflow-hidden">
            
            {/* Decorative background glow */}
            <div className="absolute top-0 right-1/2 translate-x-1/2 w-64 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header of Ticket */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Scissors className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">{settings.shopName}</h3>
                  <span className="text-[10px] text-slate-400">بلیت دیجیتال رزرو</span>
                </div>
              </div>
              <div className="text-left">
                <span className="text-[10px] text-slate-400 block">کد پیگیری اختصاصی:</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono text-base font-black text-amber-400 tracking-wider">
                    {confirmedBooking.id}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                    title="کپی کد پیگیری"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Ticket Info Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs mb-6">
              <div className="space-y-1">
                <span className="text-slate-400">نام مشتری:</span>
                <p className="font-bold text-white text-sm">{confirmedBooking.customerName}</p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400">شماره تماس:</span>
                <p className="font-mono font-bold text-white text-sm dir-ltr text-right">{confirmedBooking.customerPhone}</p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400">خدمت انتخابی:</span>
                <p className="font-bold text-white text-sm">{confirmedBooking.serviceTitle}</p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400">استایلیست:</span>
                <p className="font-bold text-white text-sm">{confirmedBooking.barberName}</p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400">تاریخ مراجعه:</span>
                <p className="font-bold text-amber-300 text-sm">{confirmedBooking.dateShamsi}</p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400">ساعت حضور:</span>
                <p className="font-bold text-amber-300 font-mono text-base">ساعت {confirmedBooking.timeSlot}</p>
              </div>
            </div>

            {/* Cost bar */}
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs">
              <span className="text-slate-300">مبلغ قابل پرداخت در محل:</span>
              <span className="font-bold text-amber-400 text-sm">{formatTomans(confirmedBooking.servicePrice)}</span>
            </div>

            {/* Address */}
            <div className="mt-4 pt-4 border-t border-white/5 text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300">نشانی سالن: </span>
              <span>{settings.address}</span>
            </div>
          </div>

          {/* Automated SMS confirmation simulator */}
          <div className="p-4 rounded-2xl bg-sky-950/20 border border-sky-500/30 text-xs text-sky-200 flex items-start gap-3">
            <MessageSquare className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-sky-300">
                پیامک تایید خودکار ارسال شد:
              </p>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                «{confirmedBooking.customerName} عزیز، نوبت شما برای {confirmedBooking.dateShamsi} ساعت {confirmedBooking.timeSlot} با کد پیگیری {confirmedBooking.id} در {settings.shopName} ثبت شد. منتظر دیدار شما هستیم.»
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={onOpenTracking}
              className="w-full py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs sm:text-sm border border-white/10 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>مشاهده در بخش پیگیری و لغو نوبت</span>
            </button>
            <button
              onClick={resetBookingForm}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs sm:text-sm shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>رزرو نوبت دیگر</span>
            </button>
          </div>

        </motion.div>
      )}

    </div>
  );
};
