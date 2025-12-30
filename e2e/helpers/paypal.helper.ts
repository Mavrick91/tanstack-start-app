import { type Page } from '@playwright/test'

export const PAYPAL_SANDBOX = {
  buyerEmail: process.env.PAYPAL_SANDBOX_BUYER_EMAIL || '',
  buyerPassword: process.env.PAYPAL_SANDBOX_BUYER_PASSWORD || '',
}

export async function clickPayPalButton(page: Page): Promise<Page> {
  const paypalFrame = page.frameLocator('iframe[title*="PayPal"]').first()
  await paypalFrame
    .locator('.paypal-button')
    .waitFor({ state: 'visible', timeout: 15000 })

  const popupPromise = page.waitForEvent('popup', { timeout: 30000 })
  await paypalFrame.locator('.paypal-button').click()

  const popup = await popupPromise
  await popup.waitForLoadState('domcontentloaded')

  return popup
}

export async function completePayPalSandboxFlow(popup: Page): Promise<void> {
  if (!PAYPAL_SANDBOX.buyerEmail || !PAYPAL_SANDBOX.buyerPassword) {
    throw new Error(
      'PayPal sandbox credentials not configured. Set PAYPAL_SANDBOX_BUYER_EMAIL and PAYPAL_SANDBOX_BUYER_PASSWORD environment variables.',
    )
  }

  try {
    await popup.waitForLoadState('networkidle')

    const emailInput = popup.locator('#email')
    if (await emailInput.isVisible({ timeout: 5000 })) {
      await emailInput.fill(PAYPAL_SANDBOX.buyerEmail)
      await popup.locator('#btnNext').click()

      const passwordInput = popup.locator('#password')
      await passwordInput.waitFor({ state: 'visible', timeout: 10000 })
      await passwordInput.fill(PAYPAL_SANDBOX.buyerPassword)
      await popup.locator('#btnLogin').click()
    }

    await popup.waitForLoadState('networkidle')

    const payButton = popup.locator(
      '#payment-submit-btn, button:has-text("Pay Now"), button:has-text("Continue")',
    )
    await payButton.waitFor({ state: 'visible', timeout: 30000 })
    await payButton.click()
  } catch (error) {
    console.error('PayPal flow error:', error)
    throw error
  }
}

export async function cancelPayPalPayment(popup: Page): Promise<void> {
  await popup.close()
}

export async function waitForPayPalReady(page: Page): Promise<void> {
  const paypalFrame = page.frameLocator('iframe[title*="PayPal"]').first()
  await paypalFrame
    .locator('.paypal-button')
    .waitFor({ state: 'visible', timeout: 20000 })
}
