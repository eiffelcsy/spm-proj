import { vi } from 'vitest'

// Mock global objects that might be used in tests
global.definePageMeta = vi.fn()

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment the lines below if you want to suppress console output during tests
  // log: vi.fn(),
  // debug: vi.fn(),
  // info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

// Mock window object for browser APIs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn(cb => setTimeout(cb, 0))
global.cancelAnimationFrame = vi.fn(id => clearTimeout(id))

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mocked-url')
global.URL.revokeObjectURL = vi.fn()

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
global.localStorage = localStorageMock

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
global.sessionStorage = sessionStorageMock

// Mock fetch globally
global.fetch = vi.fn()

// Mock crypto for UUID generation if needed
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'mock-uuid'),
  },
})

// Setup for Vue Test Utils
import { config } from '@vue/test-utils'

// Global configuration for Vue Test Utils
config.global.stubs = {
  // Add any global stubs here if needed
}

// Mock Nuxt composables globally
vi.mock('#imports', () => ({
  useSupabaseUser: vi.fn(() => ref({ id: 'test-user-id' })),
  useSupabaseClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }))
    }))
  })),
  definePageMeta: vi.fn(),
  navigateTo: vi.fn(),
  useRoute: vi.fn(() => ({
    params: {},
    query: {},
    path: '/',
  })),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    go: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  })),
  useHead: vi.fn(),
  useSeoMeta: vi.fn(),
  useLazyFetch: vi.fn(),
  useFetch: vi.fn(),
  $fetch: vi.fn(),
}))

// Mock all UI components to prevent import resolution issues
const mockComponent = { template: '<div><slot /></div>' }

vi.mock('~/components/ui/input', () => ({
  Input: mockComponent
}))

vi.mock('~/components/ui/dialog', () => ({
  Dialog: mockComponent,
  DialogContent: mockComponent,
  DialogDescription: mockComponent,
  DialogFooter: mockComponent,
  DialogHeader: mockComponent,
  DialogTitle: mockComponent
}))

vi.mock('~/components/ui/button', () => ({
  Button: mockComponent
}))

vi.mock('~/components/ui/label', () => ({
  Label: mockComponent
}))

vi.mock('~/components/ui/select', () => ({
  Select: mockComponent,
  SelectContent: mockComponent,
  SelectItem: mockComponent,
  SelectTrigger: mockComponent,
  SelectValue: mockComponent
}))

vi.mock('~/components/ui/popover', () => ({
  Popover: mockComponent,
  PopoverContent: mockComponent,
  PopoverTrigger: mockComponent
}))

vi.mock('~/components/ui/calendar', () => ({
  Calendar: mockComponent
}))

vi.mock('~/components/ui/number-field', () => ({
  NumberField: mockComponent,
  NumberFieldContent: mockComponent,
  NumberFieldDecrement: mockComponent,
  NumberFieldIncrement: mockComponent,
  NumberFieldInput: mockComponent
}))

vi.mock('~/components/ui/textarea', () => ({
  Textarea: mockComponent
}))

vi.mock('~/components/ui/tags-input', () => ({
  TagsInput: mockComponent,
  TagsInputInput: mockComponent,
  TagsInputItem: mockComponent,
  TagsInputItemDelete: mockComponent,
  TagsInputItemText: mockComponent
}))

vi.mock('~/components/task-modals/assign-combobox', () => ({
  AssignCombobox: mockComponent
}))

vi.mock('@/lib/utils', () => ({
  cn: vi.fn((...classes) => classes.filter(Boolean).join(' '))
}))

// Import Vue's ref for the mock
import { ref } from 'vue'
