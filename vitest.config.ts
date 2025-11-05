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
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
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
          include: ['test/{e2e,functional_tests}/**/*.{test,spec}.ts'],
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
