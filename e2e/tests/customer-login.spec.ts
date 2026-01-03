import { test, expect } from '@playwright/test'

import { seedAuthenticatedCustomer } from '../helpers/db.helper'
import { CustomerAccountPage } from '../page-objects/customer-account.page'

test.describe('Customer Login Flow', () => {
  let customerAccountPage: CustomerAccountPage

  test.beforeEach(async ({ page }) => {
    customerAccountPage = new CustomerAccountPage(page)
  })

  test('should redirect to home when accessing account without login', async ({
    page,
  }) => {
    await customerAccountPage.navigateToAccount()

    // Should be redirected to home page
    await expect(page).toHaveURL(/\/en$/)
  })

  test('should display auth dialog when clicking user icon', async () => {
    await customerAccountPage.goto()
    await customerAccountPage.openAuthModal()

    // Auth dialog should be visible
    await customerAccountPage.expectAuthDialogVisible()
  })

  test('should have login and register tabs', async () => {
    await customerAccountPage.goto()
    await customerAccountPage.openAuthModal()

    // Default should be login tab
    await expect(customerAccountPage.loginTab).toBeVisible()

    // Register tab should also be visible
    await expect(customerAccountPage.registerTab).toBeVisible()
  })

  test('should display Google login button', async () => {
    await customerAccountPage.goto()
    await customerAccountPage.openAuthModal()

    // Google button should be visible
    await expect(customerAccountPage.googleButton).toBeVisible()
  })

  test('should login successfully with valid credentials', async ({ page }) => {
    // Seed a test customer with credentials (unique email generated automatically)
    const testCustomer = await seedAuthenticatedCustomer()

    await customerAccountPage.goto()
    await customerAccountPage.openAuthModal()
    await customerAccountPage.login(testCustomer.email, testCustomer.password)
    await customerAccountPage.expectSuccessfulLogin()

    // After login, can navigate to account page
    await customerAccountPage.navigateToAccount()
    await expect(page).toHaveURL(/\/en\/account/)
  })

  test('should show error with invalid credentials', async () => {
    await customerAccountPage.goto()
    await customerAccountPage.openAuthModal()
    await customerAccountPage.login('invalid@example.com', 'wrongpassword')

    // Login should fail - auth dialog should still be visible
    await customerAccountPage.expectAuthDialogVisible()

    // Should still be on home page
    await customerAccountPage.page.waitForTimeout(2000)
    await expect(customerAccountPage.page).toHaveURL(/\/en$/)
  })

  test('should show validation error for empty email', async ({ page }) => {
    await customerAccountPage.goto()
    await customerAccountPage.openAuthModal()
    await customerAccountPage.passwordInput.fill('somepassword')
    await customerAccountPage.signInButton.click()

    // Check for validation error
    await expect(
      page.locator('text=/email is required|required/i').first(),
    ).toBeVisible()
  })

  test('should show validation error for empty password', async ({ page }) => {
    await customerAccountPage.goto()
    await customerAccountPage.openAuthModal()
    await customerAccountPage.emailInput.fill('test@example.com')
    await customerAccountPage.signInButton.click()

    // Check for validation error
    await expect(
      page.locator('text=/password is required|required/i').first(),
    ).toBeVisible()
  })

  test('should show validation error for invalid email format', async () => {
    await customerAccountPage.goto()
    await customerAccountPage.openAuthModal()
    await customerAccountPage.emailInput.fill('invalid-email')
    await customerAccountPage.passwordInput.fill('somepassword')
    await customerAccountPage.signInButton.click()

    // Check for validation error - browser's built-in validation prevents submission
    // The auth dialog should still be visible (form didn't submit)
    await customerAccountPage.expectAuthDialogVisible()

    // The email input should be focused or show validation UI
    await expect(customerAccountPage.emailInput).toBeFocused()
  })

  test('should switch between login and register tabs', async () => {
    await customerAccountPage.goto()
    await customerAccountPage.openAuthModal()

    // Default should be login tab
    await expect(customerAccountPage.loginTab).toBeVisible()

    // Switch to register
    await customerAccountPage.switchToRegister()
    await expect(customerAccountPage.registerTab).toHaveAttribute(
      'aria-selected',
      'true',
    )

    // Switch back to login
    await customerAccountPage.switchToLogin()
    await expect(customerAccountPage.loginTab).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  test('should allow access to account page after login', async ({ page }) => {
    const testCustomer = await seedAuthenticatedCustomer()

    await customerAccountPage.goto()
    await customerAccountPage.openAuthModal()
    await customerAccountPage.login(testCustomer.email, testCustomer.password)
    await customerAccountPage.expectSuccessfulLogin()

    // Can navigate to account page after login
    await customerAccountPage.navigateToAccount()
    await expect(page).toHaveURL(/\/en\/account/)
  })

  test('should hide auth dialog after successful login', async () => {
    const testCustomer = await seedAuthenticatedCustomer()

    await customerAccountPage.goto()
    await customerAccountPage.openAuthModal()
    await customerAccountPage.login(testCustomer.email, testCustomer.password)

    // Wait for auth dialog to disappear
    await customerAccountPage.expectAuthDialogHidden()
  })

  test('should disable submit button while logging in', async ({ page }) => {
    const testCustomer = await seedAuthenticatedCustomer()

    await customerAccountPage.goto()
    await customerAccountPage.openAuthModal()
    await customerAccountPage.emailInput.fill(testCustomer.email)
    await customerAccountPage.passwordInput.fill(testCustomer.password)

    // Click sign in
    await customerAccountPage.signInButton.click()

    // Button text should change during loading
    const signingInButton = page.getByRole('button', { name: /signing in/i })
    await expect(signingInButton).toBeVisible({ timeout: 1000 })
  })

  test('should persist session after page refresh', async ({ page }) => {
    const testCustomer = await seedAuthenticatedCustomer()

    await customerAccountPage.goto()
    await customerAccountPage.openAuthModal()

    // Login first
    await customerAccountPage.login(testCustomer.email, testCustomer.password)
    await customerAccountPage.expectSuccessfulLogin()

    // Navigate to account page
    await customerAccountPage.navigateToAccount()

    // Refresh the page
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Should still be on account page (not redirected)
    await expect(page).toHaveURL(/\/en\/account/)
  })

  test('should work with different language routes', async ({ page }) => {
    const testCustomer = await seedAuthenticatedCustomer()

    // Navigate to French route home page
    await page.goto('/fr')
    await page.waitForLoadState('networkidle')

    // Open auth modal from navbar
    await customerAccountPage.openAuthModal()

    // Login should still work
    await customerAccountPage.login(testCustomer.email, testCustomer.password)

    // Wait for dialog to close
    await customerAccountPage.expectAuthDialogHidden()

    // Navigate to French account page
    await page.goto('/fr/account')
    await page.waitForLoadState('networkidle')

    // Should be able to access account page
    await expect(page).toHaveURL(/\/fr\/account/)
  })
})
