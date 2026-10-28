/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Booking } from '../types';
import { useApp } from '../context/AppContext';
import { X, Clock, CheckCircle2, ShieldCheck, Hash, UserCheck, AlertOctagon, RotateCcw } from 'lucide-react';

interface BookingTimelineModalProps {
  booking: Booking | null;
  onClose: () => void;
}

export const BookingTimelineModal: React.FC<BookingTimelineModalProps> = ({ booking, onClose }) => {
  const { auditLogs } = useApp();

  if (!booking) return null;

  // Filter audit logs associated with this specific transaction
  const transactionLogs = auditLogs
    .filter(log => log.bookingId === booking.id)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-sky-400 font-mono">
              <span>Transaction #{booking.id.slice(-8)}</span>
              <span>·</span>
              <span className="capitalize">{booking.status.replace(/_/g, ' ')}</span>
            </div>
            <h3 className="text-base font-bold text-white mt-0.5">
              Auditable Transaction Lifecycle Timeline
            </h3>
            <p className="text-xs text-slate-400">
              {booking.resourceName} · Operator: {booking.userName}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-xs max-h-[75vh] overflow-y-auto">
          
          {/* Summary Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Scheduled Window</span>
              <span className="font-mono text-slate-800 text-xs">
                {booking.totalHours} hrs
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Fair Score</span>
              <span className="font-mono font-bold text-sky-700 text-xs">
                {booking.fairnessScore || 75}/100
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Deposit Escrow</span>
              <span className="font-mono text-slate-800 text-xs">
                ${booking.depositHeld}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Settlement</span>
              <span className="font-semibold text-xs text-slate-800 capitalize">
                {booking.depositSettlement ? booking.depositSettlement.status.replace(/_/g, ' ') : 'Pending Session'}
              </span>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
              Chronological Action Trail (Step 10 Transaction History)
            </h4>

            {transactionLogs.length === 0 ? (
              <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
                No transaction-linked actions recorded yet for this booking.
              </div>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {transactionLogs.map((log, index) => (
                  <div key={log.id} className="relative group">
                    {/* Bullet marker */}
                    <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-slate-900 border-2 border-white shadow-xs" />

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-100 text-slate-800 border border-slate-200">
                          {log.actionType.replace(/_/g, ' ')}
                        </span>
                        <span className="font-mono text-[11px] text-slate-400">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="font-medium text-slate-700">
                          {log.actorName} ({log.actorRole.replace(/_/g, ' ')})
                        </span>
                      </div>

                      <p className="text-xs text-slate-800 leading-relaxed font-normal">
                        {log.summary}
                      </p>

                      <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400 pt-0.5">
                        <span>Digest: {log.integrityHash}</span>
                        {log.previousHash && (
                          <span className="text-slate-400">Linked: {log.previousHash.slice(0, 14)}...</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Close button */}
          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900"
            >
              Close Timeline
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
