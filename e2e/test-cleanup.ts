#!/usr/bin/env tsx
/**
 * Test script to verify cleanup functionality
 * Run with: npx tsx e2e/test-cleanup.ts
 */

import { cleanupTestEmail, closeConnection } from './helpers/db.helper'

async function testCleanup() {
  console.log('🧪 Testing cleanup for mavrick@realadvisor.com...\n')

  try {
    const result = await cleanupTestEmail('mavrick@realadvisor.com')

    console.log('✅ Cleanup completed successfully!')
    console.log(`   - Deleted ${result.deletedUsers} user(s)`)
    console.log(`   - Deleted ${result.deletedCustomers} customer(s)`)
    console.log(`   - Deleted ${result.deletedOrders} order(s)`)

    if (result.deletedUsers === 0 && result.deletedCustomers === 0 && result.deletedOrders === 0) {
      console.log('\n💡 No data found - this email is already clean!')
    }
  } catch (error) {
    console.error('❌ Cleanup failed:', error)
  } finally {
    await closeConnection()
    console.log('\n🔌 Database connection closed')
  }
}

testCleanup()
