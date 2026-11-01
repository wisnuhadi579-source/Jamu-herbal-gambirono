import React from 'react';
import { 
  Sparkles, 
  Layers, 
  Monitor, 
  Smartphone, 
  Heart, 
  ShieldAlert, 
  Smile, 
  ShoppingBag,
  CheckCircle2
} from 'lucide-react';
import { marketingAngles } from '../data/jamuData';

const iconMap = {
  Heart,
  ShieldAlert,
  Smile
};

export default function Header({ 
  currentTab, 
  setCurrentTab, 
  selectedAngleId, 
  setSelectedAngleId, 
  deviceMode, 
  setDeviceMode, 
  onOpenOrderModal 
}) {
  return (
    <header className="sticky top-0 z-40 bg-[#0c111d]/95 backdrop-blur-md border-b border-slate-800/80 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3.5 gap-3 border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-emerald-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
              <Sparkles className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                  AI <span className="text-amber-400">SALES MACHINE</span>
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                  Jamu Seger Waras Edition
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Penyelarasan Persuasif & Landing Page Khusus Nyeri Sendi, Lutut Kaku & Asam Urat
              </p>
            </div>
          </div>

          {/* Quick status guarantee badge */}
          <div className="flex items-center gap-2 self-start md:self-auto bg-emerald-950/40 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-emerald-400 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Konten Terverifikasi: <strong>100% Edukasi Rimpang Herbal Alami</strong></span>
          </div>
        </div>

        {/* Navigation & Angle Presets */}
        <div className="flex flex-wrap items-center justify-between py-3 gap-3">
          {/* Angle Presets for Jamu Herbal */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <span className="text-xs font-semibold text-slate-400 shrink-0 mr-1">
              Sudut Masalah:
            </span>
            {marketingAngles.map((angle) => {
              const IconComponent = iconMap[angle.icon] || Heart;
              const isSelected = selectedAngleId === angle.id;
              return (
                <button
                  key={angle.id}
                  onClick={() => setSelectedAngleId(angle.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/25 ring-2 ring-amber-400/50'
                      : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                >
                  <IconComponent className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-950' : 'text-amber-400'}`} />
                  <span>{angle.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab & Device Controls */}
          <div className="flex items-center gap-3">
            {/* Tab switch */}
            <div className="flex items-center p-1 bg-slate-900/90 rounded-xl border border-slate-800">
              <button
                onClick={() => setCurrentTab('preview')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  currentTab === 'preview'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Visual Landing Page</span>
              </button>
              <button
                onClick={() => setCurrentTab('blueprint')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  currentTab === 'blueprint'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Strategy Board & Script</span>
              </button>
            </div>

            {/* Device Switcher (when on preview tab) */}
            {currentTab === 'preview' && (
              <div className="hidden sm:flex items-center p-1 bg-slate-900/90 rounded-xl border border-slate-800">
                <button
                  onClick={() => setDeviceMode('desktop')}
                  title="Desktop View"
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    deviceMode === 'desktop' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDeviceMode('mobile')}
                  title="Mobile View (375px)"
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    deviceMode === 'mobile' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Direct Order Button */}
            <button
              onClick={onOpenOrderModal}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Pesan COD</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
