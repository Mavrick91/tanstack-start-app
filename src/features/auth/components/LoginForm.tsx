import { useNavigate, useParams } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'

import { useAuthLogin } from '../../../hooks/useAuth'
import { useAuthModal } from '../hooks/useAuthModal'

import { FNForm, type FormDefinition } from '@/components/ui/fn-form'

export const LoginForm = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { lang } = useParams({ from: '/$lang' })
  const loginMutation = useAuthLogin()
  const { close, setView } = useAuthModal()

  const loginFormDefinition: FormDefinition = {
    fields: [
      {
        name: 'email',
        type: 'email',
        label: t('Email'),
        placeholder: t('you@example.com'),
        required: true,
      },
      {
        name: 'password',
        type: 'password',
        label: t('Password'),
        placeholder: '********',
        required: true,
      },
    ],
  }

  const handleSubmit = (values: Record<string, unknown>) => {
    loginMutation.mutate(
      {
        email: String(values.email),
        password: String(values.password),
      },
      {
        onSuccess: () => {
          close()
          navigate({ to: '/$lang/account', params: { lang } })
        },
      },
    )
  }

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {loginMutation.error && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="rounded-lg bg-destructive/10 p-3 text-[11px] text-destructive border border-destructive/20 font-medium"
          >
            {loginMutation.error instanceof Error
              ? loginMutation.error.message
              : t('Login failed')}
          </motion.div>
        )}
      </AnimatePresence>

      <FNForm
        formDefinition={loginFormDefinition}
        onSubmit={handleSubmit}
        submitButtonText={
          loginMutation.isPending ? t('Signing in...') : t('Sign in')
        }
        className="space-y-4"
        submitButtonClassName="w-full"
      />

      <div className="flex justify-center pt-2">
        <button
          type="button"
          className="text-[10px] font-bold text-muted-foreground/70 hover:text-primary transition-colors uppercase tracking-widest"
          onClick={() => setView('forgot-password')}
        >
          {t('Forgot your password?')}
        </button>
      </div>
    </div>
  )
}
