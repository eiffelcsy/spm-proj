import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import UsersPage from '@/pages/admin/users.vue'

// Mock Nuxt-specific functions globally
global.definePageMeta = vi.fn()

// Mock dependencies
vi.mock('#imports', () => ({
  useSupabaseUser: vi.fn(() => ref({ id: 'test-user-id' })),
  definePageMeta: vi.fn(),
}))

// Mock $fetch
const mockFetch = vi.fn()
global.$fetch = mockFetch as any

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: { template: '<button><slot /></button>' }
}))

vi.mock('@/components/ui/input', () => ({
  Input: { 
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue'],
    emits: ['update:modelValue']
  }
}))

vi.mock('@/components/ui/label', () => ({
  Label: { template: '<label><slot /></label>' }
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: { template: '<span><slot /></span>', props: ['variant', 'class'] }
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: { 
    template: '<div v-if="open"><slot /></div>',
    props: ['open'],
    emits: ['update:open']
  },
  DialogContent: { template: '<div><slot /></div>' },
  DialogDescription: { template: '<div><slot /></div>' },
  DialogFooter: { template: '<div><slot /></div>' },
  DialogHeader: { template: '<div><slot /></div>' },
  DialogTitle: { template: '<div><slot /></div>' }
}))

vi.mock('@/components/ui/select', () => ({
  Select: { 
    template: '<div><slot /></div>',
    props: ['modelValue'],
    emits: ['update:modelValue']
  },
  SelectContent: { template: '<div><slot /></div>' },
  SelectItem: { 
    template: '<div @click="$emit(\'select\', value)"><slot /></div>',
    props: ['value'],
    emits: ['select']
  },
  SelectTrigger: { template: '<div><slot /></div>' },
  SelectValue: { template: '<div><slot /></div>', props: ['placeholder'] }
}))

vi.mock('lucide-vue-next', () => ({
  MoreHorizontal: { template: '<span>MoreHorizontal</span>' },
  UserCog: { template: '<span>UserCog</span>' },
  Shield: { template: '<span>Shield</span>' },
  User: { template: '<span>User</span>' }
}))

