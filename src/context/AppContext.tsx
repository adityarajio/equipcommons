/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { 
  UserProfile, 
  ResourceListing, 
  Booking, 
  AuditLogEntry, 
  ConditionReport, 
  IncidentReport, 
  BookingStatus,
  FairnessScoreBreakdown,
  AppNotification,
  DepositSettlement,
  QualificationVerificationRequest
} from '../types';
import { 
  SEED_USERS, 
  SEED_RESOURCES, 
  INITIAL_USER_QUOTAS, 
  INITIAL_USER_DEPOSITS,
  INITIAL_FAIR_USAGE_CONFIG,
  generateFreshSeedBookings,
  generateFreshSeedAudits,
  generateFreshNotifications,
  generateFreshVerificationRequests
} from '../data/seedData';
import { toLocalISOString, at, atMinutes, doIntervalsOverlap, isWithinCurrentWeek, isWithinSameWeek } from '../utils/dateUtils';
import { computeAuditHash, GENESIS_HASH } from '../utils/cryptoUtils';
import { computeFairnessScore, isValidGrantCode } from '../utils/fairness';
import { safeSetLocalStorage } from '../utils/imageUtils';

interface AppContextType {
  currentUser: UserProfile;
  allUsers: UserProfile[];
  setCurrentUser: (user: UserProfile) => void;
  resources: ResourceListing[];
  bookings: Booking[];
  auditLogs: AuditLogEntry[];
  notifications: AppNotification[];
  verificationRequests: QualificationVerificationRequest[];
  fairUsageConfig: typeof INITIAL_FAIR_USAGE_CONFIG;
  activeTab: 'catalog' | 'my_bookings' | 'owner_portal' | 'admin_verification' | 'audit_ledger' | 'fair_usage_rules';
  setActiveTab: (tab: 'catalog' | 'my_bookings' | 'owner_portal' | 'admin_verification' | 'audit_ledger' | 'fair_usage_rules') => void;
  selectedResourceIdForModal: string | null;
  setSelectedResourceIdForModal: (id: string | null) => void;
  isCreateListingOpen: boolean;
  setIsCreateListingOpen: (open: boolean) => void;

  // Evaluation & Demo controls
  demoIgnoreCheckInWindow: boolean;
  setDemoIgnoreCheckInWindow: (enabled: boolean) => void;
  
  // Quotas & Deposits
  userQuotas: Record<string, { used: number; total: number; noShowCount: number }>;
  userDeposits: Record<string, { balance: number; held: number; lifetimeRefunded: number; lifetimeDeducted: number }>;
  getUserQuota: (userId: string) => { used: number; total: number; remaining: number; score: number };
  calculateFairnessScore: (userId: string, grantCode?: string) => FairnessScoreBreakdown;

  // Notification management
  unreadNotificationsCount: number;
  markNotificationAsRead: (id: string) => void;
  clearAllNotifications: () => void;

  // Actions
  addResource: (listing: Omit<ResourceListing, 'id' | 'ownerId' | 'ownerName' | 'ownerRole' | 'totalHoursSharedThisMonth' | 'currentBookingsCount'>) => { success: boolean; message: string };
  submitBookingRequest: (params: {
    resourceId: string;
    startTime: string;
    endTime: string;
    totalHours: number;
    purposeDescription: string;
    projectGrantCode?: string;
    supervisionRequested: boolean;
  }) => { success: boolean; message: string; waitlisted?: boolean; bookingId?: string };
  approveBooking: (bookingId: string, assignedSupervisor?: string) => { success: boolean; message: string };
  rejectBooking: (bookingId: string, reason: string) => { success: boolean; message: string };
  cancelBooking: (bookingId: string, reason?: string) => { success: boolean; message: string };
  extendBooking: (bookingId: string, additionalHours: number) => { success: boolean; message: string };
  checkInBooking: (bookingId: string, report: Omit<ConditionReport, 'id' | 'bookingId' | 'type' | 'timestamp'>) => { success: boolean; message: string };
  
  // Two-step return flow
  submitReturnRequest: (bookingId: string, report: Omit<ConditionReport, 'id' | 'bookingId' | 'type' | 'timestamp'>) => { success: boolean; message: string };
  confirmReturnInspection: (params: {
    bookingId: string;
    finalRating: ConditionReport['statusRating'];
    inspectorNotes: string;
    approvedBy: string;
  }) => { success: boolean; message: string };

  reportIncident: (params: {
    bookingId: string;
    resourceId: string;
    severity: 'minor' | 'moderate' | 'critical';
    category: 'hardware_damage' | 'calibration_loss' | 'uncleaned_facility' | 'late_return' | 'safety_violation';
    description: string;
    depositDeductionAmount: number;
  }) => void;
  resolveIncident: (params: {
    incidentId: string;
    resolutionNotes: string;
    finalDepositDeduction: number;
    restoreToService: boolean;
  }) => { success: boolean; message: string };
  contestIncident: (incidentId: string, reason: string) => { success: boolean; message: string };

  // Admin Verification Queue
  submitVerificationRequest: (params: {
    qualificationId: string;
    qualificationName: string;
    level: string;
    issuingInstitution: string;
    documentRef: string;
  }) => { success: boolean; message: string };
  approveVerificationRequest: (requestId: string, notes?: string) => { success: boolean; message: string };
  rejectVerificationRequest: (requestId: string, reason: string) => { success: boolean; message: string };
  
  // Automated rule simulators
  simulateTimeAdvanceCheck: () => { autoCancelledCount: number; overdueCount: number; message: string };
  resetToDemoDefaults: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Safe localStorage JSON parser
function safeJsonParse<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    console.warn(`Error parsing localStorage key ${key}, using fallback:`, e);
    return fallback;
  }
}

