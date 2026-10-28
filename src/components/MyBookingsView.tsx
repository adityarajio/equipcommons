/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Booking } from '../types';
import { 
  CheckCircle2, 
  XCircle,
  Clock, 
  RotateCcw, 
  ShieldCheck, 
  AlertCircle, 
  FileText, 
  ArrowRight,
  Shield,
  FileCheck,
  Scale,
  Sparkles,
  History,
  Ban,
  ClockPlus,
  Coins,
  Award,
  AlertTriangle,
  Upload
} from 'lucide-react';
import { CheckInModal } from './CheckInModal';
import { ReturnModal } from './ReturnModal';
import { IncidentReportModal } from './IncidentReportModal';
import { BookingTimelineModal } from './BookingTimelineModal';

export const MyBookingsView: React.FC = () => {
  const { 
    currentUser, 
    bookings, 
    resources, 
    getUserQuota, 
    userDeposits,
    setActiveTab, 
    cancelBooking, 
    extendBooking,
    contestIncident,
    submitVerificationRequest
  } = useApp();

  const [activeCheckInBooking, setActiveCheckInBooking] = useState<Booking | null>(null);
  const [activeReturnBooking, setActiveReturnBooking] = useState<Booking | null>(null);
  const [activeIncidentBooking, setActiveIncidentBooking] = useState<Booking | null>(null);
  const [timelineBooking, setTimelineBooking] = useState<Booking | null>(null);
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);

  // Contest penalty modal
  const [contestingIncidentId, setContestingIncidentId] = useState<string | null>(null);
  const [contestReason, setContestReason] = useState('Tool had pre-existing vibration before my session began. Baseline log noted this.');

  // Credential submission modal
  const [isSubmitCredOpen, setIsSubmitCredOpen] = useState(false);
  const [newCertId, setNewCertId] = useState('cert_laser_l2');
  const [newCertName, setNewCertName] = useState('Class 4 Laser Safety & Optical Alignment');
  const [newCertLevel, setNewCertLevel] = useState('Certified Operator');
  const [newCertDoc, setNewCertDoc] = useState('safety_certificate_scan.pdf');

  // Cancel reservation confirm modal
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // User's bookings
  const myBookings = bookings.filter(b => b.userId === currentUser.id);
  const quota = getUserQuota(currentUser.id);
  const depositLedger = userDeposits[currentUser.id] || { balance: 500, held: 0, lifetimeRefunded: 0, lifetimeDeducted: 0 };

  const getStatusBadge = (status: Booking['status']) => {
    switch (status) {
      case 'approved':
        return { label: 'Approved · Ready for Check-In', color: 'text-sky-700 bg-sky-50 border-sky-200' };
      case 'checked_in':
        return { label: 'In Progress · Session Active', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
      case 'return_pending_inspection':
        return { label: 'Return Submitted · Custodian Review Pending', color: 'text-purple-700 bg-purple-50 border-purple-200' };
      case 'pending_review':
        return { label: 'Pending Custodian Review', color: 'text-amber-700 bg-amber-50 border-amber-200' };
      case 'waitlisted':
        return { label: 'Waitlisted', color: 'text-purple-700 bg-purple-50 border-purple-200' };
      case 'completed':
        return { label: 'Completed & Certified', color: 'text-slate-700 bg-slate-100 border-slate-200' };
      case 'rejected':
        return { label: 'Declined', color: 'text-rose-700 bg-rose-50 border-rose-200' };
      case 'incident_flagged':
        return { label: 'Incident / Hold Flagged', color: 'text-rose-800 bg-rose-50 border-rose-200' };
      case 'cancelled':
        return { label: 'Cancelled (Auto-Release / User)', color: 'text-slate-500 bg-slate-100 border-slate-200' };
      default:
        return { label: status, color: 'text-slate-600 bg-slate-50 border-slate-200' };
    }
  };

  const renderDepositStatus = (b: Booking) => {
    if (b.depositSettlement) {
      const s = b.depositSettlement;
      if (s.status === 'full_refund') {
        return <span className="text-emerald-700 font-semibold">100% Refunded (${s.refundedAmount})</span>;
      }
      if (s.status === 'partial_deduction') {
        return <span className="text-amber-800 font-semibold">${s.deductedAmount} Deducted / ${s.refundedAmount} Refunded</span>;
      }
      if (s.status === 'full_forfeit') {
        return <span className="text-rose-700 font-semibold">Deposit Forfeited (${s.deductedAmount})</span>;
      }
    }
    if (b.depositRefunded) {
      return <span className="text-emerald-700 font-semibold">Refunded (${b.depositHeld})</span>;
    }
    if (b.depositHeld > 0) {
      return <span className="text-sky-800 font-semibold">Held in Escrow (${b.depositHeld})</span>;
    }
    return <span className="text-slate-500 font-medium">$0 (Institutional Waiver)</span>;
  };

  const handleConfirmContest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contestingIncidentId) return;
    const res = contestIncident(contestingIncidentId, contestReason);
    if (!res.success) {
      showToast(res.message);
    } else {
      showToast('Incident penalty contested. Escalated to Consortium Compliance Admin.');
    }
    setContestingIncidentId(null);
  };

  const handleSubmitNewCert = (e: React.FormEvent) => {
    e.preventDefault();
    submitVerificationRequest({
      qualificationId: newCertId,
      qualificationName: newCertName,
      level: newCertLevel,
      issuingInstitution: currentUser.institution,
      documentRef: newCertDoc
    });
    setIsSubmitCredOpen(false);
    showToast('Credential evidence submitted to Compliance Admin. Track verification in Compliance tab.');
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div className="p-3 bg-slate-900 text-white text-xs rounded-xl flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span>{toastMessage}</span>
          </div>
          <button 
            onClick={() => setToastMessage(null)} 
            className="text-slate-400 hover:text-white ml-3"
            aria-label="Close notification"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {/* User Status Bar */}
      <div className="bg-white rounded-xl p-6 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Researcher Dossier</span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-slate-900">{currentUser.name}</span>
            <span aria-hidden="true">·</span>
            <span>{currentUser.department}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Active Reservations & Equipment Returns
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Track reservation approvals, complete pre-use safety checklists, log meter runtimes, and inspect return condition histories with full step-by-step transaction audits.
          </p>
        </div>

        {/* Real User Quota, Escrow & Fairness Stats */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="px-3.5 py-2 bg-slate-50 rounded-lg border border-slate-200 text-xs">
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Weekly Quota</span>
            <span className="text-sm font-bold text-slate-900 font-mono tabular-nums">
              {quota.used} / {quota.total}h ({quota.remaining}h free)
            </span>
          </div>

          <div className="px-3.5 py-2 bg-slate-50 rounded-lg border border-slate-200 text-xs">
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Deposit Ledger</span>
            <span className="text-sm font-bold text-emerald-700 font-mono tabular-nums">
              ${depositLedger.balance} available
              {depositLedger.held > 0 && <span className="text-slate-500 font-normal"> (${depositLedger.held} held)</span>}
            </span>
          </div>

          <div className="px-3.5 py-2 bg-slate-50 rounded-lg border border-slate-200 text-xs">
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Fair Score</span>
            <span className="text-sm font-bold text-sky-700 font-mono tabular-nums">
              {quota.score} / 100
            </span>
          </div>
        </div>
      </div>

      {/* Safety Qualifications & Accreditations Drawer */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-sky-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              My Verified Safety Qualifications & Badges ({currentUser.qualifications.length})
            </h3>
          </div>
          <button
            onClick={() => setIsSubmitCredOpen(true)}
            className="text-xs font-semibold text-sky-700 hover:text-sky-900 flex items-center gap-1"
          >
            <span>+ Submit Credential for Verification</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
          {currentUser.qualifications.map(q => {
            const isExpired = new Date(q.expiryDate).getTime() < Date.now();
            return (
              <div key={q.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className={`font-semibold text-[11px] ${q.verified && !isExpired ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {q.verified && !isExpired ? '✓ Verified' : isExpired ? '⚠ Expired' : 'Pending Verification'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Exp: {q.expiryDate}</span>
                </div>
                <div className="font-bold text-slate-900 truncate" title={q.name}>
                  {q.name}
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {q.level} · {q.issuingInstitution}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bookings List */}
      {myBookings.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 space-y-3">
          <p className="text-slate-600 text-sm">You have no active or previous reservations logged under this persona.</p>
          <button
            onClick={() => setActiveTab('catalog')}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
          >
            Explore Resource Catalog
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {myBookings.map((b) => {
            const badge = getStatusBadge(b.status);
            const isExpanded = expandedBookingId === b.id;
            const canCancel = b.status === 'pending_review' || b.status === 'approved' || b.status === 'waitlisted';
            const canCheckOutMidIncident = b.status === 'incident_flagged' && !b.checkOutTime;

            return (
              <div 
                key={b.id} 
                className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden transition-all"
              >
                <div className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  
                  {/* Left: Resource & Schedule */}
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${badge.color}`}>
                        {badge.label}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-500 font-mono tabular-nums">
                        {new Date(b.startTime).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="font-mono tabular-nums text-slate-700 font-medium">
                        {b.totalHours} hrs scheduled
                      </span>
                      {b.fairnessScore && (
                        <>
                          <span className="text-slate-400">·</span>
                          <span className="font-mono text-sky-800 text-[11px]">
                            Fair Score: {b.fairnessScore}
                          </span>
                        </>
                      )}
                      {b.assignedSupervisor && (
                        <>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-700 font-medium text-[11px]">
                            Supervisor: {b.assignedSupervisor}
                          </span>
                        </>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900">
                      {b.resourceName}
                    </h3>
                    
                    <p className="text-xs text-slate-500">
                      {b.facilityName}
                    </p>

                    <p className="text-xs text-slate-600 line-clamp-1 italic">
                      "{b.purposeDescription}"
                    </p>

                    {/* Return submitted notice */}
                    {b.status === 'return_pending_inspection' && (
                      <div className="p-2.5 bg-purple-50 rounded border border-purple-200 text-xs text-purple-900">
                        <strong>Return Pending Custodian Audit:</strong> You completed check-out. The facility owner is reviewing condition reports and will confirm release of your <strong>${b.depositHeld}</strong> escrow hold.
                      </div>
                    )}

                    {/* Decline Reason Callout */}
                    {b.rejectionReason && (
                      <div className="p-2.5 bg-rose-50 rounded border border-rose-200 text-xs text-rose-900">
                        <strong>Reason for Decline / Cancellation:</strong> {b.rejectionReason}
                      </div>
                    )}

                    {b.status === 'waitlisted' && b.fairnessBreakdown && (
                      <div className="p-2.5 bg-purple-50 rounded border border-purple-200 text-[11px] text-purple-900">
                        <strong>Explainable Priority Allocation:</strong> {b.fairnessBreakdown.justificationSummary}. Evaluated score ({b.fairnessScore}) determines queue rank.
                      </div>
                    )}
                  </div>

                  {/* Right: Contextual Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    
                    {/* Approved -> Ready to Check In */}
                    {b.status === 'approved' && (
                      <button
                        onClick={() => setActiveCheckInBooking(b)}
                        className="px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <ShieldCheck className="w-4 h-4 text-sky-400" />
                        <span>Perform Check-In</span>
                      </button>
                    )}

                    {/* Checked In -> Extend, Incident, or Return */}
                    {b.status === 'checked_in' && (
                      <>
                        <button
                          onClick={() => {
                            const res = extendBooking(b.id, 1);
                            if (!res.success) alert(res.message);
                          }}
                          title="Extend session by 1 hour if quota and schedule permit"
                          className="px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-1"
                        >
                          <ClockPlus className="w-3.5 h-3.5 text-slate-500" />
                          <span>+1h Extend</span>
                        </button>
                        <button
                          onClick={() => setActiveIncidentBooking(b)}
                          className="px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg"
                        >
                          Report Incident
                        </button>
                        <button
                          onClick={() => setActiveReturnBooking(b)}
                          className="px-4 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <RotateCcw className="w-4 h-4 text-white" />
                          <span>Initiate Return</span>
                        </button>
                      </>
                    )}

                    {/* Mid-Session Incident Check-out fix */}
                    {canCheckOutMidIncident && (
                      <button
                        onClick={() => setActiveReturnBooking(b)}
                        className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm flex items-center gap-1"
                      >
                        <RotateCcw className="w-4 h-4 text-emerald-400" />
                        <span>Check-Out Session</span>
                      </button>
                    )}

                    {/* Contest Incident Penalty Button */}
                    {b.incidentReport && b.incidentReport.status === 'resolved' && (b.depositSettlement?.deductedAmount || 0) > 0 && (
                      <button
                        onClick={() => setContestingIncidentId(b.incidentReport!.id)}
                        className="px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-50 border border-purple-200 rounded-lg flex items-center gap-1"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Contest Penalty</span>
                      </button>
                    )}

                    {/* Cancel upcoming booking */}
                    {canCancel && (
                      <button
                        onClick={() => setCancellingBooking(b)}
                        className="px-2.5 py-2 text-xs font-medium text-slate-500 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 rounded-lg transition-colors flex items-center gap-1"
                        title="Cancel reservation & release quota"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Cancel</span>
                      </button>
                    )}

                    {/* Transaction History Timeline (Step 10 Rubric) */}
                    <button
                      onClick={() => setTimelineBooking(b)}
                      title="View complete chronological transaction history"
                      className="px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-1.5"
                    >
                      <History className="w-3.5 h-3.5 text-slate-500" />
                      <span>History</span>
                    </button>

                    {/* Expand/Collapse Condition Dossier */}
                    {(b.preConditionReport || b.postConditionReport) && (
                      <button
                        onClick={() => setExpandedBookingId(isExpanded ? null : b.id)}
                        className="px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200"
                      >
                        {isExpanded ? 'Hide Report' : 'Inspect Report'}
                      </button>
                    )}
                  </div>

                </div>

                {/* Expanded Condition Report Drawer */}
                {isExpanded && (
                  <div className="bg-slate-50 border-t border-slate-200 p-5 space-y-4 text-xs">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                        Auditable Condition & Checklist Documentation
                      </h4>
                      <div className="text-slate-500 text-[11px]">
                        Deposit Status: {renderDepositStatus(b)}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Pre-Check-in Report */}
                      {b.preConditionReport && (
                        <div className="bg-white rounded-lg p-4 border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between text-slate-500 pb-1 border-b border-slate-100">
                            <span className="font-semibold text-slate-900">Pre-Use Baseline Inspection</span>
                            <span className="font-mono text-[10px]">
                              {new Date(b.preConditionReport.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div>
                            Rating:{' '}
                            <span className={`inline-block px-2 py-0.5 rounded font-semibold text-xs border ${
                              b.preConditionReport.statusRating === 'pristine'
                                ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                                : (b.preConditionReport.statusRating === 'nominal_wear' || b.preConditionReport.statusRating === 'minor_issue')
                                ? 'text-amber-800 bg-amber-50 border-amber-200'
                                : 'text-rose-800 bg-rose-50 border-rose-200'
                            }`}>
                              {b.preConditionReport.statusRating.replace('_', ' ')}
                            </span>
                            {' '}· Baseline Meter: <span className="font-mono font-medium">{b.preConditionReport.hoursRuntimeLogged}h</span>
                          </div>

                          {b.preConditionReport.photoUrl && (
                            <div className="pt-1">
                              <span className="font-semibold text-slate-700 text-[11px] block mb-1">Pre-Check Baseline Photo:</span>
                              <img 
                                src={b.preConditionReport.photoUrl} 
                                alt="Pre-check baseline" 
                                className="w-full max-h-36 object-cover rounded-md border border-slate-200"
                              />
                            </div>
                          )}

                          <ul className="space-y-1.5 text-slate-600 pt-1">
                            {b.preConditionReport.checklistItems.map((c, i) => (
                              <li key={i} className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  {c.passed ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  ) : (
                                    <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                  )}
                                  <span className={c.passed ? 'text-slate-700' : 'text-rose-700 font-medium'}>
                                    {c.label} {c.passed ? '' : '(Failed Pre-Check)'}
                                  </span>
                                </div>
                                {c.defectNote && (
                                  <div className="text-[10px] text-rose-600 italic ml-5">
                                    Defect: {c.defectNote}
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                          <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                            Signed by: <span className="font-mono text-slate-800">{b.preConditionReport.signature}</span>
                          </div>
                        </div>
                      )}

                      {/* Post-Return Report */}
                      {b.postConditionReport && (
                        <div className="bg-white rounded-lg p-4 border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between text-slate-500 pb-1 border-b border-slate-100">
                            <span className="font-semibold text-slate-900">Post-Use Return Inspection</span>
                            <span className="font-mono text-[10px]">
                              {new Date(b.postConditionReport.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div>
                            Return Status:{' '}
                            <span className={`inline-block px-2 py-0.5 rounded font-semibold text-xs border ${
                              b.postConditionReport.statusRating === 'pristine'
                                ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                                : (b.postConditionReport.statusRating === 'nominal_wear' || b.postConditionReport.statusRating === 'minor_issue')
                                ? 'text-amber-800 bg-amber-50 border-amber-200'
                                : 'text-rose-800 bg-rose-50 border-rose-200'
                            }`}>
                              {b.postConditionReport.statusRating.replace('_', ' ')}
                            </span>
                            {' '}· Final Meter: <span className="font-mono font-medium">{b.postConditionReport.hoursRuntimeLogged}h</span>
                          </div>

                          {b.postConditionReport.photoUrl && (
                            <div className="pt-1">
                              <span className="font-semibold text-slate-700 text-[11px] block mb-1">Post-Return Photographic Record:</span>
                              <img 
                                src={b.postConditionReport.photoUrl} 
                                alt="Post-return condition" 
                                className="w-full max-h-36 object-cover rounded-md border border-slate-200"
                              />
                            </div>
                          )}

                          <ul className="space-y-1.5 text-slate-600 pt-1">
                            {b.postConditionReport.checklistItems.map((c, i) => (
                              <li key={i} className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  {c.passed ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  ) : (
                                    <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                  )}
                                  <span className={c.passed ? 'text-slate-700' : 'text-rose-700 font-medium'}>
                                    {c.label} {c.passed ? '' : '(Inspection Failed)'}
                                  </span>
                                </div>
                                {c.defectNote && (
                                  <div className="text-[10px] text-rose-600 italic ml-5">
                                    Defect: {c.defectNote}
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                          <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex items-center justify-between">
                            <span>Inspector: <strong className="font-mono text-slate-800">{b.postConditionReport.signature}</strong></span>
                            <span>{renderDepositStatus(b)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* Contest Penalty Dialog */}
      {contestingIncidentId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <h3 className="text-base font-bold text-slate-900">
              Contest Assessed Penalty
            </h3>
            <p className="text-slate-600">
              State the technical reasons or baseline inspection references why this deposit deduction should be audited by the Consortium Compliance Officer.
            </p>
            <form onSubmit={handleConfirmContest} className="space-y-3">
              <textarea
                value={contestReason}
                onChange={e => setContestReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                required
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setContestingIncidentId(null)}
                  className="px-3.5 py-2 font-medium text-slate-700 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-purple-700 hover:bg-purple-800 rounded-lg shadow-sm"
                >
                  Escalate to Compliance Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submit Credential Modal */}
      {isSubmitCredOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-base font-bold text-slate-900">
                Submit Credential for Verification
              </h3>
              <button onClick={() => setIsSubmitCredOpen(false)} className="text-slate-400 hover:text-slate-700">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitNewCert} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-900 mb-1">Qualification Name</label>
                <input
                  type="text"
                  value={newCertName}
                  onChange={e => setNewCertName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-900 mb-1">Qualification ID</label>
                  <input
                    type="text"
                    value={newCertId}
                    onChange={e => setNewCertId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-900 mb-1">Accreditation Level</label>
                  <input
                    type="text"
                    value={newCertLevel}
                    onChange={e => setNewCertLevel(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-900 mb-1">Document Evidence Reference</label>
                <input
                  type="text"
                  value={newCertDoc}
                  onChange={e => setNewCertDoc(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono"
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSubmitCredOpen(false)}
                  className="px-3 py-2 font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800"
                >
                  Submit for Compliance Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Active Modals */}
      {activeCheckInBooking && (
        <CheckInModal
          booking={activeCheckInBooking}
          onClose={() => setActiveCheckInBooking(null)}
        />
      )}

      {activeReturnBooking && (
        <ReturnModal
          booking={activeReturnBooking}
          onClose={() => setActiveReturnBooking(null)}
        />
      )}

      {activeIncidentBooking && (
        <IncidentReportModal
          booking={activeIncidentBooking}
          onClose={() => setActiveIncidentBooking(null)}
        />
      )}

      {timelineBooking && (
        <BookingTimelineModal
          booking={timelineBooking}
          onClose={() => setTimelineBooking(null)}
        />
      )}

      {/* Cancel Reservation Confirmation Modal */}
      {cancellingBooking && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
              <Ban className="w-5 h-5 text-rose-600" />
              <span>Cancel Reservation</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Are you sure you want to cancel your upcoming booking for <strong>{cancellingBooking.resourceName}</strong>? Your weekly quota hours and escrow deposit will be restored immediately.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCancellingBooking(null)}
                className="px-3.5 py-2 font-medium text-slate-600 hover:text-slate-900"
              >
                Keep Reservation
              </button>
              <button
                type="button"
                onClick={() => {
                  const res = cancelBooking(cancellingBooking.id, 'User cancelled prior to session start.');
                  if (res.success) {
                    showToast('Reservation cancelled. Quota and escrow restored.');
                  } else {
                    showToast(res.message);
                  }
                  setCancellingBooking(null);
                }}
                className="px-4 py-2 font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
