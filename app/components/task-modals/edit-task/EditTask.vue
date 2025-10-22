<template>
  <Dialog :open="open" @update:open="handleClose">
    <DialogContent class="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{{
          isSubtask ? "Edit Subtask" : "Edit Task"
        }}</DialogTitle>
        <DialogDescription> Update the task details below. </DialogDescription>
      </DialogHeader>

      <form @submit.prevent="updateTask" class="space-y-4">
        <!-- Title -->
        <div>
          <Label class="block text-sm font-medium mb-1">Task Title</Label>
          <Input v-model="title" type="text" required
            class="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Task Title" />
        </div>

        <!-- Start Date & Due Date -->
        <div class="grid grid-cols-3 gap-4">
          <!-- Start Date -->
          <div class="flex flex-col gap-1 justify-end">
            <Label class="mb-1"> Start Date </Label>
            <Popover>
              <PopoverTrigger as-child>
                <Button variant="outline" :class="cn(
                  'w-full justify-start text-left font-normal',
                  !startDate && 'text-muted-foreground'
                )
                  ">
                  <CalendarIcon class="mr-2 h-4 w-4" />
                  {{
                    startDate
                      ? formatDate(startDate as DateValue)
                      : "Select start date"
                  }}
                </Button>
              </PopoverTrigger>
              <PopoverContent class="w-auto p-0">
                <Calendar v-model:model-value="startDate as any" initial-focus />
              </PopoverContent>
            </Popover>
          </div>
          <!-- Due Date -->
          <div class="flex flex-col gap-1 justify-end">
            <Label class="mb-1">
              Due Date
              <span v-if="repeatInterval > 0" class="text-xs text-muted-foreground ml-1">(Auto-set)</span>
            </Label>
            <Popover :disabled="repeatInterval > 0">
              <PopoverTrigger as-child>
                <Button variant="outline" :class="cn(
                  'w-full justify-start text-left font-normal',
                  !dueDate && 'text-muted-foreground',
                  repeatInterval > 0 && 'opacity-60 cursor-not-allowed'
                )" :disabled="repeatInterval > 0">
                  <CalendarIcon class="mr-2 h-4 w-4" />
                  {{
                    dueDate
                      ? formatDate(dueDate as DateValue)
                      : "Select due date"
                  }}
                </Button>
              </PopoverTrigger>
              <PopoverContent class="w-auto p-0">
                <Calendar v-model:model-value="dueDate as any" initial-focus :min-value="startDate as any" />
              </PopoverContent>
            </Popover>
            <p v-if="repeatInterval > 0" class="text-xs text-muted-foreground mt-1">
              Due date is automatically set to {{ repeatInterval }} day(s) from start date
            </p>
          </div>

          <!-- Status -->
          <div class="flex flex-col gap-1">
            <Label class="mb-1">Status</Label>
            <Select v-model="status">
              <SelectTrigger class="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not-started">Not Started</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- Priority -->
          <div class="flex flex-col gap-1">
            <Label class="mb-1">Priority</Label>
            <NumberField v-model="priority" :min="1" :max="10" :default-value="1">
              <NumberFieldContent>
                <NumberFieldDecrement />
                <NumberFieldInput />
                <NumberFieldIncrement />
              </NumberFieldContent>
            </NumberField>
          </div>

          <!-- Repeat Interval -->
          <div class="flex flex-col gap-1">
            <Label class="mb-1">Repeat Interval (in Days)</Label>
            <NumberField v-model="repeatInterval" :min="0" :default-value="0">
              <NumberFieldContent>
                <NumberFieldDecrement />
                <NumberFieldInput />
                <NumberFieldIncrement />
              </NumberFieldContent>
            </NumberField>
          </div>

          <div v-if="task.project">
          <Label class="block text-sm font-medium mb-1">Project Title</Label>
          <Input v-model="task.project.name" type="text" 
            class="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            readonly/>
          </div>
        </div>

        <!-- Project Link (if task belongs to a project) -->
        <!-- <div v-if="task.project" class="flex items-center space-x-2">
          <FolderIcon class="h-4 w-4 text-muted-foreground" />
          <Label class="block text-sm font-medium mb-1">Project Title</Label>
          <div variant="link" class="h-auto p-0 text-sm font-medium text-primary hover:underline"> {{ task.project.name}} </div>
        </div> -->
      
        <!-- Tags -->
        <div>
          <Label class="block text-sm font-medium mb-1">Tags</Label>
          <TagsInput v-model="tags" class="w-full">
            <TagsInputItem v-for="tag in tags" :key="tag" :value="tag">
              <TagsInputItemText />
              <TagsInputItemDelete />
            </TagsInputItem>
            <TagsInputInput placeholder="Add tags (eg. #SMU, #Urgent)" />
          </TagsInput>
          <p class="text-xs text-muted-foreground mt-1">Place a # before each tag (eg. #SMU) and press the Enter key to add a tag</p>
        </div>

        <div class="flex flex-col gap-1">
          <AssignCombobox v-model="assignedTo" label="Assign To" placeholder="Select assignees"
            :staff-members="staffMembers" compact />
        </div>

        <!-- Notes -->
        <div class="flex flex-col gap-1">
          <Label class="mb-1"> Notes / Description </Label>
          <Textarea v-model="description" rows="3" class="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="Add notes here..."></Textarea>
        </div>

        <!-- Subtasks  -->
        <div>
          <Label class="block text-sm font-medium mb-2">Subtasks</Label>
          <div class="border rounded-lg p-3 mb-3">
            <div v-for="(subtask, index) in subtasks" :key="index" class="border rounded-lg p-3 mb-3">
              <div class="flex gap-2 mb-2">
                <Input v-model="subtask.title" type="text" placeholder="Subtask Title"
                  class="flex-1 border rounded-lg px-3 py-2 bg-white" required />
                <Button type="button" @click="toggleSubtaskExpanded(index)" variant="outline" class="px-3 py-2"
                  :title="subtask.expanded ? 'Collapse details' : 'Expand details'">
                  <span class="inline-block transition-transform duration-200"
                    :class="{ '-rotate-90': !subtask.expanded }">▼</span> Details
                </Button>
                <Button type="button" @click="removeSubtask(index)" variant="destructive" class="px-2">
                  <XIcon class="h-4 w-4" />
                </Button>
              </div>

              <div v-if="subtask.expanded" class="space-y-3 mt-3 pl-4">
                <div class="grid grid-cols-2 gap-2">
                  <div class="flex flex-col gap-1">
                    <Label class="text-xs mb-1">Start Date</Label>
                    <Popover>
                      <PopoverTrigger as-child>
                        <Button variant="outline" :class="cn(
                          'h-8 justify-start text-left font-normal text-xs',
                          !subtask.startDate && 'text-muted-foreground',
                        )">
                          <CalendarIcon class="mr-1 h-3 w-3" />
                          {{ subtask.startDate ? formatDate(subtask.startDate as DateValue) : "Select start date" }}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent class="w-auto p-0">
                        <Calendar v-model:model-value="subtask.startDate as any" initial-focus />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div class="flex flex-col gap-1">
                    <Label class="text-xs mb-1">
                      Due Date
                      <span v-if="subtask.repeatInterval > 0" class="text-xs text-muted-foreground ml-1">(Auto-set)</span>
                    </Label>
                    <Popover :disabled="subtask.repeatInterval > 0">
                      <PopoverTrigger as-child>
                        <Button variant="outline" :class="cn(
                          'h-8 justify-start text-left font-normal text-xs',
                          !subtask.dueDate && 'text-muted-foreground',
                          subtask.repeatInterval > 0 && 'opacity-60 cursor-not-allowed'
                        )" :disabled="subtask.repeatInterval > 0">
                          <CalendarIcon class="mr-1 h-3 w-3" />
                          {{ subtask.dueDate ? formatDate(subtask.dueDate as DateValue) : "Select due date" }}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent class="w-auto p-0">
                        <Calendar v-model:model-value="subtask.dueDate as any" initial-focus :min-value="subtask.startDate as any" />
                      </PopoverContent>
                    </Popover>
                    <p v-if="subtask.repeatInterval > 0" class="text-[10px] text-muted-foreground mt-0.5">
                      Auto-set to {{ subtask.repeatInterval }} day(s) from start
                    </p>
                  </div>
                </div>

                <div class="grid grid-cols-3 gap-2">
                  <div class="flex flex-col gap-1">
                    <Label class="text-xs mb-1">Status</Label>
                    <Select v-model="subtask.status">
                      <SelectTrigger class="h-8">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not-started">Not Started</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="blocked">Blocked</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div class="flex flex-col gap-1">
                    <Label class="text-xs mb-1">Priority</Label>
                    <NumberField v-model="subtask.priority" :min="1" :max="10" :default-value="1" class="h-8">
                      <NumberFieldContent>
                        <NumberFieldDecrement />
                        <NumberFieldInput class="text-xs" />
                        <NumberFieldIncrement />
                      </NumberFieldContent>
                    </NumberField>
                  </div>
                  <div class="flex flex-col gap-1">
                    <Label class="text-xs mb-1">Repeat Interval (in Days)</Label>
                    <NumberField v-model="subtask.repeatInterval" :min="0" :default-value="0" class="h-8">
                      <NumberFieldContent>
                        <NumberFieldDecrement />
                        <NumberFieldInput class="text-xs" />
                        <NumberFieldIncrement />
                      </NumberFieldContent>
                    </NumberField>
                  </div>
                </div>

                <div>
                  <Label class="block text-xs font-medium mb-1">Tags</Label>
                  <TagsInput v-model="subtask.tags" class="w-full">
                    <TagsInputItem v-for="tag in subtask.tags" :key="tag" :value="tag">
                      <TagsInputItemText />
                      <TagsInputItemDelete />
                    </TagsInputItem>
                    <TagsInputInput placeholder="Add tags (eg. #SMU, #Urgent)" />
                  </TagsInput>
                </div>

                <div class="flex flex-col gap-1 text-xs">
                  <AssignCombobox v-model="subtask.assignedTo" label="Assign To" placeholder="Select assignee"
                    :staff-members="staffMembers.filter(s => assignedTo.includes(String(s.id)))" compact />
                </div>

                <div class="flex flex-col gap-1">
                  <Label class="text-xs mb-1">Notes</Label>
                  <Textarea v-model="subtask.notes" rows="2" placeholder="Add subtask notes here..."
                    class="w-full border rounded-lg px-2 py-1 text-sm bg-white"></Textarea>
                </div>
              </div>
            </div>
            <Button variant="outline" @click="addSubtask">
              <PlusIcon class="h-4 w-4 mr-2" />
              Add Subtask
            </Button>
          </div>
        </div>

        <DialogFooter class="gap-2">
          <Button variant="outline" @click="$emit('update:open', false)">
            Cancel
          </Button>
          <Button type="submit">
            {{ isSubtask ? "Update Subtask" : "Update Task" }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "~/components/ui/input";
import type { CalendarDate, DateValue } from "@internationalized/date";
import { parseDate, getLocalTimeZone, today } from "@internationalized/date";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import { CalendarIcon, XIcon, PlusIcon } from 'lucide-vue-next'
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  NumberField,
  NumberFieldContent,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/components/ui/number-field";
import { Textarea } from "@/components/ui/textarea";
import { TagsInput, TagsInputInput, TagsInputItem, TagsInputItemDelete, TagsInputItemText } from "@/components/ui/tags-input";
import { AssignCombobox } from "@/components/task-modals/assign-combobox";

const supabase = useSupabaseClient();
const user = useSupabaseUser();

// Define the task update type to match your database schema
interface TaskUpdate {
  task_name: string;
  start_date: string;
  end_date: string | null;
  status: string;
  notes: string | null;
  assignee_id: number | null;
}

interface Props {
  open?: boolean;
  task?: any | null;
  isSubtask?: boolean;
}

interface Emits {
  (e: "update:open", value: boolean): void;
  (e: "task-updated", task: any): void;
}

const props = withDefaults(defineProps<Props>(), {
  open: false,
  task: null,
  isSubtask: false,
});

const emit = defineEmits<Emits>();

// Form state
const todayDate = today(getLocalTimeZone());
const title = ref("");
const startDate = ref<DateValue>(todayDate);
const dueDate = ref<DateValue | undefined>(todayDate);
const status = ref("not-started");
const priority = ref(1);
const repeatInterval = ref(0);
const description = ref("");
const tags = ref<string[]>([]);
const assignedTo = ref<string[]>([]);
const subtasks = ref<{
  title: string;
  startDate: DateValue | undefined;
  dueDate: DateValue | undefined;
  status: string;
  priority: number;
  repeatInterval: number;
  notes: string;
  tags: string[];
  assignedTo: string[];
  expanded: boolean;
}[]>([])
const staffMembers = ref<{ id: number; fullname: string; email: string }[]>([]);

// projects dropdown
const projects = ref<{ id: number; name: string }[]>([])
const selectedProjectId = ref<string>('')
// feedback state
const successMessage = ref("");
const errorMessage = ref("");

// Watch for modal open and populate form with existing task data
watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen && props.task) {
      console.log("EditTask: Modal opened with task:", props.task);
      try {
        const staffData = await $fetch<
          { id: number; fullname: string; email?: string }[]
        >("/api/staff");

        staffMembers.value = staffData.map((staff) => ({
          id: staff.id,
          fullname: staff.fullname,
          email:
            staff.email ||
            `${staff.fullname
              .toLowerCase()
              .replace(/\s+/g, ".")}@needtochangethiscode.com`,
        }));
      } catch (err) {
        console.error("Failed to load staff", err);
        staffMembers.value = []; // fallback to empty array
      }

      // Populate form with existing task data
      populateForm();
    }
  }
);

