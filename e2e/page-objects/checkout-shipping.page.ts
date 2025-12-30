import { type Page, type Locator, expect } from '@playwright/test'

export class CheckoutShippingPage {
  readonly page: Page
  readonly shippingOptions: Locator
  readonly continueButton: Locator

  constructor(page: Page) {
    this.page = page
    this.shippingOptions = page.locator('input[type="radio"][name="shipping"]')
    this.continueButton = page.locator('button:has-text("Continue to payment")')
  }

  async waitForPage() {
    await this.page.waitForURL('**/checkout/shipping')
    await expect(this.continueButton).toBeVisible({ timeout: 10000 })
  }

  async selectFirstShippingOption() {
    const firstOption = this.shippingOptions.first()
    if (await firstOption.isVisible()) {
      await firstOption.click()
    }
  }

  async selectShippingByLabel(label: string) {
    await this.page.locator(`label:has-text("${label}")`).click()
  }

  async continueToPayment() {
    await this.continueButton.click()
    await this.page.waitForURL('**/checkout/payment')
  }
}
