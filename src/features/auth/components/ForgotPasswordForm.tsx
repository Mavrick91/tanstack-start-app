import { useParams } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useAuthForgotPassword } from '../../../hooks/useAuth'
import { useAuthModal } from '../hooks/useAuthModal'

import { FNForm, type FormDefinition } from '@/components/ui/fn-form'

const SUPPORTED_LANGS = ['en', 'fr', 'id'] as const
type SupportedLang = (typeof SUPPORTED_LANGS)[number]

const isValidLang = (lang: unknown): lang is SupportedLang =>
  typeof lang === 'string' && SUPPORTED_LANGS.includes(lang as SupportedLang)

export const ForgotPasswordForm = () => {
  const { t } = useTranslation()
  const { setView } = useAuthModal()
  const params = useParams({ strict: false })
  const lang = isValidLang(params.lang) ? params.lang : 'en'

  const forgotPasswordMutation = useAuthForgotPassword()

  const forgotPasswordFormDefinition: FormDefinition = {
    fields: [
      {
        name: 'email',
        type: 'email',
        label: t('Email'),
        placeholder: t('you@example.com'),
        required: true,
      },
    ],
  }

  const handleSubmit = (values: Record<string, unknown>) => {
    forgotPasswordMutation.mutate({ email: String(values.email), lang })
  }

  if (forgotPasswordMutation.isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-4 py-4"
      >
        <div className="mx-auto w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-bold tracking-tight">
            {t('Check your email')}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed px-4">
            {t(
              'If an account exists with that email, we sent a password reset link.',
            )}
          </p>
        </div>
        <button
          onClick={() => setView('login')}
          className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline"
        >
          <ArrowLeft className="w-3 h-3" />
          {t('Back to login')}
        </button>
      </motion.div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t(
          "Enter your email address and we'll send you a link to reset your password.",
        )}
      </p>

      <AnimatePresence>
        {forgotPasswordMutation.error && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="rounded-lg bg-destructive/10 p-3 text-[11px] text-destructive border border-destructive/20 font-medium"
          >
            {forgotPasswordMutation.error instanceof Error
              ? forgotPasswordMutation.error.message
              : t('Failed to send reset link')}
          </motion.div>
        )}
      </AnimatePresence>

      <FNForm
        formDefinition={forgotPasswordFormDefinition}
        onSubmit={handleSubmit}
        submitButtonText={
          forgotPasswordMutation.isPending
            ? t('Sending...')
            : t('Send reset link')
        }
        className="space-y-4"
      />

      <div className="flex justify-center pt-2">
        <button
          type="button"
          className="inline-flex items-center gap-2 text-[10px] font-bold text-muted-foreground/70 hover:text-primary transition-colors uppercase tracking-widest"
          onClick={() => setView('login')}
        >
          <ArrowLeft className="w-3 h-3" />
          {t('Back to login')}
        </button>
      </div>
    </div>
  )
}
