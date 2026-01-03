import { test, expect } from '../fixtures/cleanup-fixture'

import { getVerificationTokenByEmail } from '../helpers/db.helper'
import { CustomerAccountPage } from '../page-objects/customer-account.page'

test.describe('Customer Registration Flow', () => {
  let customerAccountPage: CustomerAccountPage

  test.beforeEach(async ({ page, context }) => {
    // Clear cookies and storage to ensure clean state for each test
    await context.clearCookies()
    await page.goto('/en')
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
    await page.waitForLoadState('networkidle')

    customerAccountPage = new CustomerAccountPage(page)
    await customerAccountPage.openAuthModal()
    await customerAccountPage.switchToRegister()
  })

  test.describe('Successful Registration', () => {
    test('should register new customer with email and password', async ({
      page,
    }) => {
      const email = 'mavrick@realadvisor.com'
      const password = 'TestPassword123!'

      // Fill registration form
      await customerAccountPage.register(email, password, password)

      // Should show success message asking to check email
      await expect(page.getByText(/check your email/i).first()).toBeVisible({
        timeout: 10000,
      })
      await expect(
        page.getByText(
          /we sent you a verification link|click the link to verify/i,
        ),
      ).toBeVisible()
    })

    test('should complete email verification flow and auto-login', async ({
      page,
    }) => {
      const email = 'mavrick@realadvisor.com'
      const password = 'TestPassword123!'

      // Register the customer
      await customerAccountPage.register(email, password, password)

      // Wait for registration success
      await expect(page.getByText(/check your email/i).first()).toBeVisible({
        timeout: 10000,
      })

      // Get verification token from database
      const token = await getVerificationTokenByEmail(email)
      expect(token).toBeTruthy()

      // Navigate to verification URL
      await page.goto(`/en/auth/verify?token=${token}`)
      await page.waitForLoadState('networkidle')

      // Should show success message
      await expect(
        page.getByText(/email verified|welcome to finenail/i),
      ).toBeVisible({ timeout: 10000 })

      // Click continue to account button
      await page
        .getByRole('button', { name: /continue to your account/i })
        .click()

      // Should be redirected to account page (auto-login successful)
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL(/\/en\/account/)

      // Should be able to access account page without redirect (logged in)
      await page.reload()
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL(/\/en\/account/)
    })
  })

  test.describe('Validation Errors', () => {
    test('shows validation errors for invalid input (smoke test)', async ({
      page,
    }) => {
      const password = 'TestPassword123!'

      // Try to submit with invalid email
      await customerAccountPage.fillRegistrationForm(
        'invalid-email',
        password,
        password,
      )

      // Should show validation error
      await expect(
        page.getByText(/please enter a valid email address/i),
      ).toBeVisible({ timeout: 5000 })

      // Clear and try with empty email
      const emailInput = page.locator('input[type="email"]')
      await emailInput.clear()
      await customerAccountPage.submitRegistration()

      await expect(
        page.locator('text=/email is required|required/i').first(),
      ).toBeVisible()
    })
  })

  test.describe('Duplicate Email Handling', () => {
    test('should show error when registering with existing email', async ({
      page,
    }) => {
      const uniqueId = `e2e-test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const email = 'mavrick@realadvisor.com'
      const password = 'TestPassword123!'

      // Register first time
      await customerAccountPage.register(email, password, password)

      // Wait for success message
      await expect(page.getByText(/check your email/i).first()).toBeVisible({
        timeout: 10000,
      })

      // Close the dialog or refresh to reset state
      await page.reload()
      await page.waitForLoadState('networkidle')

      // Try to register again with the same email
      await customerAccountPage.openAuthModal()
      await customerAccountPage.switchToRegister()
      await customerAccountPage.fillRegistrationForm(email, password, password)
      await customerAccountPage.submitRegistration()

      // Should show error about duplicate email
      await expect(
        page.getByText(
          /an account with this email already exists|email already exists|please login/i,
        ),
      ).toBeVisible({ timeout: 10000 })

      // Success message should NOT be visible
      await expect(
        page.getByText(/check your email/i).first(),
      ).not.toBeVisible()
    })
  })

  test.describe('Email Verification Edge Cases', () => {
    test('should show error for invalid verification token', async ({
      page,
    }) => {
      // Navigate to verification with invalid token
      await page.goto('/en/auth/verify?token=invalid-token-12345')
      await page.waitForLoadState('networkidle')

      // Should show error message
      await expect(page.getByText(/verification failed/i)).toBeVisible({
        timeout: 10000,
      })
    })

    test('should show error for expired verification token', async ({
      page,
    }) => {
      // Navigate to verification with expired token format
      await page.goto('/en/auth/verify?token=expired-token-xyz')
      await page.waitForLoadState('networkidle')

      // Should show verification failed
      await expect(page.getByText(/verification failed/i)).toBeVisible({
        timeout: 10000,
      })
    })

    test('should show error when no token is provided', async ({ page }) => {
      // Navigate to verification without token
      await page.goto('/en/auth/verify')
      await page.waitForLoadState('networkidle')

      // Should show invalid link error
      await expect(page.getByText(/invalid link/i)).toBeVisible()
      await expect(
        page.getByText(/this verification link is invalid or has expired/i),
      ).toBeVisible()
    })

    test('should allow requesting new verification link on error', async ({
      page,
    }) => {
      // Navigate to verification with invalid token
      await page.goto('/en/auth/verify?token=invalid-token-12345')
      await page.waitForLoadState('networkidle')

      // Wait for error message
      await expect(page.getByText(/verification failed/i)).toBeVisible({
        timeout: 10000,
      })

      // Click to request new verification link
      await page
        .getByRole('button', { name: /request new verification link/i })
        .click()

      // Should show email input form
      await expect(page.getByLabel(/email address/i)).toBeVisible()

      // Fill in email
      const email = 'mavrick@realadvisor.com'
      await page.getByLabel(/email address/i).fill(email)

      // Submit
      await page.getByRole('button', { name: /^send$/i }).click()

      // Should show success message (even if email doesn't exist, for security)
      await expect(
        page.getByText(
          /if an account exists, a verification email has been sent/i,
        ),
      ).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Loading States', () => {
    test('should show loading state during registration', async ({ page }) => {
      const uniqueId = `e2e-test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const email = 'mavrick@realadvisor.com'
      const password = 'TestPassword123!'

      await customerAccountPage.fillRegistrationForm(email, password, password)

      // Click submit
      await customerAccountPage.submitRegistration()

      // Should show loading state on button
      await expect(
        page.getByRole('button', { name: /creating account/i }),
      ).toBeVisible({ timeout: 2000 })
    })
  })

  test.describe('Multi-Language Support', () => {
    test('should work with French language route', async ({ page }) => {
      const uniqueId = `e2e-test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const email = 'mavrick@realadvisor.com'
      const password = 'TestPassword123!'

      // Navigate to French route
      await page.goto('/fr')
      await page.waitForLoadState('networkidle')

      // Open auth modal and switch to register
      await customerAccountPage.openAuthModal()
      await customerAccountPage.switchToRegister()

      // Register
      await customerAccountPage.register(email, password, password)

      // Should show success message (may be in French or English)
      await expect(
        page.getByText(/check your email|vérifiez votre email/i).first(),
      ).toBeVisible({ timeout: 10000 })

      // Get verification token
      const token = await getVerificationTokenByEmail(email)

      // Verify with French route
      await page.goto(`/fr/auth/verify?token=${token}`)
      await page.waitForLoadState('networkidle')

      // Should show success
      await expect(
        page.getByText(/email verified|welcome to finenail|bienvenue/i),
      ).toBeVisible({ timeout: 10000 })

      // Click continue
      await page
        .getByRole('button', { name: /continue to your account|continuer/i })
        .click()

      // Should be on French account page
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL(/\/fr\/account/)
    })
  })

  test.describe('Session Persistence', () => {
    test('should persist session after verification and page refresh', async ({
      page,
    }) => {
      const uniqueId = `e2e-test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const email = 'mavrick@realadvisor.com'
      const password = 'TestPassword123!'

      // Register
      await customerAccountPage.register(email, password, password)
      await expect(page.getByText(/check your email/i).first()).toBeVisible({
        timeout: 10000,
      })

      // Get verification token and verify
      const token = await getVerificationTokenByEmail(email)
      await page.goto(`/en/auth/verify?token=${token}`)
      await page.waitForLoadState('networkidle')

      // Wait for success and continue
      await expect(
        page.getByText(/email verified|welcome to finenail/i),
      ).toBeVisible({ timeout: 10000 })
      await page
        .getByRole('button', { name: /continue to your account/i })
        .click()
      await page.waitForLoadState('networkidle')

      // Should be on account page
      await expect(page).toHaveURL(/\/en\/account/)

      // Refresh the page
      await page.reload()
      await page.waitForLoadState('networkidle')

      // Should still be on account page (session persisted)
      await expect(page).toHaveURL(/\/en\/account/)

      // Navigate away and back
      await page.goto('/en')
      await page.waitForLoadState('networkidle')
      await customerAccountPage.navigateToAccount()

      // Should still be able to access without redirect
      await expect(page).toHaveURL(/\/en\/account/)
    })
  })
})
