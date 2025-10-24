<template>
  <div class="w-full mx-auto p-8 md:px-12 lg:max-w-6xl xl:max-w-7xl">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-3xl font-bold">User Management</h1>
      </div>
    </div>
    
    <div class="mb-4">
      <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        {{ error }}
        <button @click="fetchUsers" class="ml-2 underline">Try again</button>
      </div>

      <div v-if="isLoading" class="flex justify-center items-center py-8">
        <div class="text-gray-500">Loading users...</div>
      </div>

      <div v-else>
        <div class="bg-white rounded-lg border">
          <div class="p-4">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold">Staff Members</h2>
              <Button @click="fetchUsers" variant="outline" size="sm">
                Refresh
              </Button>
            </div>
            
            <!-- Search, Filter and Sort Controls -->
            <div class="flex items-center gap-4 mb-4">
              <div class="flex items-center gap-2">
                <Label for="search-name" class="text-sm font-medium">Search by Name:</Label>
                <Input 
                  id="search-name"
                  v-model="searchQuery"
                  placeholder="Enter name to search..."
                  class="w-48"
                />
              </div>
              
              <div class="flex items-center gap-2">
                <Label for="role-filter" class="text-sm font-medium">Filter by Role:</Label>
                <Select v-model="selectedRole">
                  <SelectTrigger class="w-40">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div class="flex items-center gap-2">
                <Label for="sort-by" class="text-sm font-medium">Sort by:</Label>
                <Select v-model="sortBy">
                  <SelectTrigger class="w-40">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="role">Role</SelectItem>
                    <SelectItem value="date">Date Joined</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div class="flex items-center gap-2">
                <Label for="sort-order" class="text-sm font-medium">Order:</Label>
                <Select v-model="sortOrder">
                  <SelectTrigger class="w-32">
                    <SelectValue placeholder="Order" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b">
                    <th class="text-left p-3 font-medium">Full Name</th>
                    <th class="text-left p-3 font-medium">Email</th>
                    <th class="text-left p-3 font-medium">Designation</th>
                    <th class="text-left p-3 font-medium">Department</th>
                    <th class="text-left p-3 font-medium">Role</th>
                    <th class="text-left p-3 font-medium">Date Joined</th>
                    <th class="text-left p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="user in filteredAndSortedUsers" :key="user.id" class="border-b hover:bg-gray-50">
                    <td class="p-3 font-medium">{{ user.fullname }}</td>
                    <td class="p-3 text-gray-600">{{ user.email || '—' }}</td>
                    <td class="p-3 text-gray-600">{{ user.designation || '—' }}</td>
                    <td class="p-3 text-gray-600">{{ user.department || '—' }}</td>
                    <td class="p-3">
                      <div class="flex flex-wrap gap-1">
                        <Badge
                          v-for="role in displayRoles(user)"
                          :key="role"
                          :variant="role === 'admin' ? 'default' : 'secondary'"
                          :class="role === 'admin' ? 'bg-blue-100 text-blue-800' : role === 'manager' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'"
                        >
                          <Shield v-if="role === 'admin'" class="w-3 h-3 mr-1" />
                          <User v-else class="w-3 h-3 mr-1" />
                          {{ role }}
                        </Badge>
                      </div>
                    </td>
                    <td class="p-3 text-gray-600">{{ user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' }}</td>
                    <td class="p-3">
                      <Button
                        variant="outline"
                        size="sm"
                        @click="openEditModal(user)"
                        class="h-8 w-8 p-0"
                      >
                        <MoreHorizontal class="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                </tbody>
              </table>
              
              <div v-if="filteredAndSortedUsers.length === 0" class="text-center py-8 text-gray-500">
                <div v-if="searchQuery.trim()">
                  No users found matching "{{ searchQuery }}".
                </div>
                <div v-else-if="selectedRole !== 'all'">
                  No {{ selectedRole }} members found.
                </div>
                <div v-else>
                  No staff members found.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Role Change Confirmation Dialog -->
      <div v-if="isRoleConfirmOpen" class="fixed inset-0 z-50 flex items-center justify-center" style="background-color: rgba(0, 0, 0, 0.5);" @click="cancelRoleChange">
        <div class="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6" @click.stop>
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold">Confirm Role Change</h3>
            <button @click="cancelRoleChange" class="text-gray-400 hover:text-gray-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          
          <p class="text-gray-600 mb-4">Are you sure you want to change this user's role?</p>
          
          <div class="space-y-4">
            <div class="p-4 bg-gray-50 rounded-lg">
              <div class="flex items-center gap-2 mb-2">
                <User class="w-4 h-4" />
                <span class="font-medium">{{ editingUser.fullname }}</span>
              </div>
              <div class="text-sm text-gray-600">
                <span>Current Roles: </span>
                <span class="inline-flex gap-1">
                  <Badge v-for="r in displayRoles({ is_admin: originalIsAdmin, is_manager: originalIsManager })" :key="r"
                         :variant="r === 'admin' ? 'default' : 'secondary'"
                         :class="r === 'admin' ? 'bg-blue-100 text-blue-800' : r === 'manager' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'">
                    {{ r }}
                  </Badge>
                </span>
              </div>
              <div class="text-sm text-gray-600 mt-1">
                <span>New Roles: </span>
                <span class="inline-flex gap-1">
                  <Badge v-for="r in displayRoles(editingUser)" :key="r"
                         :variant="r === 'admin' ? 'default' : 'secondary'"
                         :class="r === 'admin' ? 'bg-blue-100 text-blue-800' : r === 'manager' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'">
                    {{ r }}
                  </Badge>
                </span>
              </div>
            </div>

            <!-- Warning for selected roles -->
            <div v-if="hasAdmin(editingUser) || hasManager(editingUser)" 
                 class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div class="flex items-start gap-2">
                <Shield class="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 class="font-medium text-yellow-800 mb-2">Access and Permissions</h4>
                  <ul class="text-sm text-yellow-800 list-disc pl-5 space-y-1">
                    <li v-if="hasAdmin(editingUser)">
                      Admin: Full system access; manage users, projects, and global settings.
                    </li>
                    <li v-if="hasManager(editingUser)">
                      Manager: Create/manage projects, assign tasks, and view team reports.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" @click="cancelRoleChange">
              Cancel
            </Button>
            <Button type="button" @click="confirmRoleChange" :disabled="isUpdating">
              {{ isUpdating ? 'Updating...' : 'Confirm Role Change' }}
            </Button>
          </div>
        </div>
      </div>

      <!-- Success Notification -->
      <div v-if="isSuccessOpen" class="fixed inset-0 z-50 flex items-center justify-center" style="background-color: rgba(0, 0, 0, 0.5);" @click="isSuccessOpen = false">
        <div class="bg-white rounded-lg shadow-lg max-w-sm w-full mx-4 p-6" @click.stop>
          <div class="flex items-center gap-2 mb-4">
            <Shield class="w-5 h-5 text-green-600" />
            <h3 class="text-lg font-semibold text-green-600">Role Updated Successfully</h3>
          </div>
          <div class="py-4">
            <p class="text-gray-700">
              {{ successUserInfo.fullname }}'s roles have been updated to 
              <span class="inline-flex gap-1">
                <Badge v-for="r in displayRoles(successUserInfo)" :key="r"
                       :variant="r === 'admin' ? 'default' : 'secondary'"
                       :class="r === 'admin' ? 'bg-blue-100 text-blue-800' : r === 'manager' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'">
                  {{ r }}
                </Badge>
              </span>
            </p>
          </div>
          <div class="flex justify-end">
            <Button @click="closeSuccessAndEdit">Close</Button>
          </div>
        </div>
      </div>

      <Dialog v-model:open="isEditModalOpen">
        <DialogContent class="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
            <DialogDescription>
              Update staff information and permissions.
            </DialogDescription>
          </DialogHeader>
          <form @submit.prevent="updateUser" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label for="fullname">Full Name *</Label>
                <Input 
                  id="fullname"
                  v-model="editingUser.fullname" 
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div class="space-y-2">
                <Label for="contact_number">Contact Number</Label>
                <Input 
                  id="contact_number"
                  :model-value="editingUser.contact_number ?? ''"
                  @update:modelValue="val => editingUser.contact_number = val ? String(val) : ''"
                  placeholder="Enter contact number"
                />
              </div>
            </div>

            <div class="space-y-2">
              <Label for="email">Email</Label>
              <Input 
                id="email"
                :value="editingUser.email || ''" 
                type="email"
                disabled
                class="bg-gray-50"
              />
              <p class="text-xs text-gray-500">Email cannot be changed</p>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label for="designation">Designation</Label>
                <Input 
                  id="designation"
                  :model-value="editingUser.designation ?? ''"
                  @update:modelValue="val => editingUser.designation = val ? String(val) : ''"
                  placeholder="Enter designation"
                />
              </div>
              <div class="space-y-2">
                <Label for="department">Department</Label>
                <Input 
                  id="department"
                  :model-value="editingUser.department ?? ''"
                  @update:modelValue="val => editingUser.department = val ? String(val) : ''"
                  placeholder="Enter department"
                />
              </div>
            </div>
            <div class="space-y-2">
              <Label>Roles</Label>
              <div class="flex items-center gap-4">
                <label class="flex items-center gap-2 text-sm" :class="isEditingSelf ? 'opacity-50 cursor-not-allowed' : ''">
                  <input type="checkbox" :checked="hasManager(editingUser)" @change="(e:any) => setManager(editingUser, e.target.checked)" :disabled="isEditingSelf" />
                  Manager
                </label>
                <label class="flex items-center gap-2 text-sm" :class="isEditingSelf ? 'opacity-50 cursor-not-allowed' : ''">
                  <input type="checkbox" :checked="hasAdmin(editingUser)" @change="(e:any) => setAdmin(editingUser, e.target.checked)" :disabled="isEditingSelf" />
                  Admin
                </label>
              </div>
              <div v-if="isEditingSelf" class="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mt-2">
                <div class="flex items-start gap-2">
                  <Shield class="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <p class="text-sm text-yellow-800">
                    You cannot change your own roles to prevent accidental self-lockout. Ask another admin to modify your permissions if needed.
                  </p>
                </div>
              </div>
            </div>

            <div v-if="updateError" class="text-red-600 text-sm">
              {{ updateError }}
            </div>
            <div v-if="updateSuccess" class="text-green-600 text-sm">
              {{ updateSuccess }}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" @click="closeEditModal">
                Cancel
              </Button>
              <Button type="submit" :disabled="isUpdating">
                {{ isUpdating ? 'Updating...' : 'Update Staff Member' }}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useSupabaseUser } from '#imports'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { MoreHorizontal, UserCog, Shield, User } from 'lucide-vue-next'

definePageMeta({
  layout: "with-sidebar",
});

interface User {
  id: number
  fullname: string
  email: string | null
  contact_number?: string | null
  is_admin?: boolean
  is_manager?: boolean
  designation?: string | null
  department?: string | null
  user_id: string
  created_at: string
}

const users = ref<User[]>([])
const isLoading = ref(true)
const error = ref('')
const isEditModalOpen = ref(false)
const editingUser = ref<User>({
  id: 0,
  fullname: '',
  email: '',
  contact_number: '',
  is_admin: false,
  is_manager: false,
  designation: '',
  department: '',
  user_id: '',
  created_at: ''
})
const isUpdating = ref(false)
const updateError = ref('')
const updateSuccess = ref('')

// Current user information
const currentUser = ref<{ id: number; fullname: string; email: string | null; isManager: boolean; isAdmin: boolean } | null>(null)

// Role change confirmation variables
const isRoleConfirmOpen = ref(false)
const isSuccessOpen = ref(false)
const pendingRoleChange = ref('')
const originalIsAdmin = ref(false)
const originalIsManager = ref(false)
const selectKey = ref(0)
const successUserInfo = ref({ fullname: '', is_admin: false, is_manager: false })

// Filter, sort, and search variables
const searchQuery = ref('')
const selectedRole = ref('all')
const sortBy = ref('name')
const sortOrder = ref('asc')

// Computed property to check if editing self
const isEditingSelf = computed(() => {
  return currentUser.value && editingUser.value && currentUser.value.id === editingUser.value.id
})

// Computed property for filtered and sorted users
const filteredAndSortedUsers = computed(() => {
  // Ensure users.value is always an array
  if (!Array.isArray(users.value)) {
    return []
  }
  
  let filtered = users.value

  // Search by name
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    filtered = filtered.filter(user => 
      user.fullname.toLowerCase().includes(query)
    )
  }

  // Filter by role
  if (selectedRole.value !== 'all') {
    if (selectedRole.value === 'admin') {
      filtered = filtered.filter(user => hasAdmin(user))
    } else if (selectedRole.value === 'manager') {
      filtered = filtered.filter(user => hasManager(user))
    } else if (selectedRole.value === 'staff') {
      filtered = filtered.filter(user => !hasAdmin(user) && !hasManager(user))
    }
  }

  // Sort the filtered results - create a copy to avoid mutating reactive data
  const sorted = [...filtered]
  return sorted.sort((a, b) => {
    let aValue: any
    let bValue: any

    switch (sortBy.value) {
      case 'name':
        aValue = a.fullname.toLowerCase()
        bValue = b.fullname.toLowerCase()
        break
      case 'role':
        // Define role hierarchy for sorting (admin > manager > staff)
        aValue = hasAdmin(a) ? 3 : hasManager(a) ? 2 : 1
        bValue = hasAdmin(b) ? 3 : hasManager(b) ? 2 : 1
        break
      case 'date':
        aValue = new Date(a.created_at).getTime()
        bValue = new Date(b.created_at).getTime()
        break
      case 'email':
        aValue = (a.email || '').toLowerCase()
        bValue = (b.email || '').toLowerCase()
        break
      default:
        aValue = a.fullname.toLowerCase()
        bValue = b.fullname.toLowerCase()
    }

    if (sortOrder.value === 'desc') {
      return aValue < bValue ? 1 : aValue > bValue ? -1 : 0
    } else {
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
    }
  })
})

