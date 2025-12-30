import { cleanupTestData, closeConnection } from './helpers/db.helper'

async function globalSetup() {
  console.log('🧹 Cleaning up stale test data...')

  try {
    await cleanupTestData()
    console.log('✅ Test data cleanup complete')
  } catch (error) {
    console.error('⚠️ Test data cleanup failed:', error)
  } finally {
    await closeConnection()
  }
}

export default globalSetup
