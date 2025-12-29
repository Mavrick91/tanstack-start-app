// PayPal API utilities for server-side operations

const PAYPAL_API_BASE =
  process.env.PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com'

// Get PayPal access token
async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured')
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!response.ok) {
    throw new Error('Failed to get PayPal access token')
  }

  const data = await response.json()
  return data.access_token
}

// Shipping address for PayPal order
export interface PayPalShippingAddress {
  firstName: string
  lastName: string
  address1: string
  address2?: string
  city: string
  province: string
  zip: string
  countryCode: string
  phone?: string
}

// Create a PayPal order
export async function createPayPalOrder({
  amount,
  currency = 'USD',
  description,
  checkoutId,
  email,
  shippingAddress,
}: {
  amount: number
  currency?: string
  description?: string
  checkoutId: string
  email?: string
  shippingAddress?: PayPalShippingAddress
}) {
  const accessToken = await getAccessToken()

  // Build purchase unit with optional shipping
  const purchaseUnit: Record<string, unknown> = {
    amount: {
      currency_code: currency,
      value: amount.toFixed(2),
    },
    description,
    custom_id: checkoutId,
  }

  // Add shipping address if provided
  if (shippingAddress) {
    purchaseUnit.shipping = {
      name: {
        full_name: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
      },
      address: {
        address_line_1: shippingAddress.address1,
        ...(shippingAddress.address2 && {
          address_line_2: shippingAddress.address2,
        }),
        admin_area_2: shippingAddress.city,
        admin_area_1: shippingAddress.province,
        postal_code: shippingAddress.zip,
        country_code: shippingAddress.countryCode,
      },
    }
  }

  // Build payer info
  const payer: Record<string, unknown> = {}
  if (email) {
    payer.email_address = email
  }
  if (shippingAddress?.phone) {
    // Remove non-digits for PayPal phone format
    const cleanPhone = shippingAddress.phone.replace(/\D/g, '')
    if (cleanPhone.length >= 10) {
      payer.phone = {
        phone_type: 'MOBILE',
        phone_number: {
          national_number: cleanPhone.slice(-10), // Last 10 digits
        },
      }
    }
  }

  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [purchaseUnit],
      ...(Object.keys(payer).length > 0 && { payer }),
      application_context: {
        shipping_preference: shippingAddress
          ? 'SET_PROVIDED_ADDRESS'
          : 'GET_FROM_FILE',
      },
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to create PayPal order')
  }

  const data = await response.json()
  return {
    orderId: data.id,
    status: data.status,
  }
}

// Capture a PayPal order (after customer approval)
export async function capturePayPalOrder(orderId: string) {
  const accessToken = await getAccessToken()

  const response = await fetch(
    `${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    },
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to capture PayPal order')
  }

  const data = await response.json()
  return {
    orderId: data.id,
    status: data.status,
    payerId: data.payer?.payer_id,
  }
}

// Get PayPal order details
export async function getPayPalOrder(orderId: string) {
  const accessToken = await getAccessToken()

  const response = await fetch(
    `${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    },
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to get PayPal order')
  }

  return await response.json()
}

// Get PayPal client ID for frontend
export function getPayPalClientId(): string {
  return process.env.PAYPAL_CLIENT_ID || ''
}

// Verify PayPal webhook signature
export async function verifyWebhookSignature({
  body,
  headers,
  webhookId,
}: {
  body: string
  headers: Record<string, string>
  webhookId: string
}) {
  const accessToken = await getAccessToken()

  const response = await fetch(
    `${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auth_algo: headers['paypal-auth-algo'],
        cert_url: headers['paypal-cert-url'],
        transmission_id: headers['paypal-transmission-id'],
        transmission_sig: headers['paypal-transmission-sig'],
        transmission_time: headers['paypal-transmission-time'],
        webhook_id: webhookId,
        webhook_event: JSON.parse(body),
      }),
    },
  )

  if (!response.ok) {
    return { verified: false }
  }

  const data = await response.json()
  return { verified: data.verification_status === 'SUCCESS' }
}
