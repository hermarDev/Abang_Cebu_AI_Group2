/**
 * AbangCebuAI Authentication & Session Token Lifecycle Type Definitions
 * Phase 1 Architecture: User Registration & Session Token Lifecycle
 * Jira References: SCRUM-56, SCRUM-57
 * Database Foundation: SCRUM-54 (20260929000001_users_and_profiles.sql)
 */

import type { UserRole } from './database';

// ==============================================================================
// 1. Registration Constraints & Payloads
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
// 2. Login, Session & Token Payloads (SCRUM-57)
// ==============================================================================

/**
 * Payload submitted by the client during user login.
 */
export interface LoginPayload {
  /** User primary email address */
  email: string;
  /** User plaintext password */
  password: string;
  /** Cloudflare Turnstile CAPTCHA verification token */
  turnstileToken?: string;
  /** Remember-me persistence flag for extended session lifespan */
  rememberMe?: boolean;
}

/**
 * Session tokens issued upon successful authentication or refresh.
 */
export interface SessionTokens {
  /** Signed JWT access token (HMAC-SHA256, 1-hour standard TTL) */
  accessToken: string;
  /** Cryptographically random opaque refresh token string */
  refreshToken: string;
  /** Standard OAuth 2.0 Bearer token type */
  tokenType: 'bearer';
  /** Token lifespan in seconds (default 3600 seconds) */
  expiresIn: number;
  /** Token expiration Unix timestamp (in seconds) */
  expiresAt: number;
}

/**
 * Standard successful response contract for user login.
 */
export interface LoginSuccessResponse {
  success: true;
  data: {
    user: RegisteredUserSummary;
    session: SessionTokens;
    /** Recommended client redirect route (/search, /dashboard, etc.) */
    redirectUrl: string;
  };
  message: string;
}

/**
 * Decoded payload claims of a Supabase-issued JWT access token.
 */
export interface SupabaseJwtClaims {
  /** Issuer URL claim (e.g. 'https://<project-ref>.supabase.co/auth/v1') */
  iss: string;
  /** Subject claim: unique Supabase Auth user UUID matching auth.users(id) and profiles(id) */
  sub: string;
  /** Audience claim (typically 'authenticated') */
  aud: string;
  /** Expiration timestamp (UNIX epoch seconds) */
  exp: number;
  /** Not-before timestamp (UNIX epoch seconds) */
  nbf: number;
  /** Issued-at timestamp (UNIX epoch seconds) */
  iat: number;
  /** Primary verified email address */
  email: string;
  /** Optional verified Philippine phone number */
  phone?: string;
  /** System-level metadata managed by Supabase Auth engine */
  app_metadata: {
    provider?: string;
    providers?: string[];
    [key: string]: unknown;
  };
  /** User-level metadata synchronized with public.profiles */
  user_metadata: {
    role?: UserRole;
    full_name?: string;
    preferred_landmark?: string;
    [key: string]: unknown;
  };
  /** PostgreSQL role assumed by the database connection ('authenticated') */
  role: 'authenticated';
  /** Authenticator Assurance Level ('aal1' | 'aal2' | string) */
  aal: 'aal1' | 'aal2' | string;
  /** Supabase Auth session identifier UUID */
  session_id: string;
}

/**
 * Discrete states representing the client-side session lifecycle.
 */
export type SessionState =
  | 'unauthenticated'
  | 'authenticating'
  | 'authenticated'
  | 'refreshing'
  | 'stale';

/**
 * HTTP cookie configuration descriptor for Next.js 16 + @supabase/ssr session storage.
 */
export interface CookieConfig {
  /** Cookie key identifier */
  name: string;
  /** Serialized cookie payload */
  value: string;
  /** Blocks document.cookie access to defend against XSS token exfiltration */
  httpOnly: boolean;
  /** Enforces HTTPS-only transmission */
  secure: boolean;
  /** Cross-site request mitigation policy */
  sameSite: 'lax' | 'strict' | 'none';
  /** Scoped URL path */
  path: string;
  /** Cookie time-to-live in seconds */
  maxAge: number;
  /** Cookie handling priority hint */
  priority: 'low' | 'medium' | 'high';
  /** Scoped host domain if configured */
  domain?: string;
}

/**
 * Invalidation scope for user sign-out requests in Supabase Auth.
 * - 'local': Invalidates the current session/device refresh token.
 * - 'global': Revokes all active refresh tokens and sessions across all user devices.
 * - 'others': Revokes all other sessions while preserving the current active session.
 */
export type LogoutScope = 'local' | 'global' | 'others';

/**
 * Request payload contract for user sign-out and session revocation (SCRUM-58).
 */
export interface LogoutPayload {
  /** Invalidation scope (defaults to 'local') */
  scope?: LogoutScope;
  /** Optional sanitized destination URL to redirect the user to post-logout */
  redirectUrl?: string;
}

/**
 * Server response contract returned upon successful session revocation.
 */
export interface LogoutSuccessResponse {
  success: true;
  message: string;
  data: {
    /** The scope that was applied for session termination */
    scope: LogoutScope;
    /** The sanitized redirect URL client should navigate to */
    redirectUrl: string;
    /** Timestamp when session invalidation was committed on the server (ISO 8601) */
    invalidatedAt: string;
  };
}

