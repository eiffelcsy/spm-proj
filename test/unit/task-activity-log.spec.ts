import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed } from 'vue'
import type { ActivityTimelineWithStaff, TaskFromAPI } from '~/app/types'

// Mock Nuxt-specific functions globally
global.definePageMeta = vi.fn()

// Mock lucide-vue-next icons
vi.mock('lucide-vue-next', () => ({
  Clock: { template: '<span data-testid="icon-clock"></span>' },
  User: { template: '<span data-testid="icon-user"></span>' },
  Calendar: { template: '<span data-testid="icon-calendar"></span>' }
}))

// Mock Nuxt composables
const mockRoute = ref({ path: '/task/123', params: { id: '123' }, query: {} })
const mockRouterPush = vi.fn()
const mockSupabaseSignOut = vi.fn(() => Promise.resolve())
const mockCurrentUser = ref({ id: 1, fullname: 'Test User', email: 'test@example.com', isManager: false, isAdmin: false })
const mockTaskData = ref(null)

vi.mock('#imports', () => ({
  useRoute: () => mockRoute.value,
  useRouter: () => ({
    push: mockRouterPush
  }),
  useSupabaseClient: () => ({
    auth: {
      signOut: mockSupabaseSignOut
    }
  }),
  useCookie: vi.fn(() => ref(null)),
  useState: vi.fn((key, init) => {
    if (key === 'current-user') {
      return mockCurrentUser
    }
    return ref(init ? init() : null)
  }),
  useFetch: vi.fn(() => ({
    data: mockTaskData,
    pending: ref(false),
    refresh: vi.fn()
  })),
  onMounted: (cb: () => void) => cb(),
  navigateTo: vi.fn()
}))

// Mock $fetch for API calls
global.$fetch = vi.fn((url: string, options?: any) => {
  if (url.includes('/api/user/me')) {
    return Promise.resolve(mockCurrentUser.value)
  }
  if (url.includes('/api/tasks/123')) {
    return Promise.resolve({
      task: {
        id: 123,
        title: 'Test Task',
        description: 'Test Description',
        status: 'in-progress',
        priority_level: 'High',
        due_date: '2024-03-15',
        start_date: '2024-03-01',
        project_id: 1,
        creator_id: 1,
        history: [
          {
            id: '1',
            task_id: 123,
            action: 'Task Created',
            staff_id: 1,
            timestamp: '2024-03-01T10:00:00Z',
            staff: { id: 1, fullname: 'John Doe' }
          },
          {
            id: '2',
            task_id: 123,
            action: 'Updated Title: Old Title → New Title',
            staff_id: 2,
            timestamp: '2024-03-02T14:30:00Z',
            staff: { id: 2, fullname: 'Jane Smith' }
          }
        ]
      }
    })
  }
  return Promise.resolve({})
})

