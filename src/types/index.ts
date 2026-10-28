/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ResourceCategory = 'equipment' | 'space' | 'testing_facility' | 'fabrication_tool';

export type ResourceStatus = 'available' | 'in_use' | 'reserved' | 'maintenance';

export type BookingStatus = 
  | 'pending_review' 
  | 'approved' 
  | 'rejected' 
  | 'waitlisted' 
  | 'checked_in' 
  | 'return_pending_inspection' // Two-step return: User submitted, custodian inspection pending
  | 'completed' 
  | 'cancelled'
  | 'incident_flagged';

export interface Qualification {
  id: string;
  name: string;
  issuingInstitution: string;
  level: string;
  expiryDate: string; // YYYY-MM-DD
  verified: boolean;
}

export interface QualificationVerificationRequest {
  id: string;
  userId: string;
  userName: string;
  userInstitution: string;
  qualificationId: string;
  qualificationName: string;
  level: string;
  issuingInstitution: string;
  submittedAt: string;
  status: 'pending' | 'verified' | 'rejected';
  documentRef: string;
  adminNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'researcher' | 'lab_manager' | 'institution_admin';
  institution: string;
  department: string;
  avatarInitials: string;
  qualifications: Qualification[];
  weeklyHoursQuota: number;
}

export interface FairnessScoreBreakdown {
  base: number;
  grantBonus: number;
  lowUsageBonus: number;
  promptHistoryBonus: number;
  penalty: number;
  totalScore: number;
  justificationSummary: string;
}

export interface ResourceRequirement {
  qualificationId: string;
  qualificationName: string;
  mandatory: boolean;
  minLevel?: string;
  supervisionRequired: boolean;
  allowSupervisedBypass?: boolean; // If true, an unqualified user can request with staff supervisor
  supervisionFee?: number;
  depositRequiredAmount: number;
  maxConsecutiveHours: number;
  weeklyUserCapHours: number;
}

export interface ConditionReport {
  id: string;
  bookingId: string;
  type: 'pre_checkin' | 'post_return';
  timestamp: string;
  inspectorName: string;
  inspectorRole: 'user' | 'owner' | 'lab_technician';
  statusRating: 'pristine' | 'nominal_wear' | 'minor_issue' | 'damaged';
  checklistItems: {
    label: string;
    passed: boolean;
    notes?: string;
    defectNote?: string;
  }[];
  hoursRuntimeLogged?: number;
  consumablesRestocked?: boolean;
  notes: string;
  photoUrl?: string; // Data URL or reference
  signature: string;
}

export interface IncidentReport {
  id: string;
  bookingId: string;
  resourceId: string;
  resourceName: string;
  reportedBy: string;
  reporterRole: string;
  timestamp: string;
  severity: 'minor' | 'moderate' | 'critical';
  category: 'hardware_damage' | 'calibration_loss' | 'uncleaned_facility' | 'late_return' | 'safety_violation';
  description: string;
  depositDeductionAmount: number;
  status: 'under_investigation' | 'resolved' | 'escalated';
  resolutionNotes?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  contestedReason?: string;
  escalatedAt?: string;
}

export interface DepositSettlement {
  originalHeld: number;
  deductedAmount: number;
  refundedAmount: number;
  status: 'full_refund' | 'partial_deduction' | 'full_forfeit' | 'held_pending';
  settledAt?: string;
  settledBy?: string;
  notes?: string;
}

export interface Booking {
  id: string;
  resourceId: string;
  resourceName: string;
  facilityName: string;
  userId: string;
  userName: string;
  userInstitution: string;
  userEmail: string;
  startTime: string; // Local ISO YYYY-MM-DDTHH:mm:00
  endTime: string;   // Local ISO YYYY-MM-DDTHH:mm:00
  totalHours: number;
  status: BookingStatus;
  purposeDescription: string;
  projectGrantCode?: string;
  supervisionRequested: boolean;
  supervisionFee?: number;
  assignedSupervisor?: string;
  waitlistPosition?: number;
  rejectionReason?: string;
  depositHeld: number;
  depositRefunded: boolean;
  depositSettlement?: DepositSettlement;
  createdAt: string;
  checkInTime?: string;
  checkOutTime?: string;
  fairnessScore?: number;
  fairnessBreakdown?: FairnessScoreBreakdown;
  preConditionReport?: ConditionReport;
  postConditionReport?: ConditionReport;
  incidentReport?: IncidentReport;
}

export interface ResourceListing {
  id: string;
  name: string;
  modelCode: string;
  category: ResourceCategory;
  institution: string;
  facilityName: string;
  roomNumber: string;
  ownerId: string;
  ownerName: string;
  ownerRole: string;
  description: string;
  specifications: Record<string, string>;
  status: ResourceStatus;
  requirements: ResourceRequirement;
  usageRules: string[];
  hourlyRate: number; // 0 for free/institutional credit
  currency: string;
  depositAmount: number;
  currentRuntimeHours: number; // Current meter baseline
  iconType: 'microscope' | 'cnc' | 'cleanroom' | 'camera' | 'spectrometer' | 'laser';
  estimatedReplacementValue: string;
  totalHoursSharedThisMonth: number;
  currentBookingsCount: number;
  availabilityWindows?: {
    days: string[];
    hours: string;
  };
}

export interface AppNotification {
  id: string;
  userId: string;
  type: 
    | 'approved' 
    | 'rejected' 
    | 'new_request'
    | 'waitlist_promoted' 
    | 'overdue_alert' 
    | 'auto_cancelled' 
    | 'incident' 
    | 'incident_contested'
    | 'deposit_released'
    | 'return_submitted'
    | 'return_confirmed';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  relatedBookingId?: string;
}

export interface AuditLogEntry {
  id: string;
  bookingId?: string; // Links this action directly to a transaction timeline
  timestamp: string;
  resourceId: string;
  resourceName: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  actionType: 
    | 'RESOURCE_LISTED'
    | 'ELIGIBILITY_SUBMITTED'
    | 'ELIGIBILITY_VERIFIED'
    | 'QUALIFICATION_VERIFIED'
    | 'QUALIFICATION_REJECTED'
    | 'BOOKING_REQUESTED'
    | 'BOOKING_APPROVED'
    | 'BOOKING_REJECTED'
    | 'BOOKING_CANCELLED'
    | 'SESSION_EXTENDED'
    | 'WAITLISTED'
    | 'CHECKED_IN'
    | 'BASELINE_CONDITION_LOGGED'
    | 'RETURN_SUBMITTED'
    | 'RETURN_CONFIRMED'
    | 'FINAL_CONDITION_LOGGED'
    | 'INCIDENT_REPORTED'
    | 'INCIDENT_ESCALATED'
    | 'DEPOSIT_PROCESSED'
    | 'CONFLICT_RESOLVED'
    | 'AUTO_CANCELLED_NO_SHOW'
    | 'OVERDUE_ALERT';
  summary: string;
  details?: Record<string, any>;
  previousHash?: string; // Hash chain link
  integrityHash: string; // SHA-256 canonical digest
}
