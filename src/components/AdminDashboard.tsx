import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  User,
  Scissors,
  DollarSign,
  TrendingUp,
  Download,
  Filter,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  Upload,
  Camera,
  UserPlus,
  Image as ImageIcon,
  X,
  Star,
  Lock,
  Unlock,
  Volume2,
  VolumeX,
  RefreshCw,
  Phone,
  BarChart3,
  Settings as SettingsIcon,
  Users,
  ShieldCheck,
  Check,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Booking,
  Service,
  Barber,
  ShopSettings,
  BlockedSlot,
  AdminNotification,
} from '../types';
import { formatTomans, toPersianDigits, getUpcomingDays, generateTimeSlots } from '../lib/dateUtils';
import { exportBookingsToExcel } from '../lib/storage';
import { playNotificationSound } from '../lib/sound';

interface AdminDashboardProps {
  bookings: Booking[];
  services: Service[];
  barbers: Barber[];
  settings: ShopSettings;
  blockedSlots: BlockedSlot[];
  notifications: AdminNotification[];
  onUpdateBookingStatus: (bookingId: string, status: 'confirmed' | 'completed' | 'cancelled') => void;
  onCancelBooking: (bookingId: string, reason?: string) => void;
  onDeleteBooking: (bookingId: string) => void;
  onToggleBlockSlot: (dateStr: string, timeSlot: string, barberId?: string) => void;
  onUpdateServices: (services: Service[]) => void;
  onUpdateBarbers: (barbers: Barber[]) => void;
  onUpdateSettings: (settings: ShopSettings) => void;
  onResetDemoData?: () => void;
  onClearAllBookings?: () => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&auto=format&fit=crop&q=80',
];

