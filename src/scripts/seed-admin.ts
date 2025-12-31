/* eslint-disable no-console */
import { hash } from 'bcrypt-ts'
import { eq } from 'drizzle-orm'

import { db } from '../db'
import { users } from '../db/schema'

const seed = async () => {
  console.log('🌱 Seeding admin user...')

  const email = 'marina.katili@gmail.com'
  const password = 'Mavina91210!'
  const hashedPassword = await hash(password, 10)

  try {
    // Check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))

    if (existingUser.length > 0) {
      console.log('⚠️  User already exists. Updating password...')
      await db
        .update(users)
        .set({ passwordHash: hashedPassword, role: 'admin' })
        .where(eq(users.email, email))
    } else {
      console.log('✨ Creating new admin user...')
      await db.insert(users).values({
        email,
        passwordHash: hashedPassword,
        role: 'admin',
      })
    }

    console.log('✅ Admin user seeded successfully!')
    console.log(`📧 Email: ${email}`)
    console.log(`🔑 Password: ${password}`)
  } catch (error) {
    console.error('❌ Error seeding user:', error)
    process.exit(1)
  }

  process.exit(0)
}

seed()
