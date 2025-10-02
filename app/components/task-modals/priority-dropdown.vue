<template>
    <div class="flex flex-col gap-1">
        <label v-if="label" :class="labelClass">{{ label }}</label>
        <DropdownMenu>
            <DropdownMenuTrigger as-child>
                <Button variant="outline" :class="buttonClass" class="w-[13vw]">
                    <span :class="{ 'text-muted-foreground': !selectedPriority }">
                        {{ selectedPriorityDisplay || placeholder }}
                    </span>
                    <ChevronDownIcon :class="iconClass" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent class="w-56" align="start">
                <DropdownMenuLabel>Task Priority (1-10)</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem v-for="priority in priorityOptions" :key="priority.value" 
                        @click="handleSelectPriority(priority)"
                        :class="{ 'bg-accent': selectedPriority === priority.value }">
                        <div class="flex items-center gap-2 w-full">
                            <div class="w-2 h-2 rounded-full" :class="priority.colorClass"></div>
                            <span class="flex-1">Level {{ priority.level }}</span>
                            <span class="text-xs text-muted-foreground">{{ priority.label }}</span>
                        </div>
                    </DropdownMenuItem>
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ChevronDownIcon } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface PriorityOption {
    value: string
    label: string
    level: number
    colorClass: string
}

interface Props {
    modelValue?: string
    label?: string
    placeholder?: string
    compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    placeholder: 'Select priority',
    label: 'Priority',
    compact: false,
    modelValue: '1'
})

const labelClass = computed(() =>
    props.compact ? 'text-xs font-medium' : 'text-sm font-medium'
)

const buttonClass = computed(() =>
    props.compact ? 'w-full justify-between h-8 px-2 text-xs' : 'w-full justify-between'
)

const iconClass = computed(() =>
    props.compact ? 'h-3 w-3' : 'h-4 w-4'
)

const emit = defineEmits<{
    'update:modelValue': [value: string]
}>()

const priorityOptions: PriorityOption[] = [
    { value: '1', label: 'Lowest', level: 1, colorClass: 'bg-blue-400' },
    { value: '2', label: 'Very Low', level: 2, colorClass: 'bg-blue-500' },
    { value: '3', label: 'Low', level: 3, colorClass: 'bg-indigo-500' },
    { value: '4', label: 'Medium Low', level: 4, colorClass: 'bg-green-500' },
    { value: '5', label: 'Medium', level: 5, colorClass: 'bg-yellow-500' },
    { value: '6', label: 'Medium High', level: 6, colorClass: 'bg-orange-500' },
    { value: '7', label: 'High', level: 7, colorClass: 'bg-red-400' },
    { value: '8', label: 'Very High', level: 8, colorClass: 'bg-red-500' },
    { value: '9', label: 'Critical', level: 9, colorClass: 'bg-red-600' },
    { value: '10', label: 'Emergency', level: 10, colorClass: 'bg-purple-600' }
]

const selectedPriority = computed({
    get: () => props.modelValue,
    set: (value: string) => emit('update:modelValue', value)
})

const selectedPriorityDisplay = computed(() => {
    const priority = priorityOptions.find(p => p.value === selectedPriority.value)
    return priority ? `Level ${priority.level} (${ priority.label })` : ''
})

function handleSelectPriority(priority: PriorityOption) {
    selectedPriority.value = priority.value
}
</script>