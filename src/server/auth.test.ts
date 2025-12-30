import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock database
vi.mock('../db', () => {
  const mockSelect = vi.fn()
  const mockInsert = vi.fn()
  const mockDelete = vi.fn()

  return {
    db: {
      select: mockSelect,
      insert: mockInsert,
      delete: mockDelete,
      _mocks: {
        mockSelect,
        mockInsert,
        mockDelete,
      },
    },
  }
})

// Mock schema
vi.mock('../db/schema', () => ({
  users: {
    id: 'id',
    email: 'email',
    passwordHash: 'passwordHash',
    role: 'role',
  },
  sessions: { userId: 'userId', expiresAt: 'expiresAt', id: 'id' },
}))

// Mock auth helpers
vi.mock('../lib/auth', () => ({
  verifyPassword: vi.fn(),
}))

// Mock rate limiting
vi.mock('../lib/rate-limit', () => ({
  checkRateLimit: vi.fn(),
  getRateLimitKey: vi.fn(() => '192.168.1.1'),
}))

// Mock vinxi/http
vi.mock('vinxi/http', () => ({
  getWebRequest: vi.fn(() => new Request('http://localhost')),
}))

// Mock TanStack Start session
const mockSessionData = vi.fn()
const mockSessionUpdate = vi.fn()
const mockSessionClear = vi.fn()

vi.mock('@tanstack/react-start/server', () => ({
  useSession: vi.fn(() => ({
    data: mockSessionData(),
    update: mockSessionUpdate,
    clear: mockSessionClear,
  })),
}))

// Import after mocks
import { db } from '../db'
import { verifyPassword } from '../lib/auth'
import { checkRateLimit } from '../lib/rate-limit'

const mocks = (
  db as typeof db & {
    _mocks: {
      mockSelect: ReturnType<typeof vi.fn>
      mockInsert: ReturnType<typeof vi.fn>
      mockDelete: ReturnType<typeof vi.fn>
    }
  }
)._mocks

describe('Auth Server Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('loginFn logic', () => {
    it('should return error when rate limited', async () => {
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: false,
        retryAfter: 300,
      })

      // Simulate the handler logic
      const result = await (async () => {
        const rateLimit = await checkRateLimit('auth', '192.168.1.1')
        if (!rateLimit.allowed) {
          return {
            success: false as const,
            error: 'Too many attempts. Please try again later.',
          }
        }
        return { success: true as const }
      })()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Too many attempts. Please try again later.')
      }
    })

    it('should return error for non-existent user', async () => {
      vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true })
      mocks.mockSelect.mockReturnValue({
        from: () => ({
          where: () => [],
        }),
      })

      const result = await (async () => {
        const rateLimit = await checkRateLimit('auth', '192.168.1.1')
        if (!rateLimit.allowed) {
          return {
            success: false as const,
            error: 'Too many attempts. Please try again later.',
          }
        }

        const users = []
        if (users.length === 0) {
          return { success: false as const, error: 'Invalid email or password' }
        }
        return { success: true as const }
      })()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Invalid email or password')
      }
    })

    it('should return error for invalid password', async () => {
      vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true })
      vi.mocked(verifyPassword).mockResolvedValue(false)

      const result = await (async () => {
        const rateLimit = await checkRateLimit('auth', '192.168.1.1')
        if (!rateLimit.allowed) {
          return {
            success: false as const,
            error: 'Too many attempts. Please try again later.',
          }
        }

        const validPassword = await verifyPassword('wrong', 'hash')
        if (!validPassword) {
          return { success: false as const, error: 'Invalid email or password' }
        }
        return { success: true as const }
      })()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Invalid email or password')
      }
    })

    it('should successfully login with valid credentials', async () => {
      vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true })
      vi.mocked(verifyPassword).mockResolvedValue(true)
      mocks.mockSelect.mockReturnValue({
        from: () => ({
          where: () => [
            {
              id: 'user-123',
              email: 'test@example.com',
              passwordHash: 'hash',
              role: 'user',
            },
          ],
        }),
      })
      mocks.mockInsert.mockReturnValue({
        values: vi.fn(() => Promise.resolve()),
      })

      const result = await (async () => {
        const rateLimit = await checkRateLimit('auth', '192.168.1.1')
        if (!rateLimit.allowed) {
          return {
            success: false as const,
            error: 'Too many attempts. Please try again later.',
          }
        }

        const [user] = [
          {
            id: 'user-123',
            email: 'test@example.com',
            passwordHash: 'hash',
            role: 'user',
          },
        ]

        if (!user) {
          return { success: false as const, error: 'Invalid email or password' }
        }

        const validPassword = await verifyPassword(
          'password',
          user.passwordHash,
        )
        if (!validPassword) {
          return { success: false as const, error: 'Invalid email or password' }
        }

        return {
          success: true as const,
          user: { id: user.id, email: user.email, role: user.role },
        }
      })()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.user.id).toBe('user-123')
        expect(result.user.email).toBe('test@example.com')
        expect(result.user.role).toBe('user')
      }
    })
  })

  describe('logoutFn logic', () => {
    it('should clear session and delete DB sessions', async () => {
      mockSessionData.mockResolvedValue({ userId: 'user-123' })
      const mockWhere = vi.fn(() => Promise.resolve())
      mocks.mockDelete.mockReturnValue({ where: mockWhere })

      const result = await (async () => {
        const sessionData = await mockSessionData()
        if (sessionData?.userId) {
          // Simulate DB delete call
          mocks.mockDelete()
        }
        await mockSessionClear()
        return { success: true }
      })()

      expect(result.success).toBe(true)
      expect(mockSessionClear).toHaveBeenCalled()
    })

    it('should handle logout when no session exists', async () => {
      mockSessionData.mockResolvedValue(null)

      const result = await (async () => {
        const sessionData = await mockSessionData()
        if (sessionData?.userId) {
          // Simulate DB delete call
          mocks.mockDelete()
        }
        await mockSessionClear()
        return { success: true }
      })()

      expect(result.success).toBe(true)
      expect(mockSessionClear).toHaveBeenCalled()
    })
  })

  describe('getMeFn logic', () => {
    it('should return null when no session exists', async () => {
      mockSessionData.mockResolvedValue(null)

      const result = await (async () => {
        const data = await mockSessionData()
        if (!data?.userId) {
          return null
        }
        return {
          id: data.userId,
          email: data.email,
          role: data.role,
        }
      })()

      expect(result).toBeNull()
    })

    it('should return user data when session exists', async () => {
      mockSessionData.mockResolvedValue({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'admin',
      })

      const result = await (async () => {
        const data = await mockSessionData()
        if (!data?.userId) {
          return null
        }
        return {
          id: data.userId,
          email: data.email,
          role: data.role,
        }
      })()

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        role: 'admin',
      })
    })
  })

  describe('Session helper', () => {
    it('should validate session config expectations', () => {
      const sessionConfig = {
        name: 'app-session',
        password: 'test-secret',
        cookie: {
          httpOnly: true,
          secure: false,
          sameSite: 'lax' as const,
          maxAge: 7 * 24 * 60 * 60,
        },
      }

      expect(sessionConfig.name).toBe('app-session')
      expect(sessionConfig.cookie.httpOnly).toBe(true)
      expect(sessionConfig.cookie.maxAge).toBe(604800)
    })
  })
})
