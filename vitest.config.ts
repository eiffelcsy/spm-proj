import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html', 'lcov'],
      include: ['server/api/**/*.{js,ts}'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        '**/dist',
      ],
      all: true,
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    projects: [
      {
        plugins: [vue()],
        root: path.resolve(__dirname),
        resolve: {
          alias: {
            '@': path.resolve(__dirname, './app'),
            '~': path.resolve(__dirname, '.'),
            '#supabase/server': path.resolve(__dirname, './node_modules/@nuxtjs/supabase/dist/runtime/server/services'),
          },
        },
        test: {
          name: 'unit',
          include: ['test/unit/**/*.{test,spec}.ts', 'test/functional_tests/**/*.{test,spec}.ts', 'test/e2e/**/*.{test,spec}.ts', 'test/regression/**/*.{test,spec}.ts'],
          environment: 'happy-dom',
          setupFiles: ['./test/setup.ts'],
        },
      },
      await defineVitestProject({
        test: {
          name: 'nuxt',
          include: ['test/nuxt/*.{test,spec}.ts'],
          environment: 'nuxt',
          environmentOptions: {
            nuxt: {
              overrides: {
                modules: ['shadcn-nuxt', '@nuxt/test-utils/module']
              }
            }
          },
        },
      }),
    ],
  },
})