// Load projects
try {
  const fetchedProjects = await $fetch('/api/projects');
  projects.value = Array.isArray(fetchedProjects)
    ? fetchedProjects.map((p: any) => ({ id: p.id, name: p.name }))
    : [];
} catch (err) {
  projects.value = [];
}

// Watch for repeat interval changes to auto-set due date
watch(repeatInterval, (newInterval) => {
  if (newInterval > 0 && startDate.value) {
    // Automatically set due date to start date + repeat interval days
    const startDateJs = startDate.value.toDate(getLocalTimeZone())
    const dueDateJs = new Date(startDateJs.getTime() + (newInterval * 24 * 60 * 60 * 1000))
    const dateString = dueDateJs.toISOString().split('T')[0]
    dueDate.value = parseDate(dateString)
  }
})

// Watch for start date changes to update due date if repeat interval is set
watch(startDate, (newStartDate) => {
  if (repeatInterval.value > 0 && newStartDate) {
    // Automatically update due date based on repeat interval
    const startDateJs = newStartDate.toDate(getLocalTimeZone())
    const dueDateJs = new Date(startDateJs.getTime() + (repeatInterval.value * 24 * 60 * 60 * 1000))
    const dateString = dueDateJs.toISOString().split('T')[0]
    dueDate.value = parseDate(dateString)
  } else if (
    dueDate.value &&
    newStartDate &&
    dueDate.value.compare(newStartDate as DateValue) < 0
  ) {
    dueDate.value = undefined;
  }
});

