// Shared session helper for TanStack Start
// Uses dynamic import to prevent server code leaking to client

export type SessionUser = {
  userId: string
  email: string
  role: string
}

// Note: useSession here is TanStack Start's server session helper, not a React hook
export const getAppSession = async () => {
  const { useSession } = await import('@tanstack/react-start/server')
  // eslint-disable-next-line react-hooks/rules-of-hooks -- TanStack Start server session, not a React hook
  return useSession<SessionUser>({
    name: 'app-session',
    password: process.env.SESSION_SECRET!,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    },
  })
}
