/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ResourceListing } from '../types';
import { useApp } from '../context/AppContext';
import { ResourceGraphic } from './ResourceGraphic';
import { toLocalISOString } from '../utils/dateUtils';
import { 
  X, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  Building2, 
  User, 
  DollarSign, 
  Calendar, 
  FileText, 
  Check, 
  Scale, 
  Sparkles, 
  Info,
  Award,
  Layers
} from 'lucide-react';

interface ResourceDetailModalProps {
  resource: ResourceListing | null;
  onClose: () => void;
}

export const ResourceDetailModal: React.FC<ResourceDetailModalProps> = ({ resource, onClose }) => {
  const { 
    currentUser, 
    bookings,
    submitBookingRequest, 
    setActiveTab, 
    getUserQuota, 
    userDeposits,
    calculateFairnessScore,
    submitVerificationRequest
  } = useApp();

  // Dynamic tomorrow date string (local)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = toLocalISOString(tomorrow).split('T')[0];
  const todayStr = toLocalISOString(new Date()).split('T')[0];

  const [date, setDate] = useState(tomorrowStr);
  const [startTime, setStartTime] = useState('09:00');
  const [durationHours, setDurationHours] = useState(2);
  const [purpose, setPurpose] = useState('');
  const [grantCode, setGrantCode] = useState('');
  const [requestSupervision, setRequestSupervision] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{ success: boolean; message: string; waitlisted?: boolean; bookingId?: string } | null>(null);

  // Quick credential submission drawer
  const [isSubmittingCred, setIsSubmittingCred] = useState(false);
  const [credDocRef, setCredDocRef] = useState('training_cert_evidence.pdf');
  const [credLevel, setCredLevel] = useState('Certified Operator');

  // Escape key listener for accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!resource) return null;

  // Real-time quota and fairness breakdown
  const quota = getUserQuota(currentUser.id);
  const userDep = userDeposits[currentUser.id] || { balance: 0, held: 0, lifetimeRefunded: 0, lifetimeDeducted: 0 };
  const fairnessBreakdown = calculateFairnessScore(currentUser.id, grantCode);

  // Qualification matching
  const requiredCertId = resource.requirements.qualificationId;
  const userQual = currentUser.qualifications.find(q => q.id === requiredCertId);
  const isQualExpired = userQual ? new Date(userQual.expiryDate).getTime() < Date.now() : false;
  const isQualified = Boolean(userQual && userQual.verified && !isQualExpired);

  const supervisionFee = resource.requirements.supervisionFee || 25;
  const sessionCost = (resource.hourlyRate * durationHours) + (requestSupervision ? supervisionFee : 0);
  const exceedsQuota = durationHours > quota.remaining;
  const hasInsufficientDeposit = userDep.balance < resource.depositAmount;

  // Generate dynamic duration options up to maxConsecutiveHours
  const maxHours = resource.requirements.maxConsecutiveHours || 4;
  const durationOptions = Array.from({ length: maxHours }, (_, i) => i + 1);

  // Compute daily schedule availability grid for the selected date
  const dayBookings = bookings.filter(b => 
    b.resourceId === resource.id &&
    ['pending_review', 'approved', 'checked_in', 'return_pending_inspection'].includes(b.status) &&
    b.startTime.startsWith(date)
  );

  const hoursGrid = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

  const handleBooking = (e: React.FormEvent) => {
    e.preventDefault();
    
    const startIso = `${date}T${startTime}:00`;
    const startHour = parseInt(startTime.split(':')[0], 10);
    const endHour = Math.min(23, startHour + durationHours);
    const endHourStr = endHour < 10 ? `0${endHour}:00` : `${endHour}:00`;
    const endIso = `${date}T${endHourStr}:00`;

    const res = submitBookingRequest({
      resourceId: resource.id,
      startTime: startIso,
      endTime: endIso,
      totalHours: durationHours,
      purposeDescription: purpose,
      projectGrantCode: grantCode.trim() || undefined,
      supervisionRequested: requestSupervision
    });

    setSubmissionResult(res);

    if (res.success) {
      setTimeout(() => {
        onClose();
        setActiveTab('my_bookings');
      }, 1800);
    }
  };

  const handleQuickSubmitCred = (e: React.FormEvent) => {
    e.preventDefault();
    submitVerificationRequest({
      qualificationId: resource.requirements.qualificationId,
      qualificationName: resource.requirements.qualificationName,
      level: credLevel,
      issuingInstitution: resource.institution,
      documentRef: credDocRef
    });
    setIsSubmittingCred(false);
    alert('Credential document submitted for Compliance Admin verification. Track progress in the Compliance Hub.');
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="resource-title"
    >
      <div 
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="relative border-b border-slate-200">
          <ResourceGraphic 
            iconType={resource.iconType} 
            className="h-44 w-full" 
            badgeLabel={resource.modelCode}
          />
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6">
          
          {/* Title & Metadata */}
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1">
              <span className="capitalize font-medium">{resource.category.replace('_', ' ')}</span>
              <span aria-hidden="true">·</span>
              <span>{resource.facilityName}</span>
              <span aria-hidden="true">·</span>
              <span>{resource.roomNumber}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums text-slate-700 font-semibold">${resource.hourlyRate}/hr</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-slate-500">Current Meter: {resource.currentRuntimeHours}h</span>
            </div>
            <h2 id="resource-title" className="text-2xl font-bold text-slate-900">
              {resource.name}
            </h2>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              {resource.description}
            </p>
          </div>

          {/* Grid Layout: Left Details / Right Booking Form */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4 border-t border-slate-100">
            
            {/* Left Column: Specifications, Rules, Schedule Grid, Custodian (7 Cols) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Daily Availability Visual Schedule Grid */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-sky-600" />
                    <span>Daily Schedule Grid ({date})</span>
                  </h4>
                  <span className="text-[11px] text-slate-500">Green = Available · Red = Booked</span>
                </div>
                
                <div className="grid grid-cols-6 sm:grid-cols-12 gap-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {hoursGrid.map((hr) => {
                    const hrStr = hr < 10 ? `0${hr}:00` : `${hr}:00`;
                    const slotStart = `${date}T${hrStr}:00`;
                    const isTaken = dayBookings.some(b => {
                      const bStartHour = parseInt(b.startTime.split('T')[1].split(':')[0], 10);
                      const bEndHour = parseInt(b.endTime.split('T')[1].split(':')[0], 10);
                      return hr >= bStartHour && hr < bEndHour;
                    });

                    return (
                      <div 
                        key={hr} 
                        className={`p-1.5 rounded text-center transition-colors ${
                          isTaken 
                            ? 'bg-rose-100 border border-rose-300 text-rose-800' 
                            : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                        }`}
                        title={`${hrStr}: ${isTaken ? 'Booked' : 'Available'}`}
                      >
                        <div className="font-mono text-[10px] font-bold">{hr}:00</div>
                        <div className="text-[9px] font-semibold">{isTaken ? 'Taken' : 'Free'}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Technical Specifications */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2">
                  Technical Specifications
                </h4>
                <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200 divide-y divide-slate-200/70 text-xs">
                  {Object.entries(resource.specifications).map(([key, val]) => (
                    <div key={key} className="py-1.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                      <span className="text-slate-600 font-medium">{key}</span>
                      <span className="text-slate-900 text-right font-medium">{val}</span>
                    </div>
                  ))}
                  <div className="py-1.5 flex items-center justify-between gap-4">
                    <span className="text-slate-600 font-medium">Estimated Asset Replacement Value</span>
                    <span className="text-slate-900 font-mono font-bold">{resource.estimatedReplacementValue}</span>
                  </div>
                </div>
              </div>

              {/* Access Conditions & Operating Rules */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2">
                  Operating Guidelines & Safety Protocol
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-600">
                  {resource.usageRules.map((rule, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Custodian & Facility Info */}
              <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {resource.ownerName.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="text-xs">
                  <div className="font-bold text-slate-900">{resource.ownerName}</div>
                  <div className="text-slate-500">{resource.ownerRole} · {resource.institution}</div>
                </div>
              </div>

            </div>

            {/* Right Column: Automated Eligibility & Booking Request Form (5 Cols) */}
            <div className="lg:col-span-5 bg-slate-50 rounded-xl p-5 border border-slate-200 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-sky-600" />
                  <span>Access Verification & Request</span>
                </h3>

                {/* Eligibility Verification Card */}
                <div className="p-3 rounded-lg bg-white border border-slate-200 text-xs mb-4 space-y-2">
                  <div className="font-semibold text-slate-900 flex items-center justify-between">
                    <span>Prerequisite Credential</span>
                    {resource.requirements.qualificationId === 'none' ? (
                      <span className="text-emerald-700 font-medium flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Open Access
                      </span>
                    ) : isQualified ? (
                      <span className="text-emerald-700 font-medium flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Verified
                      </span>
                    ) : (
                      <span className="text-amber-700 font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Action Req
                      </span>
                    )}
                  </div>

                  <p className="text-slate-700 font-medium">
                    {resource.requirements.qualificationName}
                  </p>
                  
                  {isQualified ? (
                    <div className="text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded border border-emerald-100">
                      User <strong>{currentUser.name}</strong> holds active accreditation (Expires {userQual?.expiryDate}). Unescorted access unlocked.
                    </div>
                  ) : resource.requirements.qualificationId === 'none' ? (
                    <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                      No special certification required for this equipment. Standard facility safety rules apply.
                    </div>
                  ) : (
                    <div className="space-y-2 text-[11px] text-amber-900 bg-amber-50 p-2.5 rounded border border-amber-200">
                      <p>
                        You do not hold active verified certification for this asset.
                        {resource.requirements.allowSupervisedBypass
                          ? ` You may book with Staff Supervision (+$${supervisionFee}).`
                          : ' Supervised bypass is barred for this resource; verified certification is mandatory.'}
                      </p>
                      
                      <button
                        type="button"
                        onClick={() => setIsSubmittingCred(!isSubmittingCred)}
                        className="text-xs font-semibold text-sky-700 hover:text-sky-900 underline flex items-center gap-1"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>Submit Credential Evidence to Admin</span>
                      </button>
                    </div>
                  )}

                  {/* Quick Credential Submission Sub-form */}
                  {isSubmittingCred && (
                    <form onSubmit={handleQuickSubmitCred} className="p-2.5 bg-slate-100 rounded border border-slate-300 space-y-2 text-[11px]">
                      <div className="font-bold text-slate-900">Submit Certification to Compliance Hub</div>
                      <div>
                        <label className="block text-slate-600 mb-0.5">Accreditation Level</label>
                        <input
                          type="text"
                          value={credLevel}
                          onChange={e => setCredLevel(e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-slate-800 text-xs"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-0.5">Document File Reference / Certificate #</label>
                        <input
                          type="text"
                          value={credDocRef}
                          onChange={e => setCredDocRef(e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-slate-800 font-mono text-xs"
                          required
                        />
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsSubmittingCred(false)}
                          className="px-2 py-1 text-slate-600 hover:text-slate-800"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-2.5 py-1 bg-slate-900 text-white rounded font-semibold hover:bg-slate-800"
                        >
                          Submit
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Real Dynamic Priority Score */}
                  <div className="pt-2 border-t border-slate-100 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-600 font-medium">Fair Priority Score:</span>
                      <span className="font-mono font-bold text-sky-700 text-xs tabular-nums">
                        {fairnessBreakdown.totalScore} / 100
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 leading-tight">
                      {fairnessBreakdown.justificationSummary}
                    </div>
                  </div>

                  {/* Quota & Escrow Ledger Status */}
                  <div className="pt-2 border-t border-slate-100 space-y-1 text-[11px] text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>Weekly Quota:</span>
                      <span className="font-medium text-slate-900 font-mono">
                        {quota.used} / {quota.total} hrs ({quota.remaining}h free)
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Deposit Escrow:</span>
                      <span className="font-medium text-emerald-700 font-mono">
                        ${userDep.balance} available (${resource.depositAmount} required)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Booking Form */}
                <form onSubmit={handleBooking} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Reservation Date
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      min={todayStr}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Start Time
                      </label>
                      <select
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      >
                        <option value="08:00">08:00 AM</option>
                        <option value="09:00">09:00 AM</option>
                        <option value="10:00">10:00 AM</option>
                        <option value="11:00">11:00 AM</option>
                        <option value="13:00">01:00 PM</option>
                        <option value="14:00">02:00 PM</option>
                        <option value="15:00">03:00 PM</option>
                        <option value="16:00">04:00 PM</option>
                        <option value="17:00">05:00 PM</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Session Length
                      </label>
                      <select
                        value={durationHours}
                        onChange={(e) => setDurationHours(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      >
                        {durationOptions.map(h => (
                          <option key={h} value={h}>
                            {h} hour{h > 1 ? 's' : ''} {h === maxHours ? '(Max Cap)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Project Purpose & Scientific Justification
                    </label>
                    <textarea
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      placeholder="State experimental objectives and research basis..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Grant / Capstone Account Code <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={grantCode}
                      onChange={(e) => setGrantCode(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                      placeholder="e.g. NIH-R01-BIO-98214 or CAPSTONE-2026"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Recognized prefixes (NIH-, NSF-, DOE-, CAPSTONE-) receive priority weighting.
                    </span>
                  </div>

                  {/* Supervision Checkbox */}
                  {(!isQualified || resource.requirements.supervisionRequired) && (
                    <label className="flex items-start gap-2 pt-1 text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={requestSupervision}
                        onChange={(e) => setRequestSupervision(e.target.checked)}
                        className="mt-0.5 rounded text-sky-600 focus:ring-sky-500"
                        required={!isQualified && resource.requirements.mandatory}
                      />
                      <span>
                        Request dedicated Staff Technician Supervision (+${supervisionFee} session fee).
                        {resource.requirements.supervisionRequired && ' (Mandatory for this delicate tool)'}
                      </span>
                    </label>
                  )}

                  {/* Itemized Cost & Escrow Summary */}
                  <div className="text-[11px] bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                    <div className="flex justify-between text-slate-600">
                      <span>Tool Time ({durationHours}h × ${resource.hourlyRate}):</span>
                      <span className="font-mono">${resource.hourlyRate * durationHours}</span>
                    </div>
                    {requestSupervision && (
                      <div className="flex justify-between text-slate-600">
                        <span>Staff Supervision Fee:</span>
                        <span className="font-mono">+${supervisionFee}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold text-slate-900 pt-1 border-t border-slate-100">
                      <span>Total Session Cost:</span>
                      <span className="font-mono text-xs">${sessionCost}</span>
                    </div>
                    <div className="flex justify-between text-sky-800 pt-0.5 text-[10px]">
                      <span>Security Escrow Held:</span>
                      <span className="font-mono">${resource.depositAmount} (Returned after clean return)</span>
                    </div>
                  </div>

                  {/* Submission Feedback */}
                  {submissionResult && (
                    <div className={`p-3 rounded-lg text-xs ${
                      submissionResult.success 
                        ? submissionResult.waitlisted 
                          ? 'bg-amber-50 text-amber-900 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-900 border border-emerald-200' 
                        : 'bg-rose-50 text-rose-900 border border-rose-200'
                    }`}>
                      {submissionResult.message}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={exceedsQuota || hasInsufficientDeposit}
                    className={`w-full py-2.5 px-4 rounded-lg font-semibold text-xs transition-colors shadow-sm flex items-center justify-center gap-2 ${
                      exceedsQuota || hasInsufficientDeposit
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    <span>
                      {exceedsQuota 
                        ? 'Weekly Quota Limit Exceeded' 
                        : hasInsufficientDeposit
                        ? `Insufficient Escrow ($${userDep.balance} / $${resource.depositAmount} required)`
                        : 'Submit Reservation Request'}
                    </span>
                  </button>
                </form>
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
