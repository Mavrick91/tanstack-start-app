import { describe, it, expect, vi, beforeEach } from 'vitest'

import { useUnsavedChanges } from './useUnsavedChanges'

import { renderHook, act } from '@/test/test-utils'

// Mock useBlocker before importing the hook
const mockProceed = vi.fn()
const mockReset = vi.fn()
const mockBlocker = {
  status: 'idle' as 'blocked' | 'idle',
  proceed: mockProceed,
  reset: mockReset,
}

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-router')>(
    '@tanstack/react-router',
  )
  return {
    ...actual,
    useBlocker: vi.fn(() => mockBlocker),
    useRouter: () => ({
      state: { status: 'idle' },
      navigate: vi.fn(),
    }),
  }
})

describe('useUnsavedChanges', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockBlocker.status = 'idle'
  })

  describe('Initialization', () => {
    it('returns idle status when not dirty', () => {
      const { result } = renderHook(() => useUnsavedChanges({ isDirty: false }))

      expect(result.current.status).toBe('idle')
    })

    it('provides proceed and reset functions', () => {
      const { result } = renderHook(() => useUnsavedChanges({ isDirty: false }))

      expect(typeof result.current.proceed).toBe('function')
      expect(typeof result.current.reset).toBe('function')
    })
  })

  describe('Navigation blocking', () => {
    it('returns blocked status when blocker is blocked', () => {
      mockBlocker.status = 'blocked'

      const { result } = renderHook(() => useUnsavedChanges({ isDirty: true }))

      expect(result.current.status).toBe('blocked')
    })

    it('calls blocker proceed when proceed is called', () => {
      const { result } = renderHook(() => useUnsavedChanges({ isDirty: true }))

      act(() => {
        result.current.proceed()
      })

      expect(mockProceed).toHaveBeenCalledTimes(1)
    })

    it('calls blocker reset when reset is called', () => {
      const { result } = renderHook(() => useUnsavedChanges({ isDirty: true }))

      act(() => {
        result.current.reset()
      })

      expect(mockReset).toHaveBeenCalledTimes(1)
    })
  })

  describe('Edge cases', () => {
    it('handles proceed when blocker proceed is undefined', async () => {
      const blockerWithoutProceed = {
        status: 'idle' as const,
        proceed: undefined,
        reset: undefined,
        current: undefined,
        next: undefined,
        action: undefined,
      }

      const router = await import('@tanstack/react-router')
      vi.mocked(router.useBlocker).mockReturnValueOnce(blockerWithoutProceed)

      const { result } = renderHook(() => useUnsavedChanges({ isDirty: true }))

      expect(() => {
        act(() => {
          result.current.proceed()
        })
      }).not.toThrow()
    })

    it('handles reset when blocker reset is undefined', async () => {
      const blockerWithoutReset = {
        status: 'idle' as const,
        proceed: undefined,
        reset: undefined,
        current: undefined,
        next: undefined,
        action: undefined,
      }

      const router = await import('@tanstack/react-router')
      vi.mocked(router.useBlocker).mockReturnValueOnce(blockerWithoutReset)

      const { result } = renderHook(() => useUnsavedChanges({ isDirty: true }))

      expect(() => {
        act(() => {
          result.current.reset()
        })
      }).not.toThrow()
    })
  })

  describe('State changes', () => {
    it('updates when isDirty changes from false to true', () => {
      const { result, rerender } = renderHook(
        ({ isDirty }) => useUnsavedChanges({ isDirty }),
        { initialProps: { isDirty: false } },
      )

      expect(result.current.status).toBe('idle')

      rerender({ isDirty: true })

      // Status is still determined by blocker
      expect(result.current.status).toBe('idle')
    })

    it('updates when isDirty changes from true to false', () => {
      mockBlocker.status = 'blocked'

      const { result, rerender } = renderHook(
        ({ isDirty }) => useUnsavedChanges({ isDirty }),
        { initialProps: { isDirty: true } },
      )

      expect(result.current.status).toBe('blocked')

      mockBlocker.status = 'idle'
      rerender({ isDirty: false })

      expect(result.current.status).toBe('idle')
    })
  })

  describe('Callback stability', () => {
    it('proceed callback remains stable across rerenders', () => {
      const { result, rerender } = renderHook(() =>
        useUnsavedChanges({ isDirty: true }),
      )

      const firstProceed = result.current.proceed

      rerender()

      expect(result.current.proceed).toBe(firstProceed)
    })

    it('reset callback remains stable across rerenders', () => {
      const { result, rerender } = renderHook(() =>
        useUnsavedChanges({ isDirty: true }),
      )

      const firstReset = result.current.reset

      rerender()

      expect(result.current.reset).toBe(firstReset)
    })
  })
})
