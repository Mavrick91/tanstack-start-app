import { AlertTriangle, Loader2, XCircle, RefreshCw, Ban } from 'lucide-react'
import { useState } from 'react'

import { Button } from '../../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog'
import { Textarea } from '../../ui/textarea'
import { formatCurrency } from '../../../lib/format'

import type { PaymentStatus } from '../../../types/checkout'

interface OrderCancellationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (reason: string) => void
  orderNumber: number
  paymentStatus: PaymentStatus
  total: number
  currency: string
  isLoading?: boolean
}

export function OrderCancellationDialog({
  open,
  onOpenChange,
  onConfirm,
  orderNumber,
  paymentStatus,
  total,
  currency,
  isLoading = false,
}: OrderCancellationDialogProps) {
  const [reason, setReason] = useState('')

  const handleConfirm = () => {
    if (reason.trim()) {
      onConfirm(reason.trim())
    }
  }

  const handleClose = () => {
    setReason('')
    onOpenChange(false)
  }

  const getRefundMessage = () => {
    switch (paymentStatus) {
      case 'paid':
        return {
          icon: RefreshCw,
          message: `A refund of ${formatCurrency({ value: total, currency })} will be processed automatically.`,
          variant: 'warning' as const,
        }
      case 'refunded':
        return {
          icon: Ban,
          message: 'This order has already been refunded.',
          variant: 'info' as const,
        }
      case 'failed':
      case 'pending':
        return {
          icon: XCircle,
          message:
            paymentStatus === 'failed'
              ? 'No refund needed - payment failed.'
              : null,
          variant: 'info' as const,
        }
      default:
        return null
    }
  }

  const refundInfo = getRefundMessage()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogTitle>Cancel Order #{orderNumber}</DialogTitle>
              <DialogDescription>
                This action cannot be undone.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Refund information */}
          {refundInfo?.message && (
            <div
              className={`flex items-start gap-3 rounded-lg p-3 ${
                refundInfo.variant === 'warning'
                  ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              <refundInfo.icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{refundInfo.message}</p>
            </div>
          )}

          {/* Reason input */}
          <div className="space-y-2">
            <label
              htmlFor="cancellation-reason"
              className="text-sm font-medium"
            >
              Reason for cancellation{' '}
              <span className="text-destructive">*</span>
            </label>
            <Textarea
              id="cancellation-reason"
              placeholder="Enter reason for cancellation..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px]"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              This will be recorded in the order history.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Keep Order
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!reason.trim() || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cancelling...
              </>
            ) : (
              'Cancel Order'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
