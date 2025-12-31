import { createFileRoute, redirect } from '@tanstack/react-router'

// This route acts as a redirect intermediary to the checkout information step.
// Note: checkoutId and cart are stored in localStorage (client-only), so we
// cannot use beforeLoad for the redirect. The information page handles the
// actual checkout creation and empty cart detection.
export const Route = createFileRoute('/$lang/checkout/')({
  beforeLoad: ({ params }) => {
    // Always redirect to the information step - it handles checkout creation
    // and will redirect to home if cart is empty
    throw redirect({ to: '/$lang/checkout/information', params })
  },
})
