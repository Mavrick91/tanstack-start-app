import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Component } from 'react'

import { Button } from '../ui/button'

import type { ErrorInfo, ReactNode } from 'react'

type Props = {
  children: ReactNode
  fallbackMessage?: string
  onReset?: () => void
}

type State = {
  hasError: boolean
  error: Error | null
}

export class PaymentErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Payment component error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 rounded-lg border border-red-200 bg-red-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-red-800">Payment Error</h3>
              <p className="text-sm text-red-600 mt-1">
                {this.props.fallbackMessage ||
                  'Something went wrong with the payment form. Please try again.'}
              </p>
              {this.state.error && (
                <p className="text-xs text-red-500 mt-2 font-mono">
                  {this.state.error.message}
                </p>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleReset}
                className="mt-4 border-red-300 text-red-700 hover:bg-red-100"
                icon={<RefreshCw className="w-4 h-4" />}
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
