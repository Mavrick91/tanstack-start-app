import { test, expect } from '../../fixtures/cleanup-fixture'

import { CartHelper } from '../../helpers/cart.helper'
import { seedProduct, cleanupTestData } from '../../helpers/db.helper'
import { CheckoutInfoPage } from '../../page-objects/checkout-info.page'
import { ProductPage } from '../../page-objects/product.page'

test.describe('Checkout Validation Errors', () => {
  let productPage: ProductPage
  let checkoutInfoPage: CheckoutInfoPage
  let cartHelper: CartHelper

  test.beforeEach(async ({ page }) => {
    productPage = new ProductPage(page)
    checkoutInfoPage = new CheckoutInfoPage(page)
    cartHelper = new CartHelper(page)

    await page.goto('/en')
    await page.waitForLoadState('networkidle')
    await cartHelper.clearCart()
  })

  test.afterAll(async () => {
    await cleanupTestData()
  })

  test.describe('Information Step', () => {
    test('shows validation error for empty email', async ({ page }) => {
      const product = await seedProduct()

      await productPage.goto(product.handle)
      await productPage.addToCart()
      await page.getByRole('button', { name: /cart/i }).click()
      await page.getByRole('button', { name: /^checkout$/i }).click()
      await checkoutInfoPage.waitForCheckoutReady()

      await checkoutInfoPage.countrySelect.click()
      await page.getByRole('option', { name: /united states/i }).click()
      await checkoutInfoPage.firstNameInput.fill('Test')
      await checkoutInfoPage.lastNameInput.fill('User')
      await checkoutInfoPage.address1Input.fill('123 Test St')
      await checkoutInfoPage.cityInput.fill('New York')
      await checkoutInfoPage.provinceInput.fill('NY')
      await checkoutInfoPage.zipInput.fill('10001')

      await checkoutInfoPage.continueButton.click()

      // Form should not submit - still on information page
      await expect(page).toHaveURL('**/checkout/information', {
        timeout: 5000,
      })
    })

    test('shows validation error for invalid email format', async ({
      page,
    }) => {
      const product = await seedProduct()

      await productPage.goto(product.handle)
      await productPage.addToCart()
      await page.getByRole('button', { name: /cart/i }).click()
      await page.getByRole('button', { name: /^checkout$/i }).click()
      await checkoutInfoPage.waitForCheckoutReady()

      await checkoutInfoPage.fillContactInfo('not-an-email')

      await checkoutInfoPage.countrySelect.click()
      await page.getByRole('option', { name: /united states/i }).click()
      await checkoutInfoPage.firstNameInput.fill('Test')
      await checkoutInfoPage.lastNameInput.fill('User')
      await checkoutInfoPage.address1Input.fill('123 Test St')
      await checkoutInfoPage.cityInput.fill('New York')
      await checkoutInfoPage.provinceInput.fill('NY')
      await checkoutInfoPage.zipInput.fill('10001')

      await checkoutInfoPage.continueButton.click()

      // Form should not submit - still on information page
      await expect(page).toHaveURL('**/checkout/information', {
        timeout: 5000,
      })
    })

    test('shows validation error for empty required address fields', async ({
      page,
    }) => {
      const product = await seedProduct()
      const testEmail = 'mavrick@realadvisor.com'

      await productPage.goto(product.handle)
      await productPage.addToCart()
      await page.getByRole('button', { name: /cart/i }).click()
      await page.getByRole('button', { name: /^checkout$/i }).click()
      await checkoutInfoPage.waitForCheckoutReady()

      await checkoutInfoPage.fillContactInfo(testEmail)

      await checkoutInfoPage.continueButton.click()

      // Form should not submit - still on information page
      await expect(page).toHaveURL('**/checkout/information', {
        timeout: 5000,
      })
    })
  })

  test.describe('Empty Cart', () => {
    test('redirects when navigating to checkout with empty cart', async ({
      page,
    }) => {
      await page.goto('/en')
      await page.evaluate(() => localStorage.removeItem('cart-storage'))

      await page.goto('/en/checkout/information')

      await expect(page).not.toHaveURL('**/checkout/information', {
        timeout: 5000,
      })
    })
  })
})
