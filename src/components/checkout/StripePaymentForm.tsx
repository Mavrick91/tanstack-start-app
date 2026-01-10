import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Loader2, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '../ui/button'

type StripePaymentFormProps = {
  onSuccess: (paymentIntentId: string) => void
  onError?: (message: string) => void
  returnUrl: string
}

export const StripePaymentForm = ({
  onSuccess,
  onError,
  returnUrl,
}: StripePaymentFormProps) => {
  const { t } = useTranslation()
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: returnUrl,
        },
        redirect: 'if_required',
      })

      if (result.error) {
        const errorMessage = result.error.message || 'Payment failed'
        setError(errorMessage)
        onError?.(errorMessage)
      } else if (
        result.paymentIntent &&
        result.paymentIntent.status === 'succeeded'
      ) {
        onSuccess(result.paymentIntent.id)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment failed'
      console.error('Stripe error:', errorMessage)
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-base font-medium text-gray-900">
          {t('Credit Card Details')}
        </h3>
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800 text-sm">
            {error}
          </div>
        )}
        <div className="rounded-lg border bg-white p-4 focus-within:border-blue-500 transition-all">
          <PaymentElement
            options={{
              layout: 'tabs',
            }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-500 justify-center">
        <ShieldCheck className="w-4 h-4 text-green-500" />
        <span>{t('All transactions are secure and encrypted.')}</span>
      </div>

      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all"
      >
        {isProcessing ? (
          <span className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('Processing payment...')}
          </span>
        ) : (
          t('Pay now')
        )}
      </Button>
    </form>
  )
}
