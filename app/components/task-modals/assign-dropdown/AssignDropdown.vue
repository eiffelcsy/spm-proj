<template>
    <div class="flex flex-col gap-1">
        <label v-if="label" :class="labelClass">{{ label }}</label>
        <DropdownMenu>
            <DropdownMenuTrigger as-child>
                <Button variant="outline" :class="buttonClass">
                    <span :class="{ 'text-muted-foreground': !selectedAssignees.length }">
                        <template v-if="selectedAssignees.length">
                            <span v-for="staff in selectedStaff" :key="staff.id" class="inline-flex items-center mr-2">
                                <span class="font-medium">{{ staff.name }}</span>
                                <span class="text-xs text-muted-foreground ml-1">({{ staff.email }})</span>
                            </span>
                        </template>
                        <template v-else>
                            {{ placeholder }}
                        </template>
                    </span>
                    <ChevronDownIcon :class="iconClass" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent class="w-64" align="start">
                <DropdownMenuLabel>Assign To</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem @click="toggleAssignee('')" :class="{ 'bg-accent': selectedAssignees.length === 0 }">
                        <div class="flex items-center gap-2">
                            <div class="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                                ?
                            </div>
                            <span class="text-muted-foreground italic">Unassigned</span>
                        </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator v-if="staffMembers.length > 0" />
                    <DropdownMenuItem v-for="staff in staffMembers" :key="staff.id"
                        @click="toggleAssignee(staff.id.toString())"
                        :class="{ 'bg-accent': selectedAssignees.includes(staff.id.toString()) }">
                        <div class="flex items-center gap-2">
                            <div
                                class="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
                                {{ getInitials(staff.name) }}
                            </div>
                            <div class="flex flex-col">
                                <span class="font-medium">{{ staff.name }}</span>
                                <span class="text-xs text-muted-foreground">{{ staff.email }}</span>
                            </div>
                            <span v-if="selectedAssignees.includes(staff.id.toString())" class="ml-auto text-blue-600 font-bold">✓</span>
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

interface StaffMember {
    id: number
    name: string
    email: string
}

interface Props {
    modelValue?: string[]
    label?: string
    placeholder?: string
    staffMembers?: StaffMember[]
    compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    placeholder: 'Select assignees',
    label: 'Assign To',
    staffMembers: () => [],
    compact: false,
    modelValue: () => []
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
    'update:modelValue': [value: string[]]
}>()

const selectedAssignees = computed({
    get: () => props.modelValue ?? [],
    set: (value: string[]) => emit('update:modelValue', value)
})

const selectedStaff = computed(() =>
    props.staffMembers.filter(s => selectedAssignees.value.includes(s.id.toString()))
)

function toggleAssignee(id: string) {
    if (id === '') {
        selectedAssignees.value = []
        return
    }
    const idx = selectedAssignees.value.indexOf(id)
    if (idx === -1) {
        selectedAssignees.value = [...selectedAssignees.value, id]
    } else {
        const updated = [...selectedAssignees.value]
        updated.splice(idx, 1)
        selectedAssignees.value = updated
    }
}

function getInitials(name: string): string {
    return name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .join('')
        .slice(0, 2)
}
</script>