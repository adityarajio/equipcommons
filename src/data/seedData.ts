/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  ResourceListing, 
  UserProfile, 
  Booking, 
  AuditLogEntry, 
  AppNotification, 
  QualificationVerificationRequest 
} from '../types';
import { at, atMinutes } from '../utils/dateUtils';
import { computeAuditHash, GENESIS_HASH } from '../utils/cryptoUtils';
import { computeFairnessScore } from '../utils/fairness';


export const INITIAL_USER_QUOTAS: Record<string, { used: number; total: number; noShowCount: number }> = {
  user_elena_rostova: { used: 7, total: 20, noShowCount: 0 }, // 4h cleanroom + 3h FE-SEM
  user_david_kim: { used: 4, total: 15, noShowCount: 0 },     // 4h Haas CNC
  user_marcus_vance: { used: 0, total: 40, noShowCount: 0 },
  user_arthur_pendelton: { used: 0, total: 40, noShowCount: 0 },
  user_sophia_chen: { used: 0, total: 40, noShowCount: 0 }
};

export const INITIAL_USER_DEPOSITS: Record<string, { balance: number; held: number; lifetimeRefunded: number; lifetimeDeducted: number }> = {
  user_elena_rostova: { balance: 600, held: 400, lifetimeRefunded: 150, lifetimeDeducted: 0 }, // $250 cleanroom + $150 FE-SEM held
  user_david_kim: { balance: 300, held: 200, lifetimeRefunded: 0, lifetimeDeducted: 0 },     // $200 Haas CNC held
  user_marcus_vance: { balance: 1000, held: 0, lifetimeRefunded: 0, lifetimeDeducted: 0 },
  user_arthur_pendelton: { balance: 1000, held: 0, lifetimeRefunded: 0, lifetimeDeducted: 0 },
  user_sophia_chen: { balance: 2000, held: 0, lifetimeRefunded: 0, lifetimeDeducted: 0 }
};

export const SEED_USERS: UserProfile[] = [
  {
    id: 'user_elena_rostova',
    name: 'Dr. Elena Rostova',
    email: 'e.rostova@tech-consortium.edu',
    role: 'researcher',
    institution: 'University Nanotechnology Center',
    department: 'Advanced Materials & Bio-MEMS',
    avatarInitials: 'ER',
    qualifications: [
      {
        id: 'cert_sem_l3',
        name: 'Field Emission SEM Operator Level 3',
        issuingInstitution: 'Nanofab Alliance',
        level: 'Independent Operator',
        expiryDate: '2027-12-31',
        verified: true,
      },
      {
        id: 'cert_cleanroom_iso6',
        name: 'ISO Class 6 Cleanroom Protocol & Gowning',
        issuingInstitution: 'Consortium Safety Board',
        level: 'Full Unescorted Access',
        expiryDate: '2027-06-30',
        verified: true,
      },
      {
        id: 'cert_laser_l2',
        name: 'Class 4 Laser Safety & Optical Alignment',
        issuingInstitution: 'State Radiation & Photonics Board',
        level: 'Certified Technician',
        expiryDate: '2028-03-15',
        verified: true,
      },
      {
        id: 'cert_cnc_mill_l2',
        name: '5-Axis CNC Mill & Haas CAM Programming',
        issuingInstitution: 'Precision Prototyping Guild',
        level: 'Level 2 Machinist',
        expiryDate: '2027-10-15',
        verified: true,
      }
    ],
    weeklyHoursQuota: 20
  },
  {
    id: 'user_david_kim',
    name: 'David Kim',
    email: 'david.kim@makerspace-alliance.org',
    role: 'researcher',
    institution: 'Metro Innovation College',
    department: 'Robotics & Mechanical Fabrication',
    avatarInitials: 'DK',
    qualifications: [
      {
        id: 'cert_cnc_mill_l2',
        name: '5-Axis CNC Mill & Haas CAM Programming',
        issuingInstitution: 'Precision Prototyping Guild',
        level: 'Level 2 Machinist',
        expiryDate: '2027-11-20',
        verified: true,
      },
      {
        id: 'cert_additive_sls',
        name: 'Industrial SLS & Powder Bed Polymer Printing',
        issuingInstitution: 'Metro Makerspace Network',
        level: 'Certified Operator',
        expiryDate: '2027-08-14',
        verified: true,
      }
    ],
    weeklyHoursQuota: 15
  },
  {
    id: 'user_marcus_vance',
    name: 'Dr. Marcus Vance',
    email: 'm.vance@metro-innovation.edu',
    role: 'lab_manager',
    institution: 'Metro Innovation College',
    department: 'Advanced Prototyping & Fabrication Core',
    avatarInitials: 'MV',
    qualifications: [
      {
        id: 'cert_master_facility',
        name: 'Principal Fabrication Facility Director',
        issuingInstitution: 'National Core Facilities Council',
        level: 'Master Certifier',
        expiryDate: '2030-01-01',
        verified: true,
      }
    ],
    weeklyHoursQuota: 40
  },
  {
    id: 'user_arthur_pendelton',
    name: 'Prof. Arthur Pendelton',
    email: 'a.pendelton@nanotech-center.edu',
    role: 'lab_manager',
    institution: 'University Nanotechnology Center',
    department: 'Electron Microscopy & Cleanroom Core',
    avatarInitials: 'AP',
    qualifications: [
      {
        id: 'cert_master_cleanroom',
        name: 'Director of Cleanroom Facilities & Microanalysis',
        issuingInstitution: 'Cleanroom Governance Alliance',
        level: 'Facility Director',
        expiryDate: '2030-01-01',
        verified: true,
      }
    ],
    weeklyHoursQuota: 40
  },
  {
    id: 'user_sophia_chen',
    name: 'Sophia Chen',
    email: 's.chen@consortium-audit.org',
    role: 'institution_admin',
    institution: 'Regional Innovation Equipment Consortium',
    department: 'Equitable Access & Resource Compliance',
    avatarInitials: 'SC',
    qualifications: [
      {
        id: 'cert_compliance_auditor',
        name: 'Institutional Asset Compliance & Fair Share Auditor',
        issuingInstitution: 'Higher Ed Research Alliance',
        level: 'Lead Auditor',
        expiryDate: '2029-12-31',
        verified: true,
      }
    ],
    weeklyHoursQuota: 40
  }
];

