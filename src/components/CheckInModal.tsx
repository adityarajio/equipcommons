/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Booking } from '../types';
import { useApp } from '../context/AppContext';
import { X, CheckCircle2, AlertCircle, Camera, Shield, FileCheck, Upload, Clock, XCircle } from 'lucide-react';
import { resizeImageFile } from '../utils/imageUtils';

interface CheckInModalProps {
  booking: Booking | null;
  onClose: () => void;
}

export const CheckInModal: React.FC<CheckInModalProps> = ({ booking, onClose }) => {
  const { checkInBooking, currentUser, resources, demoIgnoreCheckInWindow } = useApp();

  const resource = resources.find(r => r.id === booking?.resourceId);
  const baselineRuntime = resource?.currentRuntimeHours || 1420.0;

  const [rating, setRating] = useState<'pristine' | 'nominal_wear' | 'minor_issue'>('pristine');
  
  // Anti-rubber-stamp: Checklist items start unchecked! User can pass or fail with notes.
  const [checklist, setChecklist] = useState<Array<{ label: string; passed: boolean; notes?: string }>>([
    { label: 'Safety interlocks, guards & emergency power trip verified', passed: false, notes: '' },
    { label: 'Workstage & specimen chamber free of debris/foreign residue', passed: false, notes: '' },
    { label: 'Initial baseline calibration & pressure gauges within nominal spec', passed: false, notes: '' },
    { label: 'Tooling, lenses & optics inspected for pre-existing chips or micro-scratches', passed: false, notes: '' }
  ]);
  
  const [runtimeMeter, setRuntimeMeter] = useState(baselineRuntime);
  const [notes, setNotes] = useState('');
  const [signature, setSignature] = useState(currentUser.name);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState<string>('stage_inspection_pre.jpg');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!booking) return null;

  // Authorization check: Borrower or Custodian
  const isAuthorized = currentUser.id === booking.userId || currentUser.role === 'lab_manager' || currentUser.role === 'institution_admin';

  // Check-in window validation (within 30 mins before, up to 15 mins after)
  const now = new Date();
  const scheduledStart = new Date(booking.startTime);
  const diffMinutes = (now.getTime() - scheduledStart.getTime()) / (1000 * 60);
  const isTooEarly = diffMinutes < -30;
  const isTooLate = diffMinutes > 15;
  const hasUnannotatedFailure = checklist.some(c => !c.passed && (!c.notes || !c.notes.trim()));
  const canCheckIn = isAuthorized && (demoIgnoreCheckInWindow || (!isTooEarly && !isTooLate)) && !hasUnannotatedFailure;

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

  const handleCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized) {
      setErrorMessage(`Unauthorized: Only ${booking.userName} or an authorized facility custodian can perform check-in.`);
      return;
    }

    if (!demoIgnoreCheckInWindow) {
      if (isTooEarly) {
        setErrorMessage(`Check-in Not Yet Open: Facility check-in opens 30 minutes before your scheduled start time (${scheduledStart.toLocaleTimeString()}). Enable Demo Mode in the header to bypass.`);
        return;
      }
      if (isTooLate) {
        setErrorMessage(`Check-in Window Expired: You are more than 15 minutes past your scheduled start time. Enable Demo Mode in the header to bypass.`);
        return;
      }
    }

    // If an item is failed, require defect notes
    const failedItemMissingNotes = checklist.find(c => !c.passed && (!c.notes || !c.notes.trim()));
    if (failedItemMissingNotes) {
      setErrorMessage(`Defect Note Required: Please describe the issue found for "${failedItemMissingNotes.label}".`);
      return;
    }

    const res = checkInBooking(booking.id, {
      inspectorName: currentUser.name,
      inspectorRole: currentUser.role === 'lab_manager' ? 'owner' : 'user',
      statusRating: rating,
      checklistItems: checklist.map(c => ({
        label: c.label,
        passed: c.passed,
        notes: c.notes,
        defectNote: c.notes
      })),
      hoursRuntimeLogged: runtimeMeter,
      consumablesRestocked: true,
      notes: notes || 'Baseline pre-use inspection completed.',
      photoUrl: photoPreview || undefined,
      signature
    });

    if (res.success) {
      onClose();
    } else {
      setErrorMessage(res.message);
    }
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
            <Shield className="w-5 h-5 text-sky-400" />
            <div>
              <h3 className="text-base font-bold text-white">
                Check-In & Baseline Condition Inspection
              </h3>
              <p className="text-xs text-slate-400">
                {booking.resourceName} · Reserved for {booking.userName}
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
        <form onSubmit={handleCheckIn} className="p-6 space-y-5 text-xs text-slate-700 max-h-[80vh] overflow-y-auto">
          
          {!isAuthorized && (
            <div className="p-3 bg-rose-50 text-rose-900 rounded-lg border border-rose-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <strong>Identity Alert:</strong> You are currently acting as <em>{currentUser.name}</em>, but this reservation belongs to <em>{booking.userName}</em>. Switch persona to check in.
              </div>
            </div>
          )}

          {isTooEarly && (
            <div className="p-3 bg-amber-50 text-amber-900 rounded-lg border border-amber-200 flex items-start gap-2">
              <Clock className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <strong>Check-In Window Locked:</strong> Check-in opens 30 minutes prior to scheduled start ({scheduledStart.toLocaleTimeString()}). You cannot check in early to prevent blocking earlier sessions.
              </div>
            </div>
          )}

          <div className="p-3 bg-sky-50 rounded-lg border border-sky-100 text-sky-900">
            <strong>Mandatory Pre-Use Documentation:</strong> Inspect the equipment and check off all safety items. Logging the baseline condition protects you from liability for pre-existing defects.
          </div>

          {/* Condition Rating Selector */}
          <div>
            <label className="block font-semibold text-slate-900 mb-2">
              Initial Baseline Condition
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'pristine', label: 'Pristine / Like New', desc: 'Flawless condition, sanitized' },
                { id: 'nominal_wear', label: 'Nominal Operational Wear', desc: 'Standard cosmetic marks' },
                { id: 'minor_issue', label: 'Minor Issue Noted', desc: 'Acceptable with note' }
              ].map(opt => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setRating(opt.id as any)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    rating === opt.id 
                      ? 'border-slate-900 bg-slate-900 text-white font-medium' 
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <div className="font-semibold">{opt.label}</div>
                  <div className={`text-[10px] mt-0.5 ${rating === opt.id ? 'text-slate-300' : 'text-slate-500'}`}>
                    {opt.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Verification Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-semibold text-slate-900">
                Pre-Use Safety & Calibration Checklist
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
                        <span>Fail / Defect</span>
                      </button>
                    </div>
                  </div>

                  {!item.passed && (
                    <div className="mt-2 pt-2 border-t border-rose-200/60">
                      <input
                        type="text"
                        value={item.notes || ''}
                        onChange={e => setItemNotes(idx, e.target.value)}
                        placeholder="Document defect (e.g. hairline scratch on aperture, pressure gauge jitter)..."
                        className="w-full px-2.5 py-1.5 bg-white border border-rose-300 rounded text-xs text-rose-950 placeholder:text-rose-400"
                        required
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Meter Runtime & Real Photo Upload */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-900 mb-1">
                Hours Meter Baseline
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={runtimeMeter}
                  onChange={e => setRuntimeMeter(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono tabular-nums text-slate-900"
                  required
                />
                <span className="text-slate-500 font-mono">hrs</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Last recorded meter for {resource?.modelCode}: {resource?.currentRuntimeHours}h
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-900 mb-1">
                Attach Visual Evidence Photo
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
                  <img src={photoPreview} alt="Baseline preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-semibold text-slate-900 mb-1">
              Inspection Observations & Remarks
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="Record any pre-existing blemishes, dust, or alignment observations..."
              required
            />
          </div>

          {/* Digital Signature */}
          <div>
            <label className="block font-semibold text-slate-900 mb-1">
              Digital Signature & Acknowledgment
            </label>
            <input
              type="text"
              value={signature}
              onChange={e => setSignature(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900"
              required
            />
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg">
              {errorMessage}
            </div>
          )}

          {/* Submit */}
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
              disabled={!canCheckIn}
              className={`px-5 py-2.5 text-xs font-semibold text-white rounded-lg shadow-sm flex items-center gap-2 ${
                canCheckIn 
                  ? 'bg-slate-900 hover:bg-slate-800' 
                  : 'bg-slate-300 cursor-not-allowed text-slate-500'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>Confirm Check-In & Unlock Resource</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
