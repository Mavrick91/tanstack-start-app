import { PayPalScriptProvider } from '@paypal/react-paypal-js'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import {
  createFileRoute,
  useNavigate,
  useParams,
  Link,
} from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, CreditCard, Loader2, Lock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { CheckoutLayout } from '../../../components/checkout/CheckoutLayout'
import { OrderSummary } from '../../../components/checkout/OrderSummary'
import { PaymentErrorBoundary } from '../../../components/checkout/PaymentErrorBoundary'
import { PayPalButton } from '../../../components/checkout/PayPalButton'
import { StripePaymentForm } from '../../../components/checkout/StripePaymentForm'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../../components/ui/tabs'
import { useCartStore } from '../../../hooks/useCart'
import {
  useCheckoutIdStore,
  useCheckout,
  useCreateStripePaymentIntent,
  useCompleteCheckout,
} from '../../../hooks/useCheckoutQueries'
import { formatCurrency } from '../../../lib/format'

export const Route = createFileRoute('/$lang/checkout/payment')({
  component: CheckoutPaymentPage,
})

function CheckoutPaymentPage() {
  const { lang } = useParams({ strict: false }) as { lang: string }
  const navigate = useNavigate()
  const { t } = useTranslation()

  const checkoutId = useCheckoutIdStore((s) => s.checkoutId)
  const clearCheckoutId = useCheckoutIdStore((s) => s.clearCheckoutId)
  const { data: checkout, isLoading: isLoadingCheckout } =
    useCheckout(checkoutId)
  const clearCart = useCartStore((s) => s.clearCart)

  const createPaymentIntentMutation = useCreateStripePaymentIntent(
    checkoutId || '',
  )
  const completeCheckoutMutation = useCompleteCheckout(checkoutId || '')

  const [paymentTab, setPaymentTab] = useState('card')
  const [stripePromise, setStripePromise] = useState<ReturnType<
    typeof loadStripe
  > | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paypalClientId, setPaypalClientId] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Redirect if no checkout or missing shipping info
  if (!checkoutId) {
    navigate({ to: '/$lang/checkout', params: { lang } })
  }

  if (checkout && (!checkout.shippingAddress || !checkout.shippingRateId)) {
    navigate({ to: '/$lang/checkout/information', params: { lang } })
  }

  // Initialize payment once checkout is loaded
  useEffect(() => {
    const init = async () => {
      if (!checkoutId || !checkout || isInitialized) return
      if (!checkout.shippingAddress || !checkout.shippingRateId) return

      try {
        const stripeData = await createPaymentIntentMutation.mutateAsync()
        setClientSecret(stripeData.clientSecret)
        setPaypalClientId(
          stripeData.paypalClientId || import.meta.env.VITE_PAYPAL_CLIENT_ID,
        )

        const stripe = loadStripe(stripeData.publishableKey)
        setStripePromise(stripe)
        setIsInitialized(true)
      } catch (err) {
        console.error('Failed to initialize payment:', err)
        toast.error(
          err instanceof Error
            ? err.message
            : t('Failed to initialize payment'),
        )
      }
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkout, checkoutId, isInitialized])

  const handlePaymentSuccess = async (
    paymentProvider: 'stripe' | 'paypal',
    paymentId: string,
  ) => {
    if (!checkoutId) return

    try {
      const result = await completeCheckoutMutation.mutateAsync({
        paymentProvider,
        paymentId,
      })

      clearCart()
      clearCheckoutId()

      navigate({
        to: '/$lang/checkout/confirmation',
        params: { lang },
        search: {
          orderId: result.order.id,
          orderNumber: result.order.orderNumber,
        },
      })
    } catch (err) {
      console.error('Failed to complete checkout:', err)
      toast.error(
        err instanceof Error ? err.message : t('Failed to complete order'),
      )
    }
  }

  const handlePaymentError = (errorMessage: string) => {
    toast.error(errorMessage)
  }

  const isLoading = isLoadingCheckout || createPaymentIntentMutation.isPending

  if (isLoading || !checkout) {
    return (
      <CheckoutLayout currentStep="payment">
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gray-200" />
        </div>
      </CheckoutLayout>
    )
  }

  const shippingAddress = checkout.shippingAddress

  return (
    <CheckoutLayout
      currentStep="payment"
      total={formatCurrency({
        value: checkout.total,
        currency: checkout.currency,
      })}
      orderSummary={
        <OrderSummary
          items={checkout.cartItems}
          subtotal={checkout.subtotal}
          shippingTotal={checkout.shippingTotal}
          total={checkout.total}
          currency={checkout.currency}
        />
      }
    >
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-8"
        >
          {/* Contact & Shipping summary */}
          <div className="border rounded-lg divide-y text-sm bg-white">
            <div className="p-4 flex items-start justify-between gap-4">
              <div className="flex flex-1 gap-4">
                <span className="text-gray-500 w-20 shrink-0">
                  {t('Contact')}
                </span>
                <span className="text-gray-900 break-all">
                  {checkout.email}
                </span>
              </div>
              <Link
                to="/$lang/checkout/information"
                params={{ lang }}
                className="text-blue-600 hover:underline shrink-0"
              >
                {t('Change')}
              </Link>
            </div>

            {shippingAddress && (
              <div className="p-4 flex items-start justify-between gap-4">
                <div className="flex flex-1 gap-4">
                  <span className="text-gray-500 w-20 shrink-0">
                    {t('Ship to')}
                  </span>
                  <span className="text-gray-900">
                    {shippingAddress.address1}, {shippingAddress.city},{' '}
                    {shippingAddress.province} {shippingAddress.zip},{' '}
                    {shippingAddress.country}
                  </span>
                </div>
                <Link
                  to="/$lang/checkout/information"
                  params={{ lang }}
                  className="text-blue-600 hover:underline shrink-0"
                >
                  {t('Change')}
                </Link>
              </div>
            )}

            <div className="p-4 flex items-start justify-between gap-4">
              <div className="flex flex-1 gap-4">
                <span className="text-gray-500 w-20 shrink-0">
                  {t('Method')}
                </span>
                <span className="text-gray-900">{checkout.shippingMethod}</span>
              </div>
              <Link
                to="/$lang/checkout/shipping"
                params={{ lang }}
                className="text-blue-600 hover:underline shrink-0"
              >
                {t('Change')}
              </Link>
            </div>
          </div>

          {/* Payment section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t('Payment')}</h2>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Lock className="w-3.5 h-3.5" />
                {t('Secure & Encrypted')}
              </div>
            </div>

            <p className="text-sm text-gray-500">
              {t('All transactions are secure and encrypted.')}
            </p>

            <Tabs value={paymentTab} onValueChange={setPaymentTab}>
              <TabsList className="w-full h-12 bg-gray-100 p-1 rounded-lg">
                <TabsTrigger
                  value="card"
                  className="flex-1 h-full rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {t('Credit Card')}
                </TabsTrigger>
                <TabsTrigger
                  value="paypal"
                  className="flex-1 h-full rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  PayPal
                </TabsTrigger>
              </TabsList>

              <TabsContent value="card" className="mt-4">
                <PaymentErrorBoundary
                  fallbackMessage={t(
                    'Something went wrong with the card payment form.',
                  )}
                  onReset={() => {}}
                >
                  {stripePromise && clientSecret ? (
                    <Elements
                      stripe={stripePromise}
                      options={{
                        clientSecret,
                        appearance: {
                          theme: 'stripe',
                          variables: {
                            colorPrimary: '#2563eb',
                            borderRadius: '8px',
                          },
                        },
                      }}
                    >
                      <StripePaymentForm
                        onSuccess={(paymentId) =>
                          handlePaymentSuccess('stripe', paymentId)
                        }
                        onError={handlePaymentError}
                        returnUrl={`${window.location.origin}/${lang}/checkout/confirmation`}
                      />
                    </Elements>
                  ) : (
                    <div className="flex items-center justify-center py-8 bg-gray-50 rounded-lg">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    </div>
                  )}
                </PaymentErrorBoundary>
              </TabsContent>

              <TabsContent value="paypal" className="mt-4">
                <PaymentErrorBoundary
                  fallbackMessage={t('Something went wrong with PayPal.')}
                  onReset={() => {}}
                >
                  {paypalClientId ? (
                    <div className="p-6 bg-gray-50 rounded-lg border">
                      <PayPalScriptProvider
                        options={{
                          clientId: paypalClientId,
                          currency: checkout.currency,
                        }}
                      >
                        <PayPalButton
                          checkoutId={checkoutId!}
                          onSuccess={(paymentId) =>
                            handlePaymentSuccess('paypal', paymentId)
                          }
                          onError={handlePaymentError}
                        />
                      </PayPalScriptProvider>
                    </div>
                  ) : (
                    <div className="p-8 rounded-lg border bg-gray-50 text-gray-500 text-center">
                      {t('PayPal is not available at this time.')}
                    </div>
                  )}
                </PaymentErrorBoundary>
              </TabsContent>
            </Tabs>
          </div>

          {/* Error display */}
          {(createPaymentIntentMutation.error ||
            completeCheckoutMutation.error) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm"
            >
              {createPaymentIntentMutation.error?.message ||
                completeCheckoutMutation.error?.message}
            </motion.div>
          )}

          {/* Navigation */}
          <div className="pt-4">
            <Link
              to="/$lang/checkout/shipping"
              params={{ lang }}
              className="flex items-center gap-1 text-blue-600 hover:underline text-sm"
            >
              <ChevronLeft className="w-4 h-4" />
              {t('Return to shipping')}
            </Link>
          </div>
        </motion.div>
      </AnimatePresence>
    </CheckoutLayout>
  )
}
