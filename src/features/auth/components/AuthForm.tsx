import { motion, AnimatePresence } from 'framer-motion'
import { LogIn, UserPlus, Fingerprint, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ForgotPasswordForm } from './ForgotPasswordForm'
import { GoogleButton } from './GoogleButton'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'
import { useAuthModal } from '../hooks/useAuthModal'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface AuthFormProps {
  defaultView?: 'login' | 'register'
}

export const AuthForm = ({ defaultView = 'login' }: AuthFormProps) => {
  const { t } = useTranslation()
  const { view, setView, returnUrl } = useAuthModal()
  const currentView = view || defaultView

  const isForgotPassword = currentView === 'forgot-password'

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 20 : -20,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 20 : -20,
      opacity: 0,
    }),
  }

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Subtler Background Blobs */}
      <div className="absolute -top-6 -right-6 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />
      <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />

      <div className="relative p-0">
        {/* Header Section */}
        <div className="mb-6 text-center space-y-1">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mx-auto w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-3 shadow-sm"
          >
            <Fingerprint className="w-5 h-5" />
          </motion.div>
          <h2 className="text-2xl font-black tracking-tight text-foreground">
            {isForgotPassword
              ? t('Reset Password')
              : currentView === 'login'
                ? t('Welcome Back')
                : t('Create Account')}
          </h2>
          <p className="text-muted-foreground font-medium text-xs">
            {isForgotPassword
              ? t('Enter your email to receive a reset link')
              : currentView === 'login'
                ? t('Sign in to manage your orders and profile')
                : t('Join our community to start your journey')}
          </p>
        </div>

        {!isForgotPassword && (
          <Tabs
            value={currentView}
            onValueChange={(v) => setView(v as 'login' | 'register')}
            className="mb-6"
          >
            <TabsList className="grid w-full grid-cols-2 rounded-lg bg-muted/50 p-1 border border-border">
              <TabsTrigger
                value="login"
                className="rounded-md gap-2 font-semibold text-xs data-[state=active]:bg-background data-[state=active]:text-foreground"
              >
                <LogIn className="w-3.5 h-3.5" />
                {t('Login')}
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="rounded-md gap-2 font-semibold text-xs data-[state=active]:bg-background data-[state=active]:text-foreground"
              >
                <UserPlus className="w-3.5 h-3.5" />
                {t('Register')}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        <div className="relative min-h-[200px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial="enter"
              animate="center"
              exit="exit"
              variants={variants}
              transition={{
                x: { type: 'spring', stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              className="w-full"
            >
              {currentView === 'forgot-password' ? (
                <ForgotPasswordForm />
              ) : currentView === 'login' ? (
                <LoginForm />
              ) : (
                <RegisterForm />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {!isForgotPassword && (
          <div className="mt-6 space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-[9px] uppercase font-bold tracking-[0.2em]">
                <span className="bg-background px-4 text-muted-foreground/50">
                  {t('Or continue with')}
                </span>
              </div>
            </div>

            <GoogleButton returnUrl={returnUrl || undefined} />

            <div className="flex items-center justify-center gap-2 text-[10px] font-medium text-muted-foreground/60">
              <Sparkles className="w-3 h-3 text-primary/50" />
              <span>{t('Experience seamless shopping')}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
