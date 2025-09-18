<template>
    <div class="flex flex-col gap-3">
        <Label v-if="label" :for="inputId" class="px-1">
            {{ label }}
        </Label>
        <Popover v-model:open="open">
            <PopoverTrigger as-child>
                <Button variant="outline" :id="inputId" class="w-48 justify-between font-normal" type="button">
                    {{ selectedDate ? formatDate(selectedDate) : placeholder }}
                    <ChevronDownIcon class="h-4 w-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent class="w-auto overflow-hidden p-0" align="start">
                <Calendar mode="single" :selected="selectedDate" caption-layout="dropdown" @select="onDateSelect" />
            </PopoverContent>
        </Popover>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ChevronDownIcon } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Label } from '@/components/ui/label'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'

interface Props {
    modelValue?: Date | string
    label?: string
    placeholder?: string
    id?: string
}

const props = withDefaults(defineProps<Props>(), {
    placeholder: 'Select date',
    label: 'Date'
})

const emit = defineEmits<{
    'update:modelValue': [value: Date | string | undefined]
}>()

const open = ref(false)
const inputId = computed(() => props.id || `date-picker-${Math.random().toString(36).substr(2, 9)}`)

const selectedDate = computed({
    get: () => {
        if (!props.modelValue) return undefined
        if (props.modelValue instanceof Date) return props.modelValue
        return new Date(props.modelValue)
    },
    set: (value: Date | undefined) => {
        if (value) {
            // If the parent expects a string (like for form inputs), convert to ISO date string
            if (typeof props.modelValue === 'string') {
                emit('update:modelValue', value.toISOString().split('T')[0])
            } else {
                emit('update:modelValue', value)
            }
        } else {
            emit('update:modelValue', undefined)
        }
    }
})

function onDateSelect(date: Date | undefined) {
    selectedDate.value = date
    open.value = false
}

function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    })
}
</script>
