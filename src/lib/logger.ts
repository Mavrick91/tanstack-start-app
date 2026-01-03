export interface RequestLog {
  timestamp: string
  method: string
  path: string
  status: number
  duration: string
  ip: string
  userAgent?: string
}

/**
 * Log an API request
 */
export const logRequest = (
  request: Request,
  response: Response,
  durationMs: number,
) => {
  const url = new URL(request.url)

  const log: RequestLog = {
    timestamp: new Date().toISOString(),
    method: request.method,
    path: url.pathname,
    status: response.status,
    duration: `${durationMs}ms`,
    ip:
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown',
    userAgent: request.headers.get('user-agent') || undefined,
  }

  if (response.status >= 500) {
    // eslint-disable-next-line no-console
    console.error(JSON.stringify(log))
  } else if (response.status >= 400) {
    console.warn(JSON.stringify(log))
  } else {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(log))
  }
}

/**
 * Log an error
 */
export const logError = (
  message: string,
  error: unknown,
  context?: Record<string, unknown>,
) => {
  const log = {
    timestamp: new Date().toISOString(),
    level: 'error',
    message,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...context,
  }

  console.error(JSON.stringify(log))
}

/**
 * Log a warning
 */
export const logWarning = (
  message: string,
  context?: Record<string, unknown>,
) => {
  const log = {
    timestamp: new Date().toISOString(),
    level: 'warn',
    message,
    ...context,
  }

  console.warn(JSON.stringify(log))
}

/**
 * Log info
 */
export const logInfo = (message: string, context?: Record<string, unknown>) => {
  const log = {
    timestamp: new Date().toISOString(),
    level: 'info',
    message,
    ...context,
  }

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(log))
}

/**
 * Create a request timer for measuring duration
 */
export const createRequestTimer = () => {
  const start = performance.now()
  return () => Math.round(performance.now() - start)
}
