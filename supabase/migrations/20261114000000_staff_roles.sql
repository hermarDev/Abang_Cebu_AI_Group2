-- Enum values must commit before later migrations use them.
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'verification_officer';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'customer_support';
