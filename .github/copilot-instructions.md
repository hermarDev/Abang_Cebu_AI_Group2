# Copilot Code Review Instructions

This repository uses ESLint and CodeRabbit alongside GitHub Copilot. Keep review comments high-signal and avoid duplicate nits.

## Focus on
- Functional bugs, logic flaws, and unhandled edge cases
- Security vulnerabilities: auth/authorization bypasses, Supabase RLS loopholes, injection, XSS, SSRF, open redirects, secret exposure, and missing input validation at trust boundaries
- Race conditions, stale state, resource leaks, and data-loss risks
- Broken error handling or silent failures in API routes, Server Actions, and migrations

## Skip
- Formatting, import ordering, naming preferences, and style nits covered by ESLint/TypeScript
- Speculative refactors, unnecessary abstractions, or comments/docs suggestions unless misleading or incorrect

## Comment format
- State the concrete defect, its impact, and the minimal fix.
