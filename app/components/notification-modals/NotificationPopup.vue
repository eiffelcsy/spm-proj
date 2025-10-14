<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="translate-x-full opacity-0"
    enter-to-class="translate-x-0 opacity-100"
    leave-active-class="transition-all duration-300 ease-in"
    leave-from-class="translate-x-0 opacity-100"
    leave-to-class="translate-x-full opacity-0"
  >
    <div
      v-if="notification"
      class="fixed top-4 right-4 z-50 w-80 max-w-sm bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4"
    >
      <div class="flex items-start gap-3">
        <!-- Icon -->
        <div class="flex-shrink-0">
          <div 
            class="w-8 h-8 rounded-full flex items-center justify-center"
            :class="getIconBackgroundClass(notification.type)"
          >
            <component 
              :is="iconMap[getNotificationIcon(notification.type)]" 
              class="w-4 h-4"
              :class="getNotificationColor(notification.type)"
            />
          </div>
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {{ notification.title }}
            </h4>
            <button
              @click="hidePopup"
              class="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
          
          <p class="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
            {{ notification.message }}
          </p>
          
          <div class="flex items-center justify-between mt-2">
            <span class="text-xs text-gray-500 dark:text-gray-400">
              {{ formatNotificationTime(notification.created_at) }}
            </span>
            
            <button
              v-if="notification.related_task_id && notification.title !== 'Task Deleted'"
              @click="navigateToTask"
              class="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
            >
              View Task
            </button>
          </div>
        </div>
      </div>

      <!-- Progress bar for auto-fade -->
      <div class="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 rounded-b-lg overflow-hidden">
        <div 
          class="h-full bg-blue-500 transition-all duration-100 ease-linear"
          :style="{ width: `${progressWidth}%` }"
        />
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { X, UserPlus, Edit, MessageSquare, Clock, Hash, Bell } from 'lucide-vue-next'
import type { NotificationWithRelations } from '~/types'

interface Props {
  notification: NotificationWithRelations | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  hide: []
  navigateToTask: [taskId: number]
}>()

const { formatNotificationTime, getPopupRemainingTime, getNotificationIcon, getNotificationColor, getIconBackgroundClass } = useNotifications()

// Reactive progress bar width
const progressWidth = ref(100)

// Update progress bar every 100ms
let progressInterval: NodeJS.Timeout | null = null

onMounted(() => {
  progressInterval = setInterval(() => {
    progressWidth.value = getPopupRemainingTime()
  }, 100)
})

onUnmounted(() => {
  if (progressInterval) {
    clearInterval(progressInterval)
  }
})


// ============================================================================
// ICON MAPPING
// ============================================================================

const iconMap = {
  UserPlus,
  Edit,
  MessageSquare,
  Clock,
  Hash,
  Bell
}

// ============================================================================
// ACTIONS
// ============================================================================

const hidePopup = () => {
  emit('hide')
}

const navigateToTask = () => {
  if (props.notification?.related_task_id) {
    emit('navigateToTask', props.notification.related_task_id)
    hidePopup()
  }
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