describe('Admin Users Page', () => {
  const getMockUsers = () => [
    {
      id: 1,
      fullname: 'John Doe',
      email: 'john@example.com',
      contact_number: '1234567890',
      is_admin: true,
      is_manager: false,
      designation: 'Senior Developer',
      department: 'Engineering',
      user_id: 'user-1',
      created_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 2,
      fullname: 'Jane Smith',
      email: 'jane@example.com',
      contact_number: '0987654321',
      is_admin: false,
      is_manager: true,
      designation: 'Project Manager',
      department: 'Management',
      user_id: 'user-2',
      created_at: '2024-02-01T00:00:00Z'
    },
    {
      id: 3,
      fullname: 'Bob Johnson',
      email: 'bob@example.com',
      contact_number: null,
      is_admin: false,
      is_manager: false,
      designation: 'Developer',
      department: 'Engineering',
      user_id: 'user-3',
      created_at: '2024-03-01T00:00:00Z'
    }
  ]
  
  let mockUsers: ReturnType<typeof getMockUsers>

  beforeEach(() => {
    mockUsers = getMockUsers()
    mockFetch.mockResolvedValue(mockUsers)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Component Mounting and Initialization', () => {
    it('should mount successfully', () => {
      const wrapper = mount(UsersPage, {
        global: {
          stubs: {
            Button: true,
            Input: true,
            Label: true,
            Badge: true,
            Dialog: true,
            Select: true
          }
        }
      })
      expect(wrapper.exists()).toBe(true)
    })

    it('should display the page title', () => {
      const wrapper = mount(UsersPage, {
        global: {
          stubs: {
            Button: true,
            Input: true,
            Label: true,
            Badge: true,
            Dialog: true,
            Select: true
          }
        }
      })
      expect(wrapper.text()).toContain('User Management')
    })

    it('should fetch users on mount', async () => {
      mount(UsersPage, {
        global: {
          stubs: {
            Button: true,
            Input: true,
            Label: true,
            Badge: true,
            Dialog: true,
            Select: true
          }
        }
      })
      
      await flushPromises()
      
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/users')
    })
  })

  describe('Loading State', () => {
    it('should display loading message initially', () => {
      const wrapper = mount(UsersPage, {
        global: {
          stubs: {
            Button: true,
            Input: true,
            Label: true,
            Badge: true,
            Dialog: true,
            Select: true
          }
        }
      })
      
      expect(wrapper.text()).toContain('Loading users...')
    })

    it('should hide loading message after data is loaded', async () => {
      const wrapper = mount(UsersPage, {
        global: {
          stubs: {
            Button: true,
            Input: true,
            Label: true,
            Badge: true,
            Dialog: true,
            Select: true
          }
        }
      })
      
      await flushPromises()
      
      expect(wrapper.text()).not.toContain('Loading users...')
    })
  })

  describe('Error Handling', () => {
    it('should display error message on fetch failure', async () => {
      mockFetch.mockRejectedValueOnce({
        message: 'Network error',
        data: { statusMessage: 'Failed to fetch users' }
      })

      const wrapper = mount(UsersPage, {
        global: {
          stubs: {
            Button: true,
            Input: true,
            Label: true,
            Badge: true,
            Dialog: true,
            Select: true
          }
        }
      })
      
      await flushPromises()
      
      expect(wrapper.text()).toContain('Failed to fetch users')
    })

    it('should allow retry after error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const wrapper = mount(UsersPage, {
        global: {
          stubs: {
            Button: true,
            Input: true,
            Label: true,
            Badge: true,
            Dialog: true,
            Select: true
          }
        }
      })
      
      await flushPromises()
      
      // Reset mock to succeed
      mockFetch.mockResolvedValueOnce(mockUsers)
      
      // Find and click "Try again" button
      const tryAgainButton = wrapper.find('button.underline')
      await tryAgainButton.trigger('click')
      await flushPromises()
      
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('User List Display', () => {
    it('should display all users after loading', async () => {
      const wrapper = mount(UsersPage, {
        global: {
          stubs: {
            Button: true,
            Input: true,
            Label: true,
            Badge: true,
            Dialog: true,
            Select: true
          }
        }
      })
      
      await flushPromises()
      
      expect(wrapper.text()).toContain('John Doe')
      expect(wrapper.text()).toContain('Jane Smith')
      expect(wrapper.text()).toContain('Bob Johnson')
    })

    it('should display user details correctly', async () => {
      const wrapper = mount(UsersPage, {
        global: {
          stubs: {
            Button: true,
            Input: true,
            Label: true,
            Badge: true,
            Dialog: true,
            Select: true
          }
        }
      })
      
      await flushPromises()
      
      expect(wrapper.text()).toContain('john@example.com')
      expect(wrapper.text()).toContain('Senior Developer')
      expect(wrapper.text()).toContain('Engineering')
    })

    it('should display "—" for null values', async () => {
      const usersWithNull = [{
        id: 4,
        fullname: 'Test User',
        email: null,
        contact_number: null,
        is_admin: false,
        is_manager: false,
        designation: null,
        department: null,
        user_id: 'user-4',
        created_at: '2024-04-01T00:00:00Z'
      }]
      
      mockFetch.mockResolvedValueOnce(usersWithNull)
      
      const wrapper = mount(UsersPage, {
        global: {
          stubs: {
            Button: true,
            Input: true,
            Label: true,
            Badge: true,
            Dialog: true,
            Select: true
          }
        }
      })
      
      await flushPromises()
      
      const rows = wrapper.findAll('tbody tr')
      expect(rows.length).toBe(1)
      expect(wrapper.text()).toContain('—')
    })
  })

  describe('Search Functionality', () => {
    it('should filter users by name when searching', async () => {
      const wrapper = mount(UsersPage, {
        global: {
          stubs: {
            Button: true,
            Label: true,
            Badge: true,
            Dialog: true,
            Select: true
          }
        }
      })
      
      await flushPromises()
      
      // Update the search query directly via component vm
      wrapper.vm.searchQuery = 'Jane'
      await wrapper.vm.$nextTick()
      await flushPromises()
      
      const rows = wrapper.findAll('tbody tr')
      expect(rows.length).toBe(1) // Only Jane Smith
    })

    it('should be case-insensitive when searching', async () => {
      const wrapper = mount(UsersPage, {
        global: {
          stubs: {
            Button: true,
            Label: true,
            Badge: true,
            Dialog: true,
            Select: true
          }
        }
      })
      
      await flushPromises()
      
      // Update the search query directly via component vm
      wrapper.vm.searchQuery = 'jane'
      await wrapper.vm.$nextTick()
      await flushPromises()
      
      const rows = wrapper.findAll('tbody tr')
      expect(rows.length).toBe(1)
      expect(wrapper.text()).toContain('Jane Smith')
    })

    it('should display "no users found" message when search has no results', async () => {
      const wrapper = mount(UsersPage, {
        global: {
          stubs: {
            Button: true,
            Label: true,
            Badge: true,
            Dialog: true,
            Select: true
          }
        }
      })
      
      await flushPromises()
      
      // Update the search query directly via component vm
      wrapper.vm.searchQuery = 'nonexistent'
      await wrapper.vm.$nextTick()
      await flushPromises()
      
      const rows = wrapper.findAll('tbody tr')
      expect(rows.length).toBe(0)
      expect(wrapper.html()).toContain('No users found matching')
    })
  })

  describe('Role Filtering', () => {
    it('should filter admin users when admin role is selected', async () => {
      const wrapper = mount(UsersPage, {
        global: {
          stubs: {
            Button: true,
            Input: true,
            Label: true,
            Badge: true,
            Dialog: true,
            Select: true
          }
        }
      })
      
      await flushPromises()
      
      // Simulate selecting admin role
      wrapper.vm.selectedRole = 'admin'
      await flushPromises()
      
      const rows = wrapper.findAll('tbody tr')
      expect(rows.length).toBe(1) // Only John Doe
      expect(wrapper.text()).toContain('John Doe')
    })

    it('should filter manager users when manager role is selected', async () => {
      const wrapper = mount(UsersPage, {
        global: {
          stubs: {
            Button: true,
            Input: true,
            Label: true,
            Badge: true,
            Dialog: true,
            Select: true
          }
        }
      })
      
      await flushPromises()
      
      wrapper.vm.selectedRole = 'manager'
      await flushPromises()
      
      const rows = wrapper.findAll('tbody tr')
      expect(rows.length).toBe(1) // Only Jane Smith
      expect(wrapper.text()).toContain('Jane Smith')
    })

    it('should filter staff users when staff role is selected', async () => {
      const wrapper = mount(UsersPage, {
        global: {
          stubs: {
            Button: true,
            Input: true,
            Label: true,
            Badge: true,
            Dialog: true,
            Select: true
          }
        }
      })
      
      await flushPromises()
      
      wrapper.vm.selectedRole = 'staff'
      await flushPromises()
      
      const rows = wrapper.findAll('tbody tr')
      expect(rows.length).toBe(1) // Only Bob Johnson
      expect(wrapper.text()).toContain('Bob Johnson')
    })

    it('should display message when no users match selected role', async () => {
      mockFetch.mockResolvedValueOnce([])
      
      const wrapper = mount(UsersPage, {
        global: {
          stubs: {
            Button: true,
            Input: true,
            Label: true,
            Badge: true,
            Dialog: true,
            Select: true
          }
        }
      })
      
      await flushPromises()
      
      wrapper.vm.selectedRole = 'admin'
      await flushPromises()
      
      expect(wrapper.text()).toContain('No admin members found')
    })
  })

  describe('Sorting Functionality', () => {
    it('should sort users by name in ascending order', async () => {
      const wrapper = mount(UsersPage, {
        global: {
          stubs: {
            Button: true,
            Input: true,
            Label: true,
            Badge: true,
            Dialog: true,
            Select: true
          }
        }
      })
      
      await flushPromises()
      
      wrapper.vm.sortBy = 'name'
      wrapper.vm.sortOrder = 'asc'
      await flushPromises()
      
      const sortedUsers = wrapper.vm.filteredAndSortedUsers
      expect(sortedUsers[0].fullname).toBe('Bob Johnson')
      expect(sortedUsers[1].fullname).toBe('Jane Smith')
      expect(sortedUsers[2].fullname).toBe('John Doe')
    })

    it('should sort users by name in descending order', async () => {
      const wrapper = mount(UsersPage, {
        global: {
          stubs: {
            Button: true,
            Input: true,
            Label: true,
            Badge: true,
            Dialog: true,
            Select: true
          }
        }
      })
      
      await flushPromises()
      
      wrapper.vm.sortBy = 'name'
      wrapper.vm.sortOrder = 'desc'
      await flushPromises()
      
      const sortedUsers = wrapper.vm.filteredAndSortedUsers
      expect(sortedUsers[0].fullname).toBe('John Doe')
      expect(sortedUsers[1].fullname).toBe('Jane Smith')
      expect(sortedUsers[2].fullname).toBe('Bob Johnson')
    })

    it('should sort users by role', async () => {
      const wrapper = mount(UsersPage, {
        global: {
          stubs: {
            Button: true,
            Input: true,
            Label: true,
            Badge: true,
            Dialog: true,
            Select: true
          }
        }
      })
      
      await flushPromises()
      
      wrapper.vm.sortBy = 'role'
      wrapper.vm.sortOrder = 'desc'
      await flushPromises()
      
      const sortedUsers = wrapper.vm.filteredAndSortedUsers
      // Admin should be first (John), then Manager (Jane), then Staff (Bob)
      expect(sortedUsers[0].fullname).toBe('John Doe')
      expect(sortedUsers[1].fullname).toBe('Jane Smith')
      expect(sortedUsers[2].fullname).toBe('Bob Johnson')
    })

    it('should sort users by date', async () => {
      const wrapper = mount(UsersPage, {
        global: {
          stubs: {
            Button: true,
            Input: true,
            Label: true,
            Badge: true,
            Dialog: true,
            Select: true
          }
        }
      })
      
      await flushPromises()
      
      wrapper.vm.sortBy = 'date'
      wrapper.vm.sortOrder = 'asc'
      await flushPromises()
      
      const sortedUsers = wrapper.vm.filteredAndSortedUsers
      expect(sortedUsers[0].fullname).toBe('John Doe')
      expect(sortedUsers[1].fullname).toBe('Jane Smith')
      expect(sortedUsers[2].fullname).toBe('Bob Johnson')
    })

    it('should sort users by email', async () => {
      const wrapper = mount(UsersPage, {
        global: {
          stubs: {
            Button: true,
            Input: true,
            Label: true,
            Badge: true,
            Dialog: true,
            Select: true
          }
        }
      })
      
      await flushPromises()
      
      wrapper.vm.sortBy = 'email'
      wrapper.vm.sortOrder = 'asc'
      await flushPromises()
      
      const sortedUsers = wrapper.vm.filteredAndSortedUsers
      expect(sortedUsers[0].email).toBe('bob@example.com')
      expect(sortedUsers[1].email).toBe('jane@example.com')
      expect(sortedUsers[2].email).toBe('john@example.com')
    })
  })

  describe('Edit Modal', () => {
    it('should open edit modal when edit button is clicked', async () => {
      const wrapper = mount(UsersPage, {
        global: {
          stubs: {
            Button: true,
            Input: true,
            Label: true,
            Badge: true,
            Select: true
          }
        }
      })
      
      await flushPromises()
      
      const editingUser = mockUsers[0]
      
      // Simulate opening the edit modal
      await wrapper.vm.openEditModal(editingUser)
      await flushPromises()
      
      expect(wrapper.vm.isEditModalOpen).toBe(true)
      expect(wrapper.vm.editingUser.email).toBe(editingUser.email)
    })

    it('should close edit modal when cancel is clicked', async () => {
      const wrapper = mount(UsersPage, {
        global: {
          stubs: {
            Button: true,
            Input: true,
            Label: true,
            Badge: true,
            Dialog: true,
            Select: true
          }
        }
      })
      
      await flushPromises()
      
      wrapper.vm.openEditModal(mockUsers[0])
      await flushPromises()
      
      expect(wrapper.vm.isEditModalOpen).toBe(true)
      
      wrapper.vm.closeEditModal()
      await flushPromises()
      
      expect(wrapper.vm.isEditModalOpen).toBe(false)
    })

    it('should populate edit form with user data', async () => {
      const wrapper = mount(UsersPage, {
        global: {
          stubs: {
            Button: true,
            Input: true,
            Label: true,
            Badge: true,
            Dialog: true,
            Select: true
          }
        }
      })
      
      await flushPromises()
      
      const targetUser = mockUsers[0]
      wrapper.vm.openEditModal(targetUser)
      await flushPromises()
      
      expect(wrapper.vm.editingUser.email).toBe(targetUser.email)
      expect(wrapper.vm.editingUser.designation).toBe(targetUser.designation)
      expect(wrapper.vm.editingUser.department).toBe(targetUser.department)
    })
  })

  describe('User Update', () => {
    it('should update user successfully', async () => {
      const wrapper = mount(UsersPage, {
        global: {
          stubs: {
            Button: true,
            Input: true,
            Label: true,
            Badge: true,
            Dialog: true,
            Select: true
          }
        }
      })
      
      await flushPromises()
      
      // Clear initial fetch call
      mockFetch.mockClear()
      mockFetch.mockResolvedValueOnce({ success: true })
      
      const userToEdit = mockUsers[0]
      wrapper.vm.openEditModal(userToEdit)
      wrapper.vm.editingUser.fullname = 'John Updated'
      
      await wrapper.vm.performUserUpdate()
      await flushPromises()
      
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/admin/users/${userToEdit.id}`,
        expect.objectContaining({
          method: 'PUT'
        })
      )
    })

    it('should handle update errors', async () => {
      const wrapper = mount(UsersPage, {
        global: {
          stubs: {
            Button: true,
            Input: true,
            Label: true,
            Badge: true,
            Dialog: true,
            Select: true
          }
        }
      })
      
      await flushPromises()
      
      // Clear initial fetch and mock error
      mockFetch.mockClear()
      mockFetch.mockRejectedValueOnce({
        message: 'Update failed',
        data: { statusMessage: 'Unauthorized' }
      })
      
      wrapper.vm.openEditModal(mockUsers[0])
      
      await wrapper.vm.performUserUpdate()
      await flushPromises()
      
      expect(wrapper.vm.updateError).toContain('Unauthorized')
    })

    it('should show confirmation dialog when role changes', async () => {
      const wrapper = mount(UsersPage, {
        global: {
          stubs: {
            Button: true,
            Input: true,
            Label: true,
            Badge: true,
            Dialog: true,
            Select: true
          }
        }
      })
      
      await flushPromises()
      
      const staffUser = mockUsers[2] // Bob Johnson (staff)
      wrapper.vm.openEditModal(staffUser)
      await flushPromises()
      
      // Change role
      wrapper.vm.setAdmin(wrapper.vm.editingUser, true)
      
      await wrapper.vm.updateUser()
      await flushPromises()
      
      expect(wrapper.vm.isRoleConfirmOpen).toBe(true)
    })

    it('should not show confirmation dialog when role does not change', async () => {
      mockFetch.mockResolvedValueOnce({ success: true })
      
      const wrapper = mount(UsersPage, {
        global: {
          stubs: {
            Button: true,
            Input: true,
            Label: true,
            Badge: true,
            Dialog: true,
            Select: true
          }
        }
      })
      
      await flushPromises()
      
      wrapper.vm.openEditModal(mockUsers[0])
      wrapper.vm.editingUser.fullname = 'John Updated'
      
      await wrapper.vm.updateUser()
      await flushPromises()
      
      expect(wrapper.vm.isRoleConfirmOpen).toBe(false)
    })
  })

  describe('Role Change Confirmation', () => {
    it('should confirm role change and update user', async () => {
      const wrapper = mount(UsersPage, {
        global: {
          stubs: {
            Button: true,
            Input: true,
            Label: true,
            Badge: true,
            Dialog: true,
            Select: true
          }
        }
      })
      
      await flushPromises()
      
      // Clear fetch and mock success
      mockFetch.mockClear()
      mockFetch.mockResolvedValueOnce({ success: true })
      
      const staffUser = mockUsers[2] // Bob Johnson
      wrapper.vm.openEditModal(staffUser)
      await flushPromises()
      
      wrapper.vm.setAdmin(wrapper.vm.editingUser, true)
      
      await wrapper.vm.updateUser()
      await flushPromises()
      
      expect(wrapper.vm.isRoleConfirmOpen).toBe(true)
      
      await wrapper.vm.confirmRoleChange()
      await flushPromises()
      
      expect(wrapper.vm.isRoleConfirmOpen).toBe(false)
      expect(wrapper.vm.isSuccessOpen).toBe(true)
    })

    it('should cancel role change and revert to original', async () => {
      const wrapper = mount(UsersPage, {
        global: {
          stubs: {
            Button: true,
            Input: true,
            Label: true,
            Badge: true,
            Dialog: true,
            Select: true
          }
        }
      })
      
      await flushPromises()
      
      const staffUser = mockUsers[2] // Bob Johnson (staff)
      wrapper.vm.openEditModal(staffUser)
      await flushPromises()
      
      wrapper.vm.setAdmin(wrapper.vm.editingUser, true)
      
      await wrapper.vm.updateUser()
      await flushPromises()
      
      expect(wrapper.vm.isRoleConfirmOpen).toBe(true)
      
      wrapper.vm.cancelRoleChange()
      await flushPromises()
      
      expect(wrapper.vm.isRoleConfirmOpen).toBe(false)
      expect(wrapper.vm.hasAdmin(wrapper.vm.editingUser)).toBe(false)
      expect(wrapper.vm.isEditModalOpen).toBe(true)
    })
  })

  describe('Helper Functions', () => {
    it('should correctly identify admin users with hasAdmin', async () => {
      const wrapper = mount(UsersPage, {
        global: {
          stubs: {
            Button: true,
            Input: true,
            Label: true,
            Badge: true,
            Dialog: true,
            Select: true
          }
        }
      })
      
      await flushPromises()
      
      expect(wrapper.vm.hasAdmin(mockUsers[0])).toBe(true)
      expect(wrapper.vm.hasAdmin(mockUsers[1])).toBe(false)
    })

    it('should correctly identify manager users with hasManager', async () => {
      const wrapper = mount(UsersPage, {
        global: {
          stubs: {
            Button: true,
            Input: true,
            Label: true,
            Badge: true,
            Dialog: true,
            Select: true
          }
        }
      })
      
      await flushPromises()
      
      expect(wrapper.vm.hasManager(mockUsers[1])).toBe(true)
      expect(wrapper.vm.hasManager(mockUsers[2])).toBe(false)
    })

    it('should display correct roles with displayRoles', async () => {
      const wrapper = mount(UsersPage, {
        global: {
          stubs: {
            Button: true,
            Input: true,
            Label: true,
            Badge: true,
            Dialog: true,
            Select: true
          }
        }
      })
      
      await flushPromises()
      
      expect(wrapper.vm.displayRoles(mockUsers[0])).toEqual(['admin'])
      expect(wrapper.vm.displayRoles(mockUsers[1])).toEqual(['manager'])
      expect(wrapper.vm.displayRoles(mockUsers[2])).toEqual(['staff'])
    })

    it('should display multiple roles for users with multiple roles', async () => {
      const multiRoleUser = {
        ...mockUsers[0],
        is_admin: true,
        is_manager: true
      }
      
      const wrapper = mount(UsersPage, {
        global: {
          stubs: {
            Button: true,
            Input: true,
            Label: true,
            Badge: true,
            Dialog: true,
            Select: true
          }
        }
      })
      
      const roles = wrapper.vm.displayRoles(multiRoleUser)
      expect(roles).toContain('admin')
      expect(roles).toContain('manager')
    })

    it('should correctly convert various boolean values with toBoolean', async () => {
      const wrapper = mount(UsersPage, {
        global: {
          stubs: {
            Button: true,
            Input: true,
            Label: true,
            Badge: true,
            Dialog: true,
            Select: true
          }
        }
      })
      
      expect(wrapper.vm.toBoolean(true)).toBe(true)
      expect(wrapper.vm.toBoolean(false)).toBe(false)
      expect(wrapper.vm.toBoolean(1)).toBe(true)
      expect(wrapper.vm.toBoolean(0)).toBe(false)
      expect(wrapper.vm.toBoolean('true')).toBe(true)
      expect(wrapper.vm.toBoolean('false')).toBe(false)
      expect(wrapper.vm.toBoolean('1')).toBe(true)
      expect(wrapper.vm.toBoolean('yes')).toBe(true)
      expect(wrapper.vm.toBoolean('y')).toBe(true)
    })

    it('should set admin role with setAdmin', async () => {
      const wrapper = mount(UsersPage, {
        global: {
          stubs: {
            Button: true,
            Input: true,
            Label: true,
            Badge: true,
            Dialog: true,
            Select: true
          }
        }
      })
      
      const user = { is_admin: false }
      wrapper.vm.setAdmin(user, true)
      expect(user.is_admin).toBe(true)
      
      wrapper.vm.setAdmin(user, false)
      expect(user.is_admin).toBe(false)
    })

    it('should set manager role with setManager', async () => {
      const wrapper = mount(UsersPage, {
        global: {
          stubs: {
            Button: true,
            Input: true,
            Label: true,
            Badge: true,
            Dialog: true,
            Select: true
          }
        }
      })
      
      const user = { is_manager: false }
      wrapper.vm.setManager(user, true)
      expect(user.is_manager).toBe(true)
      
      wrapper.vm.setManager(user, false)
      expect(user.is_manager).toBe(false)
    })
  })

  describe('Refresh Functionality', () => {
    it('should refetch users when refresh button is clicked', async () => {
      const wrapper = mount(UsersPage, {
        global: {
          stubs: {
            Button: true,
            Input: true,
            Label: true,
            Badge: true,
            Dialog: true,
            Select: true
          }
        }
      })
      
      await flushPromises()
      
      expect(mockFetch).toHaveBeenCalledTimes(1)
      
      await wrapper.vm.fetchUsers()
      await flushPromises()
      
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('Combined Filtering and Sorting', () => {
    it('should apply both search and role filter together', async () => {
      const wrapper = mount(UsersPage, {
        global: {
          stubs: {
            Button: true,
            Input: true,
            Label: true,
            Badge: true,
            Dialog: true,
            Select: true
          }
        }
      })
      
      await flushPromises()
      
      wrapper.vm.searchQuery = 'john'
      wrapper.vm.selectedRole = 'admin'
      await flushPromises()
      
      const filtered = wrapper.vm.filteredAndSortedUsers
      expect(filtered.length).toBe(1)
      expect(filtered[0].fullname).toBe('John Doe')
    })

    it('should apply search, filter, and sort together', async () => {
      const wrapper = mount(UsersPage, {
        global: {
          stubs: {
            Button: true,
            Input: true,
            Label: true,
            Badge: true,
            Dialog: true,
            Select: true
          }
        }
      })
      
      await flushPromises()
      
      wrapper.vm.searchQuery = 'j'
      wrapper.vm.selectedRole = 'all'
      wrapper.vm.sortBy = 'name'
      wrapper.vm.sortOrder = 'asc'
      await flushPromises()
      
      const filtered = wrapper.vm.filteredAndSortedUsers
      expect(filtered.length).toBe(3) // Jane Smith, John Doe, Bob Johnson all contain 'j'
      expect(filtered[0].fullname).toBe('Bob Johnson')
      expect(filtered[1].fullname).toBe('Jane Smith')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty user list', async () => {
      mockFetch.mockResolvedValueOnce([])
      
      const wrapper = mount(UsersPage, {
        global: {
          stubs: {
            Button: true,
            Input: true,
            Label: true,
            Badge: true,
            Dialog: true,
            Select: true
          }
        }
      })
      
      await flushPromises()
      
      expect(wrapper.text()).toContain('No staff members found')
    })

    it('should handle null or undefined user properties gracefully', async () => {
      const userWithNulls = [{
        id: 5,
        fullname: 'Test User',
        email: null,
        contact_number: null,
        is_admin: undefined,
        is_manager: undefined,
        designation: null,
        department: null,
        user_id: 'user-5',
        created_at: null
      }]
      
      mockFetch.mockResolvedValueOnce(userWithNulls)
      
      const wrapper = mount(UsersPage, {
        global: {
          stubs: {
            Button: true,
            Input: true,
            Label: true,
            Badge: true,
            Dialog: true,
            Select: true
          }
        }
      })
      
      await flushPromises()
      
      expect(wrapper.text()).toContain('Test User')
      expect(wrapper.vm.hasAdmin(userWithNulls[0])).toBe(false)
      expect(wrapper.vm.hasManager(userWithNulls[0])).toBe(false)
    })

    it('should trim whitespace from search query', async () => {
      const wrapper = mount(UsersPage, {
        global: {
          stubs: {
            Button: true,
            Input: true,
            Label: true,
            Badge: true,
            Dialog: true,
            Select: true
          }
        }
      })
      
      await flushPromises()
      
      wrapper.vm.searchQuery = '  john  '
      await flushPromises()
      
      expect(wrapper.vm.filteredAndSortedUsers.length).toBe(2)
    })

    it('should handle empty string search query', async () => {
      const wrapper = mount(UsersPage, {
        global: {
          stubs: {
            Button: true,
            Input: true,
            Label: true,
            Badge: true,
            Dialog: true,
            Select: true
          }
        }
      })
      
      await flushPromises()
      
      wrapper.vm.searchQuery = ''
      await flushPromises()
      
      expect(wrapper.vm.filteredAndSortedUsers.length).toBe(3)
    })
  })
})

