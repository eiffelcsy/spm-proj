import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createError } from 'h3'

// Mock the event handler
const mockSupabaseServiceRole = vi.fn()
const mockSupabaseUser = vi.fn()
const mockGetRouterParam = vi.fn()
const mockReadBody = vi.fn()

// Mock Supabase operations
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockIs = vi.fn()
const mockSingle = vi.fn()
const mockUpdate = vi.fn()
const mockInsert = vi.fn()
const mockUpsert = vi.fn()

// Mock utility functions
const mockLogTaskUpdate = vi.fn()
const mockLogTaskAssignment = vi.fn()
const mockLogTaskCompletion = vi.fn()
const mockLogActivity = vi.fn()
const mockCreateTaskAssignmentNotification = vi.fn()
const mockCreateTaskUnassignmentNotification = vi.fn()
const mockCreateTaskUpdateNotification = vi.fn()
const mockGetTaskDetails = vi.fn()
const mockReplicateCompletedTask = vi.fn()

// Mock imports
vi.mock('#supabase/server', () => ({
    serverSupabaseServiceRole: () => mockSupabaseServiceRole(),
    serverSupabaseUser: () => mockSupabaseUser()
}))

vi.mock('h3', () => ({
    defineEventHandler: (fn: any) => fn,
    getRouterParam: (...args: any[]) => mockGetRouterParam(...args),
    readBody: (...args: any[]) => mockReadBody(...args),
    createError: (opts: any) => ({ ...opts, __isError: true })
}))

vi.mock('../../../utils/activityLogger', () => ({
    logTaskUpdate: (...args: any[]) => mockLogTaskUpdate(...args),
    logTaskAssignment: (...args: any[]) => mockLogTaskAssignment(...args),
    logTaskCompletion: (...args: any[]) => mockLogTaskCompletion(...args),
    logActivity: (...args: any[]) => mockLogActivity(...args)
}))

vi.mock('../../../utils/notificationService', () => ({
    createTaskAssignmentNotification: (...args: any[]) => mockCreateTaskAssignmentNotification(...args),
    createTaskUnassignmentNotification: (...args: any[]) => mockCreateTaskUnassignmentNotification(...args),
    createTaskUpdateNotification: (...args: any[]) => mockCreateTaskUpdateNotification(...args),
    getTaskDetails: (...args: any[]) => mockGetTaskDetails(...args)
}))

vi.mock('../../../utils/recurringTaskService', () => ({
    replicateCompletedTask: (...args: any[]) => mockReplicateCompletedTask(...args)
}))

