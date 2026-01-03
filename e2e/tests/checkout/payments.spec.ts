import { test, expect } from '../../fixtures/cleanup-fixture'
import { type Page } from '@playwright/test'

import { TEST_DATA } from '../../fixtures/test-data'
import { CartHelper } from '../../helpers/cart.helper'
import { seedProduct, cleanupTestData } from '../../helpers/db.helper'
import {
  fillStripeCard,
  STRIPE_TEST_CARDS,
  handle3DSecure,
} from '../../helpers/stripe.helper'
import { CheckoutConfirmationPage } from '../../page-objects/checkout-confirmation.page'
import { CheckoutInfoPage } from '../../page-objects/checkout-info.page'
import { CheckoutPaymentPage } from '../../page-objects/checkout-payment.page'
import { CheckoutShippingPage } from '../../page-objects/checkout-shipping.page'
import { ProductPage } from '../../page-objects/product.page'

test.describe('Payment-Specific Scenarios', () => {
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

  async function navigateToPayment(page: Page): Promise<{ email: string }> {
    const product = await seedProduct()
    const testEmail = 'mavrick@realadvisor.com'

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

    return { email: testEmail }
  }

  test.describe('Stripe Card Brands', () => {
    test('accepts Visa card', async ({ page }) => {
      await navigateToPayment(page)

      await fillStripeCard(page, { cardNumber: STRIPE_TEST_CARDS.valid })
      await checkoutPaymentPage.submitPayment()

      await checkoutConfirmationPage.waitForPage()
    })

    test('accepts Mastercard', async ({ page }) => {
      await navigateToPayment(page)

      await fillStripeCard(page, { cardNumber: STRIPE_TEST_CARDS.mastercard })
      await checkoutPaymentPage.submitPayment()

      await checkoutConfirmationPage.waitForPage()
    })

    test('accepts American Express', async ({ page }) => {
      await navigateToPayment(page)

      await fillStripeCard(page, {
        cardNumber: STRIPE_TEST_CARDS.amex,
        cvc: '1234',
      })
      await checkoutPaymentPage.submitPayment()

      await checkoutConfirmationPage.waitForPage()
    })
  })

  test.describe('3D Secure', () => {
    test('completes 3DS authentication successfully', async ({ page }) => {
      await navigateToPayment(page)

      await fillStripeCard(page, { cardNumber: STRIPE_TEST_CARDS.requires3ds })
      await checkoutPaymentPage.submitPayment()

      await handle3DSecure(page, 'complete')

      await checkoutConfirmationPage.waitForPage()
    })

    test('handles 3DS authentication failure', async ({ page }) => {
      await navigateToPayment(page)

      await fillStripeCard(page, { cardNumber: STRIPE_TEST_CARDS.requires3ds })
      await checkoutPaymentPage.submitPayment()

      await handle3DSecure(page, 'fail')

      await expect(
        page.locator('text=/authentication.*failed|3d.*failed|declined/i'),
      ).toBeVisible({ timeout: 15000 })
    })
  })

  test.describe('Payment Provider Switching', () => {
    test('can switch from Stripe to PayPal tab', async ({ page }) => {
      await navigateToPayment(page)

      await expect(checkoutPaymentPage.cardTab).toBeVisible()

      await checkoutPaymentPage.selectPayPalPayment()

      const paypalFrame = page.frameLocator('iframe[title*="PayPal"]').first()
      await expect(paypalFrame.getByRole('link', { name: 'PayPal' })).toBeVisible({
        timeout: 15000,
      })

      await checkoutPaymentPage.selectCardPayment()

      const stripeFrame = page
        .frameLocator('iframe[title*="Secure payment"]')
        .first()
      await expect(stripeFrame.locator('[name="number"]')).toBeVisible({
        timeout: 10000,
      })
    })

    test('can complete Stripe payment after switching from PayPal', async ({
      page,
    }) => {
      await navigateToPayment(page)

      await checkoutPaymentPage.selectPayPalPayment()
      await page.waitForTimeout(2000)

      await checkoutPaymentPage.selectCardPayment()
      await fillStripeCard(page, { cardNumber: STRIPE_TEST_CARDS.valid })
      await checkoutPaymentPage.submitPayment()

      await checkoutConfirmationPage.waitForPage()
    })
  })

  test.describe('PayPal Cancellation', () => {
    test('can retry after canceling PayPal', async ({ page }) => {
      test.skip(
        !process.env.PAYPAL_SANDBOX_BUYER_EMAIL,
        'PayPal sandbox credentials not configured',
      )

      const { clickPayPalButton, cancelPayPalPayment } =
        await import('../../helpers/paypal.helper')

      await navigateToPayment(page)

      await checkoutPaymentPage.selectPayPalPayment()

      const popup = await clickPayPalButton(page)
      await cancelPayPalPayment(popup)

      await expect(page).toHaveURL('**/checkout/payment')

      await checkoutPaymentPage.selectCardPayment()
      await fillStripeCard(page, { cardNumber: STRIPE_TEST_CARDS.valid })
      await checkoutPaymentPage.submitPayment()

      await checkoutConfirmationPage.waitForPage()
    })
  })

  test.describe('Amount Verification', () => {
    test('checkout total includes shipping and tax', async ({ page }) => {
      const product = await seedProduct({ price: 50.0 })
      const testEmail = 'mavrick@realadvisor.com'

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

      await checkoutShippingPage.selectShippingByLabel('Standard')
      await checkoutShippingPage.continueToPayment()
      await checkoutPaymentPage.waitForPage()

      // Total is uniquely displayed as "USD$XX.XX"
      const totalText = await page.getByText(/USD\$[\d.]+/).textContent()
      const total = parseFloat(totalText?.replace(/[^\d.]/g, '') || '0')
      expect(total).toBeGreaterThan(50)
    })
  })
})
