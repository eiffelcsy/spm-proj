<template>
    <div class="flex flex-col gap-1">
        <label v-if="label" :class="labelClass">{{ label }}</label>
        <DropdownMenu>
            <DropdownMenuTrigger as-child>
                <Button variant="outline" :class="buttonClass">
                    <span :class="{ 'text-muted-foreground': !selectedAssignee }">
                        {{ selectedAssigneeLabel || placeholder }}
                    </span>
                    <ChevronDownIcon :class="iconClass" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent class="w-64" align="start">
                <DropdownMenuLabel>Assign To</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem @click="selectAssignee('')" :class="{ 'bg-accent': selectedAssignee === '' }">
                        <div class="flex items-center gap-2">
                            <div class="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                                ?
                            </div>
                            <span class="text-muted-foreground italic">Unassigned</span>
                        </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator v-if="staffMembers.length > 0" />
                    <DropdownMenuItem v-for="staff in staffMembers" :key="staff.id"
                        @click="selectAssignee(staff.id.toString())"
                        :class="{ 'bg-accent': selectedAssignee === staff.id.toString() }">
                        <div class="flex items-center gap-2">
                            <div
                                class="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
                                {{ getInitials(staff.name) }}
                            </div>
                            <div class="flex flex-col">
                                <span class="font-medium">{{ staff.name }}</span>
                                <span class="text-xs text-muted-foreground">{{ staff.email }}</span>
                            </div>
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
    modelValue?: string
    label?: string
    placeholder?: string
    staffMembers?: StaffMember[]
    compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    placeholder: 'Select assignee',
    label: 'Assign To',
    staffMembers: () => [],
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

const selectedAssignee = computed({
    get: () => props.modelValue,
    set: (value: string) => emit('update:modelValue', value)
})

const selectedAssigneeLabel = computed(() => {
    if (!selectedAssignee.value) return null
    const staff = props.staffMembers.find(s => s.id.toString() === selectedAssignee.value)
    return staff ? `${staff.name} (${staff.email})` : null
})

function selectAssignee(id: string) {
    selectedAssignee.value = id
}

function getInitials(name: string): string {
    return name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .join('')
        .slice(0, 2)
}
</script>
