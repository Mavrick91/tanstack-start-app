import { cleanupTestEmail, closeConnection } from './helpers/db.helper'

async function globalTeardown() {
  console.log('\n🧹 [TEARDOWN] Cleaning up test user email: mavrick@realadvisor.com')

  try {
    // Clean up the specific test email used in E2E tests
    const result = await cleanupTestEmail('mavrick@realadvisor.com')
    console.log('✅ [TEARDOWN] Test email cleanup complete')
    console.log(`   Deleted: ${result.deletedUsers} users, ${result.deletedCustomers} customers, ${result.deletedOrders} orders\n`)
  } catch (error) {
    console.error('⚠️ [TEARDOWN] Test email cleanup failed:', error)
  } finally {
    await closeConnection()
    console.log('🔌 [TEARDOWN] Database connection closed\n')
  }
}

export default globalTeardown
