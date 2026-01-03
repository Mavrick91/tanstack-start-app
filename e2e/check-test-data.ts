#!/usr/bin/env tsx
/**
 * Check what test data exists for mavrick@realadvisor.com
 * Run with: npx tsx e2e/check-test-data.ts
 */

import { drizzle } from 'drizzle-orm/postgres-js'
import { eq } from 'drizzle-orm'
import postgres from 'postgres'
import * as schema from '../src/db/schema'

const connectionString =
  process.env.DATABASE_URL ||
  'postgres://admin:password@localhost:5434/finenail_db'
const client = postgres(connectionString)
const db = drizzle(client, { schema })

async function checkTestData() {
  const email = 'mavrick@realadvisor.com'
  console.log(`🔍 Checking data for: ${email}\n`)

  try {
    // Check users
    const users = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
    console.log(`👤 Users: ${users.length}`)
    if (users.length > 0) {
      users.forEach((u) =>
        console.log(
          `   - ID: ${u.id}, Email: ${u.email}, Verified: ${u.emailVerified}`,
        ),
      )
    }

    // Check customers
    const customers = await db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.email, email))
    console.log(`\n🛍️  Customers: ${customers.length}`)
    if (customers.length > 0) {
      customers.forEach((c) =>
        console.log(
          `   - ID: ${c.id}, Name: ${c.firstName} ${c.lastName}, User ID: ${c.userId}`,
        ),
      )
    }

    // Check orders
    const orders = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.email, email))
    console.log(`\n📦 Orders: ${orders.length}`)
    if (orders.length > 0) {
      orders.forEach((o) =>
        console.log(`   - Order #${o.orderNumber}, Total: $${o.total}`),
      )
    }

    // Check checkouts
    const checkouts = await db
      .select()
      .from(schema.checkouts)
      .where(eq(schema.checkouts.email, email))
    console.log(`\n🛒 Checkouts: ${checkouts.length}`)
    if (checkouts.length > 0) {
      checkouts.forEach((c) =>
        console.log(
          `   - ID: ${c.id}, Total: $${c.total}, Completed: ${!!c.completedAt}`,
        ),
      )
    }

    const totalRecords =
      users.length + customers.length + orders.length + checkouts.length
    console.log(`\n📊 Total records: ${totalRecords}`)

    if (totalRecords === 0) {
      console.log('\n✨ Database is clean - no data for this email!')
    } else {
      console.log(
        '\n💡 Run cleanup with: npx tsx e2e/test-cleanup.ts',
      )
    }
  } catch (error) {
    console.error('❌ Error checking data:', error)
  } finally {
    await client.end()
    console.log('\n🔌 Database connection closed')
  }
}

checkTestData()
