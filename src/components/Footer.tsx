import React from 'react';
import { Scissors, Phone, MapPin, Clock, Send, ShieldCheck, Heart } from 'lucide-react';
import { ShopSettings } from '../types';

interface FooterProps {
  settings: ShopSettings;
}

export const Footer: React.FC<FooterProps> = ({ settings }) => {
  return (
    <footer id="main-footer" className="w-full bg-[#070a10] border-t border-white/10 mt-20 pt-14 pb-10 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pb-12 border-b border-white/10">
          
          {/* Brand & Mission */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Scissors className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-black text-white">{settings.shopName}</h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm">
              ارائه برترین خدمات پیرایش و استایلینگ آقایان در فضایی اختصاصی و لوکس، با کادری مجرب و رزرو نوبت آنلاین بدون معطلی.
            </p>
            <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg w-fit border border-amber-500/20">
              <ShieldCheck className="w-4 h-4" />
              <span>ضمانت بهترین خدمات و بهداشت ۱۰۰٪ فردی</span>
            </div>
          </div>

          {/* Working Hours & Quick Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              ساعات کاری و پذیرش
            </h3>
            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">شنبه تا پنج‌شنبه:</span>
                <span className="text-slate-200 font-semibold">{settings.openHour} الی {settings.closeHour}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">جمعه‌ها و ایام تعطیل:</span>
                <span className="text-amber-400 font-semibold">با هماهنگی قبلی (VIP)</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">زمان هر نوبت:</span>
                <span className="text-slate-200 font-semibold">{settings.slotDurationMinutes} دقیقه</span>
              </div>
            </div>
          </div>

          {/* Contact & Location */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-400" />
              اطلاعات تماس و نشانی
            </h3>
            <div className="space-y-2.5 text-xs sm:text-sm">
              <p className="flex items-start gap-2.5 text-slate-300">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{settings.address}</span>
              </p>
              <p className="flex items-center gap-2.5 text-slate-300">
                <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                <a href={`tel:${settings.phone}`} className="hover:text-amber-400 transition-colors font-mono">
                  {settings.phone}
                </a>
              </p>
              <div className="pt-2 flex items-center gap-3">
                <a
                  href={`https://t.me/${settings.telegram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 transition-colors text-xs font-medium border border-sky-500/20"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>کانال تلگرام</span>
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar with Mandatory Developer Credit */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          
          <p className="text-slate-500 text-center sm:text-right">
            تمامی حقوق این سامانه محفوظ است © {new Date().getFullYear()}
          </p>

          {/* Prominent Designer & Developer credit */}
          <div id="developer-credit-tag" className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/90 border border-amber-500/30 shadow-lg shadow-amber-500/5">
            <span className="text-slate-300">طراحی شده توسط</span>
            <a
              id="developer-telegram-link"
              href="https://t.me/yasinabolfathi"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-bold text-amber-400 hover:text-amber-300 hover:underline transition-colors"
            >
              <span>یاسین ابوالفتحی</span>
              <Send className="w-3 h-3 text-sky-400" />
            </a>
          </div>

        </div>

      </div>
    </footer>
  );
};
