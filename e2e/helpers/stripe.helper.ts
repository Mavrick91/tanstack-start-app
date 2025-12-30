import { type Page, type FrameLocator } from '@playwright/test'

export const STRIPE_TEST_CARDS = {
  valid: '4242424242424242',
  declined: '4000000000000002',
  insufficientFunds: '4000000000009995',
  expired: '4000000000000069',
  incorrectCvc: '4000000000000127',
  requires3ds: '4000002500003155',
  visaDebit: '4000056655665556',
  mastercard: '5555555555554444',
  amex: '378282246310005',
}

export const STRIPE_TEST_EXPIRY = '12/30'
export const STRIPE_TEST_CVC = '123'
export const STRIPE_TEST_CVC_AMEX = '1234'

export function getStripeFrame(page: Page): FrameLocator {
  return page.frameLocator('iframe[title*="Secure payment"]').first()
}

export async function fillStripeCard(
  page: Page,
  options: {
    cardNumber?: string
    expiry?: string
    cvc?: string
  } = {},
): Promise<void> {
  const {
    cardNumber = STRIPE_TEST_CARDS.valid,
    expiry = STRIPE_TEST_EXPIRY,
    cvc = STRIPE_TEST_CVC,
  } = options

  await page.waitForTimeout(2000)
  const stripeFrame = getStripeFrame(page)

  const cardNumberInput = stripeFrame.locator('[name="number"]')
  await cardNumberInput.waitFor({ state: 'visible', timeout: 10000 })
  await cardNumberInput.fill(cardNumber)

  const expiryInput = stripeFrame.locator('[name="expiry"]')
  await expiryInput.fill(expiry)

  const cvcInput = stripeFrame.locator('[name="cvc"]')
  await cvcInput.fill(cvc)
}

export async function handle3DSecure(
  page: Page,
  action: 'complete' | 'fail',
): Promise<void> {
  const threeDsFrame = page
    .frameLocator('iframe[name*="stripe-challenge"]')
    .first()

  try {
    await threeDsFrame
      .locator('body')
      .waitFor({ state: 'visible', timeout: 10000 })

    if (action === 'complete') {
      const completeButton = threeDsFrame.locator(
        'button:has-text("Complete"), button:has-text("Authorize")',
      )
      await completeButton.click()
    } else {
      const failButton = threeDsFrame.locator('button:has-text("Fail")')
      await failButton.click()
    }
  } catch {
    console.log('3DS frame not found or auto-completed')
  }
}

export async function waitForStripeReady(page: Page): Promise<void> {
  const stripeFrame = getStripeFrame(page)
  await stripeFrame
    .locator('[name="number"]')
    .waitFor({ state: 'visible', timeout: 15000 })
}
