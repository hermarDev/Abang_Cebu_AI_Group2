import {
  AuthErrorCode,
  REGISTRATION_VALIDATION_RULES,
  createAuthError,
  normalizePhilippinePhoneNumber,
  validatePasswordStrength,
  type AuthErrorResponse,
  type RegisterPayload,
} from '@/types/auth';

type ValidatedRole = Exclude<RegisterPayload['role'], 'admin'>;

export type ValidatedRegistration = Omit<RegisterPayload, 'email' | 'phoneNumber'> & {
  email: string;
  phoneNumber?: string | null;
};

export type RegistrationValidationResult =
  | { success: true; value: ValidatedRegistration }
  | { success: false; error: AuthErrorResponse };

const registrationRoleSet = new Set<ValidatedRole>(['renter', 'landlord']);

const allowedCallbackDestinations = new Set([
  '/search',
  '/onboarding/renter',
  '/landlord/onboarding',
  '/account/profile',
  '/renter/favorites',
]);

export function getRegistrationRedirect(role: unknown, next: string | null): string {
  if (role === 'landlord') return '/landlord/onboarding';
  return next && allowedCallbackDestinations.has(next) ? next : '/search';
}

export function validateRegistrationPayload(input: unknown, options: { requireChallenge?: boolean } = {}): RegistrationValidationResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      success: false,
      error: createAuthError(AuthErrorCode.VALIDATION_ERROR, 'The submitted registration data is invalid.', {
        status: 422,
        details: [{ field: 'payload', code: AuthErrorCode.MISSING_REQUIRED_FIELD, message: 'Required registration fields are missing.' }],
      }),
    };
  }

  const payload = input as Record<string, unknown>;
  if (typeof payload.role === 'string' && payload.role.trim().toLowerCase() === 'admin') {
    return {
      success: false,
      error: createAuthError(AuthErrorCode.PRIVILEGE_ESCALATION_ATTEMPT, 'Administrative accounts cannot be self-registered.', { status: 403 }),
    };
  }

  const details: NonNullable<AuthErrorResponse['error']['details']> = [];
  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  const password = typeof payload.password === 'string' ? payload.password : '';
  const fullName = typeof payload.fullName === 'string' ? payload.fullName.trim() : '';
  const phone = typeof payload.phoneNumber === 'string' ? payload.phoneNumber : undefined;
  const preferredLandmark = typeof payload.preferredLandmark === 'string' ? payload.preferredLandmark.trim() : undefined;
  const { email: emailRules, fullName: nameRules } = REGISTRATION_VALIDATION_RULES;

  if (options.requireChallenge && (typeof payload.turnstileToken !== 'string' || !payload.turnstileToken.trim())) {
    return { success: false, error: createAuthError(AuthErrorCode.CAPTCHA_VERIFICATION_FAILED, 'Verification failed. Please try again.', { status: 400 }) };
  }
  if (!email) {
    details.push({ field: 'email', code: AuthErrorCode.MISSING_REQUIRED_FIELD, message: 'Email is required.' });
  } else if (email.length > emailRules.maxLength || !emailRules.regex.test(email)) {
    details.push({ field: 'email', code: AuthErrorCode.INVALID_EMAIL_FORMAT, message: 'Please enter a valid email address.' });
  }
  if (!password) {
    details.push({ field: 'password', code: AuthErrorCode.MISSING_REQUIRED_FIELD, message: 'Password is required.' });
  } else if (password.trim() !== password) {
    details.push({ field: 'password', code: AuthErrorCode.WEAK_PASSWORD, message: 'Password must not start or end with whitespace.' });
  } else {
    const strength = validatePasswordStrength(password);
    if (!strength.isValid) {
      details.push({ field: 'password', code: AuthErrorCode.WEAK_PASSWORD, message: 'Password must be 8 to 72 characters and include at least three character classes.' });
    }
  }
  const role = typeof payload.role === 'string' && registrationRoleSet.has(payload.role as ValidatedRole)
    ? payload.role as ValidatedRole
    : undefined;
  if (!role) {
    details.push({ field: 'role', code: AuthErrorCode.INVALID_ROLE, message: 'Choose renter or landlord.' });
  }
  if (!fullName) {
    details.push({ field: 'fullName', code: AuthErrorCode.MISSING_REQUIRED_FIELD, message: 'Full name is required.' });
  } else if (fullName.length < nameRules.minLength || fullName.length > nameRules.maxLength || !nameRules.regex.test(fullName)) {
    details.push({ field: 'fullName', code: AuthErrorCode.VALIDATION_ERROR, message: 'Enter a valid name between 2 and 100 characters.' });
  }
  const phoneNumber = phone === undefined || phone.trim() === '' ? undefined : normalizePhilippinePhoneNumber(phone);
  if (phone !== undefined && phone.trim() !== '' && !phoneNumber) {
    details.push({ field: 'phoneNumber', code: AuthErrorCode.INVALID_PHONE_NUMBER, message: 'Enter a valid Philippine mobile number.' });
  }
  if (preferredLandmark !== undefined && (preferredLandmark.length > 100 || !/^[\p{L}\p{N}\s.,'’()\-/#&]+$/u.test(preferredLandmark))) {
    details.push({ field: 'preferredLandmark', code: AuthErrorCode.VALIDATION_ERROR, message: 'Enter a valid landmark up to 100 characters.' });
  }

  if (details.length) {
    return {
      success: false,
      error: createAuthError(AuthErrorCode.VALIDATION_ERROR, 'The submitted registration data is invalid.', { status: 422, details }),
    };
  }

  return {
    success: true,
    value: {
      email,
      password,
      role: role as ValidatedRole,
      fullName,
      phoneNumber,
      preferredLandmark,
      turnstileToken: typeof payload.turnstileToken === 'string' ? payload.turnstileToken : undefined,
    },
  };
}
