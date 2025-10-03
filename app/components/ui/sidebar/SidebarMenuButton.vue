<script setup lang="ts">
import type { SidebarMenuButtonProps } from "./SidebarMenuButtonChild.vue"
import SidebarMenuButtonChild from "./SidebarMenuButtonChild.vue"

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<SidebarMenuButtonProps>(), {
  as: "button",
  variant: "default",
  size: "default",
})
</script>

<template>
  <SidebarMenuButtonChild v-bind="{ ...props, ...$attrs }">
    <slot />
  </SidebarMenuButtonChild>
</template>
