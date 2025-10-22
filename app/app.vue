<template>
  <div>
    <!-- Loading overlay for auth callback -->
    <div v-if="isProcessingAuth" class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div class="flex flex-col items-center gap-4">
        <svg class="animate-spin h-12 w-12 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="text-lg font-medium">Confirming your account...</p>
      </div>
    </div>

    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    
    <!-- Global Notification Popup -->
    <NotificationPopup 
      :notification="activePopup" 
      @hide="hidePopup"
      @navigate-to-task="navigateToTask"
    />
  </div>
</template>

<script setup lang="ts">
import { NotificationPopup } from "~/components/notification-modals"

const notifications = useNotifications()
const { hidePopup, initialize, activePopup } = notifications
const router = useRouter()
const supabase = useSupabaseClient()
const isProcessingAuth = ref(false)

const navigateToTask = (taskId: number) => {
  router.push(`/task/${taskId}`)
}

// Store cleanup function
let cleanupSubscription: (() => Promise<void> | void) | null = null

// Handle auth callback from email confirmation
const handleAuthCallback = async () => {
  const hash = window.location.hash
  
  // Check if URL contains auth tokens (from email confirmation)
  if (hash && hash.includes('access_token')) {
    isProcessingAuth.value = true
    try {
      // Extract tokens from URL hash
      const hashParams = new URLSearchParams(hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const type = hashParams.get('type')
      
      if (accessToken && refreshToken) {
        // Set the session with the tokens from the URL
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        
        if (!error) {
          // Clear the hash from URL
          window.history.replaceState(null, '', window.location.pathname)
          
          // Redirect based on the type of callback
          if (type === 'signup') {
            // Redirect to dashboard after successful email confirmation
            await router.push('/personal/dashboard')
          } else {
            // For other types (recovery, etc.), redirect to appropriate page
            await router.push('/personal/dashboard')
          }
        } else {
          console.error('Error setting session:', error)
          await router.push('/login')
        }
      }
    } catch (error) {
      console.error('Error handling auth callback:', error)
      await router.push('/login')
    } finally {
      isProcessingAuth.value = false
    }
  }
}

// Initialize notifications and handle auth callback when app starts
onMounted(async () => {
  await handleAuthCallback()
  cleanupSubscription = await initialize()
})

// Cleanup subscription when component unmounts
onBeforeUnmount(async () => {
  if (cleanupSubscription) {
    await cleanupSubscription()
  }
})
</script>
