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

<script setup>
import { NotificationPopup } from "~/components/notification-modals"

const notifications = useNotifications()
const { hidePopup, initialize, activePopup } = notifications
const router = useRouter()

const navigateToTask = (taskId) => {
  router.push(`/task/${taskId}`)
}

// Initialize notifications when app starts
onMounted(async () => {
  await initialize()
})
</script>
