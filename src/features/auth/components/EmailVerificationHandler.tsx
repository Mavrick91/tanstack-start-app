import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, Loader2, ArrowRight, Mail } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { AUTH_QUERY_KEY, useResendVerification } from '@/hooks/useAuth'
import { verifyEmailFn } from '@/server/auth-customer'

interface EmailVerificationHandlerProps {
  token: string
}

const SUPPORTED_LANGS = ['en', 'fr', 'id'] as const
type SupportedLang = (typeof SUPPORTED_LANGS)[number]

const isValidLang = (lang: unknown): lang is SupportedLang =>
  typeof lang === 'string' && SUPPORTED_LANGS.includes(lang as SupportedLang)

export const EmailVerificationHandler = ({
  token,
}: EmailVerificationHandlerProps) => {
  const { t } = useTranslation()
  const params = useParams({ strict: false })
  const lang = isValidLang(params.lang) ? params.lang : 'en'
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showResendForm, setShowResendForm] = useState(false)
  const [resendEmail, setResendEmail] = useState('')

  const verifyMutation = useMutation({
    mutationFn: () => verifyEmailFn({ data: { token } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY })
      await queryClient.invalidateQueries({ queryKey: ['customer', 'session'] })
    },
  })

  const resendMutation = useResendVerification()

  useEffect(() => {
    verifyMutation.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleContinue = () => {
    navigate({ to: `/${lang}/account` })
  }

  const handleResendSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await resendMutation.mutateAsync({ email: resendEmail, lang })
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 relative overflow-hidden">
      {/* Subtler Background blobs */}
      <div className="absolute top-1/4 -left-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, scale: 1 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center space-y-6">
          <AnimatePresence mode="wait">
            {verifyMutation.isPending && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="space-y-4"
              >
                <div className="relative mx-auto w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-4 border-primary/10" />
                  <Loader2 className="absolute inset-0 m-auto h-8 w-8 animate-spin text-primary" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-bold tracking-tight">
                    {t('Verifying your email address...')}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {t('Please wait while we verify your account')}
                  </p>
                </div>
              </motion.div>
            )}

            {verifyMutation.isSuccess && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-bold tracking-tight">
                    {t('Email verified! Welcome to FineNail')}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {t('Your account is now active')}
                  </p>
                </div>
                <Button
                  onClick={handleContinue}
                  className="w-full h-10 rounded-md font-bold"
                >
                  {t('Continue to your account')}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </motion.div>
            )}

            {verifyMutation.isError && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                  <XCircle className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-bold tracking-tight">
                    {t('Verification Failed')}
                  </h2>
                  <p className="text-[11px] text-destructive font-medium leading-relaxed">
                    {verifyMutation.error instanceof Error
                      ? verifyMutation.error.message
                      : t('Verification Failed')}
                  </p>
                </div>

                {!showResendForm && !resendMutation.isSuccess && (
                  <Button
                    onClick={() => setShowResendForm(true)}
                    variant="outline"
                    className="w-full h-10 rounded-md font-bold"
                  >
                    {t('Request new verification link')}
                  </Button>
                )}

                {showResendForm && !resendMutation.isSuccess && (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    onSubmit={handleResendSubmit}
                    className="space-y-4 text-left"
                  >
                    <div className="space-y-2">
                      <label
                        htmlFor="email"
                        className="text-sm font-bold text-foreground/70 uppercase tracking-widest ml-1"
                      >
                        {t('Email address')}
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                          type="email"
                          id="email"
                          value={resendEmail}
                          onChange={(e) => setResendEmail(e.target.value)}
                          required
                          className="w-full h-10 pl-10 pr-4 rounded-md border border-input bg-card text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
                          placeholder="you@example.com"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        type="submit"
                        className="flex-1 h-10 rounded-md font-bold"
                        disabled={resendMutation.isPending}
                      >
                        {resendMutation.isPending ? t('Sending...') : t('Send')}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setShowResendForm(false)}
                        className="h-10 rounded-md"
                      >
                        {t('Cancel')}
                      </Button>
                    </div>
                  </motion.form>
                )}

                {resendMutation.isSuccess && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-xl bg-primary/5 p-4 text-[11px] border border-primary/10 leading-relaxed text-center"
                  >
                    <CheckCircle2 className="w-4 h-4 text-primary mx-auto mb-2" />
                    {t(
                      'If an account exists, a verification email has been sent. Please check your inbox.',
                    )}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
