import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Check, Copy, Loader2, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '../ui/button'

const TEST_CARDS = [
  {
    number: '4242424242424242',
    label: 'Visa (success)',
    color: 'text-green-600',
  },
  { number: '4000000000003220', label: '3D Secure 2', color: 'text-blue-600' },
  {
    number: '4000000000009995',
    label: 'Declined (insufficient)',
    color: 'text-red-600',
  },
  {
    number: '4000000000000002',
    label: 'Declined (generic)',
    color: 'text-red-600',
  },
]

function TestCardHelper() {
  const [copiedCard, setCopiedCard] = useState<string | null>(null)

  const copyToClipboard = async (cardNumber: string) => {
    await navigator.clipboard.writeText(cardNumber)
    setCopiedCard(cardNumber)
    setTimeout(() => setCopiedCard(null), 2000)
  }

  // Only show in development
  if (import.meta.env.PROD) return null

  return (
    <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs">
      <p className="font-semibold text-amber-800 mb-2">
        🧪 Test Cards (click to copy)
      </p>
      <div className="grid grid-cols-2 gap-2">
        {TEST_CARDS.map((card) => (
          <button
            key={card.number}
            type="button"
            onClick={() => copyToClipboard(card.number)}
            className={`flex items-center justify-between gap-2 p-2 rounded bg-white border hover:bg-gray-50 transition-colors ${card.color}`}
          >
            <div className="text-left">
              <div className="font-mono text-[10px]">{card.number}</div>
              <div className="text-[9px] text-gray-500">{card.label}</div>
            </div>
            {copiedCard === card.number ? (
              <Check className="w-3 h-3 text-green-500 shrink-0" />
            ) : (
              <Copy className="w-3 h-3 text-gray-400 shrink-0" />
            )}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[9px] text-amber-600">
        Use any future date, any 3-digit CVC, any ZIP code
      </p>
    </div>
  )
}

type StripePaymentFormProps = {
  onSuccess: (paymentIntentId: string) => void
  onError: (error: string) => void
  returnUrl: string
}

export function StripePaymentForm({
  onSuccess,
  onError,
  returnUrl,
}: StripePaymentFormProps) {
  const { t } = useTranslation()
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsProcessing(true)
    setErrorMessage(null)

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: returnUrl,
        },
        redirect: 'if_required',
      })

      if (error) {
        setErrorMessage(error.message || t('Payment failed'))
        onError(error.message || t('Payment failed'))
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        onSuccess(paymentIntent.id)
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('An unexpected error occurred')
      setErrorMessage(message)
      onError(message)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <TestCardHelper />
      <div className="space-y-4">
        <h3 className="text-base font-medium text-gray-900">
          {t('Credit Card Details')}
        </h3>
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

      {errorMessage && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm text-center animate-in fade-in slide-in-from-top-2">
          {errorMessage}
        </div>
      )}

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
