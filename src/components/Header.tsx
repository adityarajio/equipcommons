/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ChevronDown, Plus, RotateCcw, Bell, ClockAlert, Check } from 'lucide-react';
import { NotificationCenter } from './NotificationCenter';

export const Header: React.FC = () => {
  const { 
    currentUser, 
    allUsers, 
    setCurrentUser, 
    activeTab, 
    setActiveTab, 
    setIsCreateListingOpen,
    resetToDemoDefaults,
    unreadNotificationsCount,
    simulateTimeAdvanceCheck,
    demoIgnoreCheckInWindow,
    setDemoIgnoreCheckInWindow
  } = useApp();

  const [isPersonaOpen, setIsPersonaOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [simulationToast, setSimulationToast] = useState<string | null>(null);

  const navItems = [
    { id: 'catalog' as const, label: 'Catalog' },
    { id: 'my_bookings' as const, label: 'Reservations' },
    { id: 'owner_portal' as const, label: 'Lab Custodian' },
    ...(currentUser.role === 'institution_admin' || activeTab === 'admin_verification' ? [{ id: 'admin_verification' as const, label: 'Compliance' }] : []),
    { id: 'audit_ledger' as const, label: 'Audit Trail' },
    { id: 'fair_usage_rules' as const, label: 'Fair Access' },
  ];

  const handleSimulateTime = () => {
    const res = simulateTimeAdvanceCheck();
    setSimulationToast(res.message);
    setTimeout(() => setSimulationToast(null), 4000);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3 sm:gap-4 lg:gap-8 h-16 w-full">
            
            {/* Zone 1: Single text element wordmark */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button 
                onClick={() => setActiveTab('catalog')}
                className="flex items-center gap-2 text-left group cursor-pointer focus:outline-none"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-sm">
                  EC
                </div>
                <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
                  EquipCommons
                </span>
              </button>
              <span className="hidden 2xl:inline text-xs text-slate-400">·</span>
              <span className="hidden 2xl:inline text-xs text-slate-500 font-medium">
                Institutional Resource Exchange
              </span>
            </div>

            {/* Zone 2: Concise single-line text navigation links */}
            <nav className="hidden lg:flex items-center gap-4 xl:gap-6 text-sm font-medium">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`transition-colors whitespace-nowrap py-1 border-b-2 text-xs xl:text-sm ${
                    activeTab === item.id
                      ? 'text-slate-900 border-slate-900 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 border-transparent'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            {/* Zone 3: Controls, Persona Switcher & Primary Action */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              
              {/* Demo Mode Toggle: Ignore Check-In Window */}
              <button
                onClick={() => setDemoIgnoreCheckInWindow(!demoIgnoreCheckInWindow)}
                title="Demo Mode: When ON, bypasses the strict ±30m check-in window so any approved booking can be checked into immediately"
                className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                  demoIgnoreCheckInWindow
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:text-slate-700'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${demoIgnoreCheckInWindow ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                <span className="whitespace-nowrap">Demo: Check-in Bypass {demoIgnoreCheckInWindow ? 'ON' : 'OFF'}</span>
              </button>

              {/* 15-Minute Rule / Overdue Check Simulator */}
              <button
                onClick={handleSimulateTime}
                title="Run Automated 15-Minute Check-in & Overdue Monitor"
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors whitespace-nowrap"
              >
                <ClockAlert className="w-3.5 h-3.5 text-amber-700" />
                <span>Simulate 15m Expiries</span>
              </button>

              {/* Notification Bell */}
              <button
                onClick={() => setIsNotificationsOpen(true)}
                title="Notifications & Alerts"
                className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>

              {/* Quick Demo Reset */}
              <button
                onClick={resetToDemoDefaults}
                title="Reset Demo Data to Initial State"
                className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">Reset</span>
              </button>


              {/* Persona Switcher Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsPersonaOpen(!isPersonaOpen)}
                  className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors border border-slate-200/60"
                >
                  <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                    {currentUser.avatarInitials}
                  </div>
                  <div className="text-left hidden sm:block">
                    <div className="font-semibold text-slate-900 leading-tight truncate max-w-[90px] md:max-w-[110px]">
                      {currentUser.name}
                    </div>
                    <div className="text-[10px] text-slate-500 leading-none capitalize truncate max-w-[90px] md:max-w-[110px]">
                      {currentUser.role.replace('_', ' ')}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>

                {isPersonaOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-30" 
                      onClick={() => setIsPersonaOpen(false)} 
                    />
                    <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-40">
                      <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                        Switch Active Persona for Testing
                      </div>
                      {allUsers.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => {
                            setCurrentUser(user);
                            setIsPersonaOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center gap-3 transition-colors ${
                            user.id === currentUser.id 
                              ? 'bg-slate-50 font-semibold text-slate-900' 
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold shrink-0">
                            {user.avatarInitials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-slate-900 truncate">
                              {user.name}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {user.institution} · <span className="capitalize">{user.role.replace('_', ' ')}</span>
                            </div>
                          </div>
                          {user.id === currentUser.id && (
                            <div className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                          )}
                        </button>
                      ))}
                      <div className="px-3 pt-2 mt-1 border-t border-slate-100 text-[11px] text-slate-500">
                        Switch roles to test requester and custodian views.
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Primary Action Button */}
              <button
                onClick={() => setIsCreateListingOpen(true)}
                className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shadow-sm shrink-0"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">List Resource</span>
                <span className="sm:hidden">List</span>
              </button>
            </div>

          </div>
        </div>

        {/* Responsive mobile & tablet nav bar */}
        <div className="lg:hidden border-t border-slate-200 bg-slate-50/95 px-3 py-1.5 flex items-center gap-1 overflow-x-auto text-xs font-medium w-full">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`px-2.5 py-1 rounded-md whitespace-nowrap transition-colors shrink-0 ${
                activeTab === item.id 
                  ? 'bg-white text-slate-900 shadow-xs font-semibold border border-slate-200/80' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
          
          <button
            onClick={handleSimulateTime}
            className="px-2.5 py-1 rounded-md whitespace-nowrap transition-colors shrink-0 text-amber-800 bg-amber-50 border border-amber-200 ml-auto"
          >
            Check 15m Expiries
          </button>
        </div>

        {/* Toast for automated simulation feedback */}
        {simulationToast && (
          <div className="bg-amber-100 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex items-center justify-between">
            <span>{simulationToast}</span>
            <button onClick={() => setSimulationToast(null)} className="text-amber-700 hover:text-amber-900 ml-2 font-bold">×</button>
          </div>
        )}
      </header>

      {/* Notification Drawer */}
      <NotificationCenter
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />
    </>
  );
};
