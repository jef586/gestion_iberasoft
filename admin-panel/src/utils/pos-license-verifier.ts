
// Utility for POS Offline License Validation
// This file is intended to be used in the POS application (Client-side / Electron / Node).

export interface LicensePayload {
  v: number;
  licenseKey: string;
  licenseId: string;
  customerId: string;
  planId: string;
  status: "trial" | "active" | "blocked" | "expired";
  expiresAt: string;
  graceUntil: string | null;
  limits: Record<string, any>;
  issuedAt: string;
}

// Helpers for Base64URL
function base64UrlDecode(str: string): Uint8Array {
  // Add padding if needed
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Verify License Token (Offline)
 * @param token The license token string
 * @param secret The HMAC secret (Must be securely stored in POS)
 */
export async function verifyLicenseToken(token: string, secret: string): Promise<LicensePayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) {
      console.warn("Invalid token format");
      return null;
    }

    const [payloadBase64, signatureBase64] = parts;

    // 1. Verify Signature
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const dataToSign = encoder.encode(payloadBase64);

    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );

    // Convert signature from base64url to Uint8Array
    const signatureBytes = base64UrlDecode(signatureBase64);

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      dataToSign
    );

    if (!isValid) {
      console.warn("Invalid token signature");
      return null;
    }

    // 2. Decode Payload
    const payloadBytes = base64UrlDecode(payloadBase64);
    const payloadString = new TextDecoder().decode(payloadBytes);
    const payload = JSON.parse(payloadString) as LicensePayload;

    // 3. Basic Offline Validations (Time-based)
    // Note: This relies on local system time.
    const now = new Date();
    const expiresAt = new Date(payload.expiresAt);
    const graceUntil = payload.graceUntil ? new Date(payload.graceUntil) : null;

    // Check if token is expired (considering grace period)
    // Rules:
    // now <= expiresAt -> OK (Active)
    // now > expiresAt && now <= graceUntil -> OK (Grace)
    // now > graceUntil -> Invalid (Expired)
    
    // Note: The function returns the payload if valid signature. 
    // The consumer should check the status/dates.
    // However, the prompt asks to return null if invalid? 
    // "verifyLicenseToken(token, secret) -> payload | null"
    // "Validaciones offline mínimas: firma válida, issuedAt presente, expiresAt / graceUntil evaluables"
    
    // The prompt says: "Reglas offline: si now > graceUntil -> inválido".
    // So if it is fully expired (past grace), should we return null?
    // "offline NO puede confirmar “blocked” si el token está viejo"
    
    // Let's strictly return payload if signature is valid.
    // The application logic should decide what to do with 'expired' payload.
    // BUT, the prompt says "si now > graceUntil -> inválido". 
    // I will add a check.

    if (graceUntil && now > graceUntil) {
       console.warn("Token expired (past grace period)");
       // We might still return payload but with a status flag?
       // The prompt says "-> inválido", implies returning null or throwing.
       // Let's return null to be safe as per "verify" semantic.
       return null;
    } else if (!graceUntil && now > expiresAt) {
       console.warn("Token expired (no grace period)");
       return null;
    }

    return payload;

  } catch (error) {
    console.error("Token verification error:", error);
    return null;
  }
}