export const BLOCKING_STATUSES: BookingStatus[] = [
  'pending_review', 
  'approved', 
  'checked_in', 
  'return_pending_inspection', 
  'incident_flagged'
];

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [allUsers, setAllUsers] = useState<UserProfile[]>(() => safeJsonParse('equip_users_v2', SEED_USERS));
  const [currentUser, setCurrentUserState] = useState<UserProfile>(() => allUsers[0]);
  const [resources, setResources] = useState<ResourceListing[]>(() => safeJsonParse('equip_resources_v2', SEED_RESOURCES));
  const [bookings, setBookings] = useState<Booking[]>(() => safeJsonParse('equip_bookings_v2', generateFreshSeedBookings()));
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => safeJsonParse('equip_audits_v2', generateFreshSeedAudits()));
  const [notifications, setNotifications] = useState<AppNotification[]>(() => safeJsonParse('equip_notifs_v2', generateFreshNotifications()));
  const [verificationRequests, setVerificationRequests] = useState<QualificationVerificationRequest[]>(() => 
    safeJsonParse('equip_verifs_v2', generateFreshVerificationRequests())
  );
  
  const [userQuotas, setUserQuotas] = useState<Record<string, { used: number; total: number; noShowCount: number }>>(() => 
    safeJsonParse('equip_quotas_v2', INITIAL_USER_QUOTAS)
  );
  
  const [userDeposits, setUserDeposits] = useState<Record<string, { balance: number; held: number; lifetimeRefunded: number; lifetimeDeducted: number }>>(() => 
    safeJsonParse('equip_deposits_v2', INITIAL_USER_DEPOSITS)
  );

  const [demoIgnoreCheckInWindow, setDemoIgnoreCheckInWindowState] = useState<boolean>(() => 
    safeJsonParse('equip_demo_bypass', true)
  );

  const [activeTab, setActiveTab] = useState<'catalog' | 'my_bookings' | 'owner_portal' | 'admin_verification' | 'audit_ledger' | 'fair_usage_rules'>('catalog');
  const [selectedResourceIdForModal, setSelectedResourceIdForModal] = useState<string | null>(null);
  const [isCreateListingOpen, setIsCreateListingOpen] = useState<boolean>(false);

  const setDemoIgnoreCheckInWindow = (enabled: boolean) => {
    setDemoIgnoreCheckInWindowState(enabled);
    safeSetLocalStorage('equip_demo_bypass', JSON.stringify(enabled));
  };

  // Sync state to localStorage safely
  useEffect(() => { safeSetLocalStorage('equip_users_v2', JSON.stringify(allUsers)); }, [allUsers]);
  useEffect(() => { safeSetLocalStorage('equip_resources_v2', JSON.stringify(resources)); }, [resources]);
  useEffect(() => { safeSetLocalStorage('equip_bookings_v2', JSON.stringify(bookings)); }, [bookings]);
  useEffect(() => { safeSetLocalStorage('equip_audits_v2', JSON.stringify(auditLogs)); }, [auditLogs]);
  useEffect(() => { safeSetLocalStorage('equip_notifs_v2', JSON.stringify(notifications)); }, [notifications]);
  useEffect(() => { safeSetLocalStorage('equip_verifs_v2', JSON.stringify(verificationRequests)); }, [verificationRequests]);
  useEffect(() => { safeSetLocalStorage('equip_quotas_v2', JSON.stringify(userQuotas)); }, [userQuotas]);
  useEffect(() => { safeSetLocalStorage('equip_deposits_v2', JSON.stringify(userDeposits)); }, [userDeposits]);

  // Keep currentUser synced if user profile updates
  const setCurrentUser = (u: UserProfile) => {
    const fresh = allUsers.find(user => user.id === u.id) || u;
    setCurrentUserState(fresh);
  };

  // Helper: Append a new audit entry with strict SHA-256 chaining to head
  const addAuditEntry = (entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'integrityHash' | 'previousHash'>) => {
    const timestamp = toLocalISOString(new Date());
    const id = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    
    setAuditLogs(prev => {
      // prev[0] is the latest entry (head)
      const head = prev[0];
      const previousHash = head ? head.integrityHash : GENESIS_HASH;
      const integrityHash = computeAuditHash(
        previousHash,
        entry.actorId,
        entry.actionType,
        timestamp,
        entry.resourceId,
        entry.details || {},
        entry.actorName || '',
        entry.summary || ''
      );

      const newLog: AuditLogEntry = {
        ...entry,
        id,
        timestamp,
        previousHash,
        integrityHash
      };

      return [newLog, ...prev];
    });
  };


  // Helper: Append notification
  const addNotification = (
    userId: string,
    type: AppNotification['type'],
    title: string,
    message: string,
    relatedBookingId?: string
  ) => {
    const newNotif: AppNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      userId,
      type,
      title,
      message,
      timestamp: toLocalISOString(new Date()),
      read: false,
      relatedBookingId
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  // Dynamic weekly quota calculation derived from current week's active reservations
  const getUserQuota = (userId: string) => {
    const user = allUsers.find(u => u.id === userId);
    const total = user?.weeklyHoursQuota || 20;

    // Sum active/approved/pending hours scheduled in the current week
    const currentWeekHours = bookings
      .filter(b => 
        b.userId === userId &&
        ['pending_review', 'approved', 'checked_in', 'return_pending_inspection'].includes(b.status) &&
        isWithinCurrentWeek(b.startTime)
      )
      .reduce((acc, b) => acc + b.totalHours, 0);

    const noShow = userQuotas[userId]?.noShowCount || 0;
    const remaining = Math.max(0, total - currentWeekHours);
    const score = calculateFairnessScore(userId).totalScore;

    return {
      used: currentWeekHours,
      total,
      remaining,
      score
    };
  };

  // Unified canonical fairness calculation
  const calculateFairnessScore = (userId: string, grantCode?: string): FairnessScoreBreakdown => {
    const user = allUsers.find(u => u.id === userId);
    const userRole = user?.role || 'researcher';
    const quotaInfo = userQuotas[userId] || { used: 0, total: user?.weeklyHoursQuota || 20, noShowCount: 0 };
    
    // Dynamic current week usage
    const weeklyUsed = bookings
      .filter(b => 
        b.userId === userId &&
        ['pending_review', 'approved', 'checked_in', 'return_pending_inspection'].includes(b.status) &&
        isWithinCurrentWeek(b.startTime)
      )
      .reduce((acc, b) => acc + b.totalHours, 0);

    const userBookings = bookings.filter(b => b.userId === userId);
    const completedReturnsCount = userBookings.filter(b => b.status === 'completed').length;
    const lateReturnsCount = userBookings.filter(b => 
      b.incidentReport?.category === 'late_return' || (b.checkOutTime && new Date(b.checkOutTime) > new Date(b.endTime))
    ).length;

    return computeFairnessScore({
      userId,
      userRole,
      weeklyHoursUsed: weeklyUsed,
      weeklyQuotaTotal: quotaInfo.total || 20,
      noShowCount: quotaInfo.noShowCount || 0,
      completedReturnsCount,
      lateReturnsCount,
      projectGrantCode: grantCode
    });
  };

  // Promote the highest scoring waitlisted candidate with NO overlap against active blocking bookings
  const promoteWaitlistSlot = (resourceId: string, justFreedBookingId?: string) => {
    // 1. Identify candidate from current state
    const candidates = bookings.filter(b => b.resourceId === resourceId && b.status === 'waitlisted');
    if (candidates.length === 0) return;

    // Active blocking reservations
    const blocking = bookings.filter(b => 
      b.resourceId === resourceId && 
      b.id !== justFreedBookingId && 
      BLOCKING_STATUSES.includes(b.status)
    );

    // Sort candidates by fairness score descending, then createdAt ascending
    const sortedCandidates = [...candidates].sort((a, b) => {
      const scoreDiff = (b.fairnessScore || 50) - (a.fairnessScore || 50);
      if (scoreDiff !== 0) return scoreDiff;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    // Find first candidate whose time window has zero conflict with blocking reservations
    const eligibleCandidate = sortedCandidates.find(cand => 
      !blocking.some(b => doIntervalsOverlap(cand.startTime, cand.endTime, b.startTime, b.endTime))
    );

    if (!eligibleCandidate) return;

    const res = resources.find(r => r.id === resourceId);
    const depAmt = res?.depositAmount || 0;

    // Deduct deposit for promoted candidate outside updater
    if (depAmt > 0) {
      setUserDeposits(deposits => {
        const u = deposits[eligibleCandidate.userId];
        if (!u) return deposits;
        return {
          ...deposits,
          [eligibleCandidate.userId]: {
            ...u,
            balance: Math.max(0, u.balance - depAmt),
            held: u.held + depAmt
          }
        };
      });
    }

    addNotification(
      eligibleCandidate.userId,
      'waitlist_promoted',
      'Slot Available: ' + eligibleCandidate.resourceName,
      `Your reservation request #${eligibleCandidate.id.slice(-6)} was promoted from waitlist to active review (Priority Score: ${eligibleCandidate.fairnessScore}).`,
      eligibleCandidate.id
    );

    addAuditEntry({
      bookingId: eligibleCandidate.id,
      resourceId,
      resourceName: eligibleCandidate.resourceName,
      actorId: 'system_fairness_scheduler',
      actorName: 'Explainable Fair-Allocation Engine',
      actorRole: 'system',
      actionType: 'WAITLISTED',
      summary: `Waitlisted booking #${eligibleCandidate.id.slice(-6)} promoted to pending review. Evaluated score: ${eligibleCandidate.fairnessScore}/100.`,
      details: { promotedCandidate: eligibleCandidate.userName, score: eligibleCandidate.fairnessScore }
    });

    // Pure functional state update for bookings
    setBookings(prev => {
      let currentWaitlistRank = 1;
      return prev.map(b => {
        if (b.id === eligibleCandidate.id) {
          return {
            ...b,
            status: 'pending_review' as BookingStatus,
            depositHeld: depAmt,
            depositRefunded: false,
            waitlistPosition: undefined
          };
        }
        if (b.resourceId === resourceId && b.status === 'waitlisted') {
          return {
            ...b,
            waitlistPosition: currentWaitlistRank++
          };
        }
        return b;
      });
    });
  };


  // Re-derive resource status dynamically
  const recomputeResourceStatuses = (updatedBookings: Booking[], updatedResources: ResourceListing[]): ResourceListing[] => {
    const now = new Date();
    return updatedResources.map(r => {
      // If manually set to maintenance, keep maintenance
      if (r.status === 'maintenance') return r;

      const activeBooking = updatedBookings.find(b => 
        b.resourceId === r.id && 
        b.status === 'checked_in'
      );
      if (activeBooking) return { ...r, status: 'in_use' };

      const reservedNow = updatedBookings.find(b => 
        b.resourceId === r.id && 
        (b.status === 'approved' || b.status === 'return_pending_inspection') &&
        new Date(b.startTime) <= now && new Date(b.endTime) >= now
      );
      if (reservedNow) return { ...r, status: 'reserved' };

      return { ...r, status: 'available' };
    });
  };

  // 1. Submit Resource Listing (Verified Owners only)
  const addResource = (listing: Omit<ResourceListing, 'id' | 'ownerId' | 'ownerName' | 'ownerRole' | 'totalHoursSharedThisMonth' | 'currentBookingsCount'>): { success: boolean; message: string } => {
    if (currentUser.role !== 'lab_manager' && currentUser.role !== 'institution_admin') {
      return { 
        success: false, 
        message: 'Access Restricted: Only verified facility owners and lab managers can publish new resources to the commons.' 
      };
    }

    const id = `res_${Date.now()}`;
    const newListing: ResourceListing = {
      ...listing,
      id,
      ownerId: currentUser.id,
      ownerName: currentUser.name,
      ownerRole: currentUser.role === 'institution_admin' ? 'Consortium Administrator' : 'Laboratory Director',
      totalHoursSharedThisMonth: 0,
      currentBookingsCount: 0
    };

    setResources(prev => [newListing, ...prev]);

    addAuditEntry({
      resourceId: id,
      resourceName: listing.name,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      actionType: 'RESOURCE_LISTED',
      summary: `New resource listed: ${listing.name} (${listing.modelCode}) by ${currentUser.name}.`,
      details: { 
        hourlyRate: listing.hourlyRate, 
        deposit: listing.depositAmount, 
        mandatoryCert: listing.requirements.qualificationName 
      }
    });

    return { success: true, message: 'Resource successfully listed in the commons.' };
  };

  // 2. Submit Booking Request
  const submitBookingRequest = (params: {
    resourceId: string;
    startTime: string;
    endTime: string;
    totalHours: number;
    purposeDescription: string;
    projectGrantCode?: string;
    supervisionRequested: boolean;
  }): { success: boolean; message: string; waitlisted?: boolean; bookingId?: string } => {
    const resource = resources.find(r => r.id === params.resourceId);
    if (!resource) return { success: false, message: 'Resource not found' };

    // Enforce maintenance status
    if (resource.status === 'maintenance') {
      return { 
        success: false, 
        message: 'Booking Denied: Resource is currently offline for scheduled maintenance or repairs.' 
      };
    }

    // Past-time check
    if (new Date(params.startTime).getTime() <= Date.now()) {
      return { 
        success: false, 
        message: 'Invalid Time: Reservation start time must be in the future.' 
      };
    }

    const req = resource.requirements;
    const userQual = currentUser.qualifications.find(q => q.id === req.qualificationId);
    const hasQual = userQual && userQual.verified;
    const isQualExpired = userQual ? new Date(userQual.expiryDate).getTime() < Date.now() : false;

    // Check mandatory supervision
    if (req.supervisionRequired && !params.supervisionRequested) {
      return {
        success: false,
        message: `Mandatory Supervision: Due to delicate optics/calibration, this resource requires Staff Supervision (+$${req.supervisionFee || 25}).`
      };
    }

    // Eligibility check with strict bypass rules
    if (req.mandatory) {
      if (req.qualificationId !== 'none') {
        if (!hasQual || isQualExpired) {
          if (!req.allowSupervisedBypass) {
            return {
              success: false,
              message: `Access Denied: This facility strictly requires active, verified "${req.qualificationName}". Supervised bypass is not permitted for this cleanroom/asset.`
            };
          }
          if (!params.supervisionRequested) {
            return {
              success: false,
              message: `Missing qualification: "${req.qualificationName}". You must request Staff Supervision (+$${req.supervisionFee || 25}) to book this resource.`
            };
          }
        }
      }
    }

    // Rolling 14-day advance booking limit to prevent asset monopolisation
    const now = new Date();
    const requestedStart = new Date(params.startTime);
    const maxAdvanceLimit = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    if (requestedStart.getTime() > maxAdvanceLimit.getTime()) {
      return {
        success: false,
        message: `Advance Scheduling Limit: Reservations can only be scheduled up to 14 days in advance to prevent long-range monopolisation of high-demand institutional resources.`
      };
    }

    // Session length cap
    if (params.totalHours > req.maxConsecutiveHours) {
      return {
        success: false,
        message: `Exceeds session length: ${resource.name} is capped at ${req.maxConsecutiveHours} consecutive hours.`
      };
    }

    // Weekly user cap on THIS specific resource for the TARGET reservation week
    const userHoursOnThisResourceTargetWeek = bookings
      .filter(b => 
        b.userId === currentUser.id &&
        b.resourceId === resource.id &&
        ['pending_review', 'approved', 'checked_in', 'return_pending_inspection'].includes(b.status) &&
        isWithinSameWeek(b.startTime, params.startTime)
      )
      .reduce((sum, b) => sum + b.totalHours, 0);

    if (userHoursOnThisResourceTargetWeek + params.totalHours > req.weeklyUserCapHours) {
      return {
        success: false,
        message: `Per-Resource Cap Exceeded: You have scheduled ${userHoursOnThisResourceTargetWeek}h of your ${req.weeklyUserCapHours}h weekly cap on ${resource.name} during the target week.`
      };
    }

    // Global weekly allocation quota check for the TARGET reservation week
    const userHoursInTargetWeek = bookings
      .filter(b => 
        b.userId === currentUser.id &&
        ['pending_review', 'approved', 'checked_in', 'return_pending_inspection'].includes(b.status) &&
        isWithinSameWeek(b.startTime, params.startTime)
      )
      .reduce((sum, b) => sum + b.totalHours, 0);

    const userQuotaTotal = currentUser.weeklyHoursQuota || 20;
    if (userHoursInTargetWeek + params.totalHours > userQuotaTotal) {
      return { 
        success: false, 
        message: `Weekly Quota Exceeded: You already have ${userHoursInTargetWeek}h reserved in the target week (${params.startTime.slice(0, 10)}). Adding ${params.totalHours}h exceeds your ${userQuotaTotal}h/week limit.` 
      };
    }


    // Overlapping bookings across other resources for THIS user
    const userOverlap = bookings.find(b => 
      b.userId === currentUser.id &&
      ['approved', 'checked_in'].includes(b.status) &&
      doIntervalsOverlap(params.startTime, params.endTime, b.startTime, b.endTime)
    );

    if (userOverlap) {
      return {
        success: false,
        message: `Scheduling Conflict: You already have an active/approved reservation (#${userOverlap.id.slice(-6)} on ${userOverlap.resourceName}) during this time window.`
      };
    }

    // Check deposit escrow balance
    const depAmt = resource.depositAmount || 0;
    const userDep = userDeposits[currentUser.id] || { balance: 0, held: 0, lifetimeRefunded: 0, lifetimeDeducted: 0 };
    if (depAmt > 0 && userDep.balance < depAmt) {
      return {
        success: false,
        message: `Insufficient Deposit Escrow Balance: This resource requires a $${depAmt} security deposit held in escrow, but your balance is $${userDep.balance}. Please replenish your deposit balance.`
      };
    }

    // Check scheduling conflict against active blocking bookings on this resource
    const hasConflict = bookings.some(b => {
      if (b.resourceId !== params.resourceId) return false;
      if (!BLOCKING_STATUSES.includes(b.status)) return false;
      return doIntervalsOverlap(params.startTime, params.endTime, b.startTime, b.endTime);
    });

    const fairnessBreakdown = calculateFairnessScore(currentUser.id, params.projectGrantCode);
    const fairnessScore = fairnessBreakdown.totalScore;
    const newBookingId = `bk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    if (hasConflict) {
      // Calculate queue rank based on fair score
      const existingWaitlist = bookings.filter(b => b.resourceId === params.resourceId && b.status === 'waitlisted');
      const higherRankCount = existingWaitlist.filter(b => (b.fairnessScore || 50) >= fairnessScore).length;
      const assignedRank = higherRankCount + 1;

      const waitlistedBooking: Booking = {
        id: newBookingId,
        resourceId: resource.id,
        resourceName: resource.name,
        facilityName: resource.facilityName,
        userId: currentUser.id,
        userName: currentUser.name,
        userInstitution: currentUser.institution,
        userEmail: currentUser.email,
        startTime: params.startTime,
        endTime: params.endTime,
        totalHours: params.totalHours,
        status: 'waitlisted',
        waitlistPosition: assignedRank,
        purposeDescription: params.purposeDescription,
        projectGrantCode: params.projectGrantCode,
        supervisionRequested: params.supervisionRequested,
        supervisionFee: params.supervisionRequested ? (resource.requirements.supervisionFee || 25) : 0,
        depositHeld: 0,
        depositRefunded: false,
        fairnessScore,
        fairnessBreakdown,
        createdAt: toLocalISOString(new Date())
      };

      setBookings(prev => [waitlistedBooking, ...prev]);

      addNotification(
        currentUser.id,
        'waitlist_promoted',
        'Waitlisted: ' + resource.name,
        `Slot is reserved. You are placed at Rank #${assignedRank} based on your Priority Score of ${fairnessScore}.`,
        newBookingId
      );

      addAuditEntry({
        bookingId: newBookingId,
        resourceId: resource.id,
        resourceName: resource.name,
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        actionType: 'WAITLISTED',
        summary: `Slot conflict. Request placed on waitlist at Rank #${assignedRank} (Fair Score: ${fairnessScore}).`,
        details: { score: fairnessScore, rank: assignedRank }
      });

      return { 
        success: true, 
        waitlisted: true,
        bookingId: newBookingId,
        message: `Slot is currently reserved. You have been placed on the transparent waitlist at position #${assignedRank} based on your priority score (${fairnessScore}/100).`
      };
    }

    // Hold deposit in escrow
    if (depAmt > 0) {
      setUserDeposits(prev => {
        const existing = prev[currentUser.id] || { balance: 0, held: 0, lifetimeRefunded: 0, lifetimeDeducted: 0 };
        return {
          ...prev,
          [currentUser.id]: {
            ...existing,
            balance: Math.max(0, existing.balance - depAmt),
            held: existing.held + depAmt
          }
        };
      });
    }

    const newBooking: Booking = {
      id: newBookingId,
      resourceId: resource.id,
      resourceName: resource.name,
      facilityName: resource.facilityName,
      userId: currentUser.id,
      userName: currentUser.name,
      userInstitution: currentUser.institution,
      userEmail: currentUser.email,
      startTime: params.startTime,
      endTime: params.endTime,
      totalHours: params.totalHours,
      status: 'pending_review',
      purposeDescription: params.purposeDescription,
      projectGrantCode: params.projectGrantCode,
      supervisionRequested: params.supervisionRequested,
      supervisionFee: params.supervisionRequested ? (resource.requirements.supervisionFee || 25) : 0,
      depositHeld: depAmt,
      depositRefunded: false,
      fairnessScore,
      fairnessBreakdown,
      createdAt: toLocalISOString(new Date())
    };

    setBookings(prev => [newBooking, ...prev]);

    // Notify custodian
    addNotification(
      resource.ownerId,
      'new_request',
      'New Access Request: ' + resource.name,
      `${currentUser.name} requested ${params.totalHours} hrs. Fair score: ${fairnessScore}.`,
      newBookingId
    );

    addAuditEntry({
      bookingId: newBookingId,
      resourceId: resource.id,
      resourceName: resource.name,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      actionType: 'BOOKING_REQUESTED',
      summary: `Booking requested for ${params.totalHours} hrs. Fair Score: ${fairnessScore}. $${depAmt} deposit placed in escrow hold.`,
      details: { grantCode: params.projectGrantCode, supervision: params.supervisionRequested, score: fairnessScore }
    });

    return { 
      success: true, 
      bookingId: newBookingId,
      message: 'Booking request successfully submitted. Facility manager review pending.' 
    };
  };

  // 3. Custodian approves booking
  const approveBooking = (bookingId: string, assignedSupervisor?: string): { success: boolean; message: string } => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return { success: false, message: 'Booking not found' };

    const resource = resources.find(r => r.id === booking.resourceId);
    if (!resource) return { success: false, message: 'Resource not found' };

    // RBAC: Must be lab_manager or institution_admin
    if (currentUser.role !== 'lab_manager' && currentUser.role !== 'institution_admin') {
      return { success: false, message: 'Unauthorized: Only verified Facility Managers or Admins can approve access.' };
    }

    // Role check: Cannot approve own booking
    if (booking.userId === currentUser.id) {
      return { success: false, message: 'Security Violation: Custodians cannot approve their own reservation requests.' };
    }

    // Ownership check: must own the resource or be consortium admin
    if (currentUser.role === 'lab_manager' && resource.ownerId !== currentUser.id) {
      return { success: false, message: `Access Restricted: This resource is owned by ${resource.ownerName}. Only the designated facility owner can grant approval.` };
    }

    // Overlap guard
    const conflictingApproved = bookings.find(b => 
      b.id !== bookingId &&
      b.resourceId === booking.resourceId &&
      (b.status === 'approved' || b.status === 'checked_in') &&
      doIntervalsOverlap(booking.startTime, booking.endTime, b.startTime, b.endTime)
    );

    if (conflictingApproved) {
      return {
        success: false,
        message: `Approval Blocked: Overlaps existing reservation #${conflictingApproved.id.slice(-6)} (${conflictingApproved.userName}) from ${conflictingApproved.startTime} to ${conflictingApproved.endTime}.`
      };
    }

    const updatedBookings = bookings.map(b => {
      if (b.id === bookingId) {
        return { 
          ...b, 
          status: 'approved' as BookingStatus,
          assignedSupervisor: assignedSupervisor || (booking.supervisionRequested ? currentUser.name : undefined)
        };
      }
      return b;
    });

    setBookings(updatedBookings);
    setResources(prev => recomputeResourceStatuses(updatedBookings, prev));

    addNotification(
      booking.userId,
      'approved',
      'Booking Approved: ' + booking.resourceName,
      `Your reservation has been approved by ${currentUser.name}. Ready for digital check-in.`,
      booking.id
    );

    addAuditEntry({
      bookingId: booking.id,
      resourceId: booking.resourceId,
      resourceName: booking.resourceName,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      actionType: 'BOOKING_APPROVED',
      summary: `Booking #${booking.id.slice(-6)} approved by ${currentUser.name}. Assigned Supervisor: ${assignedSupervisor || 'None'}.`,
      details: { supervisor: assignedSupervisor, quotaRemaining: getUserQuota(booking.userId).remaining }
    });

    return { success: true, message: 'Reservation approved.' };
  };

  // 4. Reject booking
  const rejectBooking = (bookingId: string, reason: string): { success: boolean; message: string } => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return { success: false, message: 'Booking not found' };

    const resource = resources.find(r => r.id === booking.resourceId);
    if (!resource) return { success: false, message: 'Resource not found' };

    if (currentUser.role !== 'lab_manager' && currentUser.role !== 'institution_admin') {
      return { success: false, message: 'Unauthorized: Only Facility Managers or Admins can decline requests.' };
    }

    if (currentUser.role === 'lab_manager' && resource.ownerId !== currentUser.id) {
      return { success: false, message: `Access Restricted: This resource is owned by ${resource.ownerName}. Only the facility custodian can decline requests.` };
    }

    if (booking.userId === currentUser.id) {
      return { success: false, message: 'Cannot decline your own booking (use cancel instead).' };
    }

    // Refund deposit if held
    if (booking.depositHeld > 0) {
      setUserDeposits(prev => {
        const u = prev[booking.userId];
        if (!u) return prev;
        return {
          ...prev,
          [booking.userId]: {
            ...u,
            balance: u.balance + booking.depositHeld,
            held: Math.max(0, u.held - booking.depositHeld)
          }
        };
      });
    }

    const updatedBookings = bookings.map(b => {
      if (b.id === bookingId) {
        return { 
          ...b, 
          status: 'rejected' as BookingStatus,
          rejectionReason: reason,
          depositRefunded: true
        };
      }
      return b;
    });

    setBookings(updatedBookings);
    setResources(prev => recomputeResourceStatuses(updatedBookings, prev));

    addNotification(
      booking.userId,
      'rejected',
      'Request Declined: ' + booking.resourceName,
      `Reason: "${reason}". Deposit held has been released.`,
      booking.id
    );

    addAuditEntry({
      bookingId: booking.id,
      resourceId: booking.resourceId,
      resourceName: booking.resourceName,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      actionType: 'BOOKING_REJECTED',
      summary: `Booking #${booking.id.slice(-6)} declined. Reason: "${reason}".`,
      details: { reason }
    });

    // Promote waitlisted requests
    promoteWaitlistSlot(booking.resourceId, booking.id);

    return { success: true, message: 'Request declined and requester notified.' };
  };

  // 5. Cancel booking
  const cancelBooking = (bookingId: string, reason: string = 'User cancelled prior to session'): { success: boolean; message: string } => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return { success: false, message: 'Booking not found' };

    // Refund deposit held if any
    if (booking.depositHeld > 0) {
      setUserDeposits(prev => {
        const u = prev[booking.userId];
        if (!u) return prev;
        return {
          ...prev,
          [booking.userId]: {
            ...u,
            balance: u.balance + booking.depositHeld,
            held: Math.max(0, u.held - booking.depositHeld)
          }
        };
      });
    }

    const updatedBookings = bookings.map(b => {
      if (b.id === bookingId) {
        return {
          ...b,
          status: 'cancelled' as BookingStatus,
          rejectionReason: reason,
          depositRefunded: true
        };
      }
      return b;
    });

    setBookings(updatedBookings);
    setResources(prev => recomputeResourceStatuses(updatedBookings, prev));

    addAuditEntry({
      bookingId: booking.id,
      resourceId: booking.resourceId,
      resourceName: booking.resourceName,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      actionType: 'BOOKING_CANCELLED',
      summary: `Booking #${booking.id.slice(-6)} cancelled by ${currentUser.name}. Escrow released.`,
      details: { reason }
    });

    // Promote waitlist
    promoteWaitlistSlot(booking.resourceId, booking.id);

    return { success: true, message: 'Reservation successfully cancelled.' };
  };

  // 6. Extend active session
  const extendBooking = (bookingId: string, additionalHours: number): { success: boolean; message: string } => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return { success: false, message: 'Booking not found' };
    if (booking.status !== 'checked_in') return { success: false, message: 'Only active checked-in sessions can be extended.' };

    const resource = resources.find(r => r.id === booking.resourceId);
    if (!resource) return { success: false, message: 'Resource not found' };

    // Check consecutive hours cap
    if (booking.totalHours + additionalHours > resource.requirements.maxConsecutiveHours) {
      return { 
        success: false, 
        message: `Extension Denied: Total session would exceed maximum limit of ${resource.requirements.maxConsecutiveHours} consecutive hours.` 
      };
    }

    // Parse current end time and calculate new end time in local time
    const currentEnd = new Date(booking.endTime);
    const newEnd = new Date(currentEnd.getTime() + additionalHours * 60 * 60 * 1000);
    const newEndStr = toLocalISOString(newEnd);

    // Overlap guard
    const conflict = bookings.find(b => 
      b.id !== bookingId &&
      b.resourceId === booking.resourceId &&
      BLOCKING_STATUSES.includes(b.status) &&
      doIntervalsOverlap(booking.endTime, newEndStr, b.startTime, b.endTime)
    );

    if (conflict) {
      return {
        success: false,
        message: `Extension Denied: Conflicts with scheduled reservation #${conflict.id.slice(-6)} starting at ${conflict.startTime}.`
      };
    }

    setBookings(prev => prev.map(b => {
      if (b.id === bookingId) {
        return {
          ...b,
          endTime: newEndStr,
          totalHours: b.totalHours + additionalHours
        };
      }
      return b;
    }));

    addAuditEntry({
      bookingId: booking.id,
      resourceId: booking.resourceId,
      resourceName: booking.resourceName,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      actionType: 'SESSION_EXTENDED',
      summary: `Active session extended by +${additionalHours}h until ${newEndStr}.`,
      details: { additionalHours, newEndTime: newEndStr }
    });

    return { success: true, message: `Session extended by +${additionalHours} hour(s).` };
  };

  // 7. Check-in with status and time-window validation
  const checkInBooking = (
    bookingId: string, 
    report: Omit<ConditionReport, 'id' | 'bookingId' | 'type' | 'timestamp'>
  ): { success: boolean; message: string } => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return { success: false, message: 'Booking not found' };

    // Enforce approved state
    if (booking.status !== 'approved') {
      return { 
        success: false, 
        message: `Check-in Failed: Reservation must be in "approved" state (current status: ${booking.status.replace('_', ' ')}).` 
      };
    }

    // Authorization check: Borrower or Custodian
    if (booking.userId !== currentUser.id && currentUser.role !== 'lab_manager' && currentUser.role !== 'institution_admin') {
      return { 
        success: false, 
        message: `Unauthorized: Only the reservation holder (${booking.userName}) or a facility custodian can perform check-in.` 
      };
    }

    // Check-in window validation (within 30 mins before, up to 15 mins after start)
    const now = new Date();
    const scheduledStart = new Date(booking.startTime);
    const diffMinutes = (now.getTime() - scheduledStart.getTime()) / (1000 * 60);

    if (!demoIgnoreCheckInWindow) {
      if (diffMinutes < -30) {
        return {
          success: false,
          message: `Check-in Not Yet Open: Facility access opens 30 minutes before your scheduled start time (${scheduledStart.toLocaleTimeString()}). Please check in then, or enable Demo Mode in the header to bypass.`
        };
      }
      if (diffMinutes > 15) {
        return {
          success: false,
          message: `Check-in Expired: You are more than 15 minutes past your scheduled start time. This session is subject to automated release.`
        };
      }
    }

    const timestamp = toLocalISOString(now);
    const preReport: ConditionReport = {
      ...report,
      id: `cr_pre_${Date.now()}`,
      bookingId: booking.id,
      type: 'pre_checkin',
      timestamp
    };

    const updatedBookings = bookings.map(b => {
      if (b.id === bookingId) {
        return {
          ...b,
          status: 'checked_in' as BookingStatus,
          checkInTime: timestamp,
          preConditionReport: preReport
        };
      }
      return b;
    });

    setBookings(updatedBookings);
    setResources(prev => recomputeResourceStatuses(updatedBookings, prev));

    addAuditEntry({
      bookingId: booking.id,
      resourceId: booking.resourceId,
      resourceName: booking.resourceName,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      actionType: 'CHECKED_IN',
      summary: `User checked in. Baseline condition: "${report.statusRating}". Baseline runtime: ${report.hoursRuntimeLogged}h.`,
      details: { statusRating: report.statusRating, runtime: report.hoursRuntimeLogged }
    });

    return { success: true, message: 'Check-in confirmed. Session is now active.' };
  };

  // 8. Step 1 of Two-Step Return: Borrower submits return for inspection
  const submitReturnRequest = (
    bookingId: string,
    report: Omit<ConditionReport, 'id' | 'bookingId' | 'type' | 'timestamp'>
  ): { success: boolean; message: string } => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return { success: false, message: 'Booking not found' };

    // Enforce active session
    if (booking.status !== 'checked_in') {
      return { 
        success: false, 
        message: `Return Failed: Only active checked-in sessions can initiate return (current status: ${booking.status.replace('_', ' ')}).` 
      };
    }

    // Enforce authorization
    if (booking.userId !== currentUser.id && currentUser.role !== 'lab_manager' && currentUser.role !== 'institution_admin') {
      return { 
        success: false, 
        message: `Unauthorized: Only the active operator (${booking.userName}) or a facility manager can submit a return report.` 
      };
    }

    const timestamp = toLocalISOString(new Date());
    const postReport: ConditionReport = {
      ...report,
      id: `cr_post_${Date.now()}`,
      bookingId: booking.id,
      type: 'post_return',
      timestamp
    };

    const updatedBookings = bookings.map(b => {
      if (b.id === bookingId) {
        return {
          ...b,
          status: 'return_pending_inspection' as BookingStatus,
          checkOutTime: timestamp,
          postConditionReport: postReport
        };
      }
      return b;
    });

    setBookings(updatedBookings);
    setResources(prev => recomputeResourceStatuses(updatedBookings, prev));

    const resource = resources.find(r => r.id === booking.resourceId);
    if (resource) {
      addNotification(
        resource.ownerId,
        'return_submitted',
        'Return Inspection Pending: ' + booking.resourceName,
        `${currentUser.name} completed session. Please inspect condition and confirm deposit settlement.`,
        booking.id
      );
    }

    addAuditEntry({
      bookingId: booking.id,
      resourceId: booking.resourceId,
      resourceName: booking.resourceName,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      actionType: 'RETURN_SUBMITTED',
      summary: `Borrower submitted return. Meter: ${report.hoursRuntimeLogged}h. Custodian inspection pending.`,
      details: { statusRating: report.statusRating, consumablesRestocked: report.consumablesRestocked }
    });

    return { 
      success: true, 
      message: 'Return inspection submitted. Custodian verification and deposit release pending.' 
    };
  };

  // 9. Step 2 of Two-Step Return: Custodian inspects and confirms return
  const confirmReturnInspection = (params: {
    bookingId: string;
    finalRating: ConditionReport['statusRating'];
    inspectorNotes: string;
    approvedBy: string;
  }): { success: boolean; message: string } => {
    const booking = bookings.find(b => b.id === params.bookingId);
    if (!booking) return { success: false, message: 'Booking not found' };

    const resource = resources.find(r => r.id === booking.resourceId);
    if (!resource) return { success: false, message: 'Resource not found' };

    if (currentUser.role !== 'lab_manager' && currentUser.role !== 'institution_admin') {
      return { success: false, message: 'Unauthorized: Only Facility Managers or Admins can confirm return inspections.' };
    }

    // Lab manager ownership check
    if (currentUser.role === 'lab_manager' && resource.ownerId !== currentUser.id) {
      return { 
        success: false, 
        message: `Unauthorized: This equipment is owned by ${resource.ownerName}. Only the facility custodian can certify returns.` 
      };
    }

    if (booking.userId === currentUser.id) {
      return { success: false, message: 'Security Violation: Custodians cannot certify their own returns.' };
    }

    // Block if open incident exists
    if (booking.status === 'incident_flagged') {
      return { 
        success: false, 
        message: 'Inspection Blocked: An active incident report or penalty dispute is pending for this booking. Resolve the incident first.' 
      };
    }

    if (booking.status !== 'return_pending_inspection') {
      return { 
        success: false, 
        message: `Inspection Blocked: Booking is not pending return inspection (current status: ${booking.status.replace('_', ' ')}).` 
      };
    }

    const timestamp = toLocalISOString(new Date());
    const isDamaged = params.finalRating === 'damaged';

    if (isDamaged) {
      // Trigger incident workflow
      reportIncident({
        bookingId: booking.id,
        resourceId: booking.resourceId,
        severity: 'moderate',
        category: 'hardware_damage',
        description: params.inspectorNotes || 'Damage flagged during post-return custodian inspection.',
        depositDeductionAmount: booking.depositHeld
      });
      return { success: true, message: 'Damage flagged. Incident report generated for penalty review.' };
    }


    // Pristine or nominal: Release 100% deposit
    const depositToRefund = booking.depositHeld;
    if (depositToRefund > 0) {
      setUserDeposits(prev => {
        const u = prev[booking.userId];
        if (!u) return prev;
        return {
          ...prev,
          [booking.userId]: {
            ...u,
            balance: u.balance + depositToRefund,
            held: Math.max(0, u.held - depositToRefund),
            lifetimeRefunded: u.lifetimeRefunded + depositToRefund
          }
        };
      });
    }

    const settlement: DepositSettlement = {
      originalHeld: depositToRefund,
      deductedAmount: 0,
      refundedAmount: depositToRefund,
      status: 'full_refund',
      settledAt: timestamp,
      settledBy: currentUser.name,
      notes: params.inspectorNotes || 'Custodian verified pristine equipment return.'
    };

    const updatedBookings = bookings.map(b => {
      if (b.id === params.bookingId) {
        return {
          ...b,
          status: 'completed' as BookingStatus,
          depositRefunded: true,
          depositSettlement: settlement
        };
      }
      return b;
    });

    setBookings(updatedBookings);
    setResources(prev => recomputeResourceStatuses(updatedBookings, prev));

    addNotification(
      booking.userId,
      'deposit_released',
      'Return Certified & Deposit Released ($' + depositToRefund + ')',
      `Custodian ${currentUser.name} verified return condition. $${depositToRefund} refunded to your account balance.`,
      booking.id
    );

    addAuditEntry({
      bookingId: booking.id,
      resourceId: booking.resourceId,
      resourceName: booking.resourceName,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      actionType: 'RETURN_CONFIRMED',
      summary: `Custodian ${currentUser.name} confirmed clean return. Deposit $${depositToRefund} refunded.`,
      details: { rating: params.finalRating, notes: params.inspectorNotes }
    });

    // Auto-promote waitlist
    promoteWaitlistSlot(booking.resourceId, booking.id);

    return { success: true, message: 'Return certified and deposit released to user.' };
  };

  // 10. Report Incident
  const reportIncident = (params: {
    bookingId: string;
    resourceId: string;
    severity: 'minor' | 'moderate' | 'critical';
    category: 'hardware_damage' | 'calibration_loss' | 'uncleaned_facility' | 'late_return' | 'safety_violation';
    description: string;
    depositDeductionAmount: number;
  }) => {
    const booking = bookings.find(b => b.id === params.bookingId);
    const timestamp = toLocalISOString(new Date());

    const incident: IncidentReport = {
      id: `inc_${Date.now()}`,
      bookingId: params.bookingId,
      resourceId: params.resourceId,
      resourceName: booking?.resourceName || 'Resource',
      reportedBy: currentUser.name,
      reporterRole: currentUser.role,
      timestamp,
      severity: params.severity,
      category: params.category,
      description: params.description,
      depositDeductionAmount: params.depositDeductionAmount,
      status: 'under_investigation'
    };

    const updatedBookings = bookings.map(b => {
      if (b.id === params.bookingId) {
        return {
          ...b,
          status: 'incident_flagged' as BookingStatus,
          incidentReport: incident
        };
      }
      return b;
    });

    setBookings(updatedBookings);

    if (params.severity === 'critical') {
      setResources(prev => prev.map(r => {
        if (r.id === params.resourceId) {
          return { ...r, status: 'maintenance' };
        }
        return r;
      }));
    }

    addAuditEntry({
      bookingId: params.bookingId,
      resourceId: params.resourceId,
      resourceName: booking?.resourceName || 'Resource',
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      actionType: 'INCIDENT_REPORTED',
      summary: `Incident flagged [${params.severity.toUpperCase()}]: ${params.category.replace('_', ' ')}. Proposed hold: $${params.depositDeductionAmount}.`,
      details: { description: params.description, reporter: currentUser.name }
    });
  };

  // 11. Custodian resolves incident & settles penalty
  const resolveIncident = (params: {
    incidentId: string;
    resolutionNotes: string;
    finalDepositDeduction: number;
    restoreToService: boolean;
  }): { success: boolean; message: string } => {
    const targetBooking = bookings.find(b => b.incidentReport?.id === params.incidentId);
    if (!targetBooking) return { success: false, message: 'Incident not found' };

    const resource = resources.find(r => r.id === targetBooking.resourceId);

    if (currentUser.role !== 'lab_manager' && currentUser.role !== 'institution_admin') {
      return { success: false, message: 'Unauthorized: Only Facility Custodians or Admins can resolve incidents.' };
    }

    // Ownership check: if lab manager, must be the owner of the resource
    if (currentUser.role === 'lab_manager' && resource && resource.ownerId !== currentUser.id) {
      return { 
        success: false, 
        message: `Access Restricted: This resource is owned by ${resource.ownerName}. Only the designated custodian or a Compliance Admin can settle incidents.` 
      };
    }

    if (targetBooking.userId === currentUser.id) {
      return { success: false, message: 'Security Restriction: You cannot adjudicate incidents involving your own reservation.' };
    }

    const timestamp = toLocalISOString(new Date());
    const originalDeposit = targetBooking.depositHeld;
    const finalDeduction = Math.min(originalDeposit, Math.max(0, params.finalDepositDeduction));
    const refundToUser = Math.max(0, originalDeposit - finalDeduction);

    // Delta-based accounting on re-resolution / appeals to prevent duplicate refunds
    const alreadyRefunded = targetBooking.depositSettlement?.refundedAmount ?? 0;
    const alreadyDeducted = targetBooking.depositSettlement?.deductedAmount ?? 0;
    const wasHeldReleased = targetBooking.depositSettlement !== undefined;

    const deltaRefund = refundToUser - alreadyRefunded;
    const deltaDeducted = finalDeduction - alreadyDeducted;
    const heldReduction = wasHeldReleased ? 0 : originalDeposit;

    // Ledger accounting (delta adjusted)
    setUserDeposits(prev => {
      const existing = prev[targetBooking.userId];
      if (!existing) return prev;
      return {
        ...prev,
        [targetBooking.userId]: {
          ...existing,
          balance: existing.balance + deltaRefund,
          held: Math.max(0, existing.held - heldReduction),
          lifetimeDeducted: Math.max(0, existing.lifetimeDeducted + deltaDeducted),
          lifetimeRefunded: Math.max(0, existing.lifetimeRefunded + deltaRefund)
        }
      };
    });

    const settlement: DepositSettlement = {
      originalHeld: originalDeposit,
      deductedAmount: finalDeduction,
      refundedAmount: refundToUser,
      status: finalDeduction === 0 ? 'full_refund' : refundToUser === 0 ? 'full_forfeit' : 'partial_deduction',
      settledAt: timestamp,
      settledBy: currentUser.name,
      notes: params.resolutionNotes
    };


    const updatedBookings = bookings.map(b => {
      if (b.incidentReport?.id === params.incidentId) {
        return {
          ...b,
          status: 'completed' as BookingStatus,
          depositRefunded: refundToUser > 0,
          depositSettlement: settlement,
          incidentReport: {
            ...b.incidentReport,
            status: 'resolved' as const,
            resolutionNotes: params.resolutionNotes,
            depositDeductionAmount: finalDeduction,
            resolvedAt: timestamp,
            resolvedBy: currentUser.name
          }
        };
      }
      return b;
    });

    setBookings(updatedBookings);

    setResources(prev => {
      const updated = prev.map(r => {
        if (r.id === targetBooking.resourceId && params.restoreToService) {
          return { ...r, status: 'available' as const };
        }
        return r;
      });
      return recomputeResourceStatuses(updatedBookings, updated);
    });

    addNotification(
      targetBooking.userId,
      'approved',
      'Incident Resolved & Deposit Settled',
      `Custodian ${currentUser.name} settled penalty. Deducted: $${finalDeduction}, Refunded: $${refundToUser}. Notes: "${params.resolutionNotes}".`,
      targetBooking.id
    );

    addAuditEntry({
      bookingId: targetBooking.id,
      resourceId: targetBooking.resourceId,
      resourceName: targetBooking.resourceName,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      actionType: 'CONFLICT_RESOLVED',
      summary: `Incident settled by ${currentUser.name}. Deducted: $${finalDeduction}, Refunded: $${refundToUser}.`,
      details: { deduction: finalDeduction, refunded: refundToUser, notes: params.resolutionNotes }
    });

    // Auto-promote waitlist
    promoteWaitlistSlot(targetBooking.resourceId, targetBooking.id);

    return { success: true, message: 'Incident penalty settled and deposit ledger updated.' };
  };

  // 12. Borrower contests penalty
  const contestIncident = (incidentId: string, reason: string): { success: boolean; message: string } => {
    const targetBooking = bookings.find(b => b.incidentReport?.id === incidentId);
    if (!targetBooking) return { success: false, message: 'Incident not found' };

    const timestamp = toLocalISOString(new Date());

    setBookings(prev => prev.map(b => {
      if (b.incidentReport?.id === incidentId) {
        return {
          ...b,
          incidentReport: {
            ...b.incidentReport,
            status: 'escalated',
            contestedReason: reason,
            escalatedAt: timestamp
          }
        };
      }
      return b;
    }));

    // Alert compliance admin Sophia Chen
    const adminUser = allUsers.find(u => u.role === 'institution_admin');
    if (adminUser) {
      addNotification(
        adminUser.id,
        'incident_contested',
        'Contested Incident Penalty: ' + targetBooking.resourceName,
        `${targetBooking.userName} has contested an assessed penalty. Institutional review requested.`,
        targetBooking.id
      );
    }

    addAuditEntry({
      bookingId: targetBooking.id,
      resourceId: targetBooking.resourceId,
      resourceName: targetBooking.resourceName,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      actionType: 'INCIDENT_ESCALATED',
      summary: `Borrower ${currentUser.name} contested penalty. Escalated to Consortium Compliance Admin.`,
      details: { contestReason: reason }
    });

    return { success: true, message: 'Penalty contested and escalated to Consortium Compliance Admin.' };
  };

  // 13. Admin Qualification Verification Queue Handlers
  const submitVerificationRequest = (params: {
    qualificationId: string;
    qualificationName: string;
    level: string;
    issuingInstitution: string;
    documentRef: string;
  }): { success: boolean; message: string } => {
    const newReq: QualificationVerificationRequest = {
      id: `vr_${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userInstitution: currentUser.institution,
      ...params,
      submittedAt: toLocalISOString(new Date()),
      status: 'pending'
    };

    setVerificationRequests(prev => [newReq, ...prev]);

    // Notify admin
    const adminUser = allUsers.find(u => u.role === 'institution_admin');
    if (adminUser) {
      addNotification(
        adminUser.id,
        'new_request',
        'New Credential Submitted: ' + params.qualificationName,
        `${currentUser.name} submitted safety credential for verification.`,
        newReq.id
      );
    }

    addAuditEntry({
      resourceId: 'compliance_hub',
      resourceName: 'Consortium Qualification Registry',
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      actionType: 'ELIGIBILITY_SUBMITTED',
      summary: `${currentUser.name} submitted documentation for "${params.qualificationName}". Compliance review pending.`,
      details: { docRef: params.documentRef, level: params.level }
    });

    return { success: true, message: 'Credential submitted to compliance queue for verification.' };
  };

  const approveVerificationRequest = (requestId: string, notes: string = 'Verified against Institutional Safety Registry.'): { success: boolean; message: string } => {
    if (currentUser.role !== 'institution_admin') {
      return { success: false, message: 'Unauthorized: Only Consortium Compliance Admins can approve safety credentials.' };
    }

    const targetReq = verificationRequests.find(r => r.id === requestId);
    if (!targetReq) return { success: false, message: 'Request not found' };

    if (targetReq.userId === currentUser.id) {
      return { success: false, message: 'Self-approval of credentials is prohibited.' };
    }

    const timestamp = toLocalISOString(new Date());

    setVerificationRequests(prev => prev.map(r => 
      r.id === requestId ? { ...r, status: 'verified', adminNotes: notes, reviewedBy: currentUser.name, reviewedAt: timestamp } : r
    ));

    // Update user qualifications in allUsers
    setAllUsers(prev => prev.map(u => {
      if (u.id === targetReq.userId) {
        const existingIdx = u.qualifications.findIndex(q => q.id === targetReq.qualificationId);
        const newQual = {
          id: targetReq.qualificationId,
          name: targetReq.qualificationName,
          issuingInstitution: targetReq.issuingInstitution,
          level: targetReq.level,
          expiryDate: '2028-12-31',
          verified: true
        };

        const updatedQuals = existingIdx >= 0 
          ? u.qualifications.map((q, idx) => idx === existingIdx ? newQual : q)
          : [...u.qualifications, newQual];

        return { ...u, qualifications: updatedQuals };
      }
      return u;
    }));

    addNotification(
      targetReq.userId,
      'approved',
      'Credential Approved: ' + targetReq.qualificationName,
      `Admin ${currentUser.name} verified your qualification. Unescorted access is now unlocked!`,
      targetReq.id
    );

    addAuditEntry({
      resourceId: 'compliance_hub',
      resourceName: 'Consortium Qualification Registry',
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      actionType: 'QUALIFICATION_VERIFIED',
      summary: `Admin ${currentUser.name} approved credential "${targetReq.qualificationName}" for ${targetReq.userName}.`,
      details: { reqId: requestId, notes }
    });

    return { success: true, message: `Credential approved for ${targetReq.userName}.` };
  };

  const rejectVerificationRequest = (requestId: string, reason: string): { success: boolean; message: string } => {
    if (currentUser.role !== 'institution_admin') {
      return { success: false, message: 'Unauthorized: Only Consortium Compliance Admins can reject safety credentials.' };
    }

    const targetReq = verificationRequests.find(r => r.id === requestId);
    if (!targetReq) return { success: false, message: 'Request not found' };

    if (targetReq.userId === currentUser.id) {
      return { success: false, message: 'Cannot decline own credential.' };
    }

    const timestamp = toLocalISOString(new Date());

    setVerificationRequests(prev => prev.map(r => 
      r.id === requestId ? { ...r, status: 'rejected', adminNotes: reason, reviewedBy: currentUser.name, reviewedAt: timestamp } : r
    ));

    addNotification(
      targetReq.userId,
      'rejected',
      'Credential Declined: ' + targetReq.qualificationName,
      `Reason: "${reason}". Contact the compliance office for guidance.`,
      targetReq.id
    );

    addAuditEntry({
      resourceId: 'compliance_hub',
      resourceName: 'Consortium Qualification Registry',
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      actionType: 'QUALIFICATION_REJECTED',
      summary: `Admin ${currentUser.name} declined credential "${targetReq.qualificationName}" for ${targetReq.userName}. Reason: "${reason}".`,
      details: { reqId: requestId, reason }
    });

    return { success: true, message: 'Credential submission declined.' };
  };

  // 14. Automated 15-Minute Rule & Overdue Monitor
  const simulateTimeAdvanceCheck = () => {
    let autoCancelledCount = 0;
    let overdueCount = 0;
    const now = new Date();

    setBookings(prev => {
      let updated = [...prev];

      updated = updated.map(b => {
        // Auto-cancel approved bookings missed by > 15 mins
        if (b.status === 'approved') {
          const startTime = new Date(b.startTime);
          const diffMinutes = (now.getTime() - startTime.getTime()) / (1000 * 60);

          if (diffMinutes > 15) {
            autoCancelledCount++;
            
            // Record no-show penalty in quota ledger
            setUserQuotas(quotas => {
              const u = quotas[b.userId] || { used: 0, total: 20, noShowCount: 0 };
              return {
                ...quotas,
                [b.userId]: {
                  ...u,
                  noShowCount: u.noShowCount + 1
                }
              };
            });

            // Refund held deposit
            if (b.depositHeld > 0) {
              setUserDeposits(deposits => {
                const u = deposits[b.userId];
                if (!u) return deposits;
                return {
                  ...deposits,
                  [b.userId]: {
                    ...u,
                    balance: u.balance + b.depositHeld,
                    held: Math.max(0, u.held - b.depositHeld)
                  }
                };
              });
            }

            addNotification(
              b.userId,
              'auto_cancelled',
              'Auto-Cancelled: Missed 15-Min Check-In',
              `Your reservation for ${b.resourceName} was automatically cancelled because check-in was not logged within 15 minutes of scheduled start. Slot released.`,
              b.id
            );

            // Notify facility owner
            const res = resources.find(r => r.id === b.resourceId);
            if (res) {
              addNotification(
                res.ownerId,
                'auto_cancelled',
                'No-Show Auto-Cancelled: ' + b.resourceName,
                `${b.userName} missed the 15-minute check-in grace period. Slot was auto-released to waitlist.`,
                b.id
              );
            }

            addAuditEntry({
              bookingId: b.id,
              resourceId: b.resourceId,
              resourceName: b.resourceName,
              actorId: 'system_auto_scheduler',
              actorName: '15-Minute Release Monitor',
              actorRole: 'system',
              actionType: 'AUTO_CANCELLED_NO_SHOW',
              summary: `Reservation #${b.id.slice(-6)} auto-cancelled. Missed 15-min check-in window. Slot released.`,
              details: { missedTime: b.startTime, penaltyApplied: true }
            });

            return {
              ...b,
              status: 'cancelled' as BookingStatus,
              rejectionReason: 'Auto-cancelled: Operator missed 15-minute check-in grace period.',
              depositRefunded: true
            };
          }
        }

        // Overdue returns alert
        if (b.status === 'checked_in') {
          const endTime = new Date(b.endTime);
          if (now.getTime() > endTime.getTime()) {
            overdueCount++;
            
            addNotification(
              b.userId,
              'overdue_alert',
              'Overdue Return Alert: ' + b.resourceName,
              `Your scheduled session ended at ${endTime.toLocaleTimeString()}. Equipment must be returned immediately.`,
              b.id
            );

            const res = resources.find(r => r.id === b.resourceId);
            if (res) {
              addNotification(
                res.ownerId,
                'overdue_alert',
                'Overdue Equipment Alert: ' + b.resourceName,
                `${b.userName}'s session ended at ${endTime.toLocaleTimeString()} and has not been returned.`,
                b.id
              );
            }
          }
        }

        return b;
      });

      // Promote waitlist for any auto-cancelled resources
      const cancelledIds = updated.filter(b => b.status === 'cancelled').map(b => b.resourceId);
      const uniqueResIds = Array.from(new Set(cancelledIds));
      uniqueResIds.forEach(resId => {
        setTimeout(() => promoteWaitlistSlot(resId), 50);
      });

      return updated;
    });

    const msg = `Scan complete: ${autoCancelledCount} missed reservations auto-released, ${overdueCount} overdue sessions flagged.`;
    return { autoCancelledCount, overdueCount, message: msg };
  };

  // 15. Reset to fresh demo defaults relative to current time
  const resetToDemoDefaults = () => {
    localStorage.clear();
    setAllUsers(SEED_USERS);
    setCurrentUserState(SEED_USERS[0]);
    setResources(SEED_RESOURCES);
    setBookings(generateFreshSeedBookings());
    setAuditLogs(generateFreshSeedAudits());
    setNotifications(generateFreshNotifications());
    setVerificationRequests(generateFreshVerificationRequests());
    setUserQuotas(INITIAL_USER_QUOTAS);
    setUserDeposits(INITIAL_USER_DEPOSITS);
    setActiveTab('catalog');
  };

  const unreadNotificationsCount = notifications.filter(n => n.userId === currentUser.id && !n.read).length;

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const clearAllNotifications = () => {
    setNotifications(prev => prev.map(n => n.userId === currentUser.id ? { ...n, read: true } : n));
  };

  return (
    <AppContext.Provider value={{
      currentUser,
      allUsers,
      setCurrentUser,
      resources,
      bookings,
      auditLogs,
      notifications,
      verificationRequests,
      fairUsageConfig: INITIAL_FAIR_USAGE_CONFIG,
      activeTab,
      setActiveTab,
      selectedResourceIdForModal,
      setSelectedResourceIdForModal,
      isCreateListingOpen,
      setIsCreateListingOpen,
      demoIgnoreCheckInWindow,
      setDemoIgnoreCheckInWindow,
      userQuotas,
      userDeposits,
      getUserQuota,
      calculateFairnessScore,
      unreadNotificationsCount,
      markNotificationAsRead,
      clearAllNotifications,
      addResource,
      submitBookingRequest,
      approveBooking,
      rejectBooking,
      cancelBooking,
      extendBooking,
      checkInBooking,
      submitReturnRequest,
      confirmReturnInspection,
      reportIncident,
      resolveIncident,
      contestIncident,
      submitVerificationRequest,
      approveVerificationRequest,
      rejectVerificationRequest,
      simulateTimeAdvanceCheck,
      resetToDemoDefaults
    }}>
      {children}
    </AppContext.Provider>
  );

};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
