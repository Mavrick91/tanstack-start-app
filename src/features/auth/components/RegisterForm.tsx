import { useParams } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, ShieldCheck } from 'lucide-react'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'

import {
  FNForm,
  type FormDefinition,
  type FNFormRef,
} from '@/components/ui/fn-form'
import { useAuthRegister } from '@/hooks/useAuth'

const SUPPORTED_LANGS = ['en', 'fr', 'id'] as const
type SupportedLang = (typeof SUPPORTED_LANGS)[number]

const isValidLang = (lang: unknown): lang is SupportedLang =>
  typeof lang === 'string' && SUPPORTED_LANGS.includes(lang as SupportedLang)

export const RegisterForm = () => {
  const { t } = useTranslation()
  const params = useParams({ strict: false })
  const lang = isValidLang(params.lang) ? params.lang : 'en'
  const formRef = useRef<FNFormRef>(null)

  const registerMutation = useAuthRegister()

  const registerFormDefinition: FormDefinition = {
    fields: [
      {
        name: 'email',
        type: 'email',
        label: t('Email'),
        placeholder: t('you@example.com'),
        required: true,
        validateOnChange: true,
        validate: (value) => {
          const email = value as string
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (email && !emailRegex.test(email)) {
            return t('Please enter a valid email address')
          }
          return undefined
        },
      },
      {
        name: 'password',
        type: 'password',
        label: t('Password'),
        placeholder: '********',
        required: true,
        validate: (value) => {
          const password = value as string
          if (password.length < 8) {
            return t('Password must be at least 8 characters')
          }
          if (!/\d/.test(password)) {
            return t('Password must contain at least one number')
          }
          return undefined
        },
      },
      {
        name: 'confirmPassword',
        type: 'password',
        label: t('Confirm Password'),
        placeholder: '********',
        required: true,
        validate: (value) => {
          const password = formRef.current?.getFieldValue('password')
          if (value && password !== value) {
            return t('Passwords do not match')
          }
          return undefined
        },
      },
    ],
  }

  const handleSubmit = (values: Record<string, unknown>) => {
    const email = String(values.email)
    const password = String(values.password)
    registerMutation.mutate({ email, password, lang })
  }

  const getErrorMessage = () => {
    const error = registerMutation.error
    if (!error) return ''

    if (error instanceof Error) {
      return error.message
    }

    return t('Registration failed')
  }

  if (registerMutation.isSuccess) {
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
              'We sent you a verification link. Click the link to verify your email and access your account.',
            )}
          </p>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {registerMutation.error && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="rounded-lg bg-red-50 p-3 text-[11px] text-red-600 border border-red-200 font-medium"
          >
            {getErrorMessage()}
          </motion.div>
        )}
      </AnimatePresence>

      <FNForm
        formDefinition={registerFormDefinition}
        onSubmit={handleSubmit}
        submitButtonText={
          registerMutation.isPending
            ? t('Creating account...')
            : t('Create account')
        }
        formRef={formRef}
        className="space-y-4"
        submitButtonClassName="w-full"
      />

      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/40">
        <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          {t(
            'By creating an account, you agree to our Terms of Service and Privacy Policy.',
          )}
        </p>
      </div>
    </div>
  )
}