export const SEED_RESOURCES: ResourceListing[] = [
  {
    id: 'res_sem_jeol_7800',
    name: 'Field Emission SEM (JEOL JSM-7800F)',
    modelCode: 'FE-SEM-7800F',
    category: 'equipment',
    institution: 'University Nanotechnology Center',
    facilityName: 'Electron Microscopy Core Facility',
    roomNumber: 'Nano-104B',
    ownerId: 'user_arthur_pendelton',
    ownerName: 'Prof. Arthur Pendelton',
    ownerRole: 'Cleanroom & Microscopy Director',
    description: 'Ultra-high resolution field emission scanning electron microscope with in-lens Schottky emitter. Delivers 0.8 nm resolution at 15 kV and 1.2 nm at 1 kV for sub-nanometer surface analysis and energy-dispersive X-ray spectroscopy (EDS).',
    specifications: {
      'Resolution': '0.8 nm at 15 kV / 1.2 nm at 1 kV',
      'Acceleration Voltage': '0.01 to 30 kV',
      'Magnification': '25x to 1,000,000x',
      'Detector Package': 'Lower & Upper In-Lens Detectors + Oxford EDS',
      'Vacuum System': 'Turbo-molecular + ion pump (< 10^-4 Pa)'
    },
    status: 'available',
    requirements: {
      qualificationId: 'cert_sem_l3',
      qualificationName: 'Field Emission SEM Operator Level 3',
      mandatory: true,
      minLevel: 'Independent Operator',
      supervisionRequired: false,
      allowSupervisedBypass: true,
      supervisionFee: 25,
      depositRequiredAmount: 150,
      maxConsecutiveHours: 4,
      weeklyUserCapHours: 8,
    },
    usageRules: [
      'Gold/carbon sputtering mandatory for biological or non-conductive specimens',
      'No volatile solvents, unbaked polymers, or wet biological samples in chamber',
      'Clean transfer stage with spectroscopic grade isopropanol before return',
      'Mandatory pre-check baseline optical condition log and post-run vacuum pump check'
    ],
    hourlyRate: 45,
    currency: 'USD (or Institutional Credits)',
    depositAmount: 150,
    currentRuntimeHours: 1423.5,
    iconType: 'microscope',
    estimatedReplacementValue: '$850,000',
    totalHoursSharedThisMonth: 84,
    currentBookingsCount: 2,
    availabilityWindows: {
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      hours: '08:00 - 18:00'
    }
  },
  {
    id: 'res_cnc_haas_umc500',
    name: '5-Axis CNC Machining Center (Haas UMC-500)',
    modelCode: 'HAAS-UMC-500-SS',
    category: 'fabrication_tool',
    institution: 'Metro Innovation College',
    facilityName: 'Advanced Prototyping Workshop',
    roomNumber: 'High Bay 12',
    ownerId: 'user_marcus_vance',
    ownerName: 'Dr. Marcus Vance',
    ownerRole: 'Makerspace Director',
    description: 'Universal 5-axis simultaneous vertical machining center with 40-taper spindle, high-speed tool changer, and Renishaw wireless probing system. Suitable for titanium, aluminum, and engineering plastics.',
    specifications: {
      'Travel (X/Y/Z)': '610 x 508 x 406 mm',
      'Spindle Speed': '12,000 RPM Direct-Drive',
      'Platter Diameter': '400 mm Rotary Table',
      'Tool Capacity': '30+1 Side-Mount Tool Changer',
      'Coolant': 'High-pressure through-spindle coolant system'
    },
    status: 'available',
    requirements: {
      qualificationId: 'cert_cnc_mill_l2',
      qualificationName: '5-Axis CNC Mill & Haas CAM Programming',
      mandatory: true,
      minLevel: 'Level 2 Machinist',
      supervisionRequired: false,
      allowSupervisedBypass: true,
      supervisionFee: 25,
      depositRequiredAmount: 200,
      maxConsecutiveHours: 6,
      weeklyUserCapHours: 12,
    },
    usageRules: [
      'Verify zero datum and tool offsets using Renishaw probe prior to cycle start',
      'Dry-run dry cut at 5% feedrate before full automated execution',
      'Chip containment tray must be vacuumed and coolant refractometer reading logged',
      'Report any tool bit breakage or spindle vibration anomaly immediately'
    ],
    hourlyRate: 35,
    currency: 'USD (or Institutional Credits)',
    depositAmount: 200,
    currentRuntimeHours: 842.0,
    iconType: 'cnc',
    estimatedReplacementValue: '$210,000',
    totalHoursSharedThisMonth: 112,
    currentBookingsCount: 3,
    availabilityWindows: {
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      hours: '08:00 - 20:00'
    }
  },
  {
    id: 'res_cleanroom_photolitho',
    name: 'Class 100 (ISO 5) Photolithography Bay',
    modelCode: 'ISO-5-PHOTO-BAY',
    category: 'space',
    institution: 'University Nanotechnology Center',
    facilityName: 'Cleanroom Nanofabrication Core',
    roomNumber: 'Clean Bay C-3',
    ownerId: 'user_arthur_pendelton',
    ownerName: 'Prof. Arthur Pendelton',
    ownerRole: 'Cleanroom & Microscopy Director',
    description: 'ISO Class 5 laminar flow cleanroom bay equipped with Suss MicroTec MA6 mask aligner, Laurell automated spin-coater, HMDS vapor prime oven, and hotplates for sub-micron photolithography and wafer patterning.',
    specifications: {
      'Cleanliness Class': 'ISO 5 (Class 100 laminar flow)',
      'Lithography Tool': 'Suss MicroTec MA6 (0.8 um resolution)',
      'Substrate Sizes': 'Pieces to 150mm (6-inch) Wafers',
      'Exposure Optics': 'Mercury Arc UV 365/405nm',
      'Resist Handling': 'Solvent fume exhaust benches'
    },
    status: 'in_use',
    requirements: {
      qualificationId: 'cert_cleanroom_iso6',
      qualificationName: 'ISO Class 6 Cleanroom Protocol & Gowning',
      mandatory: true,
      minLevel: 'Full Unescorted Access',
      supervisionRequired: false,
      allowSupervisedBypass: false, // Strict cleanroom: zero unescorted bypass permitted
      depositRequiredAmount: 250,
      maxConsecutiveHours: 4,
      weeklyUserCapHours: 12,
    },
    usageRules: [
      'Full bunny suit, nitrile gloves, and shoe covers required before air shower entry',
      'No paper notebooks, cardboard, or particulate-shedding materials allowed',
      'Spin coater bowl must be wiped with cyclopentanone and lined with clean foil',
      'Waste developer and solvent bottles must be sealed and labeled'
    ],
    hourlyRate: 50,
    currency: 'USD (or Institutional Credits)',
    depositAmount: 250,
    currentRuntimeHours: 3290.0,
    iconType: 'cleanroom',
    estimatedReplacementValue: '$1,200,000',
    totalHoursSharedThisMonth: 160,
    currentBookingsCount: 1,
    availabilityWindows: {
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      hours: '07:00 - 21:00'
    }
  },
  {
    id: 'res_highspeed_camera',
    name: 'Phantom v2640 Ultra High-Speed Camera',
    modelCode: 'PHANTOM-V2640',
    category: 'equipment',
    institution: 'Metro Innovation College',
    facilityName: 'Fluid Dynamics & Ballistics Lab',
    roomNumber: 'Engineering Annex 4B',
    ownerId: 'user_marcus_vance',
    ownerName: 'Dr. Marcus Vance',
    ownerRole: 'Makerspace Director',
    description: '4-megapixel ultra high-speed CMOS digital camera capable of capturing 6,600 frames per second at full 2048 x 1952 resolution, and up to 125,000 fps at reduced resolutions. Includes Nikon F-mount lenses and high-CRI LED spot banks.',
    specifications: {
      'Max Frame Rate': '6,600 fps at full 4MP / 125,000 fps reduced',
      'Sensor': '12-bit CMOS, 2048 x 1952 active pixels',
      'Internal Memory': '144 GB CineMag IV',
      'Throughput': '26 Gpx/sec processing bandwidth',
      'Lighting Kit': '2x 300W High-CRI Continuous LED Arrays'
    },
    status: 'available',
    requirements: {
      qualificationId: 'cert_highspeed_optics',
      qualificationName: 'High-Speed Imaging & Optics Handling',
      mandatory: true,
      minLevel: 'Certified Operator',
      supervisionRequired: true, // Supervised access mandatory for this delicate sensor
      allowSupervisedBypass: true,
      supervisionFee: 25,
      depositRequiredAmount: 180,
      maxConsecutiveHours: 4,
      weeklyUserCapHours: 8,
    },
    usageRules: [
      'Never touch front sensor window; use air bulb for dust removal only',
      'Ensure continuous LED lighting does not exceed sensor thermal limits',
      'Backup CineMag footage to laboratory NAS before clearing onboard RAM',
      'Inspect lens front elements and mount locking pins before and after use'
    ],
    hourlyRate: 30,
    currency: 'USD (or Institutional Credits)',
    depositAmount: 180,
    currentRuntimeHours: 320.0,
    iconType: 'camera',
    estimatedReplacementValue: '$140,000',
    totalHoursSharedThisMonth: 42,
    currentBookingsCount: 1,
    availabilityWindows: {
      days: ['Monday', 'Wednesday', 'Friday'],
      hours: '09:00 - 17:00'
    }
  },
  {
    id: 'res_nmr_spectrometer',
    name: 'Bruker Avance III HD 800 MHz NMR Spectrometer',
    modelCode: 'BRUKER-800-NMR',
    category: 'testing_facility',
    institution: 'University Nanotechnology Center',
    facilityName: 'Structural Biology & Biophysics Hub',
    roomNumber: 'Basement Cryo-Shield B12',
    ownerId: 'user_arthur_pendelton',
    ownerName: 'Prof. Arthur Pendelton',
    ownerRole: 'Cleanroom & Microscopy Director',
    description: 'High-field nuclear magnetic resonance spectrometer with 18.8 Tesla shielded superconducting magnet and 5mm TCI CryoProbe. Configured for biomolecular NMR, triple-resonance 1H/13C/15N experiments, and metabolomics.',
    specifications: {
      'Proton Resonance': '800 MHz (18.8 Tesla)',
      'Probe': '5mm Triple-Resonance TCI CryoProbe (1H, 13C, 15N with 2H lock)',
      'Sample Changer': 'SampleJet 96-tube automated temperature-controlled carousel',
      'Sensitivity': 'High S/N ratio optimized for microgram protein samples'
    },
    status: 'available',
    requirements: {
      qualificationId: 'cert_nmr_spectroscopy',
      qualificationName: 'Cryo-NMR Safety & High-Field Magnet Protocol',
      mandatory: true,
      minLevel: 'Certified Operator',
      supervisionRequired: false,
      allowSupervisedBypass: true,
      supervisionFee: 30,
      depositRequiredAmount: 300,
      maxConsecutiveHours: 8,
      weeklyUserCapHours: 16,
    },
    usageRules: [
      'Strict 5-Gauss exclusion line: absolutely no ferromagnetic objects or pacemakers',
      'Use only precision Wilmad 5mm thin-wall NMR tubes; verify concentricity gauge',
      'Lock and shim routine must achieve < 0.5 Hz line width before multi-day experiments',
      'Check liquid helium and nitrogen boil-off levels at start of each shift'
    ],
    hourlyRate: 60,
    currency: 'USD (or Institutional Credits)',
    depositAmount: 300,
    currentRuntimeHours: 5410.0,
    iconType: 'spectrometer',
    estimatedReplacementValue: '$2,400,000',
    totalHoursSharedThisMonth: 210,
    currentBookingsCount: 1,
    availabilityWindows: {
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      hours: '00:00 - 23:59'
    }
  },
  {
    id: 'res_laser_fiber_cutter',
    name: '10kW High-Precision Fiber Laser Cutter',
    modelCode: 'FIBER-CUT-10K',
    category: 'fabrication_tool',
    institution: 'Metro Innovation College',
    facilityName: 'High-Power Laser Processing Bay',
    roomNumber: 'Bay 3 Laser Bunker',
    ownerId: 'user_marcus_vance',
    ownerName: 'Dr. Marcus Vance',
    ownerRole: 'Makerspace Director',
    description: 'Enclosed Class 1 industrial fiber laser cutting system with 10kW IPG resonator, Precitec ProCutter autofocus cutting head, and dual shuttle tables for stainless steel, brass, and aluminum sheet fabrication.',
    specifications: {
      'Laser Power': '10,000 Watts CW Fiber Resonator',
      'Bed Dimensions': '3000 x 1500 mm Dual Pallet Shuttle',
      'Max Sheet Thickness': '30 mm Stainless / 25 mm Aluminum',
      'Positioning Accuracy': '±0.03 mm with linear encoders',
      'Assist Gases': 'High-purity Oxygen & Nitrogen'
    },
    status: 'available',
    requirements: {
      qualificationId: 'cert_laser_l2',
      qualificationName: 'Class 4 Laser Safety & Optical Alignment',
      mandatory: true,
      minLevel: 'Certified Technician',
      supervisionRequired: false,
      allowSupervisedBypass: true,
      supervisionFee: 25,
      depositRequiredAmount: 220,
      maxConsecutiveHours: 4,
      weeklyUserCapHours: 8,
    },
    usageRules: [
      'Verify Class 1 enclosure interlocks are engaged; never bypass safety sensors',
      'OD7+ laser eye protection required when alignment diode is active',
      'Check assist gas line pressure before starting high-pressure nitrogen pierce',
      'Empty slag collection bins and clean protective optical window after each shift'
    ],
    hourlyRate: 40,
    currency: 'USD (or Institutional Credits)',
    depositAmount: 220,
    currentRuntimeHours: 1180.0,
    iconType: 'laser',
    estimatedReplacementValue: '$380,000',
    totalHoursSharedThisMonth: 78,
    currentBookingsCount: 1,
    availabilityWindows: {
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      hours: '08:00 - 18:00'
    }
  }
];

