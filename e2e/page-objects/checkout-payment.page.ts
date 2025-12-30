import { type Page, type Locator, expect } from '@playwright/test'
import { TEST_DATA } from '../fixtures/test-data'

export class CheckoutPaymentPage {
  readonly page: Page
  readonly cardTab: Locator
  readonly paypalTab: Locator
  readonly payNowButton: Locator

  constructor(page: Page) {
    this.page = page
    this.cardTab = page.locator('[role="tab"]:has-text("Credit Card")')
    this.paypalTab = page.locator('[role="tab"]:has-text("PayPal")')
    this.payNowButton = page.locator('button:has-text("Pay")')
  }

  async waitForPage() {
    await this.page.waitForURL('**/checkout/payment')
    await expect(this.cardTab).toBeVisible({ timeout: 15000 })
  }

  async selectCardPayment() {
    await this.cardTab.click()
  }

  async selectPayPalPayment() {
    await this.paypalTab.click()
  }

  async fillStripeCard(card: typeof TEST_DATA.stripe) {
    // Wait for Stripe to initialize
    await this.page.waitForTimeout(2000)

    // Stripe PaymentElement uses a single iframe
    const stripeFrame = this.page
      .frameLocator('iframe[title*="Secure payment"]')
      .first()

    // Fill card number
    const cardNumberInput = stripeFrame.locator('[name="number"]')
    if (await cardNumberInput.isVisible({ timeout: 5000 })) {
      await cardNumberInput.fill(card.successCard)
    }

    // Fill expiry
    const expiryInput = stripeFrame.locator('[name="expiry"]')
    if (await expiryInput.isVisible()) {
      await expiryInput.fill(card.expiryDate)
    }

    // Fill CVC
    const cvcInput = stripeFrame.locator('[name="cvc"]')
    if (await cvcInput.isVisible()) {
      await cvcInput.fill(card.cvc)
    }
  }

  async submitPayment() {
    await this.payNowButton.click()
  }

  async expectConfirmationPage() {
    await this.page.waitForURL('**/checkout/confirmation**', { timeout: 30000 })
    await expect(
      this.page.locator('text=Thank you').or(this.page.locator('text=Order')),
    ).toBeVisible()
  }

  async expectPaymentError() {
    await expect(
      this.page.locator('text=declined').or(this.page.locator('.text-red')),
    ).toBeVisible({ timeout: 10000 })
  }
}
