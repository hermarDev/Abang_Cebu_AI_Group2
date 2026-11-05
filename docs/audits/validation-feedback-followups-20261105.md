# Validation and feedback follow-up tasks

Source: [validation audit](validation-feedback-20261104/validation-feedback-audit.md), [roadmap](validation-feedback-20261104/validation-error-handling-plan.md). These are investigation tasks, not confirmed defects or approved implementation work. Source references are the audit snapshot and must be rechecked before work.

- R-01: Measure the listing preview action bar and landlord navigation at narrow and short viewports, including hit testing. Evidence: audit R-01; `src/app/list-property/ListPropertyForm.tsx`, `src/features/landlord/LandlordMobileNav.tsx`. Browser reproduction NOT RUN.
- R-02: Test focus and announcement when registration replaces its form with the success state. Evidence: audit R-02; `src/components/auth/RegisterForm.tsx`. Browser and assistive technology verification NOT RUN.
- R-03: In a separately authorized isolated database and storage environment, inject a lost profile-update acknowledgement after commit; inspect both profile reference and stored object before proposing remediation. Evidence: audit R-03; `src/app/account/actions.ts`. Fault injection NOT RUN; no loss established.
- R-04: Obtain ingress trust and deployment topology evidence; assess process-local limits and direct-provider abuse controls before proposing distributed limits or proxy-header changes. Evidence: audit R-04; `src/app/api/auth/register/route.ts`, `src/app/api/auth/reset-password/request/route.ts`. Hosted configuration NOT VERIFIED.
- R-05: Test listing preview native validation, file-control focus, contrast and mobile action geometry in the mounted browser before proposing field-feedback changes. Evidence: audit R-05; `src/app/list-property/ListPropertyForm.tsx`. Browser reproduction NOT RUN.
- R-06: Reassess toast duration, dismissal and stacking only if a production use case is established. Evidence: audit R-06; `src/components/ui/Toast.tsx`, `src/components/ui/examples.tsx`. Production impact NOT ESTABLISHED.
- R-07: Test direct and menu-to-modal close focus, including connected and detached triggers, before changing the wrapper. Evidence: audit R-07; `src/components/ui/Modal.tsx`. Browser reproduction NOT RUN.
- R-08: Trace profile server validation through all submit paths and exercise invalid responses with values preserved; identify fields and accessible associations before designing a change. Evidence: audit R-08; `src/app/account/actions.ts`, `src/app/account/AccountSettingsForm.tsx`. Failure behavior NOT RUN.
- R-09: Compare registration, recovery, account change and actual provider password policy; assess applicable guidance and coordinated migration/rollback before any policy change. Evidence: audit R-09; `src/types/auth.ts`, `src/lib/auth/validation.ts`, `src/lib/auth/password-reset-validation.ts`. Hosted policy and migration requirements NOT VERIFIED.

No storage/database fault injection, live-provider testing or conditional T05–T08 implementation is authorized by this document.
