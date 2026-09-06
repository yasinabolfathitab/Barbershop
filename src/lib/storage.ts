import {
  Booking,
  Service,
  Barber,
  ShopSettings,
  BlockedSlot,
  AdminNotification,
} from '../types';
import {
  INITIAL_SERVICES,
  INITIAL_BARBERS,
  INITIAL_SETTINGS,
  getInitialBookings,
  INITIAL_NOTIFICATIONS,
} from './mockData';
import { playNotificationSound } from './sound';
import * as XLSX from 'xlsx';
import { db, handleFirestoreError, OperationType, isPermissionError } from './firebase';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
} from 'firebase/firestore';

const STORAGE_KEYS = {
  BOOKINGS: 'barber_bookings_v6',
  SERVICES: 'barber_services_v6',
  BARBERS: 'barber_barbers_v6',
  SETTINGS: 'barber_settings_v6',
  BLOCKED: 'barber_blocked_slots_v6',
  NOTIFS: 'barber_notifications_v6',
  MY_BOOKINGS: 'barber_my_booking_ids_v2',
  MY_PHONE: 'barber_my_phone_v2',
};

// Device-level storage for customer booking privacy
export function getMyBookingIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MY_BOOKINGS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveMyBookingId(id: string): void {
  try {
    const current = getMyBookingIds();
    if (!current.includes(id)) {
      const updated = [id, ...current];
      localStorage.setItem(STORAGE_KEYS.MY_BOOKINGS, JSON.stringify(updated));
    }
  } catch (e) {
    console.error(e);
  }
}

export function getSavedCustomerPhone(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.MY_PHONE) || '';
  } catch {
    return '';
  }
}

export function saveCustomerPhone(phone: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MY_PHONE, phone.trim());
  } catch (e) {
    console.error(e);
  }
}

// BroadcastChannel for instant inter-tab communication
let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel('barbershop_realtime_hub');
  }
} catch (e) {
  console.warn('BroadcastChannel not supported', e);
}

// Event emitter listeners
type SyncCallback = (event: { type: string; payload?: unknown }) => void;
const listeners = new Set<SyncCallback>();

export function subscribeToRealtimeSync(cb: SyncCallback): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function notifyListeners(type: string, payload?: unknown) {
  listeners.forEach((cb) => {
    try {
      cb({ type, payload });
    } catch (e) {
      console.error(e);
    }
  });
}

// Setup incoming cross-tab listener
if (broadcastChannel) {
  broadcastChannel.onmessage = (event) => {
    if (event.data && event.data.type) {
      notifyListeners(event.data.type, event.data.payload);
    }
  };
}

// Hook storage event for same-device cross-tab synchronization
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key && Object.values(STORAGE_KEYS).includes(e.key)) {
      notifyListeners('storage_changed', { key: e.key });
    }
  });
}

function broadcast(type: string, payload?: unknown) {
  try {
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type, payload });
    }
  } catch (e) {
    console.error('Failed to post to BroadcastChannel', e);
  }
  notifyListeners(type, payload);
}

// Helper to remove any undefined fields before sending to Firestore
function sanitize<T extends Record<string, any>>(obj: T): T {
  const clean: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = value;
    }
  }
  return clean;
}

// Track local booking IDs created in this session to prevent echo notification
const locallyCreatedBookingIds = new Set<string>();

// --- Real-time Firestore Cloud Synchronization ---
let firestoreSyncInitialized = false;

