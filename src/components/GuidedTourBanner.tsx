/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, ArrowRight, Play, Sparkles, X, Info } from 'lucide-react';

export const GuidedTourBanner: React.FC = () => {
  const { 
    currentUser, 
    allUsers, 
    setCurrentUser, 
    setActiveTab, 
    setSelectedResourceIdForModal,
    resources,
    bookings
  } = useApp();

  const [isOpen, setIsOpen] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);

  if (!isOpen) {
    return (
      <div className="bg-slate-900 text-white text-xs py-1 px-4 flex items-center justify-between">
        <span className="font-medium text-slate-300">
          EquipCommons Full-Lifecycle Evaluation Mode
        </span>
        <button
          onClick={() => setIsOpen(true)}
          className="text-sky-400 hover:text-sky-300 font-semibold underline ml-2"
        >
          Open Quick Journey Guide
        </button>
      </div>
    );
  }

  const steps = [
    {
      num: 1,
      title: 'Discover & Verify Eligibility',
      desc: 'Act as Dr. Elena Rostova. Browse the FE-SEM or Haas CNC, verify certified qualification match and safety interlocks.',
      actionLabel: 'Browse & Check FE-SEM',
      action: () => {
        const elena = allUsers.find(u => u.id === 'user_elena_rostova');
        if (elena) setCurrentUser(elena);
        setActiveTab('catalog');
        setSelectedResourceIdForModal('res_sem_jeol_7800');
        setCurrentStep(2);
      }
    },
    {
      num: 2,
      title: 'Submit Booking & Fair Quota Check',
      desc: 'Submit access request. System checks qualifications, fair-share weekly quota, escrow balance, and conflict-free schedule.',
      actionLabel: 'Open Request Form',
      action: () => {
        const elena = allUsers.find(u => u.id === 'user_elena_rostova');
        if (elena) setCurrentUser(elena);
        setActiveTab('catalog');
        setSelectedResourceIdForModal('res_sem_jeol_7800');
        setCurrentStep(3);
      }
    },
    {
      num: 3,
      title: 'Custodian Approval Workflow',
      desc: 'Switch to Prof. Arthur Pendelton (Nanotech Director) or Dr. Marcus Vance. Review credentials, safety requirements, and approve.',
      actionLabel: 'Review Pending Requests',
      action: () => {
        const arthur = allUsers.find(u => u.id === 'user_arthur_pendelton');
        if (arthur) setCurrentUser(arthur);
        setActiveTab('owner_portal');
        setCurrentStep(4);
      }
    },
    {
      num: 4,
      title: 'Digital Check-In & Baseline Condition',
      desc: 'User arrives at facility. Check-in is live (toggle "Demo: Check-in Bypass" in the top bar to test anytime). Inspect checklist, log photo baseline, and digitally sign in.',
      actionLabel: 'Go to Check-In Modal',
      action: () => {
        const elena = allUsers.find(u => u.id === 'user_elena_rostova');
        if (elena) setCurrentUser(elena);
        setActiveTab('my_bookings');
        setCurrentStep(5);
      }
    },
    {
      num: 5,
      title: 'Two-Step Return & Deposit Release',
      desc: 'Borrower submits return checklist with photos -> Lab Custodian reviews & certifies condition before deposit escrow release.',
      actionLabel: 'Inspect Two-Step Return',
      action: () => {
        const elena = allUsers.find(u => u.id === 'user_elena_rostova');
        if (elena) setCurrentUser(elena);
        setActiveTab('my_bookings');
        setCurrentStep(6);
      }
    },
    {
      num: 6,
      title: 'Auditable Cryptographic Ledger',
      desc: 'Inspect tamper-evident SHA-256 cryptographic audit chain. Verify ledger integrity and export canonical JSON.',
      actionLabel: 'Inspect & Verify Ledger',
      action: () => {
        setActiveTab('audit_ledger');
      }
    }
  ];

  return (
    <div className="bg-slate-900 border-b border-slate-800 text-white transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          
          {/* Guide Header */}
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-1.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
              <Play className="w-4 h-4 fill-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold tracking-wide uppercase text-sky-400">
                  Full Sharing Lifecycle Walkthrough
                </span>
                <span className="text-slate-500 text-xs">·</span>
                <span className="text-xs text-slate-300">
                  Step {currentStep} of {steps.length}: <strong className="text-white font-medium">{steps[currentStep - 1].title}</strong>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
                {steps[currentStep - 1].desc}
              </p>
            </div>
          </div>

          {/* Stepper Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={steps[currentStep - 1].action}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold rounded-md transition-colors"
            >
              <span>{steps[currentStep - 1].actionLabel}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Quick step jump indicators */}
            <div className="flex items-center gap-1">
              {steps.map((s) => (
                <button
                  key={s.num}
                  onClick={() => {
                    setCurrentStep(s.num);
                    s.action();
                  }}
                  title={s.title}
                  className={`w-5 h-5 rounded text-[11px] font-mono flex items-center justify-center transition-colors ${
                    currentStep === s.num
                      ? 'bg-sky-400 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {s.num}
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-500 hover:text-slate-300 p-1"
              title="Collapse Guide"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
