<template>
  <div class="p-3">
    <div class="flex items-center justify-between mb-4">
      <select 
        v-model="selectedMonth" 
        class="text-sm font-medium bg-transparent border-0 focus:outline-none cursor-pointer"
        @change="updateCalendar"
      >
        <option v-for="(month, index) in months" :key="index" :value="index">
          {{ month }}
        </option>
      </select>
      
      <select 
        v-model="selectedYear" 
        class="text-sm font-medium bg-transparent border-0 focus:outline-none cursor-pointer ml-2"
        @change="updateCalendar"
      >
        <option v-for="year in years" :key="year" :value="year">
          {{ year }}
        </option>
      </select>
    </div>

    <div class="grid grid-cols-7 gap-1 mb-2">
      <div 
        v-for="day in ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']" 
        :key="day"
        class="text-xs text-center text-muted-foreground font-medium p-2"
      >
        {{ day }}
      </div>
    </div>

    <div class="grid grid-cols-7 gap-1">
      <button
        v-for="date in calendarDates"
        :key="`${date.year}-${date.month}-${date.day}`"
        type="button"
        @click="selectDate(date)"
        :disabled="date.disabled"
        :class="[
          'h-8 w-8 text-sm rounded-md flex items-center justify-center transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          {
            'text-muted-foreground': !date.isCurrentMonth,
            'bg-primary text-primary-foreground': date.isSelected,
            'bg-accent text-accent-foreground': date.isToday && !date.isSelected,
            'cursor-not-allowed opacity-50': date.disabled,
            'cursor-pointer': !date.disabled
          }
        ]"
      >
        {{ date.day }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'

interface CalendarDate {
  day: number
  month: number
  year: number
  isCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
  disabled: boolean
  date: Date
}

interface Props {
  mode?: 'single'
  selected?: Date
  captionLayout?: 'dropdown'
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'single',
  captionLayout: 'dropdown'
})

const emit = defineEmits<{
  select: [date: Date | undefined]
}>()

const selectedMonth = ref(new Date().getMonth())
const selectedYear = ref(new Date().getFullYear())

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const years = computed(() => {
  const currentYear = new Date().getFullYear()
  const startYear = currentYear - 10
  const endYear = currentYear + 10
  return Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i)
})

const calendarDates = ref<CalendarDate[]>([])

const today = new Date()
today.setHours(0, 0, 0, 0)

function updateCalendar() {
  const firstDay = new Date(selectedYear.value, selectedMonth.value, 1)
  const lastDay = new Date(selectedYear.value, selectedMonth.value + 1, 0)
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - firstDay.getDay())
  
  const dates: CalendarDate[] = []
  const currentDate = new Date(startDate)
  
  // Generate 42 days (6 weeks x 7 days) to fill the calendar grid
  for (let i = 0; i < 42; i++) {
    const isCurrentMonth = currentDate.getMonth() === selectedMonth.value
    const isToday = currentDate.getTime() === today.getTime()
    const isSelected = props.selected ? currentDate.getTime() === props.selected.getTime() : false
    
    dates.push({
      day: currentDate.getDate(),
      month: currentDate.getMonth(),
      year: currentDate.getFullYear(),
      isCurrentMonth,
      isToday,
      isSelected,
      disabled: false,
      date: new Date(currentDate)
    })
    
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  calendarDates.value = dates
}

function selectDate(date: CalendarDate) {
  if (date.disabled) return
  emit('select', date.date)
}

// Initialize calendar when selected date changes
watch(() => props.selected, (newSelected) => {
  if (newSelected) {
    selectedMonth.value = newSelected.getMonth()
    selectedYear.value = newSelected.getFullYear()
  }
  updateCalendar()
}, { immediate: false })

// Update calendar when month/year changes
watch([selectedMonth, selectedYear], updateCalendar)

onMounted(() => {
  if (props.selected) {
    selectedMonth.value = props.selected.getMonth()
    selectedYear.value = props.selected.getFullYear()
  }
  updateCalendar()
})
</script>