export function initFirestoreSync() {
  if (firestoreSyncInitialized || typeof window === 'undefined') return;
  firestoreSyncInitialized = true;

  let isInitialSnapshot = true;

  // 1. Listen to Bookings in Real-Time (Phone <-> Laptop Cross-Device Sync)
  try {
    const bookingsCol = collection(db, 'bookings');

    // Immediate fast pre-fetch
    getDocs(bookingsCol).then((snap) => {
      if (!snap.empty) {
        const initialDocs: Booking[] = [];
        snap.forEach((d) => initialDocs.push(d.data() as Booking));
        initialDocs.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(initialDocs));
        notifyListeners('bookings_synced', initialDocs);
      }
    }).catch(() => {
      // offline mode fallback
    });

    onSnapshot(
      bookingsCol,
      (snapshot) => {
        const firestoreBookings: Booking[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Booking;
          firestoreBookings.push(data);
        });

        // Sort by createdAt descending (newest first)
        firestoreBookings.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        // Detect newly added bookings from other devices after initial load
        if (!isInitialSnapshot) {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const addedBooking = change.doc.data() as Booking;
              if (!locallyCreatedBookingIds.has(addedBooking.id)) {
                // This is an incoming real-time booking from another device (e.g. Customer's phone -> Manager's laptop!)
                notifyListeners('booking_created', addedBooking);
                playNotificationSound('success');
              }
            }
          });
        }
        isInitialSnapshot = false;

        // Persist to local cache for instant zero-lag reads
        localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(firestoreBookings));
        notifyListeners('bookings_synced', firestoreBookings);
      },
      (error) => {
        if (isPermissionError(error)) {
          handleFirestoreError(error, OperationType.GET, 'bookings');
        }
      }
    );
  } catch (err) {
    if (isPermissionError(err)) {
      handleFirestoreError(err, OperationType.GET, 'bookings');
    }
  }

  // 2. Listen to Blocked Slots in Real-Time
  try {
    const blockedCol = collection(db, 'blockedSlots');
    onSnapshot(
      blockedCol,
      (snapshot) => {
        const slots: BlockedSlot[] = [];
        snapshot.forEach((docSnap) => {
          slots.push(docSnap.data() as BlockedSlot);
        });
        localStorage.setItem(STORAGE_KEYS.BLOCKED, JSON.stringify(slots));
        notifyListeners('blocked_slots_updated', slots);
      },
      (error) => {
        if (isPermissionError(error)) {
          handleFirestoreError(error, OperationType.GET, 'blockedSlots');
        }
      }
    );
  } catch (err) {
    if (isPermissionError(err)) {
      handleFirestoreError(err, OperationType.GET, 'blockedSlots');
    }
  }

  // 3. Listen to Shop Settings in Real-Time
  try {
    const settingsDoc = doc(db, 'settings', 'general');
    onSnapshot(
      settingsDoc,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as ShopSettings;
          localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data));
          notifyListeners('settings_updated', data);
        }
      },
      (error) => {
        if (isPermissionError(error)) {
          handleFirestoreError(error, OperationType.GET, 'settings/general');
        }
      }
    );
  } catch (err) {
    if (isPermissionError(err)) {
      handleFirestoreError(err, OperationType.GET, 'settings/general');
    }
  }

  // 4. Listen to Notifications in Real-Time
  try {
    const notifsCol = collection(db, 'notifications');
    onSnapshot(
      notifsCol,
      (snapshot) => {
        const notifs: AdminNotification[] = [];
        snapshot.forEach((docSnap) => {
          notifs.push(docSnap.data() as AdminNotification);
        });
        notifs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        localStorage.setItem(STORAGE_KEYS.NOTIFS, JSON.stringify(notifs));
        notifyListeners('notifications_updated', notifs);
      },
      (error) => {
        if (isPermissionError(error)) {
          handleFirestoreError(error, OperationType.GET, 'notifications');
        }
      }
    );
  } catch (err) {
    if (isPermissionError(err)) {
      handleFirestoreError(err, OperationType.GET, 'notifications');
    }
  }
}

// Automatically start cloud synchronization smoothly after initial load
if (typeof window !== 'undefined') {
  setTimeout(() => {
    initFirestoreSync();
  }, 300);
}

// --- Bookings API ---

export function getBookings(): Booking[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
    if (!raw) {
      const initial = getInitialBookings();
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return getInitialBookings();
  }
}

export function saveBookings(bookings: Booking[]): void {
  localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
}

export async function clearAllBookings(): Promise<void> {
  localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify([]));
  broadcast('bookings_cleared', null);

  // Also purge all bookings from Firestore
  try {
    const snap = await getDocs(collection(db, 'bookings'));
    const batch = writeBatch(db);
    snap.forEach((d) => {
      batch.delete(d.ref);
    });
    await batch.commit();
  } catch (err) {
    console.warn('Error clearing bookings in Firestore:', err);
  }
}

// Check if a specific date + time slot is already locked / reserved
export function isSlotBooked(
  dateStr: string,
  timeSlot: string,
  barberId?: string,
  bookingsList?: Booking[]
): { booked: boolean; booking?: Booking } {
  const all = bookingsList || getBookings();
  // If ANY confirmed booking exists for this exact date and time:
  // (Locks the time slot completely for other customers)
  const matched = all.find(
    (b) =>
      b.dateStr === dateStr &&
      b.timeSlot === timeSlot &&
      b.status === 'confirmed'
  );

  return {
    booked: Boolean(matched),
    booking: matched,
  };
}

