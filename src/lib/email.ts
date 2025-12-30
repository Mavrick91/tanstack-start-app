import sgMail from '@sendgrid/mail'

import type { AddressSnapshot } from '../db/schema'

export interface EmailResult {
  success: boolean
  error?: string
}

export interface OrderEmailData {
  id: string
  orderNumber: number
  email: string
  total: number
  currency: string
  items: Array<{
    title: string
    variantTitle?: string | null
    quantity: number
    price: number
  }>
  shippingAddress: AddressSnapshot
}

export interface ShippingEmailData {
  email: string
  orderNumber: number
  trackingNumber?: string
  carrier?: string
  estimatedDelivery?: string
}

export interface PasswordResetEmailData {
  email: string
  resetToken: string
  resetUrl: string
}

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@finenail.com'
const FROM_NAME = process.env.FROM_NAME || 'FineNail'

export function isEmailConfigured(): boolean {
  return !!process.env.SENDGRID_API_KEY
}

function initializeSendGrid(): boolean {
  const apiKey = process.env.SENDGRID_API_KEY
  if (!apiKey) return false
  sgMail.setApiKey(apiKey)
  return true
}

function generateOrderConfirmationHtml(order: OrderEmailData): string {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: order.currency,
    }).format(amount)
  }

  const itemsHtml = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">
          ${item.title}${item.variantTitle ? ` - ${item.variantTitle}` : ''}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
          ${item.quantity}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">
          ${formatCurrency(item.price * item.quantity)}
        </td>
      </tr>
    `,
    )
    .join('')

  const { shippingAddress: addr } = order

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #ec4899, #f43f5e); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 28px;">Thank You for Your Order!</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Order #${order.orderNumber}</p>
    </div>

    <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
      <p style="font-size: 16px; color: #333; margin-bottom: 24px;">
        Hi ${addr.firstName},<br><br>
        We've received your order and it's being processed. You'll receive another email when your order ships.
      </p>

      <h2 style="color: #333; font-size: 18px; border-bottom: 2px solid #ec4899; padding-bottom: 8px; margin-bottom: 16px;">
        Order Details
      </h2>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <thead>
          <tr style="background-color: #fdf2f8;">
            <th style="padding: 12px; text-align: left; color: #ec4899;">Item</th>
            <th style="padding: 12px; text-align: center; color: #ec4899;">Qty</th>
            <th style="padding: 12px; text-align: right; color: #ec4899;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding: 12px; text-align: right; font-weight: bold;">Total:</td>
            <td style="padding: 12px; text-align: right; font-weight: bold; color: #ec4899; font-size: 18px;">
              ${formatCurrency(order.total)}
            </td>
          </tr>
        </tfoot>
      </table>

      <h2 style="color: #333; font-size: 18px; border-bottom: 2px solid #ec4899; padding-bottom: 8px; margin-bottom: 16px;">
        Shipping Address
      </h2>

      <p style="color: #666; line-height: 1.6; margin-bottom: 24px;">
        ${addr.firstName} ${addr.lastName}<br>
        ${addr.address1}<br>
        ${addr.address2 ? addr.address2 + '<br>' : ''}
        ${addr.city}${addr.province ? ', ' + addr.province : ''} ${addr.zip}<br>
        ${addr.country}
      </p>

      <div style="background: #fdf2f8; border-radius: 8px; padding: 20px; text-align: center;">
        <p style="color: #ec4899; margin: 0 0 10px; font-weight: 500;">
          Questions about your order?
        </p>
        <p style="color: #666; margin: 0; font-size: 14px;">
          Contact us at marina.katili@gmail.com
        </p>
      </div>
    </div>

    <p style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">
      © ${new Date().getFullYear()} FineNail. All rights reserved.
    </p>
  </div>
</body>
</html>
  `
}

