import { test as base } from '@playwright/test'
import { cleanupTestEmail } from '../helpers/db.helper'

/**
 * Test fixture that cleans up mavrick@realadvisor.com before each test
 * This ensures a clean state for every test, preventing data conflicts
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    // Clean up before test runs
    await cleanupTestEmail('mavrick@realadvisor.com')

    // Run the test
    await use(page)

    // Cleanup after test completes (optional - global teardown handles this)
    // Uncomment if you want per-test cleanup:
    // await cleanupTestEmail('mavrick@realadvisor.com')
  },
})

export { expect } from '@playwright/test'
