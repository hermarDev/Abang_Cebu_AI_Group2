import { AuthErrorCode, type AuthErrorResponse, type ErrorFeedbackMode, type ErrorSeverity, type AuthRecoveryAction } from '@/types/auth';

export interface UpstreamAuthErrorLike {
  message?: string;
  name?: string;
  status?: number;
  code?: string;
  error_description?: string;
}

export interface MapAuthErrorOptions {
  fallbackMessage?: string;
  fallbackCode?: AuthErrorCode;
  fallbackStatus?: number;
  feedbackMode?: ErrorFeedbackMode;
  severity?: ErrorSeverity;
  actionHint?: AuthRecoveryAction;
  traceId?: string;
  details?: Array<{ field: string; code: AuthErrorCode; message: string }>;
}

const ERROR_CODE_MAP: Record<string, { code: AuthErrorCode; message: string; status: number; feedbackMode: ErrorFeedbackMode; severity: ErrorSeverity; actionHint: AuthRecoveryAction }> = {
  invalid_credentials: {
    code: AuthErrorCode.INVALID_CREDENTIALS,
    message: 'Invalid email or password.',
    status: 401,
    feedbackMode: 'inline',
    severity: 'error',
    actionHint: 'RESET_PASSWORD',
  },
  email_not_confirmed: {
    code: AuthErrorCode.EMAIL_NOT_CONFIRMED,
    message: 'Your email address is not yet verified.',
    status: 403,
    feedbackMode: 'banner',
    severity: 'warning',
    actionHint: 'RESEND_EMAIL',
  },
  user_already_exists: {
    code: AuthErrorCode.EMAIL_ALREADY_REGISTERED,
    message: 'An account with this email already exists.',
    status: 409,
    feedbackMode: 'inline',
    severity: 'info',
    actionHint: 'RESET_PASSWORD',
  },
  weak_password: {
    code: AuthErrorCode.WEAK_PASSWORD,
    message: 'Password does not meet complexity requirements.',
    status: 422,
    feedbackMode: 'inline',
    severity: 'warning',
    actionHint: 'RETRY',
  },
  over_email_send_rate_limit: {
    code: AuthErrorCode.RATE_LIMIT_EXCEEDED,
    message: 'Too many email requests. Please try again later.',
    status: 429,
    feedbackMode: 'toast',
    severity: 'error',
    actionHint: 'RETRY',
  },
  session_not_found: {
    code: AuthErrorCode.SESSION_EXPIRED,
    message: 'Your session has expired. Please sign in again.',
    status: 401,
    feedbackMode: 'toast',
    severity: 'warning',
    actionHint: 'LOGIN',
  },
  session_revoked: {
    code: AuthErrorCode.SESSION_REVOKED,
    message: 'Your session has been terminated.',
    status: 401,
    feedbackMode: 'toast',
    severity: 'info',
    actionHint: 'LOGIN',
  },
  bad_code_verifier: {
    code: AuthErrorCode.PASSWORD_RESET_TOKEN_INVALID,
    message: 'The recovery link is invalid or has already been used.',
    status: 401,
    feedbackMode: 'banner',
    severity: 'error',
    actionHint: 'RESET_PASSWORD',
  },
  same_password: {
    code: AuthErrorCode.PASSWORD_REUSE_FORBIDDEN,
    message: 'New password must be different from your old password.',
    status: 422,
    feedbackMode: 'inline',
    severity: 'warning',
    actionHint: 'RETRY',
  },
};

export function mapSupabaseAuthError(
  error: unknown,
  options: MapAuthErrorOptions = {},
): { status: number; body: AuthErrorResponse } {
  const normalized = typeof error === 'object' && error !== null ? (error as UpstreamAuthErrorLike) : {};
  const rawCode = (normalized.code || '').toLowerCase().trim();
  const rawMessage = (normalized.message || '').toLowerCase();

  let match = ERROR_CODE_MAP[rawCode];

  if (!match) {
    if (rawMessage.includes('invalid login credentials') || rawMessage.includes('invalid credentials')) {
      match = ERROR_CODE_MAP.invalid_credentials;
    } else if (rawMessage.includes('email not confirmed')) {
      match = ERROR_CODE_MAP.email_not_confirmed;
    } else if (rawMessage.includes('already registered') || rawMessage.includes('user already exists')) {
      match = ERROR_CODE_MAP.user_already_exists;
    } else if (rawMessage.includes('rate limit') || rawMessage.includes('too many requests')) {
      match = ERROR_CODE_MAP.over_email_send_rate_limit;
    } else if (rawMessage.includes('password') && (rawMessage.includes('weak') || rawMessage.includes('least 8'))) {
      match = ERROR_CODE_MAP.weak_password;
    } else if (rawMessage.includes('same password')) {
      match = ERROR_CODE_MAP.same_password;
    }
  }

  const finalCode = options.fallbackCode ?? match?.code ?? AuthErrorCode.INTERNAL_AUTH_ERROR;
  const finalMessage = options.fallbackMessage ?? match?.message ?? 'An authentication error occurred. Please try again.';
  const finalStatus = options.fallbackStatus ?? match?.status ?? 400;

  return {
    status: finalStatus,
    body: {
      success: false,
      error: {
        code: finalCode,
        message: finalMessage,
        status: finalStatus,
        feedbackMode: options.feedbackMode ?? match?.feedbackMode ?? 'toast',
        severity: options.severity ?? match?.severity ?? 'error',
        details: options.details,
        traceId: options.traceId,
        timestamp: new Date().toISOString(),
        actionHint: options.actionHint ?? match?.actionHint ?? 'RETRY',
      },
    },
  };
}
