/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Booking, ResourceListing, IncidentReport, ConditionReport } from '../types';
import { 
  Check, 
  X, 
  Clock, 
  ShieldCheck, 
  AlertTriangle, 
  Building2, 
  FileText, 
  UserCheck, 
  CheckCircle2, 
  XCircle,
  Scale, 
  Sparkles, 
  ArrowRight, 
  ShieldAlert, 
  Wrench,
  History,
  UserCheck2,
  Shield,
  RotateCcw,
  CheckCircle,
  Camera,
  Coins
} from 'lucide-react';
import { ReturnModal } from './ReturnModal';
import { IncidentReportModal } from './IncidentReportModal';
import { BookingTimelineModal } from './BookingTimelineModal';

export const OwnerManagementView: React.FC = () => {
  const { 
    currentUser, 
    allUsers, 
    setCurrentUser,
    bookings, 
    resources, 
    userQuotas, 
    approveBooking, 
    rejectBooking, 
    confirmReturnInspection,
    resolveIncident, 
    setIsCreateListingOpen 
  } = useApp();

  const [rejectingBookingId, setRejectingBookingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('Scheduled preventative calibration during this window.');
  const [activeReturnBooking, setActiveReturnBooking] = useState<Booking | null>(null);
  const [activeIncidentBooking, setActiveIncidentBooking] = useState<Booking | null>(null);
  const [timelineBooking, setTimelineBooking] = useState<Booking | null>(null);

  // Supervisor assignment per booking
  const [supervisorSelections, setSupervisorSelections] = useState<Record<string, string>>({});

  // Filter scope: Show only this custodian's resources by default
  const [showAllFacilities, setShowAllFacilities] = useState(currentUser.role === 'institution_admin');

  // Custodian Return Inspection Modal / Action state
  const [inspectingReturnBooking, setInspectingReturnBooking] = useState<Booking | null>(null);
  const [custodianReturnNotes, setCustodianReturnNotes] = useState('Physical inspection complete. Stage, optics, and vacuum nominal.');

  // Custodian Incident Review Modal State
  const [resolvingIncident, setResolvingIncident] = useState<IncidentReport | null>(null);
  const [custodianResolutionNotes, setCustodianResolutionNotes] = useState('Technician inspected stage. Surface polished and re-calibrated. Partial repair fee assessed.');
  const [finalDeductionAmount, setFinalDeductionAmount] = useState<number>(50);
  const [restoreResourceToService, setRestoreResourceToService] = useState<boolean>(true);

  const isAuthorizedCustodian = currentUser.role === 'lab_manager' || currentUser.role === 'institution_admin';

  // Scope bookings to resources owned by this custodian (or all if admin/toggle)
  const myResources = resources.filter(r => showAllFacilities || r.ownerId === currentUser.id);
  const myResourceIds = new Set(myResources.map(r => r.id));

  const scopedBookings = bookings.filter(b => myResourceIds.has(b.resourceId));

  // Sort pending bookings by fairness priority score descending (highest score first)
  const pendingBookings = scopedBookings
    .filter(b => b.status === 'pending_review')
    .sort((a, b) => (b.fairnessScore || 50) - (a.fairnessScore || 50));

  const pendingReturns = scopedBookings.filter(b => b.status === 'return_pending_inspection');
  const activeSessions = scopedBookings.filter(b => b.status === 'checked_in');
  const waitlistedRequests = scopedBookings
    .filter(b => b.status === 'waitlisted')
    .sort((a, b) => (b.fairnessScore || 50) - (a.fairnessScore || 50));
  const incidentRequests = scopedBookings.filter(b => b.status === 'incident_flagged');

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [custodianRating, setCustodianRating] = useState<ConditionReport['statusRating']>('pristine');
  const [overridePromptBooking, setOverridePromptBooking] = useState<Booking | null>(null);
  const [overrideCompetitor, setOverrideCompetitor] = useState<Booking | null>(null);
  const [overrideJustification, setOverrideJustification] = useState('Urgent undergraduate capstone thesis deadline before scheduled grant project.');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleConfirmReject = (bookingId: string) => {
    const res = rejectBooking(bookingId, rejectReason);
    if (!res.success) {
      showToast(res.message);
    } else {
      showToast('Reservation declined and deposit released.');
    }
    setRejectingBookingId(null);
  };

  const handleOpenResolveModal = (incident: IncidentReport) => {
    setResolvingIncident(incident);
    setFinalDeductionAmount(incident.depositDeductionAmount);
  };

  const handleConfirmResolve = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingIncident) return;

    const res = resolveIncident({
      incidentId: resolvingIncident.id,
      resolutionNotes: custodianResolutionNotes,
      finalDepositDeduction: finalDeductionAmount,
      restoreToService: restoreResourceToService
    });

    if (!res.success) {
      showToast(res.message);
    } else {
      showToast('Incident settled and escrow balance updated.');
    }
    setResolvingIncident(null);
  };

  const executeApprove = (booking: Booking, overrideReason?: string) => {
    const supervisor = supervisorSelections[booking.id] || (booking.supervisionRequested ? `${currentUser.name} (Designated Supervisor)` : undefined);
    const result = approveBooking(booking.id, supervisor);
    if (!result.success) {
      showToast(result.message);
    } else {
      showToast(`Reservation #${booking.id.slice(-6)} approved. Ready for check-in.`);
    }
    setOverridePromptBooking(null);
    setOverrideCompetitor(null);
  };

  const handleApprove = (booking: Booking) => {
    // Check if there is a competitor on the waitlist for the same resource with a higher score
    const higherCompetitor = scopedBookings.find(b => 
      b.resourceId === booking.resourceId &&
      b.status === 'waitlisted' &&
      (b.fairnessScore || 50) > (booking.fairnessScore || 50)
    );

    if (higherCompetitor) {
      setOverridePromptBooking(booking);
      setOverrideCompetitor(higherCompetitor);
      return;
    }

    executeApprove(booking);
  };

  const handleConfirmCustodianInspection = (booking: Booking) => {
    if (!custodianReturnNotes || !custodianReturnNotes.trim()) {
      showToast('Inspection Notes Required: Custodian must provide verification notes.');
      return;
    }

    if (custodianRating === 'damaged') {
      const res = confirmReturnInspection({
        bookingId: booking.id,
        finalRating: 'damaged',
        inspectorNotes: custodianReturnNotes,
        approvedBy: currentUser.name
      });
      if (!res.success) {
        showToast(res.message);
      } else {
        showToast('Damage flagged. Incident report initiated for penalty review.');
      }
      setInspectingReturnBooking(null);
      return;
    }

    const res = confirmReturnInspection({
      bookingId: booking.id,
      finalRating: custodianRating,
      inspectorNotes: custodianReturnNotes,
      approvedBy: currentUser.name
    });

    if (!res.success) {
      showToast(res.message);
    } else {
      showToast(`Return certified. $${booking.depositHeld} released to borrower.`);
    }
    setInspectingReturnBooking(null);
  };


  return (
    <div className="space-y-8">
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
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {/* Top Banner & Overview */}
      <div className="bg-white rounded-xl p-6 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Facility Oversight</span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-slate-900">{currentUser.name}</span>
            <span aria-hidden="true">·</span>
            <span>{currentUser.institution}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Custodian & Facility Manager Portal
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Review incoming reservation requests ranked by fair priority scores, assign staff supervisors, verify equipment return condition reports, and settle deposit escrow balances.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="px-3.5 py-2 bg-slate-50 rounded-lg border border-slate-200 text-xs">
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Pending Requests</span>
            <span className="text-sm font-bold text-slate-900 font-mono tabular-nums">
              {pendingBookings.length}
            </span>
          </div>

          <div className="px-3.5 py-2 bg-slate-50 rounded-lg border border-slate-200 text-xs">
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Pending Returns</span>
            <span className="text-sm font-bold text-sky-700 font-mono tabular-nums">
              {pendingReturns.length}
            </span>
          </div>

          <div className="px-3.5 py-2 bg-slate-50 rounded-lg border border-slate-200 text-xs">
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">In Session</span>
            <span className="text-sm font-bold text-emerald-700 font-mono tabular-nums">
              {activeSessions.length}
            </span>
          </div>

          {isAuthorizedCustodian && (
            <button
              onClick={() => setIsCreateListingOpen(true)}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
            >
              + List Resource
            </button>
          )}
        </div>
      </div>

      {/* Role Check Warning if viewing as Researcher */}
      {!isAuthorizedCustodian && (
        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="block font-bold">
              Facility Management Privileges Required
            </strong>
            <p className="text-amber-800 leading-relaxed">
              You are currently viewing as <strong>{currentUser.name}</strong> ({currentUser.role}). Facility approval, return certification, and incident resolution decisions must be performed by Facility Custodians or Consortium Administrators.
            </p>
            <div className="pt-1 flex items-center gap-2">
              <button
                onClick={() => {
                  const marcus = allUsers.find(u => u.id === 'user_marcus_vance');
                  if (marcus) setCurrentUser(marcus);
                }}
                className="px-2.5 py-1 bg-amber-900 text-white rounded font-medium text-[11px]"
              >
                Switch to Dr. Marcus Vance (Owner)
              </button>
              <button
                onClick={() => {
                  const arthur = allUsers.find(u => u.id === 'user_arthur_pendelton');
                  if (arthur) setCurrentUser(arthur);
                }}
                className="px-2.5 py-1 bg-amber-900 text-white rounded font-medium text-[11px]"
              >
                Switch to Prof. Arthur Pendelton (Owner)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Facility Scope Toggle for Custodians */}
      {isAuthorizedCustodian && (
        <div className="flex items-center justify-between text-xs bg-slate-100 p-2.5 rounded-lg border border-slate-200">
          <span className="text-slate-600">
            Showing facilities owned by: <strong className="text-slate-900">{showAllFacilities ? 'All Consortium Facilities' : currentUser.name}</strong>
          </span>
          <button
            onClick={() => setShowAllFacilities(!showAllFacilities)}
            className="text-xs font-semibold text-sky-700 hover:text-sky-900 underline"
          >
            {showAllFacilities ? 'Filter to My Owned Resources Only' : 'View All Consortium Resources'}
          </button>
        </div>
      )}

      {/* 1. STEP 2 OF TWO-STEP RETURN: Returns Awaiting Custodian Inspection & Deposit Settlement */}
      {pendingReturns.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-sky-900">
              <RotateCcw className="w-4 h-4 text-sky-600" />
              <span>Returns Awaiting Custodian Inspection & Deposit Settlement ({pendingReturns.length})</span>
            </div>
            <span className="text-xs text-slate-500">Step 2: Owners inspect borrower's report before releasing deposit</span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {pendingReturns.map(b => (
              <div key={b.id} className="bg-sky-50/70 rounded-xl p-5 border border-sky-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                <div className="space-y-2 max-w-2xl">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2.5 py-0.5 rounded-full font-bold bg-sky-100 text-sky-800 border border-sky-200">
                      Borrower Checked Out
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="font-bold text-slate-900">{b.resourceName}</span>
                    <span className="text-slate-400">·</span>
                    <span>Borrower: <strong className="text-slate-900">{b.userName}</strong> ({b.userInstitution})</span>
                  </div>

                  {b.postConditionReport && (
                    <div className="p-3 bg-white rounded-lg border border-sky-100 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span>
                          Self-Reported Rating: <strong className="capitalize text-slate-900">{b.postConditionReport.statusRating}</strong>
                        </span>
                        <span className="font-mono text-slate-500">
                          Final Meter: {b.postConditionReport.hoursRuntimeLogged}h
                        </span>
                      </div>
                      <p className="text-slate-700 italic">
                        "{b.postConditionReport.notes}"
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-[11px]">
                        {b.postConditionReport.checklistItems.map((c, i) => (
                          <span key={i} className={`flex items-center gap-1 ${c.passed ? 'text-emerald-700' : 'text-rose-700 font-bold'}`}>
                            {c.passed ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            <span>{c.label.slice(0, 30)}...</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-slate-600">
                    Deposit in Escrow: <strong className="font-mono text-slate-900">${b.depositHeld}</strong>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={() => setTimelineBooking(b)}
                    className="px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 bg-white border border-slate-200 rounded-lg flex items-center gap-1"
                  >
                    <History className="w-3.5 h-3.5 text-slate-500" />
                    <span>Audit Trail</span>
                  </button>

                  {isAuthorizedCustodian && b.userId !== currentUser.id && (
                    <button
                      onClick={() => {
                        setInspectingReturnBooking(b);
                        setCustodianRating(b.postConditionReport?.statusRating || 'pristine');
                        setCustodianReturnNotes('Physical inspection complete. Stage, optics, and vacuum nominal.');
                      }}
                      className="px-4 py-2.5 text-xs font-semibold bg-sky-700 hover:bg-sky-800 text-white rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4 text-sky-200" />
                      <span>Inspect & Settle Return (${b.depositHeld})</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Incidents Requiring Human Attention & Review */}
      {incidentRequests.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-rose-900">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>Incidents & Damage Reports Requiring Custodian Resolution ({incidentRequests.length})</span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {incidentRequests.map(b => (
              <div key={b.id} className="bg-rose-50/70 rounded-xl p-5 border border-rose-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center gap-2 text-xs text-rose-800 font-medium">
                    <span className="uppercase tracking-wider font-bold">Severity: {b.incidentReport?.severity}</span>
                    <span>·</span>
                    <span className="font-semibold text-slate-900">{b.resourceName}</span>
                    <span>·</span>
                    <span>Reported by {b.incidentReport?.reportedBy} ({b.incidentReport?.reporterRole})</span>
                    {b.incidentReport?.status === 'escalated' && (
                      <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-200 font-bold text-[10px]">
                        Contested by Borrower · Admin Review Pending
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Category: {b.incidentReport?.category.replace('_', ' ')}
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed bg-white/70 p-2.5 rounded border border-rose-100">
                    "{b.incidentReport?.description}"
                  </p>
                  {b.incidentReport?.contestedReason && (
                    <div className="p-2 bg-purple-50 rounded border border-purple-200 text-xs text-purple-900">
                      <strong>Borrower Contest Reason:</strong> "{b.incidentReport.contestedReason}"
                    </div>
                  )}
                  <div className="text-xs text-slate-600 pt-1">
                    Initial Deposit Hold: <strong className="font-mono text-slate-900">${b.incidentReport?.depositDeductionAmount}</strong> (out of ${b.depositHeld} held)
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setTimelineBooking(b)}
                    className="px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 bg-white border border-slate-200 rounded-lg flex items-center gap-1"
                  >
                    <History className="w-3.5 h-3.5 text-slate-500" />
                    <span>Audit Trail</span>
                  </button>
                  {isAuthorizedCustodian && b.userId !== currentUser.id && (
                    <button
                      onClick={() => b.incidentReport && handleOpenResolveModal(b.incidentReport)}
                      className="px-4 py-2 text-xs font-semibold bg-rose-900 text-white hover:bg-rose-800 rounded-lg flex items-center gap-1.5 shadow-sm"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Review & Settle Penalty</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Pending Approvals Queue (Ranked by Fair Priority Score) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              Pending Access Requests ({pendingBookings.length})
            </h3>
            <span className="text-xs text-slate-500">· Evaluated and ranked by algorithmic priority score</span>
          </div>
        </div>

        {pendingBookings.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
            No pending access requests. All incoming reservations have been processed.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {pendingBookings.map((booking, rankIndex) => {
              const res = resources.find(r => r.id === booking.resourceId);
              const requester = allUsers.find(u => u.id === booking.userId);
              const userQuota = userQuotas[booking.userId] || { used: 0, total: 20, noShowCount: 0 };
              
              const hasSafetyCert = requester?.qualifications.some(
                q => q.id === res?.requirements.qualificationId && q.verified && new Date(q.expiryDate).getTime() > Date.now()
              ) || false;

              const isQuotaCompliant = userQuota.used <= userQuota.total;
              const isSelfRequest = booking.userId === currentUser.id;

              return (
                <div 
                  key={booking.id} 
                  className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
                >
                  {/* Left: Requester Info & Project */}
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="px-2 py-0.5 rounded font-mono font-bold bg-sky-100 text-sky-900 text-[10px]">
                        Priority Rank #{rankIndex + 1}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-slate-900">{booking.resourceName}</span>
                      <span aria-hidden="true">·</span>
                      <span>{booking.facilityName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums text-slate-700">{booking.totalHours} hrs</span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {booking.userName.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 leading-tight">
                          {booking.userName}
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          {booking.userInstitution} · {booking.userEmail}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <strong className="text-slate-900">Research Purpose:</strong> "{booking.purposeDescription}"
                      {booking.projectGrantCode && (
                        <span className="block mt-1 text-[11px] text-slate-600 font-mono">
                          Grant/Course Account: {booking.projectGrantCode}
                        </span>
                      )}
                    </p>

                    {/* Eligibility & Fair Priority Indicators */}
                    <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
                      {hasSafetyCert ? (
                        <div className="flex items-center gap-1 text-emerald-700 font-medium">
                          <Check className="w-3.5 h-3.5" />
                          <span>Certification Verified ({res?.requirements.qualificationName})</span>
                        </div>
                      ) : booking.supervisionRequested ? (
                        <div className="flex items-center gap-1 text-sky-700 font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Staff Supervision Requested (+${res?.requirements.supervisionFee || 25})</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-amber-700 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Missing Certification · Supervision Required</span>
                        </div>
                      )}

                      <span className="text-slate-300">·</span>

                      <div className="flex items-center gap-1 font-medium text-slate-700">
                        <Scale className="w-3.5 h-3.5 text-sky-600" />
                        <span>Quota: {userQuota.used}/{userQuota.total}h</span>
                      </div>

                      <span className="text-slate-300">·</span>

                      <div className="flex items-center gap-1 font-bold text-sky-800">
                        <span>Fair Score: {booking.fairnessScore || 75}/100</span>
                      </div>
                    </div>

                    {/* Supervisor Assignment Dropdown */}
                    {booking.supervisionRequested && (
                      <div className="pt-2 flex items-center gap-2 text-xs">
                        <span className="text-slate-600 font-medium flex items-center gap-1">
                          <UserCheck2 className="w-3.5 h-3.5 text-sky-600" />
                          <span>Assign Staff Supervisor:</span>
                        </span>
                        <select
                          value={supervisorSelections[booking.id] || `${currentUser.name} (Designated Supervisor)`}
                          onChange={e => setSupervisorSelections(prev => ({ ...prev, [booking.id]: e.target.value }))}
                          className="px-2 py-1 text-xs border border-slate-300 rounded bg-white text-slate-800"
                        >
                          <option value={`${currentUser.name} (Designated Supervisor)`}>{currentUser.name} (Designated Supervisor)</option>
                          <option value="Sarah Jenkins (Senior Technician)">Sarah Jenkins (Senior Technician)</option>
                          <option value="Alex Rivera (Safety Officer)">Alex Rivera (Safety Officer)</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                    <button
                      onClick={() => setTimelineBooking(booking)}
                      title="View complete transaction timeline"
                      className="px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center gap-1"
                    >
                      <History className="w-3.5 h-3.5 text-slate-500" />
                      <span>History</span>
                    </button>

                    {isAuthorizedCustodian && !isSelfRequest ? (
                      <>
                        <button
                          onClick={() => handleApprove(booking)}
                          className="px-4 py-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Check className="w-4 h-4" />
                          <span>Approve Access</span>
                        </button>

                        <button
                          onClick={() => setRejectingBookingId(booking.id)}
                          className="px-3.5 py-2.5 text-xs font-medium text-slate-700 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                        >
                          <X className="w-4 h-4" />
                          <span>Decline</span>
                        </button>
                      </>
                    ) : (
                      <span className="px-3 py-2 text-[11px] text-slate-400 bg-slate-50 rounded-lg border border-slate-200 text-center">
                        {isSelfRequest ? 'Self-approval blocked' : 'Custodian role required'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Active In-Session Resources */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <span>Active In-Session Resources ({activeSessions.length})</span>
          <span className="text-xs text-slate-500 font-normal">· Currently checked in</span>
        </h3>

        {activeSessions.length === 0 ? (
          <div className="p-6 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
            No equipment currently checked in.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeSessions.map((b) => (
              <div key={b.id} className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                    <span className="font-semibold text-emerald-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      In Session Now
                    </span>
                    <span className="font-mono text-slate-400">ID #{b.id.slice(-6)}</span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900">{b.resourceName}</h4>
                  <p className="text-xs text-slate-500">{b.facilityName}</p>

                  <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs space-y-1">
                    <div className="text-slate-700">
                      Operator: <strong className="text-slate-900">{b.userName}</strong> ({b.userInstitution})
                    </div>
                    <div className="text-slate-500">
                      Check-in Logged: {b.checkInTime ? new Date(b.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}
                    </div>
                    {b.preConditionReport && (
                      <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-200/60">
                        Baseline Condition: <strong className="text-emerald-800 capitalize">{b.preConditionReport.statusRating}</strong> · Baseline meter: {b.preConditionReport.hoursRuntimeLogged}h
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setTimelineBooking(b)}
                    className="text-xs font-medium text-slate-600 hover:text-slate-900 px-2 py-1 flex items-center gap-1"
                  >
                    <History className="w-3 h-3 text-slate-400" />
                    <span>History</span>
                  </button>
                  {isAuthorizedCustodian && b.userId !== currentUser.id && (
                    <button
                      onClick={() => setActiveIncidentBooking(b)}
                      className="text-xs font-medium text-rose-700 hover:text-rose-900 px-2 py-1"
                    >
                      Flag Mid-Session Incident
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Transparent Waiting Lists & Priority Sorting */}
      {waitlistedRequests.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>Transparent Waiting Lists & Algorithmic Priority Queue ({waitlistedRequests.length})</span>
          </h3>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100 text-xs">
            {waitlistedRequests.map((b) => (
              <div key={b.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      Rank #{b.waitlistPosition}
                    </span>
                    <span className="font-bold text-slate-900">{b.resourceName}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-600">{b.userName}</span>
                  </div>
                  <p className="text-slate-600 line-clamp-1">"{b.purposeDescription}"</p>
                  {b.fairnessBreakdown && (
                    <div className="text-[11px] text-slate-500 mt-1 font-mono">
                      Priority Score {b.fairnessScore}: {b.fairnessBreakdown.justificationSummary}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => setTimelineBooking(b)}
                    className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded flex items-center gap-1"
                  >
                    <History className="w-3 h-3 text-slate-400" />
                    <span>Timeline</span>
                  </button>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block">Explainable Queue</span>
                    <span className="text-xs text-sky-700 font-medium">Auto-promotes when slot frees</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rejection Modal with Explainable Reason */}
      {rejectingBookingId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <h3 className="text-base font-bold text-slate-900">
              Provide Reason for Declining Request
            </h3>
            <p className="text-slate-600">
              The platform mandates explainable decisions so researchers understand the operational or safety basis for any decline. The requester's weekly quota hours and escrow deposit will be immediately restored.
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
              placeholder="State the reason clearly..."
              required
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectingBookingId(null)}
                className="px-3.5 py-2 font-medium text-slate-700 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmReject(rejectingBookingId)}
                className="px-4 py-2 font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
              >
                Confirm Decline & Restore Quota
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custodian Human Incident Review & Settlement Modal */}
      {resolvingIncident && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Human Review & Incident Penalty Settlement
                </h3>
                <p className="text-xs text-slate-500">
                  Case #{resolvingIncident.id} · {resolvingIncident.resourceName}
                </p>
              </div>
              <button onClick={() => setResolvingIncident(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmResolve} className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="font-semibold text-slate-900">Incident Reported:</div>
                <div className="text-slate-700 italic">"{resolvingIncident.description}"</div>
                <div className="text-[11px] text-slate-500">
                  Initial proposed deduction: ${resolvingIncident.depositDeductionAmount}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-900 mb-1">
                  Custodian Review Decision & Repair Remarks
                </label>
                <textarea
                  value={custodianResolutionNotes}
                  onChange={e => setCustodianResolutionNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-900 mb-1">
                  Final Adjusted Deposit Deduction ($)
                </label>
                <input
                  type="number"
                  min="0"
                  max={resolvingIncident.depositDeductionAmount || 500}
                  value={finalDeductionAmount}
                  onChange={e => setFinalDeductionAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
                  required
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Capped at maximum held deposit (${resolvingIncident.depositDeductionAmount || 500}). Enter $0 to fully waive.
                </span>
              </div>

              <label className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={restoreResourceToService}
                  onChange={e => setRestoreResourceToService(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span className="text-slate-800 font-medium">
                  Restore resource status to "Available" for new bookings
                </span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResolvingIncident(null)}
                  className="px-4 py-2 font-medium text-slate-700 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm"
                >
                  Confirm Decision & Settle Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Active Modals */}
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

      {/* Custodian Inspection & Deposit Settlement Modal */}
      {inspectingReturnBooking && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Custodian Inspection & Deposit Settlement
                </h3>
                <p className="text-xs text-slate-500">
                  {inspectingReturnBooking.resourceName} · Borrower: {inspectingReturnBooking.userName}
                </p>
              </div>
              <button 
                onClick={() => setInspectingReturnBooking(null)} 
                className="text-slate-400 hover:text-slate-700"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Borrower's self-reported dossier */}
            {inspectingReturnBooking.postConditionReport && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">Borrower's Self-Reported Return Dossier</span>
                  <span className="font-mono text-slate-500">Runtime Meter: {inspectingReturnBooking.postConditionReport.hoursRuntimeLogged}h</span>
                </div>
                <div className="text-slate-700 italic bg-white p-2.5 rounded border border-slate-200">
                  "{inspectingReturnBooking.postConditionReport.notes}"
                </div>

                {inspectingReturnBooking.postConditionReport.photoUrl && (
                  <div className="pt-2">
                    <span className="font-semibold text-slate-800 block mb-1">Borrower Photo Evidence:</span>
                    <img 
                      src={inspectingReturnBooking.postConditionReport.photoUrl} 
                      alt="Post-return equipment photo" 
                      className="w-full max-h-48 object-cover rounded-lg border border-slate-200"
                    />
                  </div>
                )}

                <div className="space-y-1 pt-1">
                  <span className="font-semibold text-slate-800 block text-[11px]">Checklist Verification:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {inspectingReturnBooking.postConditionReport.checklistItems.map((c, i) => (
                      <div key={i} className={`p-1.5 rounded border text-[11px] flex items-start gap-1.5 ${c.passed ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                        {c.passed ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600 mt-0.5" /> : <XCircle className="w-3.5 h-3.5 shrink-0 text-rose-600 mt-0.5" />}
                        <div>
                          <span className="font-medium">{c.label}</span>
                          {c.defectNote && <span className="block text-[10px] text-rose-700 italic">Defect: {c.defectNote}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Custodian Verification Input */}
            <div className="space-y-3 pt-1">
              <div>
                <label className="block font-semibold text-slate-900 mb-1">
                  Custodian Certified Condition Rating
                </label>
                <select
                  value={custodianRating}
                  onChange={e => setCustodianRating(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                >
                  <option value="pristine">Pristine (No wear, 100% deposit release)</option>
                  <option value="nominal_wear">Nominal Wear (Clean return, 100% deposit release)</option>
                  <option value="minor_issue">Minor Issue (Logged for maintenance, 100% deposit release)</option>
                  <option value="damaged">Damaged (Hold escrow & initiate incident penalty review)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-900 mb-1">
                  Custodian Inspection Remarks & Log
                </label>
                <textarea
                  value={custodianReturnNotes}
                  onChange={e => setCustodianReturnNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                  placeholder="Record your physical inspection observations..."
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setInspectingReturnBooking(null)}
                className="px-3.5 py-2 font-medium text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              
              <button
                type="button"
                onClick={() => handleConfirmCustodianInspection(inspectingReturnBooking)}
                className={`px-4 py-2 font-semibold text-white rounded-lg shadow-sm flex items-center gap-1.5 ${
                  custodianRating === 'damaged' 
                    ? 'bg-rose-700 hover:bg-rose-800' 
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {custodianRating === 'damaged' ? (
                  <>
                    <ShieldAlert className="w-4 h-4 text-rose-200" />
                    <span>Flag Damage & Initiate Deduction</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-200" />
                    <span>Certify Clean & Release ${inspectingReturnBooking.depositHeld} Escrow</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Priority Conflict Override Prompt Modal */}
      {overridePromptBooking && overrideCompetitor && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center gap-3 text-amber-900 bg-amber-50 p-3 rounded-xl border border-amber-200">
              <Scale className="w-6 h-6 text-amber-700 shrink-0" />
              <div>
                <h3 className="font-bold text-sm text-amber-950">
                  Waitlist Priority Conflict Detected
                </h3>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Another researcher has a higher fair-allocation priority score for this resource.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Selected Request:</span>
                <span className="font-semibold text-slate-900">{overridePromptBooking.userName} (Score: {overridePromptBooking.fairnessScore || 50}/100)</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-sky-900 font-semibold">
                <span>Higher Priority Competitor:</span>
                <span className="font-mono bg-sky-100 px-2 py-0.5 rounded text-sky-800">
                  {overrideCompetitor.userName} (Score: {overrideCompetitor.fairnessScore || 75}/100)
                </span>
              </div>
              {overrideCompetitor.fairnessBreakdown && (
                <p className="text-[11px] text-slate-600 italic">
                  Competitor reason: "{overrideCompetitor.fairnessBreakdown.justificationSummary}"
                </p>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-900 mb-1">
                Institutional Justification for Override (Mandatory Audit Trail)
              </label>
              <textarea
                value={overrideJustification}
                onChange={e => setOverrideJustification(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                placeholder="Document why this booking is approved ahead of the higher-scoring waitlist applicant..."
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setOverridePromptBooking(null);
                  setOverrideCompetitor(null);
                }}
                className="px-3.5 py-2 font-medium text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeApprove(overridePromptBooking, overrideJustification)}
                className="px-4 py-2 font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg shadow-sm"
              >
                Confirm Institutional Override & Approve
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
