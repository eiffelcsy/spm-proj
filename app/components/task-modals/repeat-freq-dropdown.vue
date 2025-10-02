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
                        <div class="flex items-center gap-2">
                            <div class="w-2 h-2 rounded-full" :class="frequency.colorClass"></div>
                            {{ frequency.label }}
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

interface FrequencyOption {
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
    placeholder: 'Select frequency',
    label: 'Repeat',
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

const frequencyOptions: FrequencyOption[] = [
    {
        value: 'never',
        label: 'Never',
        colorClass: 'bg-gray-400'
    },
    {
        value: 'daily',
        label: 'Daily',
        colorClass: 'bg-blue-400'
    },
    {
        value: 'weekly',
        label: 'Weekly',
        colorClass: 'bg-green-400'
    },
    {
        value: 'monthly',
        label: 'Monthly',
        colorClass: 'bg-yellow-400'
    },
    {
        value: 'yearly',
        label: 'Yearly',
        colorClass: 'bg-purple-400'
    }
]

const selectedFrequency = computed({
    get: () => props.modelValue,
    set: (value: string) => emit('update:modelValue', value)
})

const selectedFrequencyLabel = computed(() => {
    const frequency = frequencyOptions.find(f => f.value === selectedFrequency.value)
    return frequency?.label
})

function selectFrequency(frequency: FrequencyOption) {
    selectedFrequency.value = frequency.value
}
</script>