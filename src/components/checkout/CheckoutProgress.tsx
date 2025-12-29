import { ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '../../lib/utils'

type Step = 'information' | 'shipping' | 'payment'

type CheckoutProgressProps = {
  currentStep: Step | 'confirmation'
}

const STEPS: Step[] = ['information', 'shipping', 'payment']

export function CheckoutProgress({ currentStep }: CheckoutProgressProps) {
  const { t } = useTranslation()

  const getStepIndex = (step: Step | 'confirmation') => {
    if (step === 'confirmation') return 3
    return STEPS.indexOf(step)
  }

  const currentIndex = getStepIndex(currentStep)

  const stepLabels: Record<Step, string> = {
    information: t('Information'),
    shipping: t('Shipping'),
    payment: t('Payment'),
  }

  return (
    <nav aria-label="Checkout progress">
      <ol className="flex items-center gap-2 text-sm">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentIndex
          const isCurrent = index === currentIndex

          return (
            <li key={step} className="flex items-center">
              <span
                className={cn(
                  'transition-colors',
                  isCurrent && 'text-gray-900 font-medium',
                  isCompleted && 'text-blue-600',
                  !isCurrent && !isCompleted && 'text-gray-400',
                )}
              >
                {stepLabels[step]}
              </span>
              {index < STEPS.length - 1 && (
                <ChevronRight className="w-4 h-4 mx-2 text-gray-300" />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
