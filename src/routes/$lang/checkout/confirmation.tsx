import { createFileRoute, useParams, Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { CheckCircle, Mail, Package } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { CheckoutLayout } from '../../../components/checkout/CheckoutLayout'
import { Button } from '../../../components/ui/button'

const searchSchema = z.object({
  orderId: z.string().optional(),
  orderNumber: z.coerce.number().optional(),
})

export const Route = createFileRoute('/$lang/checkout/confirmation')({
  validateSearch: searchSchema,
  component: CheckoutConfirmationPage,
})

function CheckoutConfirmationPage() {
  const { lang } = useParams({ strict: false }) as { lang: string }
  const { t } = useTranslation()
  const { orderNumber } = Route.useSearch()

  return (
    <CheckoutLayout currentStep="confirmation" isFullWidth>
      <div className="py-8 lg:py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-2xl border p-8 lg:p-12 text-center shadow-sm"
        >
          {/* Success icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="flex justify-center mb-8"
          >
            <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
          </motion.div>

          {/* Thank you message */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold text-gray-900 mb-3"
          >
            {t('Thank you for your order')}
          </motion.h1>

          {orderNumber && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-gray-500 font-medium text-lg mb-8"
            >
              {t('Order')} #{orderNumber}
            </motion.p>
          )}

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-gray-600 mb-10 max-w-md mx-auto leading-relaxed"
          >
            {t(
              "We've received your order and our team has begun processing it with care. You'll receive updates as it travels to you.",
            )}
          </motion.p>

          {/* Info cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10 text-left"
          >
            <div className="p-5 rounded-xl border bg-gray-50/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center">
                  <Mail className="w-4 h-4 text-gray-600" />
                </div>
                <h3 className="font-semibold text-gray-900">
                  {t('Order Confirmation')}
                </h3>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                {t(
                  'A confirmation email has been sent to your inbox with your order details.',
                )}
              </p>
            </div>

            <div className="p-5 rounded-xl border bg-gray-50/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center">
                  <Package className="w-4 h-4 text-gray-600" />
                </div>
                <h3 className="font-semibold text-gray-900">
                  {t('Shipping Updates')}
                </h3>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                {t(
                  "We'll notify you with tracking details once your order ships.",
                )}
              </p>
            </div>
          </motion.div>

          {/* Continue shopping */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <Button
              asChild
              className="h-12 px-8 bg-gray-900 hover:bg-black text-white rounded-xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Link to="/$lang/products" params={{ lang }}>
                {t('Continue shopping')}
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </CheckoutLayout>
  )
}
