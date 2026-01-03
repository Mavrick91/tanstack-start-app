import { useMutation } from '@tanstack/react-query'
import { useParams, Link } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  FNForm,
  type FormDefinition,
  type FNFormRef,
} from '@/components/ui/fn-form'
import { resetPasswordFn } from '@/server/auth-customer'

interface PasswordResetFormProps {
  token: string
}

const SUPPORTED_LANGS = ['en', 'fr', 'id'] as const
type SupportedLang = (typeof SUPPORTED_LANGS)[number]

const isValidLang = (lang: unknown): lang is SupportedLang =>
  typeof lang === 'string' && SUPPORTED_LANGS.includes(lang as SupportedLang)

export const PasswordResetForm = ({ token }: PasswordResetFormProps) => {
  const { t } = useTranslation()
  const params = useParams({ strict: false })
  const lang = isValidLang(params.lang) ? params.lang : 'en'
  const formRef = useRef<FNFormRef>(null)

  const resetMutation = useMutation({
    mutationFn: (password: string) =>
      resetPasswordFn({ data: { token, password } }),
  })

  const passwordResetFormDefinition: FormDefinition = {
    fields: [
      {
        name: 'password',
        type: 'password',
        label: t('New Password'),
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
      },
    ],
  }

  const handleFieldChange = (name: string, value: unknown) => {
    if (name === 'password' || name === 'confirmPassword') {
      const password =
        name === 'password' ? value : formRef.current?.getFieldValue('password')
      const confirmPassword =
        name === 'confirmPassword'
          ? value
          : formRef.current?.getFieldValue('confirmPassword')

      if (confirmPassword && password !== confirmPassword) {
        formRef.current?.setFieldError(
          'confirmPassword',
          t('Passwords do not match'),
        )
      } else if (confirmPassword) {
        formRef.current?.setFieldError('confirmPassword', '')
      }
    }
  }

  const handleSubmit = (values: Record<string, unknown>) => {
    const password = String(values.password)
    resetMutation.mutate(password)
  }

  if (resetMutation.isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-6 py-4"
      >
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight">
            {t('Password Reset Successful')}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t('Your password has been reset. You can now')}{' '}
            <Link
              to="/$lang/auth"
              params={{ lang }}
              className="font-bold text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
            >
              {t('log in')}
            </Link>{' '}
            {t('with your new password.')}
          </p>
        </div>
        <Button asChild className="w-full h-10 rounded-md font-bold">
          <Link to="/$lang/auth" params={{ lang }}>
            {t('Sign in')}
          </Link>
        </Button>
      </motion.div>
    )
  }

  return (
    <div className="w-full space-y-6">
      <AnimatePresence>
        {resetMutation.error && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive border border-destructive/20 font-medium"
          >
            {resetMutation.error instanceof Error
              ? resetMutation.error.message
              : t('Failed to reset password')}
          </motion.div>
        )}
      </AnimatePresence>

      <FNForm
        formDefinition={passwordResetFormDefinition}
        onSubmit={handleSubmit}
        submitButtonText={
          resetMutation.isPending ? t('Resetting...') : t('Reset Password')
        }
        formRef={formRef}
        onFieldChange={handleFieldChange}
        className="space-y-5"
      />
    </div>
  )
}
