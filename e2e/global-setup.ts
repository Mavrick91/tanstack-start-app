import {
  cleanupTestData,
  cleanupTestEmail,
  closeConnection,
} from './helpers/db.helper'

async function globalSetup() {
  console.log('\n🧹 [SETUP] Cleaning up stale test data...')

  try {
    // Clean up test-prefixed data (e2e-test-*)
    await cleanupTestData()
    console.log('✅ [SETUP] Test-prefixed data cleanup complete')

    // Clean up the specific test email (mavrick@realadvisor.com)
    console.log('🧹 [SETUP] Cleaning up test user: mavrick@realadvisor.com')
    const result = await cleanupTestEmail('mavrick@realadvisor.com')
    console.log(
      `✅ [SETUP] Deleted: ${result.deletedUsers} users, ${result.deletedCustomers} customers, ${result.deletedOrders} orders`,
    )
  } catch (error) {
    console.error('⚠️ [SETUP] Test data cleanup failed:', error)
  } finally {
    await closeConnection()
    console.log('🔌 [SETUP] Database connection closed\n')
  }
}

export default globalSetup
