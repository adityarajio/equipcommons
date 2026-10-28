/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../context/AppContext';
import { X, Bell, CheckCircle2, AlertTriangle, Clock, RotateCcw, ShieldAlert, Check } from 'lucide-react';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose }) => {
  const { notifications, currentUser, markNotificationAsRead, clearAllNotifications } = useApp();

  if (!isOpen) return null;

  const myNotifications = notifications.filter(n => n.userId === currentUser.id);

  const getIcon = (type: string) => {
    switch (type) {
      case 'approved':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />;
      case 'rejected':
      case 'auto_cancelled':
        return <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />;
      case 'overdue_alert':
        return <Clock className="w-4 h-4 text-amber-600 shrink-0" />;
      case 'incident':
        return <ShieldAlert className="w-4 h-4 text-rose-700 shrink-0" />;
      case 'waitlist_promoted':
        return <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />;
      case 'deposit_released':
        return <RotateCcw className="w-4 h-4 text-teal-600 shrink-0" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500 shrink-0" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div 
        className="bg-white w-full max-w-md h-full shadow-2xl border-l border-slate-200 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900">
              Notifications & Alerts
            </h3>
            <span className="text-[11px] font-mono text-slate-500">
              ({currentUser.name})
            </span>
          </div>

          <div className="flex items-center gap-2">
            {myNotifications.some(n => !n.read) && (
              <button
                onClick={clearAllNotifications}
                className="text-xs text-sky-600 hover:text-sky-800 font-medium"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 text-xs">
          {myNotifications.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No notifications for this persona.
            </div>
          ) : (
            myNotifications.map((notif) => (
              <div 
                key={notif.id}
                onClick={() => markNotificationAsRead(notif.id)}
                className={`p-4 flex items-start gap-3 transition-colors cursor-pointer ${
                  notif.read ? 'bg-white hover:bg-slate-50/80' : 'bg-sky-50/40 hover:bg-sky-50 font-medium'
                }`}
              >
                <div className="mt-0.5">{getIcon(notif.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-slate-900 truncate">
                      {notif.title}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-xs">
                    {notif.message}
                  </p>
                </div>
                {!notif.read && (
                  <span className="w-2 h-2 rounded-full bg-sky-600 shrink-0 mt-1" />
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer Info */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Automated dispatch for approvals, reminders & overdue returns</span>
          <button
            onClick={onClose}
            className="text-xs font-semibold text-slate-700 hover:text-slate-900"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
