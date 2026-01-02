import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig, type Plugin } from 'vite'
import viteTsConfigPaths from 'vite-tsconfig-paths'

/**
 * CRITICAL: Server Module Stubbing Plugin
 *
 * DO NOT REMOVE OR MODIFY THIS PLUGIN without understanding the consequences.
 *
 * WHY THIS EXISTS:
 * ================
 * The `postgres` package uses Node.js `Buffer` which doesn't exist in browsers.
 * TanStack Start's file-based routing generates `routeTree.gen.ts` which imports ALL routes.
 * Some routes (checkout, admin) import hooks that eventually import `db/index.ts`.
 * This causes `postgres` to be bundled into the client, triggering "Buffer is not defined" errors.
 *
 * THE PROBLEM CHAIN:
 * routeTree.gen.ts → checkout routes → useCheckout → server/checkout.ts → db/index.ts → postgres → Buffer error
 *
 * WHY DYNAMIC IMPORTS DON'T FULLY SOLVE IT:
 * Even with dynamic imports in server functions, Vite's bundler still analyzes the import graph
 * and includes `postgres` in the client bundle during development.
 *
 * THE SOLUTION:
 * This plugin intercepts imports of `postgres` and `drizzle-orm/postgres-js` in client bundles only
 * (not SSR) and replaces them with no-op stubs. Server-side code (SSR) gets the real implementations.
 *
 * SYMPTOMS IF REMOVED:
 * - "Buffer is not defined" errors in browser console
 * - "Cannot read properties of undefined (reading 'parsers')" from drizzle
 * - Login and checkout pages fail to load or function
 *
 * RELATED FILES:
 * - src/db/index.ts - Database client initialization
 * - src/server/*.ts - Server functions using dynamic imports
 * - src/data/storefront.ts - Uses getDbContext() pattern for dynamic imports
 */
const stubServerModules = (): Plugin => ({
  name: 'stub-server-modules',
  enforce: 'pre',
  resolveId(id, _importer, options) {
    // Only stub in client bundle (not SSR)
    if (!options?.ssr) {
      if (id === 'postgres') {
        return { id: '\0virtual:postgres-stub', moduleSideEffects: false }
      }
      if (id === 'drizzle-orm/postgres-js') {
        return { id: '\0virtual:drizzle-stub', moduleSideEffects: false }
      }
      if (id === 'cloudinary') {
        return { id: '\0virtual:cloudinary-stub', moduleSideEffects: false }
      }
    }
    return null
  },
  load(id) {
    if (id === '\0virtual:postgres-stub') {
      // Return a stub with types.parsers that drizzle expects
      return `export default function postgres() {
        return {
          unsafe: () => ({}),
          types: { parsers: {} }
        }
      }`
    }
    if (id === '\0virtual:drizzle-stub') {
      // Return a no-op drizzle function for client
      return `export function drizzle() {
        return null
      }`
    }
    if (id === '\0virtual:cloudinary-stub') {
      // Return a stub for cloudinary - Node.js only library
      return `export const v2 = {
        config: () => {},
        uploader: { destroy: () => Promise.resolve() }
      }`
    }
    return null
  },
})

const config = defineConfig({
  plugins: [
    // Stub server-only modules for client
    stubServerModules(),
    // TanStack Start must come first to handle server functions properly
    tanstackStart(),
    devtools(),
    nitro(),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    viteReact(),
  ],
  optimizeDeps: {
    // Exclude server modules from pre-bundling so our plugin can handle them
    exclude: ['postgres', 'drizzle-orm/postgres-js', 'cloudinary'],
  },
})

export default config
