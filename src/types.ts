export interface Service {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  price: number; // in Tomans
  category: 'hair' | 'beard' | 'vip' | 'care';
  iconName: string;
  popular?: boolean;
}

export interface Barber {
  id: string;
  name: string;
  title: string;
  rating: number;
  reviewsCount: number;
  experienceYears: number;
  avatar: string;
  specialty: string;
  active: boolean;
}

export interface Booking {
  id: string; // Unique human readable tracking code e.g. BRB-8421
  customerName: string;
  customerPhone: string;
  customerNotes?: string;
  serviceId: string;
  serviceTitle: string;
  servicePrice: number;
  barberId: string;
  barberName: string;
  dateStr: string; // YYYY-MM-DD
  dateShamsi: string; // e.g. "دوشنبه ۱۷ شهریور"
  timeSlot: string; // e.g. "17:30"
  status: 'confirmed' | 'completed' | 'cancelled';
  createdAt: string;
  cancelledBy?: 'customer' | 'admin';
  cancelReason?: string;
}

export interface BlockedSlot {
  id: string;
  dateStr: string;
  timeSlot: string;
  barberId?: string; // if undefined, applies to all barbers
  reason?: string;
}

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  bookingId?: string;
  timestamp: string;
  read: boolean;
  type: 'booking_created' | 'booking_cancelled' | 'system';
}

export interface ShopSettings {
  shopName: string;
  shopSubtitle: string;
  address: string;
  phone: string;
  instagram: string;
  telegram: string;
  openHour: string; // "09:00"
  closeHour: string; // "22:00"
  slotDurationMinutes: number; // 45
  adminPin: string; // default "1234"
  soundAlerts: boolean;
}
