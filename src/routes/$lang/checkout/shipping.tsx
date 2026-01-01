import {
  createFileRoute,
  redirect,
  useNavigate,
  useParams,
  Link,
} from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { CheckoutLayout } from '../../../components/checkout/CheckoutLayout'
import { OrderSummary } from '../../../components/checkout/OrderSummary'
import { ShippingMethodSelector } from '../../../components/checkout/ShippingMethodSelector'
import { Button } from '../../../components/ui/button'
import {
  FNForm,
  type FormDefinition,
  type FNFormRef,
  type CustomFieldRenderProps,
} from '../../../components/ui/fn-form'
import {
  useCheckoutIdStore,
  useCheckout,
  useShippingRates,
  useSaveShippingMethod,
} from '../../../hooks/useCheckout'
import { formatCurrency } from '../../../lib/format'
import {
  getCheckoutIdFromCookieFn,
  validateCheckoutForRouteFn,
} from '../../../server/checkout'

const CheckoutShippingPage = () => {
  const { lang } = useParams({ strict: false }) as { lang: string }
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { serverCheckout } = Route.useRouteContext()

  // Initialize checkout ID from server (cookie) or Zustand
  const storedCheckoutId = useCheckoutIdStore((s) => s.checkoutId)
  const setCheckoutId = useCheckoutIdStore((s) => s.setCheckoutId)
  const checkoutId = serverCheckout?.id || storedCheckoutId

  // Sync Zustand with server-provided checkout ID
  useEffect(() => {
    if (serverCheckout?.id && serverCheckout.id !== storedCheckoutId) {
      setCheckoutId(serverCheckout.id)
    }
  }, [serverCheckout?.id, storedCheckoutId, setCheckoutId])

  const { data: checkout, isLoading: isLoadingCheckout } =
    useCheckout(checkoutId)
  const { data: shippingRates = [], isLoading: isLoadingRates } =
    useShippingRates(checkoutId)
  const saveShippingMutation = useSaveShippingMethod(checkoutId || '')
  const formRef = useRef<FNFormRef | null>(null)

  // Compute initial selected rate
  const initialRateId = useMemo(() => {
    if (checkout?.shippingRateId) return checkout.shippingRateId
    if (shippingRates.length > 0) return shippingRates[0].id
    return ''
  }, [checkout?.shippingRateId, shippingRates])

  // Redirect if no checkout
  if (!checkoutId) {
    navigate({ to: '/$lang/checkout', params: { lang } })
    return null
  }

  const handleSubmit = async (values: Record<string, unknown>) => {
    const shippingRateId = String(values.shippingRateId || '')

    if (!shippingRateId || !checkoutId) return

    try {
      await saveShippingMutation.mutateAsync(shippingRateId)
      navigate({ to: '/$lang/checkout/payment', params: { lang } })
    } catch (err) {
      console.error('Failed to save shipping method:', err)
      toast.error(
        err instanceof Error
          ? err.message
          : t('Failed to save shipping method'),
      )
    }
  }

  const isLoading = isLoadingCheckout || isLoadingRates

  if (isLoading || !checkout) {
    return (
      <CheckoutLayout currentStep="shipping">
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gray-200" />
        </div>
      </CheckoutLayout>
    )
  }

  const shippingAddress = checkout.shippingAddress

  const formDefinition: FormDefinition = {
    fields: [
      {
        name: 'shippingRateId',
        type: 'custom',
        label: t('Shipping method'),
        required: true,
        render: (props: CustomFieldRenderProps) =>
          shippingRates.length > 0 ? (
            <ShippingMethodSelector
              rates={shippingRates}
              selectedRateId={String(props.value ?? '')}
              onSelect={(rateId) => props.onChange(rateId)}
              currency={checkout.currency}
            />
          ) : (
            <div className="p-8 rounded-lg border bg-gray-50 text-gray-500 text-center">
              {t('No shipping options available')}
            </div>
          ),
      },
    ],
  }

  return (
    <CheckoutLayout
      currentStep="shipping"
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
          </div>

          {/* Shipping method form */}
          <FNForm
            formDefinition={formDefinition}
            onSubmit={handleSubmit}
            defaultValues={{ shippingRateId: initialRateId }}
            formRef={formRef}
            hideSubmitButton
          />

          {/* Error display */}
          {saveShippingMutation.error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm"
            >
              {saveShippingMutation.error.message}
            </motion.div>
          )}

          {/* Navigation buttons */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-4">
            <Link
              to="/$lang/checkout/information"
              params={{ lang }}
              className="flex items-center gap-1 text-blue-600 hover:underline text-sm"
            >
              <ChevronLeft className="w-4 h-4" />
              {t('Return to information')}
            </Link>

            <Button
              type="button"
              onClick={() => formRef.current?.submit()}
              disabled={saveShippingMutation.isPending}
              className="w-full sm:w-auto h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
            >
              {saveShippingMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('Saving...')}
                </span>
              ) : (
                t('Continue to payment')
              )}
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    </CheckoutLayout>
  )
}

export const Route = createFileRoute('/$lang/checkout/shipping')({
  beforeLoad: async ({ params }) => {
    // Try to get checkout ID from cookie (server-side)
    const { checkoutId } = await getCheckoutIdFromCookieFn()

    if (checkoutId) {
      const result = await validateCheckoutForRouteFn({ data: { checkoutId } })

      if (!result.valid) {
        throw redirect({ to: '/$lang/checkout', params })
      }

      // Shipping step requires email and shipping address from information step
      if (!result.checkout?.email || !result.checkout?.shippingAddress) {
        throw redirect({ to: '/$lang/checkout/information', params })
      }

      return { serverCheckout: result.checkout }
    }

    // No cookie - let client-side handle (localStorage fallback)
    return { serverCheckout: null }
  },
  component: CheckoutShippingPage,
})
