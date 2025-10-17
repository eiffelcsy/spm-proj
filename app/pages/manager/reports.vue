<template>
  <div class="w-full mx-auto p-8 md:px-12 lg:max-w-6xl xl:max-w-7xl">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-3xl font-bold">Task Completion Reports</h1>
        <p class="text-muted-foreground mt-1">Generate and export reports to track performance and progress</p>
      </div>
    </div>

    <!-- Filters Section -->
    <div class="bg-white rounded-lg border p-6 mb-6 space-y-4">
      <h2 class="text-lg font-semibold mb-4">Report Filters</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- User Filter -->
        <div class="space-y-2">
          <Label for="user-filter">Filter by User</Label>
          <Select v-model="selectedUserId">
            <SelectTrigger class="w-full">
              <SelectValue placeholder="All Users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem 
                v-for="user in users" 
                :key="user.id" 
                :value="String(user.id)"
              >
                {{ user.fullname }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- Project Filter -->
        <div class="space-y-2">
          <Label for="project-filter">Filter by Project</Label>
          <Select v-model="selectedProjectId">
            <SelectTrigger class="w-full">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              <SelectItem 
                v-for="project in projects" 
                :key="project.id" 
                :value="String(project.id)"
              >
                {{ project.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- Start Date -->
        <div class="space-y-2">
          <Label for="start-date">Start Date</Label>
          <Input 
            v-model="startDate" 
            type="date" 
            :max="endDate || undefined"
          />
        </div>

        <!-- End Date -->
        <div class="space-y-2">
          <Label for="end-date">End Date</Label>
          <Input 
            v-model="endDate" 
            type="date" 
            :min="startDate || undefined"
          />
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-3 pt-2">
        <Button @click="generateReport" :disabled="isGenerating">
          <FileText class="mr-2 h-4 w-4" />
          {{ isGenerating ? 'Generating...' : 'Generate Report' }}
        </Button>
        <Button variant="outline" @click="clearFilters">
          <X class="mr-2 h-4 w-4" />
          Clear Filters
        </Button>
      </div>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
      {{ error }}
    </div>

    <!-- Report Results -->
    <div v-if="reportData && !isGenerating" class="space-y-6">
      <!-- Report Header -->
      <div class="bg-white rounded-lg border p-6">
        <div class="flex items-start justify-between mb-4">
          <div>
            <h2 class="text-xl font-semibold">Report Summary</h2>
            <p class="text-sm text-muted-foreground mt-1">
              Generated on {{ formatDateTime(reportData.generatedAt) }}
            </p>
            <div class="mt-2 space-y-1 text-sm">
              <p v-if="reportData.filters.userName">
                <span class="font-medium">User:</span> {{ reportData.filters.userName }}
              </p>
              <p v-if="reportData.filters.projectName">
                <span class="font-medium">Project:</span> {{ reportData.filters.projectName }}
              </p>
              <p v-if="reportData.filters.start_date || reportData.filters.end_date">
                <span class="font-medium">Date Range:</span> 
                {{ reportData.filters.start_date ? formatDate(reportData.filters.start_date) : 'Beginning' }} 
                - 
                {{ reportData.filters.end_date ? formatDate(reportData.filters.end_date) : 'Present' }}
              </p>
            </div>
          </div>
          
          <!-- Export Buttons -->
          <div class="flex items-center gap-2">
            <Button variant="outline" size="sm" @click="exportReport('csv')" :disabled="isExporting">
              <Download class="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" @click="exportReport('excel')" :disabled="isExporting">
              <Download class="mr-2 h-4 w-4" />
              Export Excel
            </Button>
            <Button variant="outline" size="sm" @click="exportReport('pdf')" :disabled="isExporting">
              <Download class="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      <!-- Metrics Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <!-- Total Tasks -->
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-sm font-medium text-muted-foreground">Total Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-3xl font-bold">{{ reportData.metrics.totalTasks }}</div>
          </CardContent>
        </Card>

        <!-- Completed Tasks -->
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="flex items-baseline gap-2">
              <div class="text-3xl font-bold">{{ reportData.metrics.completedTasks }}</div>
              <Badge variant="secondary" class="text-xs">
                {{ reportData.metrics.completedPercentage }}%
              </Badge>
            </div>
            <Progress :model-value="parseFloat(reportData.metrics.completedPercentage)" class="mt-2" />
          </CardContent>
        </Card>

        <!-- In Progress Tasks -->
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="flex items-baseline gap-2">
              <div class="text-3xl font-bold">{{ reportData.metrics.inProgressTasks }}</div>
              <Badge variant="default" class="text-xs">
                {{ reportData.metrics.inProgressPercentage }}%
              </Badge>
            </div>
            <Progress :model-value="parseFloat(reportData.metrics.inProgressPercentage)" class="mt-2" />
          </CardContent>
        </Card>

        <!-- Not Started Tasks -->
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-sm font-medium text-muted-foreground">Not Started</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="flex items-baseline gap-2">
              <div class="text-3xl font-bold">{{ reportData.metrics.notStartedTasks }}</div>
              <Badge variant="outline" class="text-xs">
                {{ reportData.metrics.notStartedPercentage }}%
              </Badge>
            </div>
            <Progress :model-value="parseFloat(reportData.metrics.notStartedPercentage)" class="mt-2" />
          </CardContent>
        </Card>

        <!-- Blocked Tasks -->
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-sm font-medium text-muted-foreground">Blocked</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="flex items-baseline gap-2">
              <div class="text-3xl font-bold">{{ reportData.metrics.blockedTasks }}</div>
              <Badge variant="destructive" class="text-xs">
                {{ reportData.metrics.blockedPercentage }}%
              </Badge>
            </div>
            <Progress :model-value="parseFloat(reportData.metrics.blockedPercentage)" class="mt-2" />
          </CardContent>
        </Card>

        <!-- Projected Tasks -->
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-sm font-medium text-muted-foreground">Projected (Upcoming)</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-3xl font-bold">{{ reportData.metrics.projectedTasks }}</div>
            <p class="text-xs text-muted-foreground mt-1">Future scheduled tasks</p>
          </CardContent>
        </Card>
      </div>

      <!-- Tasks Table -->
      <div class="bg-white rounded-lg border">
        <div class="p-4">
          <h3 class="text-lg font-semibold mb-4">Task Details</h3>
          
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b">
                  <th class="text-left p-3 font-medium">Task</th>
                  <th class="text-left p-3 font-medium">Project</th>
                  <th class="text-left p-3 font-medium">Status</th>
                  <th class="text-left p-3 font-medium">Assignees</th>
                  <th class="text-left p-3 font-medium">Start Date</th>
                  <th class="text-left p-3 font-medium">Due Date</th>
                  <th class="text-left p-3 font-medium">Completed At</th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="task in reportData.tasks" 
                  :key="task.id" 
                  class="border-b hover:bg-gray-50"
                >
                  <td class="p-3 font-medium">{{ task.title }}</td>
                  <td class="p-3 text-gray-600">{{ task.project?.name || 'Personal' }}</td>
                  <td class="p-3">
                    <Badge :variant="getStatusVariant(task.status)">
                      {{ formatStatus(task.status) }}
                    </Badge>
                  </td>
                  <td class="p-3 text-gray-600">
                    <span v-if="task.assignees && task.assignees.length > 0">
                      {{ task.assignees.map((a: any) => a.fullname).join(', ') }}
                    </span>
                    <span v-else class="text-muted-foreground italic">Unassigned</span>
                  </td>
                  <td class="p-3 text-gray-600">
                    {{ task.start_date ? formatDate(task.start_date) : '—' }}
                  </td>
                  <td class="p-3 text-gray-600">
                    {{ task.due_date ? formatDate(task.due_date) : '—' }}
                  </td>
                  <td class="p-3 text-gray-600">
                    {{ task.completed_at ? formatDateTime(task.completed_at) : '—' }}
                  </td>
                </tr>
              </tbody>
            </table>
            
            <div v-if="reportData.tasks.length === 0" class="text-center py-8 text-gray-500">
              No tasks found for the selected filters.
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!isGenerating" class="bg-white rounded-lg border p-12 text-center">
      <FileText class="mx-auto h-12 w-12 text-gray-400 mb-4" />
      <h3 class="text-lg font-semibold mb-2">No Report Generated</h3>
      <p class="text-muted-foreground mb-4">
        Select your filters and click "Generate Report" to view task completion statistics.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { FileText, Download, X } from 'lucide-vue-next'

definePageMeta({
  layout: "with-sidebar",
})

interface User {
  id: number
  fullname: string
  email: string | null
}

interface Project {
  id: number
  name: string
}

interface ReportData {
  metrics: {
    totalTasks: number
    completedTasks: number
    completedPercentage: string
    inProgressTasks: number
    inProgressPercentage: string
    notStartedTasks: number
    notStartedPercentage: string
    blockedTasks: number
    blockedPercentage: string
    projectedTasks: number
  }
  tasks: any[]
  filters: {
    user_id?: number
    project_id?: number
    start_date?: string
    end_date?: string
    userName?: string | null
    projectName?: string | null
  }
  generatedAt: string
}

const users = ref<User[]>([])
const projects = ref<Project[]>([])
const selectedUserId = ref('all')
const selectedProjectId = ref('all')
const startDate = ref('')
const endDate = ref('')
const isGenerating = ref(false)
const isExporting = ref(false)
const error = ref('')
const reportData = ref<ReportData | null>(null)

async function fetchUsers() {
  try {
    const response = await $fetch<User[]>('/api/staff')
    users.value = response
  } catch (err: any) {
    console.error('Error fetching users:', err)
  }
}

async function fetchProjects() {
  try {
    const response = await $fetch<Project[]>('/api/projects')
    projects.value = response
  } catch (err: any) {
    console.error('Error fetching projects:', err)
  }
}

async function generateReport() {
  try {
    isGenerating.value = true
    error.value = ''
    
    const params: any = {}
    
    if (selectedUserId.value && selectedUserId.value !== 'all') {
      params.user_id = selectedUserId.value
    }
    if (selectedProjectId.value && selectedProjectId.value !== 'all') {
      params.project_id = selectedProjectId.value
    }
    if (startDate.value) {
      params.start_date = startDate.value
    }
    if (endDate.value) {
      params.end_date = endDate.value
    }
    
    const response = await $fetch('/api/reports/task-completion', {
      params
    })
    
    if (response.success) {
      reportData.value = response.data
    }
  } catch (err: any) {
    console.error('Error generating report:', err)
    error.value = err?.data?.statusMessage || err?.message || 'Failed to generate report'
  } finally {
    isGenerating.value = false
  }
}

function clearFilters() {
  selectedUserId.value = 'all'
  selectedProjectId.value = 'all'
  startDate.value = ''
  endDate.value = ''
  reportData.value = null
  error.value = ''
}

async function exportReport(format: 'csv' | 'excel' | 'pdf') {
  if (!reportData.value) return
  
  try {
    isExporting.value = true
    
    // Prepare data for export
    const exportData = {
      metrics: reportData.value.metrics,
      tasks: reportData.value.tasks,
      filters: reportData.value.filters,
      generatedAt: reportData.value.generatedAt
    }
    
    if (format === 'csv') {
      exportToCSV(exportData)
    } else if (format === 'excel') {
      exportToExcel(exportData)
    } else if (format === 'pdf') {
      exportToPDF(exportData)
    }
  } catch (err: any) {
    console.error('Error exporting report:', err)
    error.value = `Failed to export report as ${format.toUpperCase()}`
  } finally {
    isExporting.value = false
  }
}

function exportToCSV(data: any) {
  // Create CSV header
  const headers = ['Task Title', 'Project', 'Status', 'Assignees', 'Start Date', 'Due Date', 'Completed At']
  
  // Create CSV rows
  const rows = data.tasks.map((task: any): string[] => [
    `"${task.title.replace(/"/g, '""')}"`,
    `"${task.project?.name || 'Personal'}"`,
    task.status,
    `"${task.assignees && task.assignees.length > 0 ? task.assignees.map((a: any) => a.fullname).join(', ') : 'Unassigned'}"`,
    task.start_date || '',
    task.due_date || '',
    task.completed_at || ''
  ])
  
  // Add summary at the top
  const summary = [
    ['Task Completion Report'],
    ['Generated At:', new Date(data.generatedAt).toLocaleString()],
    [''],
    ['Summary Metrics'],
    ['Total Tasks:', data.metrics.totalTasks],
    ['Completed:', `${data.metrics.completedTasks} (${data.metrics.completedPercentage}%)`],
    ['In Progress:', `${data.metrics.inProgressTasks} (${data.metrics.inProgressPercentage}%)`],
    ['Not Started:', `${data.metrics.notStartedTasks} (${data.metrics.notStartedPercentage}%)`],
    ['Blocked:', `${data.metrics.blockedTasks} (${data.metrics.blockedPercentage}%)`],
    ['Projected:', data.metrics.projectedTasks],
    [''],
    ['Report Parameters'],
  ]
  
  if (data.filters.userName) {
    summary.push(['User:', data.filters.userName])
  }
  if (data.filters.projectName) {
    summary.push(['Project:', data.filters.projectName])
  }
  if (data.filters.start_date) {
    summary.push(['Start Date:', data.filters.start_date])
  }
  if (data.filters.end_date) {
    summary.push(['End Date:', data.filters.end_date])
  }
  
  summary.push([''], ['Task Details'], headers)
  
  // Combine everything
  const csvContent = summary.map((row: any[]) => row.join(',')).join('\n') + '\n' +
                     rows.map((row: string[]) => row.join(',')).join('\n')
  
  // Download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `task-completion-report-${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function exportToExcel(data: any) {
  // For Excel export, we'll create an HTML table that Excel can open
  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <style>
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        .summary { margin-bottom: 20px; }
        .metric-label { font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>Task Completion Report</h1>
      <div class="summary">
        <p><strong>Generated At:</strong> ${new Date(data.generatedAt).toLocaleString()}</p>
        
        <h2>Summary Metrics</h2>
        <table style="width: 50%;">
          <tr><td class="metric-label">Total Tasks</td><td>${data.metrics.totalTasks}</td></tr>
          <tr><td class="metric-label">Completed</td><td>${data.metrics.completedTasks} (${data.metrics.completedPercentage}%)</td></tr>
          <tr><td class="metric-label">In Progress</td><td>${data.metrics.inProgressTasks} (${data.metrics.inProgressPercentage}%)</td></tr>
          <tr><td class="metric-label">Not Started</td><td>${data.metrics.notStartedTasks} (${data.metrics.notStartedPercentage}%)</td></tr>
          <tr><td class="metric-label">Blocked</td><td>${data.metrics.blockedTasks} (${data.metrics.blockedPercentage}%)</td></tr>
          <tr><td class="metric-label">Projected</td><td>${data.metrics.projectedTasks}</td></tr>
        </table>
        
        <h2>Report Parameters</h2>
        <table style="width: 50%;">
  `
  
  if (data.filters.userName) {
    html += `<tr><td class="metric-label">User</td><td>${data.filters.userName}</td></tr>`
  }
  if (data.filters.projectName) {
    html += `<tr><td class="metric-label">Project</td><td>${data.filters.projectName}</td></tr>`
  }
  if (data.filters.start_date) {
    html += `<tr><td class="metric-label">Start Date</td><td>${data.filters.start_date}</td></tr>`
  }
  if (data.filters.end_date) {
    html += `<tr><td class="metric-label">End Date</td><td>${data.filters.end_date}</td></tr>`
  }
  
  html += `
        </table>
      </div>
      
      <h2>Task Details</h2>
      <table>
        <thead>
          <tr>
            <th>Task Title</th>
            <th>Project</th>
            <th>Status</th>
            <th>Assignees</th>
            <th>Start Date</th>
            <th>Due Date</th>
            <th>Completed At</th>
          </tr>
        </thead>
        <tbody>
  `
  
  data.tasks.forEach((task: any) => {
    html += `
      <tr>
        <td>${task.title}</td>
        <td>${task.project?.name || 'Personal'}</td>
        <td>${task.status}</td>
        <td>${task.assignees && task.assignees.length > 0 ? task.assignees.map((a: any) => a.fullname).join(', ') : 'Unassigned'}</td>
        <td>${task.start_date || '—'}</td>
        <td>${task.due_date || '—'}</td>
        <td>${task.completed_at ? new Date(task.completed_at).toLocaleString() : '—'}</td>
      </tr>
    `
  })
  
  html += `
        </tbody>
      </table>
    </body>
    </html>
  `
  
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `task-completion-report-${new Date().toISOString().split('T')[0]}.xls`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function exportToPDF(data: any) {
  // For PDF, we'll create a printable HTML page
  const printWindow = window.open('', '', 'width=800,height=600')
  if (!printWindow) {
    error.value = 'Please allow popups to export PDF'
    return
  }
  
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Task Completion Report</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          padding: 40px;
          max-width: 1000px;
          margin: 0 auto;
        }
        h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
        h2 { color: #555; margin-top: 30px; }
        table { 
          border-collapse: collapse; 
          width: 100%; 
          margin: 20px 0;
        }
        th, td { 
          border: 1px solid #ddd; 
          padding: 12px; 
          text-align: left; 
        }
        th { 
          background-color: #f2f2f2; 
          font-weight: bold; 
        }
        .summary-table { width: 60%; }
        .metric-label { font-weight: bold; width: 200px; }
        .info { 
          background-color: #f9f9f9; 
          padding: 15px; 
          border-radius: 5px;
          margin: 20px 0;
        }
        .badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }
        .badge-completed { background-color: #d1fae5; color: #065f46; }
        .badge-in-progress { background-color: #dbeafe; color: #1e40af; }
        .badge-not-started { background-color: #f3f4f6; color: #374151; }
        .badge-blocked { background-color: #fee2e2; color: #991b1b; }
        @media print {
          body { padding: 20px; }
        }
      </style>
    </head>
    <body>
      <h1>Task Completion Report</h1>
      
      <div class="info">
        <p><strong>Generated At:</strong> ${new Date(data.generatedAt).toLocaleString()}</p>
  `
  
  if (data.filters.userName || data.filters.projectName || data.filters.start_date || data.filters.end_date) {
    html += '<p><strong>Report Parameters:</strong></p><ul>'
    if (data.filters.userName) {
      html += `<li>User: ${data.filters.userName}</li>`
    }
    if (data.filters.projectName) {
      html += `<li>Project: ${data.filters.projectName}</li>`
    }
    if (data.filters.start_date) {
      html += `<li>Start Date: ${new Date(data.filters.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</li>`
    }
    if (data.filters.end_date) {
      html += `<li>End Date: ${new Date(data.filters.end_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</li>`
    }
    html += '</ul>'
  }
  
  html += `
      </div>
      
      <h2>Summary Metrics</h2>
      <table class="summary-table">
        <tr><td class="metric-label">Total Tasks</td><td>${data.metrics.totalTasks}</td></tr>
        <tr><td class="metric-label">Completed</td><td>${data.metrics.completedTasks} (${data.metrics.completedPercentage}%)</td></tr>
        <tr><td class="metric-label">In Progress</td><td>${data.metrics.inProgressTasks} (${data.metrics.inProgressPercentage}%)</td></tr>
        <tr><td class="metric-label">Not Started</td><td>${data.metrics.notStartedTasks} (${data.metrics.notStartedPercentage}%)</td></tr>
        <tr><td class="metric-label">Blocked</td><td>${data.metrics.blockedTasks} (${data.metrics.blockedPercentage}%)</td></tr>
        <tr><td class="metric-label">Projected (Upcoming)</td><td>${data.metrics.projectedTasks}</td></tr>
      </table>
      
      <h2>Task Details</h2>
      <table>
        <thead>
          <tr>
            <th>Task Title</th>
            <th>Project</th>
            <th>Status</th>
            <th>Assignees</th>
            <th>Start Date</th>
            <th>Due Date</th>
            <th>Completed At</th>
          </tr>
        </thead>
        <tbody>
  `
  
  data.tasks.forEach((task: any) => {
    const statusClass = task.status === 'completed' ? 'badge-completed' : 
                        task.status === 'in-progress' ? 'badge-in-progress' :
                        task.status === 'blocked' ? 'badge-blocked' : 'badge-not-started'
    
    const statusText = task.status === 'not-started' ? 'Not Started' :
                       task.status === 'in-progress' ? 'In Progress' :
                       task.status === 'completed' ? 'Completed' :
                       task.status === 'blocked' ? 'Blocked' : task.status
    
    const startDateText = task.start_date ? new Date(task.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'
    const dueDateText = task.due_date ? new Date(task.due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'
    
    html += `
      <tr>
        <td>${task.title}</td>
        <td>${task.project?.name || 'Personal'}</td>
        <td><span class="badge ${statusClass}">${statusText}</span></td>
        <td>${task.assignees && task.assignees.length > 0 ? task.assignees.map((a: any) => a.fullname).join(', ') : 'Unassigned'}</td>
        <td>${startDateText}</td>
        <td>${dueDateText}</td>
        <td>${task.completed_at ? new Date(task.completed_at).toLocaleString() : '—'}</td>
      </tr>
    `
  })
  
  html += `
        </tbody>
      </table>
      
      <script>
        window.onload = function() {
          window.print();
        }
      <\/script>
    </body>
    </html>
  `
  
  printWindow.document.write(html)
  printWindow.document.close()
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '—'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatStatus(status: string): string {
  switch (status) {
    case 'not-started':
      return 'Not Started'
    case 'in-progress':
      return 'In Progress'
    case 'completed':
      return 'Completed'
    case 'blocked':
      return 'Blocked'
    default:
      return status
  }
}

function getStatusVariant(status: string) {
  switch (status) {
    case 'completed':
      return 'secondary'
    case 'in-progress':
      return 'default'
    case 'blocked':
      return 'destructive'
    case 'not-started':
    default:
      return 'outline'
  }
}

onMounted(async () => {
  await Promise.all([
    fetchUsers(),
    fetchProjects()
  ])
})
</script>

