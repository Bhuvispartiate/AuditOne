// ============================================================================
// VAULT CRYPTOGRAPHIC ENGINE (AES-256-GCM + PBKDF2)
// Strictly client-side / managed zero-plaintext Web Crypto standard
// Never stores passwords in plaintext, localStorage or console logs
// ============================================================================

const VAULT_MASTER_SECRET =
  (import.meta.env.VITE_VAULT_MASTER_KEY as string | undefined) ||
  "pms-enterprise-firm-vault-master-encryption-key-aes-256-gcm-2026";

const PBKDF2_ITERATIONS = 100000;

// Helper: Convert ArrayBuffer / Uint8Array to Base64
function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper: Convert Base64 to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Derive AES-256-GCM CryptoKey using PBKDF2
async function deriveAesGcmKey(salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const masterKeyMaterial = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(VAULT_MASTER_SECRET),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as any,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    masterKeyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts a plaintext password using AES-256-GCM with a fresh 16-byte salt and 12-byte IV.
 * Returns formatted version string: `v1:<salt_b64>:<iv_b64>:<ciphertext_b64>`
 */
export async function encryptVaultPassword(plaintext: string): Promise<string> {
  if (!plaintext) return "";

  // 1. Generate 16-byte cryptographically secure random salt
  const salt = window.crypto.getRandomValues(new Uint8Array(16));

  // 2. Generate 12-byte standard GCM IV (Initialization Vector)
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // 3. Derive 256-bit key from salt + master secret
  const key = await deriveAesGcmKey(salt);

  // 4. Encrypt with AES-GCM (auto-appends 128-bit authentication tag)
  const encoder = new TextEncoder();
  const plaintextBytes = encoder.encode(plaintext);

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      tagLength: 128,
    },
    key,
    plaintextBytes
  );

  const saltB64 = arrayBufferToBase64(salt);
  const ivB64 = arrayBufferToBase64(iv);
  const cipherB64 = arrayBufferToBase64(ciphertextBuffer);

  return `v1:${saltB64}:${ivB64}:${cipherB64}`;
}

/**
 * Decrypts an AES-256-GCM encrypted payload back to plaintext.
 * Throws error if payload was tampered with or key is invalid.
 */
export async function decryptVaultPassword(encryptedPayload: string): Promise<string> {
  if (!encryptedPayload) return "";

  // Check format: v1:salt:iv:ciphertext
  const parts = encryptedPayload.split(":");
  if (parts.length !== 4 || parts[0] !== "v1") {
    // If legacy or unformatted, return safely without revealing or crashing
    throw new Error("Invalid or corrupted vault encryption format.");
  }

  const [, saltB64, ivB64, cipherB64] = parts;
  const salt = base64ToUint8Array(saltB64);
  const iv = base64ToUint8Array(ivB64);
  const ciphertext = base64ToUint8Array(cipherB64);

  // Derive key using the embedded salt
  const key = await deriveAesGcmKey(salt);

  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv as any,
        tagLength: 128,
      },
      key,
      ciphertext as any
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (err: any) {
    throw new Error("Decryption failed. Authentication tag mismatch or corrupted ciphertext.");
  }
}

export interface PasswordGeneratorOptions {
  length?: number;
  uppercase?: boolean;
  lowercase?: boolean;
  numbers?: boolean;
  symbols?: boolean;
}

const UPPERCASE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // removed ambiguous I, O
const LOWERCASE_CHARS = "abcdefghijkmnpqrstuvwxyz"; // removed ambiguous l, o
const NUMBER_CHARS = "23456789"; // removed 0, 1
const SYMBOL_CHARS = "!@#$%^&*()-_=+[]{}<>~?";

/**
 * Generates a cryptographically strong, non-ambiguous password.
 */
export function generateStrongPassword(options: PasswordGeneratorOptions = {}): string {
  const {
    length = 16,
    uppercase = true,
    lowercase = true,
    numbers = true,
    symbols = true,
  } = options;

  const validLength = Math.max(8, Math.min(64, length));
  let charPool = "";
  const guaranteedChars: string[] = [];

  if (uppercase) {
    charPool += UPPERCASE_CHARS;
    guaranteedChars.push(UPPERCASE_CHARS[getRandomInt(UPPERCASE_CHARS.length)]);
  }
  if (lowercase) {
    charPool += LOWERCASE_CHARS;
    guaranteedChars.push(LOWERCASE_CHARS[getRandomInt(LOWERCASE_CHARS.length)]);
  }
  if (numbers) {
    charPool += NUMBER_CHARS;
    guaranteedChars.push(NUMBER_CHARS[getRandomInt(NUMBER_CHARS.length)]);
  }
  if (symbols) {
    charPool += SYMBOL_CHARS;
    guaranteedChars.push(SYMBOL_CHARS[getRandomInt(SYMBOL_CHARS.length)]);
  }

  if (!charPool) {
    charPool = LOWERCASE_CHARS + NUMBER_CHARS;
  }

  const result: string[] = [...guaranteedChars];

  while (result.length < validLength) {
    const randomIdx = getRandomInt(charPool.length);
    result.push(charPool[randomIdx]);
  }

  // Shuffle array securely
  for (let i = result.length - 1; i > 0; i--) {
    const j = getRandomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result.join("");
}

function getRandomInt(max: number): number {
  const randomUint = new Uint32Array(1);
  window.crypto.getRandomValues(randomUint);
  return randomUint[0] % max;
}

/**
 * Calculates password strength score (0 to 100) and label
 */
export function calculatePasswordStrength(password: string): {
  score: number;
  label: "Very Weak" | "Weak" | "Fair" | "Strong" | "Military-Grade";
  color: string;
} {
  if (!password) {
    return { score: 0, label: "Very Weak", color: "bg-slate-300 text-slate-700" };
  }

  let score = 0;
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 20;
  if (password.length >= 16) score += 15;
  if (/[A-Z]/.test(password)) score += 15;
  if (/[a-z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 10;
  if (/[^A-Za-z0-9]/.test(password)) score += 10;

  if (score < 30) return { score, label: "Very Weak", color: "bg-rose-500 text-white" };
  if (score < 50) return { score, label: "Weak", color: "bg-amber-500 text-white" };
  if (score < 75) return { score, label: "Fair", color: "bg-yellow-500 text-slate-900" };
  if (score < 90) return { score, label: "Strong", color: "bg-emerald-500 text-white" };
  return { score: 100, label: "Military-Grade", color: "bg-purple-600 text-white" };
}

