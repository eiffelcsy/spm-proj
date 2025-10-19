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
                      <Badge 
                        :variant="user.staff_type === 'admin' ? 'default' : 'secondary'"
                        :class="user.staff_type === 'admin' ? 'bg-blue-100 text-blue-800' : user.staff_type === 'manager' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'"
                      >
                        <Shield v-if="user.staff_type === 'admin'" class="w-3 h-3 mr-1" />
                        <User v-else-if="user.staff_type === 'manager'" class="w-3 h-3 mr-1" />
                        <User v-else class="w-3 h-3 mr-1" />
                        {{ user.staff_type }}
                      </Badge>
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
                <span>Current Role: </span>
                <Badge :variant="originalRole === 'admin' ? 'default' : 'secondary'"
                       :class="originalRole === 'admin' ? 'bg-blue-100 text-blue-800' : originalRole === 'manager' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'">
                  {{ originalRole }}
                </Badge>
              </div>
              <div class="text-sm text-gray-600 mt-1">
                <span>New Role: </span>
                <Badge :variant="pendingRoleChange === 'admin' ? 'default' : 'secondary'"
                       :class="pendingRoleChange === 'admin' ? 'bg-blue-100 text-blue-800' : pendingRoleChange === 'manager' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'">
                  {{ pendingRoleChange }}
                </Badge>
              </div>
            </div>

            <!-- Warning for Manager/Admin roles -->
            <div v-if="pendingRoleChange === 'manager' || pendingRoleChange === 'admin'" 
                 class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div class="flex items-start gap-2">
                <Shield class="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 class="font-medium text-yellow-800 mb-1">Important Notice</h4>
                  <p class="text-sm text-yellow-700">
                    <span v-if="pendingRoleChange === 'admin'">
                      Admin users have full system access and can manage all users, projects, and system settings.
                    </span>
                    <span v-else-if="pendingRoleChange === 'manager'">
                      Manager users can create and manage projects, assign tasks, and view reports.
                    </span>
                  </p>
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
              {{ successUserInfo.fullname }}'s role has been successfully updated to 
              <Badge :variant="successUserInfo.staff_type === 'admin' ? 'default' : 'secondary'"
                     :class="successUserInfo.staff_type === 'admin' ? 'bg-blue-100 text-blue-800' : successUserInfo.staff_type === 'manager' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'">
                {{ successUserInfo.staff_type }}
              </Badge>
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
                  v-model="editingUser.contact_number"
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
                  v-model="editingUser.designation"
                  placeholder="Enter designation"
                />
              </div>
              <div class="space-y-2">
                <Label for="department">Department</Label>
                <Input 
                  id="department"
                  v-model="editingUser.department"
                  placeholder="Enter department"
                />
              </div>
            </div>
            <div class="space-y-2">
              <Label for="staff_type">Staff Type</Label>
              <Select v-model="editingUser.staff_type">
                <SelectTrigger>
                  <SelectValue placeholder="Select staff type" />
                </SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
              </Select>
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
  staff_type: string
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
  staff_type: 'staff',
  designation: '',
  department: '',
  user_id: '',
  created_at: ''
})
const isUpdating = ref(false)
const updateError = ref('')
const updateSuccess = ref('')

// Role change confirmation variables
const isRoleConfirmOpen = ref(false)
const isSuccessOpen = ref(false)
const pendingRoleChange = ref('')
const originalRole = ref('')
const selectKey = ref(0)
const successUserInfo = ref({ fullname: '', staff_type: '' })

// Filter, sort, and search variables
const searchQuery = ref('')
const selectedRole = ref('all')
const sortBy = ref('name')
const sortOrder = ref('asc')

// Computed property for filtered and sorted users
const filteredAndSortedUsers = computed(() => {
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
    filtered = filtered.filter(user => user.staff_type === selectedRole.value)
  }

  // Sort the filtered results
  return filtered.sort((a, b) => {
    let aValue: any
    let bValue: any

    switch (sortBy.value) {
      case 'name':
        aValue = a.fullname.toLowerCase()
        bValue = b.fullname.toLowerCase()
        break
      case 'role':
        // Define role hierarchy for sorting
        const roleOrder = { admin: 3, manager: 2, staff: 1 }
        aValue = roleOrder[a.staff_type as keyof typeof roleOrder] || 0
        bValue = roleOrder[b.staff_type as keyof typeof roleOrder] || 0
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

function openEditModal(user: User) {
  editingUser.value = { ...user }
  originalRole.value = user.staff_type
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
    staff_type: 'staff',
    designation: '',
    department: '',
    user_id: '',
    created_at: ''
  }
  updateError.value = ''
  updateSuccess.value = ''
  originalRole.value = ''
}

// Role change handling functions
function closeSuccessAndEdit() {
  isSuccessOpen.value = false
  closeEditModal()
}

function cancelRoleChange() {
  // Revert the role back to original
  editingUser.value.staff_type = originalRole.value
  
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
    staff_type: editingUser.value.staff_type
  }
  
  // Close confirmation dialog
  isRoleConfirmOpen.value = false
  
  // Update original role for future comparisons
  originalRole.value = editingUser.value.staff_type
  
  // Perform the actual update
  await performUserUpdate()
  
  // Show success notification if update was successful
  if (!updateError.value) {
    isSuccessOpen.value = true
  }
}

async function updateUser() {
  console.log('updateUser called - Current role:', editingUser.value.staff_type, 'Original role:', originalRole.value)
  
  // Check if role has changed
  if (editingUser.value.staff_type !== originalRole.value) {
    console.log('Role changed! Showing confirmation dialog')
    // Close the edit modal first
    isEditModalOpen.value = false
    // Show role change confirmation
    pendingRoleChange.value = editingUser.value.staff_type
    isRoleConfirmOpen.value = true
    return
  }
  
  console.log('No role change, proceeding with normal update')
  // If no role change, proceed with normal update
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
      staff_type: editingUser.value.staff_type
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
      if (editingUser.value.staff_type === originalRole.value) {
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
})
</script>