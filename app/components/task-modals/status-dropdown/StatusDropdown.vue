<template>
    <div class="flex flex-col gap-1">
        <label v-if="label" :class="labelClass">{{ label }}</label>
        <DropdownMenu>
            <DropdownMenuTrigger as-child>
                <Button variant="outline" :class="buttonClass" class="w-[13vw]">
                    <span :class="{ 'text-muted-foreground': !selectedStatus }">
                        {{ selectedStatusLabel || placeholder }}
                    </span>
                    <ChevronDownIcon :class="iconClass" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent class="w-56" align="start">
                <DropdownMenuLabel>Task Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem v-for="status in statusOptions" :key="status.value" @click="selectStatus(status)"
                        :class="{ 'bg-accent': selectedStatus === status.value }">
                        <div class="flex items-center gap-2">
                            <div class="w-2 h-2 rounded-full" :class="status.colorClass"></div>
                            {{ status.label }}
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

interface StatusOption {
    value: string
    label: string
    colorClass: string
}

interface Props {
    modelValue?: string
    label?: string
    placeholder?: string
    compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    placeholder: 'Select status',
    label: 'Status',
    compact: false
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

const statusOptions: StatusOption[] = [
    {
        value: 'not-started',
        label: 'Not Started',
        colorClass: 'bg-red-500'
    },
    {
        value: 'in-progress',
        label: 'In Progress',
        colorClass: 'bg-yellow-500'
    }
]

const selectedStatus = computed({
    get: () => props.modelValue,
    set: (value: string) => emit('update:modelValue', value)
})

const selectedStatusLabel = computed(() => {
    const status = statusOptions.find(s => s.value === selectedStatus.value)
    return status?.label
})

function selectStatus(status: StatusOption) {
    selectedStatus.value = status.value
}
</script>
