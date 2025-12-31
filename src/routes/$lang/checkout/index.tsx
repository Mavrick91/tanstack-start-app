import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'

import { useCartStore } from '../../../hooks/useCart'
import { useCheckoutStore } from '../../../hooks/useCheckout'

const CheckoutIndexPage = () => {
  const { lang } = useParams({ strict: false }) as { lang: string }
  const navigate = useNavigate()
  const { checkoutId } = useCheckoutStore()
  const cartItems = useCartStore((state) => state.items)

  useEffect(() => {
    // If we have an existing checkout, go to information step
    if (checkoutId) {
      navigate({ to: '/$lang/checkout/information', params: { lang } })
      return
    }

    // If cart is empty, redirect to home
    if (cartItems.length === 0) {
      navigate({ to: '/$lang', params: { lang } })
      return
    }

    // Otherwise, redirect to information step (it will create checkout)
    navigate({ to: '/$lang/checkout/information', params: { lang } })
  }, [checkoutId, cartItems, navigate, lang])

  return (
    <div className="min-h-[100dvh] bg-white flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-gray-200" />
    </div>
  )
}

export const Route = createFileRoute('/$lang/checkout/')({
  component: CheckoutIndexPage,
})
