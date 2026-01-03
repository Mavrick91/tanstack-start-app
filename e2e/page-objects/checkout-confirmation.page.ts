import { type Page, type Locator, expect } from '@playwright/test'

export class CheckoutConfirmationPage {
  readonly page: Page
  readonly orderNumber: Locator
  readonly thankYouMessage: Locator
  readonly emailConfirmation: Locator
  readonly orderSummary: Locator
  readonly shippingAddress: Locator
  readonly continueShoppingButton: Locator

  constructor(page: Page) {
    this.page = page
    // Use getByText with regex for semantic selection (Playwright best practice)
    this.orderNumber = page
      .getByText(/Order #\d+/)
      .or(page.locator('[data-testid="order-number"], .order-number'))
    this.thankYouMessage = page.locator(
      'h1:has-text("Thank you"), h1:has-text("Order confirmed")',
    )
    this.emailConfirmation = page.locator(
      'text=/confirmation.*email|email.*sent/i',
    )
    this.orderSummary = page.locator(
      '[data-testid="order-summary"], .order-summary',
    )
    this.shippingAddress = page.locator(
      '[data-testid="shipping-address"], .shipping-address',
    )
    this.continueShoppingButton = page.locator(
      'a:has-text("Continue shopping"), button:has-text("Continue shopping")',
    )
  }

  async waitForPage(): Promise<void> {
    await this.page.waitForURL('**/checkout/confirmation**', { timeout: 30000 })
    // Use specific h1 locator - no overly broad fallback needed
    await expect(this.thankYouMessage).toBeVisible({ timeout: 10000 })
  }

  async getOrderNumber(): Promise<string | null> {
    const text = await this.orderNumber.textContent()
    const match = text?.match(/\d+/)
    return match ? match[0] : null
  }

  async expectOrderDetails(options: {
    email?: string
    items?: number
  }): Promise<void> {
    if (options.email) {
      await expect(this.page.locator(`text=${options.email}`)).toBeVisible()
    }
    if (options.items) {
      const itemCount = await this.orderSummary
        .locator('.item, [data-testid="order-item"]')
        .count()
      expect(itemCount).toBe(options.items)
    }
  }

  async continueShopping(): Promise<void> {
    await this.continueShoppingButton.click()
    await this.page.waitForURL('**/en**')
  }
}
