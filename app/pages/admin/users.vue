<template>
  <div class="w-full mx-auto p-8 md:px-12 lg:max-w-6xl xl:max-w-7xl">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-3xl font-bold">User Management</h1>
        <p class="text-gray-600 mt-1">Manage user accounts and staff permissions</p>
      </div>
    </div>
    
    <div class="mb-4">
      <!-- Error message -->
      <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        {{ error }}
        <button @click="fetchUsers" class="ml-2 underline">Try again</button>
      </div>

      <!-- Loading state -->
      <div v-if="isLoading" class="flex justify-center items-center py-8">
        <div class="text-gray-500">Loading users...</div>
      </div>

      <div v-else>
        <!-- Users Table -->
        <div class="bg-white rounded-lg border">
          <div class="p-4">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold">Staff Members</h2>
              <Button @click="fetchUsers" variant="outline" size="sm">
                Refresh
              </Button>
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
                  <tr v-for="user in users" :key="user.id" class="border-b hover:bg-gray-50">
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
                    <td class="p-3 text-gray-600">
                      {{ user.date_joined ? new Intl.DateTimeFormat('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      }).format(new Date(user.date_joined)) : '—' }}
                    </td>
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
              
              <div v-if="users.length === 0" class="text-center py-8 text-gray-500">
                No staff members found.
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Edit User Modal -->
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
                  :value="editingUser.contact_number || ''" 
                  @input="editingUser.contact_number = ($event.target as HTMLInputElement).value"
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
                  :value="editingUser.designation || ''" 
                  @input="editingUser.designation = ($event.target as HTMLInputElement).value"
                  placeholder="Enter designation"
                />
              </div>
              <div class="space-y-2">
                <Label for="department">Department</Label>
                <Input 
                  id="department"
                  :value="editingUser.department || ''" 
                  @input="editingUser.department = ($event.target as HTMLInputElement).value"
                  placeholder="Enter department"
                />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label for="dob">Date of Birth</Label>
                <Input 
                  id="dob"
                  :value="editingUser.dob || ''" 
                  @input="editingUser.dob = ($event.target as HTMLInputElement).value"
                  type="date"
                />
              </div>
              <div class="space-y-2">
                <Label for="date_joined">Date Joined</Label>
                <Input 
                  id="date_joined"
                  :value="editingUser.date_joined || ''" 
                  @input="editingUser.date_joined = ($event.target as HTMLInputElement).value"
                  type="date"
                />
              </div>
            </div>

            <div class="space-y-2">
              <Label for="address">Address</Label>
              <Input 
                id="address"
                :value="editingUser.address || ''" 
                @input="editingUser.address = ($event.target as HTMLInputElement).value"
                placeholder="Enter address"
              />
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
import { ref, onMounted } from 'vue'
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
  layout: 'dashboard'
})

interface User {
  id: number
  fullname: string
  email: string | null
  contact_number?: string
  dob?: string
  date_joined?: string
  staff_type: string
  designation?: string
  department?: string
  address?: string
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
  dob: '',
  date_joined: '',
  staff_type: 'staff',
  designation: '',
  department: '',
  address: '',
  user_id: '',
  created_at: ''
})
const isUpdating = ref(false)
const updateError = ref('')
const updateSuccess = ref('')


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
    dob: '',
    date_joined: '',
    staff_type: 'staff',
    designation: '',
    department: '',
    address: '',
    user_id: '',
    created_at: ''
  }
  updateError.value = ''
  updateSuccess.value = ''
}

async function updateUser() {
  try {
    isUpdating.value = true
    updateError.value = ''
    updateSuccess.value = ''

    const response = await $fetch(`/api/admin/users/${editingUser.value.id}`, {
      method: 'PUT',
      body: {
        fullname: editingUser.value.fullname,
        contact_number: editingUser.value.contact_number,
        dob: editingUser.value.dob,
        designation: editingUser.value.designation,
        department: editingUser.value.department,
        address: editingUser.value.address,
        staff_type: editingUser.value.staff_type
      }
    })

    if (response.success) {
      updateSuccess.value = 'User updated successfully!'
      // Update the user in the local array
      const index = users.value.findIndex(u => u.id === editingUser.value.id)
      if (index !== -1) {
        users.value[index] = { ...users.value[index], ...editingUser.value }
      }
      setTimeout(() => {
        closeEditModal()
      }, 1500)
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
