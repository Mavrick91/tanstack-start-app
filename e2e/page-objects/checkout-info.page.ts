import { type Page, type Locator, expect } from '@playwright/test'
import { TEST_DATA } from '../fixtures/test-data'

export class CheckoutInfoPage {
  readonly page: Page
  readonly emailInput: Locator
  readonly countrySelect: Locator
  readonly firstNameInput: Locator
  readonly lastNameInput: Locator
  readonly address1Input: Locator
  readonly cityInput: Locator
  readonly provinceInput: Locator
  readonly zipInput: Locator
  readonly phoneInput: Locator
  readonly continueButton: Locator

  constructor(page: Page) {
    this.page = page
    this.emailInput = page.getByRole('textbox', { name: /email/i })
    this.countrySelect = page.getByRole('combobox').first()
    this.firstNameInput = page.getByRole('textbox', { name: /first name/i })
    this.lastNameInput = page.getByRole('textbox', { name: /last name/i })
    this.address1Input = page.getByRole('textbox', { name: /address/i }).first()
    this.cityInput = page.getByRole('textbox', { name: /city/i })
    this.provinceInput = page.getByRole('textbox', { name: /state|province/i })
    this.zipInput = page.getByRole('textbox', { name: /zip|postal/i })
    this.phoneInput = page.getByRole('textbox', { name: /phone/i })
    this.continueButton = page.getByRole('button', { name: /continue to shipping/i })
  }

  async waitForCheckoutReady() {
    // Wait for checkout page to load - may redirect if cart empty
    await this.page.waitForURL('**/checkout/information', { timeout: 15000 })
    // Wait for the email input to appear (means checkout was created)
    await expect(this.emailInput).toBeVisible({ timeout: 15000 })
  }

  async fillContactInfo(email: string) {
    await this.emailInput.fill(email)
  }

  async selectCountry(countryCode: string) {
    await this.countrySelect.click()
    await this.page.getByRole('option', { name: new RegExp(countryCode, 'i') }).click()
  }

  async fillShippingAddress(address: typeof TEST_DATA.shippingAddress) {
    // Select country first
    await this.selectCountry(address.countryCode)
    await this.firstNameInput.fill(address.firstName)
    await this.lastNameInput.fill(address.lastName)
    await this.address1Input.fill(address.address1)
    await this.cityInput.fill(address.city)
    await this.provinceInput.fill(address.province)
    await this.zipInput.fill(address.zip)

    if (address.phone) {
      await this.phoneInput.fill(address.phone)
    }
  }

  async continueToShipping() {
    await this.continueButton.click()
    await this.page.waitForURL('**/checkout/shipping', { timeout: 15000 })
  }
}