export const generateFreshSeedBookings = (): Booking[] => [
  {
    id: 'bk_completed_901',
    resourceId: 'res_sem_jeol_7800',
    resourceName: 'Field Emission SEM (JEOL JSM-7800F)',
    facilityName: 'Electron Microscopy Core Facility',
    userId: 'user_elena_rostova',
    userName: 'Dr. Elena Rostova',
    userInstitution: 'University Nanotechnology Center',
    userEmail: 'e.rostova@tech-consortium.edu',
    startTime: at(-2, 10),
    endTime: at(-2, 13),
    totalHours: 3,
    status: 'completed',
    purposeDescription: 'Cross-sectional imaging of etched gallium nitride photonic waveguides for low-loss quantum circuit coupling.',
    projectGrantCode: 'NIH-R01-BIO-98214',
    supervisionRequested: false,
    depositHeld: 150,
    depositRefunded: true,
    depositSettlement: {
      originalHeld: 150,
      deductedAmount: 0,
      refundedAmount: 150,
      status: 'full_refund',
      settledAt: at(-2, 13, 5),
      settledBy: 'Prof. Arthur Pendelton',
      notes: 'Pristine return confirmed. Chamber vacuum maintained. Stage clean.'
    },
    checkInTime: at(-2, 9, 58),
    checkOutTime: at(-2, 13, 2),
    fairnessScore: 85,
    createdAt: at(-3, 14, 30),
    preConditionReport: {
      id: 'cr_pre_901',
      bookingId: 'bk_completed_901',
      type: 'pre_checkin',
      timestamp: at(-2, 9, 59),
      inspectorName: 'Dr. Elena Rostova',
      inspectorRole: 'user',
      statusRating: 'pristine',
      checklistItems: [
        { label: 'Chamber vacuum baseline verified (< 1x10^-4 Pa)', passed: true },
        { label: 'Stage drive alignment & specimen holder inspected', passed: true },
        { label: 'EDS detector cooling active & nitrogen cold finger filled', passed: true },
        { label: 'Personal protective equipment & grounding strap donned', passed: true }
      ],
      hoursRuntimeLogged: 1420.5,
      consumablesRestocked: true,
      notes: 'Instrument in baseline condition. Standard aperture 2 installed.',
      signature: 'E. Rostova'
    },
    postConditionReport: {
      id: 'cr_post_901',
      bookingId: 'bk_completed_901',
      type: 'post_return',
      timestamp: at(-2, 13, 4),
      inspectorName: 'Prof. Arthur Pendelton',
      inspectorRole: 'owner',
      statusRating: 'pristine',
      checklistItems: [
        { label: 'Specimen removed from vacuum chamber', passed: true },
        { label: 'Stage returned to home coordinate (X=0, Y=0, Z=10mm)', passed: true },
        { label: 'Filament emission turned OFF and vacuum sealed', passed: true },
        { label: 'Workstation counter wiped and transfer tongs cleaned', passed: true }
      ],
      hoursRuntimeLogged: 1423.5,
      consumablesRestocked: true,
      notes: 'All items restored. No contamination observed. Vacuum nominal.',
      signature: 'A. Pendelton'
    }
  },
  {
    id: 'bk_active_902',
    resourceId: 'res_cleanroom_photolitho',
    resourceName: 'Class 100 (ISO 5) Photolithography Bay',
    facilityName: 'Cleanroom Nanofabrication Core',
    userId: 'user_elena_rostova',
    userName: 'Dr. Elena Rostova',
    userInstitution: 'University Nanotechnology Center',
    userEmail: 'e.rostova@tech-consortium.edu',
    startTime: atMinutes(-60), // Active now: Started 1 hour ago
    endTime: atMinutes(180),   // Finishes in 3 hours
    totalHours: 4,
    status: 'checked_in',
    purposeDescription: 'Sub-micron UV contact exposure of SU-8 photoresist for microfluidic sorting channels.',
    projectGrantCode: 'NIH-R01-BIO-98214',
    supervisionRequested: false,
    depositHeld: 250,
    depositRefunded: false,
    fairnessScore: 80,
    checkInTime: atMinutes(-58),
    createdAt: atMinutes(-300),
    preConditionReport: {
      id: 'cr_pre_902',
      bookingId: 'bk_active_902',
      type: 'pre_checkin',
      timestamp: atMinutes(-58),
      inspectorName: 'Dr. Elena Rostova',
      inspectorRole: 'user',
      statusRating: 'pristine',
      checklistItems: [
        { label: 'Laminar flow particle counter within ISO 5 specifications', passed: true },
        { label: 'Yellow lighting active and UV filters intact', passed: true },
        { label: 'Hotplates calibrated and exhaust velocity confirmed', passed: true },
        { label: 'Wafer chuck vacuum level verified', passed: true }
      ],
      hoursRuntimeLogged: 3290.0,
      consumablesRestocked: true,
      notes: 'Cleanroom bay verified at ISO 5 baseline. Photomasks clean.',
      signature: 'E. Rostova'
    }
  },
  {
    id: 'bk_approved_903',
    resourceId: 'res_sem_jeol_7800',
    resourceName: 'Field Emission SEM (JEOL JSM-7800F)',
    facilityName: 'Electron Microscopy Core Facility',
    userId: 'user_elena_rostova',
    userName: 'Dr. Elena Rostova',
    userInstitution: 'University Nanotechnology Center',
    userEmail: 'e.rostova@tech-consortium.edu',
    startTime: atMinutes(10), // Starts in 10 minutes: within the 30-minute check-in window right now!
    endTime: atMinutes(190),
    totalHours: 3,
    status: 'approved',
    purposeDescription: 'High-resolution surface topography analysis of etched SU-8 microfluidic structures.',
    projectGrantCode: 'NIH-R01-BIO-98214',
    supervisionRequested: false,
    depositHeld: 150,
    depositRefunded: false,
    fairnessScore: 85,
    createdAt: atMinutes(-120)
  },
  {
    id: 'bk_pending_904',
    resourceId: 'res_cnc_haas_umc500',
    resourceName: '5-Axis CNC Machining Center (Haas UMC-500)',
    facilityName: 'Advanced Prototyping Workshop',
    userId: 'user_david_kim',
    userName: 'David Kim',
    userInstitution: 'Metro Innovation College',
    userEmail: 'david.kim@makerspace-alliance.org',
    startTime: atMinutes(240), // In 4 hours
    endTime: atMinutes(480),
    totalHours: 4,
    status: 'pending_review',
    purposeDescription: 'Machining anodized aluminum 7075 chassis for autonomous ground inspection robot.',
    projectGrantCode: 'CAPSTONE-ROBOTICS-2026',
    supervisionRequested: false,
    depositHeld: 200,
    depositRefunded: false,
    fairnessScore: computeFairnessScore({
      userId: 'user_david_kim',
      weeklyHoursUsed: 4,
      weeklyQuotaTotal: 15,
      noShowCount: 0,
      completedReturnsCount: 0,
      lateReturnsCount: 0,
      projectGrantCode: 'CAPSTONE-ROBOTICS-2026'
    }).totalScore,
    fairnessBreakdown: computeFairnessScore({
      userId: 'user_david_kim',
      weeklyHoursUsed: 4,
      weeklyQuotaTotal: 15,
      noShowCount: 0,
      completedReturnsCount: 0,
      lateReturnsCount: 0,
      projectGrantCode: 'CAPSTONE-ROBOTICS-2026'
    }),
    createdAt: atMinutes(-35)
  },
  {
    id: 'bk_waitlist_905',
    resourceId: 'res_cnc_haas_umc500',
    resourceName: '5-Axis CNC Machining Center (Haas UMC-500)',
    facilityName: 'Advanced Prototyping Workshop',
    userId: 'user_elena_rostova',
    userName: 'Dr. Elena Rostova',
    userInstitution: 'University Nanotechnology Center',
    userEmail: 'e.rostova@tech-consortium.edu',
    startTime: atMinutes(270), // Overlaps bk_pending_904: placed on priority waitlist
    endTime: atMinutes(390),
    totalHours: 2,
    status: 'waitlisted',
    waitlistPosition: 1,
    purposeDescription: 'Precision milling of custom titanium vacuum collar flange for ultra-low temperature probe.',
    projectGrantCode: 'DOE-QUANTUM-441',
    supervisionRequested: false,
    depositHeld: 0,
    depositRefunded: false,
    fairnessScore: computeFairnessScore({
      userId: 'user_elena_rostova',
      weeklyHoursUsed: 7,
      weeklyQuotaTotal: 20,
      noShowCount: 0,
      completedReturnsCount: 1,
      lateReturnsCount: 0,
      projectGrantCode: 'DOE-QUANTUM-441'
    }).totalScore,
    fairnessBreakdown: computeFairnessScore({
      userId: 'user_elena_rostova',
      weeklyHoursUsed: 7,
      weeklyQuotaTotal: 20,
      noShowCount: 0,
      completedReturnsCount: 1,
      lateReturnsCount: 0,
      projectGrantCode: 'DOE-QUANTUM-441'
    }),
    createdAt: atMinutes(-20)
  }
];

