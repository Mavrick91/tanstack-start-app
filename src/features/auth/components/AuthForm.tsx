import { ForgotPasswordForm } from './ForgotPasswordForm'
import { GoogleButton } from './GoogleButton'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'
import { useAuthModal } from '../hooks/useAuthModal'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface AuthFormProps {
  defaultView?: 'login' | 'register'
}

export const AuthForm = ({ defaultView = 'login' }: AuthFormProps) => {
  const { view, setView, returnUrl } = useAuthModal()
  const currentView = view || defaultView

  if (currentView === 'forgot-password') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Reset Password</h2>
        </div>
        <ForgotPasswordForm />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs
        value={currentView}
        onValueChange={(value) => setView(value as 'login' | 'register')}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="register">Register</TabsTrigger>
        </TabsList>

        <TabsContent value="login" className="mt-6 space-y-6">
          <LoginForm />
        </TabsContent>

        <TabsContent value="register" className="mt-6 space-y-6">
          <RegisterForm />
        </TabsContent>
      </Tabs>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <GoogleButton returnUrl={returnUrl || undefined} />
    </div>
  )
}
