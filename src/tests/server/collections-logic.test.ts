import * as server from '@tanstack/react-start/server'
import { describe, expect, it, vi, beforeEach, Mock } from 'vitest'

import { db } from '../../db'
import * as auth from '../../lib/auth'
import {
  createCollectionFn,
  updateCollectionFn,
  deleteCollectionFn,
  addProductsToCollectionFn,
  removeProductFromCollectionFn,
  reorderCollectionProductsFn,
  publishCollectionFn,
  unpublishCollectionFn,
  duplicateCollectionFn,
} from '../../server/collections'

// Type definitions for mocks
type MockReturnThis = ReturnType<typeof vi.fn> & { mockReturnThis: () => Mock }

interface ChainableMock {
  values: Mock
  returning?: Mock
  from?: Mock
  where?: Mock
  set?: Mock
}

// Mock dependencies
vi.mock('../../db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn((cb) =>
      cb({
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn().mockResolvedValue({}),
          })),
        })),
      }),
    ),
  },
}))

vi.mock('../../lib/auth')
vi.mock('@tanstack/react-start/server')
vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => ({
    middleware: () => ({
      inputValidator: () => ({
        handler: <T>(cb: T) => cb,
      }),
      handler: <T>(cb: T) => cb,
    }),
    inputValidator: () => ({
      handler: <T>(cb: T) => cb,
    }),
    handler: <T>(cb: T) => cb,
  }),
  createMiddleware: () => ({
    middleware: () => ({
      server: () => ({}),
    }),
    server: () => ({}),
  }),
}))

