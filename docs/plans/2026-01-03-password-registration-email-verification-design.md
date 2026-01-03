# Password-Based Customer Registration with Email Verification

**Date:** 2026-01-03
**Status:** Approved
**Type:** Feature Enhancement

## Overview

Replace the current two-step registration flow (email only → verify → set password) with a streamlined one-step flow where customers enter their password during registration, then verify their email to activate their account.

## Problem Statement

The current registration flow requires customers to:
1. Enter only their email
2. Click verification link in email
3. Set their password on the verification page

This creates friction because customers must remember to set a password later, and the verification page unnecessarily delays account activation.

## Solution

### High-Level Flow

**User Journey:**
1. **Registration page** - User enters email + password, clicks "Create account"
2. **Success message** - "Check your email - We sent you a verification link to user@example.com. Click the link to verify your email and access your account."
3. **Email received** - User clicks verification link in email
4. **Verification page** - Shows progress indicator "Verifying your email address..." with animation
5. **Success state** - "Email verified! Welcome to FineNail" with "Continue to your account" button
6. **Account page** - User lands on `/$lang/account`, fully logged in

**Error Handling:**
- **Email already exists** (verified or unverified) → Show error immediately during registration
- **Invalid/expired token** → Show error with "Request new verification link" button
- **Already verified token** → Log user in automatically, redirect to account page

## Technical Design

### 1. Registration Form Changes

**File:** `src/features/auth/components/RegisterForm.tsx`

**Form Definition:**
```typescript
const registerFormDefinition: FormDefinition = {
  fields: [
    {
      name: 'email',
      type: 'email',
      label: 'Email',
      placeholder: 'you@example.com',
      required: true,
    },
    {
      name: 'password',
      type: 'password',
      label: 'Password',
      placeholder: '********',
      required: true,
      validate: (value) => {
        const password = value as string
        if (password.length < 8) {
          return 'Password must be at least 8 characters'
        }
        if (!/\d/.test(password)) {
          return 'Password must contain at least one number'
        }
        return undefined
      },
    },
    {
      name: 'confirmPassword',
      type: 'password',
      label: 'Confirm Password',
      placeholder: '********',
      required: true,
    },
  ],
}
```

**Validation:**
- Client-side validation for password requirements (min 8 chars, must contain number)
- Check password match before calling server function
- Show mismatch error if passwords don't match
- Call `registerCustomerFn({ email, password, lang })`

**Success Message:**
"Check your email - We sent you a verification link to {email}. Click the link to verify your email and access your account."

### 2. Server Function Updates

**File:** `src/server/auth-customer.ts`

#### `registerCustomerFn` Changes

**New Schema:**
```typescript
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/\d/, 'Password must contain at least one number'),
  lang: langSchema,
})
```

**Logic:**
1. Validate email + password with Zod
2. Rate limiting check
3. Check if user exists (any emailVerified state)
   - If exists (verified OR unverified) → Throw 409 error "An account with this email already exists. Please login or use forgot password."
4. Hash the password immediately using `hashPassword()`
5. Create user with `passwordHash` and `emailVerified: false`
6. Create customer record (link to user or update existing guest)
7. Create verification token
8. Send verification email
9. Return success

**Key Changes:**
- Remove the "resend if unverified" logic (we error instead)
- Set `passwordHash` during user creation (not empty string)
- User is created with password but `emailVerified: false`

#### `verifyEmailFn` Changes

**New Schema:**
```typescript
const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
})
```

**Logic:**
1. Validate token with Zod
2. Hash token and look up verification token record
3. **Smart error handling:**
   - If token not found/expired → Throw 400 error
   - If token already used:
     - Get the user from token
     - If user.emailVerified is true → Log them in automatically (they already verified)
     - If user.emailVerified is false → Throw error "This link has already been used"
