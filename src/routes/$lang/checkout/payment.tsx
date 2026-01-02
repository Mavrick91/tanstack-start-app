import { PayPalScriptProvider } from '@paypal/react-paypal-js'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import {
  createFileRoute,
  redirect,
  useNavigate,
  useParams,
  Link,
} from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, CreditCard, Loader2, Lock } from 'lucide-react'
import { useMemo, useState } from 'react'
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
import { useCheckout, useCompleteCheckout } from '../../../hooks/useCheckout'
import { clearCheckoutIdCookieClient } from '../../../lib/checkout-cookies.client'
import { formatCurrency } from '../../../lib/format'
import {
  getCheckoutIdFromCookieFn,
  validateCheckoutForRouteFn,
  createStripePaymentIntentFn,
} from '../../../server/checkout'

const CheckoutPaymentPage = () => {
  const { lang } = useParams({ strict: false }) as { lang: string }
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { checkoutId, serverCheckout, clientSecret, publishableKey } =
    Route.useRouteContext()

  const { data: checkout, isLoading: isLoadingCheckout } =
    useCheckout(checkoutId)
  const clearCart = useCartStore((s) => s.clearCart)

  const completeCheckoutMutation = useCompleteCheckout(checkoutId || '')

  const [paymentTab, setPaymentTab] = useState('card')

  // Initialize Stripe promise from server-provided publishable key
  const stripePromise = useMemo(() => {
    if (!publishableKey) return null
    return loadStripe(publishableKey)
  }, [publishableKey])

  // PayPal client ID from env
  const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || null

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
      clearCheckoutIdCookieClient()

      navigate({
        to: '/$lang/checkout/confirmation',
        params: { lang },
        search: {
          orderId: result.order!.id,
          orderNumber: result.order!.orderNumber,
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

  // Use serverCheckout for initial render, fall back to fetched checkout
  const displayCheckout = checkout || serverCheckout
  const isLoading = isLoadingCheckout && !displayCheckout

  if (isLoading || !displayCheckout) {
    return (
      <CheckoutLayout currentStep="payment">
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gray-200" />
        </div>
      </CheckoutLayout>
    )
  }

  const shippingAddress = displayCheckout.shippingAddress

  return (
    <CheckoutLayout
      currentStep="payment"
      total={formatCurrency({
        value: displayCheckout.total,
        currency: displayCheckout.currency,
      })}
      orderSummary={
        <OrderSummary
          items={displayCheckout.cartItems}
          subtotal={displayCheckout.subtotal}
          shippingTotal={displayCheckout.shippingTotal}
          total={displayCheckout.total}
          currency={displayCheckout.currency}
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
                  {displayCheckout.email}
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
                <span className="text-gray-900">
                  {displayCheckout.shippingMethod}
                </span>
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
                  <CreditCard className="w-4 h-4" />
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
                          currency: displayCheckout.currency,
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
          {completeCheckoutMutation.error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm"
            >
              {completeCheckoutMutation.error.message}
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

export const Route = createFileRoute('/$lang/checkout/payment')({
  beforeLoad: async ({ params }) => {
    // Try to get checkout ID from cookie (server-side)
    const { checkoutId } = await getCheckoutIdFromCookieFn()

    if (!checkoutId) {
      throw redirect({ to: '/$lang/checkout', params })
    }

    const result = await validateCheckoutForRouteFn({ data: { checkoutId } })

    if (!result.valid) {
      throw redirect({ to: '/$lang/checkout', params })
    }

    // Check if checkout has required shipping info for payment step
    if (!result.checkout?.shippingAddress || !result.checkout?.shippingRateId) {
      throw redirect({ to: '/$lang/checkout/information', params })
    }

    // Create payment intent on server (moves initialization out of useEffect)
    const paymentData = await createStripePaymentIntentFn({
      data: { checkoutId },
    })

    return {
      serverCheckout: result.checkout,
      checkoutId,
      clientSecret: paymentData.clientSecret,
      publishableKey: paymentData.publishableKey,
    }
  },
  component: CheckoutPaymentPage,
})
