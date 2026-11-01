import React, { useState } from 'react';
import { 
  Sparkles, 
  Check, 
  Copy, 
  ArrowRight, 
  Brain, 
  Activity, 
  ShieldAlert, 
  Zap, 
  HeartHandshake, 
  PackageCheck,
  Eye,
  AlertTriangle
} from 'lucide-react';

export default function BlueprintBoard({ blueprint, activeAngle, onSelectTab }) {
  const [copiedKey, setCopiedKey] = useState(null);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const cards = [
    {
      id: 'hook',
      num: '1',
      title: 'MAIN HOOK & PATTERN INTERRUPT',
      badge: 'Cognitive Grab 40%',
      target: 'Shock, Intrigue, Attention Stop',
      uiSuggest: 'High-contrast typography, warning amber ambient pulse',
      content: activeAngle.hook || blueprint.mainHook,
      explanation: 'Menghentikan jempol audiens seketika tanpa menggunakan sensasionalisme industri murahan, melainkan menyentuh langsung ketakutan terdalam penderita nyeri sendi.'
    },
    {
      id: 'empathy',
      num: '2',
      title: 'EMPATHY STATEMENT',
      badge: 'Emotional Connection 25%',
      target: 'Validasi Rasa Sakit & Kehangatan',
      uiSuggest: 'Subdued warm text, background subtle dark green',
      content: blueprint.empathyStatement,
      explanation: 'Membangun jembatan kepercayaan bahwa kita paham betapa beratnya kehilangan kemampuan sholat normal atau menggendong cucu tersayang.'
    },
    {
      id: 'enemy',
      num: '3',
      title: 'THE COMMON ENEMY',
      badge: 'Belief Shift 35%',
      target: 'Alihkan Tuduhan dari Diri Pasien ke Musuh Nyata',
      uiSuggest: 'Warning crimson accent, shield break icon',
      content: blueprint.commonEnemy,
      explanation: 'Musuh sebenarnya BUKAN takdir atau usia tua, melainkan ketergantungan obat pereda nyeri kimia sintetis yang hanya meredam saraf sementara sambil membebani ginjal.'
    },
    {
      id: 'dream',
      num: '4',
      title: 'FUTURE DREAM TRANSFORMATION',
      badge: 'Dopamine Anchor 30%',
      target: 'Visualisasi Hidup Bebas Nyeri',
      uiSuggest: 'Emerald glow, checkmark bulleted benefits',
      content: blueprint.futureDream,
      explanation: 'Menghadirkan gambaran nyata kenikmatan hidup yang akan kembali: sholat berjamaah tanpa kursi, jalan santai pagi, dan badan bugar.'
    },
    {
      id: 'pain',
      num: '5',
      title: 'PAIN AMPLIFIER',
      badge: 'Urgency Surge 50%',
      target: 'Mencegah Penundaan & FOMO',
      uiSuggest: 'Crimson border, high urgency reminder',
      content: blueprint.painAmplifier,
      explanation: 'Menyadarkan konsekuensi fatal jika membiarkan peradangan sendi: bantalan tulang rawan rusak total dan berujung biaya operasi puluhan juta.'
    },
    {
      id: 'mechanism',
      num: '6',
      title: 'WHY THIS WORKS (THE MECHANISM)',
      badge: 'Logical Justification 45%',
      target: 'Keyakinan Rasional & Ilmiah Tradisional',
      uiSuggest: 'Herb illustration, biological active icons',
      content: blueprint.whyThisWorks,
      explanation: 'Menjelaskan mekanisme kerja formula Jamu Seger Waras (Gingerol, Kurkuminoid & Flavonoid rimpang) dalam meredakan radang dan memicu regenerasi cairan pelumas sendi.'
    },
    {
      id: 'offer',
      num: '7',
      title: 'IRRESISTIBLE VALUE STACK',
      badge: 'Value/Price Gap > 4X',
      target: 'Penawaran yang Terlalu Sayang untuk Dilewatkan',
      uiSuggest: 'Stacked pricing cards, strike-through normal price',
      content: `Paket Terapi Sendi Seger Waras: Normal Rp 540.000 menjadi CUMA ${blueprint.bundlePrice} (Diskon ${blueprint.discountPercent}) + BONUS Minyak Balur Hangat & Buku Terapi Sendi!`,
      explanation: 'Menyusun nilai nyata produk jauh melampaui harga yang dibayarkan pelanggan sehingga keputusan membeli menjadi sangat mudah.'
    },
    {
      id: 'risk',
      num: '8',
      title: 'RISK REVERSAL & COD GUARANTEE',
      badge: 'Zero Friction 100%',
      target: 'Penghilang Keraguan & Rasa Takut Tertipu',
      uiSuggest: 'Gold shield seal, COD badge, 14-day warranty',
      content: blueprint.riskReversal,
      explanation: 'Menanggung 100% risiko di pihak penjual: Bayar saat barang sampai (COD) dan garansi jika tidak ada perubahan kenyamanan pada sendi.'
    }
  ];

  return (
    <div className="py-8 px-4 max-w-7xl mx-auto">
      
      {/* Notice Pill & Header */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-400 text-xs font-bold tracking-wider uppercase mb-4">
          <Brain className="w-3.5 h-3.5" />
          <span>Sales Narrative Blueprint (Strategy Board)</span>
        </div>

        <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white mb-3">
          KOMPILASI STRUKTUR ARSITEKTUR PERSUASIF
        </h1>

        <p className="text-slate-400 text-sm leading-relaxed">
          Rencana jalannya emosi pembeli sebelum mereka diarahkan ke tombol pemesanan. Database ini mendikte penyusunan kalimat di dalam naskah penjualan <strong className="text-emerald-400">Jamu Herbal Seger Waras</strong> murni fokus pada solusi sendi, lutut & asam urat tanpa narasi konspirasi industri.
        </p>

        {/* Anti-Slop / Anti-Industri Verification Banner */}
        <div className="mt-5 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-left flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
            <Check className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-emerald-300">
              Penyelarasan Konten Terverifikasi: 100% Herbal Seger Waras
            </h4>
            <p className="text-xs text-slate-300 mt-0.5">
              Seluruh naskah copy dialihkan dari klise "Elit Industri" ke edukasi khasiat rimpang alami (Jahe Merah, Temulawak, Kunyit Putih) dan pemulihan cairan pelumas sendi.
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Strategy Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {cards.map((card) => (
          <div 
            key={card.id}
            className="group relative bg-[#111622] hover:bg-[#141b2b] border border-slate-800 hover:border-amber-500/50 rounded-2xl p-6 transition-all shadow-lg hover:shadow-amber-500/5 flex flex-col justify-between"
          >
            <div>
              {/* Header inside card */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-slate-800 text-amber-400 font-mono font-bold text-xs flex items-center justify-center border border-slate-700">
                    {card.num}
                  </span>
                  <h3 className="text-xs font-mono font-bold tracking-wider text-slate-300 uppercase">
                    {card.title}
                  </h3>
                </div>

                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 whitespace-nowrap">
                  {card.badge}
                </span>
              </div>

              {/* Target & Cognitive Architecture specs */}
              <div className="bg-slate-900/80 rounded-lg p-2.5 mb-4 border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5 text-amber-400/90">
                  <Zap className="w-3 h-3" />
                  <span>TARGET: {card.target}</span>
                </div>
                <div className="text-slate-500 truncate">
                  UI SUGGEST: {card.uiSuggest}
                </div>
              </div>

              {/* Main Content / Copy */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-white font-medium text-sm leading-relaxed mb-4">
                "{card.content}"
              </div>

              {/* Persuasive Explanation */}
              <p className="text-xs text-slate-400 leading-normal mb-4">
                <strong className="text-slate-300">Tujuan Psikologis:</strong> {card.explanation}
              </p>
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between">
              <button
                onClick={() => handleCopy(card.content, card.id)}
                className="text-xs font-medium text-slate-400 hover:text-amber-400 flex items-center gap-1.5 transition-colors"
              >
                {copiedKey === card.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Teks</span>
                  </>
                )}
              </button>

              <button
                onClick={() => onSelectTab('preview')}
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
              >
                <span>Lihat di Landing Page</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Floating Quick Action */}
      <div className="mt-10 p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-teal-500/10 border border-amber-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Ingin Menguji Naskah Penjualan di Halaman Landing Page?
          </h3>
          <p className="text-xs text-slate-300 mt-1">
            Buka tampilan Landing Page untuk melihat bagaimana seluruh arsitektur persuasi ini diubah menjadi website konversi tinggi siap jual.
          </p>
        </div>

        <button
          onClick={() => onSelectTab('preview')}
          className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-2 shrink-0 transition-all"
        >
          <Eye className="w-4 h-4" />
          <span>Lihat Landing Page Lengkap</span>
        </button>
      </div>

    </div>
  );
}
