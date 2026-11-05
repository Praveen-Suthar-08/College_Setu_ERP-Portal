import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * SUPABASE CLIENT CONFIGURATION (Section 4 & Section 9 Security Rules)
 * - Strictly uses VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
 * - Never references or accepts a service_role key in client code.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'https://your-project-ref.supabase.co' &&
    supabaseAnonKey !== 'your-public-anon-key'
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

const COMMON_PASSWORDS = new Set([
  'password123',
  '1234567890',
  'qwertyuiop',
  'admin12345',
  'college123',
  'campus2026',
  'welcome123',
  'student123',
  'letmein123',
  'password1234',
]);

export function evaluatePasswordStrength(password: string): {
  valid: boolean;
  score: number; // 0 to 4
  label: 'Too Short' | 'Common / Blocked' | 'Weak' | 'Good' | 'Strong';
  reason?: string;
} {
  if (password.length < 10) {
    return {
      valid: false,
      score: 1,
      label: 'Too Short',
      reason: 'Password must be at least 10 characters long.',
    };
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return {
      valid: false,
      score: 1,
      label: 'Common / Blocked',
      reason: 'This password appears on the institutional common-password blocklist.',
    };
  }

  let score = 2;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  if (hasUpper && hasLower && hasDigit) score = 3;
  if (hasUpper && hasLower && hasDigit && hasSymbol && password.length >= 12) score = 4;

  return {
    valid: score >= 3,
    score,
    label: score === 4 ? 'Strong' : score === 3 ? 'Good' : 'Weak',
    reason:
      score < 3
        ? 'Include uppercase, lowercase, and numeric characters (10+ characters).'
        : undefined,
  };
}

export function validateUploadFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg'];
  const maxBytes = 5 * 1024 * 1024; // 5 MB

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Only PDF, PNG, and JPG files are permitted.',
    };
  }
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: 'File size exceeds the 5 MB security limit.',
    };
  }
  return { valid: true };
}
