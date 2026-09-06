/**
 * Utilities for Persian Shamsi Dates, formatting, and time helpers
 */

// Convert English digits to Persian digits
export function toPersianDigits(input: string | number): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(input).replace(/[0-9]/g, (char) => persianDigits[parseInt(char, 10)]);
}

// Format number as Tomans with thousand separators
export function formatTomans(amount: number): string {
  const formatted = new Intl.NumberFormat('fa-IR').format(amount);
  return `${formatted} تومان`;
}

export interface DayOption {
  dateStr: string; // YYYY-MM-DD
  dayName: string; // e.g. "امروز", "فردا", "سه‌شنبه"
  dayOfWeek: string; // e.g. "دوشنبه"
  dayOfMonth: string; // e.g. "۱۷"
  monthName: string; // e.g. "شهریور"
  fullShamsi: string; // e.g. "دوشنبه ۱۷ شهریور ۱۴۰۵"
  isToday: boolean;
  isTomorrow: boolean;
}

// Get array of available booking days (next 14 days)
export function getUpcomingDays(count = 14): DayOption[] {
  const days: DayOption[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    // Format using Intl Persian calendar
    const dayOfWeek = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { weekday: 'long' }).format(d);
    const dayOfMonth = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { day: 'numeric' }).format(d);
    const monthName = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { month: 'long' }).format(d);
    const yearShamsi = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric' }).format(d);

    let dayName = dayOfWeek;
    if (i === 0) dayName = 'امروز';
    else if (i === 1) dayName = 'فردا';
    else if (i === 2) dayName = 'پس‌فردا';

    const fullShamsi = `${dayOfWeek} ${dayOfMonth} ${monthName} ${yearShamsi}`;

    days.push({
      dateStr,
      dayName,
      dayOfWeek,
      dayOfMonth,
      monthName,
      fullShamsi,
      isToday: i === 0,
      isTomorrow: i === 1,
    });
  }

  return days;
}

// Generate time slots based on start hour, end hour and interval
export function generateTimeSlots(
  startHour = '09:00',
  endHour = '22:00',
  intervalMinutes = 45
): string[] {
  const [startH, startM] = startHour.split(':').map(Number);
  const [endH, endM] = endHour.split(':').map(Number);

  const startTotalMinutes = startH * 60 + startM;
  const endTotalMinutes = endH * 60 + endM;

  const slots: string[] = [];
  for (let m = startTotalMinutes; m + intervalMinutes <= endTotalMinutes; m += intervalMinutes) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    const formatted = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    slots.push(formatted);
  }

  return slots;
}
