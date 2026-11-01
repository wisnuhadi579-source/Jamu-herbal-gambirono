import React, { useState } from 'react';
import { 
  X, 
  CheckCircle, 
  Truck, 
  ShieldCheck, 
  Send, 
  Gift, 
  ShoppingBag,
  ArrowRight
} from 'lucide-react';

export default function OrderModal({ isOpen, onClose, blueprint }) {
  if (!isOpen) return null;

  const [packageType, setPackageType] = useState('bundle');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const price = packageType === 'bundle' ? blueprint.bundlePrice : blueprint.singlePrice;
  const packageName = packageType === 'bundle'
    ? 'Paket 2 Botol Jamu Seger Waras (500ml) + Bonus Minyak Balur Sendi'
    : 'Paket Coba 1 Botol Jamu Seger Waras (500ml)';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !phone || !address) return;

    const message = `Halo Herbalis Admin Jamu Seger Waras, saya ingin memesan:

*Nama:* ${name}
*No. WhatsApp:* ${phone}
*Paket:* ${packageName}
*Total Pembayaran:* ${price}
*Metode:* ${paymentMethod.toUpperCase()} (Bayar di Tempat)
*Alamat Kirim:*
${address}

Mohon diproses untuk pengiriman segera. Terima kasih!`;

    const encoded = encodeURIComponent(message);
    const waUrl = `https://wa.me/6281234567890?text=${encoded}`;
    
    // Open WhatsApp in new tab safely
    window.open(waUrl, '_blank');
    setIsSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0e1422] border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-900/80 border border-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {isSubmitted ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white">
              Pesanan Anda Berhasil Disiapkan!
            </h3>
            <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
              Jendela WhatsApp resmi Herbalis Jamu Seger Waras telah dibuka. Paket Anda akan segera dikemas higienis dan dikirim dengan sistem COD (Bayar di Tempat).
            </p>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-left text-xs space-y-1.5 text-slate-300">
              <div><strong className="text-slate-400">Penerima:</strong> {name}</div>
              <div><strong className="text-slate-400">No. WhatsApp:</strong> {phone}</div>
              <div><strong className="text-slate-400">Pesanan:</strong> {packageName} ({price})</div>
              <div><strong className="text-slate-400">Metode:</strong> {paymentMethod.toUpperCase()}</div>
              <div><strong className="text-slate-400">Alamat:</strong> {address}</div>
            </div>
            <button
              onClick={() => {
                setIsSubmitted(false);
                onClose();
              }}
              className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all cursor-pointer"
            >
              Tutup Jendela
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
                <Truck className="w-4 h-4" />
                <span>Formulir Pemesanan Resmi COD (Bayar di Tempat)</span>
              </div>
              <h3 className="text-xl font-black text-white">
                Pesan Minuman Jamu Seger Waras
              </h3>
              <p className="text-xs text-slate-400">
                Isi data di bawah ini untuk pengiriman langsung ke alamat rumah Anda.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Package selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">
                  Pilih Paket Hemat:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setPackageType('bundle')}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all relative ${
                      packageType === 'bundle'
                        ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30'
                        : 'bg-slate-900/60 border-slate-800 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 uppercase absolute -top-2 right-2">
                      Hemat 67%
                    </span>
                    <h5 className="text-xs font-black text-white">Paket 2 Botol + Bonus</h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">Bonus Minyak Balur Sendi</p>
                    <div className="text-sm font-black text-amber-400 mt-2">{blueprint.bundlePrice}</div>
                  </div>

                  <div
                    onClick={() => setPackageType('single')}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      packageType === 'single'
                        ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30'
                        : 'bg-slate-900/60 border-slate-800 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <h5 className="text-xs font-black text-white">Paket Coba 1 Botol</h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">Isi 500 ml siap minum</p>
                    <div className="text-sm font-black text-amber-400 mt-2">{blueprint.singlePrice}</div>
                  </div>
                </div>
              </div>

              {/* Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">
                  Nama Penerima:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Bapak H. Sukirno"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">
                  Nomor WhatsApp Aktif:
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Contoh: 081234567890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Full Address */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">
                  Alamat Lengkap Pengiriman:
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Nama jalan, RT/RW, nomor rumah, kelurahan, kecamatan, kota/kabupaten..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400 leading-relaxed"
                />
              </div>

              {/* Payment selection */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">
                  Metode Pembayaran:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cod')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 cursor-pointer ${
                      paymentMethod === 'cod'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>COD (Bayar di Tempat)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('transfer')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 cursor-pointer ${
                      paymentMethod === 'transfer'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Transfer Bank</span>
                  </button>
                </div>
              </div>

              {/* Guarantee text */}
              <div className="text-[11px] text-slate-400 flex items-center gap-2 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>100% Aman: Cek isi paket saat kurir tiba sebelum membayar.</span>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4 text-slate-950" />
                <span>KIRIM PESANAN VIA WHATSAPP ({price})</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
