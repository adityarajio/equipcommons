/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AuditLogEntry } from '../types';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  FileText, 
  Hash, 
  CheckCircle2, 
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Info,
  Download,
  ShieldAlert,
  Link2
} from 'lucide-react';
import { verifyAuditChain, ChainVerificationResult } from '../utils/cryptoUtils';

export const AuditLogView: React.FC = () => {
  const { auditLogs } = useApp();

  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);
  const [verificationResult, setVerificationResult] = useState<ChainVerificationResult | null>(null);

  const filteredLogs = auditLogs.filter(log => {
    if (filterAction !== 'ALL' && !log.actionType.includes(filterAction)) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = `${log.resourceName} ${log.actorName} ${log.summary} ${log.integrityHash}`.toLowerCase();
      if (!matchText.includes(q)) return false;
    }
    return true;
  });

  const handleVerifyChain = () => {
    const res = verifyAuditChain(auditLogs);
    setVerificationResult(res);
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `equipcommons_audit_trail_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getActionColor = (actionType: AuditLogEntry['actionType']) => {
    switch (actionType) {
      case 'BOOKING_APPROVED':
      case 'QUALIFICATION_VERIFIED':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'BOOKING_REJECTED':
      case 'QUALIFICATION_REJECTED':
      case 'AUTO_CANCELLED_NO_SHOW':
        return 'text-rose-700 bg-rose-50 border-rose-200';
      case 'CHECKED_IN':
        return 'text-sky-700 bg-sky-50 border-sky-200';
      case 'RETURN_SUBMITTED':
        return 'text-purple-700 bg-purple-50 border-purple-200';
      case 'RETURN_CONFIRMED':
        return 'text-teal-700 bg-teal-50 border-teal-200';
      case 'WAITLISTED':
        return 'text-purple-700 bg-purple-50 border-purple-200';
      case 'INCIDENT_REPORTED':
      case 'INCIDENT_ESCALATED':
        return 'text-rose-900 bg-rose-100 border-rose-300';
      case 'CONFLICT_RESOLVED':
        return 'text-indigo-700 bg-indigo-50 border-indigo-200';
      default:
        return 'text-slate-700 bg-slate-100 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-6 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Auditable Activity Ledger</span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-slate-900">Canonical SHA-256 Digest Chain</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Institutional Transaction & Decision Trail
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Chronological audit chain recording every booking request, custodian approval, return condition audit, meter reading, and incident penalty across consortium campuses.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={handleVerifyChain}
            className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Link2 className="w-4 h-4 text-sky-600" />
            <span>Verify Hash Chain</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4 text-sky-400" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Hash Chain Verification Feedback */}
      {verificationResult && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
          verificationResult.isValid
            ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
            : 'bg-rose-50 border-rose-200 text-rose-950'
        }`}>
          {verificationResult.isValid ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="space-y-0.5">
            <strong className="block text-sm font-bold">
              {verificationResult.isValid 
                ? `Cryptographic Chain Verified (${verificationResult.validEntries} / ${verificationResult.totalEntries} Blocks Valid)`
                : `Integrity Failure Detected at Entry #${verificationResult.corruptedEntryId}`}
            </strong>
            <p className="text-slate-600">
              {verificationResult.isValid 
                ? 'Every transaction block has been sequentially recomputed using canonical SHA-256 digests from genesis to head. Zero payload tampering or linkage breaks detected.'
                : verificationResult.reason}
            </p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by resource, actor, digest..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        {/* Action Type Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto p-1 bg-slate-100 rounded-lg shrink-0">
          {[
            { id: 'ALL', label: 'All Events' },
            { id: 'BOOKING', label: 'Bookings' },
            { id: 'CHECKED', label: 'Check-Ins' },
            { id: 'RETURN', label: 'Returns' },
            { id: 'INCIDENT', label: 'Incidents' },
            { id: 'QUALIFICATION', label: 'Credentials' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterAction(tab.id)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                filterAction === tab.id
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 font-semibold">Timestamp</th>
                <th className="py-3 px-4 font-semibold">Action & Status</th>
                <th className="py-3 px-4 font-semibold">Resource</th>
                <th className="py-3 px-4 font-semibold">Authorized Actor</th>
                <th className="py-3 px-4 font-semibold">Activity Summary</th>
                <th className="py-3 px-4 font-semibold text-right">SHA-256 Digest</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((entry) => {
                const actionBadgeClass = getActionColor(entry.actionType);

                return (
                  <tr 
                    key={entry.id} 
                    onClick={() => setSelectedEntry(selectedEntry?.id === entry.id ? null : entry)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    {/* Timestamp */}
                    <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap tabular-nums">
                      {new Date(entry.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })} ·{' '}
                      {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>

                    {/* Action Type */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase border ${actionBadgeClass}`}>
                        {entry.actionType.replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* Resource */}
                    <td className="py-3.5 px-4 font-medium text-slate-900 whitespace-nowrap">
                      {entry.resourceName}
                    </td>

                    {/* Actor */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">{entry.actorName}</div>
                      <div className="text-[10px] text-slate-500 capitalize">{entry.actorRole.replace('_', ' ')}</div>
                    </td>

                    {/* Summary */}
                    <td className="py-3.5 px-4 text-slate-600 max-w-md">
                      <p className="line-clamp-1">{entry.summary}</p>
                    </td>

                    {/* Integrity Hash */}
                    <td className="py-3.5 px-4 text-right font-mono text-[11px] text-slate-400 group-hover:text-sky-600 whitespace-nowrap tabular-nums">
                      {entry.integrityHash.slice(0, 18)}...
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Entry Detail Drawer / Modal */}
      {selectedEntry && (
        <div className="p-5 bg-slate-900 text-white rounded-xl space-y-3 text-xs shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-sky-400" />
              <span className="font-semibold text-white">Event Audit Block #{selectedEntry.id}</span>
            </div>
            <button
              onClick={() => setSelectedEntry(null)}
              className="text-slate-400 hover:text-white"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-slate-300">
            <div>
              <span className="text-slate-500 block text-[11px]">Timestamp:</span>
              <span className="font-mono text-slate-200">{selectedEntry.timestamp}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Authorized Actor:</span>
              <span>{selectedEntry.actorName} ({selectedEntry.actorRole})</span>
            </div>
            <div className="md:col-span-2">
              <span className="text-slate-500 block text-[11px]">Previous Block Hash:</span>
              <span className="font-mono text-slate-400 truncate block">{selectedEntry.previousHash}</span>
            </div>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px]">SHA-256 Digest:</span>
            <span className="font-mono text-sky-400 break-all">{selectedEntry.integrityHash}</span>
          </div>

          <div className="pt-2">
            <span className="text-slate-500 block text-[11px] mb-1">Details & Context Payload:</span>
            <pre className="bg-slate-950 p-3 rounded-lg font-mono text-[11px] text-sky-300 overflow-x-auto border border-slate-800">
              {JSON.stringify(selectedEntry.details || { summary: selectedEntry.summary }, null, 2)}
            </pre>
          </div>
        </div>
      )}

    </div>
  );
};
