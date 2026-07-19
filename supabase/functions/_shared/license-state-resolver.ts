
export type LicenseStatus = "active" | "trial" | "blocked" | "expired" | "grace";

export interface LicenseState {
  storedStatus: string;
  effectiveStatus: LicenseStatus;
  expiresAt: string; // ISO 8601
  graceUntil: string | null; // ISO 8601
  isExpired: boolean;
  isBlocked: boolean;
  isWithinGrace: boolean;
  shouldPersistExpired: boolean; // Flag to indicate if we should update DB to 'expired'
}

/**
 * Resolves the effective state of a license based on its stored data and the current time.
 * 
 * Rules:
 * - If status = blocked -> always blocked
 * - If now <= expires_at -> active or trial (based on stored status)
 * - If now > expires_at and now <= grace_until -> grace
 * - If now > grace_until -> expired
 */
export function resolveLicenseState(license: any, now: Date = new Date()): LicenseState {
  const storedStatus = license.status;
  const expiresAt = new Date(license.expires_at);
  const graceUntil = license.grace_until ? new Date(license.grace_until) : null;
  const isBlocked = storedStatus === 'blocked';
  
  let effectiveStatus: LicenseStatus;
  let isExpired = false;
  let isWithinGrace = false;
  let shouldPersistExpired = false;

  if (isBlocked) {
    effectiveStatus = 'blocked';
    // Blocked licenses are effectively expired in terms of validity? 
    // Usually blocked means "stop working immediately".
    // IsExpired flag? Maybe true if we want to stop usage. 
    // But let's keep isExpired strictly for time-based expiration.
    // However, for validation purposes, blocked is invalid.
  } else if (now.getTime() <= expiresAt.getTime()) {
    // Period is valid
    if (storedStatus === 'trial') {
      effectiveStatus = 'trial';
    } else {
      effectiveStatus = 'active';
    }
  } else {
    // Period expired
    if (graceUntil && now.getTime() <= graceUntil.getTime()) {
      effectiveStatus = 'grace';
      isWithinGrace = true;
    } else {
      effectiveStatus = 'expired';
      isExpired = true;
      
      // If effective status is expired but DB says otherwise, we should persist.
      // This implements "expired sí puede persistirse en DB si conviene"
      if (storedStatus !== 'expired') {
        shouldPersistExpired = true;
      }
    }
  }

  return {
    storedStatus,
    effectiveStatus,
    expiresAt: expiresAt.toISOString(),
    graceUntil: graceUntil ? graceUntil.toISOString() : null,
    isExpired,
    isBlocked,
    isWithinGrace,
    shouldPersistExpired
  };
}

/**
 * Calculates new expiration and grace dates.
 */
export function calculateLicenseDates(startDate: Date, durationDays: number, graceDays: number = 7) {
  const expiresAt = new Date(startDate);
  expiresAt.setDate(expiresAt.getDate() + durationDays);
  
  const graceUntil = new Date(expiresAt);
  graceUntil.setDate(graceUntil.getDate() + graceDays);
  
  return {
    expiresAt,
    graceUntil
  };
}
