/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface ResourceGraphicProps {
  iconType: 'microscope' | 'cnc' | 'cleanroom' | 'camera' | 'spectrometer' | 'laser';
  className?: string;
  badgeLabel?: string;
}

export const ResourceGraphic: React.FC<ResourceGraphicProps> = ({ 
  iconType, 
  className = "h-44 w-full",
  badgeLabel
}) => {
  return (
    <div className={`relative overflow-hidden bg-slate-900 flex items-center justify-center ${className}`}>
      {/* Background blueprint/technical grid */}
      <div 
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage: `
            linear-gradient(to right, #38bdf8 1px, transparent 1px),
            linear-gradient(to bottom, #38bdf8 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }}
      />

      {/* Subtle radial glow */}
      <div className="absolute inset-0 bg-radial from-slate-800/80 via-slate-900 to-slate-950" />

      {/* Domain Schematic Illustrations */}
      <div className="relative z-10 flex flex-col items-center justify-center p-4">
        {iconType === 'microscope' && (
          <svg className="w-24 h-24 text-sky-400" viewBox="0 0 100 100" fill="none" stroke="currentColor">
            {/* FE-SEM Electron Column */}
            <rect x="42" y="10" width="16" height="24" rx="2" strokeWidth="2" strokeDasharray="3 3" />
            <path d="M36 34 H64 V44 H36 Z" strokeWidth="2" fill="currentColor" fillOpacity="0.1" />
            {/* Acceleration Gun & Deflection Coils */}
            <line x1="50" y1="12" x2="50" y2="32" strokeWidth="1.5" stroke="#38bdf8" />
            <circle cx="50" cy="22" r="3" fill="#38bdf8" />
            {/* Specimen Vacuum Chamber */}
            <rect x="28" y="44" width="44" height="34" rx="4" strokeWidth="2.5" />
            {/* Eucentric 5-Axis Stage */}
            <line x1="38" y1="62" x2="62" y2="62" strokeWidth="2" />
            <rect x="46" y="58" width="8" height="4" fill="#38bdf8" />
            {/* EDS Detector Port */}
            <line x1="72" y1="52" x2="88" y2="44" strokeWidth="2" />
            <circle cx="89" cy="43.5" r="3.5" strokeWidth="1.5" fill="#0284c7" />
            {/* Vibration Isolation Base */}
            <line x1="20" y1="84" x2="80" y2="84" strokeWidth="3" />
            <rect x="24" y="84" width="8" height="6" strokeWidth="1.5" />
            <rect x="68" y="84" width="8" height="6" strokeWidth="1.5" />
          </svg>
        )}

        {iconType === 'cnc' && (
          <svg className="w-24 h-24 text-emerald-400" viewBox="0 0 100 100" fill="none" stroke="currentColor">
            {/* Machine Enclosure */}
            <rect x="18" y="16" width="64" height="64" rx="4" strokeWidth="2.5" />
            {/* Spindle Carriage & Z-Axis */}
            <rect x="42" y="16" width="16" height="12" strokeWidth="2" fill="currentColor" fillOpacity="0.15" />
            <line x1="50" y1="28" x2="50" y2="46" strokeWidth="3" stroke="#34d399" />
            {/* Cutting Endmill Tool */}
            <polygon points="48,46 52,46 50,52" fill="#34d399" />
            {/* 5-Axis Rotary Trunnion Table */}
            <ellipse cx="50" cy="66" rx="20" ry="7" strokeWidth="2" />
            <circle cx="50" cy="66" r="3" fill="#34d399" />
            {/* Axis Crosshairs */}
            <line x1="26" y1="36" x2="34" y2="36" strokeWidth="1.5" strokeDasharray="2 2" />
            <line x1="30" y1="32" x2="30" y2="40" strokeWidth="1.5" strokeDasharray="2 2" />
            {/* Workpiece */}
            <rect x="44" y="58" width="12" height="8" rx="1" strokeWidth="1.5" fill="currentColor" fillOpacity="0.2" />
            {/* Coolant Jets */}
            <path d="M42 42 Q38 48 46 52" strokeWidth="1.5" strokeDasharray="2 2" stroke="#6ee7b7" />
          </svg>
        )}

        {iconType === 'cleanroom' && (
          <svg className="w-24 h-24 text-amber-400" viewBox="0 0 100 100" fill="none" stroke="currentColor">
            {/* ISO Bay Outer Architecture */}
            <rect x="16" y="14" width="68" height="68" rx="2" strokeWidth="2.5" />
            {/* HEPA Laminar Flow Grid Ceiling */}
            <line x1="16" y1="28" x2="84" y2="28" strokeWidth="2" />
            <line x1="26" y1="14" x2="26" y2="28" strokeWidth="1.5" />
            <line x1="38" y1="14" x2="38" y2="28" strokeWidth="1.5" />
            <line x1="50" y1="14" x2="50" y2="28" strokeWidth="1.5" />
            <line x1="62" y1="14" x2="62" y2="28" strokeWidth="1.5" />
            <line x1="74" y1="14" x2="74" y2="28" strokeWidth="1.5" />
            {/* Laminar Airflow Streamlines */}
            <line x1="32" y1="32" x2="32" y2="46" strokeWidth="1.5" strokeDasharray="2 3" stroke="#fbbf24" />
            <line x1="50" y1="32" x2="50" y2="46" strokeWidth="1.5" strokeDasharray="2 3" stroke="#fbbf24" />
            <line x1="68" y1="32" x2="68" y2="46" strokeWidth="1.5" strokeDasharray="2 3" stroke="#fbbf24" />
            {/* Photolithography Mask Aligner Stage */}
            <rect x="30" y="52" width="40" height="22" rx="3" strokeWidth="2" fill="currentColor" fillOpacity="0.1" />
            {/* Silicon Wafer */}
            <circle cx="50" cy="63" r="6" strokeWidth="1.5" fill="#f59e0b" />
            {/* Photomask Alignment Reticle */}
            <rect x="42" y="55" width="16" height="16" strokeWidth="1" strokeDasharray="2 2" />
          </svg>
        )}

        {iconType === 'camera' && (
          <svg className="w-24 h-24 text-indigo-400" viewBox="0 0 100 100" fill="none" stroke="currentColor">
            {/* Phantom Camera Body */}
            <rect x="32" y="30" width="42" height="34" rx="4" strokeWidth="2.5" fill="currentColor" fillOpacity="0.15" />
            {/* Prime Cine Lens Assembly */}
            <path d="M32 36 L18 32 L18 62 L32 58 Z" strokeWidth="2" fill="currentColor" fillOpacity="0.25" />
            <circle cx="18" cy="47" r="4" strokeWidth="1.5" fill="#818cf8" />
            {/* Cooling Fan Grille & Heat Sink */}
            <line x1="62" y1="36" x2="62" y2="58" strokeWidth="1.5" />
            <line x1="66" y1="36" x2="66" y2="58" strokeWidth="1.5" />
            <line x1="70" y1="36" x2="70" y2="58" strokeWidth="1.5" />
            {/* High-Speed Sync & Trigger Ports */}
            <circle cx="42" cy="40" r="2.5" fill="#818cf8" />
            <circle cx="50" cy="40" r="2.5" fill="#818cf8" />
            {/* Optical Bench Clamp Base */}
            <rect x="44" y="64" width="18" height="10" strokeWidth="2" />
            <line x1="24" y1="78" x2="82" y2="78" strokeWidth="3" />
            <line x1="30" y1="84" x2="76" y2="84" strokeWidth="2" />
          </svg>
        )}

        {iconType === 'spectrometer' && (
          <svg className="w-24 h-24 text-teal-400" viewBox="0 0 100 100" fill="none" stroke="currentColor">
            {/* Spectrometer Enclosure */}
            <rect x="18" y="24" width="64" height="52" rx="3" strokeWidth="2.5" />
            {/* Dual Laser Source Ports */}
            <rect x="24" y="32" width="12" height="8" rx="1" strokeWidth="1.5" fill="#2dd4bf" fillOpacity="0.2" />
            <rect x="24" y="44" width="12" height="8" rx="1" strokeWidth="1.5" fill="#2dd4bf" fillOpacity="0.2" />
            {/* Optical Path & Dichroic Mirror */}
            <line x1="36" y1="36" x2="52" y2="36" strokeWidth="2" stroke="#2dd4bf" />
            <line x1="48" y1="32" x2="56" y2="40" strokeWidth="2" stroke="#5eead4" />
            {/* Grating Turret */}
            <circle cx="68" cy="50" r="10" strokeWidth="2" strokeDasharray="3 2" />
            {/* Confocal Pin-Hole Aperture */}
            <circle cx="52" cy="56" r="3" strokeWidth="1.5" fill="#2dd4bf" />
            {/* Cryogenic Stage */}
            <line x1="36" y1="68" x2="54" y2="68" strokeWidth="2.5" />
          </svg>
        )}

        {iconType === 'laser' && (
          <svg className="w-24 h-24 text-rose-400" viewBox="0 0 100 100" fill="none" stroke="currentColor">
            {/* SLS Machine Housing */}
            <rect x="20" y="16" width="60" height="66" rx="4" strokeWidth="2.5" />
            {/* Fiber Laser Galvo Scanner */}
            <rect x="42" y="22" width="16" height="10" strokeWidth="1.5" fill="currentColor" fillOpacity="0.2" />
            {/* Scanning Laser Beam */}
            <line x1="50" y1="32" x2="38" y2="52" strokeWidth="1.5" stroke="#fb7185" strokeDasharray="2 2" />
            <line x1="50" y1="32" x2="56" y2="52" strokeWidth="1.5" stroke="#fb7185" />
            {/* Powder Bed Build Chamber */}
            <rect x="30" y="52" width="40" height="22" strokeWidth="2" fill="currentColor" fillOpacity="0.1" />
            {/* Sintered Layer Section */}
            <rect x="38" y="58" width="24" height="6" fill="#fb7185" fillOpacity="0.6" />
            {/* Recoater Blade */}
            <line x1="28" y1="52" x2="72" y2="52" strokeWidth="2" stroke="#fda4af" />
          </svg>
        )}
      </div>

      {/* Floating technical tag */}
      {badgeLabel && (
        <div className="absolute bottom-2.5 left-3 z-20 text-[11px] font-mono tracking-wider text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
          {badgeLabel}
        </div>
      )}
    </div>
  );
};