/**
 * Client-side session and storage cleanup configuration options.
 */
export interface ClientCleanupOptions {
  /** Clear HTTP-only session cookies and chunked segments (Max-Age=0) */
  clearCookies: boolean;
  /** Emit SIGNED_OUT event via BroadcastChannel for multi-tab synchronization */
  broadcastToTabs: boolean;
  /** Invalidate Next.js App Router client cache and trigger layout refresh */
  refreshRouter: boolean;
  /** Clear in-memory auth state and reset transient user profile cache */
  clearMemoryState: boolean;
}

/**
 * Multi-tab cross-communication message structure passed via BroadcastChannel.
 */
export interface BroadcastAuthMessage {
  /** Action event dispatched across browser tabs */
  type: 'SIGNED_OUT' | 'SIGNED_IN' | 'TOKEN_REFRESHED' | 'USER_UPDATED';
  /** Epoch timestamp in milliseconds when the event was dispatched */
  timestamp: number;
  /** Revocation scope if sign-out event */
  scope?: LogoutScope;
  /** Target redirect path for coordinated navigation */
  redirectUrl?: string;
}

/**
 * Session lifecycle policy constants for AbangCebu AI.
 */
export const SESSION_CONSTANTS = {
  /** Standard JWT access token lifespan in seconds (1 hour) */
  ACCESS_TOKEN_TTL_SECONDS: 3600,
  /** Leeway grace period in seconds allowing concurrent requests to complete during rotation */
  REFRESH_GRACE_PERIOD_SECONDS: 30,
  /** Default session cookie lifespan in seconds (7 days) */
  DEFAULT_SESSION_MAX_AGE: 60 * 60 * 24 * 7,
  /** Extended remember-me session cookie lifespan in seconds (30 days) */
  REMEMBER_ME_MAX_AGE: 60 * 60 * 24 * 30,
  /** Threshold in seconds before expiry at which background refresh is triggered (5 minutes) */
  REFRESH_THRESHOLD_SECONDS: 300,
  /** Maximum bytes per individual cookie segment before chunking is enforced */
  COOKIE_CHUNK_SIZE_LIMIT: 4096,
  /** BroadcastChannel message identifier for multi-tab session synchronization */
  BROADCAST_CHANNEL_NAME: 'supabase.auth.token',
  /** Cookie deletion header value for Max-Age */
  COOKIE_DELETE_MAX_AGE: 0,
  /** Epoch expiration date string for cookie deletion */
  COOKIE_DELETE_EXPIRES: 'Thu, 01 Jan 1970 00:00:00 GMT',
  /** Default post-logout redirect route */
  DEFAULT_LOGOUT_REDIRECT: '/login?message=logged_out',
} as const;

// ==============================================================================
// 3. Error Taxonomy & Codes
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

  // Session & Authentication Lifecycle (SCRUM-57)
  INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  EMAIL_NOT_CONFIRMED = 'AUTH_EMAIL_NOT_CONFIRMED',
  SESSION_EXPIRED = 'AUTH_SESSION_EXPIRED',
  SESSION_REVOKED = 'AUTH_SESSION_REVOKED',
  REFRESH_TOKEN_REUSED = 'AUTH_REFRESH_TOKEN_REUSED',
  REFRESH_TOKEN_NOT_FOUND = 'AUTH_REFRESH_TOKEN_NOT_FOUND',
  TOKEN_DECODING_ERROR = 'AUTH_TOKEN_DECODING_ERROR',
  CONCURRENT_REFRESH_IN_PROGRESS = 'AUTH_CONCURRENT_REFRESH_IN_PROGRESS',
  DEVICE_FINGERPRINT_MISMATCH = 'AUTH_DEVICE_FINGERPRINT_MISMATCH',
  MFA_REQUIRED = 'AUTH_MFA_REQUIRED',

  // Logout & Invalidation Lifecycle (SCRUM-58)
  LOGOUT_FAILED = 'AUTH_LOGOUT_FAILED',
  LOGOUT_NETWORK_ERROR = 'AUTH_LOGOUT_NETWORK_ERROR',
  SESSION_ALREADY_TERMINATED = 'AUTH_SESSION_ALREADY_TERMINATED',

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
// 4. Registration Validation Rules & Policies
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
// 5. Utility Helper Functions
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

/**
 * Validates that a target post-logout or post-auth redirect URL is safe.
 * Strictly prevents open-redirect attacks by requiring relative root-relative paths
 * (starting with '/') and explicitly forbidding protocol-relative ('//') or backslash paths.
 */
export function isSafeRedirectUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  // Must begin with a single '/'
  if (!url.startsWith('/')) {
    return false;
  }

  // Disallow protocol-relative URLs (e.g. '//attacker.com')
  if (url.startsWith('//')) {
    return false;
  }

  // Disallow backslashes which some browsers normalize to forward slashes (e.g. '/\\attacker.com')
  if (url.includes('\\')) {
    return false;
  }

  // Disallow null bytes or ASCII control characters
  for (let i = 0; i < url.length; i++) {
    const code = url.charCodeAt(i);
    if (code < 32 || code === 127) {
      return false;
    }
  }

  return true;
}

