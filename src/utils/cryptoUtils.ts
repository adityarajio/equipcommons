/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Deterministic SHA-256 Cryptographic Hash Generator & Chain Verifier.
 * Uses @noble/hashes for real, standard RFC 6234 cryptographic digests.
 * Adheres to canonical serialization with zero random salt.
 */

import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';

export const GENESIS_HASH = 'genesis:0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Computes canonical SHA-256 digest for an audit entry payload.
 * Includes actorName and summary to prevent payload tampering.
 */
export const computeAuditHash = (
  previousHash: string,
  actorId: string,
  actionType: string,
  timestamp: string,
  resourceId: string,
  details: Record<string, any> = {},
  actorName: string = '',
  summary: string = ''
): string => {
  // Sort keys for canonical JSON serialization
  const canonicalDetails = JSON.stringify(details, Object.keys(details).sort());
  const payload = `${previousHash}|${actorId}|${actorName}|${actionType}|${timestamp}|${resourceId}|${summary}|${canonicalDetails}`;
  const digestBytes = sha256(utf8ToBytes(payload));
  return 'sha256:' + bytesToHex(digestBytes);
};

export interface ChainVerificationResult {
  isValid: boolean;
  totalEntries: number;
  validEntries: number;
  corruptedEntryId?: string;
  reason?: string;
}

/**
 * Verifies the integrity of the entire audit chain from genesis to head.
 * In EquipCommons, auditLogs are stored with the newest entry at index 0 (head)
 * down to genesis at the last index.
 * We reverse the array to verify chronologically in exact insertion sequence,
 * avoiding timestamp sorting ties where multiple actions occur in the same minute.
 */
export const verifyAuditChain = (entries: any[]): ChainVerificationResult => {
  if (!entries || entries.length === 0) {
    return { isValid: true, totalEntries: 0, validEntries: 0 };
  }

  // Exact chronological order from oldest (genesis) to newest (head)
  const chronological = [...entries].reverse();

  for (let i = 0; i < chronological.length; i++) {
    const entry = chronological[i];
    
    // Check previous hash link
    if (i > 0) {
      const prevEntry = chronological[i - 1];
      if (entry.previousHash !== prevEntry.integrityHash) {
        return {
          isValid: false,
          totalEntries: chronological.length,
          validEntries: i,
          corruptedEntryId: entry.id,
          reason: `Broken chain link at entry #${entry.id}: previousHash does not match prior entry's integrityHash.`
        };
      }
    }

    // Verify self-hash integrity
    const recomputedHash = computeAuditHash(
      entry.previousHash || GENESIS_HASH,
      entry.actorId,
      entry.actionType,
      entry.timestamp,
      entry.resourceId,
      entry.details || {},
      entry.actorName || '',
      entry.summary || ''
    );

    if (entry.integrityHash !== recomputedHash) {
      return {
        isValid: false,
        totalEntries: chronological.length,
        validEntries: i,
        corruptedEntryId: entry.id,
        reason: `Hash mismatch at entry #${entry.id}: payload may have been tampered with. Expected ${recomputedHash}, got ${entry.integrityHash}.`
      };
    }
  }

  return {
    isValid: true,
    totalEntries: chronological.length,
    validEntries: chronological.length
  };
};