async function fetchUsers() {
  try {
    isLoading.value = true
    error.value = ''
    
    const response = await $fetch<User[]>('/api/admin/users')
    users.value = response
  } catch (err: any) {
    console.error('Error fetching users:', err)
    error.value = err?.data?.statusMessage || err?.message || 'Failed to load users'
  } finally {
    isLoading.value = false
  }
}

async function fetchCurrentUser() {
  try {
    const user = await $fetch<{ id: number; fullname: string; email: string | null; isManager: boolean; isAdmin: boolean }>('/api/user/me')
    currentUser.value = user
  } catch (err) {
    console.error('Failed to fetch current user:', err)
    currentUser.value = null
  }
}

function openEditModal(user: User) {
  editingUser.value = { ...user }
  originalIsAdmin.value = !!(user as any).is_admin
  originalIsManager.value = !!(user as any).is_manager
  selectKey.value = 0
  updateError.value = ''
  updateSuccess.value = ''
  isEditModalOpen.value = true
}

function closeEditModal() {
  isEditModalOpen.value = false
  editingUser.value = {
    id: 0,
    fullname: '',
    email: '',
    contact_number: '',
    is_admin: false,
    is_manager: false,
    designation: '',
    department: '',
    user_id: '',
    created_at: ''
  }
  updateError.value = ''
  updateSuccess.value = ''
  originalIsAdmin.value = false
  originalIsManager.value = false
}

