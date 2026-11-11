# AbangCebuAI — Supabase & Brevo Production Integration Checklist

**Document Version:** 1.0.0  
**Target Environment:** Supabase Cloud Management Console & Brevo (Sendinblue) Dashboard  
**Security Classification:** Operational Manual Configuration Guide

---

## 1. Architectural Summary

AbangCebuAI uses **Supabase Auth GoTrue** as the sole email dispatch orchestrator. The Next.js application does not call the Brevo REST API directly. Instead:
1. Next.js triggers `supabase.auth.signUp()` or `supabase.auth.resetPasswordForEmail()`.
2. Supabase GoTrue issues the PKCE token / confirmation token.
3. Supabase GoTrue dispatches the formatted email using **Custom SMTP via Brevo Relay** (`smtp-relay.brevo.com`).

---

## 2. Brevo Domain & Sender Preparation

Before configuring Supabase, the sending domain must be authenticated in Brevo:

### 2.1 Brevo Domain Authentication (DNS Records)
In Brevo (**Settings ➔ Senders & IP ➔ Domains ➔ Add a domain: `abangcebu.tech`**):

| Record Type | Host / Name | Target / Value | Purpose |
|---|---|---|---|
| **TXT** | `abangcebu.tech` | `v=spf1 include:spf.brevo.com ~all` | SPF (Sender Policy Framework) |
| **TXT** | `mail._domainkey.abangcebu.tech` | `k=rsa; p=<Brevo-DKIM-Key>` | DKIM (DomainKeys Identified Mail) |
| **TXT** | `_dmarc.abangcebu.tech` | `v=DMARC1; p=none; rua=mailto:dmarc@abangcebu.tech` | DMARC Alignment |

Verify in Brevo that all three records show **Authenticated**.

### 2.2 Brevo SMTP Credentials Generation
In Brevo (**Settings ➔ SMTP & API ➔ SMTP**):
1. Click **Generate a new SMTP key**.
2. Name: `AbangCebu-Production-Supabase`.
3. Copy the master password / API key.
4. Note the SMTP parameters:
   - **Host:** `smtp-relay.brevo.com`
   - **Port:** `587`
   - **Username:** `<your-brevo-account-email>`
   - **Password:** `<generated-smtp-key>`

---

## 3. Supabase Dashboard Configuration

In the production Supabase Project (**https://supabase.com/dashboard/project/<project-id>**):

### 3.1 URL Configuration (Authentication ➔ URL Configuration)
- [ ] **Site URL:** `https://abangcebu.tech`
- [ ] **Redirect URLs (Allowlist):**
  - `https://abangcebu.tech/auth/callback`
  - `https://abangcebu.tech/auth/reset-password/callback`
  - `https://abangcebu.tech/**` (Optional glob for deep routing)

### 3.2 Custom SMTP Configuration (Authentication ➔ SMTP Settings)
- [ ] **Enable Custom SMTP:** Toggle ON.
- [ ] **Sender Email:** `noreply@abangcebu.tech` (Must match authenticated Brevo domain)
- [ ] **Sender Name:** `AbangCebu`
- [ ] **Host:** `smtp-relay.brevo.com`
- [ ] **Port:** `587`
- [ ] **Minimum TLS Version:** `v1.2`
- [ ] **User:** `<your-brevo-login-email>`
- [ ] **Password:** `<brevo-smtp-key>`
- [ ] **Save and Send Test Email:** Verify test email reaches inbox without spam flagging.

### 3.3 Email Templates Configuration (Authentication ➔ Email Templates)

#### Template 1: Confirm Signup (`Confirm your signup`)
- **Subject:** `Confirm your AbangCebu account`
- **Body:**
  ```html
  <h2>Welcome to AbangCebu!</h2>
  <p>Follow this link to verify your email address and activate your account:</p>
  <p><a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:12px 24px;background-color:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">Confirm Email Address</a></p>
  <p>If you did not sign up for an AbangCebu account, you can safely ignore this email.</p>
  <p style="color:#64748b;font-size:12px;">Link expires in 24 hours.</p>
  ```

#### Template 2: Reset Password (`Reset password`)
- **Subject:** `Reset your AbangCebu password`
- **Body:**
  ```html
  <h2>Reset Your Password</h2>
  <p>We received a request to reset the password for your AbangCebu account.</p>
  <p><a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:12px 24px;background-color:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">Set New Password</a></p>
  <p>This password reset link is valid for 10 minutes. If you did not request this change, please ignore this email or contact support.</p>
  ```

---

## 4. Supabase Storage Buckets Pre-Flight Audit

Verify that the following 5 storage buckets exist with their exact security policies:

| Bucket Name | Visibility | Max Size | Allowed MIME Types | Client Access Policy |
|---|---|---|---|---|
| `property-images` | Public | 10 MB | `image/jpeg`, `image/png`, `image/webp` | Authenticated landlords upload to `/auth.uid()/*`. |
| `kyc-documents` | Private | 10 MB | `image/jpeg`, `image/png`, `application/pdf` | Landlord upload to `/auth.uid()/*`. Admin read. |
| `profile-avatars` | Private | 2 MB | `image/jpeg`, `image/png`, `image/webp` | Owner upload to `/auth.uid()/*`. Served via signed URLs. |
| `property-draft-media` | Private | 10 MB | `image/jpeg`, `image/png`, `image/webp`, `application/pdf` | **Client access DENIED**. Managed strictly via Service Role. |
| `rental-message-attachments`| Private | 10 MB | `image/jpeg`, `image/png`, `image/webp` | Conversation participants only. |

---

## 5. Verification Checklist

- [ ] Brevo sending domain `abangcebu.tech` verified with green checkmarks for SPF and DKIM.
- [ ] Supabase SMTP test email sent and verified in inbox.
- [ ] User registration test: confirmation link opens `https://abangcebu.tech/auth/callback?next=/` and verifies session.
- [ ] Password recovery test: reset link opens `https://abangcebu.tech/auth/reset-password/callback?type=recovery&next=/reset-password` and successfully sets a new password.
- [ ] No registration or recovery email ever contains `localhost:3000`.