const handleClose = () => {
  emit("update:open", false);
};

function populateForm() {
  if (!props.task) return;

  title.value = props.task.title || props.task.task_name || "";

  // Handle start date
  const startDateValue = props.task.start_date || props.task.startDate;
  if (startDateValue && typeof startDateValue === "string") {
    try {
      if (/^\d{4}-\d{2}-\d{2}$/.test(startDateValue)) {
        startDate.value = parseDate(startDateValue);
      } else {
        const date = new Date(startDateValue);
        if (!isNaN(date.getTime())) {
          const dateString = date.toISOString().split("T")[0];
          if (dateString) {
            startDate.value = parseDate(dateString);
          }
        }
      }
    } catch (error) {
      console.warn("Failed to parse start date:", startDateValue, error);
      startDate.value = todayDate;
    }
  } else {
    startDate.value = todayDate;
  }

  // Handle due date
  const dueDateValue =
    props.task.due_date || props.task.end_date || props.task.dueDate;
  if (dueDateValue && typeof dueDateValue === "string") {
    try {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dueDateValue)) {
        dueDate.value = parseDate(dueDateValue);
      } else {
        const date = new Date(dueDateValue);
        if (!isNaN(date.getTime())) {
          const dateString = date.toISOString().split("T")[0];
          if (dateString) {
            dueDate.value = parseDate(dateString);
          }
        }
      }
    } catch (error) {
      console.warn("Failed to parse due date:", dueDateValue, error);
      dueDate.value = todayDate;
    }
  } else {
    dueDate.value = todayDate;
  }

  status.value = props.task.status || "not-started";
  priority.value = props.task.priority ? Number(props.task.priority) : 1;
  repeatInterval.value = props.task.repeat_interval ? Number(props.task.repeat_interval) : 0;
  description.value = props.task.notes || "";
  tags.value = props.task.tags || [];

  // Handle assignees - extract ALL from assignees array
  if (props.task.assignees && Array.isArray(props.task.assignees) && props.task.assignees.length > 0) {
    assignedTo.value = props.task.assignees
      .filter((a: any) => a.assigned_to && a.assigned_to.id)
      .map((a: any) => String(a.assigned_to.id));
  } else if (props.task.assignee_id) {
    // Fallback for older data structure
    assignedTo.value = [String(props.task.assignee_id)];
  } else {
    assignedTo.value = [];
  }

  // add subtasks mapping
  subtasks.value = []
  if (props.task.subtasks && Array.isArray(props.task.subtasks)) {
    subtasks.value = props.task.subtasks.map((st: any) => ({
      id: st.id ?? undefined, // <-- include existing subtask id so server can update
      title: st.title || st.task_name || '',
      startDate: parseDateValue(st.start_date || st.startDate),
      dueDate: parseDateValue(st.due_date || st.dueDate || st.end_date),
      status: st.status || 'not-started',
      priority: st.priority ? Number(st.priority) : 1,
      repeatInterval: st.repeat_interval ? Number(st.repeat_interval) : 0,
      notes: st.notes || '',
      tags: st.tags || [],
      assignedTo: Array.isArray(st.assignees) ? st.assignees.map((a: any) => String(a.assigned_to?.id ?? a.assigned_to_id ?? a.id)) : (st.assignee_ids ? st.assignee_ids.map((id: any) => String(id)) : []),
      expanded: false
    }))
  }
}

