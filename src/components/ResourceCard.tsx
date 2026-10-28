/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ResourceListing } from '../types';
import { useApp } from '../context/AppContext';
import { ResourceGraphic } from './ResourceGraphic';
import { MapPin, ShieldCheck, Clock, AlertTriangle, ArrowUpRight } from 'lucide-react';

interface ResourceCardProps {
  resource: ResourceListing;
  onSelect: (resource: ResourceListing) => void;
}

export const ResourceCard: React.FC<ResourceCardProps> = ({ resource, onSelect }) => {
  const { currentUser } = useApp();

  // Check if current user meets requirements
  const userHasQual = currentUser.qualifications.some(
    q => q.id === resource.requirements.qualificationId && q.verified
  );

  const getStatusText = (status: ResourceListing['status']) => {
    switch (status) {
      case 'available':
        return { label: 'Available for Booking', color: 'text-emerald-700' };
      case 'in_use':
        return { label: 'In Session Now', color: 'text-amber-700' };
      case 'reserved':
        return { label: 'Reserved Upcoming', color: 'text-sky-700' };
      case 'maintenance':
        return { label: 'Under Maintenance', color: 'text-rose-700' };
    }
  };

  const statusInfo = getStatusText(resource.status);

  return (
    <div 
      onClick={() => onSelect(resource)}
      className="group bg-white rounded-xl border border-slate-200/90 hover:border-slate-400/80 transition-all cursor-pointer flex flex-col overflow-hidden text-left shadow-xs hover:shadow-md"
    >
      {/* Visual Technical Schematic Banner */}
      <ResourceGraphic 
        iconType={resource.iconType} 
        badgeLabel={resource.modelCode}
      />

      {/* Card Content Area */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Unboxed Metadata Header (Zero-Pill Compliance) */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
            <span className="capitalize">{resource.category.replace('_', ' ')}</span>
            <span aria-hidden="true">·</span>
            <span className={statusInfo.color + " font-medium"}>{statusInfo.label}</span>
            <span aria-hidden="true">·</span>
            <span>{resource.roomNumber}</span>
          </div>

          {/* Primary Title */}
          <h3 className="text-base font-semibold text-slate-900 group-hover:text-sky-900 transition-colors line-clamp-1">
            {resource.name}
          </h3>

          {/* Location & Institution */}
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
            {resource.facilityName} · {resource.institution}
          </p>

          {/* Concise Description */}
          <p className="text-xs text-slate-600 mt-2.5 line-clamp-2 leading-relaxed">
            {resource.description}
          </p>

          {/* Specifications Highlight Grid */}
          <div className="mt-3.5 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
            {Object.entries(resource.specifications).slice(0, 2).map(([key, value]) => (
              <div key={key} className="min-w-0">
                <span className="text-[11px] text-slate-400 block truncate">{key}</span>
                <span className="text-xs text-slate-700 font-medium truncate block">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Area with Requirement Match & Action */}
        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
          {/* Eligibility status for current persona */}
          <div className="flex items-center gap-1.5 min-w-0">
            {userHasQual ? (
              <div className="flex items-center gap-1 text-xs text-emerald-700 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Eligible (Cert Verified)</span>
              </div>
            ) : resource.requirements.supervisionRequired ? (
              <div className="flex items-center gap-1 text-xs text-amber-700 font-medium">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Staff Supervision Required</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="truncate text-slate-600">Req: {resource.requirements.qualificationName}</span>
              </div>
            )}
          </div>

          {/* View Details / Rate */}
          <div className="flex items-center gap-1 text-xs font-semibold text-slate-900 shrink-0 group-hover:text-sky-600 transition-colors">
            <span className="tabular-nums font-mono">${resource.hourlyRate}/hr</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
};
