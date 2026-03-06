
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";
import { encode as base64urlEncode, decode as base64urlDecode } from "https://deno.land/std@0.177.0/encoding/base64url.ts";

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

const ALGORITHM = "SHA-256";

/**
 * Generates an HMAC-SHA256 signature for the given data using the secret.
 */
async function sign(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const dataToSign = encoder.encode(data);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: ALGORITHM },
    false,
    ["sign"]
  );
  
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    dataToSign
  );
  
  return base64urlEncode(new Uint8Array(signatureBuffer));
}

/**
 * Generates a license token string: base64url(payload) + "." + base64url(signature)
 */
export async function generateLicenseToken(payload: LicensePayload, secret: string): Promise<string> {
  const payloadString = JSON.stringify(payload);
  const payloadBase64 = base64urlEncode(new TextEncoder().encode(payloadString));
  
  const signature = await sign(payloadBase64, secret);
  
  return `${payloadBase64}.${signature}`;
}

/**
 * Verifies a license token. Returns the payload if valid, null otherwise.
 */
export async function verifyLicenseToken(token: string, secret: string): Promise<LicensePayload | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  
  const [payloadBase64, signature] = parts;
  
  // Re-calculate signature
  const expectedSignature = await sign(payloadBase64, secret);
  
  if (signature !== expectedSignature) return null;
  
  try {
    const payloadBuffer = base64urlDecode(payloadBase64);
    const payloadString = new TextDecoder().decode(payloadBuffer);
    return JSON.parse(payloadString) as LicensePayload;
  } catch (e) {
    console.error("Token parsing error:", e);
    return null;
  }
}