function generateShippingUpdateHtml(data: ShippingEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shipping Update</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #ec4899, #f43f5e); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 28px;">Your Order Has Shipped!</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Order #${data.orderNumber}</p>
    </div>

    <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
      <p style="font-size: 16px; color: #333; margin-bottom: 24px;">
        Great news! Your order is on its way.
      </p>

      ${
        data.trackingNumber
          ? `
      <div style="background: #fdf2f8; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <h3 style="color: #ec4899; margin: 0 0 12px;">Tracking Information</h3>
        ${data.carrier ? `<p style="margin: 0 0 8px; color: #666;"><strong>Carrier:</strong> ${data.carrier}</p>` : ''}
        <p style="margin: 0 0 8px; color: #666;"><strong>Tracking Number:</strong> ${data.trackingNumber}</p>
        ${data.estimatedDelivery ? `<p style="margin: 0; color: #666;"><strong>Estimated Delivery:</strong> ${data.estimatedDelivery}</p>` : ''}
      </div>
      `
          : ''
      }

      <div style="text-align: center;">
        <p style="color: #666; margin: 0; font-size: 14px;">
          Questions? Contact us at marina.katili@gmail.com
        </p>
      </div>
    </div>

    <p style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">
      © ${new Date().getFullYear()} Marina Katili. All rights reserved.
    </p>
  </div>
</body>
</html>
  `
}

function generatePasswordResetHtml(data: PasswordResetEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #ec4899, #f43f5e); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 28px;">Reset Your Password</h1>
    </div>

    <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
      <p style="font-size: 16px; color: #333; margin-bottom: 24px;">
        We received a request to reset your password. Click the button below to create a new password.
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #ec4899, #f43f5e); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Reset Password
        </a>
      </div>

      <p style="color: #666; font-size: 14px; margin-bottom: 24px;">
        This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
      </p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">

      <p style="color: #999; font-size: 12px; margin: 0;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${data.resetUrl}" style="color: #ec4899; word-break: break-all;">${data.resetUrl}</a>
      </p>
    </div>

    <p style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">
      © ${new Date().getFullYear()} Marina Katili. All rights reserved.
    </p>
  </div>
</body>
</html>
  `
}

export async function sendOrderConfirmationEmail(
  order: OrderEmailData,
): Promise<EmailResult> {
  if (!isEmailConfigured()) {
    return { success: false, error: 'Email service not configured' }
  }

  if (!order.email) {
    return { success: false, error: 'Customer email is required' }
  }

  if (!initializeSendGrid()) {
    return { success: false, error: 'Failed to initialize email service' }
  }

  try {
    await sgMail.send({
      to: order.email,
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject: `Order Confirmation - #${order.orderNumber}`,
      html: generateOrderConfirmationHtml(order),
    })

    return { success: true }
  } catch (error) {
    console.error('Failed to send order confirmation email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    }
  }
}

export async function sendShippingUpdateEmail(
  data: ShippingEmailData,
): Promise<EmailResult> {
  if (!isEmailConfigured()) {
    return { success: false, error: 'Email service not configured' }
  }

  if (!data.email) {
    return { success: false, error: 'Customer email is required' }
  }

  if (!initializeSendGrid()) {
    return { success: false, error: 'Failed to initialize email service' }
  }

  try {
    await sgMail.send({
      to: data.email,
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject: `Your Order Has Shipped - #${data.orderNumber}`,
      html: generateShippingUpdateHtml(data),
    })

    return { success: true }
  } catch (error) {
    console.error('Failed to send shipping update email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    }
  }
}

export async function sendPasswordResetEmail(
  data: PasswordResetEmailData,
): Promise<EmailResult> {
  if (!isEmailConfigured()) {
    return { success: false, error: 'Email service not configured' }
  }

  if (!data.email) {
    return { success: false, error: 'Email address is required' }
  }

  if (!initializeSendGrid()) {
    return { success: false, error: 'Failed to initialize email service' }
  }

  try {
    await sgMail.send({
      to: data.email,
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject: 'Reset Your FineNail Password',
      html: generatePasswordResetHtml(data),
    })

    return { success: true }
  } catch (error) {
    console.error('Failed to send password reset email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    }
  }
}
