import { h } from 'vue'
import { CheckCircledIcon} from '@radix-icons/vue'
import { CircleIcon } from '@radix-icons/vue'
import { CrossCircledIcon } from '@radix-icons/vue'
import { QuestionMarkCircledIcon } from '@radix-icons/vue'
import { StopwatchIcon } from '@radix-icons/vue'

export const statuses = [
  {
    value: 'not-started',
    label: 'Not Started',
    icon: h(CircleIcon),
  },
  {
    value: 'in-progress',
    label: 'In Progress',
    icon: h(StopwatchIcon),
  },
  {
    value: 'completed',
    label: 'Completed',
    icon: h(CheckCircledIcon),
  },
]