export const generateFreshSeedAudits = (): AuditLogEntry[] => {
  const genesisHash = GENESIS_HASH;
  
  const a1 = {
    id: 'aud_101',
    bookingId: 'bk_completed_901',
    timestamp: at(-3, 14, 30),
    resourceId: 'res_sem_jeol_7800',
    resourceName: 'Field Emission SEM (JEOL JSM-7800F)',
    actorId: 'user_elena_rostova',
    actorName: 'Dr. Elena Rostova',
    actorRole: 'researcher',
    actionType: 'BOOKING_REQUESTED' as const,
    summary: 'Booking request submitted for 3.0 hrs. Automated qualification check passed (cert_sem_l3 verified). Fair allocation score: 85/100.',
    details: { grantCode: 'NIH-R01-BIO-98214', requestedHours: 3, fairnessScore: 85 },
    previousHash: genesisHash
  };
  const h1 = computeAuditHash(a1.previousHash, a1.actorId, a1.actionType, a1.timestamp, a1.resourceId, a1.details, a1.actorName, a1.summary);

  const a2 = {
    id: 'aud_102',
    bookingId: 'bk_completed_901',
    timestamp: at(-2, 9, 15),
    resourceId: 'res_sem_jeol_7800',
    resourceName: 'Field Emission SEM (JEOL JSM-7800F)',
    actorId: 'user_arthur_pendelton',
    actorName: 'Prof. Arthur Pendelton',
    actorRole: 'lab_manager',
    actionType: 'BOOKING_APPROVED' as const,
    summary: 'Resource custodian approved booking bk_completed_901. Quota check passed (7/20 hrs used). Deposit $150 placed in hold escrow.',
    details: { quotaBalanceRemaining: 13, supervisorAssigned: 'None (Unescorted)' },
    previousHash: h1
  };
  const h2 = computeAuditHash(a2.previousHash, a2.actorId, a2.actionType, a2.timestamp, a2.resourceId, a2.details, a2.actorName, a2.summary);

  const a3 = {
    id: 'aud_103',
    bookingId: 'bk_completed_901',
    timestamp: at(-2, 9, 59),
    resourceId: 'res_sem_jeol_7800',
    resourceName: 'Field Emission SEM (JEOL JSM-7800F)',
    actorId: 'user_elena_rostova',
    actorName: 'Dr. Elena Rostova',
    actorRole: 'researcher',
    actionType: 'CHECKED_IN' as const,
    summary: 'Digital badge check-in validated at Core Lab entry. Pre-use vacuum & safety checklist passed. Baseline meter: 1420.5 hrs.',
    details: { initialVacuum: '8.1 x 10^-5 Pa', baselineStatus: 'pristine' },
    previousHash: h2
  };
  const h3 = computeAuditHash(a3.previousHash, a3.actorId, a3.actionType, a3.timestamp, a3.resourceId, a3.details, a3.actorName, a3.summary);

  const a4 = {
    id: 'aud_104',
    bookingId: 'bk_completed_901',
    timestamp: at(-2, 13, 5),
    resourceId: 'res_sem_jeol_7800',
    resourceName: 'Field Emission SEM (JEOL JSM-7800F)',
    actorId: 'user_arthur_pendelton',
    actorName: 'Prof. Arthur Pendelton',
    actorRole: 'lab_manager',
    actionType: 'RETURN_CONFIRMED' as const,
    summary: 'Final return inspection confirmed by custodian. Hours runtime logged: 1423.5 hrs (+3.0 hrs). Security deposit $150 released 100% to user account.',
    details: { postStatus: 'pristine', depositAction: 'REFUNDED_100%' },
    previousHash: h3
  };
  const h4 = computeAuditHash(a4.previousHash, a4.actorId, a4.actionType, a4.timestamp, a4.resourceId, a4.details, a4.actorName, a4.summary);

  const a5 = {
    id: 'aud_105',
    bookingId: 'bk_pending_904',
    timestamp: atMinutes(-35),
    resourceId: 'res_cnc_haas_umc500',
    resourceName: '5-Axis CNC Machining Center (Haas UMC-500)',
    actorId: 'user_david_kim',
    actorName: 'David Kim',
    actorRole: 'researcher',
    actionType: 'BOOKING_REQUESTED' as const,
    summary: 'Booking request bk_pending_904 submitted for 4.0 hrs. Haas Level 2 certification verified. Fair score: 75/100 (Capstone project priority).',
    details: { grantCode: 'CAPSTONE-ROBOTICS-2026', fairAccessScore: 75 },
    previousHash: h4
  };
  const h5 = computeAuditHash(a5.previousHash, a5.actorId, a5.actionType, a5.timestamp, a5.resourceId, a5.details, a5.actorName, a5.summary);

  const a6 = {
    id: 'aud_106',
    bookingId: 'bk_waitlist_905',
    timestamp: atMinutes(-20),
    resourceId: 'res_cnc_haas_umc500',
    resourceName: '5-Axis CNC Machining Center (Haas UMC-500)',
    actorId: 'user_elena_rostova',
    actorName: 'Dr. Elena Rostova',
    actorRole: 'researcher',
    actionType: 'WAITLISTED' as const,
    summary: 'Schedule conflict detected with existing slot. Evaluated priority score (85) placed user at Position #1 on transparent waiting list.',
    details: { conflictWith: 'bk_pending_904', explainableRank: 'Priority Tier 1 (DOE Quantum Grant, Score 85)' },
    previousHash: h5
  };
  const h6 = computeAuditHash(a6.previousHash, a6.actorId, a6.actionType, a6.timestamp, a6.resourceId, a6.details, a6.actorName, a6.summary);

  return [
    { ...a6, integrityHash: h6 },
    { ...a5, integrityHash: h5 },
    { ...a4, integrityHash: h4 },
    { ...a3, integrityHash: h3 },
    { ...a2, integrityHash: h2 },
    { ...a1, integrityHash: h1 }
  ];
};


