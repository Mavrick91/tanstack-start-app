import { PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

type PayPalButtonProps = {
  checkoutId: string
  onSuccess: (paymentId: string) => void
  onError: (error: string) => void
}

export const PayPalButton = ({
  checkoutId,
  onSuccess,
  onError,
}: PayPalButtonProps) => {
  const { t } = useTranslation()
  const [{ isPending, isRejected }] = usePayPalScriptReducer()

  const createOrder = async () => {
    try {
      const response = await fetch(
        `/api/checkout/${checkoutId}/payment/paypal`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        },
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || t('Failed to create PayPal order'))
      }

      const data = await response.json()
      return data.orderId
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('Failed to create PayPal order')
      onError(message)
      throw err
    }
  }

  const onApprove = async (data: { orderID: string }) => {
    try {
      // Capture the order on the server
      const response = await fetch(
        `/api/checkout/${checkoutId}/payment/paypal/capture`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ orderId: data.orderID }),
        },
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || t('Failed to capture PayPal payment'))
      }

      onSuccess(data.orderID)
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t('Failed to complete PayPal payment')
      onError(message)
    }
  }

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-900" />
      </div>
    )
  }

  if (isRejected) {
    return (
      <div className="p-4 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm text-center">
        {t('Failed to load PayPal. Please try again.')}
      </div>
    )
  }

  return (
    <div className="paypal-button-container">
      <PayPalButtons
        style={{
          layout: 'vertical',
          color: 'black',
          shape: 'rect',
          height: 55,
          label: 'paypal',
        }}
        createOrder={createOrder}
        onApprove={onApprove}
        onError={(err) => {
          console.error('PayPal error:', err)
          onError(t('PayPal encountered an error'))
        }}
        onCancel={() => {
          // User cancelled - no action needed
        }}
      />
    </div>
  )
}
