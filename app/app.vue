<template>
  <div>
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

const navigateToTask = (taskId: number) => {
  router.push(`/task/${taskId}`)
}

// Store cleanup function
let cleanupSubscription: (() => Promise<void> | void) | null = null

// Initialize notifications when app starts
onMounted(async () => {
  cleanupSubscription = await initialize()
})

// Cleanup subscription when component unmounts
onBeforeUnmount(async () => {
  if (cleanupSubscription) {
    await cleanupSubscription()
  }
})
</script>
