/**
 * Notification composable for managing in-app notifications
 * 
 * This composable provides:
 * - Real-time notification state management
 * - Notification popup display
 * - Notification history management
 * - Auto-fade functionality
 * - Real-time updates via Supabase subscriptions
 */

import type { NotificationWithRelations, NotificationType } from '~/types'
import type { RealtimeChannel } from '@supabase/supabase-js'

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

// Global realtime subscription channel
let globalRealtimeChannel: RealtimeChannel | null = null

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
        method: 'DELETE' as any
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
   * Setup Supabase realtime subscription for notifications
   */
  const setupRealtimeSubscription = async () => {
    const supabase = useSupabaseClient()
    const user = useSupabaseUser()
    
    if (!user.value) {
      console.warn('Cannot setup realtime subscription: user not authenticated')
      return () => {}
    }

    // Get current user's staff ID
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('id')
      .eq('user_id', user.value.id)
      .single()

    if (staffError || !staffData) {
      console.error('Failed to fetch staff ID for realtime subscription:', staffError)
      return () => {}
    }

    const currentStaffId = (staffData as { id: number }).id

    // Cleanup existing subscription if any
    if (globalRealtimeChannel) {
      await supabase.removeChannel(globalRealtimeChannel)
      globalRealtimeChannel = null
    }

    // Create a new channel for this user's notifications
    const channel = supabase
      .channel(`notifications:staff_id=eq.${currentStaffId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `staff_id=eq.${currentStaffId}`
        },
        async (payload) => {
          console.log('New notification received:', payload.new)
          
          // Fetch the full notification with relations
          const { data: newNotification, error } = await supabase
            .from('notifications')
            .select(`
              *,
              triggered_by:triggered_by_staff_id (
                id,
                fullname
              ),
              related_task:related_task_id (
                id,
                title,
                project_id
              ),
              related_project:related_project_id (
                id,
                name
              )
            `)
            .eq('id', payload.new.id)
            .single()

          if (!error && newNotification) {
            const notification = newNotification as NotificationWithRelations
            
            // Check if notification already exists (prevent duplicates)
            const existingIndex = state.notifications.findIndex(n => n.id === notification.id)
            if (existingIndex === -1) {
              // Add to notifications list
              state.notifications = [notification, ...state.notifications]
              
              // Show popup for new notification and update unread count
              if (!notification.deleted_at) {
                showPopup(notification)
                if (!notification.is_read) {
                  state.unreadCount++
                }
              }
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `staff_id=eq.${currentStaffId}`
        },
        (payload) => {
          console.log('Notification updated:', payload.new)
          
          // Update the notification in the list
          const index = state.notifications.findIndex(n => n.id === payload.new.id)
          if (index !== -1) {
            const oldNotification = state.notifications[index]
            if (oldNotification) {
              const wasRead = oldNotification.is_read
              const isNowRead = (payload.new as any).is_read
              
              // Update the notification
              state.notifications[index] = {
                ...oldNotification,
                ...(payload.new as any)
              }
              
              // Update unread count if read status changed
              if (!wasRead && isNowRead) {
                state.unreadCount = Math.max(0, state.unreadCount - 1)
              } else if (wasRead && !isNowRead) {
                state.unreadCount++
              }
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `staff_id=eq.${currentStaffId}`
        },
        (payload) => {
          console.log('Notification deleted:', payload.old)
          
          // Remove from notifications list
          const notification = state.notifications.find(n => n.id === payload.old.id)
          if (notification) {
            state.notifications = state.notifications.filter(n => n.id !== payload.old.id)
            if (!notification.is_read) {
              state.unreadCount = Math.max(0, state.unreadCount - 1)
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Notification subscription status:', status)
      })

    // Store the channel globally for cleanup
    globalRealtimeChannel = channel

    // Return cleanup function
    return async () => {
      if (globalRealtimeChannel) {
        await supabase.removeChannel(globalRealtimeChannel)
        globalRealtimeChannel = null
      }
    }
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
    return setupRealtimeSubscription()
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
    initialize,
    
    // Utilities
    getNotificationIcon,
    getNotificationColor,
    getIconBackgroundClass,
    formatNotificationTime,
    getPopupRemainingTime
  }
}
