<template>
  <div class="w-full mx-auto p-8 md:px-12 lg:max-w-6xl xl:max-w-7xl">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-3xl font-bold">Reports</h1>
        <p class="text-muted-foreground mt-1">Generate and export reports to track performance and progress</p>
      </div>
    </div>

    <!-- Report Type Selector -->
    <div class="bg-white rounded-lg border p-6 mb-6">
      <h2 class="text-lg font-semibold mb-4">Report Type</h2>
      <div class="flex gap-4">
        <Button 
          :variant="reportType === 'task-completion' ? 'default' : 'outline'"
          @click="reportType = 'task-completion'; clearFilters()"
        >
          <FileText class="mr-2 h-4 w-4" />
          Task Completion
        </Button>
        <Button 
          :variant="reportType === 'logged-time' ? 'default' : 'outline'"
          @click="reportType = 'logged-time'; clearFilters()"
        >
          <Clock class="mr-2 h-4 w-4" />
          Logged Time
        </Button>
        <Button 
          :variant="reportType === 'team-summary' ? 'default' : 'outline'"
          @click="reportType = 'team-summary'; clearFilters()"
        >
          <Users class="mr-2 h-4 w-4" />
          Team Summary
        </Button>
      </div>
    </div>

    <!-- Filters Section -->
    <div class="bg-white rounded-lg border p-6 mb-6 space-y-4">
      <h2 class="text-lg font-semibold mb-4">Report Filters</h2>
      
      <!-- Task Completion Filters -->
      <div v-if="reportType === 'task-completion'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

      <!-- Logged Time Filters -->
      <div v-if="reportType === 'logged-time'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Grouping Type -->
        <div class="space-y-2">
          <Label for="grouping-type">Group By</Label>
          <Select v-model="groupingType">
            <SelectTrigger class="w-full">
              <SelectValue placeholder="Select grouping" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="project">Project</SelectItem>
              <SelectItem value="department">Department</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- Project Filter (for grouping by project) -->
        <div v-if="groupingType === 'project'" class="space-y-2">
          <Label for="project-filter">Specific Project (Optional)</Label>
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

        <!-- Department Filter (for grouping by department) -->
        <div v-if="groupingType === 'department'" class="space-y-2">
          <Label for="department-filter">Specific Department (Optional)</Label>
          <Select v-model="selectedDepartment">
            <SelectTrigger class="w-full">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              <SelectItem 
                v-for="dept in departments" 
                :key="dept" 
                :value="dept"
              >
                {{ dept }}
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

      <!-- Team Summary Filters -->
      <div v-if="reportType === 'team-summary'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Project Filter (Required) -->
        <div class="space-y-2">
          <Label for="project-filter">Project (Required)</Label>
          <Select v-model="selectedProjectId">
            <SelectTrigger class="w-full">
              <SelectValue placeholder="Select a project" />
            </SelectTrigger>
            <SelectContent>
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

        <!-- Period Type -->
        <div class="space-y-2">
          <Label for="period-type">Report Period</Label>
          <Select v-model="periodType">
            <SelectTrigger class="w-full">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly (Last 7 days)</SelectItem>
              <SelectItem value="monthly">Monthly (Last 30 days)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- Start Date -->
        <div class="space-y-2">
          <Label for="start-date">Start Date (Optional)</Label>
          <Input 
            v-model="startDate" 
            type="date" 
            :max="endDate || undefined"
          />
        </div>

        <!-- End Date -->
        <div class="space-y-2">
          <Label for="end-date">End Date (Optional)</Label>
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

    <!-- Task Completion Report Results -->
    <div v-if="reportData && !isGenerating && reportType === 'task-completion'" class="space-y-6">
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

    <!-- Logged Time Report Results -->
    <div v-if="loggedTimeData && !isGenerating && reportType === 'logged-time'" class="space-y-6">
      <!-- Report Header -->
      <div class="bg-white rounded-lg border p-6">
        <div class="flex items-start justify-between mb-4">
          <div>
            <h2 class="text-xl font-semibold">Logged Time Report</h2>
            <p class="text-sm text-muted-foreground mt-1">
              Generated on {{ formatDateTime(loggedTimeData.generatedAt) }}
            </p>
            <div class="mt-2 space-y-1 text-sm">
              <p>
                <span class="font-medium">Grouped By:</span> {{ loggedTimeData.filters.grouping === 'project' ? 'Project' : 'Department' }}
              </p>
              <p v-if="loggedTimeData.filters.projectName">
                <span class="font-medium">Project:</span> {{ loggedTimeData.filters.projectName }}
              </p>
              <p v-if="loggedTimeData.filters.departmentName">
                <span class="font-medium">Department:</span> {{ loggedTimeData.filters.departmentName }}
              </p>
              <p v-if="loggedTimeData.filters.start_date || loggedTimeData.filters.end_date">
                <span class="font-medium">Date Range:</span> 
                {{ loggedTimeData.filters.start_date ? formatDate(loggedTimeData.filters.start_date) : 'Beginning' }} 
                - 
                {{ loggedTimeData.filters.end_date ? formatDate(loggedTimeData.filters.end_date) : 'Present' }}
              </p>
            </div>
          </div>
          
          <!-- Export Buttons -->
          <div class="flex items-center gap-2">
            <Button variant="outline" size="sm" @click="exportLoggedTimeReport('csv')" :disabled="isExporting">
              <Download class="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" @click="exportLoggedTimeReport('excel')" :disabled="isExporting">
              <Download class="mr-2 h-4 w-4" />
              Export Excel
            </Button>
            <Button variant="outline" size="sm" @click="exportLoggedTimeReport('pdf')" :disabled="isExporting">
              <Download class="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      <!-- Overall Metrics Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Total Hours -->
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-sm font-medium text-muted-foreground">Total Hours Logged</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-3xl font-bold">{{ formatHours(loggedTimeData.metrics.totalHours) }}</div>
          </CardContent>
        </Card>

        <!-- Total Tasks -->
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-sm font-medium text-muted-foreground">Total Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-3xl font-bold">{{ loggedTimeData.metrics.totalTasks }}</div>
            <p class="text-xs text-muted-foreground mt-1">
              {{ loggedTimeData.metrics.completedTasks }} completed, 
              {{ loggedTimeData.metrics.inProgressTasks }} in progress
            </p>
          </CardContent>
        </Card>

        <!-- Average Hours per Task -->
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-sm font-medium text-muted-foreground">Avg Hours per Task</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-3xl font-bold">{{ formatHours(loggedTimeData.metrics.avgHoursPerTask) }}</div>
          </CardContent>
        </Card>

        <!-- Groups Count -->
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-sm font-medium text-muted-foreground">
              {{ loggedTimeData.filters.grouping === 'project' ? 'Projects' : 'Departments' }}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-3xl font-bold">{{ loggedTimeData.metrics.groupCount }}</div>
          </CardContent>
        </Card>
      </div>

      <!-- Grouped Data Cards -->
      <div class="space-y-4">
        <h3 class="text-lg font-semibold">Time by {{ loggedTimeData.filters.grouping === 'project' ? 'Project' : 'Department' }}</h3>
        
        <div v-for="group in loggedTimeData.groupedData" :key="group.name" class="bg-white rounded-lg border">
          <div class="p-6">
            <div class="flex items-start justify-between mb-4">
              <div>
                <h4 class="text-lg font-semibold">{{ group.name }}</h4>
                <div class="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span>
                    <Clock class="inline h-4 w-4 mr-1" />
                    {{ formatHours(group.total_hours) }} total
                  </span>
                  <span>{{ group.tasks.length }} tasks</span>
                  <span>{{ group.completed_tasks }} completed</span>
                  <span v-if="group.in_progress_tasks > 0" class="text-blue-600">
                    {{ group.in_progress_tasks }} in progress
                  </span>
                </div>
              </div>
              <div class="text-right">
                <div class="text-2xl font-bold">{{ formatHours(group.total_hours) }}</div>
                <p class="text-xs text-muted-foreground mt-1">
                  {{ formatHours(group.avg_hours_per_task) }} avg per task
                </p>
              </div>
            </div>

            <!-- Tasks Table for this group -->
            <div class="mt-4 overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b">
                    <th class="text-left p-2 font-medium">Task</th>
                    <th class="text-left p-2 font-medium">Status</th>
                    <th class="text-left p-2 font-medium">Created</th>
                    <th class="text-left p-2 font-medium">Completed</th>
                    <th class="text-right p-2 font-medium">Hours Logged</th>
                  </tr>
                </thead>
                <tbody>
                  <tr 
                    v-for="task in group.tasks" 
                    :key="task.id"
                    class="border-b hover:bg-gray-50"
                  >
                    <td class="p-2 font-medium">
                      {{ task.title }}
                      <Badge v-if="task.is_in_progress" variant="default" class="ml-2 text-xs">
                        In Progress
                      </Badge>
                    </td>
                    <td class="p-2">
                      <Badge :variant="getStatusVariant(task.status)">
                        {{ formatStatus(task.status) }}
                      </Badge>
                    </td>
                    <td class="p-2 text-gray-600">
                      {{ formatDateTime(task.created_at) }}
                    </td>
                    <td class="p-2 text-gray-600">
                      {{ task.completed_at ? formatDateTime(task.completed_at) : '—' }}
                    </td>
                    <td class="p-2 text-right font-medium">
                      {{ formatHours(task.logged_hours) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div v-if="loggedTimeData.groupedData.length === 0" class="text-center py-8 text-gray-500 bg-white rounded-lg border">
          No time data found for the selected filters.
        </div>
      </div>
    </div>

    <!-- Team Summary Report Results -->
    <div v-if="teamSummaryData && !isGenerating && reportType === 'team-summary'" class="space-y-6">
      <!-- Report Header -->
      <div class="bg-white rounded-lg border p-6">
        <div class="flex items-start justify-between mb-4">
          <div>
            <h2 class="text-xl font-semibold">Team Summary Report</h2>
            <p class="text-sm text-muted-foreground mt-1">
              Generated on {{ formatDateTime(teamSummaryData.generatedAt) }}
            </p>
            <div class="mt-2 space-y-1 text-sm">
              <p>
                <span class="font-medium">Project:</span> {{ teamSummaryData.project.name }}
              </p>
              <p v-if="teamSummaryData.project.description">
                <span class="font-medium">Description:</span> {{ teamSummaryData.project.description }}
              </p>
              <p>
                <span class="font-medium">Period:</span> {{ teamSummaryData.filters.period === 'weekly' ? 'Weekly (Last 7 days)' : 'Monthly (Last 30 days)' }}
              </p>
              <p v-if="teamSummaryData.filters.start_date || teamSummaryData.filters.end_date">
                <span class="font-medium">Date Range:</span> 
                {{ teamSummaryData.filters.start_date ? formatDate(teamSummaryData.filters.start_date) : 'Beginning' }} 
                - 
                {{ teamSummaryData.filters.end_date ? formatDate(teamSummaryData.filters.end_date) : 'Present' }}
              </p>
            </div>
          </div>
          
          <!-- Export Buttons -->
          <div class="flex items-center gap-2">
            <Button variant="outline" size="sm" @click="exportTeamSummaryReport('csv')" :disabled="isExporting">
              <Download class="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" @click="exportTeamSummaryReport('excel')" :disabled="isExporting">
              <Download class="mr-2 h-4 w-4" />
              Export Excel
            </Button>
            <Button variant="outline" size="sm" @click="exportTeamSummaryReport('pdf')" :disabled="isExporting">
              <Download class="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      <!-- Overall Metrics Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Overall Completion Rate -->
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-sm font-medium text-muted-foreground">Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-3xl font-bold">{{ teamSummaryData.metrics.overallCompletionRate }}%</div>
            <Progress :model-value="teamSummaryData.metrics.overallCompletionRate" class="mt-2" />
          </CardContent>
        </Card>

        <!-- Team Members -->
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-sm font-medium text-muted-foreground">Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-3xl font-bold">{{ teamSummaryData.metrics.totalTeamMembers }}</div>
            <p class="text-xs text-muted-foreground mt-1">
              {{ teamSummaryData.metrics.avgTasksPerMember.toFixed(1) }} avg tasks per member
            </p>
          </CardContent>
        </Card>

        <!-- Overdue Tasks -->
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-sm font-medium text-muted-foreground">Overdue Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="flex items-baseline gap-2">
              <div class="text-3xl font-bold">{{ teamSummaryData.metrics.overdueTaskCount }}</div>
              <Badge :variant="teamSummaryData.metrics.overdueTaskCount > 0 ? 'destructive' : 'secondary'" class="text-xs">
                {{ teamSummaryData.metrics.overdueTaskCount > 0 ? 'Action Needed' : 'On Track' }}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <!-- Total Hours Logged -->
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-sm font-medium text-muted-foreground">Total Hours Logged</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-3xl font-bold">{{ formatHours(teamSummaryData.metrics.totalHoursLogged) }}</div>
          </CardContent>
        </Card>
      </div>

      <!-- Task Status Breakdown -->
      <div class="bg-white rounded-lg border p-6">
        <h3 class="text-lg font-semibold mb-4">Task Status Breakdown</h3>
        <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div class="text-center">
            <div class="text-2xl font-bold">{{ teamSummaryData.metrics.statusBreakdown.total }}</div>
            <p class="text-sm text-muted-foreground">Total Tasks</p>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-green-600">{{ teamSummaryData.metrics.statusBreakdown.completed }}</div>
            <p class="text-sm text-muted-foreground">Completed</p>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-600">{{ teamSummaryData.metrics.statusBreakdown.in_progress }}</div>
            <p class="text-sm text-muted-foreground">In Progress</p>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-gray-600">{{ teamSummaryData.metrics.statusBreakdown.not_started }}</div>
            <p class="text-sm text-muted-foreground">Not Started</p>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-red-600">{{ teamSummaryData.metrics.statusBreakdown.blocked }}</div>
            <p class="text-sm text-muted-foreground">Blocked</p>
          </div>
        </div>
      </div>

      <!-- Top Performers -->
      <div class="bg-white rounded-lg border p-6">
        <h3 class="text-lg font-semibold mb-4">Top Performers</h3>
        <div class="space-y-3">
          <div 
            v-for="(performer, index) in teamSummaryData.topPerformers" 
            :key="performer.staff_id"
            class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div class="flex items-center gap-3">
              <div class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold">
                {{ index + 1 }}
              </div>
              <div>
                <p class="font-medium">{{ performer.fullname }}</p>
                <p class="text-sm text-muted-foreground">
                  {{ performer.tasks_completed }} completed / {{ performer.total_tasks }} total
                </p>
              </div>
            </div>
            <div class="text-right">
              <p class="text-lg font-bold text-green-600">{{ performer.completion_rate }}%</p>
              <p class="text-xs text-muted-foreground">{{ formatHours(performer.total_hours_logged) }}</p>
            </div>
          </div>
        </div>
        <div v-if="teamSummaryData.topPerformers.length === 0" class="text-center py-8 text-gray-500">
          No performance data available.
        </div>
      </div>

      <!-- Team Workload Distribution -->
      <div class="bg-white rounded-lg border p-6">
        <h3 class="text-lg font-semibold mb-4">Team Workload Distribution</h3>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b">
                <th class="text-left p-3 font-medium">Team Member</th>
                <th class="text-right p-3 font-medium">Task Count</th>
                <th class="text-right p-3 font-medium">% of Total</th>
                <th class="text-right p-3 font-medium">Variance from Avg</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="member in teamSummaryData.workloadDistribution" 
                :key="member.staff_id"
                class="border-b hover:bg-gray-50"
              >
                <td class="p-3 font-medium">{{ member.fullname }}</td>
                <td class="p-3 text-right">{{ member.task_count }}</td>
                <td class="p-3 text-right">
                  <Badge variant="outline">{{ member.percentage.toFixed(1) }}%</Badge>
                </td>
                <td class="p-3 text-right">
                  <span :class="member.variance_from_avg > 0 ? 'text-orange-600' : member.variance_from_avg < 0 ? 'text-blue-600' : 'text-gray-600'">
                    {{ member.variance_from_avg > 0 ? '+' : '' }}{{ member.variance_from_avg.toFixed(1) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Team Performance Details -->
      <div class="bg-white rounded-lg border p-6">
        <h3 class="text-lg font-semibold mb-4">Team Performance Details</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b">
                <th class="text-left p-3 font-medium">Team Member</th>
                <th class="text-right p-3 font-medium">Completed</th>
                <th class="text-right p-3 font-medium">In Progress</th>
                <th class="text-right p-3 font-medium">Not Started</th>
                <th class="text-right p-3 font-medium">Blocked</th>
                <th class="text-right p-3 font-medium">Total</th>
                <th class="text-right p-3 font-medium">Completion Rate</th>
                <th class="text-right p-3 font-medium">Hours Logged</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="member in teamSummaryData.teamPerformance" 
                :key="member.staff_id"
                class="border-b hover:bg-gray-50"
              >
                <td class="p-3 font-medium">{{ member.fullname }}</td>
                <td class="p-3 text-right text-green-600">{{ member.tasks_completed }}</td>
                <td class="p-3 text-right text-blue-600">{{ member.tasks_in_progress }}</td>
                <td class="p-3 text-right text-gray-600">{{ member.tasks_not_started }}</td>
                <td class="p-3 text-right text-red-600">{{ member.tasks_blocked }}</td>
                <td class="p-3 text-right font-semibold">{{ member.total_tasks }}</td>
                <td class="p-3 text-right">
                  <Badge :variant="member.completion_rate >= 75 ? 'secondary' : member.completion_rate >= 50 ? 'default' : 'outline'">
                    {{ member.completion_rate }}%
                  </Badge>
                </td>
                <td class="p-3 text-right">{{ formatHours(member.total_hours_logged) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!isGenerating" class="bg-white rounded-lg border p-12 text-center">
      <FileText class="mx-auto h-12 w-12 text-gray-400 mb-4" />
      <h3 class="text-lg font-semibold mb-2">No Report Generated</h3>
      <p class="text-muted-foreground mb-4">
        Select your filters and click "Generate Report" to view 
        {{ reportType === 'task-completion' ? 'task completion statistics' : 
           reportType === 'logged-time' ? 'logged time data' : 
           'team summary and performance metrics' }}.
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
import { FileText, Download, X, Clock, Users } from 'lucide-vue-next'
import type { 
  TaskCompletionReportData, 
  LoggedTimeReportData,
  TeamSummaryReportData 
} from '@/types'

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

const reportType = ref<'task-completion' | 'logged-time' | 'team-summary'>('task-completion')
const users = ref<User[]>([])
const projects = ref<Project[]>([])
const departments = ref<string[]>([])
const selectedUserId = ref('all')
const selectedProjectId = ref('all')
const selectedDepartment = ref('all')
const groupingType = ref<'project' | 'department'>('project')
const periodType = ref<'weekly' | 'monthly'>('weekly')
const startDate = ref('')
const endDate = ref('')
const isGenerating = ref(false)
const isExporting = ref(false)
const error = ref('')
const reportData = ref<ReportData | null>(null)
const loggedTimeData = ref<LoggedTimeReportData | null>(null)
const teamSummaryData = ref<TeamSummaryReportData | null>(null)

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

async function fetchDepartments() {
  try {
    const response = await $fetch<any[]>('/api/admin/users')
    // Extract unique departments
    const uniqueDepts = new Set<string>()
    response.forEach((user: any) => {
      if (user.department) {
        uniqueDepts.add(user.department)
      }
    })
    departments.value = Array.from(uniqueDepts).sort()
  } catch (err: any) {
    console.error('Error fetching departments:', err)
  }
}

async function generateReport() {
  try {
    isGenerating.value = true
    error.value = ''
    
    if (reportType.value === 'task-completion') {
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
        loggedTimeData.value = null
        teamSummaryData.value = null
      }
    } else if (reportType.value === 'logged-time') {
      const params: any = {
        grouping: groupingType.value
      }
      
      if (selectedProjectId.value && selectedProjectId.value !== 'all') {
        params.project_id = selectedProjectId.value
      }
      if (selectedDepartment.value && selectedDepartment.value !== 'all') {
        params.department = selectedDepartment.value
      }
      if (startDate.value) {
        params.start_date = startDate.value
      }
      if (endDate.value) {
        params.end_date = endDate.value
      }
      
      const response = await $fetch('/api/reports/logged-time', {
        params
      })
      
      if (response.success) {
        loggedTimeData.value = response.data
        reportData.value = null
        teamSummaryData.value = null
      }
    } else if (reportType.value === 'team-summary') {
      // Validate project selection
      if (!selectedProjectId.value || selectedProjectId.value === 'all') {
        error.value = 'Please select a project for team summary report'
        isGenerating.value = false
        return
      }

      const params: any = {
        project_id: selectedProjectId.value,
        period: periodType.value
      }
      
      if (startDate.value) {
        params.start_date = startDate.value
      }
      if (endDate.value) {
        params.end_date = endDate.value
      }
      
      const response = await $fetch<{ success: boolean; data: TeamSummaryReportData }>('/api/reports/team-summary', {
        params
      })
      
      if (response.success) {
        teamSummaryData.value = response.data
        reportData.value = null
        loggedTimeData.value = null
      }
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
  selectedDepartment.value = 'all'
  groupingType.value = 'project'
  periodType.value = 'weekly'
  startDate.value = ''
  endDate.value = ''
  reportData.value = null
  loggedTimeData.value = null
  teamSummaryData.value = null
  error.value = ''
}

function formatHours(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)}m`
  } else if (hours < 24) {
    return `${hours.toFixed(1)}h`
  } else {
    const days = Math.floor(hours / 24)
    const remainingHours = Math.round(hours % 24)
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
  }
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

async function exportLoggedTimeReport(format: 'csv' | 'excel' | 'pdf') {
  if (!loggedTimeData.value) return
  
  try {
    isExporting.value = true
    
    if (format === 'csv') {
      exportLoggedTimeToCSV(loggedTimeData.value)
    } else if (format === 'excel') {
      exportLoggedTimeToExcel(loggedTimeData.value)
    } else if (format === 'pdf') {
      exportLoggedTimeToPDF(loggedTimeData.value)
    }
  } catch (err: any) {
    console.error('Error exporting logged time report:', err)
    error.value = `Failed to export report as ${format.toUpperCase()}`
  } finally {
    isExporting.value = false
  }
}

function exportLoggedTimeToCSV(data: any) {
  // Create CSV header
  const headers = ['Group', 'Task Title', 'Status', 'Created', 'Completed', 'Hours Logged', 'In Progress']
  
  // Create CSV rows
  const rows: string[][] = []
  data.groupedData.forEach((group: any) => {
    group.tasks.forEach((task: any) => {
      rows.push([
        `"${group.name}"`,
        `"${task.title.replace(/"/g, '""')}"`,
        task.status,
        task.created_at,
        task.completed_at || '',
        task.logged_hours.toFixed(2),
        task.is_in_progress ? 'Yes' : 'No'
      ])
    })
  })
  
  // Add summary at the top
  const summary = [
    ['Logged Time Report'],
    ['Generated At:', new Date(data.generatedAt).toLocaleString()],
    [''],
    ['Summary Metrics'],
    ['Total Hours:', data.metrics.totalHours.toFixed(2)],
    ['Total Tasks:', data.metrics.totalTasks],
    ['Completed Tasks:', data.metrics.completedTasks],
    ['In Progress Tasks:', data.metrics.inProgressTasks],
    ['Average Hours per Task:', data.metrics.avgHoursPerTask.toFixed(2)],
    ['Total ' + (data.filters.grouping === 'project' ? 'Projects' : 'Departments') + ':', data.metrics.groupCount],
    [''],
    ['Report Parameters'],
    ['Grouped By:', data.filters.grouping === 'project' ? 'Project' : 'Department'],
  ]
  
  if (data.filters.projectName) {
    summary.push(['Project:', data.filters.projectName])
  }
  if (data.filters.departmentName) {
    summary.push(['Department:', data.filters.departmentName])
  }
  if (data.filters.start_date) {
    summary.push(['Start Date:', data.filters.start_date])
  }
  if (data.filters.end_date) {
    summary.push(['End Date:', data.filters.end_date])
  }
  
  summary.push([''], ['Grouped Summary'])
  data.groupedData.forEach((group: any) => {
    summary.push([
      group.name,
      `${group.total_hours.toFixed(2)} hours`,
      `${group.tasks.length} tasks`,
      `${group.completed_tasks} completed`,
      `${group.in_progress_tasks} in progress`
    ])
  })
  
  summary.push([''], ['Detailed Task Data'], headers)
  
  // Combine everything
  const csvContent = summary.map((row: any[]) => row.join(',')).join('\n') + '\n' +
                     rows.map((row: string[]) => row.join(',')).join('\n')
  
  // Download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `logged-time-report-${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function exportLoggedTimeToExcel(data: any) {
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
        .group-header { background-color: #e8f4f8; font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>Logged Time Report</h1>
      <div class="summary">
        <p><strong>Generated At:</strong> ${new Date(data.generatedAt).toLocaleString()}</p>
        
        <h2>Summary Metrics</h2>
        <table style="width: 50%;">
          <tr><td class="metric-label">Total Hours</td><td>${data.metrics.totalHours.toFixed(2)}</td></tr>
          <tr><td class="metric-label">Total Tasks</td><td>${data.metrics.totalTasks}</td></tr>
          <tr><td class="metric-label">Completed Tasks</td><td>${data.metrics.completedTasks}</td></tr>
          <tr><td class="metric-label">In Progress Tasks</td><td>${data.metrics.inProgressTasks}</td></tr>
          <tr><td class="metric-label">Average Hours per Task</td><td>${data.metrics.avgHoursPerTask.toFixed(2)}</td></tr>
          <tr><td class="metric-label">Total ${data.filters.grouping === 'project' ? 'Projects' : 'Departments'}</td><td>${data.metrics.groupCount}</td></tr>
        </table>
        
        <h2>Report Parameters</h2>
        <table style="width: 50%;">
          <tr><td class="metric-label">Grouped By</td><td>${data.filters.grouping === 'project' ? 'Project' : 'Department'}</td></tr>
  `
  
  if (data.filters.projectName) {
    html += `<tr><td class="metric-label">Project</td><td>${data.filters.projectName}</td></tr>`
  }
  if (data.filters.departmentName) {
    html += `<tr><td class="metric-label">Department</td><td>${data.filters.departmentName}</td></tr>`
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
  `
  
  // Add grouped data
  data.groupedData.forEach((group: any) => {
    html += `
      <h2>${group.name}</h2>
      <p>Total Hours: ${group.total_hours.toFixed(2)} | Tasks: ${group.tasks.length} | Completed: ${group.completed_tasks} | In Progress: ${group.in_progress_tasks}</p>
      <table>
        <thead>
          <tr>
            <th>Task Title</th>
            <th>Status</th>
            <th>Created</th>
            <th>Completed</th>
            <th>Hours Logged</th>
          </tr>
        </thead>
        <tbody>
    `
    
    group.tasks.forEach((task: any) => {
      html += `
        <tr>
          <td>${task.title}${task.is_in_progress ? ' (In Progress)' : ''}</td>
          <td>${task.status}</td>
          <td>${new Date(task.created_at).toLocaleString()}</td>
          <td>${task.completed_at ? new Date(task.completed_at).toLocaleString() : '—'}</td>
          <td>${task.logged_hours.toFixed(2)}</td>
        </tr>
      `
    })
    
    html += `
        </tbody>
      </table>
      <br>
    `
  })
  
  html += `
    </body>
    </html>
  `
  
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `logged-time-report-${new Date().toISOString().split('T')[0]}.xls`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function exportLoggedTimeToPDF(data: any) {
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
      <title>Logged Time Report</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          padding: 40px;
          max-width: 1000px;
          margin: 0 auto;
        }
        h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
        h2 { color: #555; margin-top: 30px; }
        h3 { color: #666; margin-top: 20px; }
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
        .group-card {
          margin: 20px 0;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 15px;
        }
        .group-header {
          background-color: #e8f4f8;
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 15px;
        }
        @media print {
          body { padding: 20px; }
        }
      </style>
    </head>
    <body>
      <h1>Logged Time Report</h1>
      
      <div class="info">
        <p><strong>Generated At:</strong> ${new Date(data.generatedAt).toLocaleString()}</p>
        <p><strong>Grouped By:</strong> ${data.filters.grouping === 'project' ? 'Project' : 'Department'}</p>
  `
  
  if (data.filters.projectName || data.filters.departmentName || data.filters.start_date || data.filters.end_date) {
    html += '<p><strong>Report Parameters:</strong></p><ul>'
    if (data.filters.projectName) {
      html += `<li>Project: ${data.filters.projectName}</li>`
    }
    if (data.filters.departmentName) {
      html += `<li>Department: ${data.filters.departmentName}</li>`
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
        <tr><td class="metric-label">Total Hours Logged</td><td>${data.metrics.totalHours.toFixed(2)} hours</td></tr>
        <tr><td class="metric-label">Total Tasks</td><td>${data.metrics.totalTasks}</td></tr>
        <tr><td class="metric-label">Completed Tasks</td><td>${data.metrics.completedTasks}</td></tr>
        <tr><td class="metric-label">In Progress Tasks</td><td>${data.metrics.inProgressTasks}</td></tr>
        <tr><td class="metric-label">Average Hours per Task</td><td>${data.metrics.avgHoursPerTask.toFixed(2)} hours</td></tr>
        <tr><td class="metric-label">Total ${data.filters.grouping === 'project' ? 'Projects' : 'Departments'}</td><td>${data.metrics.groupCount}</td></tr>
      </table>
  `
  
  // Add grouped data
  data.groupedData.forEach((group: any) => {
    html += `
      <div class="group-card">
        <div class="group-header">
          <h3 style="margin: 0;">${group.name}</h3>
          <p style="margin: 5px 0 0 0; font-size: 14px;">
            ${group.total_hours.toFixed(2)} hours total | 
            ${group.tasks.length} tasks | 
            ${group.completed_tasks} completed | 
            ${group.in_progress_tasks} in progress | 
            ${group.avg_hours_per_task.toFixed(2)} hours avg
          </p>
        </div>
        
        <table style="font-size: 12px;">
          <thead>
            <tr>
              <th>Task Title</th>
              <th>Status</th>
              <th>Created</th>
              <th>Completed</th>
              <th>Hours</th>
            </tr>
          </thead>
          <tbody>
    `
    
    group.tasks.forEach((task: any) => {
      html += `
        <tr>
          <td>${task.title}${task.is_in_progress ? ' <span style="color: #1e40af;">(In Progress)</span>' : ''}</td>
          <td>${task.status}</td>
          <td>${new Date(task.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
          <td>${task.completed_at ? new Date(task.completed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
          <td><strong>${task.logged_hours.toFixed(2)}</strong></td>
        </tr>
      `
    })
    
    html += `
          </tbody>
        </table>
      </div>
    `
  })
  
  html += `
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

async function exportTeamSummaryReport(format: 'csv' | 'excel' | 'pdf') {
  if (!teamSummaryData.value) return
  
  try {
    isExporting.value = true
    
    if (format === 'csv') {
      exportTeamSummaryToCSV(teamSummaryData.value)
    } else if (format === 'excel') {
      exportTeamSummaryToExcel(teamSummaryData.value)
    } else if (format === 'pdf') {
      exportTeamSummaryToPDF(teamSummaryData.value)
    }
  } catch (err: any) {
    console.error('Error exporting team summary report:', err)
    error.value = `Failed to export report as ${format.toUpperCase()}`
  } finally {
    isExporting.value = false
  }
}

function exportTeamSummaryToCSV(data: any) {
  // Create summary section
  const summary = [
    ['Team Summary Report'],
    ['Generated At:', new Date(data.generatedAt).toLocaleString()],
    ['Project:', data.project.name],
    ['Period:', data.filters.period === 'weekly' ? 'Weekly (Last 7 days)' : 'Monthly (Last 30 days)'],
    [''],
    ['Overall Metrics'],
    ['Completion Rate:', `${data.metrics.overallCompletionRate}%`],
    ['Team Members:', data.metrics.totalTeamMembers],
    ['Overdue Tasks:', data.metrics.overdueTaskCount],
    ['Total Hours Logged:', data.metrics.totalHoursLogged.toFixed(2)],
    ['Avg Tasks per Member:', data.metrics.avgTasksPerMember.toFixed(1)],
    [''],
    ['Task Status Breakdown'],
    ['Total Tasks:', data.metrics.statusBreakdown.total],
    ['Completed:', data.metrics.statusBreakdown.completed],
    ['In Progress:', data.metrics.statusBreakdown.in_progress],
    ['Not Started:', data.metrics.statusBreakdown.not_started],
    ['Blocked:', data.metrics.statusBreakdown.blocked],
    [''],
    ['Team Performance'],
    ['Name', 'Completed', 'In Progress', 'Not Started', 'Blocked', 'Total', 'Completion Rate', 'Hours Logged']
  ]

  // Add team performance data
  data.teamPerformance.forEach((member: any) => {
    summary.push([
      `"${member.fullname}"`,
      member.tasks_completed,
      member.tasks_in_progress,
      member.tasks_not_started,
      member.tasks_blocked,
      member.total_tasks,
      `${member.completion_rate}%`,
      member.total_hours_logged.toFixed(2)
    ])
  })

  summary.push([''], ['Workload Distribution'], ['Name', 'Task Count', '% of Total', 'Variance from Avg'])
  
  data.workloadDistribution.forEach((member: any) => {
    summary.push([
      `"${member.fullname}"`,
      member.task_count,
      `${member.percentage.toFixed(1)}%`,
      member.variance_from_avg.toFixed(1)
    ])
  })

  const csvContent = summary.map((row: any[]) => row.join(',')).join('\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `team-summary-report-${data.project.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function exportTeamSummaryToExcel(data: any) {
  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <style>
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        .metric-label { font-weight: bold; }
        h1 { color: #333; }
        h2 { color: #555; margin-top: 30px; }
      </style>
    </head>
    <body>
      <h1>Team Summary Report</h1>
      <p><strong>Project:</strong> ${data.project.name}</p>
      <p><strong>Generated At:</strong> ${new Date(data.generatedAt).toLocaleString()}</p>
      <p><strong>Period:</strong> ${data.filters.period === 'weekly' ? 'Weekly (Last 7 days)' : 'Monthly (Last 30 days)'}</p>
      
      <h2>Overall Metrics</h2>
      <table style="width: 50%;">
        <tr><td class="metric-label">Completion Rate</td><td>${data.metrics.overallCompletionRate}%</td></tr>
        <tr><td class="metric-label">Team Members</td><td>${data.metrics.totalTeamMembers}</td></tr>
        <tr><td class="metric-label">Overdue Tasks</td><td>${data.metrics.overdueTaskCount}</td></tr>
        <tr><td class="metric-label">Total Hours Logged</td><td>${data.metrics.totalHoursLogged.toFixed(2)}</td></tr>
        <tr><td class="metric-label">Avg Tasks per Member</td><td>${data.metrics.avgTasksPerMember.toFixed(1)}</td></tr>
      </table>
      
      <h2>Task Status Breakdown</h2>
      <table style="width: 50%;">
        <tr><td class="metric-label">Total Tasks</td><td>${data.metrics.statusBreakdown.total}</td></tr>
        <tr><td class="metric-label">Completed</td><td>${data.metrics.statusBreakdown.completed}</td></tr>
        <tr><td class="metric-label">In Progress</td><td>${data.metrics.statusBreakdown.in_progress}</td></tr>
        <tr><td class="metric-label">Not Started</td><td>${data.metrics.statusBreakdown.not_started}</td></tr>
        <tr><td class="metric-label">Blocked</td><td>${data.metrics.statusBreakdown.blocked}</td></tr>
      </table>
      
      <h2>Team Performance</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Completed</th>
            <th>In Progress</th>
            <th>Not Started</th>
            <th>Blocked</th>
            <th>Total</th>
            <th>Completion Rate</th>
            <th>Hours Logged</th>
          </tr>
        </thead>
        <tbody>
  `
  
  data.teamPerformance.forEach((member: any) => {
    html += `
      <tr>
        <td>${member.fullname}</td>
        <td>${member.tasks_completed}</td>
        <td>${member.tasks_in_progress}</td>
        <td>${member.tasks_not_started}</td>
        <td>${member.tasks_blocked}</td>
        <td>${member.total_tasks}</td>
        <td>${member.completion_rate}%</td>
        <td>${member.total_hours_logged.toFixed(2)}</td>
      </tr>
    `
  })
  
  html += `
        </tbody>
      </table>
      
      <h2>Workload Distribution</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Task Count</th>
            <th>% of Total</th>
            <th>Variance from Avg</th>
          </tr>
        </thead>
        <tbody>
  `
  
  data.workloadDistribution.forEach((member: any) => {
    html += `
      <tr>
        <td>${member.fullname}</td>
        <td>${member.task_count}</td>
        <td>${member.percentage.toFixed(1)}%</td>
        <td>${member.variance_from_avg.toFixed(1)}</td>
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
  link.setAttribute('download', `team-summary-report-${data.project.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.xls`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function exportTeamSummaryToPDF(data: any) {
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
      <title>Team Summary Report</title>
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
        @media print {
          body { padding: 20px; }
        }
      </style>
    </head>
    <body>
      <h1>Team Summary Report</h1>
      
      <div class="info">
        <p><strong>Project:</strong> ${data.project.name}</p>
        ${data.project.description ? `<p><strong>Description:</strong> ${data.project.description}</p>` : ''}
        <p><strong>Generated At:</strong> ${new Date(data.generatedAt).toLocaleString()}</p>
        <p><strong>Period:</strong> ${data.filters.period === 'weekly' ? 'Weekly (Last 7 days)' : 'Monthly (Last 30 days)'}</p>
      </div>
      
      <h2>Overall Metrics</h2>
      <table class="summary-table">
        <tr><td class="metric-label">Completion Rate</td><td>${data.metrics.overallCompletionRate}%</td></tr>
        <tr><td class="metric-label">Team Members</td><td>${data.metrics.totalTeamMembers}</td></tr>
        <tr><td class="metric-label">Overdue Tasks</td><td>${data.metrics.overdueTaskCount}</td></tr>
        <tr><td class="metric-label">Total Hours Logged</td><td>${data.metrics.totalHoursLogged.toFixed(2)} hours</td></tr>
        <tr><td class="metric-label">Avg Tasks per Member</td><td>${data.metrics.avgTasksPerMember.toFixed(1)}</td></tr>
      </table>
      
      <h2>Task Status Breakdown</h2>
      <table class="summary-table">
        <tr><td class="metric-label">Total Tasks</td><td>${data.metrics.statusBreakdown.total}</td></tr>
        <tr><td class="metric-label">Completed</td><td>${data.metrics.statusBreakdown.completed}</td></tr>
        <tr><td class="metric-label">In Progress</td><td>${data.metrics.statusBreakdown.in_progress}</td></tr>
        <tr><td class="metric-label">Not Started</td><td>${data.metrics.statusBreakdown.not_started}</td></tr>
        <tr><td class="metric-label">Blocked</td><td>${data.metrics.statusBreakdown.blocked}</td></tr>
      </table>
      
      <h2>Top Performers</h2>
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Name</th>
            <th>Completion Rate</th>
            <th>Tasks Completed</th>
            <th>Total Tasks</th>
          </tr>
        </thead>
        <tbody>
  `
  
  data.topPerformers.forEach((performer: any, index: number) => {
    html += `
      <tr>
        <td>${index + 1}</td>
        <td>${performer.fullname}</td>
        <td><strong>${performer.completion_rate}%</strong></td>
        <td>${performer.tasks_completed}</td>
        <td>${performer.total_tasks}</td>
      </tr>
    `
  })
  
  html += `
        </tbody>
      </table>
      
      <h2>Team Performance Details</h2>
      <table style="font-size: 12px;">
        <thead>
          <tr>
            <th>Name</th>
            <th>Completed</th>
            <th>In Progress</th>
            <th>Not Started</th>
            <th>Blocked</th>
            <th>Total</th>
            <th>Rate</th>
            <th>Hours</th>
          </tr>
        </thead>
        <tbody>
  `
  
  data.teamPerformance.forEach((member: any) => {
    html += `
      <tr>
        <td>${member.fullname}</td>
        <td>${member.tasks_completed}</td>
        <td>${member.tasks_in_progress}</td>
        <td>${member.tasks_not_started}</td>
        <td>${member.tasks_blocked}</td>
        <td><strong>${member.total_tasks}</strong></td>
        <td>${member.completion_rate}%</td>
        <td>${member.total_hours_logged.toFixed(1)}</td>
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

onMounted(async () => {
  await Promise.all([
    fetchUsers(),
    fetchProjects(),
    fetchDepartments()
  ])
})
</script>