// Role change handling functions
function closeSuccessAndEdit() {
  isSuccessOpen.value = false
  closeEditModal()
}

function cancelRoleChange() {
  // Revert the role back to original
  ;(editingUser.value as any).is_admin = originalIsAdmin.value
  ;(editingUser.value as any).is_manager = originalIsManager.value
  
  // Close confirmation dialog and reset pending change
  isRoleConfirmOpen.value = false
  pendingRoleChange.value = ''
  
  // Reopen the edit modal
  isEditModalOpen.value = true
}

async function confirmRoleChange() {
  // Store user info for success popup before update
  successUserInfo.value = {
    fullname: editingUser.value.fullname,
    is_admin: !!(editingUser.value as any).is_admin,
    is_manager: !!(editingUser.value as any).is_manager
  }
  
  // Close confirmation dialog
  isRoleConfirmOpen.value = false
  
  // Update original role flags for future comparisons
  originalIsAdmin.value = !!(editingUser.value as any).is_admin
  originalIsManager.value = !!(editingUser.value as any).is_manager
  
  // Perform the actual update
  await performUserUpdate()
  
  // Show success notification if update was successful
  if (!updateError.value) {
    isSuccessOpen.value = true
  }
}

async function updateUser() {
  const currIsAdmin = !!(editingUser.value as any).is_admin
  const currIsManager = !!(editingUser.value as any).is_manager
  const changed = currIsAdmin !== originalIsAdmin.value || currIsManager !== originalIsManager.value
  if (changed) {
    isEditModalOpen.value = false
    isRoleConfirmOpen.value = true
    return
  }
  await performUserUpdate()
}

