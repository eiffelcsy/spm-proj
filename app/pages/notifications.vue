<template>
  <div class="w-full mx-auto p-8 md:px-12 lg:max-w-6xl xl:max-w-7xl relative">
    <!-- Exit button in top right corner of page -->
    <Button 
      variant="ghost" 
      size="icon" 
      @click="goBack" 
      class="absolute top-8 -right-4 text-muted-foreground hover:text-red-600 hover:bg-red-50 z-50"
    >
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
    </Button>

    <!-- Header -->
    <div class="mb-8">
      <div>
        <h1 class="text-3xl font-bold mb-6">
          Notifications
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          Stay updated with all your task-related notifications
        </p>
      </div>
    </div>

    <!-- Actions Bar -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <span class="text-sm text-gray-600 dark:text-gray-400">
            {{ notifications.length }} notifications
          </span>
          <span v-if="unreadCount > 0" class="text-sm text-blue-600 dark:text-blue-400 font-medium">
            {{ unreadCount }} unread
          </span>
          <span class="text-xs text-gray-500 dark:text-gray-500">
            Mark as read to enable deletion
          </span>
        </div>
        
        <div class="flex items-center gap-2">
          <button
            v-if="unreadCount > 0"
            @click="markAllAsRead"
            class="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            Mark All As Read
          </button>
          <button
            v-if="notifications.some(n => n.is_read)"
            @click="deleteAllRead"
            class="px-3 py-1.5 text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium border border-red-200 dark:border-red-800 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            Delete All Read
          </button>
          <button
            @click="fetchNotifications"
            :disabled="isLoading"
            class="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300 font-medium border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw :class="{ 'animate-spin': isLoading }" class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading && notifications.length === 0" class="text-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p class="text-gray-600 dark:text-gray-400">Loading notifications...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="notifications.length === 0" class="text-center py-12">
      <Bell class="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
        No notifications yet
      </h3>
      <p class="text-gray-600 dark:text-gray-400">
        You'll receive notifications when tasks are assigned, updated, or commented on.
      </p>
    </div>

    <!-- Notifications List -->
    <div v-else class="space-y-4">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow"
        :class="{
          'ring-2 ring-blue-500 ring-opacity-50 border-blue-200 dark:border-blue-700': !notification.is_read,
          'border-gray-200 dark:border-gray-700 opacity-75': notification.is_read
        }"
      >
        <div class="flex items-start gap-4">
          <!-- Icon -->
          <div class="flex-shrink-0">
            <div 
              class="w-10 h-10 rounded-full flex items-center justify-center"
              :class="getIconBackgroundClass(notification.type)"
            >
              <component 
                :is="getNotificationIcon(notification.type)" 
                class="w-5 h-5"
                :class="getNotificationColor(notification.type)"
              />
            </div>
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between">
              <div class="flex-1 min-w-0">
                <h3 
                  class="text-lg font-semibold text-gray-900 dark:text-white mb-1"
                  :class="{ 'font-bold': !notification.is_read }"
                >
                  {{ notification.title }}
                </h3>
                <p class="text-gray-600 dark:text-gray-300 mb-3">
                  {{ notification.message }}
                </p>
                
                <!-- Metadata -->
                <div class="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span>{{ formatNotificationTime(notification.created_at) }}</span>
                  <span v-if="notification.triggered_by">
                    by {{ notification.triggered_by.fullname }}
                  </span>
                  <span v-if="notification.related_project">
                    in {{ notification.related_project.name }}
                  </span>
                </div>
              </div>
              
              <!-- Actions -->
              <div class="flex items-center gap-2 ml-4">
                <!-- For deleted tasks, only show Mark as Read button -->
                <button
                  v-if="!notification.is_read && notification.title === 'Task Deleted'"
                  @click="markAsRead(notification.id)"
                  class="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  Mark as Read
                </button>
                
                <!-- For other notifications, show View Task button (auto-marks as read) -->
                <button
                  v-if="notification.related_task_id && notification.title !== 'Task Deleted'"
                  @click="navigateToTaskAndMarkRead(notification.related_task_id, notification.id)"
                  class="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  View Task
                </button>
                
                <!-- Optional Mark as Read button for non-deleted tasks -->
                <button
                  v-if="!notification.is_read && notification.title !== 'Task Deleted'"
                  @click="markAsRead(notification.id)"
                  class="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  Mark as Read
                </button>
                
                <button
                  v-if="notification.is_read"
                  @click="deleteNotification(notification.id)"
                  class="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title="Delete"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Load More Button -->
    <div v-if="notifications.length >= 50" class="text-center mt-8">
      <button
        @click="loadMoreNotifications"
        :disabled="isLoading"
        class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300 font-medium border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
      >
        Load More
      </button>
    </div>
  </div>
</template>

<script setup>
import { Bell, Trash2, RefreshCw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

definePageMeta({
  layout: 'with-sidebar'
})

useHead({
  title: 'Notifications'
})

const {
  notifications,
  unreadCount,
  isLoading,
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllReadNotifications,
  getNotificationIcon,
  getNotificationColor,
  getIconBackgroundClass,
  formatNotificationTime
} = useNotifications()

const router = useRouter()



const navigateToTaskAndMarkRead = async (taskId, notificationId) => {
  // Mark notification as read first
  await markAsRead(notificationId)
  // Then navigate to the task
  router.push(`/task/${taskId}`)
}


const goBack = () => {
  router.back()
}

const loadMoreNotifications = async () => {
  // TODO: Implement pagination for notifications
}

const deleteAllRead = async () => {
  await deleteAllReadNotifications()
  await fetchNotifications()
}

onMounted(() => {
  fetchNotifications()
})
</script>