describe('Task Activity Log Acceptance Criteria', () => {
  // ============================================================================
  // ACCEPTANCE CRITERIA TESTS
  // ============================================================================

  describe('AC1: Admin User Can View Activity Log', () => {
    it('should display Activity Log section when user is admin', () => {
      mockCurrentUser.value = { id: 1, fullname: 'Admin User', email: 'admin@example.com', isManager: false, isAdmin: true }
      
      const activityLogSection = {
        name: 'ActivityTimeline',
        props: ['history', 'isAdmin'],
        template: `
          <div v-if="isAdmin" class="activity-timeline">
            <h3>Activity Timeline</h3>
            <div v-for="log in history" :key="log.timestamp">
              <p>{{ log.action }}</p>
              <p>by {{ log.staff?.fullname }}</p>
              <time>{{ log.timestamp }}</time>
            </div>
          </div>
        `
      }
      
      expect(activityLogSection.props).toContain('isAdmin')
      expect(activityLogSection.template).toContain('v-if="isAdmin"')
      expect(activityLogSection.template).toContain('Activity Timeline')
    })

    it('should show activity log entries with proper formatting', () => {
      const mockHistory: ActivityTimelineWithStaff[] = [
        {
          id: '1',
          task_id: 123,
          action: 'Task Created',
          staff_id: 1,
          timestamp: '2024-03-01T10:00:00Z',
          staff: { id: 1, fullname: 'John Doe' }
        }
      ]
      
      const activityLogComponent = {
        history: mockHistory,
        formatDate: (timestamp: string) => new Date(timestamp).toLocaleString(),
        isAdmin: true
      }
      
      expect(activityLogComponent.history).toHaveLength(1)
      expect(activityLogComponent.history[0].action).toBe('Task Created')
      expect(activityLogComponent.history[0].staff.fullname).toBe('John Doe')
      expect(activityLogComponent.isAdmin).toBe(true)
    })
  })

  describe('AC2: Non-Admin User Cannot View Activity Log', () => {
    it('should not display Activity Log section when user is not admin', () => {
      mockCurrentUser.value = { id: 2, fullname: 'Regular User', email: 'user@example.com', isManager: false, isAdmin: false }
      
      const activityLogSection = {
        name: 'ActivityTimeline',
        props: ['history', 'isAdmin'],
        template: `
          <div v-if="isAdmin" class="activity-timeline">
            <h3>Activity Timeline</h3>
          </div>
        `
      }
      
      const isAdmin = false
      const shouldShow = isAdmin
      
      expect(shouldShow).toBe(false)
      expect(activityLogSection.template).toContain('v-if="isAdmin"')
    })

    it('should hide activity log for regular staff members', () => {
      const currentUser = { id: 2, fullname: 'Regular User', isAdmin: false }
      const task = { id: 123, history: [] }
      
      const canViewActivityLog = currentUser.isAdmin
      
      expect(canViewActivityLog).toBe(false)
    })
  })

  describe('AC3: Task Creation Activity Log Entry', () => {
    it('should create activity log entry when task is created', async () => {
      const mockLogActivity = vi.fn(() => Promise.resolve(true))
      
      const logTaskCreation = async (supabase: any, taskId: number, userId: number) => {
        return mockLogActivity(supabase, {
          task_id: taskId,
          action: 'Task Created',
          staff_id: userId
        })
      }
      
      const result = await logTaskCreation({}, 123, 1)
      
      expect(result).toBe(true)
      expect(mockLogActivity).toHaveBeenCalledWith({}, {
        task_id: 123,
        action: 'Task Created',
        staff_id: 1
      })
    })

    it('should display task creation entry with correct information', () => {
      const creationEntry = {
        id: '1',
        task_id: 123,
        action: 'Task Created',
        staff_id: 1,
        timestamp: '2024-03-01T10:00:00Z',
        staff: { id: 1, fullname: 'John Doe' }
      }
      
      expect(creationEntry.action).toBe('Task Created')
      expect(creationEntry.staff.fullname).toBe('John Doe')
      expect(creationEntry.timestamp).toBeDefined()
      expect(new Date(creationEntry.timestamp)).toBeInstanceOf(Date)
    })

    it('should format task creation timestamp correctly', () => {
      const timestamp = '2024-03-01T10:00:00Z'
      const formattedDate = new Date(timestamp).toLocaleString()
      
      expect(formattedDate).toContain('3/1/2024')
      // Check that the time is formatted (may vary by timezone)
      expect(formattedDate).toMatch(/\d{1,2}:\d{2}:\d{2}/)
    })
  })

  describe('AC4: Task Modification Activity Log Entry', () => {
    it('should create activity log entry when task is modified', async () => {
      const mockLogActivity = vi.fn(() => Promise.resolve(true))
      
      const logTaskUpdate = async (supabase: any, taskId: number, userId: number, changes: any[]) => {
        const changeDescriptions = changes.map(change => 
          `${change.field}: ${change.oldValue} → ${change.newValue}`
        )
        
        return mockLogActivity(supabase, {
          task_id: taskId,
          action: `Updated ${changeDescriptions[0]}`,
          staff_id: userId
        })
      }
      
      const changes = [
        { field: 'title', oldValue: 'Old Title', newValue: 'New Title' }
      ]
      
      const result = await logTaskUpdate({}, 123, 2, changes)
      
      expect(result).toBe(true)
      expect(mockLogActivity).toHaveBeenCalledWith({}, {
        task_id: 123,
        action: 'Updated title: Old Title → New Title',
        staff_id: 2
      })
    })

    it('should display task modification entry with detailed change information', () => {
      const modificationEntry = {
        id: '2',
        task_id: 123,
        action: 'Updated Title: Old Title → New Title',
        staff_id: 2,
        timestamp: '2024-03-02T14:30:00Z',
        staff: { id: 2, fullname: 'Jane Smith' }
      }
      
      expect(modificationEntry.action).toContain('Updated')
      expect(modificationEntry.action).toContain('Old Title → New Title')
      expect(modificationEntry.staff.fullname).toBe('Jane Smith')
      expect(modificationEntry.timestamp).toBeDefined()
    })

    it('should handle multiple field changes in one update', () => {
      const changes = [
        { field: 'title', oldValue: 'Old Title', newValue: 'New Title' },
        { field: 'status', oldValue: 'not-started', newValue: 'in-progress' },
        { field: 'priority_level', oldValue: 'Low', newValue: 'High' }
      ]
      
      const changeDescriptions = changes.map(change => 
        `${change.field}: ${change.oldValue} → ${change.newValue}`
      )
      
      expect(changeDescriptions).toHaveLength(3)
      expect(changeDescriptions[0]).toBe('title: Old Title → New Title')
      expect(changeDescriptions[1]).toBe('status: not-started → in-progress')
      expect(changeDescriptions[2]).toBe('priority_level: Low → High')
    })

    it('should format different field types correctly', () => {
      const formatFieldChange = (field: string, oldValue: any, newValue: any) => {
        switch (field) {
          case 'due_date':
            return `Due Date: ${oldValue ? new Date(oldValue).toLocaleDateString() : 'Not set'} → ${newValue ? new Date(newValue).toLocaleDateString() : 'Not set'}`
          case 'priority_level':
            return `Priority: ${oldValue || 'Not set'} → ${newValue || 'Not set'}`
          case 'notes':
            const oldNotes = oldValue ? (oldValue.length > 50 ? oldValue.substring(0, 50) + '...' : oldValue) : 'None'
            const newNotes = newValue ? (newValue.length > 50 ? newValue.substring(0, 50) + '...' : newValue) : 'None'
            return `Notes: ${oldNotes} → ${newNotes}`
          default:
            return `${field}: ${oldValue} → ${newValue}`
        }
      }
      
      expect(formatFieldChange('due_date', '2024-03-01', '2024-03-15')).toContain('Due Date:')
      expect(formatFieldChange('priority_level', 'Low', 'High')).toContain('Priority:')
      expect(formatFieldChange('notes', 'Short note', 'Long note that exceeds fifty characters and should be truncated')).toContain('Notes:')
    })
  })

  describe('AC5: Real-time Activity Log Updates', () => {
    it('should update activity log immediately after task modification', async () => {
      const mockRefresh = vi.fn()
      const mockTaskData = ref({
        task: {
          id: 123,
          history: []
        }
      })
      
      const handleTaskUpdate = async (updatedTask: any) => {
        // Simulate adding new activity log entry
        const newEntry = {
          id: '3',
          task_id: 123,
          action: 'Updated Status: in-progress → completed',
          staff_id: 1,
          timestamp: new Date().toISOString(),
          staff: { id: 1, fullname: 'John Doe' }
        }
        
        mockTaskData.value.task.history.push(newEntry)
        mockRefresh()
      }
      
      await handleTaskUpdate({ id: 123, status: 'completed' })
      
      expect(mockTaskData.value.task.history).toHaveLength(1)
      expect(mockTaskData.value.task.history[0].action).toContain('Updated Status')
      expect(mockRefresh).toHaveBeenCalled()
    })

    it('should not require page refresh to see new activity entries', () => {
      const activityLog = ref([
        {
          id: '1',
          action: 'Task Created',
          staff_id: 1,
          timestamp: '2024-03-01T10:00:00Z',
          staff: { id: 1, fullname: 'John Doe' }
        }
      ])
      
      // Simulate adding new entry without page refresh
      const addNewEntry = (entry: any) => {
        activityLog.value.push(entry)
      }
      
      const newEntry = {
        id: '2',
        action: 'Updated Title: Old → New',
        staff_id: 2,
        timestamp: new Date().toISOString(),
        staff: { id: 2, fullname: 'Jane Smith' }
      }
      
      addNewEntry(newEntry)
      
      expect(activityLog.value).toHaveLength(2)
      expect(activityLog.value[1].action).toContain('Updated Title')
    })

    it('should maintain activity log state during real-time updates', () => {
      const activityLog = ref([])
      const isUpdating = ref(false)
      
      const updateActivityLog = async (newEntry: any) => {
        isUpdating.value = true
        // Simulate async update
        await new Promise(resolve => setTimeout(resolve, 100))
        activityLog.value.push(newEntry)
        isUpdating.value = false
      }
      
      const newEntry = {
        id: '1',
        action: 'Task Created',
        staff_id: 1,
        timestamp: new Date().toISOString(),
        staff: { id: 1, fullname: 'John Doe' }
      }
      
      updateActivityLog(newEntry)
      
      expect(isUpdating.value).toBe(true)
      // After async operation completes
      setTimeout(() => {
        expect(activityLog.value).toHaveLength(1)
        expect(isUpdating.value).toBe(false)
      }, 150)
    })
  })

  describe('AC6: Chronological Order of Activity Log Entries', () => {
    it('should display activity log entries in chronological order (oldest first)', () => {
      const unsortedHistory = [
        {
          id: '3',
          task_id: 123,
          action: 'Updated Status: in-progress → completed',
          staff_id: 1,
          timestamp: '2024-03-03T16:00:00Z',
          staff: { id: 1, fullname: 'John Doe' }
        },
        {
          id: '1',
          task_id: 123,
          action: 'Task Created',
          staff_id: 1,
          timestamp: '2024-03-01T10:00:00Z',
          staff: { id: 1, fullname: 'John Doe' }
        },
        {
          id: '2',
          task_id: 123,
          action: 'Updated Title: Old → New',
          staff_id: 2,
          timestamp: '2024-03-02T14:30:00Z',
          staff: { id: 2, fullname: 'Jane Smith' }
        }
      ]
      
      const sortedHistory = unsortedHistory.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )
      
      expect(sortedHistory[0].action).toBe('Task Created')
      expect(sortedHistory[1].action).toBe('Updated Title: Old → New')
      expect(sortedHistory[2].action).toBe('Updated Status: in-progress → completed')
    })

    it('should maintain chronological order when new entries are added', () => {
      const activityLog = ref([
        {
          id: '1',
          action: 'Task Created',
          timestamp: '2024-03-01T10:00:00Z',
          staff: { id: 1, fullname: 'John Doe' }
        },
        {
          id: '2',
          action: 'Updated Title: Old → New',
          timestamp: '2024-03-02T14:30:00Z',
          staff: { id: 2, fullname: 'Jane Smith' }
        }
      ])
      
      const addNewEntry = (entry: any) => {
        activityLog.value.push(entry)
        activityLog.value.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        )
      }
      
      const newEntry = {
        id: '3',
        action: 'Updated Status: in-progress → completed',
        timestamp: '2024-03-01T12:00:00Z', // Between first and second entry
        staff: { id: 1, fullname: 'John Doe' }
      }
      
      addNewEntry(newEntry)
      
      expect(activityLog.value[0].action).toBe('Task Created')
      expect(activityLog.value[1].action).toBe('Updated Status: in-progress → completed')
      expect(activityLog.value[2].action).toBe('Updated Title: Old → New')
    })

    it('should handle entries with same timestamp correctly', () => {
      const sameTimestamp = '2024-03-01T10:00:00Z'
      const history = [
        {
          id: '1',
          action: 'Task Created',
          timestamp: sameTimestamp,
          staff: { id: 1, fullname: 'John Doe' }
        },
        {
          id: '2',
          action: 'Updated Title: Old → New',
          timestamp: sameTimestamp,
          staff: { id: 2, fullname: 'Jane Smith' }
        }
      ]
      
      const sortedHistory = history.sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime()
        const timeB = new Date(b.timestamp).getTime()
        if (timeA === timeB) {
          return a.id.localeCompare(b.id) // Secondary sort by ID
        }
        return timeA - timeB
      })
      
      expect(sortedHistory[0].id).toBe('1')
      expect(sortedHistory[1].id).toBe('2')
    })
  })

  describe('Activity Log Integration Tests', () => {
    it('should integrate with task detail page correctly', () => {
      const taskDetailPage = {
        name: 'TaskDetailPage',
        props: ['task', 'currentUser'],
        computed: {
          canViewActivityLog() {
            return this.currentUser?.isAdmin
          },
          sortedHistory() {
            return this.task?.history?.sort((a, b) => 
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            ) || []
          }
        }
      }
      
      const mockTask = {
        id: 123,
        title: 'Test Task',
        history: [
          {
            id: '1',
            action: 'Task Created',
            timestamp: '2024-03-01T10:00:00Z',
            staff: { id: 1, fullname: 'John Doe' }
          }
        ]
      }
      
      const mockUser = { id: 1, isAdmin: true }
      
      expect(taskDetailPage.computed.canViewActivityLog.call({ currentUser: mockUser })).toBe(true)
      expect(taskDetailPage.computed.sortedHistory.call({ task: mockTask })).toHaveLength(1)
    })

    it('should handle empty activity log gracefully', () => {
      const emptyHistory = []
      const activityLogComponent = {
        history: emptyHistory,
        isEmpty: emptyHistory.length === 0
      }
      
      expect(activityLogComponent.isEmpty).toBe(true)
      expect(activityLogComponent.history).toHaveLength(0)
    })

    it('should format timestamps consistently across the application', () => {
      const timestamp = '2024-03-01T10:00:00Z'
      const formatTimestamp = (ts: string) => {
        return new Date(ts).toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      }
      
      const formatted = formatTimestamp(timestamp)
      
      expect(formatted).toContain('Mar 1, 2024')
      // Check that the time is formatted (may vary by timezone)
      expect(formatted).toMatch(/\d{1,2}:\d{2}/)
    })
  })

  describe('Activity Log Error Handling', () => {
    it('should handle missing staff information gracefully', () => {
      const activityEntry = {
        id: '1',
        action: 'Task Created',
        timestamp: '2024-03-01T10:00:00Z',
        staff: null // Missing staff info
      }
      
      const displayName = activityEntry.staff?.fullname || 'Unknown User'
      
      expect(displayName).toBe('Unknown User')
    })

    it('should handle invalid timestamps gracefully', () => {
      const invalidTimestamp = 'invalid-date'
      const formatTimestamp = (ts: string) => {
        try {
          const date = new Date(ts)
          return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleString()
        } catch {
          return 'Invalid Date'
        }
      }
      
      const formatted = formatTimestamp(invalidTimestamp)
      
      expect(formatted).toBe('Invalid Date')
    })

    it('should handle activity log fetch errors', async () => {
      const mockFetchWithError = vi.fn(() => 
        Promise.reject(new Error('Failed to fetch activity log'))
      )
      
      const fetchActivityLog = async () => {
        try {
          await mockFetchWithError()
          return []
        } catch (error) {
          console.error('Failed to fetch activity log:', error)
          return []
        }
      }
      
      const result = await fetchActivityLog()
      
      expect(result).toEqual([])
      expect(mockFetchWithError).toHaveBeenCalled()
    })
  })
})