4. Get user from valid token
5. **Update user:** Set `emailVerified: true` (password already set, don't touch it)
6. Mark token as used
7. Link any existing guest customer
8. Create session
9. Set session cookie
10. Return success with user data

**Key Changes:**
- Remove password parameter completely
- Don't update `passwordHash` (already set during registration)
- Smart handling for already-used tokens (auto-login if verified)
- Still set `emailVerified: true` and create session

### 3. Verification Page UI

**File:** `src/routes/$lang/auth/verify.tsx`

**New Component:** `EmailVerificationHandler`

**Usage:**
```typescript
<EmailVerificationHandler token={token} />
```

**Component Behavior:**

1. **On mount:** Call `verifyEmailFn({ token })` automatically
2. **Loading state:**
   - Animated spinner or pulse animation
   - Text: "Verifying your email address..."
3. **Success state:**
   - Green checkmark icon
   - Heading: "Email verified! Welcome to FineNail"
   - Subtext: "Your account is now active"
   - Button: "Continue to your account" (navigates to `/$lang/account`)
4. **Error state:**
   - Error icon
   - Show error message from server
   - If invalid/expired: Show "Request new verification link" button
   - Button triggers resend verification flow

**Auto-login on success:**
- Session cookie is already set by `verifyEmailFn`
- Invalidate React Query cache to refresh auth state
- Button click navigates to account page

### 4. Resend Verification Email

**New Server Function:** `src/server/auth-customer.ts`

**Function:** `resendVerificationEmailFn`

**Schema:**
```typescript
const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email address'),
  lang: langSchema,
})
```

**Logic:**
1. Rate limiting check
2. Find user by email
3. **Validation:**
   - If user not found → Return success anyway (prevent email enumeration)
   - If user.emailVerified is true → Return success anyway (already verified, don't reveal this)
   - If user.emailVerified is false → Proceed with resend
4. Generate new verification token
5. Insert new token record (old ones can expire naturally)
6. Send verification email
7. Always return success message: "If an account exists, a verification email has been sent"

**UI Integration:**
- Error page on verify route shows "Request new verification link" button
- Button shows a simple email input form
- Calls `resendVerificationEmailFn({ email, lang })`
- Shows success message after submission

**Hook:** `src/hooks/useAuth.ts`
```typescript
export const useResendVerification = () => {
  return useMutation({
    mutationFn: (data: { email: string; lang: 'en' | 'fr' | 'id' }) =>
      resendVerificationEmailFn({ data }),
  })
}
```

### 5. Cleanup and Updates

**Files to Delete:**
1. `src/routes/api/customers/register.ts` - Old registration endpoint (unused)
2. `src/features/auth/components/PasswordSetupForm.tsx` - No longer needed (password set during registration)

**Email Template Update:**
**File:** `src/lib/email.ts`

**Function:** `sendVerificationEmail()`

**Changes:**
- Remove any mention of "set your password"
- Emphasize "verify your email"
- New message: "Click this link to verify your email and activate your account"
- Link still goes to: `${baseUrl}/${lang}/auth/verify?token=${token}`

**Hook Update:**
**File:** `src/hooks/useAuth.ts`

**Update `useAuthRegister` signature:**
```typescript
export const useAuthRegister = () => {
  return useMutation({
    mutationFn: (data: {
      email: string;
      password: string;
      lang: 'en' | 'fr' | 'id'
    }) => registerCustomerFn({ data }),
  })
}
```

## Implementation Checklist

- [ ] Update `RegisterForm.tsx` to include password fields
- [ ] Update `registerCustomerFn` to accept and hash password
- [ ] Update `verifyEmailFn` to remove password parameter and add smart token handling
- [ ] Create new `EmailVerificationHandler` component
- [ ] Update verify route to use new component
- [ ] Create `resendVerificationEmailFn` server function
- [ ] Create `useResendVerification` hook
- [ ] Update `sendVerificationEmail` template
- [ ] Delete `src/routes/api/customers/register.ts`
- [ ] Delete `src/features/auth/components/PasswordSetupForm.tsx`
- [ ] Update tests for `RegisterForm`
- [ ] Update tests for server functions
- [ ] Test complete registration flow
- [ ] Test error scenarios (expired token, already verified, etc.)
- [ ] Test resend verification flow

## Security Considerations

- Password validation enforced both client-side and server-side
- Rate limiting prevents abuse of registration and resend endpoints
- Email enumeration prevented (always return success for resend)
- Tokens are one-time use and expire
- Session created only after email verification
- Password hashed immediately using bcrypt

## User Experience Benefits

1. **Simpler flow** - Set password once during registration, not as a separate step
2. **Less friction** - No need to remember to set password later
3. **Clear messaging** - User knows exactly what to expect at each step
4. **Smart error handling** - Already verified users get logged in automatically
5. **Recovery option** - Can request new verification link if needed

## Testing Strategy

1. **Unit Tests:**
   - `RegisterForm` password validation
   - Server function validation schemas
   - Password hashing logic

2. **Integration Tests:**
   - Complete registration flow (register → verify → login)
   - Duplicate email error
   - Expired token handling
   - Already verified token handling
   - Resend verification flow

3. **E2E Tests:**
   - User registration with email + password
   - Email verification and redirect to account page
   - Error states and recovery flows

## Rollout Plan

1. Implement and test in development
2. Deploy to staging for QA testing
3. Monitor error rates and user feedback
4. Deploy to production
5. Monitor registration completion rates

## Success Metrics

- Registration completion rate (started → verified)
- Time to complete registration (from form submit to account page)
- Error rate on verification page
- Support tickets related to registration issues
