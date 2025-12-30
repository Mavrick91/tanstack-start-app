export const TEST_DATA = {
  admin: {
    email: 'marina.katili@gmail.com',
    password: 'Mavina91210!',
  },

  customer: {
    email: 'test@playwright.dev',
    firstName: 'Test',
    lastName: 'Customer',
  },

  shippingAddress: {
    firstName: 'Test',
    lastName: 'Customer',
    address1: '123 Test Street',
    city: 'New York',
    province: 'NY',
    zip: '10001',
    countryCode: 'US',
    phone: '+1 (555) 123-4567',
  },

  stripe: {
    successCard: '4242424242424242',
    declinedCard: '4000000000000002',
    expiryDate: '12/30',
    cvc: '123',
  },

  urls: {
    adminLogin: '/admin/login',
    adminDashboard: '/admin',
    products: '/en/products',
    checkout: '/en/checkout',
    checkoutInfo: '/en/checkout/information',
    checkoutShipping: '/en/checkout/shipping',
    checkoutPayment: '/en/checkout/payment',
    checkoutConfirmation: '/en/checkout/confirmation',
  },
}