// Check if slot is blocked by admin
export function isSlotBlocked(
  dateStr: string,
  timeSlot: string,
  barberId?: string,
  blockedList?: BlockedSlot[]
): boolean {
  const blocked = blockedList || getBlockedSlots();
  return blocked.some(
    (s) =>
      s.dateStr === dateStr &&
      s.timeSlot === timeSlot &&
      (!s.barberId || !barberId || s.barberId === barberId)
  );
}

export async function createBooking(data: {
  customerName: string;
  customerPhone: string;
  customerNotes?: string;
  serviceId: string;
  barberId: string;
  dateStr: string;
  dateShamsi: string;
  timeSlot: string;
}): Promise<{ success: boolean; booking?: Booking; error?: string }> {
  // Check double-booking race condition (locks the time slot for the salon)
  if (isSlotBooked(data.dateStr, data.timeSlot).booked) {
    return {
      success: false,
      error: 'متاسفانه این ساعت قبلاً توسط مشتری دیگری رزرو شده است. لطفاً ساعت دیگری را انتخاب فرمایید.',
    };
  }

  if (isSlotBlocked(data.dateStr, data.timeSlot, data.barberId)) {
    return {
      success: false,
      error: 'این ساعت توسط مدیریت سالن غیرفعال یا رزرو تلفنی شده است.',
    };
  }

  const services = getServices();
  const barbers = getBarbers();
  const service = services.find((s) => s.id === data.serviceId);
  const barber = barbers.find((b) => b.id === data.barberId);

  if (!service || !barber) {
    return { success: false, error: 'اطلاعات خدمات یا آرایشگر یافت نشد.' };
  }

  // Generate unique readable booking code
  const uniqueNum = Math.floor(1000 + Math.random() * 9000);
  const bookingId = `BRB-${uniqueNum}`;

  const newBooking: Booking = {
    id: bookingId,
    customerName: data.customerName.trim(),
    customerPhone: data.customerPhone.trim(),
    customerNotes: data.customerNotes?.trim() || '',
    serviceId: service.id,
    serviceTitle: service.title,
    servicePrice: service.price,
    barberId: barber.id,
    barberName: barber.name,
    dateStr: data.dateStr,
    dateShamsi: data.dateShamsi,
    timeSlot: data.timeSlot,
    status: 'confirmed',
    createdAt: new Date().toISOString(),
  };

  // Mark local creation to prevent local duplicate sound and store for privacy tracking
  locallyCreatedBookingIds.add(bookingId);
  saveMyBookingId(bookingId);
  saveCustomerPhone(data.customerPhone);

  // 1. Immediately update local state for zero-latency client feedback
  const currentBookings = getBookings();
  const updated = [newBooking, ...currentBookings];
  saveBookings(updated);

  playNotificationSound('success');
  broadcast('booking_created', newBooking);

  // 2. Synchronize to Firestore Cloud so Manager on Laptop receives it instantly!
  try {
    await setDoc(doc(db, 'bookings', newBooking.id), sanitize(newBooking));

    // Also push notification document to Firestore
    const notifId = `ntf-${Date.now()}`;
    await setDoc(doc(db, 'notifications', notifId), {
      id: notifId,
      title: 'نوبت جدید رزرو شد 🎉',
      message: `${newBooking.customerName} برای ساعت ${newBooking.timeSlot} (${newBooking.serviceTitle}) با آرایشگر ${newBooking.barberName} نوبت گرفت.`,
      bookingId: newBooking.id,
      timestamp: new Date().toISOString(),
      read: false,
    });
  } catch (err) {
    console.error('Error saving booking to Firestore:', err);
  }

  return { success: true, booking: newBooking };
}