// Helper to read and compress uploaded barber images from device
const processImageFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('لطفاً یک فایل تصویری معتبر (JPG, PNG, WebP) انتخاب نمایید.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 460;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        // Returns clean high-quality JPEG Data URL (typically ~30-60KB)
        resolve(canvas.toDataURL('image/jpeg', 0.88));
      };
      img.onerror = () => resolve(reader.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('خواندن فایل تصویر انجام نشد.'));
    reader.readAsDataURL(file);
  });
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  bookings,
  services,
  barbers,
  settings,
  blockedSlots,
  notifications,
  onUpdateBookingStatus,
  onCancelBooking,
  onDeleteBooking,
  onToggleBlockSlot,
  onUpdateServices,
  onUpdateBarbers,
  onUpdateSettings,
  onResetDemoData,
  onClearAllBookings,
}) => {
  // Navigation Tabs: 'bookings' | 'slots' | 'services' | 'analytics' | 'settings'
  const [activeTab, setActiveTab] = useState<'bookings' | 'slots' | 'services' | 'analytics' | 'settings'>('bookings');

  // Clear all bookings confirmation state
  const [showConfirmClearAll, setShowConfirmClearAll] = useState(false);

  // Bookings Tab Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'tomorrow' | 'upcoming'>('all');

  // Slots Management State
  const upcomingDays = useMemo(() => getUpcomingDays(14), []);
  const [selectedDayForSlots, setSelectedDayForSlots] = useState(upcomingDays[0]);
  const [selectedBarberForSlots, setSelectedBarberForSlots] = useState<string>('all');

  // Edit Working Hours Modal/State
  const [tempOpenHour, setTempOpenHour] = useState(settings.openHour);
  const [tempCloseHour, setTempCloseHour] = useState(settings.closeHour);
  const [tempSlotDuration, setTempSlotDuration] = useState(settings.slotDurationMinutes);
  const [savedHoursSuccess, setSavedHoursSuccess] = useState(false);

  // New Service Modal
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [newServiceTitle, setNewServiceTitle] = useState('');
  const [newServicePrice, setNewServicePrice] = useState<number>(200000);
  const [newServiceDuration, setNewServiceDuration] = useState<number>(45);
  const [newServiceCategory, setNewServiceCategory] = useState<'hair' | 'beard' | 'vip' | 'care'>('hair');
  const [newServiceDesc, setNewServiceDesc] = useState('');

  // Editing existing service
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  // Barber Management State
  const [showBarberModal, setShowBarberModal] = useState(false);
  const [barberFormMode, setBarberFormMode] = useState<'add' | 'edit'>('add');
  const [barberFormId, setBarberFormId] = useState('');
  const [barberFormName, setBarberFormName] = useState('');
  const [barberFormTitle, setBarberFormTitle] = useState('');
  const [barberFormRating, setBarberFormRating] = useState<number>(4.9);
  const [barberFormReviewsCount, setBarberFormReviewsCount] = useState<number>(120);
  const [barberFormExperience, setBarberFormExperience] = useState<number>(5);
  const [barberFormAvatar, setBarberFormAvatar] = useState('');
  const [barberFormSpecialty, setBarberFormSpecialty] = useState('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [showCustomUrlInput, setShowCustomUrlInput] = useState(false);
  const [barberActionSuccess, setBarberActionSuccess] = useState<string | null>(null);

  // Settings tab form
  const [tempSettings, setTempSettings] = useState<ShopSettings>(settings);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Today string YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // Filtered Bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // Search
      const matchSearch =
        !searchQuery.trim() ||
        b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.customerPhone.includes(searchQuery) ||
        b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.serviceTitle.toLowerCase().includes(searchQuery.toLowerCase());

      // Status
      const matchStatus = statusFilter === 'all' || b.status === statusFilter;

      // Date
      let matchDate = true;
      if (dateFilter === 'today') matchDate = b.dateStr === todayStr;
      else if (dateFilter === 'tomorrow') matchDate = b.dateStr === tomorrowStr;
      else if (dateFilter === 'upcoming') matchDate = b.dateStr >= todayStr && b.status === 'confirmed';

      return matchSearch && matchStatus && matchDate;
    });
  }, [bookings, searchQuery, statusFilter, dateFilter, todayStr, tomorrowStr]);

  // Overall Financial & Performance Metrics
  const metrics = useMemo(() => {
    const totalBookings = bookings.length;
    const confirmedCount = bookings.filter((b) => b.status === 'confirmed').length;
    const completedCount = bookings.filter((b) => b.status === 'completed').length;
    const cancelledCount = bookings.filter((b) => b.status === 'cancelled').length;

    const todayBookings = bookings.filter((b) => b.dateStr === todayStr && b.status !== 'cancelled');
    const todayRevenue = todayBookings.reduce((sum, b) => sum + b.servicePrice, 0);

    // Total income from completed + confirmed
    const totalRevenue = bookings
      .filter((b) => b.status !== 'cancelled')
      .reduce((sum, b) => sum + b.servicePrice, 0);

    const averageBill = totalBookings > 0 ? Math.round(totalRevenue / (totalBookings - cancelledCount || 1)) : 0;
    const cancelRate = totalBookings > 0 ? Math.round((cancelledCount / totalBookings) * 100) : 0;

    return {
      totalBookings,
      confirmedCount,
      completedCount,
      cancelledCount,
      todayCount: todayBookings.length,
      todayRevenue,
      totalRevenue,
      averageBill,
      cancelRate,
    };
  }, [bookings, todayStr]);

  // Monthly breakdown for chart
  const monthlyData = useMemo(() => {
    // Generate 6 recent months
    const months = [
      { name: 'فروردین', revenue: 4200000, count: 18 },
      { name: 'اردیبهشت', revenue: 6800000, count: 26 },
      { name: 'خرداد', revenue: 8500000, count: 32 },
      { name: 'تیر', revenue: 9800000, count: 38 },
      { name: 'مرداد', revenue: 11400000, count: 44 },
      {
        name: 'شهریور (جاری)',
        revenue: metrics.totalRevenue > 0 ? metrics.totalRevenue : 14200000,
        count: metrics.totalBookings > 0 ? metrics.totalBookings : 52,
      },
    ];

    const maxRev = Math.max(...months.map((m) => m.revenue));
    return { months, maxRev };
  }, [metrics.totalRevenue, metrics.totalBookings]);

  // Handle hours save
  const handleSaveHours = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...settings,
      openHour: tempOpenHour,
      closeHour: tempCloseHour,
      slotDurationMinutes: Number(tempSlotDuration),
    };
    onUpdateSettings(updated);
    setSavedHoursSuccess(true);
    setTimeout(() => setSavedHoursSuccess(false), 2500);
  };

  // Add new service
  const handleCreateService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceTitle.trim()) return;

    const newSrv: Service = {
      id: `srv-${Date.now()}`,
      title: newServiceTitle.trim(),
      price: Number(newServicePrice),
      durationMinutes: Number(newServiceDuration),
      category: newServiceCategory,
      description: newServiceDesc.trim() || 'خدمات حرفه‌ای سالن پیرایش',
      iconName: newServiceCategory === 'vip' ? 'Crown' : 'Scissors',
    };

    onUpdateServices([...services, newSrv]);
    setShowAddServiceModal(false);
    setNewServiceTitle('');
    setNewServiceDesc('');
  };

  // --- Barber Management Handlers ---

  const handleOpenAddBarber = () => {
    setBarberFormMode('add');
    setBarberFormId('');
    setBarberFormName('');
    setBarberFormTitle('استایلیست و هیرکاتور');
    setBarberFormRating(4.9);
    setBarberFormReviewsCount(95);
    setBarberFormExperience(4);
    setBarberFormAvatar(PRESET_AVATARS[Math.floor(Math.random() * PRESET_AVATARS.length)]);
    setBarberFormSpecialty('کوتاهی مدرن، فید مو، آنکارد و استایل ریش');
    setImageUploadError(null);
    setShowCustomUrlInput(false);
    setShowBarberModal(true);
  };

  const handleOpenEditBarber = (barber: Barber) => {
    setBarberFormMode('edit');
    setBarberFormId(barber.id);
    setBarberFormName(barber.name);
    setBarberFormTitle(barber.title);
    setBarberFormRating(barber.rating);
    setBarberFormReviewsCount(barber.reviewsCount);
    setBarberFormExperience(barber.experienceYears);
    setBarberFormAvatar(barber.avatar);
    setBarberFormSpecialty(barber.specialty);
    setImageUploadError(null);
    setShowCustomUrlInput(false);
    setShowBarberModal(true);
  };

  const handleDeleteBarber = (barber: Barber) => {
    if (barbers.length <= 1) {
      alert('حداقل یک آرایشگر باید در سالن فعال باشد تا سیستم نوبت‌دهی مشتریان بدون آرایشگر نشود.');
      return;
    }
    if (confirm(`آیا از حذف آرایشگر «${barber.name}» از لیست سالن اطمینان دارید؟`)) {
      const updated = barbers.filter((b) => b.id !== barber.id);
      onUpdateBarbers(updated);
      setBarberActionSuccess(`آرایشگر «${barber.name}» با موفقیت حذف شد.`);
      setTimeout(() => setBarberActionSuccess(null), 3500);
    }
  };

  const handleProcessUploadedFile = async (file: File) => {
    setIsProcessingImage(true);
    setImageUploadError(null);
    try {
      const dataUrl = await processImageFile(file);
      setBarberFormAvatar(dataUrl);
    } catch (err: any) {
      setImageUploadError(err.message || 'خطا در بارگذاری تصویر');
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessUploadedFile(file);
    }
    e.target.value = '';
  };

  const handleDropImage = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingImage(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessUploadedFile(file);
    }
  };

  const handleSaveBarber = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barberFormName.trim()) {
      alert('لطفاً نام آرایشگر را وارد نمایید.');
      return;
    }
    if (!barberFormAvatar.trim()) {
      alert('لطفاً یک عکس برای آرایشگر آپلود کرده یا انتخاب کنید.');
      return;
    }

    if (barberFormMode === 'add') {
      const newBarber: Barber = {
        id: `barber-${Date.now()}`,
        name: barberFormName.trim(),
        title: barberFormTitle.trim() || 'استایلیست سالن',
        rating: Number(barberFormRating) || 4.9,
        reviewsCount: Number(barberFormReviewsCount) || 50,
        experienceYears: Number(barberFormExperience) || 3,
        avatar: barberFormAvatar.trim(),
        specialty: barberFormSpecialty.trim() || 'خدمات تخصصی مو و پیرایش ریش',
        active: true,
      };
      onUpdateBarbers([...barbers, newBarber]);
      setBarberActionSuccess(`آرایشگر جدید «${newBarber.name}» با موفقیت اضافه شد.`);
    } else {
      const updated = barbers.map((b) =>
        b.id === barberFormId
          ? {
              ...b,
              name: barberFormName.trim(),
              title: barberFormTitle.trim() || 'استایلیست سالن',
              rating: Number(barberFormRating) || b.rating,
              reviewsCount: Number(barberFormReviewsCount) || b.reviewsCount,
              experienceYears: Number(barberFormExperience) || b.experienceYears,
              avatar: barberFormAvatar.trim(),
              specialty: barberFormSpecialty.trim() || b.specialty,
            }
          : b
      );
      onUpdateBarbers(updated);
      setBarberActionSuccess(`مشخصات آرایشگر «${barberFormName.trim()}» با موفقیت به‌روزرسانی شد.`);
    }
    setTimeout(() => setBarberActionSuccess(null), 3500);
    setShowBarberModal(false);
  };

  // Save full settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(tempSettings);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
  };

  return (
    <div id="admin-dashboard-container" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Banner & Quick Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel rounded-3xl p-6 border border-white/10">
        <div className="text-center md:text-right">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <h1 className="text-xl sm:text-2xl font-black text-white">پنل هوشمند مدیریت آرایشگاه</h1>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              همگام‌سازی ابری زنده (موبایل و لپ‌تاپ)
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5 text-center md:text-right leading-relaxed">
            نظارت زنده بر نوبت‌ها، تغییر ساعت‌های کاری، گزارش مالی و دریافت خروجی اکسل
          </p>
        </div>

        {/* Quick Tools */}
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 w-full md:w-auto">
          {/* Test Chime */}
          <button
            onClick={() => playNotificationSound('success')}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-amber-400 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            title="تست صدای اعلان نوبت جدید"
          >
            <Volume2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span>تست صدای اعلان</span>
          </button>

          {/* Export to Excel */}
          <button
            id="admin-export-excel-top-btn"
            onClick={() => exportBookingsToExcel(bookings)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>خروجی اکسل (.xlsx)</span>
          </button>

          {/* Clear All Bookings */}
          {bookings.length > 0 && onClearAllBookings && (
            showConfirmClearAll ? (
              <div className="flex items-center justify-center gap-1.5 p-1 rounded-xl bg-rose-950/80 border border-rose-500/40 text-xs animate-in fade-in">
                <span className="text-rose-300 text-[11px] px-1.5 font-medium">همه نوبت‌ها پاک شوند؟</span>
                <button
                  onClick={() => {
                    onClearAllBookings();
                    setShowConfirmClearAll(false);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] shadow-sm transition-colors"
                >
                  بله، پاک کن
                </button>
                <button
                  onClick={() => setShowConfirmClearAll(false)}
                  className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-[11px] transition-colors"
                >
                  انصراف
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowConfirmClearAll(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="پاکسازی تمام نوبت‌ها و آزادسازی کلیه ساعت‌ها"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>پاکسازی تمام نوبت‌ها</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>درآمد کل ماه جاری</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-white">
            {formatTomans(metrics.totalRevenue)}
          </div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
            <TrendingUp className="w-3 h-3" />
            <span>درآمد امروز: {formatTomans(metrics.todayRevenue)}</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>کل نوبت‌های ثبت شده</span>
            <Calendar className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-white">
            {toPersianDigits(metrics.totalBookings)} نوبت
          </div>
          <div className="text-[11px] text-sky-400 font-medium">
            {toPersianDigits(metrics.todayCount)} نوبت برای امروز
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>نوبت‌های در انتظار / تایید شده</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-amber-300">
            {toPersianDigits(metrics.confirmedCount)} نوبت
          </div>
          <div className="text-[11px] text-slate-400">
            {toPersianDigits(metrics.completedCount)} نوبت انجام شده
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>میانگین فاکتور هر مشتری</span>
            <BarChart3 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-white">
            {formatTomans(metrics.averageBill)}
          </div>
          <div className="text-[11px] text-slate-400">
            نرخ لغو نوبت: {toPersianDigits(metrics.cancelRate)}٪
          </div>
        </div>

      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/10">
        {[
          { id: 'bookings', label: 'نوبت‌ها و مانیتور زنده', icon: Calendar, badge: metrics.confirmedCount },
          { id: 'slots', label: 'تقویم و ساعت‌های کاری', icon: Clock },
          { id: 'services', label: 'خدمات و آرایشگران', icon: Scissors },
          { id: 'analytics', label: 'گزارش‌های مالی و اکسل', icon: BarChart3 },
          { id: 'settings', label: 'تنظیمات سالن و امنیت', icon: SettingsIcon },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800/80 border border-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-slate-950 text-amber-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {toPersianDigits(tab.badge)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: LIVE BOOKINGS */}
      {activeTab === 'bookings' && (
        <div className="space-y-6">
          
          {/* Filters Bar */}
          <div className="glass-panel rounded-2xl p-4 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو با نام مشتری، شماره تلفن، یا کد نوبت..."
                className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-amber-500"
              />
              <Search className="w-4 h-4 text-slate-500 absolute top-3 right-3 pointer-events-none" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              
              {/* Date Filters */}
              <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-white/10 text-xs">
                {[
                  { id: 'all', label: 'همه روزها' },
                  { id: 'today', label: 'امروز' },
                  { id: 'tomorrow', label: 'فردا' },
                  { id: 'upcoming', label: 'پیش‌رو' },
                ].map((df) => (
                  <button
                    key={df.id}
                    onClick={() => setDateFilter(df.id as typeof dateFilter)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      dateFilter === df.id ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {df.label}
                  </button>
                ))}
              </div>

              {/* Status Filters */}
              <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-white/10 text-xs">
                {[
                  { id: 'all', label: 'همه وضعیت‌ها' },
                  { id: 'confirmed', label: 'تایید شده' },
                  { id: 'completed', label: 'انجام شده' },
                  { id: 'cancelled', label: 'لغو شده' },
                ].map((sf) => (
                  <button
                    key={sf.id}
                    onClick={() => setStatusFilter(sf.id as typeof statusFilter)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      statusFilter === sf.id ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {sf.label}
                  </button>
                ))}
              </div>

            </div>

          </div>

          {/* Bookings Table / Cards */}
          <div className="space-y-3">
            {bookings.length === 0 ? (
              <div className="text-center py-16 glass-panel rounded-3xl border border-dashed border-amber-500/30 p-8 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/5">
                  <Calendar className="w-8 h-8" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base sm:text-lg font-black text-white">
                    مانیتورینگ زنده فعال است — لیست نوبت‌ها آماده دریافت
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                    تمام نوبت‌های قبلی پاکسازی شده و کلیه ساعت‌های کاری آزاد هستند. به محض اینکه مشتری نوبتی رزرو کند، بلافاصله به صورت زنده در این جدول ثبت و اعلان آن پخش خواهد شد.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>مانیتورینگ آنی متصل به سیستم نوبت‌دهی مشتریان</span>
                </div>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-16 glass-panel rounded-3xl border border-white/10 space-y-3">
                <Calendar className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-slate-400">هیچ نوبتی با فیلترهای انتخابی یافت نشد</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setDateFilter('all');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-amber-400 hover:bg-slate-700"
                >
                  پاک کردن تمام فیلترها
                </button>
              </div>
            ) : (
              filteredBookings.map((b) => {
                const isCancelled = b.status === 'cancelled';
                const isCompleted = b.status === 'completed';

                return (
                  <div
                    key={b.id}
                    className={`p-5 rounded-2xl border transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                      isCancelled
                        ? 'bg-slate-900/40 border-rose-900/20 opacity-70'
                        : isCompleted
                        ? 'bg-slate-900/60 border-blue-900/20'
                        : 'glass-card border-white/10 hover:border-amber-500/40'
                    }`}
                  >
                    {/* Customer & Service Info */}
                    <div className="flex flex-wrap items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-800/90 border border-white/10 flex flex-col items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span className="font-mono text-xs font-bold text-white mt-0.5">{b.timeSlot}</span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white text-base">{b.customerName}</h3>
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-amber-300">
                            {b.id}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                          <span className="flex items-center gap-1 text-slate-300">
                            <Scissors className="w-3.5 h-3.5 text-amber-400" />
                            <span>{b.serviceTitle}</span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-amber-400" />
                            <span>آرایشگر: {b.barberName}</span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-amber-300 font-bold">
                            {formatTomans(b.servicePrice)}
                          </span>
                        </div>

                        {b.customerNotes && (
                          <p className="text-[11px] text-slate-400 italic mt-1">
                            یادداشت: {b.customerNotes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Date & Contact */}
                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      <div className="space-y-0.5 text-right">
                        <span className="text-slate-400 block">{b.dateShamsi}</span>
                        <a
                          href={`tel:${b.customerPhone}`}
                          className="font-mono text-slate-300 hover:text-amber-400 flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3 text-amber-400" />
                          <span>{b.customerPhone}</span>
                        </a>
                      </div>

                      {/* Status indicator */}
                      <div>
                        {b.status === 'confirmed' && (
                          <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                            <span>تایید شده</span>
                          </span>
                        )}
                        {b.status === 'completed' && (
                          <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>انجام شده</span>
                          </span>
                        )}
                        {b.status === 'cancelled' && (
                          <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>لغو شده ({b.cancelledBy === 'customer' ? 'مشتری' : 'مدیر'})</span>
                          </span>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5">
                        {b.status === 'confirmed' && (
                          <>
                            <button
                              onClick={() => onUpdateBookingStatus(b.id, 'completed')}
                              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1 transition-colors"
                              title="تغییر به انجام شده"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">اتمام کار</span>
                            </button>
                            <button
                              onClick={() => onCancelBooking(b.id, 'لغو توسط مدیریت')}
                              className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs font-medium flex items-center gap-1 transition-colors"
                              title="لغو نوبت توسط مدیر"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">لغو نوبت</span>
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => onDeleteBooking(b.id)}
                          className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="حذف از تاریخچه"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </div>

        </div>
      )}

      {/* TAB 2: SLOTS & CALENDAR MANAGEMENT */}
      {activeTab === 'slots' && (
        <div className="space-y-6">
          
          {/* Edit Salon Working Hours Form */}
          <div className="glass-panel rounded-3xl p-6 border border-white/10">
            <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>تنظیم ساعت کار سالن و فواصل نوبت‌دهی</span>
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              ساعت شروع و پایان و مدت زمان هر نوبت را تنظیم کنید تا جدول ساعات برای رزرو کاربران خودکار ساخته شود.
            </p>

            <form onSubmit={handleSaveHours} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  ساعت شروع به کار سالن
                </label>
                <input
                  type="time"
                  value={tempOpenHour}
                  onChange={(e) => setTempOpenHour(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white font-mono text-sm focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  ساعت پایان کار سالن
                </label>
                <input
                  type="time"
                  value={tempCloseHour}
                  onChange={(e) => setTempCloseHour(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white font-mono text-sm focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  مدت زمان هر نوبت (دقیقه)
                </label>
                <select
                  value={tempSlotDuration}
                  onChange={(e) => setTempSlotDuration(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-sm focus:border-amber-500"
                >
                  <option value={30}>۳۰ دقیقه</option>
                  <option value={45}>۴۵ دقیقه (استاندارد)</option>
                  <option value={60}>۶۰ دقیقه (یک ساعت)</option>
                  <option value={90}>۹۰ دقیقه</option>
                </select>
              </div>

              <button
                type="submit"
                className="py-2.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
              >
                {savedHoursSuccess ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                <span>{savedHoursSuccess ? 'ذخیره شد!' : 'ذخیره تغییرات ساعت'}</span>
              </button>
            </form>
          </div>

          {/* Real-time Slot Locker Tool */}
          <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                <span>قفل و بازگشایی دستی ساعت‌ها (قفل آنی)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                روی هر ساعتی که کلیک کنید، بلافاصله مسدود می‌شود و برای مشتریان غیرقابل رزرو خواهد شد (برای ساعت ناهار، تماس تلفنی یا استراحت).
              </p>
            </div>

            {/* Choose Day */}
            <div>
              <span className="text-xs font-semibold text-slate-300 block mb-2">
                ۱. انتخاب روز:
              </span>
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {upcomingDays.map((day) => {
                  const isSelected = selectedDayForSlots.dateStr === day.dateStr;
                  return (
                    <button
                      key={day.dateStr}
                      onClick={() => setSelectedDayForSlots(day)}
                      className={`shrink-0 py-2.5 px-4 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                          : 'bg-slate-900 border border-white/10 text-slate-300 hover:border-amber-500/30'
                      }`}
                    >
                      <span>{day.dayName} ({day.dayOfMonth} {day.monthName})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Choose Barber for Slots */}
            <div>
              <span className="text-xs font-semibold text-slate-300 block mb-2">
                ۲. انتخاب آرایشگر (مشاهده و قفل تقویم اختصاصی):
              </span>
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                <button
                  type="button"
                  onClick={() => setSelectedBarberForSlots('all')}
                  className={`shrink-0 py-2 px-3.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    selectedBarberForSlots === 'all'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow'
                      : 'bg-slate-900 border border-white/10 text-slate-300 hover:border-amber-500/30'
                  }`}
                >
                  همه آرایشگران (کل سالن)
                </button>
                {barbers.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedBarberForSlots(b.id)}
                    className={`shrink-0 py-2 px-3.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                      selectedBarberForSlots === b.id
                        ? 'bg-amber-500 text-slate-950 font-bold shadow'
                        : 'bg-slate-900 border border-white/10 text-slate-300 hover:border-amber-500/30'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>{b.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Slots Matrix */}
            <div className="pt-2">
              <span className="text-xs font-semibold text-slate-300 block mb-3">
                ساعت‌های {selectedDayForSlots.dayName} ({selectedDayForSlots.fullShamsi})
                {selectedBarberForSlots !== 'all' && (
                  <span className="text-amber-400 mr-2">
                    - اختصاصی برای {barbers.find((b) => b.id === selectedBarberForSlots)?.name}
                  </span>
                )}:
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {generateTimeSlots(settings.openHour, settings.closeHour, settings.slotDurationMinutes).map((time) => {
                  const targetBarberId = selectedBarberForSlots === 'all' ? undefined : selectedBarberForSlots;
                  const isBlocked = blockedSlots.some(
                    (s) =>
                      s.dateStr === selectedDayForSlots.dateStr &&
                      s.timeSlot === time &&
                      (!s.barberId || !targetBarberId || s.barberId === targetBarberId)
                  );
                  const bookedBooking = bookings.find(
                    (b) =>
                      b.dateStr === selectedDayForSlots.dateStr &&
                      b.timeSlot === time &&
                      b.status === 'confirmed' &&
                      (!targetBarberId || b.barberId === targetBarberId)
                  );
                  const isBooked = Boolean(bookedBooking);

                  return (
                    <button
                      key={time}
                      onClick={() => onToggleBlockSlot(selectedDayForSlots.dateStr, time, targetBarberId)}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                        isBooked
                          ? 'bg-blue-950/40 border-blue-800 text-blue-300'
                          : isBlocked
                          ? 'bg-rose-950/30 border-rose-800 text-rose-300 shadow-inner'
                          : 'bg-slate-900 border-white/10 hover:border-amber-500/50 text-slate-200'
                      }`}
                    >
                      <span className="font-mono text-sm font-bold">{time}</span>
                      <div className="text-[10px] flex items-center gap-1">
                        {isBooked ? (
                          <>
                            <User className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[80px]">
                              {selectedBarberForSlots === 'all' ? bookedBooking?.barberName : bookedBooking?.customerName}
                            </span>
                          </>
                        ) : isBlocked ? (
                          <>
                            <Lock className="w-3 h-3 text-rose-400 shrink-0" />
                            <span>قفل دستی</span>
                          </>
                        ) : (
                          <>
                            <Unlock className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span className="text-emerald-400">آزاد</span>
                          </>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB 3: SERVICES & BARBERS */}
      {activeTab === 'services' && (
        <div className="space-y-6">
          
          {/* Services Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">لیست خدمات و تعرفه‌ها</h2>
              <p className="text-xs text-slate-400">ویرایش قیمت‌ها، مدت زمان و دسته‌بندی خدمات سالن</p>
            </div>
            <button
              onClick={() => setShowAddServiceModal(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>افزودن خدمت جدید</span>
            </button>
          </div>

          {/* Add Service Modal */}
          {showAddServiceModal && (
            <div className="glass-panel rounded-3xl p-6 border border-amber-500/40 space-y-4">
              <h3 className="text-sm font-bold text-white">افزودن خدمت جدید به سالن</h3>
              <form onSubmit={handleCreateService} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">عنوان خدمت</label>
                  <input
                    type="text"
                    required
                    value={newServiceTitle}
                    onChange={(e) => setNewServiceTitle(e.target.value)}
                    placeholder="مثال: کراتینه مو"
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">قیمت (تومان)</label>
                  <input
                    type="number"
                    required
                    step={10000}
                    value={newServicePrice}
                    onChange={(e) => setNewServicePrice(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">مدت زمان (دقیقه)</label>
                  <input
                    type="number"
                    required
                    value={newServiceDuration}
                    onChange={(e) => setNewServiceDuration(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">دسته‌بندی</label>
                  <select
                    value={newServiceCategory}
                    onChange={(e) => setNewServiceCategory(e.target.value as typeof newServiceCategory)}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs"
                  >
                    <option value="hair">مو و سر</option>
                    <option value="beard">ریش و صورت</option>
                    <option value="vip">پکیج VIP</option>
                    <option value="care">مراقبت و فیشیال</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs text-slate-300 mb-1">توضیحات مختصر</label>
                  <input
                    type="text"
                    value={newServiceDesc}
                    onChange={(e) => setNewServiceDesc(e.target.value)}
                    placeholder="توضیح کوتاه درباره جزییات خدمت..."
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                  >
                    ثبت خدمت
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddServiceModal(false)}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 text-slate-300 text-xs"
                  >
                    انصراف
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Services List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((srv) => (
              <div key={srv.id} className="p-5 rounded-2xl glass-card border border-white/10 space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="font-bold text-white text-base">{srv.title}</h3>
                  <button
                    onClick={() => {
                      if (confirm(`آیا از حذف «${srv.title}» اطمینان دارید؟`)) {
                        onUpdateServices(services.filter((s) => s.id !== srv.id));
                      }
                    }}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 transition-colors"
                    title="حذف خدمت"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                  {srv.description}
                </p>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                  <span className="text-slate-400">{srv.durationMinutes} دقیقه</span>
                  <span className="text-amber-400 font-bold text-sm">{formatTomans(srv.price)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Barbers / Staff Section */}
          <div className="pt-8 border-t border-white/10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-400" />
                  <span>مدیریت آرایشگران و کادر سالن</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  افزودن آرایشگر جدید، حذف، تغییر نام، تخصص، سابقه و آپلود مستقیم عکس از سیستم
                </p>
              </div>
              <button
                id="admin-add-barber-btn"
                type="button"
                onClick={handleOpenAddBarber}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>افزودن آرایشگر جدید</span>
              </button>
            </div>

            {/* Notification alert banner */}
            {barberActionSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{barberActionSuccess}</span>
              </motion.div>
            )}

            {/* Barbers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {barbers.map((barber) => (
                <div
                  key={barber.id}
                  className="p-5 rounded-2xl glass-card border border-white/10 hover:border-amber-500/30 transition-all flex flex-col justify-between gap-4 relative group"
                >
                  <div className="flex items-start gap-4">
                    <div className="relative shrink-0">
                      <img
                        src={barber.avatar}
                        alt={barber.name}
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-500/40 shadow-md shadow-amber-500/10 bg-slate-900"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        onClick={() => handleOpenEditBarber(barber)}
                        title="تغییر عکس و ویرایش مشخصات"
                        className="absolute -bottom-1.5 -left-1.5 w-6 h-6 rounded-full bg-slate-900 border border-amber-500/50 text-amber-400 hover:bg-amber-500 hover:text-slate-950 flex items-center justify-center transition-colors shadow cursor-pointer"
                      >
                        <Camera className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h3 className="font-bold text-white text-base truncate">{barber.name}</h3>
                      </div>
                      <p className="text-xs text-amber-400 font-medium truncate">{barber.title}</p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-0.5">
                        <span className="flex items-center gap-0.5 text-amber-300">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span className="font-mono">{toPersianDigits(barber.rating)}</span>
                        </span>
                        <span>•</span>
                        <span>{toPersianDigits(barber.experienceYears)} سال سابقه</span>
                      </div>
                    </div>
                  </div>

                  {/* Specialty */}
                  {barber.specialty && (
                    <p className="text-xs text-slate-400 bg-white/5 rounded-xl p-2.5 line-clamp-2 leading-relaxed">
                      {barber.specialty}
                    </p>
                  )}

                  {/* Actions buttons */}
                  <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEditBarber(barber)}
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 border border-white/5 transition-all cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>ویرایش نام و عکس</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteBarber(barber)}
                      className="py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 text-xs font-medium flex items-center justify-center gap-1 border border-rose-500/20 transition-all cursor-pointer"
                      title="حذف آرایشگر"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">حذف</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* TAB 4: FINANCIAL REPORTS & EXCEL EXPORT */}
      {activeTab === 'analytics' && (
        <div className="space-y-8">
          
          {/* Header with Excel Export Button */}
          <div className="glass-panel rounded-3xl p-6 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">گزارش‌های جامع مالی و درآمد</h2>
              <p className="text-xs text-slate-400 mt-1">
                مشاهده روند فروش، درآمد ماهانه و دانلود فایل استاندارد اکسل شامل مشخصات دقیق فاکتورها
              </p>
            </div>

            <button
              id="admin-export-excel-main-btn"
              onClick={() => exportBookingsToExcel(bookings)}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Download className="w-4 h-4" />
              <span>دانلود خروجی کامل اکسل (.xlsx)</span>
            </button>
          </div>

          {/* Monthly Revenue Visual Chart */}
          <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-400" />
                <span>نمودار درآمد ماهانه سالن (تومان)</span>
              </h3>
              <span className="text-xs text-slate-400">۶ ماه اخیر</span>
            </div>

            {/* Custom Responsive SVG / Bar Chart */}
            <div className="h-64 flex items-end justify-between gap-2 sm:gap-6 pt-10 px-2 sm:px-6">
              {monthlyData.months.map((m, idx) => {
                const heightPercent = Math.max(15, Math.round((m.revenue / monthlyData.maxRev) * 100));
                const isCurrent = idx === monthlyData.months.length - 1;

                return (
                  <div key={m.name} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    
                    {/* Tooltip on hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-amber-300 font-bold bg-slate-900 px-2 py-1 rounded-md border border-white/10 whitespace-nowrap">
                      {formatTomans(m.revenue)}
                    </div>

                    {/* Bar */}
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPercent}%` }}
                      transition={{ duration: 0.6, delay: idx * 0.08 }}
                      className={`w-full max-w-[48px] rounded-t-xl transition-all duration-300 ${
                        isCurrent
                          ? 'bg-gradient-to-t from-amber-600 via-amber-500 to-yellow-400 shadow-lg shadow-amber-500/25 group-hover:brightness-110'
                          : 'bg-gradient-to-t from-slate-800 to-slate-700 hover:from-amber-600/70 hover:to-amber-400/70'
                      }`}
                    />

                    {/* Label */}
                    <span className={`text-[10px] sm:text-xs text-center truncate w-full ${
                      isCurrent ? 'text-amber-400 font-bold' : 'text-slate-400'
                    }`}>
                      {m.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Services Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-4">
              <h3 className="text-sm font-bold text-white">محبوب‌ترین خدمات بر اساس رزرو</h3>
              <div className="space-y-3">
                {services.map((srv) => {
                  const count = bookings.filter((b) => b.serviceId === srv.id && b.status !== 'cancelled').length;
                  const percent = metrics.totalBookings > 0 ? Math.round((count / metrics.totalBookings) * 100) : 0;

                  return (
                    <div key={srv.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-medium">{srv.title}</span>
                        <span className="text-amber-400 font-bold">{toPersianDigits(count)} رزرو ({toPersianDigits(percent)}٪)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full"
                          style={{ width: `${Math.max(5, percent)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-4">
              <h3 className="text-sm font-bold text-white">عملکرد آرایشگران سالن</h3>
              <div className="space-y-3">
                {barbers.map((barber) => {
                  const bBookings = bookings.filter((b) => b.barberId === barber.id && b.status !== 'cancelled');
                  const bRevenue = bBookings.reduce((sum, b) => sum + b.servicePrice, 0);

                  return (
                    <div key={barber.id} className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={barber.avatar}
                          alt={barber.name}
                          className="w-10 h-10 rounded-xl object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <h4 className="text-xs font-bold text-white">{barber.name}</h4>
                          <span className="text-[10px] text-slate-400">{toPersianDigits(bBookings.length)} نوبت موفق</span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-amber-400">{formatTomans(bRevenue)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB 5: SETTINGS */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl mx-auto space-y-6">
          
          <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white">تنظیمات اصلی سالن و امنیت</h2>
              <p className="text-xs text-slate-400 mt-1">تغییر نام مجموعه، نشانی، شماره تماس و رمز عبور مدیریت</p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">نام سالن</label>
                <input
                  type="text"
                  value={tempSettings.shopName}
                  onChange={(e) => setTempSettings({ ...tempSettings, shopName: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-white/10 text-white text-sm focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">شعار یا زیرعنوان</label>
                <input
                  type="text"
                  value={tempSettings.shopSubtitle}
                  onChange={(e) => setTempSettings({ ...tempSettings, shopSubtitle: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-white/10 text-white text-sm focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">شماره تماس پشتیبانی</label>
                <input
                  type="text"
                  dir="ltr"
                  value={tempSettings.phone}
                  onChange={(e) => setTempSettings({ ...tempSettings, phone: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-white/10 text-white text-sm font-mono text-left focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">آدرس کامل سالن</label>
                <input
                  type="text"
                  value={tempSettings.address}
                  onChange={(e) => setTempSettings({ ...tempSettings, address: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-white/10 text-white text-sm focus:border-amber-500"
                />
              </div>

              <div className="pt-2 border-t border-white/10">
                <label className="block text-xs font-semibold text-slate-300 mb-1">رمز عبور ورود به مدیریت</label>
                <input
                  type="text"
                  dir="ltr"
                  value={tempSettings.adminPin}
                  onChange={(e) => setTempSettings({ ...tempSettings, adminPin: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-white/10 text-white text-sm font-mono text-left focus:border-amber-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  این رمز هنگام ورود به پنل مدیریت از شما خواسته می‌شود.
                </span>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {settingsSaved ? <Check className="w-4 h-4" /> : <SettingsIcon className="w-4 h-4" />}
                <span>{settingsSaved ? 'تنظیمات ذخیره شد!' : 'ذخیره تمام تنظیمات'}</span>
              </button>
            </form>
          </div>

        </div>
      )}

      {/* ADD / EDIT BARBER MODAL */}
      <AnimatePresence>
        {showBarberModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="glass-panel w-full max-w-xl max-h-[92dvh] sm:max-h-[88vh] rounded-3xl border border-amber-500/30 shadow-2xl shadow-black/90 flex flex-col my-auto text-right overflow-hidden"
              dir="rtl"
            >
              <form onSubmit={handleSaveBarber} className="flex flex-col h-full max-h-[92dvh] sm:max-h-[88vh] overflow-hidden">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-white/10 p-4 sm:p-5 shrink-0 bg-slate-900/60">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                      {barberFormMode === 'add' ? <UserPlus className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-white">
                        {barberFormMode === 'add' ? 'افزودن آرایشگر جدید به سالن' : 'ویرایش مشخصات و عکس آرایشگر'}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {barberFormMode === 'add'
                          ? 'اطلاعات و عکس آرایشگر جدید را جهت نمایش در سیستم نوبت‌دهی وارد فرمایید.'
                          : `در حال تغییر اطلاعات «${barberFormName || 'آرایشگر'}»`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowBarberModal(false)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                    title="بستن پنجره"
                    aria-label="بستن پنجره"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Scrollable Form Body */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                    {/* Name */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        نام و نام خانوادگی آرایشگر <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={barberFormName}
                        onChange={(e) => setBarberFormName(e.target.value)}
                        placeholder="مثال: سهراب رحیمی"
                        className="w-full p-2.5 rounded-xl bg-slate-900/90 border border-white/10 text-white text-xs focus:border-amber-400 outline-none transition-colors"
                      />
                    </div>

                    {/* Title */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        عنوان یا سمت <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={barberFormTitle}
                        onChange={(e) => setBarberFormTitle(e.target.value)}
                        placeholder="مثال: استایلیست ارشد و هیرکاتور"
                        className="w-full p-2.5 rounded-xl bg-slate-900/90 border border-white/10 text-white text-xs focus:border-amber-400 outline-none transition-colors"
                      />
                    </div>

                    {/* Experience */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        سابقه کار (سال)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={50}
                        value={barberFormExperience}
                        onChange={(e) => setBarberFormExperience(Number(e.target.value))}
                        className="w-full p-2.5 rounded-xl bg-slate-900/90 border border-white/10 text-white text-xs font-mono focus:border-amber-400 outline-none transition-colors"
                      />
                    </div>

                    {/* Rating */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        امتیاز رضایت مشتریان (از ۵)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        max="5"
                        value={barberFormRating}
                        onChange={(e) => setBarberFormRating(Number(e.target.value))}
                        className="w-full p-2.5 rounded-xl bg-slate-900/90 border border-white/10 text-white text-xs font-mono focus:border-amber-400 outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Specialty */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      تخصص‌ها و سبک‌های کاری
                    </label>
                    <input
                      type="text"
                      value={barberFormSpecialty}
                      onChange={(e) => setBarberFormSpecialty(e.target.value)}
                      placeholder="مثال: فید تخصصی، پکیج داماد، پاکسازی پوست و استایل اروپایی"
                      className="w-full p-2.5 rounded-xl bg-slate-900/90 border border-white/10 text-white text-xs focus:border-amber-400 outline-none transition-colors"
                    />
                  </div>

                  {/* Barber Photo Section - Upload from Device */}
                  <div className="pt-3 border-t border-white/10 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <label className="block text-xs font-bold text-white flex items-center gap-2">
                        <Camera className="w-4 h-4 text-amber-400" />
                        <span>عکس آرایشگر (انتخاب و آپلود از سیستم)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowCustomUrlInput(!showCustomUrlInput)}
                        className="text-[11px] text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                      >
                        {showCustomUrlInput ? '« بازگشت به آپلود فایل' : 'وارد کردن لینک مستقیم عکس (URL) »'}
                      </button>
                    </div>

                    {/* Preview & File Upload Area */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                      {/* Live Preview Avatar */}
                      <div className="relative shrink-0 flex flex-row sm:flex-col items-center gap-2.5 sm:gap-1.5 w-full sm:w-auto p-2 sm:p-0 rounded-xl bg-slate-900/40 sm:bg-transparent border border-white/5 sm:border-none">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-amber-500/60 shadow-lg shadow-amber-500/20 bg-slate-900 flex items-center justify-center relative shrink-0">
                          {barberFormAvatar ? (
                            <img
                              src={barberFormAvatar}
                              alt="پیش‌نمایش عکس"
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <ImageIcon className="w-7 h-7 sm:w-8 sm:h-8 text-slate-600" />
                          )}
                          {isProcessingImage && (
                            <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center">
                              <RefreshCw className="w-5 h-5 text-amber-400 animate-spin" />
                            </div>
                          )}
                        </div>
                        <div className="sm:text-center">
                          <span className="text-[11px] sm:text-[10px] text-slate-300 sm:text-slate-400 font-medium sm:font-normal block">پیش‌نمایش عکس</span>
                          <span className="text-[10px] text-slate-500 sm:hidden">کیفیت اصلی ذخیره می‌شود</span>
                        </div>
                      </div>

                      {/* Upload Dropzone */}
                      <div className="flex-1 w-full">
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDraggingImage(true);
                          }}
                          onDragLeave={() => setIsDraggingImage(false)}
                          onDrop={handleDropImage}
                          className={`relative border-2 border-dashed rounded-2xl p-3.5 sm:p-4 text-center transition-all ${
                            isDraggingImage
                              ? 'border-amber-400 bg-amber-500/20'
                              : 'border-white/15 hover:border-amber-500/40 bg-slate-900/60'
                          }`}
                        >
                          <input
                            type="file"
                            id="barber-avatar-file-input"
                            accept="image/*"
                            onChange={handleFileInputChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                          <div className="flex flex-col items-center justify-center gap-1.5 pointer-events-none">
                            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                              <Upload className="w-4 h-4" />
                            </div>
                            <p className="text-xs font-semibold text-white">
                              کلیک کنید یا عکس آرایشگر را از سیستم اینجا رها کنید
                            </p>
                            <p className="text-[10px] sm:text-[11px] text-slate-400">
                              فرمت‌های مجاز: JPG, PNG, WebP (فشرده‌سازی خودکار و بارگذاری سریع)
                            </p>
                          </div>
                        </div>

                        {imageUploadError && (
                          <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{imageUploadError}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Manual URL Input fallback */}
                    {showCustomUrlInput && (
                      <div className="pt-2">
                        <label className="block text-[11px] text-slate-400 mb-1">
                          آدرس اینترنتی مستقیم عکس (URL):
                        </label>
                        <input
                          type="url"
                          value={barberFormAvatar}
                          onChange={(e) => setBarberFormAvatar(e.target.value)}
                          placeholder="https://images.unsplash.com/..."
                          className="w-full p-2.5 rounded-xl bg-slate-900/90 border border-white/10 text-white text-xs font-mono focus:border-amber-400 outline-none transition-colors"
                        />
                      </div>
                    )}

                    {/* Preset Avatars Selection */}
                    <div className="pt-2">
                      <p className="text-[11px] text-slate-400 mb-2">
                        یا می‌توانید یکی از تصاویر آماده زیر را سریعاً انتخاب نمایید:
                      </p>
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {PRESET_AVATARS.map((url, idx) => {
                          const isChosen = barberFormAvatar === url;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setBarberFormAvatar(url);
                                setImageUploadError(null);
                              }}
                              className={`relative rounded-xl overflow-hidden shrink-0 transition-all cursor-pointer ${
                                isChosen
                                  ? 'ring-2 ring-amber-400 scale-105 shadow-md shadow-amber-500/30'
                                  : 'opacity-60 hover:opacity-100'
                              }`}
                            >
                              <img
                                src={url}
                                alt={`Preset ${idx + 1}`}
                                className="w-10 h-10 sm:w-11 sm:h-11 object-cover"
                                referrerPolicy="no-referrer"
                              />
                              {isChosen && (
                                <div className="absolute inset-0 bg-amber-500/30 flex items-center justify-center">
                                  <Check className="w-4 h-4 text-white drop-shadow" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer Buttons - Pinned at bottom */}
                <div className="p-3.5 sm:p-5 border-t border-white/10 shrink-0 bg-slate-950/70 flex items-center justify-end gap-2.5 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setShowBarberModal(false)}
                    className="py-2.5 px-4 sm:px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessingImage}
                    className="py-2.5 px-5 sm:px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {barberFormMode === 'add' ? 'افزودن آرایشگر' : 'ذخیره و اعمال تغییرات'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
