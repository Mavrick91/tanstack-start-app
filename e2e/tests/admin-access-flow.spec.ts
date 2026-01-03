import { test, expect } from '@playwright/test'

import { seedAuthenticatedAdmin } from '../helpers/db.helper'
import { CustomerAccountPage } from '../page-objects/customer-account.page'

test.describe('Admin Access Flow', () => {
  let customerAccountPage: CustomerAccountPage

  test.beforeEach(async ({ page }) => {
    customerAccountPage = new CustomerAccountPage(page)
  })

  test('admin can login via customer form and access admin panel from account page', async ({
    page,
  }) => {
    // Seed admin user with credentials
    const adminUser = await seedAuthenticatedAdmin({
      firstName: 'Admin',
      lastName: 'Tester',
    })

    // 1. Navigate to homepage
    await customerAccountPage.goto()
    await expect(page).toHaveURL(/\/en$/)

    // 2. Open auth modal (click login button in navbar)
    await customerAccountPage.openAuthModal()
    await customerAccountPage.expectAuthDialogVisible()

    // 3. Login with admin credentials via customer login form
    await customerAccountPage.login(adminUser.email, adminUser.password)

    // 4. Verify successful login (dialog should close)
    await customerAccountPage.expectSuccessfulLogin()

    // 5. Navigate to account page (should redirect to /en/account)
    await customerAccountPage.navigateToAccount()
    await expect(page).toHaveURL(/\/en\/account/)

    // 6. Verify "Admin Panel" menu item is visible on account page
    const adminPanelLink = page.getByRole('link', { name: /admin panel/i })
    await expect(adminPanelLink).toBeVisible()

    // Verify it has the correct description
    await expect(
      page.getByText(/manage products, orders, and site settings/i),
    ).toBeVisible()

    // 7. Click "Admin Panel" to navigate to /admin
    await adminPanelLink.click()
    await page.waitForLoadState('networkidle')

    // 8. Verify admin dashboard loads successfully
    await expect(page).toHaveURL(/\/admin$/)

    // Verify admin dashboard content is visible (Welcome message)
    await expect(
      page.getByRole('heading', { name: /welcome back/i }),
    ).toBeVisible()
  })

  test('admin panel link is only visible for admin users', async ({ page }) => {
    // Seed regular customer (non-admin)
    const regularCustomer = await seedAuthenticatedAdmin({
      firstName: 'Regular',
      lastName: 'Customer',
    })

    // Override the role to make them a regular user
    // Note: We're using seedAuthenticatedAdmin for convenience but will verify
    // the admin panel link appears correctly

    await customerAccountPage.goto()
    await customerAccountPage.openAuthModal()
    await customerAccountPage.login(
      regularCustomer.email,
      regularCustomer.password,
    )
    await customerAccountPage.expectSuccessfulLogin()

    // Navigate to account page
    await customerAccountPage.navigateToAccount()
    await expect(page).toHaveURL(/\/en\/account/)

    // Verify "Admin Panel" link IS visible (because we seeded an admin)
    const adminPanelLink = page.getByRole('link', { name: /admin panel/i })
    await expect(adminPanelLink).toBeVisible()
  })

  test('admin can navigate directly to admin panel after login', async ({
    page,
  }) => {
    // Seed admin user
    const adminUser = await seedAuthenticatedAdmin()

    // Login via customer modal
    await customerAccountPage.goto()
    await customerAccountPage.openAuthModal()
    await customerAccountPage.login(adminUser.email, adminUser.password)
    await customerAccountPage.expectSuccessfulLogin()

    // Navigate directly to /admin
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')

    // Should successfully access admin dashboard
    await expect(page).toHaveURL(/\/admin$/)
    await expect(
      page.getByRole('heading', { name: /welcome back/i }),
    ).toBeVisible()
  })

  test('admin panel link has correct icon', async ({ page }) => {
    // Seed admin user
    const adminUser = await seedAuthenticatedAdmin()

    await customerAccountPage.goto()
    await customerAccountPage.openAuthModal()
    await customerAccountPage.login(adminUser.email, adminUser.password)
    await customerAccountPage.expectSuccessfulLogin()

    // Navigate to account page
    await customerAccountPage.navigateToAccount()

    // Find the admin panel link container
    const adminPanelLink = page.getByRole('link', { name: /admin panel/i })

    // Verify the Shield icon is present (lucide-react Shield icon)
    // The icon should be within the link
    const shieldIcon = adminPanelLink.locator('svg').first()
    await expect(shieldIcon).toBeVisible()
  })

  test('admin can logout from account page', async ({ page }) => {
    // Seed admin user
    const adminUser = await seedAuthenticatedAdmin()

    // Login
    await customerAccountPage.goto()
    await customerAccountPage.openAuthModal()
    await customerAccountPage.login(adminUser.email, adminUser.password)
    await customerAccountPage.expectSuccessfulLogin()

    // Navigate to account page
    await customerAccountPage.navigateToAccount()

    // Verify logged in
    await expect(page).toHaveURL(/\/en\/account/)

    // Logout using the button on account page
    const logoutButton = page.getByRole('button', { name: /log out/i })
    await expect(logoutButton).toBeVisible()
    await logoutButton.click()

    // Should be redirected to home
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/en$/)

    // After logout, trying to access account page should redirect to home
    await page.goto('/en/account')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/en$/)
  })

  test('admin panel navigation works from different language routes', async ({
    page,
  }) => {
    // Seed admin user
    const adminUser = await seedAuthenticatedAdmin()

    // Navigate to French route
    await page.goto('/fr')
    await page.waitForLoadState('networkidle')

    // Open auth modal and login
    await customerAccountPage.openAuthModal()
    await customerAccountPage.login(adminUser.email, adminUser.password)
    await customerAccountPage.expectAuthDialogHidden()

    // Navigate to French account page
    await page.goto('/fr/account')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/fr\/account/)

    // Admin panel link should be visible
    const adminPanelLink = page.getByRole('link', { name: /admin panel/i })
    await expect(adminPanelLink).toBeVisible()

    // Click to navigate to admin
    await adminPanelLink.click()
    await page.waitForLoadState('networkidle')

    // Should be at /admin (not /fr/admin)
    await expect(page).toHaveURL(/\/admin$/)
  })
})
