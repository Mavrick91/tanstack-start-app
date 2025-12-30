// Address factories
export {
  createAddress,
  createAddressInput,
  createCustomerAddress,
  addressVariants,
} from './address.factory'

// Checkout factories
export {
  createCartItem,
  createCheckout,
  checkoutVariants,
} from './checkout.factory'

// Order factories
export {
  createOrder,
  createOrderItem,
  createOrderListItem,
  createOrderList,
  orderVariants,
} from './order.factory'

// Product factories
export {
  createProduct,
  createProductVariant,
  createProductOption,
  createProductImage,
  createProductWithRelations,
  createProductList,
  productVariants,
} from './product.factory'

// Re-export types for convenience
export type { Product, ProductVariant, ProductOption, ProductImage, ProductWithRelations } from './product.factory'
