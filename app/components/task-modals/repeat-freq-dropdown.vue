<template>
    <div class="flex flex-col gap-1">
        <label v-if="label" :class="labelClass">{{ label }}</label>
        <DropdownMenu>
            <DropdownMenuTrigger as-child>
                <Button variant="outline" :class="buttonClass" class="w-[13vw]">
                    <span :class="{ 'text-muted-foreground': !selectedFrequency }">
                        {{ selectedFrequencyLabel || placeholder }}
                    </span>
                    <ChevronDownIcon :class="iconClass" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent class="w-56" align="start">
                <DropdownMenuLabel>Repeat Frequency</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem v-for="frequency in frequencyOptions" :key="frequency.value" 
                        @click="selectFrequency(frequency)"
                        :class="{ 'bg-accent': selectedFrequency === frequency.value }">
                        <div class="flex items-center justify-between w-full">
                            <div class="flex items-center gap-2">
                                <div class="w-2 h-2 rounded-full" :class="frequency.colorClass"></div>
                                {{ frequency.label }}
                            </div>
                            <span v-if="frequency.description" class="text-xs text-muted-foreground">
                                {{ frequency.description }}
                            </span>
                        </div>
                    </DropdownMenuItem>
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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

interface FrequencyOption {
    value: string
    label: string
    colorClass: string
    description?: string
}

interface Props {
    modelValue?: string
    label?: string
    placeholder?: string
    compact?: boolean
    startDate?: Date | string | null
    dueDate?: Date | string | null
}

interface RecurrenceData {
    frequency: string
    nextOccurrenceDate: Date | null
    isRecurring: boolean
}

const props = withDefaults(defineProps<Props>(), {
    placeholder: 'Select frequency',
    label: 'Repeat',
    compact: false,
    startDate: null,
    dueDate: null
})

const emit = defineEmits<{
    'update:modelValue': [value: string]
    'recurrence-updated': [data: RecurrenceData]
}>()

// Recurrence state
const nextOccurrenceDate = ref<Date | null>(null)

const labelClass = computed(() =>
    props.compact ? 'text-xs font-medium' : 'text-sm font-medium'
)

const buttonClass = computed(() =>
    props.compact ? 'w-full justify-between h-8 px-2 text-xs' : 'w-full justify-between'
)

const iconClass = computed(() =>
    props.compact ? 'h-3 w-3' : 'h-4 w-4'
)

const frequencyOptions: FrequencyOption[] = [
    {
        value: 'never',
        label: 'Never',
        colorClass: 'bg-gray-400',
        description: 'One-time task'
    },
    {
        value: 'daily',
        label: 'Daily',
        colorClass: 'bg-blue-400',
        description: 'Every day'
    },
    {
        value: 'weekly',
        label: 'Weekly',
        colorClass: 'bg-green-400',
        description: 'Every week'
    },
    {
        value: 'monthly',
        label: 'Monthly',
        colorClass: 'bg-yellow-400',
        description: 'Every month'
    },
    {
        value: 'yearly',
        label: 'Yearly',
        colorClass: 'bg-purple-400',
        description: 'Every year'
    }
]

const selectedFrequency = computed({
    get: () => props.modelValue,
    set: (value: string) => emit('update:modelValue', value)
})

const selectedFrequencyLabel = computed(() => {
    const frequency = frequencyOptions.find(f => f.value === selectedFrequency.value)
    return frequency?.label || null
})

function selectFrequency(frequency: FrequencyOption) {
    selectedFrequency.value = frequency.value
    calculateNextOccurrence()
    emitRecurrenceData()
}

function calculateNextOccurrence() {
    if (!selectedFrequency.value || selectedFrequency.value === 'never') {
        nextOccurrenceDate.value = null
        return
    }

    const baseDate = getBaseDate()
    if (!baseDate) {
        nextOccurrenceDate.value = null
        return
    }

    const nextDate = calculateNextOccurrenceDate(new Date(baseDate))
    nextOccurrenceDate.value = nextDate
}

function getBaseDate(): Date | null {
    // Use due date if available, otherwise start date, otherwise today
    if (props.dueDate) {
        return new Date(props.dueDate)
    }
    if (props.startDate) {
        return new Date(props.startDate)
    }
    return new Date()
}

function calculateNextOccurrenceDate(baseDate: Date): Date {
    const nextDate = new Date(baseDate)
    
    switch (selectedFrequency.value) {
        case 'daily':
            nextDate.setDate(nextDate.getDate() + 1)
            break
        case 'weekly':
            nextDate.setDate(nextDate.getDate() + 7)
            break
        case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + 1)
            break
        case 'yearly':
            nextDate.setFullYear(nextDate.getFullYear() + 1)
            break
    }
    
    return nextDate
}

function emitRecurrenceData() {
    const data: RecurrenceData = {
        frequency: selectedFrequency.value || 'never',
        nextOccurrenceDate: nextOccurrenceDate.value,
        isRecurring: selectedFrequency.value !== 'never' && selectedFrequency.value !== undefined
    }
    emit('recurrence-updated', data)
}

// Watch for prop changes to recalculate dates
watch([() => props.startDate, () => props.dueDate], () => {
    if (selectedFrequency.value && selectedFrequency.value !== 'never') {
        calculateNextOccurrence()
        emitRecurrenceData()
    }
})

// Watch for frequency changes
watch(selectedFrequency, () => {
    if (selectedFrequency.value && selectedFrequency.value !== 'never') {
        calculateNextOccurrence()
        emitRecurrenceData()
    }
})
</script>