export const TEST_DATA = {
  admin: {
    email: 'marina.katili@gmail.com',
    password: 'Mavina91210!',
  },

  customer: {
    email: 'mavrick@realadvisor.com',
    firstName: 'Test',
    lastName: 'Customer',
  },

  registeredCustomer: {
    email: 'mavrick@realadvisor.com',
    password: 'TestPassword123!',
    firstName: 'Registered',
    lastName: 'User',
  },

  shippingAddress: {
    firstName: 'Test',
    lastName: 'Customer',
    address1: '123 Test Street',
    address2: 'Apt 4B',
    city: 'New York',
    province: 'NY',
    zip: '10001',
    countryCode: 'US',
    phone: '+1 (555) 123-4567',
  },

  internationalAddress: {
    firstName: 'François',
    lastName: 'Müller',
    address1: '42 Rue de Rivoli',
    city: 'Paris',
    province: 'Île-de-France',
    zip: '75001',
    countryCode: 'FR',
    phone: '+33 1 42 96 12 34',
  },

  stripe: {
    valid: '4242424242424242',
    declined: '4000000000000002',
    insufficientFunds: '4000000000009995',
    expired: '4000000000000069',
    incorrectCvc: '4000000000000127',
    requires3ds: '4000002500003155',
    expiryDate: '12/30',
    cvc: '123',
  },

  paypal: {
    sandboxBuyerEmail: process.env.PAYPAL_SANDBOX_BUYER_EMAIL || '',
    sandboxBuyerPassword: process.env.PAYPAL_SANDBOX_BUYER_PASSWORD || '',
  },

  urls: {
    home: '/en',
    products: '/en/products',
    checkout: '/en/checkout',
    checkoutInfo: '/en/checkout/information',
    checkoutShipping: '/en/checkout/shipping',
    checkoutPayment: '/en/checkout/payment',
    checkoutConfirmation: '/en/checkout/confirmation',
    adminLogin: '/admin/login',
    adminDashboard: '/admin',
  },

  freeShippingThreshold: 75,
}
