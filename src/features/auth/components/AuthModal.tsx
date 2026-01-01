import { AuthForm } from './AuthForm'
import { useAuthModal } from '../hooks/useAuthModal'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export const AuthModal = () => {
  const { isOpen, close, view } = useAuthModal()

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">
            {view === 'login'
              ? 'Login'
              : view === 'register'
                ? 'Create Account'
                : 'Reset Password'}
          </DialogTitle>
        </DialogHeader>
        <AuthForm />
      </DialogContent>
    </Dialog>
  )
}
