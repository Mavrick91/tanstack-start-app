import { test, expect } from '@playwright/test'
import { AdminLoginPage } from '../page-objects/admin-login.page'
import { TEST_DATA } from '../fixtures/test-data'

test.describe('Admin Login Flow', () => {
  let adminLoginPage: AdminLoginPage

  test.beforeEach(async ({ page }) => {
    adminLoginPage = new AdminLoginPage(page)
    await adminLoginPage.goto()
  })

  test('should display login form', async () => {
    await expect(adminLoginPage.emailInput).toBeVisible()
    await expect(adminLoginPage.passwordInput).toBeVisible()
    await expect(adminLoginPage.submitButton).toBeVisible()
  })

  test('should login successfully with valid credentials', async () => {
    await adminLoginPage.login(TEST_DATA.admin.email, TEST_DATA.admin.password)
    await adminLoginPage.expectSuccessfulLogin()
  })

  test('should show error with invalid credentials', async () => {
    await adminLoginPage.login('invalid@example.com', 'wrongpassword')
    await adminLoginPage.expectLoginError()
  })

  test('should show validation error for empty email', async ({ page }) => {
    await adminLoginPage.passwordInput.fill('somepassword')
    await adminLoginPage.submitButton.click()
    await expect(page.locator('text=Email is required')).toBeVisible()
  })

  test('should show validation error for empty password', async ({ page }) => {
    await adminLoginPage.emailInput.fill('test@example.com')
    await adminLoginPage.submitButton.click()
    await expect(page.locator('text=Password is required')).toBeVisible()
  })

  test('should redirect to admin dashboard after login', async ({ page }) => {
    await adminLoginPage.login(TEST_DATA.admin.email, TEST_DATA.admin.password)
    await expect(page).toHaveURL('/admin')
  })

  test('should maintain session after page refresh', async ({ page }) => {
    await adminLoginPage.login(TEST_DATA.admin.email, TEST_DATA.admin.password)
    await adminLoginPage.expectSuccessfulLogin()

    await page.reload()

    await expect(page).toHaveURL('/admin')
  })
})
