<template>
  <div class="relative">
    <!-- Dropdown Trigger -->
    <button
      @click="toggleDropdown"
      class="relative p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
    >
      <Bell class="w-5 h-5" />
      <span
        v-if="unreadCount > 0"
        class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium"
      >
        {{ unreadCount > 99 ? '99+' : unreadCount }}
      </span>
    </button>

    <!-- Dropdown Content -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 scale-95 translate-y-1"
      enter-to-class="opacity-100 scale-100 translate-y-0"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 scale-100 translate-y-0"
      leave-to-class="opacity-0 scale-95 translate-y-1"
    >
      <div
        v-if="isDropdownOpen"
        class="absolute right-0 mt-2 w-80 max-w-sm bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
      >
        <!-- Header -->
        <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white">
              Notifications
            </h3>
            <div class="flex items-center gap-2">
              <button
                v-if="unreadCount > 0"
                @click="markAllAsRead"
                class="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
              >
                Mark all read
              </button>
              <button
                @click="closeDropdown"
                class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="px-4 py-8 text-center">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">Loading notifications...</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="notifications.length === 0" class="px-4 py-8 text-center">
          <Bell class="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p class="text-sm text-gray-500 dark:text-gray-400">No notifications yet</p>
        </div>

        <!-- Notifications List -->
        <div v-else class="max-h-96 overflow-y-auto">
          <div
            v-for="notification in notifications"
            :key="notification.id"
            class="px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            :class="{ 'bg-blue-50 dark:bg-blue-900/20': !notification.is_read }"
          >
            <div class="flex items-start gap-3">
              <!-- Icon -->
              <div class="flex-shrink-0 mt-0.5">
                <div 
                  class="w-6 h-6 rounded-full flex items-center justify-center"
                  :class="getIconBackgroundClass(notification.type)"
                >
                  <component 
                    :is="getNotificationIcon(notification.type)" 
                    class="w-3 h-3"
                    :class="getNotificationColor(notification.type)"
                  />
                </div>
              </div>

              <!-- Content -->
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between">
                  <div class="flex-1 min-w-0">
                    <h4 
                      class="text-sm font-medium text-gray-900 dark:text-white truncate"
                      :class="{ 'font-semibold': !notification.is_read }"
                    >
                      {{ notification.title }}
                    </h4>
                    <p class="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                      {{ notification.message }}
                    </p>
                  </div>
                  
                  <!-- Actions -->
                  <div class="flex items-center gap-1 ml-2">
                    <!-- For deleted tasks, only show Mark as Read button -->
                    <button
                      v-if="!notification.is_read && notification.title === 'Task Deleted'"
                      @click="markAsRead(notification.id)"
                      class="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium border border-blue-200 dark:border-blue-800 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      Mark as Read
                    </button>
                    
                    <button
                      v-if="notification.is_read"
                      @click="deleteNotification(notification.id)"
                      class="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 class="w-3 h-3" />
                    </button>
                  </div>
                </div>
                
                <div class="flex items-center justify-between mt-2">
                  <span class="text-xs text-gray-500 dark:text-gray-400">
                    {{ formatNotificationTime(notification.created_at) }}
                  </span>
                  
                  <button
                    v-if="notification.related_task_id && notification.title !== 'Task Deleted'"
                    @click="navigateToTask(notification.related_task_id)"
                    class="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                  >
                    View Task
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div v-if="notifications.length > 0" class="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <button
            @click="navigateToAllNotifications"
            class="w-full text-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
          >
            View all notifications
          </button>
        </div>
      </div>
    </Transition>

    <!-- Backdrop -->
    <div
      v-if="isDropdownOpen"
      @click="closeDropdown"
      class="fixed inset-0 z-40"
    />
  </div>
</template>

<script setup lang="ts">
import { 
  Bell, 
  X, 
  Check, 
  Trash2, 
  UserPlus, 
  UserMinus,
  Edit, 
  MessageSquare, 
  Clock, 
  Hash
} from 'lucide-vue-next'

const {
  notifications,
  unreadCount,
  isDropdownOpen,
  isLoading,
  toggleDropdown,
  closeDropdown,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationIcon,
  getNotificationColor,
  getIconBackgroundClass,
  formatNotificationTime
} = useNotifications()

const router = useRouter()

// ============================================================================
// ICON MAPPING
// ============================================================================

const iconMap = {
  UserPlus,
  UserMinus,
  Edit,
  MessageSquare,
  Clock,
  Hash,
  Bell,
  Trash2
}


// ============================================================================
// ACTIONS
// ============================================================================

const navigateToTask = (taskId: number) => {
  router.push(`/task/${taskId}`)
  closeDropdown()
}

const navigateToAllNotifications = () => {
  // Get current route to determine context
  const currentRoute = useRoute()
  const from = currentRoute.path.includes('/task/') ? 'task' :
               currentRoute.path.includes('/project/') ? 'project' :
               currentRoute.path.includes('/personal/') ? 'personal' :
               'dashboard'
  
  // If coming from a task page, also pass the task ID
  let queryParams = `from=${from}`
  if (currentRoute.path.includes('/task/')) {
    const taskId = currentRoute.params.id
    if (taskId) {
      queryParams += `&taskId=${taskId}`
    }
    
    // If the task has a projectId in the query params, pass it along
    const projectId = currentRoute.query.projectId
    if (projectId) {
      queryParams += `&projectId=${projectId}`
    }
  }
  // If coming from a project page (not dashboard), also pass the project ID
  if (currentRoute.path.includes('/project/') && !currentRoute.path.includes('/project/dashboard')) {
    const projectId = currentRoute.params.id
    if (projectId) {
      queryParams += `&projectId=${projectId}`
    }
  }
  
  router.push(`/notifications?${queryParams}`)
  closeDropdown()
}
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
