/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Scale, Clock, ShieldAlert, Award, Users, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { computeFairnessScore } from '../utils/fairness';

export const FairUsagePolicyView: React.FC = () => {
  const { fairUsageConfig, currentUser, getUserQuota } = useApp();

  const quota = getUserQuota(currentUser.id);
  const [simulatedUsageHours, setSimulatedUsageHours] = useState(quota.used);
  const [hasGrantCode, setHasGrantCode] = useState(true);
  const [noShowCount, setNoShowCount] = useState(0);
  const [completedReturns, setCompletedReturns] = useState(3);

  // Exact unified computeFairnessScore function imported from utils
  const fairnessBreakdown = computeFairnessScore({
    userId: currentUser.id,
    userRole: currentUser.role,
    weeklyHoursUsed: simulatedUsageHours,
    weeklyQuotaTotal: quota.total,
    noShowCount,
    completedReturnsCount: completedReturns,
    lateReturnsCount: 0,
    projectGrantCode: hasGrantCode ? 'NIH-R01-BIO-98214' : undefined
  });

  return (
    <div className="space-y-8">
      
      {/* Top Overview */}
      <div className="bg-white rounded-xl p-6 border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
          <Scale className="w-4 h-4 text-sky-600" />
          <span>Equitable Resource Governance</span>
          <span aria-hidden="true">·</span>
          <span className="font-medium text-slate-900">Anti-Monopolisation Protocol</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900">
          Transparent Fair-Allocation Architecture
        </h2>
        <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
          High-value laboratory equipment and specialised spaces are finite institutional assets. EquipCommons enforces explainable, automated rules to ensure equitable access across students, faculty, and cross-institution partners while eliminating hoarding and ghost bookings.
        </p>
      </div>

      {/* 4 Pillars of Fair Access */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs space-y-2">
          <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center font-bold text-xs">
            01
          </div>
          <h3 className="text-sm font-bold text-slate-900">Weekly Quota Caps</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Every verified researcher has a standard quota of <strong className="font-mono text-slate-900">{fairUsageConfig.maxWeeklyHoursPerUser} hours/week</strong>. Peak-hour reservations cannot exceed consecutive hour caps per tool.
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs space-y-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
            02
          </div>
          <h3 className="text-sm font-bold text-slate-900">15-Minute Release Rule</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            If a scheduled operator does not complete the digital baseline check-in within <strong className="font-mono text-slate-900">15 minutes</strong> of reservation start, the session is cancelled and auto-promoted to the highest-scoring waitlist requester.
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs space-y-2">
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-xs">
            03
          </div>
          <h3 className="text-sm font-bold text-slate-900">Priority-Driven Waitlists</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            When multiple researchers request the same slot or join a waitlist, ranks are computed deterministically using sponsored research grants, weekly quota headroom, and return stewardship.
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs space-y-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">
            04
          </div>
          <h3 className="text-sm font-bold text-slate-900">Escrow Accountability</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Security deposits held in escrow deter speculative multi-slot block bookings. Deposits are released automatically upon verified post-condition checklist certification by the facility custodian.
          </p>
        </div>

      </div>

      {/* Interactive Priority Formula Simulator */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 mb-1">
          Interactive Fair-Access Priority Simulator
        </h3>
        <p className="text-xs text-slate-500 mb-6">
          This exact algorithm evaluates every booking request in EquipCommons to calculate waitlist ranks and resolve schedule conflicts.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Controls */}
          <div className="lg:col-span-7 space-y-4 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-slate-800">Hours Consumed in Current Calendar Week</span>
                <span className="font-mono font-bold text-slate-900 tabular-nums">{simulatedUsageHours} / {quota.total} hrs</span>
              </div>
              <input
                type="range"
                min="0"
                max={quota.total}
                value={simulatedUsageHours}
                onChange={e => setSimulatedUsageHours(Number(e.target.value))}
                className="w-full accent-slate-900 cursor-pointer"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                <span>0 hrs (&lt;35% quota bonus +15)</span>
                <span>{Math.round(quota.total * 0.5)} hrs (+5)</span>
                <span>{quota.total} hrs (Quota Limit)</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="font-semibold text-slate-900">Peer-Reviewed Grant or Capstone Project</div>
                  <div className="text-[11px] text-slate-500">Sponsored account code provided (e.g. NIH, NSF, DOE, CAPSTONE)</div>
                </div>
                <input
                  type="checkbox"
                  checked={hasGrantCode}
                  onChange={e => setHasGrantCode(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-slate-200">
                <div>
                  <div className="font-semibold text-slate-900">Recorded No-Show Penalty</div>
                  <div className="text-[11px] text-slate-500">Previous missed 15-minute check-in grace period (-25 pts)</div>
                </div>
                <select
                  value={noShowCount}
                  onChange={e => setNoShowCount(Number(e.target.value))}
                  className="px-2 py-1 text-xs border border-slate-300 rounded bg-white text-slate-800 font-mono"
                >
                  <option value={0}>0 Missed Check-Ins</option>
                  <option value={1}>1 Missed Check-In (-25)</option>
                  <option value={2}>2 Missed Check-Ins (-50)</option>
                </select>
              </label>

              <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-slate-200">
                <div>
                  <div className="font-semibold text-slate-900">Clean Stewardship History</div>
                  <div className="text-[11px] text-slate-500">Completed returns with zero late returns (+5 pts)</div>
                </div>
                <select
                  value={completedReturns}
                  onChange={e => setCompletedReturns(Number(e.target.value))}
                  className="px-2 py-1 text-xs border border-slate-300 rounded bg-white text-slate-800 font-mono"
                >
                  <option value={0}>0 Completed Returns (+0)</option>
                  <option value={3}>3+ On-Time Returns (+5)</option>
                </select>
              </label>
            </div>
          </div>

          {/* Score Readout Display */}
          <div className="lg:col-span-5 bg-slate-900 text-white rounded-xl p-6 space-y-4">
            <div>
              <span className="text-slate-400 block text-xs uppercase tracking-wider font-semibold">
                Computed Fair Allocation Score
              </span>
              <div className="text-4xl font-bold font-mono text-sky-400 mt-1 tabular-nums">
                {fairnessBreakdown.totalScore}
                <span className="text-base font-normal text-slate-400"> / 100</span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs border-t border-slate-800 pt-3 text-slate-300">
              <div className="flex justify-between">
                <span>Base Baseline Score:</span>
                <span className="font-mono text-slate-400">+{fairnessBreakdown.base}</span>
              </div>
              <div className="flex justify-between">
                <span>Sponsored Grant / Capstone Bonus:</span>
                <span className="font-mono text-emerald-400">+{fairnessBreakdown.grantBonus}</span>
              </div>
              <div className="flex justify-between">
                <span>Low Weekly Usage Incentive:</span>
                <span className="font-mono text-emerald-400">+{fairnessBreakdown.lowUsageBonus}</span>
              </div>
              <div className="flex justify-between">
                <span>Stewardship / On-Time Reward:</span>
                <span className="font-mono text-emerald-400">+{fairnessBreakdown.promptHistoryBonus}</span>
              </div>
              {fairnessBreakdown.penalty !== 0 && (
                <div className="flex justify-between text-rose-400">
                  <span>No-Show / Violation Penalty:</span>
                  <span className="font-mono">{fairnessBreakdown.penalty}</span>
                </div>
              )}
            </div>

            <div className="text-[11px] text-slate-400 bg-slate-950 p-3 rounded border border-slate-800 leading-relaxed">
              <strong>Explainability Summary:</strong> {fairnessBreakdown.justificationSummary}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
