/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FairnessScoreBreakdown } from '../types';

export interface FairnessCalculationParams {
  userId: string;
  userRole?: string;
  weeklyHoursUsed: number;
  weeklyQuotaTotal: number;
  noShowCount: number;
  completedReturnsCount: number;
  lateReturnsCount: number;
  projectGrantCode?: string;
}

export const VALID_GRANT_PREFIXES = ['NIH-', 'NSF-', 'DOE-', 'DARPA-', 'NASA-', 'ERC-', 'CAPSTONE-'];

export const isValidGrantCode = (code?: string): boolean => {
  if (!code || !code.trim()) return false;
  const clean = code.trim().toUpperCase();
  const hasPrefix = VALID_GRANT_PREFIXES.some(prefix => clean.startsWith(prefix));
  // Must have prefix plus at least 4 alphanumeric characters (e.g., NIH-R01-BIO-98214)
  return hasPrefix && clean.length >= 8 && !/^[A-Z-]+$/.test(clean);
};

/**
 * Pure, canonical fairness score calculator.
 * Produces deterministic, explainable scores between 0 and 100.
 */
export const computeFairnessScore = (params: FairnessCalculationParams): FairnessScoreBreakdown => {
  const base = 50;
  let grantBonus = 0;
  let lowUsageBonus = 0;
  let promptHistoryBonus = 0;
  let penalty = 0;
  const justifications: string[] = ['Base institutional score (50)'];

  // 1. Sponsored Grant or Capstone Priority (+10 to +15)
  if (params.projectGrantCode && isValidGrantCode(params.projectGrantCode)) {
    const code = params.projectGrantCode.trim().toUpperCase();
    if (code.startsWith('CAPSTONE-')) {
      grantBonus = 10;
      justifications.push(`Capstone/Degree Project Bonus (+10: ${code})`);
    } else {
      grantBonus = 15;
      justifications.push(`Peer-Reviewed Research Grant Priority (+15: ${code})`);
    }
  }

  // 2. Weekly Fair-Share Resource Distribution Bonus (+15 for low usage, +5 for moderate)
  const quota = params.weeklyQuotaTotal > 0 ? params.weeklyQuotaTotal : 20;
  const usageRatio = params.weeklyHoursUsed / quota;

  if (usageRatio < 0.35) {
    lowUsageBonus = 15;
    justifications.push(`Low weekly usage bonus (+15: ${params.weeklyHoursUsed}h / ${quota}h used)`);
  } else if (usageRatio < 0.65) {
    lowUsageBonus = 5;
    justifications.push(`Moderate weekly usage (+5: ${params.weeklyHoursUsed}h / ${quota}h used)`);
  } else {
    lowUsageBonus = 0;
    justifications.push(`High weekly usage (+0: ${params.weeklyHoursUsed}h / ${quota}h used)`);
  }

  // 3. Reliable Stewardship & Prompt Return Reward (+5 only if past returns completed without late returns)
  if (params.completedReturnsCount > 0 && params.lateReturnsCount === 0 && params.noShowCount === 0) {
    promptHistoryBonus = 5;
    justifications.push(`Reliable equipment stewardship record (+5 for ${params.completedReturnsCount} on-time return(s))`);
  }

  // 4. Missed Check-In / No-Show & Late Return Penalties (-25 per no show, -10 per late return)
  if (params.noShowCount > 0) {
    const p = params.noShowCount * 25;
    penalty += p;
    justifications.push(`Repeat no-show penalty (-${p}: ${params.noShowCount} missed check-in(s))`);
  }

  if (params.lateReturnsCount > 0) {
    const lp = params.lateReturnsCount * 10;
    penalty += lp;
    justifications.push(`Late return penalty (-${lp}: ${params.lateReturnsCount} overdue session(s))`);
  }

  const rawTotal = base + grantBonus + lowUsageBonus + promptHistoryBonus - penalty;
  const totalScore = Math.max(5, Math.min(100, rawTotal));

  return {
    base,
    grantBonus,
    lowUsageBonus,
    promptHistoryBonus,
    penalty: -penalty,
    totalScore,
    justificationSummary: justifications.join(' · ')
  };
};
