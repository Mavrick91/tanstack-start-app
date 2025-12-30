import { test, expect } from '@playwright/test'
import { ProductPage } from '../page-objects/product.page'
import { CheckoutInfoPage } from '../page-objects/checkout-info.page'
import { CheckoutShippingPage } from '../page-objects/checkout-shipping.page'
import { CheckoutPaymentPage } from '../page-objects/checkout-payment.page'
import { CartHelper } from '../helpers/cart.helper'
import { TEST_DATA } from '../fixtures/test-data'

test.describe('Checkout Flow - Stripe Payment', () => {
  let productPage: ProductPage
  let checkoutInfoPage: CheckoutInfoPage
  let checkoutShippingPage: CheckoutShippingPage
  let checkoutPaymentPage: CheckoutPaymentPage
  let cartHelper: CartHelper

  test.beforeEach(async ({ page }) => {
    productPage = new ProductPage(page)
    checkoutInfoPage = new CheckoutInfoPage(page)
    checkoutShippingPage = new CheckoutShippingPage(page)
    checkoutPaymentPage = new CheckoutPaymentPage(page)
    cartHelper = new CartHelper(page)

    // Clear cart before each test
    await page.goto('/en')
    await page.waitForLoadState('networkidle')
    await cartHelper.clearCart()
  })

  test('can add product to cart and reach checkout', async ({ page }) => {
    // Go to products and add first product to cart
    await page.goto('/en/products')
    await page.waitForLoadState('networkidle')

    const firstProduct = page.locator('a[href*="/en/products/"]').first()
    await firstProduct.click()
    await page.waitForURL('**/products/**')
    await productPage.addToCart()

    // Open cart drawer and verify checkout button
    await page.getByRole('button', { name: /cart/i }).click()
    const checkoutButton = page.getByRole('button', { name: /^checkout$/i })
    await expect(checkoutButton).toBeVisible({ timeout: 5000 })

    // Click checkout and verify we reach the information page
    await checkoutButton.click()
    await checkoutInfoPage.waitForCheckoutReady()

    // Verify checkout page elements are visible
    await expect(page.getByRole('heading', { name: /contact/i })).toBeVisible()
    await expect(
      page.getByRole('heading', { name: /shipping address/i }),
    ).toBeVisible()
    await expect(checkoutInfoPage.emailInput).toBeVisible()
    await expect(checkoutInfoPage.continueButton).toBeVisible()
  })

  test('complete checkout through shipping step', async ({ page }) => {
    // Go to products and add first product to cart
    await page.goto('/en/products')
    await page.waitForLoadState('networkidle')

    const firstProduct = page.locator('a[href*="/en/products/"]').first()
    await firstProduct.click()
    await page.waitForURL('**/products/**')
    await productPage.addToCart()

    // Open cart drawer and click checkout
    await page.getByRole('button', { name: /cart/i }).click()
    const checkoutButton = page.getByRole('button', { name: /^checkout$/i })
    await expect(checkoutButton).toBeVisible({ timeout: 5000 })
    await checkoutButton.click()
    await checkoutInfoPage.waitForCheckoutReady()

    // Fill contact info
    await checkoutInfoPage.fillContactInfo(TEST_DATA.customer.email)

    // Fill shipping address - select country first
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

    // Continue to shipping
    await checkoutInfoPage.continueToShipping()

    // Verify we reached shipping page
    await checkoutShippingPage.waitForPage()
    await expect(checkoutShippingPage.continueButton).toBeVisible()
  })

  test('complete checkout through payment step', async ({ page }) => {
    // Go to products and add first product to cart
    await page.goto('/en/products')
    await page.waitForLoadState('networkidle')

    const firstProduct = page.locator('a[href*="/en/products/"]').first()
    await firstProduct.click()
    await page.waitForURL('**/products/**')
    await productPage.addToCart()

    // Open cart drawer and click checkout
    await page.getByRole('button', { name: /cart/i }).click()
    const checkoutButton = page.getByRole('button', { name: /^checkout$/i })
    await expect(checkoutButton).toBeVisible({ timeout: 5000 })
    await checkoutButton.click()
    await checkoutInfoPage.waitForCheckoutReady()

    // Fill contact info
    await checkoutInfoPage.fillContactInfo(TEST_DATA.customer.email)

    // Fill shipping address - select country first
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

    // Continue to shipping
    await checkoutInfoPage.continueToShipping()
    await checkoutShippingPage.waitForPage()

    // Select shipping and continue to payment
    await checkoutShippingPage.selectFirstShippingOption()
    await checkoutShippingPage.continueToPayment()

    // Verify we reached payment page
    await checkoutPaymentPage.waitForPage()
    await expect(checkoutPaymentPage.cardTab).toBeVisible()
    await expect(checkoutPaymentPage.paypalTab).toBeVisible()
  })
})

test.describe('Checkout Flow - Edge Cases', () => {
  test('redirect when cart is empty', async ({ page }) => {
    // Clear any existing cart
    await page.goto('/en')
    await page.evaluate(() => localStorage.removeItem('cart-storage'))

    await page.goto('/en/checkout/information')

    // Should redirect away from checkout
    await expect(page).not.toHaveURL('**/checkout/information', {
      timeout: 5000,
    })
  })

  test('should preserve cart across page navigation', async ({ page }) => {
    const productPage = new ProductPage(page)

    // Add product
    await page.goto('/en/products')
    await page.waitForLoadState('networkidle')

    const firstProduct = page.locator('a[href*="/en/products/"]').first()
    await firstProduct.click()
    await page.waitForURL('**/products/**')
    await productPage.addToCart()

    // Navigate away
    await page.goto('/en')
    await page.waitForLoadState('networkidle')

    // Verify cart still has items
    const cartHelper = new CartHelper(page)
    const itemCount = await cartHelper.getCartItemCount()
    expect(itemCount).toBeGreaterThan(0)
  })
})