// ensure subtask dates remain valid when parent dates change
watch(startDate, (newStart) => {
  for (const s of subtasks.value) {
    if (s.startDate && newStart && s.startDate.compare(newStart as DateValue) < 0) {
      s.startDate = newStart
    }
  }
})
watch(dueDate, (newDue) => {
  for (const s of subtasks.value) {
    if (s.dueDate && newDue && s.dueDate.compare(newDue as DateValue) > 0) {
      s.dueDate = newDue
    }
  }
})

const parseDateValue = (dateStr: any): DateValue | undefined => {
  if (!dateStr) return undefined
  try {
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return parseDate(dateStr)
    }
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) {
      return parseDate(d.toISOString().split('T')[0])
    }
  } catch (_) {}
  return undefined
}

const addSubtask = () => {
  subtasks.value.push({
    title: '',
    startDate: today(getLocalTimeZone()),
    dueDate: today(getLocalTimeZone()),
    status: 'not-started',
    priority: 1,
    repeatInterval: 0,
    notes: '',
    tags: [],
    assignedTo: [],
    expanded: true
  })
}

// Watch for subtask repeat interval changes
watch(() => subtasks.value.map(s => ({ interval: s.repeatInterval, start: s.startDate })), (newValues, oldValues) => {
  if (!oldValues) return
  
  newValues.forEach((newVal, index) => {
    const oldVal = oldValues[index]
    const subtask = subtasks.value[index]
    
    if (!subtask) return
    
    // If repeat interval changed or start date changed and repeat interval is set
    if (newVal.interval > 0 && subtask.startDate && 
        (newVal.interval !== oldVal?.interval || newVal.start !== oldVal?.start)) {
      const startDateJs = subtask.startDate.toDate(getLocalTimeZone())
      const dueDateJs = new Date(startDateJs.getTime() + (newVal.interval * 24 * 60 * 60 * 1000))
      const dateString = dueDateJs.toISOString().split('T')[0]
      subtask.dueDate = parseDate(dateString)
    }
  })
}, { deep: true })

