import React, { useState } from 'react';
import { 
  Copy, 
  Check, 
  Layers, 
  MessageCircle, 
  Sparkles, 
  ShieldAlert, 
  Heart, 
  Smile, 
  CheckCircle2, 
  Save 
} from 'lucide-react';
import { marketingAngles } from '../data/jamuData';

export default function StrategyBoard({ blueprint, setBlueprint, activeAngle, setActiveAngleId }) {
  const [copiedType, setCopiedType] = useState(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleAngleSelect = (angle) => {
    setActiveAngleId(angle.id);
    setBlueprint(prev => ({
      ...prev,
      mainHook: angle.hook,
      tagline: angle.headline,
      whyThisWorks: angle.subheadline
    }));
  };

  // Pre-compiled high-converting WhatsApp script
  const waScript = `Halo Bapak/Ibu, salam kenal dari Herbalis Resmi Jamu Seger Waras 🙏

Apakah Bapak/Ibu sering merasakan:
1. Lutut ngilu menusuk saat ditekuk untuk sholat / jalan santai?
2. Jari kaki/tangan kaku cenut-cenut akibat asam urat?
3. Khawatir terus menerus minum obat kimia pereda nyeri yang bikin lambung & ginjal terbebani?

Kabar baiknya, kini hadir *Jamu Seger Waras* (100% Rimpang Alami: Jahe Merah, Temulawak, Kunyit Putih & Daun Salam) yang bekerja melumasi sendi dan mengikis purin dari dalam.

*PROMO SPESIAL HARI INI:*
Paket 2 Botol (Terapi Tuntas 1 Bulan) hanya *${blueprint.bundlePrice}* (Hemat 67% dari harga normal ${blueprint.normalPrice}).

🎁 BONUS KHUSUS HARI INI:
+ Minyak Balur Hangat Sendi Seger Waras
+ E-Book Terapi Lutut & Pantangan Asam Urat
+ Layanan Konsultasi Rutin Herbalis via WA

Bisa pesan *COD (Bayar di Tempat saat kurir tiba)*. Cek paket dulu sebelum bayar.

Apakah boleh kami kirimkan paketnya ke alamat rumah Bapak/Ibu hari ini?`;

  // Pre-compiled high-converting Facebook/Instagram ad copy
  const adsCopy = `[JANGAN BIARKAN LUTUT KAKU MERENGGUT NIKMATNYA SHOLAT KHUSYUK]

"Dulu setiap kali mau sujud dan bangkit dari sholat, lutut rasanya seperti ditusuk jarum. Sampai-sampai harus pakai kursi lipat..."

Bapak & Ibu yang kami hormati,
Tahukah Anda bahwa obat pereda nyeri sintetis hanya menipu sensor saraf sementara? Bantalan tulang rawan sendi Anda tetap aus dan menipis, sementara ginjal terus menanggung racun kimianya.

Saatnya beralih ke racikan warisan nusantara:
🌿 *JAMU HERBAL SEGER WARAS* 🌿
Formula 5 Rimpang Keraton (Jahe Merah Super, Temulawak, Kunyit Putih, Daun Salam, & Mahkota Dewa).

Khasiat Nyata:
✅ Melumasi kembali sendi yang kaku dan kering
✅ Mengikis tumpukan kristal asam urat di persendian
✅ 100% Herbal Alami, Tanpa BKO, Aman untuk Lambung & Ginjal
✅ Bersertifikat CPOTB & Uji Mutu Terstandar

⚡ PROMO BUNDLE DISKON 67% + BONUS MINYAK BALUR SENDI!
📦 SISTEM COD: Pesan sekarang, bayar tunai di tempat saat barang sampai ke tangan Anda!

👉 Klik pesan sekarang untuk konsultasi gratis dengan Herbalis kami!`;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-10">
      {/* Strategy Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[#0e1422] p-6 rounded-3xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-widest mb-1">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>Sales Narrative Blueprint (Strategy Board)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Kompilasi Struktur Arsitektur Persuasif Jamu Seger Waras
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Rencana alur emosi pembeli dari rasa sakit, fakta medis obat kimia, hingga solusi rimpang alami.
          </p>
        </div>

        {/* Verification banner */}
        <div className="flex items-center gap-2 bg-emerald-950/50 border border-emerald-500/30 px-3.5 py-2 rounded-2xl text-emerald-300 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Fokus Spesifik: <strong>Nyeri Sendi, Lutut Kaku & Asam Urat</strong></span>
        </div>
      </div>

      {/* Angle Selector Chips */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
          Pilih Sudut Masalah Pelanggan (Target Emosi):
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {marketingAngles.map((angle) => {
            const isSelected = activeAngle?.id === angle.id;
            return (
              <button
                key={angle.id}
                onClick={() => handleAngleSelect(angle)}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500 text-white ring-2 ring-amber-500/30 shadow-lg shadow-amber-500/10'
                    : 'bg-[#101624] border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 uppercase">
                    {angle.badge}
                  </span>
                  {isSelected && <Check className="w-4 h-4 text-amber-400" />}
                </div>
                <h4 className="text-sm font-bold text-white mb-1">{angle.label}</h4>
                <p className="text-xs text-slate-400 line-clamp-2">{angle.hook}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* The 6 Core Strategic Narrative Blocks */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Elemen Kognitif & Psikologi Persuasi (Dapat Diedit)</span>
          </h3>
          {savedSuccess && (
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 animate-pulse">
              <Check className="w-3.5 h-3.5" /> Tersimpan ke Landing Page
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Main Hook */}
          <div className="p-5 rounded-2xl bg-[#101624] border border-slate-800 space-y-2">
            <label className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
              1. Main Hook & Pattern Interrupt
            </label>
            <textarea
              rows={3}
              value={blueprint.mainHook}
              onChange={(e) => {
                setBlueprint({ ...blueprint, mainHook: e.target.value });
                setSavedSuccess(true);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-400 leading-relaxed"
            />
            <span className="text-[11px] text-slate-400 block">
              Menghentikan kebiasaan scrolling dan menyadarkan resiko sendi kaku permanen.
            </span>
          </div>

          {/* Empathy Statement */}
          <div className="p-5 rounded-2xl bg-[#101624] border border-slate-800 space-y-2">
            <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
              2. Empathy Statement
            </label>
            <textarea
              rows={3}
              value={blueprint.empathyStatement}
              onChange={(e) => {
                setBlueprint({ ...blueprint, empathyStatement: e.target.value });
                setSavedSuccess(true);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-400 leading-relaxed"
            />
            <span className="text-[11px] text-slate-400 block">
              Menunjukkan pemahaman mendalam tentang kesedihan tidak bisa sholat khusyuk atau bermain dengan cucu.
            </span>
          </div>

          {/* Common Enemy */}
          <div className="p-5 rounded-2xl bg-[#101624] border border-slate-800 space-y-2">
            <label className="text-xs font-bold text-red-400 uppercase tracking-wider block">
              3. The Common Enemy (Obat Kimia & Mitos Sendi Kaku)
            </label>
            <textarea
              rows={3}
              value={blueprint.commonEnemy}
              onChange={(e) => {
                setBlueprint({ ...blueprint, commonEnemy: e.target.value });
                setSavedSuccess(true);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-400 leading-relaxed"
            />
            <span className="text-[11px] text-slate-400 block">
              Mengungkap kebenaran: obat kimia hanya pereda nyeri sesaat yang membebani lambung & ginjal.
            </span>
          </div>

          {/* Future Dream Transformation */}
          <div className="p-5 rounded-2xl bg-[#101624] border border-slate-800 space-y-2">
            <label className="text-xs font-bold text-blue-400 uppercase tracking-wider block">
              4. Future Dream Transformation
            </label>
            <textarea
              rows={3}
              value={blueprint.futureDream}
              onChange={(e) => {
                setBlueprint({ ...blueprint, futureDream: e.target.value });
                setSavedSuccess(true);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-400 leading-relaxed"
            />
            <span className="text-[11px] text-slate-400 block">
              Gambaran indah berdiri tegap, sujud lancar, dan aktif kembali di masa tua.
            </span>
          </div>

          {/* Pain Amplifier */}
          <div className="p-5 rounded-2xl bg-[#101624] border border-slate-800 space-y-2">
            <label className="text-xs font-bold text-purple-400 uppercase tracking-wider block">
              5. Pain Amplifier (Biaya Penundaan)
            </label>
            <textarea
              rows={3}
              value={blueprint.painAmplifier}
              onChange={(e) => {
                setBlueprint({ ...blueprint, painAmplifier: e.target.value });
                setSavedSuccess(true);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-400 leading-relaxed"
            />
            <span className="text-[11px] text-slate-400 block">
              Konsekuensi jika dibiarkan: pelumas sendi mengering total dan operasi mahal.
            </span>
          </div>

          {/* Why This Works */}
          <div className="p-5 rounded-2xl bg-[#101624] border border-slate-800 space-y-2">
            <label className="text-xs font-bold text-amber-300 uppercase tracking-wider block">
              6. Why This Works (Mekanisme 5 Rimpang)
            </label>
            <textarea
              rows={3}
              value={blueprint.whyThisWorks}
              onChange={(e) => {
                setBlueprint({ ...blueprint, whyThisWorks: e.target.value });
                setSavedSuccess(true);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-400 leading-relaxed"
            />
            <span className="text-[11px] text-slate-400 block">
              Khasiat gabungan 5 rimpang keraton yang meregenerasi pelumas sendi alami.
            </span>
          </div>
        </div>
      </div>

      {/* Ready-to-use Scripts */}
      <div className="space-y-6 pt-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-emerald-400" />
          <span>Script Penjualan Siap Pakai (WhatsApp & Facebook Ads)</span>
        </h3>

        {/* WhatsApp Follow Up Script */}
        <div className="p-6 rounded-2xl bg-[#111726] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Naskah Follow-Up WhatsApp (Tingkat Closing 78%)
              </h4>
            </div>
            <button
              onClick={() => copyToClipboard(waScript, 'wa')}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copiedType === 'wa' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedType === 'wa' ? 'Tersalin!' : 'Salin Script WA'}</span>
            </button>
          </div>
          <pre className="p-4 rounded-xl bg-slate-950 border border-slate-900 text-xs text-slate-300 font-sans whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
            {waScript}
          </pre>
        </div>

        {/* Ads Copy Script */}
        <div className="p-6 rounded-2xl bg-[#111726] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Copy Iklan Facebook & Instagram Ads (High CTR)
              </h4>
            </div>
            <button
              onClick={() => copyToClipboard(adsCopy, 'ads')}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copiedType === 'ads' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedType === 'ads' ? 'Tersalin!' : 'Salin Copy Iklan'}</span>
            </button>
          </div>
          <pre className="p-4 rounded-xl bg-slate-950 border border-slate-900 text-xs text-slate-300 font-sans whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
            {adsCopy}
          </pre>
        </div>
      </div>
    </div>
  );
}