async function performUserUpdate() {
  try {
    isUpdating.value = true
    updateError.value = ''
    updateSuccess.value = ''

    // The backend API might expect null instead of an empty string for optional fields.
    // v-model will set them to an empty string, so we can convert them back to null here if needed.
    const body = {
      fullname: editingUser.value.fullname,
      contact_number: editingUser.value.contact_number || null,
      designation: editingUser.value.designation || null,
      department: editingUser.value.department || null,
      is_admin: !!(editingUser.value as any).is_admin,
      is_manager: !!(editingUser.value as any).is_manager
    }

    const response = await $fetch(`/api/admin/users/${editingUser.value.id}`, {
      method: 'PUT',
      body: body
    })

    if (response.success) {
      updateSuccess.value = 'User updated successfully!'
      // Update the user in the local array
      const index = users.value.findIndex(u => u.id === editingUser.value.id)
      if (index !== -1) {
        users.value[index] = { ...users.value[index], ...editingUser.value }
      }
      
      // Only auto-close if it's not a role change (role changes show success popup)
      if (
        !!(editingUser.value as any).is_admin === originalIsAdmin.value &&
        !!(editingUser.value as any).is_manager === originalIsManager.value
      ) {
        setTimeout(() => {
          closeEditModal()
        }, 1500)
      }
    }
  } catch (err: any) {
    console.error('Error updating user:', err)
    updateError.value = err?.data?.statusMessage || err?.message || 'Failed to update user'
  } finally {
    isUpdating.value = false
  }
}

