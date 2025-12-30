import { type Page } from '@playwright/test'

export class CartHelper {
  constructor(private page: Page) {}

  async clearCart() {
    await this.page.evaluate(() => {
      localStorage.removeItem('cart-storage')
    })
    await this.page.reload()
  }

  async addItemToCart(productId: string, variantId?: string) {
    await this.page.evaluate(
      ({ productId, variantId }) => {
        const storage = localStorage.getItem('cart-storage')
        const state = storage ? JSON.parse(storage) : { state: { items: [] } }

        const existingItem = state.state.items.find(
          (i: { productId: string; variantId?: string }) =>
            i.productId === productId && i.variantId === variantId
        )

        if (existingItem) {
          existingItem.quantity += 1
        } else {
          state.state.items.push({ productId, variantId, quantity: 1 })
        }

        localStorage.setItem('cart-storage', JSON.stringify(state))
      },
      { productId, variantId }
    )
  }

  async getCartItemCount(): Promise<number> {
    return this.page.evaluate(() => {
      const storage = localStorage.getItem('cart-storage')
      if (!storage) return 0
      const state = JSON.parse(storage)
      return state.state.items.reduce(
        (sum: number, item: { quantity: number }) => sum + item.quantity,
        0
      )
    })
  }
}
