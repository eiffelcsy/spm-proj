<template>
  <div class="w-full mx-auto p-8 md:px-12 lg:max-w-6xl xl:max-w-7xl">
    <h1 class="text-3xl font-bold mb-6">Personal Dashboard</h1>

    <div class="mb-4">
      
      <!-- Overdue Tasks Section -->
      <div v-if="overdueTasks.length > 0" class="mb-6">
        <div
          class="border-l-3 border-red-400 pl-4 mb-4 bg-red-50/40 p-4 rounded-r-lg"
        >
          <h3 class="text-lg font-semibold pb-2 text-red-600 flex items-center">
            <TriangleAlert class="w-5 h-5 mr-2" />
            Overdue Tasks ({{ overdueTasks.length }})
          </h3>
          <DataTable
            :columns="overdueColumns"
            :data="overdueTasks"
            @rowClick="goToTask"
            :hideToolbar="true"
          />
        </div>
      </div>

      <!-- Regular Tasks Section -->
      <div>
        <h3
          class="text-lg font-semibold py-2 flex items-center justify-between"
        >
          <span>My Tasks</span>
        </h3>
        <DataTable
          :columns="columns"
          :data="tasks"
          @rowClick="goToTask"
          :showCreateButton="true"
          :showRefreshButton="true"
          @create-task="isModalOpen = true"
          @refresh-tasks="fetchTasks"
        />
      </div>

      <!-- Create Task Modal -->
      <CreateTaskModal
        :isOpen="isModalOpen"
        role="staff"
        :currentUser="currentUserStaffId ? String(currentUserStaffId) : undefined"
        @close="isModalOpen = false"
        @task-created="handleTaskChange"
      />

      <!-- Create Project Modal -->
      <CreateProjectModal
        :isOpen="isCreateProjectModalOpen"
        @close="isCreateProjectModalOpen = false"
        @project-created="handleProjectCreated"
      />

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { columns } from "@/components/tasks-table/columns/columns";
import { overdueColumns } from "@/components/tasks-table/columns/overdue-columns";
import type { Task } from "@/components/tasks-table/data/schema";
import DataTable from "@/components/tasks-table/data-table.vue";
import { CreateTaskModal } from "@/components/task-modals/create-task/";
import { CreateProjectModal } from "@/components/project-modals/create-project";
import { useRouter, useRoute } from "vue-router";
import { TriangleAlert } from "lucide-vue-next";

definePageMeta({
  layout: "with-sidebar",
});

const router = useRouter();
const route = useRoute();

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const isModalOpen = ref<boolean>(false);
const isCreateProjectModalOpen = ref<boolean>(false);
const currentUserStaffId = ref<number | null>(null);

// ============================================================================
// DATA FETCHING
// ============================================================================

// Fetch current user
async function fetchCurrentUser() {
  try {
    const user = await $fetch('/api/user/me')
    currentUserStaffId.value = user.id
  } catch (err) {
    console.error('Failed to fetch current user:', err)
    currentUserStaffId.value = null
  }
}

// Fetch regular tasks
const {
  data: tasksResponse,
  pending: isLoading,
  error: fetchError,
  refresh: refreshTasks,
} = await useFetch<{ tasks: any[]; count: number }>("/api/tasks");

// Fetch overdue tasks
const {
  data: overdueTasksResponse,
  pending: isLoadingOverdue,
  error: fetchOverdueError,
  refresh: refreshOverdueTasks,
} = await useFetch<{ tasks: any[]; count: number }>("/api/tasks/overdue");

function fetchTasks() {
  refreshTasks();
  refreshOverdueTasks();
}

// ============================================================================
// DATA TRANSFORMATION
// ============================================================================

/**
 * Transform raw task data to match Task schema
 */
function transformTask(task: any): Task {
  return {
    id: task.id,
    title: task.title,
    startDate: new Date(task.start_date || task.startDate),
    dueDate: new Date(task.due_date || task.dueDate),
    project: task.project?.name || task.project || "personal",
    project_id: task.project_id || task.project?.id || null,
    status: task.status || "not-started",
    notes: task.notes,
    priority: typeof task.priority === 'string' ? parseInt(task.priority, 10) : task.priority,
    tags: task.tags || [],
    assignees: task.assignees?.map((a: any) => ({
      id: a.assigned_to?.id || a.id,
      fullname: a.assigned_to?.fullname || a.fullname
    }))
  };
}

// ============================================================================
// COMPUTED PROPERTIES
// ============================================================================

const overdueTasks = computed(() => {
  if (!overdueTasksResponse.value?.tasks) return [];
  return overdueTasksResponse.value.tasks
    .map(transformTask)
    .filter((task) => task.status !== "completed");
});

const tasks = computed(() => {
  if (!tasksResponse.value?.tasks) return [];

  const allTasks = tasksResponse.value.tasks.map(transformTask);
  const overdueTaskIds = new Set(overdueTasks.value.map((task) => task.id));

  // Return only non-overdue tasks to avoid duplicates
  return allTasks.filter((task) => !overdueTaskIds.has(task.id));
});

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Unified handler for task changes (create, update, delete)
 */
function handleTaskChange() {
  fetchTasks();
  isModalOpen.value = false;
}

/**
 * Project creation handler
 */
function handleProjectCreated(project: any) {
  isCreateProjectModalOpen.value = false;
}

// ============================================================================
// NAVIGATION FUNCTIONS
// ============================================================================

/**
 * Navigate to task detail page
 */
function goToTask(task: Task) {
  router.push(`/task/${task.id}?from=personal`);
}

// ============================================================================
// LIFECYCLE HOOKS
// ============================================================================

/**
 * Set up event listeners for quick actions
 */
onMounted(() => {
  fetchCurrentUser();
  
  // Check if we were redirected here to open the create task modal
  if (route.query.openCreateTask === 'true') {
    isModalOpen.value = true;
    // Clean up the query parameter
    router.replace({ query: { ...route.query, openCreateTask: undefined } });
  }
  
  window.addEventListener("task-updated", handleTaskChange);
  window.addEventListener("task-deleted", handleTaskChange);
  window.addEventListener("open-create-task-modal", () => {
    isModalOpen.value = true;
  });
  window.addEventListener("open-create-project-modal", () => {
    isCreateProjectModalOpen.value = true;
  });
});

onUnmounted(() => {
  window.removeEventListener("task-updated", handleTaskChange);
  window.removeEventListener("task-deleted", handleTaskChange);
  window.removeEventListener("open-create-task-modal", () => {
    isModalOpen.value = true;
  });
  window.removeEventListener("open-create-project-modal", () => {
    isCreateProjectModalOpen.value = true;
  });
});
</script>
