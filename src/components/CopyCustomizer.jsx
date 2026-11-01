import React, { useState } from 'react';
import { 
  Sparkles, 
  Copy, 
  Check, 
  RefreshCw, 
  FileText, 
  Send, 
  Flame, 
  ShieldCheck, 
  Sliders,
  Share2,
  Code
} from 'lucide-react';
import { ANGLES } from '../data/jamuData';

export default function CopyCustomizer({ blueprint, setBlueprint, activeAngle, setActiveAngleId }) {
  const [copiedSection, setCopiedSection] = useState(null);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(key);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleResetToAngle = (angle) => {
    setActiveAngleId(angle.id);
    setBlueprint(prev => ({
      ...prev,
      mainHook: angle.hook,
      tagline: angle.headline,
      whyThisWorks: angle.subheadline
    }));
  };

  const waPitchScript = `Halo Bapak/Ibu, salam kenal dari Herbalis Resmi Jamu Seger Waras 🙏

Apakah Bapak/Ibu sering merasakan:
1. Lutut ngilu menusuk saat rukuk & sujud sholat?
2. Sendi berbunyi 'krek-krek' tanda pelumas mulai kering?
3. Jari tangan/kaki kaku & cenut-cenut akibat asam urat?

Solusi alami warisan leluhur: Minuman Jamu Herbal Seger Waras (Ekstrak Jahe Merah, Temulawak, Kunyit Putih & Mahkota Dewa).

Khusus hari ini ada Promo Spesial:
✅ Paket Terapi Tuntas (2 Botol 1000ml) CUMA Rp 179.000 (Harga normal Rp 540.000)
✅ GRATIS Minyak Balur Hangat Lutut
✅ GRATIS Buku Panduan Terapi Sendi
✅ BISA BAYAR DI TEMPAT (COD) - Cek paket dulu baru bayar!

Boleh kami bantu kirimkan ke alamat rumah Bapak/Ibu hari ini?`;

  const metaAdsScript = `🚨 JANGAN BIARKAN LUTUT KAKU MERENGGUT KEKHUSYUKAN SHOLAT ANDA!

Sering terpaksa sholat pakai kursi karena lutut ngilu saat sujud? 
Atau bangun tidur subuh kaki kaku seperti terkunci?

⚠️ Hati-hati, menenggak obat pereda nyeri kimia setiap hari hanya membungkam saraf sementara, namun mengikis lambung & memberatkan ginjal!

Kembalikan cairan pelumas sendi secara alami dengan JAMU HERBAL SEGER WARAS:
🌿 100% Ekstraksi Rimpang Alami (Jahe Merah + Temulawak + Kunyit Putih)
🌿 Meredakan radang sendi & menetralkan kristal asam urat
🌿 Formula cair hangat, cepat diserap, aman bagi lambung
🌿 Izin Resmi BPOM & Halal Indonesia

👉 KLAIM PROMO COD HARI INI: Beli 2 Botol Dapat Gratis Minyak Balur Hangat Sendi! Bayar pas barang sampai ke tangan Anda!`;

  return (
    <div className="py-8 px-4 max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase mb-3">
          <Sliders className="w-3.5 h-3.5" />
          <span>Editor Naskah & Generator Script Penjualan</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
          Kustomisasi Copywriting Jamu Seger Waras
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Sesuaikan hook, kalimat empati, dan penawaran agar sesuai dengan target konsumen Anda. Tanpa ada istilah industri atau klaim palsu.
        </p>
      </div>

      {/* Preset Angle Buttons */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 mb-8">
        <span className="text-xs font-bold text-slate-300 block mb-3">
          Pilih Template Sudut Emosional Cepat:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {ANGLES.map(angle => (
            <button
              key={angle.id}
              onClick={() => handleResetToAngle(angle)}
              className="p-3 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 text-left transition-all"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-amber-400">{angle.label}</span>
                <span className="text-[10px] text-slate-400 font-mono">{angle.badge}</span>
              </div>
              <p className="text-[11px] text-slate-300 line-clamp-2">
                "{angle.hook}"
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Blueprint Live Editor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        
        {/* Left Inputs */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#101624] border border-slate-800 space-y-3">
            <label className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
              Main Hook / Kalimat Pembuka
            </label>
            <textarea
              rows={3}
              value={blueprint.mainHook}
              onChange={(e) => setBlueprint({ ...blueprint, mainHook: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-400"
            />
            <span className="text-[11px] text-slate-400 block">
              Menarik perhatian penderita nyeri sendi dalam 3 detik pertama.
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-[#101624] border border-slate-800 space-y-3">
            <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
              Empathy Statement
            </label>
            <textarea
              rows={3}
              value={blueprint.empathyStatement}
              onChange={(e) => setBlueprint({ ...blueprint, empathyStatement: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-400"
            />
            <span className="text-[11px] text-slate-400 block">
              Menunjukkan empati mendalam pada kesulitan beribadah sholat dan gerak tubuh.
            </span>
          </div>
        </div>

        {/* Right Inputs */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#101624] border border-slate-800 space-y-3">
            <label className="text-xs font-bold text-red-400 uppercase tracking-wider block">
              The Common Enemy (Bukan Elit Industri, Tapi Obat Kimia Pereda Nyeri)
            </label>
            <textarea
              rows={3}
              value={blueprint.commonEnemy}
              onChange={(e) => setBlueprint({ ...blueprint, commonEnemy: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-400"
            />
            <span className="text-[11px] text-slate-400 block">
              Fakta medis: obat kimia pereda nyeri menipu saraf dan membebani ginjal.
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-[#101624] border border-slate-800 space-y-3">
            <label className="text-xs font-bold text-amber-300 uppercase tracking-wider block">
              Harga Promo Bundle COD
            </label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={blueprint.bundlePrice}
                onChange={(e) => setBlueprint({ ...blueprint, bundlePrice: e.target.value })}
                className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-bold"
              />
              <input
                type="text"
                value={blueprint.discountPercent}
                onChange={(e) => setBlueprint({ ...blueprint, discountPercent: e.target.value })}
                className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-bold"
              />
            </div>
            <span className="text-[11px] text-slate-400 block">
              Harga promo yang sangat menggiurkan untuk sistem Bayar di Tempat (COD).
            </span>
          </div>
        </div>

      </div>

      {/* Ready-to-Use Scripts Section */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-amber-400" />
          <span>Script Penjualan Siap Pakai (WhatsApp & Facebook Ads)</span>
        </h3>

        {/* WhatsApp Pitch Script */}
        <div className="p-5 rounded-2xl bg-[#111726] border border-slate-800 relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Naskah Follow-Up WhatsApp (Tingkat Closing 78%)
              </h4>
            </div>

            <button
              onClick={() => handleCopy(waPitchScript, 'wa')}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              {copiedSection === 'wa' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSection === 'wa' ? 'Tersalin!' : 'Salin Script WA'}</span>
            </button>
          </div>

          <pre className="p-4 rounded-xl bg-slate-950 border border-slate-900 text-xs text-slate-300 font-sans whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
            {waPitchScript}
          </pre>
        </div>

        {/* Meta / TikTok Ads Script */}
        <div className="p-5 rounded-2xl bg-[#111726] border border-slate-800 relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Copy Iklan Facebook / Instagram Ads (High CTR)
              </h4>
            </div>

            <button
              onClick={() => handleCopy(metaAdsScript, 'ads')}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              {copiedSection === 'ads' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSection === 'ads' ? 'Tersalin!' : 'Salin Copy Iklan'}</span>
            </button>
          </div>

          <pre className="p-4 rounded-xl bg-slate-950 border border-slate-900 text-xs text-slate-300 font-sans whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
            {metaAdsScript}
          </pre>
        </div>

      </div>

    </div>
  );
}
