/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { QualificationVerificationRequest } from '../types';
import { 
  ShieldCheck, 
  FileCheck, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Building2, 
  AlertCircle,
  FileText,
  UserCheck,
  Shield,
  Award,
  ExternalLink,
  AlertTriangle,
  Scale
} from 'lucide-react';

export const AdminVerificationView: React.FC = () => {
  const { 
    currentUser, 
    verificationRequests, 
    approveVerificationRequest, 
    rejectVerificationRequest,
    bookings,
    resolveIncident,
    submitVerificationRequest
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'credentials' | 'contested_incidents'>('credentials');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
  const [rejectingReqId, setRejectingReqId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('Document reference does not match accredited state photonics registry.');
  const [approvalNotes, setApprovalNotes] = useState<string>('Certificate audited against state licensing database. Validated for 2 years.');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  // New credential submission state
  const [newQualificationId, setNewQualificationId] = useState('cert_laser_l2');
  const [newQualificationName, setNewQualificationName] = useState('Class 4 Laser Safety & Optical Alignment');
  const [newLevel, setNewLevel] = useState('Certified Operator');
  const [newIssuingInstitution, setNewIssuingInstitution] = useState('National Laser Safety Board');
  const [newDocRef, setNewDocRef] = useState('cert_scan_verification_2026.pdf');

  const isAdmin = currentUser.role === 'institution_admin';

  const filteredRequests = verificationRequests.filter(r => {
    if (filterStatus === 'all') return true;
    return r.status === filterStatus;
  });

  const pendingCount = verificationRequests.filter(r => r.status === 'pending').length;

  // Find contested incidents
  const contestedBookings = bookings.filter(b => b.incidentReport?.status === 'escalated');

  const handleConfirmReject = (id: string) => {
    const res = rejectVerificationRequest(id, rejectionReason);
    if (!res.success) alert(res.message);
    setRejectingReqId(null);
  };

  const handleConfirmApprove = (id: string) => {
    const res = approveVerificationRequest(id, approvalNotes);
    if (!res.success) alert(res.message);
  };

  const handleSubmitNewCredential = (e: React.FormEvent) => {
    e.preventDefault();
    submitVerificationRequest({
      qualificationId: newQualificationId,
      qualificationName: newQualificationName,
      level: newLevel,
      issuingInstitution: newIssuingInstitution,
      documentRef: newDocRef
    });
    setIsSubmitModalOpen(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-6 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Inter-Institutional Compliance & Asset Governance</span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-slate-900">{currentUser.name} ({currentUser.role})</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Consortium Compliance & Credential Verification Hub
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Audit and verify institutional training certifications, cleanroom safety clearances, laser licenses, and adjudicate contested incident appeals across consortium member campuses.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="px-4 py-2 bg-slate-50 rounded-lg border border-slate-200 text-xs">
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Pending Credential Queue</span>
            <span className="text-base font-bold text-amber-700 font-mono tabular-nums">
              {pendingCount} review{pendingCount === 1 ? '' : 's'}
            </span>
          </div>
          <button
            onClick={() => setIsSubmitModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Award className="w-3.5 h-3.5 text-sky-400" />
            <span>+ Submit Credential</span>
          </button>
        </div>
      </div>

      {/* Role Notice if not Admin */}
      {!isAdmin && (
        <div className="p-4 bg-sky-50 rounded-xl border border-sky-200 text-xs text-sky-900 flex items-start gap-3">
          <Shield className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Active Persona: {currentUser.name} ({currentUser.role.replace('_', ' ')})</span>
            <p className="text-sky-800 mt-0.5">
              You can submit credentials for verification and inspect compliance statuses. Official accreditation approvals and penalty appeals are performed by Consortium Compliance Administrators (Sophia Chen).
            </p>
          </div>
        </div>
      )}

      {/* Sub Tabs: Credential Verification vs Contested Incidents */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSubTab('credentials')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'credentials'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Safety Credentials ({verificationRequests.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('contested_incidents')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'contested_incidents'
              ? 'bg-purple-900 text-white'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Scale className="w-3.5 h-3.5 text-purple-400" />
          <span>Contested Penalty Appeals ({contestedBookings.length})</span>
          {contestedBookings.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
              {contestedBookings.length}
            </span>
          )}
        </button>
      </div>

      {/* View 1: Safety Credentials Queue */}
      {activeSubTab === 'credentials' && (
        <div className="space-y-4">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-2.5 py-1 rounded text-xs font-medium ${filterStatus === 'all' ? 'bg-slate-200 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              All ({verificationRequests.length})
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-2.5 py-1 rounded text-xs font-medium ${filterStatus === 'pending' ? 'bg-amber-100 text-amber-900 font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setFilterStatus('verified')}
              className={`px-2.5 py-1 rounded text-xs font-medium ${filterStatus === 'verified' ? 'bg-emerald-100 text-emerald-900 font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              Verified
            </button>
            <button
              onClick={() => setFilterStatus('rejected')}
              className={`px-2.5 py-1 rounded text-xs font-medium ${filterStatus === 'rejected' ? 'bg-rose-100 text-rose-900 font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              Declined
            </button>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
              No qualification verification requests match the selected filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredRequests.map((req) => {
                const isPending = req.status === 'pending';
                const isVerified = req.status === 'verified';
                const isRejected = req.status === 'rejected';
                const isOwnReq = req.userId === currentUser.id;

                return (
                  <div
                    key={req.id}
                    className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-5"
                  >
                    {/* Left: Credential Details */}
                    <div className="space-y-2 max-w-2xl">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {isPending && (
                          <span className="px-2.5 py-0.5 rounded-full border text-[11px] font-semibold bg-amber-50 text-amber-800 border-amber-200 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-700" />
                            <span>Pending Admin Review</span>
                          </span>
                        )}
                        {isVerified && (
                          <span className="px-2.5 py-0.5 rounded-full border text-[11px] font-semibold bg-emerald-50 text-emerald-800 border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Verified & Active</span>
                          </span>
                        )}
                        {isRejected && (
                          <span className="px-2.5 py-0.5 rounded-full border text-[11px] font-semibold bg-rose-50 text-rose-800 border-rose-200 flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>Declined</span>
                          </span>
                        )}
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-500 font-mono text-[11px]">
                          Submitted: {new Date(req.submittedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-600 font-medium">{req.level}</span>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                          <span>{req.qualificationName}</span>
                        </h3>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Issuing Authority: <strong className="text-slate-800">{req.issuingInstitution}</strong>
                        </p>
                      </div>

                      {/* Requester Identity */}
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between gap-3 text-xs">
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-semibold">Applicant</span>
                          <strong className="text-slate-900">{req.userName}</strong> ({req.userInstitution})
                        </div>
                        <div className="text-right">
                          <span className="text-slate-500 block text-[10px] uppercase font-semibold">Evidence Reference</span>
                          <span className="font-mono text-sky-800 flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            <span>{req.documentRef}</span>
                          </span>
                        </div>
                      </div>

                      {/* Admin Audit Notes */}
                      {req.adminNotes && (
                        <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200">
                          <strong>Admin Audit Note:</strong> {req.adminNotes}
                          {req.reviewedBy && (
                            <span className="block mt-0.5 text-[11px] text-slate-500 font-mono">
                              Audited by: {req.reviewedBy}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                      {isPending ? (
                        isAdmin && !isOwnReq ? (
                          <>
                            <button
                              onClick={() => handleConfirmApprove(req.id)}
                              className="px-4 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                              <span>Approve Credential</span>
                            </button>

                            <button
                              onClick={() => setRejectingReqId(req.id)}
                              className="px-3.5 py-2.5 text-xs font-medium text-slate-700 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                            >
                              <XCircle className="w-4 h-4 text-slate-400" />
                              <span>Decline</span>
                            </button>
                          </>
                        ) : (
                          <span className="px-3 py-2 text-[11px] text-slate-400 bg-slate-50 rounded-lg border border-slate-200 text-center">
                            {isOwnReq ? 'Self-approval prohibited' : 'Admin review only'}
                          </span>
                        )
                      ) : (
                        <div className="text-right text-xs text-slate-400">
                          <span>Status finalized</span>
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* View 2: Contested Penalty Appeals */}
      {activeSubTab === 'contested_incidents' && (
        <div className="space-y-4">
          {contestedBookings.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
              No active penalty contests or appeals submitted by researchers.
            </div>
          ) : (
            <div className="space-y-4">
              {contestedBookings.map(b => (
                <div key={b.id} className="bg-white rounded-xl p-5 border border-purple-200 shadow-xs space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-900 bg-purple-50 px-2.5 py-1 rounded border border-purple-200">
                      Appeal Case #{b.incidentReport?.id} · {b.resourceName}
                    </span>
                    <span className="text-slate-500">
                      Operator: <strong className="text-slate-900">{b.userName}</strong> ({b.userInstitution})
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                    <div className="font-semibold text-slate-900">Incident Reported by Custodian:</div>
                    <div className="text-slate-700">"{b.incidentReport?.description}"</div>
                    <div className="text-[11px] text-slate-500">
                      Original proposed deduction: ${b.incidentReport?.depositDeductionAmount}
                    </div>
                  </div>

                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 space-y-1">
                    <div className="font-bold text-purple-950">Borrower's Technical Contest Statement:</div>
                    <div className="text-purple-900 italic">"{b.incidentReport?.contestedReason}"</div>
                  </div>

                  {isAdmin && (
                    <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                      <button
                        onClick={() => {
                          resolveIncident({
                            incidentId: b.incidentReport!.id,
                            resolutionNotes: 'Admin Audit: Baseline inspection confirmed pre-existing stage marks. Deduction waived 100%.',
                            finalDepositDeduction: 0,
                            restoreToService: true
                          });
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
                      >
                        Uphold Appeal (Waive Penalty $0)
                      </button>
                      <button
                        onClick={() => {
                          resolveIncident({
                            incidentId: b.incidentReport!.id,
                            resolutionNotes: 'Admin Audit: Compromise settlement assessed after examining technician logs.',
                            finalDepositDeduction: Math.round((b.incidentReport?.depositDeductionAmount || 100) / 2),
                            restoreToService: true
                          });
                        }}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold"
                      >
                        Assess Partial 50% Compromise
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reject Modal */}
      {rejectingReqId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <h3 className="text-base font-bold text-slate-900">
              Decline Credential Verification
            </h3>
            <p className="text-slate-600">
              Provide an institutional basis for rejecting this credential submission (e.g. invalid certificate number, expired training window, or unrecognized issuing authority).
            </p>
            <textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
              placeholder="State compliance reason..."
              required
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectingReqId(null)}
                className="px-3.5 py-2 font-medium text-slate-700 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmReject(rejectingReqId)}
                className="px-4 py-2 font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit New Credential Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Submit Qualification for Verification
                </h3>
                <p className="text-xs text-slate-500">
                  Submit training documentation to unlock unescorted access to high-value equipment.
                </p>
              </div>
              <button onClick={() => setIsSubmitModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewCredential} className="space-y-3.5">
              <div>
                <label className="block font-semibold text-slate-900 mb-1">
                  Qualification Title
                </label>
                <input
                  type="text"
                  value={newQualificationName}
                  onChange={e => setNewQualificationName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-900 mb-1">
                    Qualification ID
                  </label>
                  <input
                    type="text"
                    value={newQualificationId}
                    onChange={e => setNewQualificationId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-900 mb-1">
                    Accreditation Level
                  </label>
                  <input
                    type="text"
                    value={newLevel}
                    onChange={e => setNewLevel(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-900 mb-1">
                  Issuing Authority / Safety Board
                </label>
                <input
                  type="text"
                  value={newIssuingInstitution}
                  onChange={e => setNewIssuingInstitution(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-900 mb-1">
                  Document / Certificate Reference
                </label>
                <input
                  type="text"
                  value={newDocRef}
                  onChange={e => setNewDocRef(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-700 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm"
                >
                  Submit for Compliance Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
