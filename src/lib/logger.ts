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
export function logRequest(
  request: Request,
  response: Response,
  durationMs: number,
): void {
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
    console.error(JSON.stringify(log))
  } else if (response.status >= 400) {
    console.warn(JSON.stringify(log))
  } else {
    console.log(JSON.stringify(log))
  }
}

/**
 * Log an error
 */
export function logError(
  message: string,
  error: unknown,
  context?: Record<string, unknown>,
): void {
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
export function logWarning(
  message: string,
  context?: Record<string, unknown>,
): void {
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
export function logInfo(
  message: string,
  context?: Record<string, unknown>,
): void {
  const log = {
    timestamp: new Date().toISOString(),
    level: 'info',
    message,
    ...context,
  }

  console.log(JSON.stringify(log))
}

/**
 * Create a request timer for measuring duration
 */
export function createRequestTimer(): () => number {
  const start = performance.now()
  return () => Math.round(performance.now() - start)
}
