/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Booking } from '../types';
import { useApp } from '../context/AppContext';
import { X, AlertOctagon, AlertTriangle, ShieldAlert } from 'lucide-react';

interface IncidentReportModalProps {
  booking: Booking | null;
  onClose: () => void;
}

export const IncidentReportModal: React.FC<IncidentReportModalProps> = ({ booking, onClose }) => {
  const { reportIncident, currentUser } = useApp();

  const [category, setCategory] = useState<'hardware_damage' | 'calibration_loss' | 'uncleaned_facility' | 'late_return' | 'safety_violation'>('hardware_damage');
  const [severity, setSeverity] = useState<'minor' | 'moderate' | 'critical'>('minor');
  const [description, setDescription] = useState('Tool bit chipped during workpiece contouring; vacuum seal gasket requires replacement.');
  const [deductionAmount, setDeductionAmount] = useState(booking?.depositHeld ? Math.min(100, booking.depositHeld) : 50);

  if (!booking) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    reportIncident({
      bookingId: booking.id,
      resourceId: booking.resourceId,
      severity,
      category,
      description,
      depositDeductionAmount: deductionAmount
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 bg-rose-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-rose-400" />
            <div>
              <h3 className="text-base font-bold text-white">
                Report Damage, Delay, or Incident
              </h3>
              <p className="text-xs text-rose-200">
                {booking.resourceName} · Case Reference #{booking.id}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-rose-300 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs text-slate-700">
          <div>
            <label className="block font-semibold text-slate-900 mb-1">Incident Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as any)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
            >
              <option value="hardware_damage">Hardware / Tooling Damage</option>
              <option value="calibration_loss">Optical / Axis Calibration Offset</option>
              <option value="uncleaned_facility">Uncleaned Facility / Foreign Contamination</option>
              <option value="late_return">Overdue Return / Schedule Disruption</option>
              <option value="safety_violation">Safety Protocol Violation</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-900 mb-1">Severity Level</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'minor', label: 'Minor', desc: 'Cosmetic or minor cleanup' },
                { id: 'moderate', label: 'Moderate', desc: 'Requires technician fix' },
                { id: 'critical', label: 'Critical', desc: 'Disables resource' }
              ].map(lvl => (
                <button
                  type="button"
                  key={lvl.id}
                  onClick={() => setSeverity(lvl.id as any)}
                  className={`p-2.5 rounded-lg border text-left transition-colors ${
                    severity === lvl.id
                      ? 'border-rose-600 bg-rose-50 text-rose-900 font-semibold'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <div className="font-semibold">{lvl.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{lvl.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-900 mb-1">
              Incident Description & Evidence
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
              placeholder="Detail the circumstance, broken component, or protocol lapse..."
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-900 mb-1">
              Proposed Security Deposit Deduction ($)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max={booking.depositHeld}
                value={deductionAmount}
                onChange={e => setDeductionAmount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
              />
              <span className="text-slate-500 whitespace-nowrap">
                out of ${booking.depositHeld} deposit
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-medium text-slate-700 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm"
            >
              Submit Incident Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
