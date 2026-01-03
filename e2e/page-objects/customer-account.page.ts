import { type Page, type Locator, expect } from '@playwright/test'

export class CustomerAccountPage {
  readonly page: Page
  readonly authDialog: Locator
  readonly userIconButton: Locator

  constructor(page: Page) {
    this.page = page
    this.authDialog = page.getByRole('dialog')
    // User icon button in navbar (when not authenticated)
    this.userIconButton = page
      .getByRole('button')
      .filter({ has: page.locator('svg') })
      .nth(1)
  }

  // Dynamic getters for form fields - scoped to dialog for better isolation
  // Using positional selectors for reliability with multiple password fields
  get emailInput() {
    return this.authDialog.locator('input[type="email"]')
  }

  get passwordInput() {
    return this.authDialog.locator('input[type="password"]').first()
  }

  get confirmPasswordInput() {
    return this.authDialog.locator('input[type="password"]').nth(1)
  }

  get signInButton() {
    return this.authDialog.getByRole('button', { name: /sign in/i })
  }

  get createAccountButton() {
    return this.authDialog.getByRole('button', { name: /create account/i })
  }

  get registerTab() {
    return this.authDialog.getByRole('tab', { name: /register/i })
  }

  get loginTab() {
    return this.authDialog.getByRole('tab', { name: /login/i })
  }

  get googleButton() {
    return this.authDialog.getByRole('button', { name: /google/i })
  }

  get errorMessage() {
    return this.page.getByText(
      /invalid email or password|login failed|an account with this email already exists/i,
    )
  }

  async goto(lang = 'en') {
    await this.page.goto(`/${lang}`)
    await this.page.waitForLoadState('networkidle')
  }

  async openAuthModal() {
    // Click the user icon to open the auth modal
    await this.userIconButton.click()
    await this.expectAuthDialogVisible()
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.signInButton.click()
  }

  async expectAuthDialogVisible() {
    await expect(this.authDialog).toBeVisible()
  }

  async expectAuthDialogHidden() {
    await expect(this.authDialog).not.toBeVisible()
  }

  async expectSuccessfulLogin() {
    // After successful login, auth dialog should be hidden
    await expect(this.authDialog).not.toBeVisible({ timeout: 10000 })
  }

  async expectLoginError() {
    // Wait for error message to appear (may take time for auth request to complete)
    await expect(this.errorMessage).toBeVisible({ timeout: 10000 })
  }

  async switchToRegister() {
    await this.registerTab.click()
    // Wait for register form to be ready (animations complete)
    await this.confirmPasswordInput.waitFor({ state: 'visible' })
  }

  async switchToLogin() {
    await this.loginTab.click()
    // Wait for login form to be ready
    await this.signInButton.waitFor({ state: 'visible' })
  }

  async navigateToAccount(lang = 'en') {
    await this.page.goto(`/${lang}/account`)
    await this.page.waitForLoadState('networkidle')
  }

  async fillRegistrationForm(
    email: string,
    password: string,
    confirmPassword: string,
  ) {
    // Fill each field and wait for it to be ready
    await this.emailInput.waitFor({ state: 'visible' })
    await this.emailInput.fill(email)

    await this.passwordInput.waitFor({ state: 'visible' })
    await this.passwordInput.fill(password)

    await this.confirmPasswordInput.waitFor({ state: 'visible' })
    await this.confirmPasswordInput.fill(confirmPassword)
  }

  async submitRegistration() {
    await this.createAccountButton.click()
  }

  async register(email: string, password: string, confirmPassword: string) {
    await this.fillRegistrationForm(email, password, confirmPassword)
    await this.submitRegistration()

    // Wait for the success view to render (form gets replaced by success message)
    // This indicates the registration API call completed successfully
    await this.authDialog
      .getByRole('heading', { name: /check your email/i })
      .waitFor({ state: 'visible', timeout: 15000 })
  }
}