export async function cancelBooking(
  bookingId: string,
  cancelledBy: 'customer' | 'admin',
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const current = getBookings();
  const index = current.findIndex((b) => b.id === bookingId);
  if (index === -1) {
    return { success: false, error: 'نوبت مورد نظر یافت نشد.' };
  }

  const target = current[index];
  if (target.status === 'cancelled') {
    return { success: false, error: 'این نوبت قبلاً لغو شده است.' };
  }

  target.status = 'cancelled';
  target.cancelledBy = cancelledBy;
  target.cancelReason = reason || (cancelledBy === 'customer' ? 'درخواست مشتری' : 'لغو توسط مدیریت سالن');

  current[index] = target;
  saveBookings(current);

  playNotificationSound('cancel');
  broadcast('booking_cancelled', { bookingId, cancelledBy });

  // Update Firestore Cloud
  try {
    await updateDoc(doc(db, 'bookings', bookingId), {
      status: 'cancelled',
      cancelledBy: target.cancelledBy,
      cancelReason: target.cancelReason,
    });

    const notifId = `ntf-${Date.now()}`;
    await setDoc(doc(db, 'notifications', notifId), {
      id: notifId,
      title: 'نوبت لغو شد ⚠️',
      message: `نوبت ${target.customerName} (${target.id}) در تاریخ ${target.dateShamsi} ساعت ${target.timeSlot} لغو گردید.`,
      bookingId: target.id,
      timestamp: new Date().toISOString(),
      read: false,
    });
  } catch (err) {
    console.error('Error updating cancellation in Firestore:', err);
  }

  return { success: true };
}

export async function updateBookingStatus(
  bookingId: string,
  status: 'confirmed' | 'completed' | 'cancelled'
): Promise<void> {
  const current = getBookings();
  const updated = current.map((b) => (b.id === bookingId ? { ...b, status } : b));
  saveBookings(updated);
  broadcast('booking_updated', { bookingId, status });

  try {
    await updateDoc(doc(db, 'bookings', bookingId), { status });
  } catch (err) {
    console.error('Error updating booking status in Firestore:', err);
  }
}

export async function deleteBooking(bookingId: string): Promise<void> {
  const current = getBookings();
  const filtered = current.filter((b) => b.id !== bookingId);
  saveBookings(filtered);
  broadcast('booking_deleted', { bookingId });

  try {
    await deleteDoc(doc(db, 'bookings', bookingId));
  } catch (err) {
    console.error('Error deleting booking in Firestore:', err);
  }
}

// --- Services API ---

export function getServices(): Service[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SERVICES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(INITIAL_SERVICES));
      return INITIAL_SERVICES;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_SERVICES;
  }
}

export function saveServices(services: Service[]): void {
  localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(services));
  broadcast('services_updated', services);
}

// --- Barbers API ---

export function getBarbers(): Barber[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BARBERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.BARBERS, JSON.stringify(INITIAL_BARBERS));
      return INITIAL_BARBERS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_BARBERS;
  }
}

export function saveBarbers(barbers: Barber[]): void {
  localStorage.setItem(STORAGE_KEYS.BARBERS, JSON.stringify(barbers));
  broadcast('barbers_updated', barbers);
}

// --- Settings API ---

export function getSettings(): ShopSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
      return INITIAL_SETTINGS;
    }
    return { ...INITIAL_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return INITIAL_SETTINGS;
  }
}

export async function saveSettings(settings: ShopSettings): Promise<void> {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  broadcast('settings_updated', settings);

  try {
    await setDoc(doc(db, 'settings', 'general'), sanitize(settings));
  } catch (err) {
    console.error('Error saving settings in Firestore:', err);
  }
}

// --- Blocked Slots API ---

export function getBlockedSlots(): BlockedSlot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BLOCKED);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function toggleBlockSlot(
  dateStr: string,
  timeSlot: string,
  barberId?: string,
  reason?: string
): Promise<void> {
  const current = getBlockedSlots();
  const existingIndex = current.findIndex(
    (s) => s.dateStr === dateStr && s.timeSlot === timeSlot && s.barberId === barberId
  );

  let updated: BlockedSlot[];
  const slotId = `blk-${dateStr}-${timeSlot.replace(':', '-')}-${barberId || 'all'}`;

  if (existingIndex >= 0) {
    const targetSlot = current[existingIndex];
    updated = current.filter((_, i) => i !== existingIndex);
    try {
      await deleteDoc(doc(db, 'blockedSlots', targetSlot.id || slotId));
    } catch (err) {
      console.error('Error deleting blocked slot in Firestore:', err);
    }
  } else {
    const newSlot: BlockedSlot = {
      id: slotId,
      dateStr,
      timeSlot,
      barberId,
      reason: reason || 'ساعت مسدود شده توسط مدیریت',
    };
    updated = [...current, newSlot];
    try {
      await setDoc(doc(db, 'blockedSlots', slotId), sanitize(newSlot));
    } catch (err) {
      console.error('Error setting blocked slot in Firestore:', err);
    }
  }

  localStorage.setItem(STORAGE_KEYS.BLOCKED, JSON.stringify(updated));
  broadcast('blocked_slots_updated', updated);
}

