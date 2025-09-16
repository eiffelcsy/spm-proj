import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    projects: [
      {
        plugins: [vue()],
        resolve: {
          alias: {
            '@': path.resolve(__dirname, './app'),
          },
        },
        test: {
          name: 'unit',
          include: ['test/{e2e,unit}/*.{test,spec}.ts'],
          environment: 'happy-dom',
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
