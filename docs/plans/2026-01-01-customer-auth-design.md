# Customer Authentication Design

## Overview

Implement customer-facing login/register functionality with email/password and Google OAuth. Currently, customers are created as guests during checkout with no way to login afterward.

## Authentication Methods

### Email + Password

- Customer registers with email only
- System sends verification email via SendGrid
- Customer clicks link to set password and activate account
- Login with email + password after activation

### Google OAuth

- Direct OAuth 2.0 implementation (no library)
- Single "Continue with Google" button for login/register
- Auto-creates account if new, links if existing

## User Flows

### Registration Flow

```
User clicks "Create Account"
  → Enters email
  → System checks if email exists
    → User exists: "Account exists. Login instead?"
    → Guest customer exists: Continue (will link later)
    → New: Continue
  → Creates unverified user record (no password)
  → Sends verification email via SendGrid
  → Email contains link: /auth/verify?token=xxx (24h expiry)
  → User clicks link → Password setup page
  → User creates password → Account activated
  → Auto-links any guest customer with same email
```

### Login Flow

```
User clicks "Login"
  → Enters email + password
  → System validates credentials
  → Creates session → Redirects to account
```

### Google OAuth Flow

```
User clicks "Continue with Google"
  → Redirect to Google consent screen
  → Google redirects back with auth code
  → System exchanges code for tokens
  → System gets user email from Google
    → User exists by googleId: Login
    → User exists by email: Link googleId, login
    → New: Create user + customer
  → Creates session, redirects to account
```

### Password Reset Flow

```
User clicks "Forgot password?"
  → Enters email
  → System sends reset email (1h expiry)
  → User clicks link → Password reset page
  → User enters new password → Updated
```

## Database Schema Changes

### Users Table (add columns)

```sql
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN google_id TEXT;
```

### New Table: email_verification_tokens

```sql
CREATE TABLE email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,  -- 'verify_email' | 'reset_password'
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

## API Routes

### New Routes

| Method | Path                      | Description                            |
| ------ | ------------------------- | -------------------------------------- |
| POST   | /api/auth/register        | Create unverified user, send email     |
| POST   | /api/auth/verify-email    | Validate token, set password, activate |
| POST   | /api/auth/forgot-password | Send password reset email              |
| POST   | /api/auth/reset-password  | Validate token, update password        |
| GET    | /api/auth/google          | Redirect to Google OAuth               |
| GET    | /api/auth/google/callback | Handle Google callback                 |

### Existing Routes (no changes)

- POST /api/auth/login - Works for email/password
- GET /api/auth/me - Works for session check

### Deprecated

- POST /api/customers/register - Replaced by new flow

## UI Components

### Folder Structure

```
/src/features/auth/
  ├── components/
  │   ├── AuthModal.tsx        # Portal + Radix Dialog wrapper
  │   ├── AuthForm.tsx         # Login/Register tabs
  │   ├── LoginForm.tsx        # Email + password fields
  │   ├── RegisterForm.tsx     # Email field only
  │   ├── GoogleButton.tsx     # OAuth button
  │   ├── PasswordSetupForm.tsx
  │   └── ForgotPasswordForm.tsx
  ├── hooks/
  │   └── useAuthModal.ts      # Zustand store
  ├── lib/
  │   └── google-oauth.ts      # OAuth URL builders
  └── index.ts                 # Public exports
```

### Auth Layout Pattern (TanStack Best Practice)

```tsx
// /src/routes/$lang/_authenticated.tsx
function AuthenticatedLayout() {
  const { customer, isLoading } = useCustomerSession()

  if (isLoading) return <LoadingSpinner />

  if (!customer) {
    return (
      <>
        <AuthModal defaultOpen defaultView="login" />
        <div className="opacity-50 pointer-events-none">
          <Outlet />
        </div>
      </>
    )
  }

  return <Outlet />
}
```

### Page Routes

```
/$lang/auth/              # Login/register page (fallback)
/$lang/auth/verify        # Password setup (?token=xxx)
/$lang/auth/forgot-password
/$lang/auth/reset-password
```

### Modal Trigger Points

- Header login button
- Account page auth guard (shows modal, keeps URL)

## Email Integration

### SendGrid Setup

```typescript
// /src/lib/email.ts
import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

export async function sendEmail({ to, subject, html, text }) {
  await sgMail.send({
    to,
    from: process.env.EMAIL_FROM!,
    subject,
    html,
    text,
  })
}
```

### Email Templates

- **Verification**: "Verify your email" - Link expires in 24 hours
- **Password Reset**: "Reset your password" - Link expires in 1 hour

## Google OAuth Implementation

### OAuth URL Builder

```typescript
function getGoogleAuthUrl(returnUrl?: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${process.env.BASE_URL}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state: returnUrl || '/account',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}
```

### Callback Handler Logic

1. Get code and state from query params
2. Exchange code for tokens
3. Get user info from Google
4. Find or create user (by googleId, then by email)
5. Link or create customer record
6. Create session, redirect to state URL

## Security

### Token Security

- Generate 32-byte random tokens
- Store hashed (SHA-256) in database
- Send raw token in email

### Rate Limiting

- Register: 5 attempts per minute
- Login: 10 attempts per minute
- Forgot password: 3 attempts per minute

### Password Requirements

- Minimum 8 characters
- At least one number

### CSRF Protection

- Existing middleware applies to all POST endpoints
- Google OAuth uses state parameter

## Environment Variables

```env
# SendGrid
SENDGRID_API_KEY=SG.xxx
EMAIL_FROM=noreply@yourstore.com

# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx

# App
BASE_URL=http://localhost:3000
```

## Guest Customer Linking

When a guest customer (created during checkout) registers with the same email:

1. System auto-links guest customer to new user account
2. Previous orders become visible in account
3. If checkout had `pendingSaveAddress=true`, address is saved

This matches existing behavior in the codebase.
