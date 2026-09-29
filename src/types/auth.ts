/**
 * AbangCebuAI Authentication & User Registration Type Definitions
 * Phase 1 Architecture: User Registration Workflow & Data Contract
 * Jira Reference: SCRUM-56
 * Database Foundation: SCRUM-54 (20260929000001_users_and_profiles.sql)
 */

import type { UserRole } from './database';

// ==============================================================================
// 1. Role Constraints & Payloads
// ==============================================================================

/**
 * Roles permitted during public self-registration.
 * Strictly prohibits 'admin' self-provisioning (Anti-Privilege Escalation Tier 1).
 */
export type RegisterableRole = Exclude<UserRole, 'admin'>; // 'renter' | 'landlord'

/**
 * Payload submitted by the client during user registration.
 */
export interface RegisterPayload {
  /** User primary email address (RFC 5322 compliant) */
  email: string;
  /** Password satisfying complexity policy (8-72 characters, 3 of 4 classes) */
  password: string;
  /** Publicly self-assignable role ('renter' or 'landlord') */
  role: RegisterableRole;
  /** Legal or preferred full name (2-100 characters) */
  fullName: string;
  /** Philippine mobile number (+639XXXXXXXXX or 09XXXXXXXXX) */
  phoneNumber?: string;
  /** Primary campus, office, or landmark of interest in Metro Cebu */
  preferredLandmark?: string;
  /** Cloudflare Turnstile CAPTCHA verification token */
  turnstileToken?: string;
}

/**
 * Sanitized user summary returned upon successful registration.
 */
export interface RegisteredUserSummary {
  /** Unique user identifier matching auth.users(id) and public.profiles(id) */
  id: string;
  /** User email address */
  email: string;
  /** Assigned role ('renter' or 'landlord') */
  role: RegisterableRole;
  /** Registered full name */
  fullName: string;
  /** Normalized canonical Philippine phone number (+639XXXXXXXXX) or null */
  phoneNumber: string | null;
  /** Email confirmation status in Supabase Auth */
  isEmailConfirmed: boolean;
  /** ISO 8601 creation timestamp */
  createdAt: string;
}

/**
 * Standard successful response contract for user registration.
 */
export interface RegisterSuccessResponse {
  success: true;
  data: {
    user: RegisteredUserSummary;
    /** Whether an activation email was dispatched requiring PKCE confirmation */
    requiresEmailVerification: boolean;
    /** Recommended client redirect route (/search, /landlord/onboarding, etc.) */
    redirectUrl: string;
  };
  message: string;
}

// ==============================================================================
// 2. Error Taxonomy & Codes
// ==============================================================================

/**
 * Comprehensive enumeration of authentication and registration error codes.
 */
export enum AuthErrorCode {
  // Input Validation Errors (400 / 422)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_EMAIL_FORMAT = 'INVALID_EMAIL_FORMAT',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  INVALID_PHONE_NUMBER = 'INVALID_PHONE_NUMBER',
  INVALID_ROLE = 'INVALID_ROLE',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Security & Abuse Prevention (403 / 409 / 429)
  PRIVILEGE_ESCALATION_ATTEMPT = 'PRIVILEGE_ESCALATION_ATTEMPT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  CAPTCHA_VERIFICATION_FAILED = 'CAPTCHA_VERIFICATION_FAILED',
  EMAIL_ALREADY_REGISTERED = 'EMAIL_ALREADY_REGISTERED',
  ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',

  // Confirmation & Lifecycle (400 / 410)
  CONFIRMATION_CODE_EXPIRED = 'CONFIRMATION_CODE_EXPIRED',
  CONFIRMATION_CODE_INVALID = 'CONFIRMATION_CODE_INVALID',
  ALREADY_CONFIRMED = 'ALREADY_CONFIRMED',

  // Internal & Infrastructure (500)
  INTERNAL_AUTH_ERROR = 'INTERNAL_AUTH_ERROR',
  DATABASE_TRIGGER_ERROR = 'DATABASE_TRIGGER_ERROR',
}

/**
 * Detailed error descriptor for specific form fields.
 */
export interface AuthFieldError {
  /** The field name causing validation failure (e.g. 'email', 'password', 'role') */
  field: string;
  /** Machine-readable error code */
  code: AuthErrorCode;
  /** User-friendly descriptive error message */
  message: string;
}