describe('Collections Logic Tests', () => {
  const mockUser = { id: 'user-1', role: 'admin' }
  const mockDate = new Date('2024-01-01T00:00:00Z')

  beforeEach(() => {
    vi.resetAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(mockDate)

    // Default successful auth
    vi.mocked(server.getRequest).mockReturnValue({} as Request)
    vi.mocked(auth.validateSession).mockResolvedValue({
      success: true,
      user: mockUser,
    } as Awaited<ReturnType<typeof auth.validateSession>>)
  })

  describe('createCollectionFn', () => {
    it('should create a collection with valid input', async () => {
      const input = {
        name: { en: 'New Collection' },
        handle: 'new-collection',
        description: { en: 'Desc' },
      }

      const mockCreated = { id: 'col-1', ...input }

      const insertMock: ChainableMock = {
        values: vi.fn().mockReturnThis() as MockReturnThis,
        returning: vi.fn().mockResolvedValue([mockCreated]),
      }
      vi.mocked(db.insert).mockReturnValue(
        insertMock as unknown as ReturnType<typeof db.insert>,
      )

      const result = await createCollectionFn({ data: input })

      expect(result).toEqual({ success: true, data: mockCreated })
      expect(insertMock.values).toHaveBeenCalledWith({
        name: input.name,
        handle: 'new-collection',
        description: input.description,
        sortOrder: 'manual',
        metaTitle: undefined,
        metaDescription: undefined,
      })
    })

    it('should normalize handle', async () => {
      const input = {
        name: { en: 'Name' },
        handle: '  My Handle  ',
      }

      const insertMock: ChainableMock = {
        values: vi.fn().mockReturnThis() as MockReturnThis,
        returning: vi.fn().mockResolvedValue([{ id: '1' }]),
      }
      vi.mocked(db.insert).mockReturnValue(
        insertMock as unknown as ReturnType<typeof db.insert>,
      )

      await createCollectionFn({ data: input })

      expect(insertMock.values).toHaveBeenCalledWith(
        expect.objectContaining({
          handle: 'my-handle',
        }),
      )
    })

    it('should throw error if name is empty', async () => {
      await expect(
        createCollectionFn({
          data: { name: { en: '  ' }, handle: 'h' },
        }),
        // Zod validation throws when en is empty/whitespace
      ).rejects.toThrow()
    })
  })

  describe('updateCollectionFn', () => {
    it('should update collection successfully', async () => {
      const updateData = { id: 'col-1', name: { en: 'Updated' } }
      const mockUpdated = { ...updateData }

      const updateMock: ChainableMock = {
        values: vi.fn(),
        set: vi.fn().mockReturnThis() as MockReturnThis,
        where: vi.fn().mockReturnThis() as MockReturnThis,
        returning: vi.fn().mockResolvedValue([mockUpdated]),
      }
      vi.mocked(db.update).mockReturnValue(
        updateMock as unknown as ReturnType<typeof db.update>,
      )

      const result = await updateCollectionFn({ data: updateData })

      expect(result).toEqual({ success: true, data: mockUpdated })
      expect(updateMock.set).toHaveBeenCalledWith({ name: { en: 'Updated' } })
    })

    it('should throw if collection not found', async () => {
      const updateMock: ChainableMock = {
        values: vi.fn(),
        set: vi.fn().mockReturnThis() as MockReturnThis,
        where: vi.fn().mockReturnThis() as MockReturnThis,
        returning: vi.fn().mockResolvedValue([]),
      }
      vi.mocked(db.update).mockReturnValue(
        updateMock as unknown as ReturnType<typeof db.update>,
      )

      try {
        await updateCollectionFn({
          data: { id: 'bad-id', handle: 'h' },
        })
        expect.fail('Expected to throw')
      } catch (e) {
        expect(e).toBeInstanceOf(Error)
        expect((e as Error).message).toBe('Collection not found')
      }
    })
  })

  describe('deleteCollectionFn', () => {
    it('should delete collection', async () => {
      const deleteMock: ChainableMock = {
        values: vi.fn(),
        where: vi.fn().mockReturnThis() as MockReturnThis,
        returning: vi.fn().mockResolvedValue([{ id: 'c1' }]),
      }
      vi.mocked(db.delete).mockReturnValue(
        deleteMock as unknown as ReturnType<typeof db.delete>,
      )

      const result = await deleteCollectionFn({ data: { id: 'c1' } })
      expect(result).toEqual({ success: true })
    })

    it('should throw if collection not found', async () => {
      const deleteMock: ChainableMock = {
        values: vi.fn(),
        where: vi.fn().mockReturnThis() as MockReturnThis,
        returning: vi.fn().mockResolvedValue([]),
      }
      vi.mocked(db.delete).mockReturnValue(
        deleteMock as unknown as ReturnType<typeof db.delete>,
      )

      try {
        await deleteCollectionFn({ data: { id: 'c1' } })
        expect.fail('Expected to throw')
      } catch (e) {
        expect(e).toBeInstanceOf(Error)
        expect((e as Error).message).toBe('Collection not found')
      }
    })
  })

  describe('addProductsToCollectionFn', () => {
    it('should add only new products with correct positions', async () => {
      // Mock max position query
      const selectMaxMock: ChainableMock = {
        values: vi.fn(),
        from: vi.fn().mockReturnThis() as MockReturnThis,
        where: vi.fn().mockResolvedValue([{ max: 10 }]), // Current max is 10
      }

      // Mock existing check query
      const selectExistingMock: ChainableMock = {
        values: vi.fn(),
        from: vi.fn().mockReturnThis() as MockReturnThis,
        where: vi.fn().mockResolvedValue([{ productId: 'p1' }]), // p1 already exists
      }

      // Setup chain for select calls (first call is maxPos, second is existing)
      vi.mocked(db.select)
        .mockReturnValueOnce(
          selectMaxMock as unknown as ReturnType<typeof db.select>,
        )
        .mockReturnValueOnce(
          selectExistingMock as unknown as ReturnType<typeof db.select>,
        )

      const insertMock: ChainableMock = {
        values: vi.fn().mockResolvedValue(undefined),
      }
      vi.mocked(db.insert).mockReturnValue(
        insertMock as unknown as ReturnType<typeof db.insert>,
      )

      const result = await addProductsToCollectionFn({
        data: { collectionId: 'c1', productIds: ['p1', 'p2', 'p3'] },
      })

      expect(result).toEqual({ success: true, added: 2 }) // p2 and p3 added

      // Should insert p2 at pos 11, p3 at pos 12
      expect(insertMock.values).toHaveBeenCalledWith([
        { collectionId: 'c1', productId: 'p2', position: 11 },
        { collectionId: 'c1', productId: 'p3', position: 12 },
      ])
    })

    it('should handle empty product list', async () => {
      const result = await addProductsToCollectionFn({
        data: { collectionId: 'c1', productIds: [] },
      })
      expect(result).toEqual({ success: true })
      expect(db.insert).not.toHaveBeenCalled()
    })
  })

  describe('removeProductFromCollectionFn', () => {
    it('should remove product', async () => {
      const deleteMock: ChainableMock = {
        values: vi.fn(),
        where: vi.fn().mockResolvedValue(undefined),
      }
      vi.mocked(db.delete).mockReturnValue(
        deleteMock as unknown as ReturnType<typeof db.delete>,
      )

      const result = await removeProductFromCollectionFn({
        data: { collectionId: 'c1', productId: 'p1' },
      })

      expect(result).toEqual({ success: true })
    })
  })

  describe('reorderCollectionProductsFn', () => {
    it('should update positions in transaction', async () => {
      const productIds = ['p1', 'p2', 'p3']
      const txUpdate = vi.fn().mockReturnThis()
      const txSet = vi.fn().mockReturnThis()
      const txWhere = vi.fn().mockResolvedValue({})

      // Mock transaction implementation
      vi.mocked(db.transaction).mockImplementation(async (cb) => {
        const tx = {
          update: txUpdate.mockReturnValue({
            set: txSet.mockReturnValue({
              where: txWhere,
            }),
          }),
        }
        return cb(tx as unknown as Parameters<typeof cb>[0])
      })

      await reorderCollectionProductsFn({
        data: { collectionId: 'c1', productIds },
      })

      expect(txSet).toHaveBeenCalledTimes(3)
      // Verify call order and values
      expect(txSet).toHaveBeenNthCalledWith(1, { position: 0 })
      expect(txSet).toHaveBeenNthCalledWith(2, { position: 1 })
      expect(txSet).toHaveBeenNthCalledWith(3, { position: 2 })
    })
  })

  describe('publish/unpublishCollectionFn', () => {
    it('should set publishedAt on publish', async () => {
      const updateMock: ChainableMock = {
        values: vi.fn(),
        set: vi.fn().mockReturnThis() as MockReturnThis,
        where: vi.fn().mockReturnThis() as MockReturnThis,
        returning: vi
          .fn()
          .mockResolvedValue([{ id: 'c1', publishedAt: mockDate }]),
      }
      vi.mocked(db.update).mockReturnValue(
        updateMock as unknown as ReturnType<typeof db.update>,
      )

      await publishCollectionFn({ data: { id: 'c1' } })

      expect(updateMock.set).toHaveBeenCalledWith({
        publishedAt: expect.any(Date),
      })
    })

    it('should set publishedAt to null on unpublish', async () => {
      const updateMock: ChainableMock = {
        values: vi.fn(),
        set: vi.fn().mockReturnThis() as MockReturnThis,
        where: vi.fn().mockReturnThis() as MockReturnThis,
        returning: vi.fn().mockResolvedValue([{ id: 'c1', publishedAt: null }]),
      }
      vi.mocked(db.update).mockReturnValue(
        updateMock as unknown as ReturnType<typeof db.update>,
      )

      await unpublishCollectionFn({ data: { id: 'c1' } })

      expect(updateMock.set).toHaveBeenCalledWith({ publishedAt: null })
    })
  })

  describe('duplicateCollectionFn', () => {
    it('should duplicate collection and products', async () => {
      const original = {
        id: 'c1',
        handle: 'my-col',
        name: { en: 'My Col' },
        description: { en: 'Desc' },
      }

      const products = [{ collectionId: 'c1', productId: 'p1', position: 0 }]
      const duplicated = { id: 'c2', handle: 'my-col-copy' }

      const selectCollectionMock: ChainableMock = {
        values: vi.fn(),
        from: vi.fn().mockReturnThis() as MockReturnThis,
        where: vi.fn().mockResolvedValue([original]),
      }

      // handle collision check mocks
      const selectHandleMock: ChainableMock = {
        values: vi.fn(),
        from: vi.fn().mockReturnThis() as MockReturnThis,
        where: vi.fn().mockResolvedValueOnce([]), // No collision
      }

      const selectProductsMock: ChainableMock = {
        values: vi.fn(),
        from: vi.fn().mockReturnThis() as MockReturnThis,
        where: vi.fn().mockResolvedValue(products),
      }

      vi.mocked(db.select)
        .mockReturnValueOnce(
          selectCollectionMock as unknown as ReturnType<typeof db.select>,
        )
        .mockReturnValueOnce(
          selectHandleMock as unknown as ReturnType<typeof db.select>,
        )
        .mockReturnValueOnce(
          selectProductsMock as unknown as ReturnType<typeof db.select>,
        )

      const insertMock: ChainableMock = {
        values: vi.fn().mockReturnThis() as MockReturnThis,
        returning: vi.fn().mockResolvedValue([duplicated]),
      }
      vi.mocked(db.insert).mockReturnValue(
        insertMock as unknown as ReturnType<typeof db.insert>,
      )

      const result = await duplicateCollectionFn({ data: { id: 'c1' } })

      expect(result).toEqual({ success: true, data: duplicated })
      expect(insertMock.values).toHaveBeenCalledTimes(2) // Once for col, once for products
    })
  })
})
