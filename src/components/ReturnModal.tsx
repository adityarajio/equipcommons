/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Booking } from '../types';
import { useApp } from '../context/AppContext';
import { X, CheckCircle2, RotateCcw, AlertTriangle, ShieldCheck, DollarSign, Camera, Upload, XCircle } from 'lucide-react';
import { resizeImageFile } from '../utils/imageUtils';

interface ReturnModalProps {
  booking: Booking | null;
  onClose: () => void;
}

export const ReturnModal: React.FC<ReturnModalProps> = ({ booking, onClose }) => {
  const { submitReturnRequest, currentUser, resources } = useApp();

  const resource = resources.find(r => r.id === booking?.resourceId);
  const initialRuntime = booking?.preConditionReport?.hoursRuntimeLogged || resource?.currentRuntimeHours || 1420.0;

  const [rating, setRating] = useState<'pristine' | 'nominal_wear' | 'minor_issue' | 'damaged'>('pristine');
  
  // Anti-rubber-stamp: Checklist items start unchecked! User can pass or fail with notes.
  const [checklist, setChecklist] = useState<Array<{ label: string; passed: boolean; notes?: string }>>([
    { label: 'Workstation vacuumed, degreased, and sterilized per protocol', passed: false, notes: '' },
    { label: 'All tooling bits, holders, and adapters returned to designated racks', passed: false, notes: '' },
    { label: 'Consumables, coolant reservoirs and nitrogen purge levels verified', passed: false, notes: '' },
    { label: 'System powered down or returned to safe standby vacuum mode', passed: false, notes: '' }
  ]);

  const [finalRuntimeMeter, setFinalRuntimeMeter] = useState(initialRuntime + (booking?.totalHours || 2));
  const [consumablesRestocked, setConsumablesRestocked] = useState(true);
  const [notes, setNotes] = useState('');
  const [signature, setSignature] = useState(currentUser.name);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState<string>('return_evidence.jpg');

  // Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!booking) return null;

  const setItemPassed = (idx: number, passed: boolean) => {
    setChecklist(prev => prev.map((item, i) => i === idx ? { ...item, passed } : item));
  };

  const setItemNotes = (idx: number, defectNote: string) => {
    setChecklist(prev => prev.map((item, i) => i === idx ? { ...item, notes: defectNote } : item));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoName(file.name);
      try {
        const compressed = await resizeImageFile(file, 800, 0.72);
        setPhotoPreview(compressed);
      } catch (err) {
        console.warn('Image downscaling failed:', err);
      }
    }
  };

  const hasFailedChecklist = checklist.some(i => !i.passed);
  const willTriggerIncident = rating === 'damaged' || hasFailedChecklist;

  const handleReturn = (e: React.FormEvent) => {
    e.preventDefault();
    submitReturnRequest(booking.id, {
      inspectorName: currentUser.name,
      inspectorRole: currentUser.role === 'lab_manager' ? 'owner' : 'user',
      statusRating: rating,
      checklistItems: checklist.map(c => ({
        label: c.label,
        passed: c.passed,
        notes: c.notes,
        defectNote: c.notes
      })),
      hoursRuntimeLogged: finalRuntimeMeter,
      consumablesRestocked,
      notes: notes || 'Equipment return submitted for custodian verification.',
      photoUrl: photoPreview || undefined,
      signature
    });
    onClose();
  };


  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-base font-bold text-white">
                Initiate Return & Condition Self-Audit (Step 1 of 2)
              </h3>
              <p className="text-xs text-slate-400">
                {booking.resourceName} · Reserved by {booking.userName}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            aria-label="Close dialog"
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleReturn} className="p-6 space-y-5 text-xs text-slate-700 max-h-[80vh] overflow-y-auto">
          
          <div className="p-3 bg-sky-50 border border-sky-100 rounded-lg text-sky-950 text-xs leading-relaxed">
            <strong>Two-Step Return Protocol:</strong> Submitting this report halts your session runtime and notifies the facility custodian (<strong className="text-slate-900">{resource?.ownerName}</strong>). Once the custodian verifies the physical condition and meter reading, your held deposit (<span className="font-mono font-semibold">${booking.depositHeld}</span>) will be released.
          </div>

          {willTriggerIncident && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong>Incident Review Warning:</strong> Selecting "Damage Found" or leaving items unpassed will flag this return for custodian damage review and potential deposit deduction.
              </div>
            </div>
          )}

          {/* Condition Rating Selector */}
          <div>
            <label className="block font-semibold text-slate-900 mb-2">
              Post-Use Final Condition Assessment
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'pristine', label: 'Pristine', desc: 'No wear, sanitized' },
                { id: 'nominal_wear', label: 'Nominal', desc: 'Standard usage' },
                { id: 'minor_issue', label: 'Minor Wear', desc: 'Acceptable note' },
                { id: 'damaged', label: 'Damage Found', desc: 'Flag for review' }
              ].map(opt => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setRating(opt.id as any)}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    rating === opt.id 
                      ? opt.id === 'damaged' 
                        ? 'border-rose-600 bg-rose-600 text-white font-medium'
                        : 'border-slate-900 bg-slate-900 text-white font-medium' 
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <div className="font-semibold text-xs">{opt.label}</div>
                  <div className={`text-[10px] mt-0.5 ${rating === opt.id ? 'text-slate-200' : 'text-slate-500'}`}>
                    {opt.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Return Verification Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-semibold text-slate-900">
                Post-Session Housekeeping & Return Checklist
              </label>
              <span className="text-[11px] text-slate-500">
                {checklist.filter(c => c.passed).length} of {checklist.length} verified
              </span>
            </div>

            <div className="space-y-2.5">
              {checklist.map((item, idx) => (
                <div 
                  key={idx}
                  className={`p-3 rounded-xl border transition-colors ${
                    item.passed 
                      ? 'bg-emerald-50/70 border-emerald-200' 
                      : item.notes 
                      ? 'bg-rose-50/70 border-rose-200' 
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="font-medium text-slate-800 text-xs">
                      {item.label}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setItemPassed(idx, true)}
                        className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
                          item.passed 
                            ? 'bg-emerald-600 text-white' 
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Pass</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setItemPassed(idx, false)}
                        className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
                          !item.passed 
                            ? 'bg-rose-600 text-white' 
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Defect / Incomplete</span>
                      </button>
                    </div>
                  </div>

                  {!item.passed && (
                    <div className="mt-2 pt-2 border-t border-rose-200/60">
                      <input
                        type="text"
                        value={item.notes || ''}
                        onChange={e => setItemNotes(idx, e.target.value)}
                        placeholder="Note reason or defect (e.g. coolant fluid low, stage not wiped, missing collet)..."
                        className="w-full px-2.5 py-1.5 bg-white border border-rose-300 rounded text-xs text-rose-950 placeholder:text-rose-400"
                        required
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Runtime Meter & Real Photo Evidence */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-900 mb-1">
                Final Runtime Meter Reading
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={finalRuntimeMeter}
                  onChange={e => setFinalRuntimeMeter(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono tabular-nums text-slate-900"
                  required
                />
                <span className="text-slate-500 font-mono">hrs</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Session baseline was: {initialRuntime}h (+{(finalRuntimeMeter - initialRuntime).toFixed(1)}h logged)
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-900 mb-1">
                Attach Return Photo Evidence
              </label>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg border border-slate-300 flex items-center gap-1.5 transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <span className="text-[11px] text-slate-600 truncate max-w-[140px] font-mono">
                  {photoName}
                </span>
              </div>
              {photoPreview && (
                <div className="mt-2 relative w-20 h-14 rounded border border-slate-200 overflow-hidden">
                  <img src={photoPreview} alt="Return photo preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>

          {/* Restock Consumables Switch */}
          <label className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={consumablesRestocked}
              onChange={e => setConsumablesRestocked(e.target.checked)}
              className="rounded text-sky-600 focus:ring-sky-500"
            />
            <span className="font-medium text-slate-900">
              Consumables (sputter targets, resist, coolant, gas) restocked to baseline levels
            </span>
          </label>

          {/* Notes */}
          <div>
            <label className="block font-semibold text-slate-900 mb-1">
              Final Session Notes & Departure Remarks
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="Record any deviations, consumable usage, or handoff notes..."
              required
            />
          </div>

          {/* Digital Signature */}
          <div>
            <label className="block font-semibold text-slate-900 mb-1">
              Borrower Digital Signature
            </label>
            <input
              type="text"
              value={signature}
              onChange={e => setSignature(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900"
              required
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4 text-emerald-400" />
              <span>Submit Return for Custodian Sign-Off</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