/**
 * Standardized error response contract.
 */
export interface AuthErrorResponse {
  success: false;
  error: {
    code: AuthErrorCode;
    message: string;
    details?: AuthFieldError[];
  };
}

/**
 * Universal wrapper for authentication API operations.
 */
export type AuthResponse<T = RegisteredUserSummary> =
  | {
      success: true;
      data: T;
      message: string;
    }
  | AuthErrorResponse;

// ==============================================================================
// 3. Registration Validation Rules & Policies
// ==============================================================================

/**
 * Registration validation criteria, regular expressions, and policy limits.
 */
export const REGISTRATION_VALIDATION_RULES = {
  email: {
    /** RFC 5322 compliant email regex matching standard address format */
    regex: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/,
    maxLength: 254,
    description: 'Valid RFC 5322 compliant email address format (max 254 chars)',
  },
  password: {
    minLength: 8,
    maxLength: 72,
    minCharacterClasses: 3,
    classes: {
      uppercase: /[A-Z]/,
      lowercase: /[a-z]/,
      digit: /[0-9]/,
      symbol: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/,
    },
    description:
      '8 to 72 characters, satisfying at least 3 of 4 classes: uppercase, lowercase, numbers, special characters',
  },
  phoneNumber: {
    /** Philippine mobile number pattern matching +639XXXXXXXXX or 09XXXXXXXXX */
    regex: /^(?:\+639|09)\d{9}$/,
    canonicalPrefix: '+63',
    canonicalLength: 13, // e.g. +639171234567
    description: 'Philippine mobile number (+639XXXXXXXXX or 09XXXXXXXXX)',
  },
  fullName: {
    minLength: 2,
    maxLength: 100,
    regex: /^[a-zA-ZÀ-ÿ\s'’\-.]+$/,
    description: '2 to 100 characters containing valid letters, spaces, hyphens, or apostrophes',
  },
} as const;

// ==============================================================================
// 4. Utility Helper Functions
// ==============================================================================

/**
 * Type guard verifying if a string role is an authorized registerable role.
 * Explicitly rejects 'admin' and unknown role identifiers.
 */
export function isRegisterableRole(role: unknown): role is RegisterableRole {
  return typeof role === 'string' && (role === 'renter' || role === 'landlord');
}

/**
 * Normalizes a Philippine mobile phone number into canonical E.164 format (+639XXXXXXXXX).
 * Returns null if input is empty or invalid.
 */
export function normalizePhilippinePhoneNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const clean = phone.replace(/[\s\-_()]/g, '');
  if (!REGISTRATION_VALIDATION_RULES.phoneNumber.regex.test(clean)) {
    return null;
  }
  if (clean.startsWith('09')) {
    return `+639${clean.slice(2)}`;
  }
  if (clean.startsWith('+639')) {
    return clean;
  }
  return null;
}

/**
 * Password strength evaluation result.
 */
export interface PasswordStrengthResult {
  isValid: boolean;
  score: number; // 0 to 4
  unmetCriteria: string[];
}

/**
 * Validates password against the AbangCebuAI security policy (8-72 chars, min 3 of 4 classes).
 */
export function validatePasswordStrength(password: string): PasswordStrengthResult {
  const unmetCriteria: string[] = [];
  const { minLength, maxLength, classes, minCharacterClasses } = REGISTRATION_VALIDATION_RULES.password;

  if (password.length < minLength || password.length > maxLength) {
    unmetCriteria.push(`Password must be between ${minLength} and ${maxLength} characters`);
  }

  let classesSatisfied = 0;
  if (classes.uppercase.test(password)) classesSatisfied++;
  else unmetCriteria.push('Must include at least one uppercase letter (A-Z)');

  if (classes.lowercase.test(password)) classesSatisfied++;
  else unmetCriteria.push('Must include at least one lowercase letter (a-z)');

  if (classes.digit.test(password)) classesSatisfied++;
  else unmetCriteria.push('Must include at least one digit (0-9)');

  if (classes.symbol.test(password)) classesSatisfied++;
  else unmetCriteria.push('Must include at least one special character (!@#$%^&*...)');

  const isValid =
    password.length >= minLength &&
    password.length <= maxLength &&
    classesSatisfied >= minCharacterClasses;

  return {
    isValid,
    score: classesSatisfied,
    unmetCriteria,
  };
}
