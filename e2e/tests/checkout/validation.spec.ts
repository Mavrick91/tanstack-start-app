import { test, expect, type Page } from '@playwright/test'
import { ProductPage } from '../../page-objects/product.page'
import { CheckoutInfoPage } from '../../page-objects/checkout-info.page'
import { CheckoutShippingPage } from '../../page-objects/checkout-shipping.page'
import { CheckoutPaymentPage } from '../../page-objects/checkout-payment.page'
import { CartHelper } from '../../helpers/cart.helper'
import {
  seedProduct,
  cleanupTestData,
  TEST_PREFIX,
} from '../../helpers/db.helper'
import { fillStripeCard, STRIPE_TEST_CARDS } from '../../helpers/stripe.helper'
import { TEST_DATA } from '../../fixtures/test-data'

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
    test('shows error for empty email', async ({ page }) => {
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

      await expect(
        page.locator('text=/email.*required|please.*email/i'),
      ).toBeVisible({ timeout: 5000 })
    })

    test('shows error for invalid email format', async ({ page }) => {
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

      await expect(
        page.locator('text=/invalid.*email|valid.*email/i'),
      ).toBeVisible({ timeout: 5000 })
    })

    test('shows error for empty required address fields', async ({ page }) => {
      const product = await seedProduct()
      const testEmail = `${TEST_PREFIX}${Date.now()}@playwright.dev`

      await productPage.goto(product.handle)
      await productPage.addToCart()
      await page.getByRole('button', { name: /cart/i }).click()
      await page.getByRole('button', { name: /^checkout$/i }).click()
      await checkoutInfoPage.waitForCheckoutReady()

      await checkoutInfoPage.fillContactInfo(testEmail)

      await checkoutInfoPage.continueButton.click()

      await expect(page.locator('text=/required/i').first()).toBeVisible({
        timeout: 5000,
      })
    })
  })

  test.describe('Payment Step - Stripe Errors', () => {
    async function navigateToPayment(page: Page) {
      const product = await seedProduct()
      const testEmail = `${TEST_PREFIX}${Date.now()}@playwright.dev`
      const productPageLocal = new ProductPage(page)
      const checkoutInfoPageLocal = new CheckoutInfoPage(page)
      const checkoutShippingPageLocal = new CheckoutShippingPage(page)
      const checkoutPaymentPageLocal = new CheckoutPaymentPage(page)

      await productPageLocal.goto(product.handle)
      await productPageLocal.addToCart()
      await page.getByRole('button', { name: /cart/i }).click()
      await page.getByRole('button', { name: /^checkout$/i }).click()
      await checkoutInfoPageLocal.waitForCheckoutReady()

      await checkoutInfoPageLocal.fillContactInfo(testEmail)
      await checkoutInfoPageLocal.countrySelect.click()
      await page.getByRole('option', { name: /united states/i }).click()
      await checkoutInfoPageLocal.firstNameInput.fill(
        TEST_DATA.shippingAddress.firstName,
      )
      await checkoutInfoPageLocal.lastNameInput.fill(
        TEST_DATA.shippingAddress.lastName,
      )
      await checkoutInfoPageLocal.address1Input.fill(
        TEST_DATA.shippingAddress.address1,
      )
      await checkoutInfoPageLocal.cityInput.fill(TEST_DATA.shippingAddress.city)
      await checkoutInfoPageLocal.provinceInput.fill(
        TEST_DATA.shippingAddress.province,
      )
      await checkoutInfoPageLocal.zipInput.fill(TEST_DATA.shippingAddress.zip)

      await checkoutInfoPageLocal.continueToShipping()
      await checkoutShippingPageLocal.waitForPage()
      await checkoutShippingPageLocal.selectFirstShippingOption()
      await checkoutShippingPageLocal.continueToPayment()
      await checkoutPaymentPageLocal.waitForPage()

      return checkoutPaymentPageLocal
    }

    test('shows error for declined card', async ({ page }) => {
      const checkoutPaymentPageLocal = await navigateToPayment(page)

      await fillStripeCard(page, { cardNumber: STRIPE_TEST_CARDS.declined })
      await checkoutPaymentPageLocal.submitPayment()

      await expect(page.locator('text=/declined|not accepted/i')).toBeVisible({
        timeout: 15000,
      })
    })

    test('shows error for insufficient funds', async ({ page }) => {
      const checkoutPaymentPageLocal = await navigateToPayment(page)

      await fillStripeCard(page, {
        cardNumber: STRIPE_TEST_CARDS.insufficientFunds,
      })
      await checkoutPaymentPageLocal.submitPayment()

      await expect(page.locator('text=/insufficient|funds/i')).toBeVisible({
        timeout: 15000,
      })
    })

    test('shows error for expired card', async ({ page }) => {
      const checkoutPaymentPageLocal = await navigateToPayment(page)

      await fillStripeCard(page, { cardNumber: STRIPE_TEST_CARDS.expired })
      await checkoutPaymentPageLocal.submitPayment()

      await expect(page.locator('text=/expired/i')).toBeVisible({
        timeout: 15000,
      })
    })

    test('allows retry after card error', async ({ page }) => {
      const checkoutPaymentPageLocal = await navigateToPayment(page)

      await fillStripeCard(page, { cardNumber: STRIPE_TEST_CARDS.declined })
      await checkoutPaymentPageLocal.submitPayment()
      await expect(page.locator('text=/declined|error/i')).toBeVisible({
        timeout: 15000,
      })

      await fillStripeCard(page, { cardNumber: STRIPE_TEST_CARDS.valid })
      await checkoutPaymentPageLocal.submitPayment()

      const { CheckoutConfirmationPage } = await import(
        '../../page-objects/checkout-confirmation.page'
      )
      const confirmationPage = new CheckoutConfirmationPage(page)
      await confirmationPage.waitForPage()
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
