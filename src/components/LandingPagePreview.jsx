import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Flame, 
  Clock, 
  Check, 
  Heart, 
  ShieldAlert, 
  AlertTriangle, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Truck, 
  Star, 
  Gift, 
  ArrowRight, 
  CheckCircle, 
  Activity,
  Droplets,
  PackageCheck
} from 'lucide-react';
import { ingredients, testimonials, faqList } from '../data/jamuData';

export default function LandingPagePreview({ blueprint, activeAngle, deviceMode, onOpenOrderModal }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 4, minutes: 28, seconds: 15 });
  const [openFaq, setOpenFaq] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState('bundle');

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 4, minutes: 30, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleFaq = (idx) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  return (
    <div className={`mx-auto transition-all duration-300 ${
      deviceMode === 'mobile' 
        ? 'max-w-[420px] shadow-2xl rounded-3xl border-4 border-slate-700 overflow-hidden my-4 bg-[#0a0f18]' 
        : 'w-full bg-[#0a0f18]'
    }`}>
      {/* Top Urgent Alert Bar */}
      <div className="bg-gradient-to-r from-red-900 via-amber-900 to-red-900 text-white text-xs py-2.5 px-4 text-center font-medium border-b border-red-700/50 flex items-center justify-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0 animate-pulse" />
        <span>
          <strong>PERINGATAN PENTING:</strong> Nyeri lutut & rasa ngilu saat sholat adalah tanda menipisnya pelumas sendi. Tangani alami sebelum terlambat!
        </span>
      </div>

      {/* Hero Section */}
      <section className="relative pt-12 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden bg-radial from-amber-950/20 via-[#0a0f18] to-[#0a0f18]">
        {/* Ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-950/70 border border-red-500/40 text-red-300 text-xs font-bold uppercase tracking-wider animate-bounce">
            <Flame className="w-3.5 h-3.5 text-red-400" />
            <span>Pola Rusak: Segera Hentikan Konsumsi Obat Kimia Pereda Nyeri!</span>
          </div>

          {/* Pattern Interrupt Hook */}
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
            {activeAngle?.hook || blueprint.mainHook}
          </h2>

          {/* Headline & Subheadline */}
          <p className="text-lg sm:text-xl md:text-2xl font-serif text-amber-300 font-bold leading-relaxed max-w-3xl mx-auto">
            "{activeAngle?.headline || blueprint.tagline}"
          </p>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {activeAngle?.subheadline || blueprint.whyThisWorks}
          </p>

          {/* Social Proof Badges */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-300">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>14.800+ Botol Dikirim</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-300">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>100% Herbal Murni Tanpa BKO</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-300">
              <Truck className="w-4 h-4 text-blue-400" />
              <span>Bayar di Tempat (COD)</span>
            </div>
          </div>

          {/* Hero CTA Box */}
          <div className="pt-4 max-w-md mx-auto space-y-3">
            <button
              onClick={onOpenOrderModal}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-base tracking-wide shadow-xl shadow-amber-500/25 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{blueprint.ctaText}</span>
              <ArrowRight className="w-5 h-5 text-slate-950" />
            </button>
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <PackageCheck className="w-4 h-4 text-emerald-400" />
              <span>Cek Barang Dahulu Saat Sampai, Baru Bayar ke Kurir</span>
            </div>
          </div>
        </div>
      </section>

      {/* Empathy & Common Enemy Section */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 bg-[#0d1320] border-y border-slate-800/80">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
              Fakta Menusuk di Balik Nyeri Sendi
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-white">
              Mengapa Nyeri Sendi Anda Tak Kunjung Sembuh?
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* The Trap: Obat Kimia */}
            <div className="bg-[#141b2c] border border-red-500/30 rounded-2xl p-6 space-y-4 relative overflow-hidden">
              <div className="flex items-center gap-2.5 text-red-400 font-bold text-sm">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <span>Jebakan Obat Kimia Pereda Nyeri</span>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-red-400 font-bold">✕</span>
                  <span><strong>Hanya menipu sensor saraf:</strong> Rasa sakit hilang sementara, tapi bantalan sendi tetap bergesekan dan terus aus.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 font-bold">✕</span>
                  <span><strong>Beban berat pada ginjal & lambung:</strong> Penggunaan jangka panjang berisiko asam lambung kambuh hingga gagal ginjal.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 font-bold">✕</span>
                  <span><strong>Ketergantungan bertahun-tahun:</strong> Nyeri selalu kambuh lagi begitu efek obat kimia habis.</span>
                </li>
              </ul>
            </div>

            {/* The Solution: Seger Waras */}
            <div className="bg-[#142322] border border-emerald-500/30 rounded-2xl p-6 space-y-4 relative overflow-hidden">
              <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-sm">
                <Sparkles className="w-5 h-5 shrink-0" />
                <span>Jamu Seger Waras: Nutrisi Rimpang Murni</span>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Memulihkan cairan pelumas sendi:</strong> Merangsang produksi cairan sinovial alami agar tulang tidak beradu.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Melarutkan kristal asam urat:</strong> Membantu tubuh membuang kelebihan purin melalui urin tanpa efek samping.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>100% Herbal Alami Nusantara:</strong> Aman dikonsumsi jangka panjang, justru menyehatkan lambung dan stamina tubuh.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 5 Rimpang Keraton Section */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 bg-[#0a0f18]">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
              Formula Herbal Keraton Teruji
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-white">
              5 Rimpang Keramat Penakluk Nyeri Sendi & Asam Urat
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
              Bukan serbuk instan biasa. Diekstraksi higienis menghasilkan konsentrat cair murni yang cepat diserap tubuh dalam hitungan menit.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ingredients.map((item, idx) => (
              <div 
                key={idx} 
                className="bg-[#111726] border border-slate-800 rounded-2xl p-5 hover:border-amber-500/40 transition-all space-y-2.5"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 font-black text-sm flex items-center justify-center border border-amber-500/20">
                  {idx + 1}
                </div>
                <h4 className="text-sm font-bold text-white">{item.name}</h4>
                <div className="text-xs font-semibold text-emerald-400">{item.role}</div>
                <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
            
            {/* Guarantee Highlight Card */}
            <div className="bg-gradient-to-br from-amber-950/40 to-slate-900 border border-amber-500/40 rounded-2xl p-5 flex flex-col justify-center space-y-2">
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Standar CPOTB & Uji Mutu</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Diproduksi sesuai Cara Pembuatan Obat Tradisional yang Baik (CPOTB). Bebas bahan pengawet, tanpa pemanis buatan, tanpa BKO.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Testimonials Section */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 bg-[#0d1320] border-t border-slate-800/80">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
              Kisah Nyata Kesembuhan
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-white">
              Mereka yang Telah Bebas dari Nyeri Sendi & Kursi Sholat
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, idx) => (
              <div 
                key={idx} 
                className="bg-[#121828] border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(t.stars)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 italic leading-relaxed">
                    "{t.quote}"
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-3 border-t border-slate-800/80">
                  <img 
                    src={t.avatar} 
                    alt={t.name} 
                    className="w-10 h-10 rounded-full object-cover border border-amber-500/40" 
                  />
                  <div>
                    <h5 className="text-xs font-bold text-white">{t.name}</h5>
                    <p className="text-[11px] text-slate-400">{t.role} · {t.city}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing & Irresistible Offer Stack */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-[#0a0f18] relative">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
              <Gift className="w-3.5 h-3.5" />
              <span>PROMO SPESIAL HARI INI — DISKON {blueprint.discountPercent}</span>
            </div>
            <h3 className="text-2xl sm:text-4xl font-black text-white">
              Pilih Paket Pemulihan Sendi Anda
            </h3>
            
            {/* Urgency countdown */}
            <div className="inline-flex items-center gap-3 bg-red-950/60 border border-red-500/40 px-4 py-2 rounded-xl text-red-200 text-xs font-bold">
              <Clock className="w-4 h-4 text-red-400 animate-spin" />
              <span>Promo Berakhir Dalam:</span>
              <span className="font-mono text-white text-sm bg-black/60 px-2 py-0.5 rounded">
                {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
              </span>
            </div>
          </div>

          {/* Pricing Card: Paket Bundle Terlaris */}
          <div className="relative rounded-3xl bg-gradient-to-b from-[#162136] to-[#0f1726] border-2 border-amber-500 p-6 sm:p-8 shadow-2xl shadow-amber-500/10 space-y-6">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-xs font-black uppercase tracking-wider px-4 py-1 rounded-full shadow-lg">
              ★ PALING BANYAK DIPILIH (HEMAT RP 361.000) ★
            </div>

            <div className="text-center space-y-2 pt-2">
              <h4 className="text-xl sm:text-2xl font-black text-white">
                Paket 2 Botol Jamu Seger Waras (Terapi Tuntas 1 Bulan)
              </h4>
              <p className="text-xs sm:text-sm text-slate-300">
                Pilihan utama 94% pelanggan untuk melumasi sendi & mengikis tuntas kristal asam urat
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <span className="text-slate-500 line-through text-sm sm:text-base font-bold">
                  {blueprint.normalPrice}
                </span>
                <span className="text-3xl sm:text-4xl font-black text-amber-400">
                  {blueprint.bundlePrice}
                </span>
              </div>
            </div>

            {/* Offer Stack List */}
            <div className="bg-slate-950/60 rounded-2xl p-5 border border-slate-800 space-y-3">
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                Bonus & Fasilitas Lengkap Dalam Paket:
              </div>
              {blueprint.offerStack.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs sm:text-sm text-slate-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{item.title}</span>
                  </div>
                  <span className="text-slate-400 text-xs shrink-0 font-medium">({item.value})</span>
                </div>
              ))}
            </div>

            {/* Big Order Button */}
            <button
              onClick={onOpenOrderModal}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-base tracking-wide shadow-xl shadow-amber-500/25 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{blueprint.ctaText}</span>
              <ArrowRight className="w-5 h-5 text-slate-950" />
            </button>

            {/* Risk Reversal Guarantee */}
            <div className="pt-2 p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-start gap-3">
              <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-300 leading-relaxed">
                <strong className="text-emerald-400 block mb-0.5">GARANSI 100% KEPUASAN & UANG KEMBALI:</strong>
                {blueprint.riskReversal}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 bg-[#0d1320] border-t border-slate-800/80">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
              Pertanyaan yang Sering Diajukan
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-white">
              Tanya Jawab Seputar Jamu Seger Waras
            </h3>
          </div>

          <div className="space-y-3">
            {faqList.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div 
                  key={idx} 
                  className="bg-[#121828] border border-slate-800 rounded-2xl overflow-hidden transition-all"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 text-xs sm:text-sm font-bold text-white hover:text-amber-400 transition-colors cursor-pointer"
                  >
                    <span>{item.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="p-4 sm:p-5 pt-0 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/50">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 sm:px-6 lg:px-8 bg-[#070a10] border-t border-slate-900 text-center text-xs text-slate-500 space-y-2">
        <p className="font-bold text-slate-400">
          Jamu Herbal Seger Waras — Solusi Alami Bebas Nyeri Sendi & Asam Urat
        </p>
        <p>
          Diproduksi secara higienis menggunakan 100% rimpang herbal murni nusantara. Hak Cipta Dilindungi Undang-Undang.
        </p>
      </footer>
    </div>
  );
}
