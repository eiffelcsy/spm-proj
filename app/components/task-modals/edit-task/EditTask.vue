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
            <Label class="mb-1"> Due Date </Label>
            <Popover>
              <PopoverTrigger as-child>
                <Button variant="outline" :class="cn(
                  'w-full justify-start text-left font-normal',
                  !dueDate && 'text-muted-foreground'
                )
                  ">
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
        </div>

        <!-- Project Link (if task belongs to a project) -->
        <!-- <div v-if="task.project" class="flex items-center space-x-2">
          <FolderIcon class="h-4 w-4 text-muted-foreground" />
          <Label class="block text-sm font-medium mb-1">Project Title</Label>
          <div variant="link" class="h-auto p-0 text-sm font-medium text-primary hover:underline"> {{ task.project.name}} </div>
        </div> -->
      
        <div v-if="task.project">
          <Label class="block text-sm font-medium mb-1">Project Title</Label>
          <Input v-model="task.project.name" type="text" 
            class="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            readonly/>
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
import { ref, watch } from "vue";
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
import { CalendarIcon } from "lucide-vue-next";
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
const assignedTo = ref<string[]>([]);

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

// Watch for start date changes to ensure due date is not before start date
watch(startDate, (newStartDate) => {
  if (
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
}

async function updateTask() {
  // Basic validation
  try {
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
      project_id: selectedProjectId.value ? Number(selectedProjectId.value) : null,
      assignee_ids: assignedTo.value.map(id => parseInt(id)),
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
