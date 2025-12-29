import { Link, useParams } from '@tanstack/react-router'
import { ArrowLeft, ChevronDown, ShoppingBag } from 'lucide-react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'

import { CheckoutProgress } from './CheckoutProgress'
import { cn } from '../../lib/utils'

type CheckoutLayoutProps = {
  children: React.ReactNode
  currentStep: 'information' | 'shipping' | 'payment' | 'confirmation'
  orderSummary?: React.ReactNode
  total?: string
  isFullWidth?: boolean
}

export function CheckoutLayout({
  children,
  currentStep,
  orderSummary,
  total,
  isFullWidth = false,
}: CheckoutLayoutProps) {
  const { lang } = useParams({ strict: false }) as { lang?: string }
  const currentLang = lang || 'en'
  const { t } = useTranslation()
  const [isSummaryExpanded, setIsSummaryExpanded] = React.useState(false)

  return (
    <div className="bg-white min-h-screen flex flex-col">
      {/* Mobile Summary Toggle - Sticky header */}
      {!isFullWidth && (
        <div className="lg:hidden sticky top-0 z-50 bg-white border-b shadow-sm">
          <button
            onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
            className="w-full px-4 py-3 flex items-center justify-between transition-colors hover:bg-gray-50/50"
          >
            <div className="flex items-center gap-2 text-sm">
              <ShoppingBag className="w-4 h-4 text-gray-500" />
              <span className="text-blue-600 font-medium">
                {isSummaryExpanded
                  ? t('Hide order summary')
                  : t('Show order summary')}
              </span>
              <ChevronDown
                className={cn(
                  'w-4 h-4 text-blue-600 transition-transform duration-300',
                  isSummaryExpanded && 'rotate-180',
                )}
              />
            </div>
            <span className="text-lg font-bold text-gray-900">{total}</span>
          </button>

          {isSummaryExpanded && (
            <div className="px-4 py-6 bg-gray-50 border-t max-h-[calc(100vh-100px)] overflow-y-auto animate-in slide-in-from-top duration-300">
              {orderSummary}
            </div>
          )}
        </div>
      )}

      <div
        className={cn(
          'flex-1 w-full flex flex-col mx-auto',
          isFullWidth ? 'max-w-4xl' : 'max-w-7xl',
        )}
      >
        <div
          className={cn(
            'grid flex-1',
            isFullWidth ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2',
          )}
        >
          {/* Main Checkout Section */}
          <div
            className={cn(
              'px-4 py-8 lg:py-12 flex flex-col',
              !isFullWidth && 'lg:px-12',
            )}
          >
            {/* Header / Logo */}
            <header className="mb-10 flex items-center justify-between">
              <Link
                to="/$lang"
                params={{ lang: currentLang }}
                className="inline-flex items-center gap-2 group"
              >
                <div className="w-9 h-9 rounded-xl bg-gray-900 flex items-center justify-center transition-transform group-hover:scale-105">
                  <ShoppingBag className="w-4.5 h-4.5 text-white" />
                </div>
                <span className="text-xl font-bold tracking-tight">
                  FineNail Season
                </span>
              </Link>

              <Link
                to="/$lang"
                params={{ lang: currentLang }}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors group"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                <span>{t('Return to store')}</span>
              </Link>
            </header>

            {/* Breadcrumb Steps */}
            {currentStep !== 'confirmation' && (
              <div className="mb-10">
                <CheckoutProgress currentStep={currentStep} />
              </div>
            )}

            {/* Content Area */}
            <main className="flex-1">{children}</main>

            {/* Footer */}
            <footer className="mt-16 pt-8 border-t">
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-gray-400 font-medium uppercase tracking-wider">
                <Link to="/" className="hover:text-gray-900 transition-colors">
                  {t('Refund policy')}
                </Link>
                <Link to="/" className="hover:text-gray-900 transition-colors">
                  {t('Shipping policy')}
                </Link>
                <Link to="/" className="hover:text-gray-900 transition-colors">
                  {t('Privacy policy')}
                </Link>
                <Link to="/" className="hover:text-gray-900 transition-colors">
                  {t('Terms of service')}
                </Link>
              </div>
            </footer>
          </div>

          {/* Desktop Sidebar Summary */}
          {!isFullWidth && (
            <aside className="hidden lg:block bg-gray-50 border-l relative">
              <div className="sticky top-0 h-screen px-12 py-12 overflow-y-auto">
                {orderSummary}
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  )
}