const removeSubtask = (index: number) => {
  subtasks.value.splice(index, 1)
}

const toggleSubtaskExpanded = (index: number) => {
  const s = subtasks.value[index]
  if (s) s.expanded = !s.expanded
}

// extend updateTask to validate and include subtasks
async function updateTask() {
  try {
    // Basic validation
    if (!title.value.trim()) {
      errorMessage.value = "Task title is required.";
      return;
    }

    if (!props.task || !props.task.id) {
      errorMessage.value = "Task ID is missing.";
      return;
    }

    if (!user.value) {
      errorMessage.value = "You must be logged in to update a task.";
      return;
    }

    if (assignedTo.value.length === 0) {
      errorMessage.value = "At least one assignee is required.";
      return;
    }

    if (assignedTo.value.length > 5) {
      errorMessage.value = "Maximum 5 assignees allowed.";
      return;
    }

    // validate subtasks
    for (let i = 0; i < subtasks.value.length; i++) {
      const sub = subtasks.value[i]
      const n = i + 1
      if (!sub || !sub.title || !sub.title.trim()) {
        errorMessage.value = `Subtask ${n}: Title is required.`
        return
      }
      if (!sub.startDate) {
        errorMessage.value = `Subtask ${n}: Start date is required.`
        return
      }
      if (!sub.dueDate) {
        errorMessage.value = `Subtask ${n}: Due date is required.`
        return
      }
      if (!sub.notes || !sub.notes.trim()) {
        errorMessage.value = `Subtask ${n}: Notes are required.`
        return
      }
      if (sub.dueDate && sub.startDate && sub.dueDate < sub.startDate) {
        errorMessage.value = `Subtask ${n}: Due date cannot be before start date.`
        return
      }
      // ensure subtask dates fall within main task date range
      if (startDate.value && sub.startDate && sub.startDate < startDate.value) {
        errorMessage.value = `Subtask ${n}: Start date cannot be before main task start date.`
        return
      }
      if (dueDate.value && sub.dueDate && sub.dueDate > dueDate.value) {
        errorMessage.value = `Subtask ${n}: Due date cannot be after main task due date.`
        return
      }

      const validSubAssignees = (sub.assignedTo ?? []).filter(id => id && String(id).trim() !== '')
      if (validSubAssignees.length === 0) {
        errorMessage.value = `Subtask ${n}: At least one assignee is required.`
        return
      }
      if (validSubAssignees.length > 5) {
        errorMessage.value = `Subtask ${n}: Maximum 5 assignees allowed.`
        return
      }

      // ensure subtask assignees are subset of parent assignees
      const invalid = validSubAssignees.find(id => !assignedTo.value.includes(String(id)))
      if (invalid) {
        errorMessage.value = `Subtask ${n}: assignees must be chosen from the parent task assignees.`
        return
      }
    }

    const taskData: any = {
      task_name: title.value,
      start_date: startDate.value
        ? startDate.value.toString()
        : new Date().toISOString().split("T")[0] || "",
      end_date: dueDate.value ? dueDate.value.toString() : null,
      status: status.value,
      priority: priority.value.toString(),
      repeat_interval: repeatInterval.value.toString(),
      notes: description.value || null,
      tags: tags.value,
      project_id: selectedProjectId.value ? Number(selectedProjectId.value) : null,
      assignee_ids: assignedTo.value.map(id => parseInt(id)),
      subtasks: subtasks.value.map(sub => ({
        id: sub.id ? Number(sub.id) : undefined, //send id for existing subtasks
        title: sub.title,
        start_date: sub.startDate ? sub.startDate.toString() : null,
        due_date: sub.dueDate ? sub.dueDate.toString() : null,
        status: sub.status,
        priority: sub.priority.toString(),
        repeat_interval: sub.repeatInterval.toString(),
        notes: sub.notes || null,
        tags: sub.tags || [],
        project_id: selectedProjectId.value ? Number(selectedProjectId.value) : (props.task?.project?.id ? Number(props.task.project.id) : null),
        assignee_ids: (sub.assignedTo || []).map(id => Number(id))
      }))
    };

    // Update task via API endpoint
    const response = await $fetch<{ success: boolean; task: any }>(
      `/api/tasks/${props.task.id}`,
      {
        method: "PUT",
        body: taskData,
      }
    );

    if (!response.success) {
      throw new Error("Failed to update task");
    }

    // Emit the updated task
    emit("task-updated", response.task);

    // Close modal
    // Show success feedback
    successMessage.value = props.isSubtask
      ? "Subtask updated successfully!"
      : "Task updated successfully!";

    // Close modal after short delay
    setTimeout(() => {
      successMessage.value = "";
      emit("update:open", false);
    }, 1000);
  } catch (err: any) {
    console.error("Error updating task:", err);
    errorMessage.value =
      err.message || "Something went wrong. Task was not updated.";
    successMessage.value = "";
  }
}

function formatDate(date: DateValue) {
  const jsDate = date.toDate(getLocalTimeZone());
  const day = String(jsDate.getDate()).padStart(2, "0");
  const month = String(jsDate.getMonth() + 1).padStart(2, "0");
  const year = jsDate.getFullYear();
  return `${day}/${month}/${year}`;
}
</script>
