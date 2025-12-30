import { test, expect } from '@playwright/test'
import { ProductPage } from '../../page-objects/product.page'
import { CheckoutInfoPage } from '../../page-objects/checkout-info.page'
import { CheckoutShippingPage } from '../../page-objects/checkout-shipping.page'
import { CheckoutPaymentPage } from '../../page-objects/checkout-payment.page'
import { CheckoutConfirmationPage } from '../../page-objects/checkout-confirmation.page'
import { CartHelper } from '../../helpers/cart.helper'
import {
  seedProduct,
  cleanupTestData,
  TEST_PREFIX,
} from '../../helpers/db.helper'
import { fillStripeCard, STRIPE_TEST_CARDS } from '../../helpers/stripe.helper'
import { TEST_DATA } from '../../fixtures/test-data'

test.describe('Checkout Edge Cases', () => {
  let productPage: ProductPage
  let checkoutInfoPage: CheckoutInfoPage
  let checkoutShippingPage: CheckoutShippingPage
  let checkoutPaymentPage: CheckoutPaymentPage
  let checkoutConfirmationPage: CheckoutConfirmationPage
  let cartHelper: CartHelper

  test.beforeEach(async ({ page }) => {
    productPage = new ProductPage(page)
    checkoutInfoPage = new CheckoutInfoPage(page)
    checkoutShippingPage = new CheckoutShippingPage(page)
    checkoutPaymentPage = new CheckoutPaymentPage(page)
    checkoutConfirmationPage = new CheckoutConfirmationPage(page)
    cartHelper = new CartHelper(page)

    await page.goto('/en')
    await page.waitForLoadState('networkidle')
    await cartHelper.clearCart()
  })

  test.afterAll(async () => {
    await cleanupTestData()
  })

  test.describe('Browser Navigation', () => {
    test('preserves data when pressing back from shipping to info', async ({
      page,
    }) => {
      const product = await seedProduct()
      const testEmail = `${TEST_PREFIX}${Date.now()}@playwright.dev`

      await productPage.goto(product.handle)
      await productPage.addToCart()
      await page.getByRole('button', { name: /cart/i }).click()
      await page.getByRole('button', { name: /^checkout$/i }).click()
      await checkoutInfoPage.waitForCheckoutReady()

      await checkoutInfoPage.fillContactInfo(testEmail)
      await checkoutInfoPage.countrySelect.click()
      await page.getByRole('option', { name: /united states/i }).click()
      await checkoutInfoPage.firstNameInput.fill(
        TEST_DATA.shippingAddress.firstName,
      )
      await checkoutInfoPage.lastNameInput.fill(
        TEST_DATA.shippingAddress.lastName,
      )
      await checkoutInfoPage.address1Input.fill(
        TEST_DATA.shippingAddress.address1,
      )
      await checkoutInfoPage.cityInput.fill(TEST_DATA.shippingAddress.city)
      await checkoutInfoPage.provinceInput.fill(
        TEST_DATA.shippingAddress.province,
      )
      await checkoutInfoPage.zipInput.fill(TEST_DATA.shippingAddress.zip)

      await checkoutInfoPage.continueToShipping()
      await checkoutShippingPage.waitForPage()

      await page.goBack()
      await checkoutInfoPage.waitForCheckoutReady()

      await expect(checkoutInfoPage.emailInput).toHaveValue(testEmail)
      await expect(checkoutInfoPage.firstNameInput).toHaveValue(
        TEST_DATA.shippingAddress.firstName,
      )
    })

    test('page refresh preserves checkout session', async ({ page }) => {
      const product = await seedProduct()
      const testEmail = `${TEST_PREFIX}${Date.now()}@playwright.dev`

      await productPage.goto(product.handle)
      await productPage.addToCart()
      await page.getByRole('button', { name: /cart/i }).click()
      await page.getByRole('button', { name: /^checkout$/i }).click()
      await checkoutInfoPage.waitForCheckoutReady()

      await checkoutInfoPage.fillContactInfo(testEmail)

      await page.reload()
      await checkoutInfoPage.waitForCheckoutReady()

      expect(page.url()).toContain('/checkout')
    })
  })

  test.describe('Cart Persistence', () => {
    test('cart persists across page navigation', async ({ page }) => {
      const product = await seedProduct()

      await productPage.goto(product.handle)
      await productPage.addToCart()

      await page.goto('/en')
      await page.waitForLoadState('networkidle')

      const itemCount = await cartHelper.getCartItemCount()
      expect(itemCount).toBeGreaterThan(0)
    })
  })

  test.describe('International Addresses', () => {
    test('handles international address with special characters', async ({
      page,
    }) => {
      const product = await seedProduct()
      const testEmail = `${TEST_PREFIX}${Date.now()}@playwright.dev`

      await productPage.goto(product.handle)
      await productPage.addToCart()
      await page.getByRole('button', { name: /cart/i }).click()
      await page.getByRole('button', { name: /^checkout$/i }).click()
      await checkoutInfoPage.waitForCheckoutReady()

      await checkoutInfoPage.fillContactInfo(testEmail)

      await checkoutInfoPage.countrySelect.click()
      await page.getByRole('option', { name: /france/i }).click()
      await checkoutInfoPage.firstNameInput.fill(
        TEST_DATA.internationalAddress.firstName,
      )
      await checkoutInfoPage.lastNameInput.fill(
        TEST_DATA.internationalAddress.lastName,
      )
      await checkoutInfoPage.address1Input.fill(
        TEST_DATA.internationalAddress.address1,
      )
      await checkoutInfoPage.cityInput.fill(TEST_DATA.internationalAddress.city)
      await checkoutInfoPage.zipInput.fill(TEST_DATA.internationalAddress.zip)

      await checkoutInfoPage.continueToShipping()
      await checkoutShippingPage.waitForPage()
    })
  })

  test.describe('Payment Recovery', () => {
    test('can retry after payment failure without re-entering info', async ({
      page,
    }) => {
      const product = await seedProduct()
      const testEmail = `${TEST_PREFIX}${Date.now()}@playwright.dev`

      await productPage.goto(product.handle)
      await productPage.addToCart()
      await page.getByRole('button', { name: /cart/i }).click()
      await page.getByRole('button', { name: /^checkout$/i }).click()
      await checkoutInfoPage.waitForCheckoutReady()

      await checkoutInfoPage.fillContactInfo(testEmail)
      await checkoutInfoPage.countrySelect.click()
      await page.getByRole('option', { name: /united states/i }).click()
      await checkoutInfoPage.firstNameInput.fill(
        TEST_DATA.shippingAddress.firstName,
      )
      await checkoutInfoPage.lastNameInput.fill(
        TEST_DATA.shippingAddress.lastName,
      )
      await checkoutInfoPage.address1Input.fill(
        TEST_DATA.shippingAddress.address1,
      )
      await checkoutInfoPage.cityInput.fill(TEST_DATA.shippingAddress.city)
      await checkoutInfoPage.provinceInput.fill(
        TEST_DATA.shippingAddress.province,
      )
      await checkoutInfoPage.zipInput.fill(TEST_DATA.shippingAddress.zip)

      await checkoutInfoPage.continueToShipping()
      await checkoutShippingPage.waitForPage()
      await checkoutShippingPage.selectFirstShippingOption()
      await checkoutShippingPage.continueToPayment()
      await checkoutPaymentPage.waitForPage()

      await fillStripeCard(page, { cardNumber: STRIPE_TEST_CARDS.declined })
      await checkoutPaymentPage.submitPayment()
      await expect(page.locator('text=/declined|error/i')).toBeVisible({
        timeout: 15000,
      })

      await fillStripeCard(page, { cardNumber: STRIPE_TEST_CARDS.valid })
      await checkoutPaymentPage.submitPayment()

      await checkoutConfirmationPage.waitForPage()
    })
  })
})