export const generateFreshVerificationRequests = (): QualificationVerificationRequest[] => [
  {
    id: 'vr_req_01',
    userId: 'user_david_kim',
    userName: 'David Kim',
    userInstitution: 'Metro Innovation College',
    qualificationId: 'cert_laser_l2',
    qualificationName: 'Class 4 Laser Safety & Optical Alignment',
    level: 'Certified Technician',
    issuingInstitution: 'State Photonics Safety Board',
    submittedAt: at(-1, 14),
    status: 'pending',
    documentRef: 'cert_laser_l2_scan_dkim.pdf',
    adminNotes: 'Submitted official completion certificate from 20-hour photonics training module.'
  }
];

export const generateFreshNotifications = (): AppNotification[] => [
  {
    id: 'notif_1',
    userId: 'user_elena_rostova',
    type: 'approved',
    title: 'Booking Approved: FE-SEM',
    message: 'Prof. Arthur Pendelton approved your session for today. Digital access pass ready for check-in.',
    timestamp: at(-1, 16, 30),
    read: false,
    relatedBookingId: 'bk_approved_903'
  },
  {
    id: 'notif_2',
    userId: 'user_elena_rostova',
    type: 'deposit_released',
    title: 'Security Deposit Released ($150)',
    message: 'Post-use inspection for JEOL 7800F confirmed pristine condition. $150 refunded to account balance.',
    timestamp: at(-2, 13, 6),
    read: true,
    relatedBookingId: 'bk_completed_901'
  },
  {
    id: 'notif_3',
    userId: 'user_david_kim',
    type: 'new_request',
    title: 'Request Queued: Haas UMC-500',
    message: 'Your booking request is queued for custodian review. Fair score: 80 (Capstone Bonus applied).',
    timestamp: at(0, 7, 21),
    read: false,
    relatedBookingId: 'bk_pending_904'
  }
];

export const INITIAL_FAIR_USAGE_CONFIG = {
  maxWeeklyHoursPerUser: 20,
  peakHoursStart: 9,
  peakHoursEnd: 17,
  maxConsecutiveHoursDefault: 4,
  autoCancelMissedCheckinMinutes: 15,
  fairnessScoreWeights: {
    baseScore: 50,
    undergraduateCapstoneBonus: 10,
    sponsoredGrantBonus: 15,
    lowMonthlyUsageBonus: 15,
    repeatNoShowPenalty: -25,
    promptReturnReward: 5
  }
};