describe('Update Task API - PUT /api/tasks/[id]', () => {
    let supabaseClient: any
    let mockEvent: any

    const mockStaffData = {
        id: 1,
        department: 'Engineering'
    }

    const mockTaskData = {
        id: 100,
        title: 'Original Task',
        start_date: '2024-01-01',
        due_date: '2024-01-10',
        status: 'in-progress',
        notes: 'Original notes',
        priority: '5',
        repeat_interval: 0,
        tags: ['#tag1'],
        project_id: 10
    }

    beforeEach(() => {
        // Setup Supabase client mock
        supabaseClient = {
            from: mockFrom
        }

        mockFrom.mockReturnValue({
            select: mockSelect,
            update: mockUpdate,
            insert: mockInsert,
            upsert: mockUpsert
        })

        mockSelect.mockReturnValue({
            eq: mockEq,
            single: mockSingle
        })

        mockEq.mockReturnValue({
            eq: mockEq,
            is: mockIs,
            single: mockSingle,
            select: mockSelect
        })

        mockIs.mockReturnValue({
            single: mockSingle
        })

        mockUpdate.mockReturnValue({
            eq: mockEq,
            select: mockSelect
        })

        // Default mocks
        mockSupabaseServiceRole.mockReturnValue(supabaseClient)
        mockSupabaseUser.mockResolvedValue({ id: 'user-123' })
        mockGetRouterParam.mockReturnValue('100')
        mockReadBody.mockResolvedValue({ task_name: 'Updated Task' })

        // Default staff data
        mockSingle.mockResolvedValue({ data: mockStaffData, error: null })

        mockGetTaskDetails.mockResolvedValue({
            title: 'Test Task',
            projectName: 'Test Project'
        })
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    describe('Authentication & Authorization', () => {
        it('should return 401 if user is not authenticated', async () => {
            mockSupabaseUser.mockResolvedValueOnce(null)

            const handler = await import('../../../server/api/tasks/[id]/index.put')

            try {
                await handler.default(mockEvent)
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.statusCode).toBe(401)
                expect(error.statusMessage).toContain('Unauthorized')
            }
        })

        it('should return 400 if task ID is missing', async () => {
            mockGetRouterParam.mockReturnValueOnce(null)

            const handler = await import('../../../server/api/tasks/[id]/index.put')

            try {
                await handler.default(mockEvent)
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.statusCode).toBe(400)
                expect(error.statusMessage).toContain('Task ID is required')
            }
        })

        it('should return 400 if request body is missing', async () => {
            mockReadBody.mockResolvedValueOnce(null)

            const handler = await import('../../../server/api/tasks/[id]/index.put')

            try {
                await handler.default(mockEvent)
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.statusCode).toBe(400)
                expect(error.statusMessage).toContain('Request body is required')
            }
        })

        it('should return 403 if user has no department', async () => {
            mockSingle.mockResolvedValueOnce({
                data: { id: 1, department: null },
                error: null
            })

            const handler = await import('../../../server/api/tasks/[id]/index.put')

            try {
                await handler.default(mockEvent)
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.statusCode).toBe(403)
                expect(error.statusMessage).toContain('You do not have permission')
            }
        })

        it('should return 403 if user department has no assigned staff', async () => {
            // Mock staff data
            mockSingle
                .mockResolvedValueOnce({ data: mockStaffData, error: null })
                .mockResolvedValueOnce({ data: { id: 100 }, error: null })

            // Mock assignees (different department)
            mockEq.mockReturnValueOnce({
                eq: vi.fn().mockResolvedValue({
                    data: [{ assigned_to_staff_id: 999 }],
                    error: null
                })
            })

            // Mock department staff (empty)
            mockEq.mockReturnValueOnce({
                data: [{ id: 1 }],
                error: null
            })

            const handler = await import('../../../server/api/tasks/[id]/index.put')

            try {
                await handler.default(mockEvent)
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.statusCode).toBe(403)
            }
        })

        it('should return 404 if task does not exist', async () => {
            mockSingle
                .mockResolvedValueOnce({ data: mockStaffData, error: null })
                .mockResolvedValueOnce({
                    data: null,
                    error: { code: 'PGRST116' }
                })

            const handler = await import('../../../server/api/tasks/[id]/index.put')

            try {
                await handler.default(mockEvent)
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.statusCode).toBe(404)
                expect(error.statusMessage).toContain('Task not found')
            }
        })

        it('should return 403 if assigned user is not current user', async () => {
            // Setup: task is assigned to different user
            mockSingle
                .mockResolvedValueOnce({ data: mockStaffData, error: null })
                .mockResolvedValueOnce({ data: { id: 100 }, error: null })

            mockEq.mockReturnValueOnce({
                eq: vi.fn().mockResolvedValue({
                    data: [{ assigned_to_staff_id: 2 }], // Different user
                    error: null
                })
            })

            mockEq.mockReturnValueOnce({
                data: [{ id: 1 }, { id: 2 }],
                error: null
            })

            const handler = await import('../../../server/api/tasks/[id]/index.put')

            try {
                await handler.default(mockEvent)
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.statusCode).toBe(403)
                expect(error.statusMessage).toContain('Only assigned staff can edit')
            }
        })

        it('should allow task creator to edit unassigned task', async () => {
            mockSingle
                .mockResolvedValueOnce({ data: mockStaffData, error: null })
                .mockResolvedValueOnce({ data: { id: 100 }, error: null })

            // No assignees
            mockEq.mockReturnValueOnce({
                eq: vi.fn().mockResolvedValue({
                    data: [],
                    error: null
                })
            })

            // Task creator is current user
            mockSingle.mockResolvedValueOnce({
                data: { creator_id: 1 },
                error: null
            })

            // Current task data
            mockSingle.mockResolvedValueOnce({
                data: mockTaskData,
                error: null
            })

            // Update result
            mockSelect.mockResolvedValueOnce({
                data: { ...mockTaskData, title: 'Updated' },
                error: null
            })

            const handler = await import('../../../server/api/tasks/[id]/index.put')
            const result = await handler.default(mockEvent)

            expect(result.success).toBe(true)
        })
    })

    describe('Task Field Updates', () => {
        beforeEach(() => {
            // Setup successful authorization
            setupSuccessfulAuth()
        })

        it('should update task title', async () => {
            mockReadBody.mockResolvedValueOnce({ task_name: 'New Title' })
            mockSingle.mockResolvedValueOnce({ data: mockTaskData, error: null })

            const updatedTask = { ...mockTaskData, title: 'New Title' }
            mockSelect.mockResolvedValueOnce({
                data: updatedTask,
                error: null
            })

            const handler = await import('../../../server/api/tasks/[id]/index.put')
            const result = await handler.default(mockEvent)

            expect(mockUpdate).toHaveBeenCalled()
            expect(mockLogTaskUpdate).toHaveBeenCalled()
            expect(result.success).toBe(true)
        })

        it('should update start and due dates', async () => {
            mockReadBody.mockResolvedValueOnce({
                start_date: '2024-02-01',
                end_date: '2024-02-10'
            })

            mockSingle.mockResolvedValueOnce({ data: mockTaskData, error: null })

            const handler = await import('../../../server/api/tasks/[id]/index.put')
            const result = await handler.default(mockEvent)

            expect(result.success).toBe(true)
        })

        it('should update status', async () => {
            mockReadBody.mockResolvedValueOnce({ status: 'completed' })
            mockSingle.mockResolvedValueOnce({ data: mockTaskData, error: null })

            const handler = await import('../../../server/api/tasks/[id]/index.put')
            const result = await handler.default(mockEvent)

            expect(mockLogTaskCompletion).toHaveBeenCalled()
            expect(result.success).toBe(true)
        })

        it('should update priority', async () => {
            mockReadBody.mockResolvedValueOnce({ priority: '8' })
            mockSingle.mockResolvedValueOnce({ data: mockTaskData, error: null })

            const handler = await import('../../../server/api/tasks/[id]/index.put')
            const result = await handler.default(mockEvent)

            expect(result.success).toBe(true)
        })

        it('should update notes', async () => {
            mockReadBody.mockResolvedValueOnce({ notes: 'Updated notes' })
            mockSingle.mockResolvedValueOnce({ data: mockTaskData, error: null })

            const handler = await import('../../../server/api/tasks/[id]/index.put')
            const result = await handler.default(mockEvent)

            expect(result.success).toBe(true)
        })

        it('should update tags', async () => {
            mockReadBody.mockResolvedValueOnce({ tags: ['#new', '#tags'] })
            mockSingle.mockResolvedValueOnce({ data: mockTaskData, error: null })

            const handler = await import('../../../server/api/tasks/[id]/index.put')
            const result = await handler.default(mockEvent)

            expect(result.success).toBe(true)
        })

        it('should auto-calculate due date when repeat_interval is set', async () => {
            mockReadBody.mockResolvedValueOnce({
                start_date: '2024-01-01',
                repeat_interval: 7
            })

            mockSingle.mockResolvedValueOnce({ data: mockTaskData, error: null })

            const handler = await import('../../../server/api/tasks/[id]/index.put')
            await handler.default(mockEvent)

            // Verify due_date was calculated (7 days after start_date)
            expect(mockUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    due_date: '2024-01-08'
                })
            )
        })

        it('should log changes with old and new values', async () => {
            mockReadBody.mockResolvedValueOnce({
                task_name: 'New Title',
                priority: '10'
            })

            mockSingle.mockResolvedValueOnce({ data: mockTaskData, error: null })

            const handler = await import('../../../server/api/tasks/[id]/index.put')
            await handler.default(mockEvent)

            expect(mockLogTaskUpdate).toHaveBeenCalledWith(
                supabaseClient,
                100,
                1,
                expect.arrayContaining([
                    expect.objectContaining({
                        field: 'title',
                        oldValue: 'Original Task',
                        newValue: 'New Title'
                    })
                ])
            )
        })
    })

    describe('Assignee Management', () => {
        beforeEach(() => {
            setupSuccessfulAuth()
        })

        it('should update single assignee (legacy format)', async () => {
            mockReadBody.mockResolvedValueOnce({ assignee_id: 2 })
            mockSingle.mockResolvedValueOnce({ data: mockTaskData, error: null })

            // Current assignees
            mockEq.mockResolvedValueOnce({
                data: [{ assigned_to_staff_id: 1 }],
                error: null
            })

            const handler = await import('../../../server/api/tasks/[id]/index.put')
            const result = await handler.default(mockEvent)

            expect(mockUpdate).toHaveBeenCalled() // Deactivate old
            expect(mockUpsert).toHaveBeenCalled() // Add new
            expect(result.success).toBe(true)
        })

        it('should update multiple assignees', async () => {
            mockReadBody.mockResolvedValueOnce({ assignee_ids: [2, 3, 4] })
            mockSingle.mockResolvedValueOnce({ data: mockTaskData, error: null })

            mockEq.mockResolvedValueOnce({
                data: [{ assigned_to_staff_id: 1 }],
                error: null
            })

            const handler = await import('../../../server/api/tasks/[id]/index.put')
            const result = await handler.default(mockEvent)

            expect(result.success).toBe(true)
            expect(mockUpsert).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ assigned_to_staff_id: 2 }),
                    expect.objectContaining({ assigned_to_staff_id: 3 }),
                    expect.objectContaining({ assigned_to_staff_id: 4 })
                ]),
                expect.anything()
            )
        })

        it('should enforce minimum 1 assignee requirement', async () => {
            mockReadBody.mockResolvedValueOnce({ assignee_ids: [] })
            mockSingle.mockResolvedValueOnce({ data: mockTaskData, error: null })

            const handler = await import('../../../server/api/tasks/[id]/index.put')

            try {
                await handler.default(mockEvent)
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.statusCode).toBe(400)
                expect(error.statusMessage).toContain('At least one assignee is required')
            }
        })

        it('should enforce maximum 5 assignees limit', async () => {
            mockReadBody.mockResolvedValueOnce({
                assignee_ids: [1, 2, 3, 4, 5, 6] // 6 assignees
            })
            mockSingle.mockResolvedValueOnce({ data: mockTaskData, error: null })

            const handler = await import('../../../server/api/tasks/[id]/index.put')

            try {
                await handler.default(mockEvent)
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.statusCode).toBe(400)
                expect(error.statusMessage).toContain('Maximum 5 assignees')
            }
        })

        it('should log assignment changes for new assignees', async () => {
            mockReadBody.mockResolvedValueOnce({ assignee_ids: [1, 2, 3] })
            mockSingle.mockResolvedValueOnce({ data: mockTaskData, error: null })

            // Current has only assignee 1
            mockEq.mockResolvedValueOnce({
                data: [{ assigned_to_staff_id: 1 }],
                error: null
            })

            const handler = await import('../../../server/api/tasks/[id]/index.put')
            await handler.default(mockEvent)

            // Should log for assignees 2 and 3 (new)
            expect(mockLogTaskAssignment).toHaveBeenCalledTimes(2)
            expect(mockCreateTaskAssignmentNotification).toHaveBeenCalledTimes(2)
        })

        it('should log unassignment for removed assignees', async () => {
            mockReadBody.mockResolvedValueOnce({ assignee_ids: [1] })
            mockSingle.mockResolvedValueOnce({ data: mockTaskData, error: null })

            // Current has assignees 1, 2, 3
            mockEq.mockResolvedValueOnce({
                data: [
                    { assigned_to_staff_id: 1 },
                    { assigned_to_staff_id: 2 },
                    { assigned_to_staff_id: 3 }
                ],
                error: null
            })

            // Mock staff names for removed assignees
            mockSingle
                .mockResolvedValueOnce({ data: { fullname: 'User 2' }, error: null })
                .mockResolvedValueOnce({ data: { fullname: 'User 3' }, error: null })

            const handler = await import('../../../server/api/tasks/[id]/index.put')
            await handler.default(mockEvent)

            expect(mockLogActivity).toHaveBeenCalledTimes(2) // For 2 removed
            expect(mockCreateTaskUnassignmentNotification).toHaveBeenCalledTimes(2)
        })
    })

    describe('Subtask Management', () => {
        beforeEach(() => {
            setupSuccessfulAuth()
        })

        it('should create new subtasks', async () => {
            mockReadBody.mockResolvedValueOnce({
                task_name: 'Parent Task',
                subtasks: [{
                    title: 'New Subtask',
                    start_date: '2024-01-01',
                    due_date: '2024-01-05',
                    status: 'not-started',
                    priority: '5',
                    notes: 'Subtask notes',
                    assignee_ids: [1, 2]
                }]
            })

            mockSingle.mockResolvedValueOnce({ data: mockTaskData, error: null })

            // Mock subtask insert
            mockSelect.mockResolvedValueOnce({
                data: { id: 200, title: 'New Subtask' },
                error: null
            })

            const handler = await import('../../../server/api/tasks/[id]/index.put')
            const result = await handler.default(mockEvent)

            expect(mockInsert).toHaveBeenCalled()
            expect(result.success).toBe(true)
        })

        it('should update existing subtasks', async () => {
            mockReadBody.mockResolvedValueOnce({
                subtasks: [{
                    id: 201,
                    title: 'Updated Subtask',
                    start_date: '2024-01-01',
                    due_date: '2024-01-05',
                    status: 'in-progress',
                    assignee_ids: [1]
                }]
            })

            mockSingle
                .mockResolvedValueOnce({ data: mockTaskData, error: null })
                .mockResolvedValueOnce({
                    data: { id: 201, parent_task_id: 100 },
                    error: null
                })

            const handler = await import('../../../server/api/tasks/[id]/index.put')
            const result = await handler.default(mockEvent)

            expect(mockUpdate).toHaveBeenCalled()
            expect(result.success).toBe(true)
        })

        it('should enforce minimum 1 assignee for subtasks', async () => {
            mockReadBody.mockResolvedValueOnce({
                subtasks: [{
                    title: 'Subtask',
                    assignee_ids: [] // No assignees
                }]
            })

            mockSingle.mockResolvedValueOnce({ data: mockTaskData, error: null })

            const handler = await import('../../../server/api/tasks/[id]/index.put')

            try {
                await handler.default(mockEvent)
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.statusCode).toBe(400)
                expect(error.statusMessage).toContain('at least one assignee required')
            }
        })

        it('should enforce maximum 5 assignees for subtasks', async () => {
            mockReadBody.mockResolvedValueOnce({
                subtasks: [{
                    title: 'Subtask',
                    assignee_ids: [1, 2, 3, 4, 5, 6] // 6 assignees
                }]
            })

            mockSingle.mockResolvedValueOnce({ data: mockTaskData, error: null })

            const handler = await import('../../../server/api/tasks/[id]/index.put')

            try {
                await handler.default(mockEvent)
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.statusCode).toBe(400)
                expect(error.statusMessage).toContain('Maximum 5 assignees')
            }
        })

        it('should inherit parent project_id for subtasks', async () => {
            mockReadBody.mockResolvedValueOnce({
                subtasks: [{
                    title: 'Subtask',
                    assignee_ids: [1]
                }]
            })

            mockSingle.mockResolvedValueOnce({ data: mockTaskData, error: null })

            mockSelect.mockResolvedValueOnce({
                data: { id: 200 },
                error: null
            })

            const handler = await import('../../../server/api/tasks/[id]/index.put')
            await handler.default(mockEvent)

            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    project_id: mockTaskData.project_id
                })
            )
        })

        it('should auto-calculate subtask due date when repeat_interval is set', async () => {
            mockReadBody.mockResolvedValueOnce({
                subtasks: [{
                    title: 'Subtask',
                    start_date: '2024-01-01',
                    repeat_interval: 5,
                    assignee_ids: [1]
                }]
            })

            mockSingle.mockResolvedValueOnce({ data: mockTaskData, error: null })

            mockSelect.mockResolvedValueOnce({
                data: { id: 200 },
                error: null
            })

            const handler = await import('../../../server/api/tasks/[id]/index.put')
            await handler.default(mockEvent)

            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    due_date: '2024-01-06' // 5 days after start
                })
            )
        })
    })

    describe('Notifications', () => {
        beforeEach(() => {
            setupSuccessfulAuth()
        })

        it('should create update notifications for all assignees', async () => {
            mockReadBody.mockResolvedValueOnce({
                task_name: 'Updated Title'
            })

            mockSingle.mockResolvedValueOnce({ data: mockTaskData, error: null })

            // Mock assignees
            mockEq.mockResolvedValueOnce({
                data: [
                    { assigned_to_staff_id: 1 },
                    { assigned_to_staff_id: 2 }
                ],
                error: null
            })

            const handler = await import('../../../server/api/tasks/[id]/index.put')
            await handler.default(mockEvent)

            expect(mockCreateTaskUpdateNotification).toHaveBeenCalledTimes(2)
        })

        it('should create assignment notifications for new assignees', async () => {
            mockReadBody.mockResolvedValueOnce({ assignee_ids: [2, 3] })
            mockSingle.mockResolvedValueOnce({ data: mockTaskData, error: null })

            mockEq.mockResolvedValueOnce({
                data: [], // No current assignees
                error: null
            })

            const handler = await import('../../../server/api/tasks/[id]/index.put')
            await handler.default(mockEvent)

            expect(mockCreateTaskAssignmentNotification).toHaveBeenCalledTimes(2)
        })

        it('should create unassignment notifications for removed assignees', async () => {
            mockReadBody.mockResolvedValueOnce({ assignee_ids: [1] })
            mockSingle.mockResolvedValueOnce({ data: mockTaskData, error: null })

            mockEq.mockResolvedValueOnce({
                data: [
                    { assigned_to_staff_id: 1 },
                    { assigned_to_staff_id: 2 }
                ],
                error: null
            })

            mockSingle.mockResolvedValueOnce({
                data: { fullname: 'User 2' },
                error: null
            })

            const handler = await import('../../../server/api/tasks/[id]/index.put')
            await handler.default(mockEvent)

            expect(mockCreateTaskUnassignmentNotification).toHaveBeenCalledTimes(1)
        })
    })

    describe('Recurring Task Replication', () => {
        beforeEach(() => {
            setupSuccessfulAuth()
        })

        it('should replicate task when completed with repeat_interval', async () => {
            const recurringTask = {
                ...mockTaskData,
                status: 'in-progress',
                repeat_interval: 7
            }

            mockReadBody.mockResolvedValueOnce({ status: 'completed' })
            mockSingle.mockResolvedValueOnce({ data: recurringTask, error: null })

            const completedTask = { ...recurringTask, status: 'completed' }
            mockSelect.mockResolvedValueOnce({
                data: completedTask,
                error: null
            })

            const newTask = {
                id: 201,
                ...completedTask,
                status: 'not-started',
                start_date: '2024-01-11',
                due_date: '2024-01-18'
            }

            mockReplicateCompletedTask.mockResolvedValueOnce({
                success: true,
                newTask
            })

            const handler = await import('../../../server/api/tasks/[id]/index.put')
            const result = await handler.default(mockEvent)

            expect(mockReplicateCompletedTask).toHaveBeenCalledWith(
                supabaseClient,
                completedTask
            )
            expect(result.replicatedTask).toBeDefined()
            expect(result.replicatedTask.id).toBe(201)
        })

        it('should not replicate if task not completed', async () => {
            mockReadBody.mockResolvedValueOnce({ priority: '8' })
            mockSingle.mockResolvedValueOnce({
                data: { ...mockTaskData, repeat_interval: 7 },
                error: null
            })

            const handler = await import('../../../server/api/tasks/[id]/index.put')
            const result = await handler.default(mockEvent)

            expect(mockReplicateCompletedTask).not.toHaveBeenCalled()
            expect(result.replicatedTask).toBeUndefined()
        })

        it('should not replicate if no repeat_interval', async () => {
            mockReadBody.mockResolvedValueOnce({ status: 'completed' })
            mockSingle.mockResolvedValueOnce({
                data: { ...mockTaskData, status: 'in-progress', repeat_interval: 0 },
                error: null
            })

            const handler = await import('../../../server/api/tasks/[id]/index.put')
            const result = await handler.default(mockEvent)

            expect(mockReplicateCompletedTask).not.toHaveBeenCalled()
            expect(result.replicatedTask).toBeUndefined()
        })
    })

    describe('Error Handling', () => {
        beforeEach(() => {
            setupSuccessfulAuth()
        })

        it('should handle database update errors', async () => {
            mockReadBody.mockResolvedValueOnce({ task_name: 'New Title' })
            mockSingle.mockResolvedValueOnce({ data: mockTaskData, error: null })

            mockSelect.mockResolvedValueOnce({
                data: null,
                error: { message: 'Database error' }
            })

            const handler = await import('../../../server/api/tasks/[id]/index.put')

            try {
                await handler.default(mockEvent)
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.statusCode).toBe(500)
                expect(error.statusMessage).toContain('Failed to update task')
            }
        })

        it('should handle subtask fetch errors', async () => {
            mockReadBody.mockResolvedValueOnce({
                subtasks: [{
                    id: 999, // Non-existent subtask
                    title: 'Updated'
                }]
            })

            mockSingle
                .mockResolvedValueOnce({ data: mockTaskData, error: null })
                .mockResolvedValueOnce({
                    data: null,
                    error: { message: 'Not found' }
                })

            const handler = await import('../../../server/api/tasks/[id]/index.put')

            try {
                await handler.default(mockEvent)
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.statusCode).toBe(400)
                expect(error.statusMessage).toContain('Subtask id 999 not found')
            }
        })

        it('should handle assignee upsert errors', async () => {
            mockReadBody.mockResolvedValueOnce({ assignee_ids: [2, 3] })
            mockSingle.mockResolvedValueOnce({ data: mockTaskData, error: null })

            mockEq.mockResolvedValueOnce({
                data: [{ assigned_to_staff_id: 1 }],
                error: null
            })

            mockUpsert.mockResolvedValueOnce({
                error: { message: 'Upsert failed' }
            })

            const handler = await import('../../../server/api/tasks/[id]/index.put')

            try {
                await handler.default(mockEvent)
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.statusCode).toBe(500)
                expect(error.statusMessage).toContain('Failed to update task assignees')
            }
        })
    })

    // Helper function to setup successful authorization
    function setupSuccessfulAuth() {
        mockSupabaseUser.mockResolvedValue({ id: 'user-123' })
        mockGetRouterParam.mockReturnValue('100')

        // Staff data
        mockSingle
            .mockResolvedValueOnce({ data: mockStaffData, error: null })
            // Task exists
            .mockResolvedValueOnce({ data: { id: 100 }, error: null })

        // Assignees - current user is assigned
        mockEq.mockResolvedValueOnce({
            eq: vi.fn().mockResolvedValue({
                data: [{ assigned_to_staff_id: 1 }],
                error: null
            })
        })

        // Department staff
        mockEq.mockResolvedValueOnce({
            data: [{ id: 1 }],
            error: null
        })

        // Current task data
        mockSingle.mockResolvedValueOnce({
            data: mockTaskData,
            error: null
        })

        // Update result
        mockSelect.mockResolvedValueOnce({
            data: { ...mockTaskData, updated: true },
            error: null
        })
    }
})