onMounted(() => {
  fetchUsers()
  fetchCurrentUser()
})

// Compute role string from boolean flags (or legacy staff_type)
function computedRole(u: any): 'admin' | 'manager' | 'staff' {
  const isAdmin = toBoolean(u?.is_admin ?? u?.isAdmin)
  const isManager = toBoolean(u?.is_manager ?? u?.isManager)
  return isAdmin ? 'admin' : isManager ? 'manager' : 'staff'
}

// Helpers to derive role flags from various possible field names
function toBoolean(value: any): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'y'
  }
  return false
}

function hasAdmin(u: any): boolean {
  const isAdmin = u?.is_admin ?? u?.isAdmin
  return toBoolean(isAdmin)
}

function hasManager(u: any): boolean {
  const isManager = u?.is_manager ?? u?.isManager
  return toBoolean(isManager)
}

function displayRoles(u: any): Array<'admin' | 'manager' | 'staff'> {
  const roles: Array<'admin' | 'manager'> = []
  if (hasAdmin(u)) roles.push('admin')
  if (hasManager(u)) roles.push('manager')
  return roles.length ? roles : ['staff']
}

function setAdmin(u: any, value: boolean) {
  u.is_admin = !!value
}

function setManager(u: any, value: boolean) {
  u.is_manager = !!value
}
</script>