// --- Notifications API ---

export function getNotifications(): AdminNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.NOTIFS, JSON.stringify(INITIAL_NOTIFICATIONS));
      return INITIAL_NOTIFICATIONS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_NOTIFICATIONS;
  }
}

export async function addNotification(
  notif: Omit<AdminNotification, 'id' | 'timestamp' | 'read'>
): Promise<void> {
  const current = getNotifications();
  const newItem: AdminNotification = {
    ...notif,
    id: `ntf-${Date.now()}`,
    timestamp: new Date().toISOString(),
    read: false,
  };
  const updated = [newItem, ...current].slice(0, 50);
  localStorage.setItem(STORAGE_KEYS.NOTIFS, JSON.stringify(updated));
  broadcast('notification_added', newItem);

  try {
    await setDoc(doc(db, 'notifications', newItem.id), sanitize(newItem));
  } catch (err) {
    console.error('Error adding notification in Firestore:', err);
  }
}

export async function markAllNotificationsAsRead(): Promise<void> {
  const current = getNotifications();
  const updated = current.map((n) => ({ ...n, read: true }));
  localStorage.setItem(STORAGE_KEYS.NOTIFS, JSON.stringify(updated));
  broadcast('notifications_read', null);

  try {
    const snap = await getDocs(collection(db, 'notifications'));
    const batch = writeBatch(db);
    snap.forEach((d) => {
      batch.update(d.ref, { read: true });
    });
    await batch.commit();
  } catch (err) {
    console.error('Error marking notifications read in Firestore:', err);
  }
}

export async function clearAllNotifications(): Promise<void> {
  localStorage.setItem(STORAGE_KEYS.NOTIFS, JSON.stringify([]));
  broadcast('notifications_cleared', null);

  try {
    const snap = await getDocs(collection(db, 'notifications'));
    const batch = writeBatch(db);
    snap.forEach((d) => {
      batch.delete(d.ref);
    });
    await batch.commit();
  } catch (err) {
    console.error('Error clearing notifications in Firestore:', err);
  }
}

// --- Reset to Factory Demo Data ---

export function resetToDemoData(): void {
  localStorage.removeItem(STORAGE_KEYS.BOOKINGS);
  localStorage.removeItem(STORAGE_KEYS.SERVICES);
  localStorage.removeItem(STORAGE_KEYS.BARBERS);
  localStorage.removeItem(STORAGE_KEYS.SETTINGS);
  localStorage.removeItem(STORAGE_KEYS.BLOCKED);
  localStorage.removeItem(STORAGE_KEYS.NOTIFS);
  broadcast('data_reset', null);
}

// --- Export to Excel (.xlsx) ---

export function exportBookingsToExcel(
  bookings: Booking[],
  filename = 'گزارش_نوبت‌های_آرایشگاه.xlsx'
) {
  const data = bookings.map((b, index) => {
    let statusFa = 'تایید شده';
    if (b.status === 'completed') statusFa = 'انجام شده';
    if (b.status === 'cancelled')
      statusFa = `لغو شده (${b.cancelledBy === 'customer' ? 'مشتری' : 'مدیر'})`;

    return {
      'ردیف': index + 1,
      'کد پیگیری': b.id,
      'نام مشتری': b.customerName,
      'شماره تماس': b.customerPhone,
      'خدمت انتخابی': b.serviceTitle,
      'مبلغ (تومان)': b.servicePrice,
      'آرایشگر': b.barberName,
      'تاریخ نوبت': b.dateShamsi,
      'تاریخ میلادی': b.dateStr,
      'ساعت': b.timeSlot,
      'وضعیت': statusFa,
      'توضیحات مشتری': b.customerNotes || '-',
      'علت لغو': b.cancelReason || '-',
      'زمان ثبت': new Date(b.createdAt).toLocaleDateString('fa-IR'),
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);

  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 20 },
    { wch: 16 },
    { wch: 25 },
    { wch: 15 },
    { wch: 18 },
    { wch: 16 },
    { wch: 14 },
    { wch: 10 },
    { wch: 16 },
    { wch: 25 },
    { wch: 20 },
    { wch: 14 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'لیست نوبت‌ها');

  XLSX.writeFile(workbook, filename);
}
