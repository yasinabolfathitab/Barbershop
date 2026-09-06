import { Service, Barber, Booking, ShopSettings, BlockedSlot, AdminNotification } from '../types';

export const INITIAL_SERVICES: Service[] = [
  {
    id: 'srv-1',
    title: 'اصلاح مو و فید حرفه‌ای',
    description: 'کوتاهی طبق متد روز دنیا، لیرینگ و فید دقیق به همراه شست‌وشو و حالت‌دهی',
    durationMinutes: 45,
    price: 250000,
    category: 'hair',
    iconName: 'Scissors',
    popular: true,
  },
  {
    id: 'srv-2',
    title: 'اصلاح و استایل ریش و سبیل',
    description: 'طراحی خط ریش با تیغ سنتی ژاپنی، آنکارد دقیق و بخور مرطوب کننده',
    durationMinutes: 30,
    price: 160000,
    category: 'beard',
    iconName: 'Sparkles',
    popular: true,
  },
  {
    id: 'srv-3',
    title: 'پکیج طلایی VIP',
    description: 'اصلاح مو، استایل ریش، پاکسازی عمیق صورت با بخور، ماساژ سر و اسکراب پوست',
    durationMinutes: 90,
    price: 850000,
    category: 'vip',
    iconName: 'Crown',
    popular: true,
  },
  {
    id: 'srv-4',
    title: 'پاکسازی و فیشیال تخصصی صورت',
    description: 'پیلینگ پوست، بلک ماسک زغال فعال، تخلیه جوش‌های سرسیاه و ماسک طلا',
    durationMinutes: 45,
    price: 380000,
    category: 'care',
    iconName: 'Smile',
  },
  {
    id: 'srv-5',
    title: 'رنگساژ و پوشش سفیدی مو',
    description: 'رنگ‌کاری طبیعی و کاور موهای سفید با رنگ‌های بدون آمونیاک آلمانی',
    durationMinutes: 50,
    price: 450000,
    category: 'hair',
    iconName: 'Palette',
  },
  {
    id: 'srv-6',
    title: 'ویتامینه و تقویت ساقه و ریشه مو',
    description: 'آبرسانی عمیق، پروتئین تراپی و روغن‌های درمانی به همراه اوزون تراپی',
    durationMinutes: 40,
    price: 320000,
    category: 'care',
    iconName: 'ShieldCheck',
  },
];

export const INITIAL_BARBERS: Barber[] = [
  {
    id: 'barber-1',
    name: 'یاسین ابوالفتحی',
    title: 'مدیر مجموعه و مستر استایلیست',
    rating: 4.98,
    reviewsCount: 340,
    experienceYears: 11,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    specialty: 'فید تخصصی، استایل‌های مدرن و پکیج VIP',
    active: true,
  },
  {
    id: 'barber-2',
    name: 'آرش شریفی',
    title: 'استایلیست ارشد',
    rating: 4.88,
    reviewsCount: 215,
    experienceYears: 7,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    specialty: 'کوتاهی کلاسیک، استایل اروپایی و طراحی ریش',
    active: true,
  },
  {
    id: 'barber-3',
    name: 'نیما کمالی',
    title: 'متخصص فیشیال و فرم‌دهی مو',
    rating: 4.91,
    reviewsCount: 180,
    experienceYears: 6,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
    specialty: 'پاکسازی پوست، کراتینه و آنکارد دقیق',
    active: true,
  },
];

export const INITIAL_SETTINGS: ShopSettings = {
  shopName: 'پیرایش مدرن آقایان',
  shopSubtitle: 'تجربه‌ای لوکس و متمایز از زیبایی و استایل مردانه',
  address: 'تهران، سعادت‌آباد، بلوار شهرداری، مجتمع ارغوان، طبقه ۲',
  phone: '021-22446688',
  instagram: 'barber.modern',
  telegram: 'yasinabolfathi',
  openHour: '09:30',
  closeHour: '21:30',
  slotDurationMinutes: 45,
  adminPin: '1234',
  soundAlerts: true,
};

// Generate realistic mock bookings - now initialized empty so all slots are free and only real bookings appear
export function getInitialBookings(): Booking[] {
  return [];
}

export const INITIAL_NOTIFICATIONS: AdminNotification[] = [];

