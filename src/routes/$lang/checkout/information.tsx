import {
  createFileRoute,
  useNavigate,
  useParams,
  Link,
} from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { AddressForm } from '../../../components/checkout/AddressForm'
import { CheckoutLayout } from '../../../components/checkout/CheckoutLayout'
import { OrderSummary } from '../../../components/checkout/OrderSummary'
import { Button } from '../../../components/ui/button'
import { Checkbox } from '../../../components/ui/checkbox'
import {
  FNForm,
  type FormDefinition,
  type FNFormRef,
} from '../../../components/ui/fn-form'
import { Label } from '../../../components/ui/label'
import { useCartStore } from '../../../hooks/useCart'
import {
  useCheckoutIdStore,
  useCheckout,
  useCreateCheckout,
  useSaveCustomerInfo,
  useSaveShippingAddress,
} from '../../../hooks/useCheckout'
import { formatCurrency } from '../../../lib/format'
import { getMeFn } from '../../../server/auth'
import {
  getCheckoutIdFromCookieFn,
  validateCheckoutForRouteFn,
} from '../../../server/checkout'

import type { AddressFormData } from '../../../lib/checkout-schemas'

const CheckoutInformationPage = () => {
  const { lang } = useParams({ strict: false }) as { lang: string }
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { isAuthenticated, serverCheckout } = Route.useRouteContext()

  // Initialize checkout ID from server (cookie) or Zustand
  const storedCheckoutId = useCheckoutIdStore((s) => s.checkoutId)
  const setCheckoutId = useCheckoutIdStore((s) => s.setCheckoutId)
  const checkoutId = serverCheckout?.id || storedCheckoutId

  const cartItems = useCartStore((s) => s.items)
  const clearCart = useCartStore((s) => s.clearCart)

  const {
    data: checkout,
    isLoading: isLoadingCheckout,
    error: checkoutError,
  } = useCheckout(checkoutId)
  const createCheckoutMutation = useCreateCheckout()
  const saveCustomerMutation = useSaveCustomerInfo(checkoutId || '')
  const saveAddressMutation = useSaveShippingAddress(checkoutId || '')

  const [saveAddress, setSaveAddress] = useState(false)
  const addressFormRef = useRef<{ submit: () => void } | null>(null)
  const emailFormRef = useRef<FNFormRef | null>(null)

  // Get email from server checkout or fetched checkout
  const initialEmail = serverCheckout?.email || checkout?.email || ''

  // Email form definition with dynamic default
  const emailFormDefinition: FormDefinition = {
    fields: [
      {
        name: 'email',
        type: 'email',
        label: t('Email'),
        placeholder: t('Email address'),
        required: true,
        inputClassName: 'h-11',
        validate: (value) => {
          const email = String(value || '')
          if (!email) return 'Email is required'
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!emailRegex.test(email)) return 'Invalid email format'
          return undefined
        },
      },
    ],
  }

  // Single initialization effect: sync Zustand and create checkout if needed
  useEffect(() => {
    // Sync Zustand with server-provided checkout ID
    if (serverCheckout?.id && serverCheckout.id !== storedCheckoutId) {
      setCheckoutId(serverCheckout.id)
    }

    // Create checkout if needed (cart is client-only, must be done here)
    const initCheckout = async () => {
      if (checkoutId) return

      if (cartItems.length === 0) {
        navigate({ to: '/$lang', params: { lang } })
        return
      }

      try {
        await createCheckoutMutation.mutateAsync(cartItems)
      } catch (err) {
        console.error('Failed to create checkout:', err)
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create checkout'
        if (errorMessage.includes('not found')) {
          clearCart()
        }
      }
    }

    if (!checkoutId) {
      initCheckout()
    }
  }, [
    serverCheckout?.id,
    storedCheckoutId,
    setCheckoutId,
    checkoutId,
    cartItems,
    clearCart,
    createCheckoutMutation,
    lang,
    navigate,
  ])

  const handleSubmit = async () => {
    if (!emailFormRef.current) return

    const email = String(emailFormRef.current.getValues().email || '')
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    // Trigger FNForm validation if invalid
    if (!email || !emailRegex.test(email)) {
      emailFormRef.current.submit()
      return
    }

    // Trigger address form submission
    if (addressFormRef.current) {
      addressFormRef.current.submit()
    }
  }

  const handleAddressSubmit = async (addressData: AddressFormData) => {
    if (!checkoutId || !emailFormRef.current) return

    const emailValue = String(emailFormRef.current.getValues().email || '')

    try {
      // Save customer info first
      await saveCustomerMutation.mutateAsync({
        email: emailValue,
      })

      // Then save address
      await saveAddressMutation.mutateAsync({
        ...addressData,
        saveAddress,
      })

      // Navigate to shipping
      navigate({ to: '/$lang/checkout/shipping', params: { lang } })
    } catch (err) {
      console.error('Failed to save information:', err)
      toast.error(
        err instanceof Error ? err.message : t('Failed to save information'),
      )
    }
  }

  const isLoading = isLoadingCheckout || createCheckoutMutation.isPending
  const isSubmitting =
    saveCustomerMutation.isPending || saveAddressMutation.isPending

  if (isLoading) {
    return (
      <CheckoutLayout currentStep="information">
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gray-200" />
        </div>
      </CheckoutLayout>
    )
  }

  if (checkoutError || createCheckoutMutation.error || !checkout) {
    const error = checkoutError || createCheckoutMutation.error
    return (
      <CheckoutLayout currentStep="information">
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <p className="text-red-500 font-medium">
            {error instanceof Error
              ? error.message
              : t('Failed to create checkout')}
          </p>
          <Button asChild variant="outline">
            <Link to="/$lang" params={{ lang }}>
              {t('Continue shopping')}
            </Link>
          </Button>
        </div>
      </CheckoutLayout>
    )
  }

  return (
    <CheckoutLayout
      currentStep="information"
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
          {/* Contact section */}
          <div className="space-y-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold">{t('Contact')}</h2>
              <Link
                to="/$lang"
                params={{ lang }}
                className="text-sm text-blue-600 hover:underline"
              >
                {t('Already have an account? Log in')}
              </Link>
            </div>

            <FNForm
              key={initialEmail} // Reset form when email changes
              formDefinition={emailFormDefinition}
              onSubmit={() => {}}
              defaultValues={{ email: initialEmail }}
              formRef={emailFormRef}
              hideSubmitButton
            />
          </div>

          {/* Shipping address section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">{t('Shipping address')}</h2>
            <AddressForm
              defaultValues={checkout.shippingAddress || undefined}
              onSubmit={handleAddressSubmit}
              formRef={addressFormRef}
            />

            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                id="saveAddress"
                checked={saveAddress}
                onCheckedChange={(checked) =>
                  setSaveAddress(checked as boolean)
                }
              />
              <Label
                htmlFor="saveAddress"
                className="text-sm text-gray-600 cursor-pointer"
              >
                {isAuthenticated
                  ? t('Save this address for future orders')
                  : t('Save this address when I create an account')}
              </Label>
            </div>
          </div>

          {/* Error display */}
          {(saveCustomerMutation.error || saveAddressMutation.error) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm"
            >
              {saveCustomerMutation.error?.message ||
                saveAddressMutation.error?.message}
            </motion.div>
          )}

          {/* Continue button */}
          <div className="pt-4">
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('Saving...')}
                </span>
              ) : (
                t('Continue to shipping')
              )}
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    </CheckoutLayout>
  )
}

export const Route = createFileRoute('/$lang/checkout/information')({
  beforeLoad: async () => {
    // Check auth status for route context
    const user = await getMeFn()
    const isAuthenticated = !!user

    // Try to get checkout ID from cookie (server-side)
    const { checkoutId } = await getCheckoutIdFromCookieFn()

    if (checkoutId) {
      const result = await validateCheckoutForRouteFn({ data: { checkoutId } })

      // If checkout is invalid/expired, let client-side create a new one
      if (!result.valid) {
        return { serverCheckout: null, isAuthenticated }
      }

      return { serverCheckout: result.checkout, isAuthenticated }
    }

    // No cookie - let client-side handle checkout creation
    // (Cart is in localStorage, not accessible on server)
    return { serverCheckout: null, isAuthenticated }
  },
  component: CheckoutInformationPage,
})
