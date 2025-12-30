import { type Page, type Locator, expect } from '@playwright/test'

export class AdminLoginPage {
  readonly page: Page
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly submitButton: Locator
  readonly errorMessage: Locator

  constructor(page: Page) {
    this.page = page
    this.emailInput = page.getByRole('textbox', { name: /email/i })
    this.passwordInput = page.getByRole('textbox', { name: /password/i })
    this.submitButton = page.getByRole('button', { name: /sign in/i })
    this.errorMessage = page.getByText(/invalid email or password/i)
  }

  async goto() {
    await this.page.goto('/admin/login')
    await this.page.waitForLoadState('networkidle')
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.submitButton.click()
  }

  async expectSuccessfulLogin() {
    await expect(this.page).toHaveURL('/admin')
  }

  async expectLoginError() {
    await expect(this.errorMessage).toBeVisible()
  }
}
