import { getRequest } from '@tanstack/react-start/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { db } from '../../db'
import { validateSession } from '../../lib/auth'
import { createProductLogic, getProductsLogic } from '../../server/products'

vi.mock('../../db', () => ({
  db: {
    transaction: vi.fn(),
    select: vi.fn(),
  },
}))

vi.mock('../../lib/auth', () => ({
  validateSession: vi.fn(),
}))

vi.mock('@tanstack/react-start/server', () => ({
  getRequest: vi.fn(),
}))

describe('Product Logic Functions', () => {
  const mockRequest = new Request('http://localhost')

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(getRequest).mockReturnValue(mockRequest)
  })

  describe('createProductLogic', () => {
    it('should create a product successfully', async () => {
      vi.mocked(validateSession).mockResolvedValue({
        success: true,
        user: { id: 'u1', email: 'e@t.com', role: 'admin' },
      })

      const mockProduct = { id: 'p123' }
      const mockTx = {
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockProduct]),
      }

      vi.mocked(db.transaction).mockImplementation(async (cb) =>
        cb(mockTx as never),
      )

      const result = await createProductLogic({
        name: { en: 'Test' },
        handle: 'test',
        price: '10',
      })

      expect(result.success).toBe(true)
      expect(result.data.id).toBe('p123')
      expect(db.transaction).toHaveBeenCalled()
    })

    it('should throw if name is invalid', async () => {
      vi.mocked(validateSession).mockResolvedValue({
        success: true,
        user: { id: 'u1', email: 'e@t.com', role: 'admin' },
      })

      await expect(
        createProductLogic({ name: {} as { en: string }, handle: 'test' }),
      ).rejects.toThrow(/Name must be an object/)
    })

    it('should throw if unauthorized', async () => {
      vi.mocked(validateSession).mockResolvedValue({
        success: false,
        error: 'Unauthorized',
        status: 401,
      })

      await expect(
        createProductLogic({ name: { en: 'T' }, handle: 'h' }),
      ).rejects.toThrow('Unauthorized')
    })
  })

  describe('getProductsLogic', () => {
    it('should list products', async () => {
      vi.mocked(validateSession).mockResolvedValue({
        success: true,
        user: { id: 'u1', email: 'e@t.com', role: 'admin' },
      })

      const mockProducts = [{ id: '1', name: { en: 'P1' } }]
      const mockVariants = [{ price: '10', inventoryQuantity: 5 }]

      const mockSelectProd = {
        from: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockProducts),
      }

      const mockSelectVar = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockVariants),
      }

      vi.mocked(db.select).mockImplementation((fields) => {
        if (fields && 'id' in fields) return mockSelectProd as never
        if (fields && 'price' in fields) return mockSelectVar as never
        return {} as never
      })

      const result = await getProductsLogic()

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data[0].totalInventory).toBe(5)
    })
  })
})
