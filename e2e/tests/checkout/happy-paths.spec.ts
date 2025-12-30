import { test, expect } from '@playwright/test'

import { TEST_DATA } from '../../fixtures/test-data'
import { CartHelper } from '../../helpers/cart.helper'
import {
  seedProduct,
  cleanupTestData,
  TEST_PREFIX,
} from '../../helpers/db.helper'
import { fillStripeCard, STRIPE_TEST_CARDS } from '../../helpers/stripe.helper'
import { CheckoutConfirmationPage } from '../../page-objects/checkout-confirmation.page'
import { CheckoutInfoPage } from '../../page-objects/checkout-info.page'
import { CheckoutPaymentPage } from '../../page-objects/checkout-payment.page'
import { CheckoutShippingPage } from '../../page-objects/checkout-shipping.page'
import { ProductPage } from '../../page-objects/product.page'

test.describe('Checkout Happy Paths', () => {
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

  test('guest checkout with Stripe - complete flow', async ({ page }) => {
    const product = await seedProduct({ price: 29.99 })
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

    await fillStripeCard(page, { cardNumber: STRIPE_TEST_CARDS.valid })

    await checkoutPaymentPage.submitPayment()

    await checkoutConfirmationPage.waitForPage()
    const orderNumber = await checkoutConfirmationPage.getOrderNumber()
    expect(orderNumber).toBeTruthy()
  })

  test('guest checkout with free shipping (order >= $75)', async ({ page }) => {
    const product = await seedProduct({ price: 80.0 })
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

    await expect(page.locator('text=/free|\\$0\\.00/i')).toBeVisible()

    await checkoutShippingPage.selectFirstShippingOption()
    await checkoutShippingPage.continueToPayment()

    await checkoutPaymentPage.waitForPage()
    await fillStripeCard(page)
    await checkoutPaymentPage.submitPayment()

    await checkoutConfirmationPage.waitForPage()
  })

  test('guest checkout with PayPal - complete flow', async ({ page }) => {
    test.skip(
      !process.env.PAYPAL_SANDBOX_BUYER_EMAIL,
      'PayPal sandbox credentials not configured',
    )

    const { clickPayPalButton, completePayPalSandboxFlow } =
      await import('../../helpers/paypal.helper')

    const product = await seedProduct({ price: 29.99 })
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

    await checkoutPaymentPage.selectPayPalPayment()

    const popup = await clickPayPalButton(page)
    await completePayPalSandboxFlow(popup)

    await page.waitForTimeout(3000)

    await checkoutConfirmationPage.waitForPage()
  })
})
