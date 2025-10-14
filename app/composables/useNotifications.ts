/**
 * Notification composable for managing in-app notifications
 * 
 * This composable provides:
 * - Real-time notification state management
 * - Notification popup display
 * - Notification history management
 * - Auto-fade functionality
 * - WebSocket-like real-time updates via polling
 */

import type { NotificationWithRelations, NotificationType } from '~/types'

interface NotificationState {
  notifications: NotificationWithRelations[]
  unreadCount: number
  isDropdownOpen: boolean
  activePopup: NotificationWithRelations | null
  isLoading: boolean
}

// Create singleton state outside the function
const globalState = reactive<NotificationState>({
  notifications: [],
  unreadCount: 0,
  isDropdownOpen: false,
  activePopup: null,
  isLoading: false
})

// Create a separate ref for activePopup to ensure reactivity
const globalActivePopup = ref<NotificationWithRelations | null>(null)

// Global timer for popup auto-hide
let globalPopupTimer: NodeJS.Timeout | null = null
let globalPopupStartTime: number | null = null

// Ensure the ref is always in sync with the state
watch(() => globalState.activePopup, (newValue) => {
  globalActivePopup.value = newValue
}, { immediate: true })

export const useNotifications = () => {
  const state = globalState
  const activePopup = globalActivePopup

  // ============================================================================
  // NOTIFICATION MANAGEMENT
  // ============================================================================

  /**
   * Fetch notifications from the server
   */
  const fetchNotifications = async () => {
    try {
      state.isLoading = true
      const response = await $fetch<{ notifications: NotificationWithRelations[] }>('/api/notifications')
      state.notifications = response.notifications || []
      state.unreadCount = state.notifications.filter(n => !n.is_read).length
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      state.isLoading = false
    }
  }

  /**
   * Mark a notification as read
   */
  const markAsRead = async (notificationId: number) => {
    try {
      await $fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST'
      })
      
      // Update local state
      const notification = state.notifications.find(n => n.id === notificationId)
      if (notification) {
        notification.is_read = true
        state.unreadCount = Math.max(0, state.unreadCount - 1)
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = async () => {
    try {
      await $fetch('/api/notifications/read-all', {
        method: 'POST'
      })
      
      // Update local state
      state.notifications.forEach(n => n.is_read = true)
      state.unreadCount = 0
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }

  /**
   * Delete a notification
   */
  const deleteNotification = async (notificationId: number) => {
    try {
      await $fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      })
      
      // Update local state
      const notification = state.notifications.find(n => n.id === notificationId)
      if (notification) {
        state.notifications = state.notifications.filter(n => n.id !== notificationId)
        if (!notification.is_read) {
          state.unreadCount = Math.max(0, state.unreadCount - 1)
        }
      }
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }

  /**
   * Delete all read notifications
   */
  const deleteAllReadNotifications = async () => {
    try {
      await $fetch('/api/notifications/delete-all-read', {
        method: 'POST'
      })
      
      // Update local state - remove all read notifications
      state.notifications = state.notifications.filter(n => !n.is_read)
    } catch (error) {
      console.error('Failed to delete all read notifications:', error)
    }
  }

  // ============================================================================
  // POPUP NOTIFICATIONS
  // ============================================================================

  /**
   * Show a popup notification
   */
  const showPopup = (notification: NotificationWithRelations) => {
    // Clear any existing timer
    if (globalPopupTimer) {
      clearTimeout(globalPopupTimer)
      globalPopupTimer = null
    }
    
    state.activePopup = notification
    globalActivePopup.value = notification
    globalPopupStartTime = Date.now()
    
    // Auto-fade after 5 seconds using global timer
    globalPopupTimer = setTimeout(() => {
      hidePopup()
    }, 5000)
  }

  /**
   * Hide the popup notification
   */
  const hidePopup = () => {
    // Clear the timer if it exists
    if (globalPopupTimer) {
      clearTimeout(globalPopupTimer)
      globalPopupTimer = null
    }
    
    state.activePopup = null
    globalActivePopup.value = null
    globalPopupStartTime = null
  }

  /**
   * Get remaining time for popup (for progress bar)
   */
  const getPopupRemainingTime = () => {
    if (!globalPopupStartTime || !state.activePopup) return 0
    const elapsed = Date.now() - globalPopupStartTime
    const remaining = Math.max(0, 5000 - elapsed)
    return (remaining / 5000) * 100 // Return as percentage
  }


  // ============================================================================
  // DROPDOWN MANAGEMENT
  // ============================================================================

  /**
   * Toggle notification dropdown
   */
  const toggleDropdown = () => {
    state.isDropdownOpen = !state.isDropdownOpen
  }

  /**
   * Close notification dropdown
   */
  const closeDropdown = () => {
    state.isDropdownOpen = false
  }

  // ============================================================================
  // REAL-TIME UPDATES
  // ============================================================================

  /**
   * Start polling for new notifications
   */
  const startPolling = () => {
    // Poll every 5 seconds for new notifications
    const pollInterval = setInterval(async () => {
      try {
        const response = await $fetch<{ notifications: NotificationWithRelations[] }>('/api/notifications')
        const newNotifications = response.notifications || []
        
        // Check for new notifications (excluding soft-deleted)
        const existingIds = new Set(state.notifications.map(n => n.id))
        const newNotificationsList = newNotifications.filter(n => !existingIds.has(n.id) && !n.deleted_at)
        
        // Show popups for new notifications
        newNotificationsList.forEach(notification => {
          showPopup(notification)
        })
        
        // Update the notifications list with server data
        state.notifications = newNotifications
        state.unreadCount = state.notifications.filter(n => !n.is_read).length
      } catch (error) {
        console.error('Failed to poll for notifications:', error)
      }
    }, 5000) // 5 seconds for better responsiveness

    // Return cleanup function
    return () => clearInterval(pollInterval)
  }

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Get notification icon based on type
   */
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'task_assigned':
        return 'UserPlus'
      case 'task_updated':
        return 'Edit'
      case 'comment_added':
        return 'MessageSquare'
      case 'deadline_reminder':
        return 'Clock'
      case 'mention':
        return 'Hash'
      case 'project_invitation':
        return 'UserPlus'
      default:
        return 'Bell'
    }
  }

  /**
   * Get notification color based on type
   */
  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case 'task_assigned':
        return 'text-blue-600'
      case 'task_updated':
        return 'text-yellow-600'
      case 'comment_added':
        return 'text-green-600'
      case 'deadline_reminder':
        return 'text-red-600'
      case 'mention':
        return 'text-purple-600'
      case 'project_invitation':
        return 'text-indigo-600'
      default:
        return 'text-gray-600'
    }
  }

  /**
   * Get notification icon background class based on type
   */
  const getIconBackgroundClass = (type: NotificationType) => {
    switch (type) {
      case 'task_assigned':
        return 'bg-blue-100 dark:bg-blue-900'
      case 'task_updated':
        return 'bg-yellow-100 dark:bg-yellow-900'
      case 'comment_added':
        return 'bg-green-100 dark:bg-green-900'
      case 'deadline_reminder':
        return 'bg-red-100 dark:bg-red-900'
      case 'mention':
        return 'bg-purple-100 dark:bg-purple-900'
      case 'project_invitation':
        return 'bg-indigo-100 dark:bg-indigo-900'
      default:
        return 'bg-gray-100 dark:bg-gray-700'
    }
  }

  /**
   * Format notification time
   */
  const formatNotificationTime = (createdAt: string) => {
    const now = new Date()
    const notificationTime = new Date(createdAt)
    const diffInMinutes = Math.floor((now.getTime() - notificationTime.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`
    
    return notificationTime.toLocaleDateString()
  }

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  /**
   * Initialize notifications
   */
  const initialize = async () => {
    await fetchNotifications()
    return startPolling()
  }

  return {
    // State
    notifications: readonly(toRef(state, 'notifications')),
    unreadCount: readonly(toRef(state, 'unreadCount')),
    isDropdownOpen: readonly(toRef(state, 'isDropdownOpen')),
    activePopup: activePopup, // Use the separate ref
    isLoading: readonly(toRef(state, 'isLoading')),
    
    // Actions
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllReadNotifications,
    showPopup,
    hidePopup,
    toggleDropdown,
    closeDropdown,
    startPolling,
    initialize,
    
    // Utilities
    getNotificationIcon,
    getNotificationColor,
    getIconBackgroundClass,
    formatNotificationTime,
    getPopupRemainingTime
  }
}
