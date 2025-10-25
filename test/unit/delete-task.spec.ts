import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the event handler
const mockSupabaseServiceRole = vi.fn()
const mockSupabaseUser = vi.fn()
const mockGetRouterParam = vi.fn()

// Mock Supabase operations
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockIs = vi.fn()
const mockNot = vi.fn()
const mockIn = vi.fn()
const mockSingle = vi.fn()
const mockMaybeSingle = vi.fn()
const mockUpdate = vi.fn()

// Mock utility functions
const mockLogTaskDeletion = vi.fn()
const mockCreateTaskDeletionNotification = vi.fn()
const mockGetTaskDetails = vi.fn()

// Mock imports
vi.mock('#supabase/server', () => ({
    serverSupabaseServiceRole: () => mockSupabaseServiceRole(),
    serverSupabaseUser: () => mockSupabaseUser()
}))

vi.mock('h3', () => ({
    defineEventHandler: (fn: any) => fn,
    getRouterParam: (...args: any[]) => mockGetRouterParam(...args),
    createError: (opts: any) => ({ ...opts, __isError: true })
}))

vi.mock('../../../utils/activityLogger', () => ({
    logTaskDeletion: (...args: any[]) => mockLogTaskDeletion(...args)
}))

vi.mock('../../../utils/notificationService', () => ({
    createTaskDeletionNotification: (...args: any[]) => mockCreateTaskDeletionNotification(...args),
    getTaskDetails: (...args: any[]) => mockGetTaskDetails(...args)
}))

describe('Delete Task API - DELETE /api/tasks/[id]', () => {
    let supabaseClient: any
    let mockEvent: any

    const mockStaffData = {
        id: 1,
        department: 'Engineering'
    }

    const mockTaskData = {
        id: 100,
        title: 'Task to Delete',
        deleted_at: null,
        creator_id: 1
    }

    beforeEach(() => {
        // Setup Supabase client mock
        supabaseClient = {
            from: mockFrom
        }

        // Setup chainable methods
        mockFrom.mockReturnValue({
            select: mockSelect,
            update: mockUpdate
        })

        mockSelect.mockReturnValue({
            eq: mockEq,
            is: mockIs,
            not: mockNot,
            in: mockIn,
            single: mockSingle,
            maybeSingle: mockMaybeSingle
        })

        mockEq.mockReturnValue({
            eq: mockEq,
            is: mockIs,
            not: mockNot,
            single: mockSingle,
            maybeSingle: mockMaybeSingle,
            select: mockSelect
        })

        mockIs.mockReturnValue({
            single: mockSingle,
            maybeSingle: mockMaybeSingle
        })

        mockNot.mockReturnValue({
            maybeSingle: mockMaybeSingle
        })

        mockUpdate.mockReturnValue({
            eq: mockEq,
            in: mockIn,
            select: mockSelect
        })

        mockIn.mockReturnValue({
            select: mockSelect
        })

        // Default mocks
        mockSupabaseServiceRole.mockReturnValue(supabaseClient)
        mockSupabaseUser.mockResolvedValue({ id: 'user-123' })
        mockGetRouterParam.mockReturnValue('100')

        mockGetTaskDetails.mockResolvedValue({
            title: 'Task to Delete',
            projectName: 'Test Project'
        })
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    describe('Authentication & Validation', () => {
        it('should return 401 if user is not authenticated', async () => {
            mockSupabaseUser.mockResolvedValueOnce(null)

            const handler = await import('~/server/api/tasks/[id]/index.delete')

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

            const handler = await import('~/server/api/tasks/[id]/index.delete')

            try {
                await handler.default(mockEvent)
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.statusCode).toBe(400)
                expect(error.statusMessage).toContain('Task ID is required')
            }
        })

        it('should return 400 if task ID is invalid format', async () => {
            mockGetRouterParam.mockReturnValueOnce('invalid-id')

            // Mock staff data
            mockSingle.mockResolvedValueOnce({ data: mockStaffData, error: null })

            const handler = await import('~/server/api/tasks/[id]/index.delete')

            try {
                await handler.default(mockEvent)
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.statusCode).toBe(400)
                expect(error.statusMessage).toContain('Invalid task ID format')
            }
        })

        it('should return 404 if task does not exist', async () => {
            // Mock staff data
            mockSingle.mockResolvedValueOnce({ data: mockStaffData, error: null })

            // Mock task not found
            mockSingle.mockResolvedValueOnce({
                data: null,
                error: { code: 'PGRST116' }
            })

            // Mock checking for soft-deleted task
            mockMaybeSingle.mockResolvedValueOnce({
                data: null,
                error: null
            })

            const handler = await import('~/server/api/tasks/[id]/index.delete')

            try {
                await handler.default(mockEvent)
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.statusCode).toBe(404)
                expect(error.statusMessage).toContain('Task not found')
            }
        })

        it('should return 404 if task is already soft-deleted', async () => {
            // Mock staff data
            mockSingle.mockResolvedValueOnce({ data: mockStaffData, error: null })

            // Mock task not found (soft-deleted)
            mockSingle.mockResolvedValueOnce({
                data: null,
                error: { code: 'PGRST116' }
            })

            // Mock finding soft-deleted task
            mockMaybeSingle.mockResolvedValueOnce({
                data: { id: 100, deleted_at: '2024-01-01T00:00:00Z' },
                error: null
            })

            const handler = await import('~/server/api/tasks/[id]/index.delete')

            try {
                await handler.default(mockEvent)
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.statusCode).toBe(404)
                expect(error.statusMessage).toContain('Task not found')
            }
        })

        it('should return 500 if staff ID fetch fails', async () => {
            mockSingle.mockResolvedValueOnce({
                data: null,
                error: { message: 'Database error' }
            })

            const handler = await import('~/server/api/tasks/[id]/index.delete')

            try {
                await handler.default(mockEvent)
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.statusCode).toBe(500)
                expect(error.statusMessage).toContain('Failed to fetch staff ID')
            }
        })
    })

    describe('Permission Checks', () => {
        beforeEach(() => {
            // Mock staff data
            mockSingle.mockResolvedValueOnce({ data: mockStaffData, error: null })
            // Mock task exists
            mockSingle.mockResolvedValueOnce({ data: mockTaskData, error: null })
        })

        it('should return 403 if user has no department', async () => {
            // Override staff data to have no department
            mockSingle.mockReset()
            mockSingle.mockResolvedValueOnce({
                data: { id: 1, department: null },
                error: null
            })
            mockSingle.mockResolvedValueOnce({ data: mockTaskData, error: null })

            const handler = await import('~/server/api/tasks/[id]/index.delete')

            try {
                await handler.default(mockEvent)
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.statusCode).toBe(403)
                expect(error.statusMessage).toContain('You do not have permission')
            }
        })

        it('should return 403 if no one from user department is assigned', async () => {
            // Mock assignees (none from user's department)
            mockEq.mockResolvedValueOnce({
                data: [{ assigned_to_staff_id: 999 }], // Different department
                error: null
            })

            // Mock department staff
            mockEq.mockResolvedValueOnce({
                data: [{ id: 1 }, { id: 2 }], // User's department staff
                error: null
            })

            const handler = await import('~/server/api/tasks/[id]/index.delete')

            try {
                await handler.default(mockEvent)
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.statusCode).toBe(403)
                expect(error.statusMessage).toContain('You do not have permission')
            }
        })

        it('should return 500 if department staff fetch fails', async () => {
            // Mock assignees
            mockEq.mockResolvedValueOnce({
                data: [{ assigned_to_staff_id: 1 }],
                error: null
            })

            // Mock department staff fetch error
            mockEq.mockResolvedValueOnce({
                data: null,
                error: { message: 'Database error' }
            })

            const handler = await import('~/server/api/tasks/[id]/index.delete')

            try {
                await handler.default(mockEvent)
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.statusCode).toBe(500)
                expect(error.statusMessage).toContain('Failed to fetch department staff')
            }
        })

        it('should return 403 if assigned task and user is not assigned', async () => {
            // Mock assignees - task assigned to someone else
            mockEq.mockResolvedValueOnce({
                data: [{ assigned_to_staff_id: 2 }],
                error: null
            })

            // Mock department staff - both in same department
            mockEq.mockResolvedValueOnce({
                data: [{ id: 1 }, { id: 2 }],
                error: null
            })

            const handler = await import('~/server/api/tasks/[id]/index.delete')

            try {
                await handler.default(mockEvent)
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.statusCode).toBe(403)
                expect(error.statusMessage).toContain('Only assigned staff can delete')
            }
        })

        it('should return 403 if unassigned task and user is not creator', async () => {
            // Mock no assignees
            mockEq.mockResolvedValueOnce({
                data: [],
                error: null
            })

            // Mock department staff
            mockEq.mockResolvedValueOnce({
                data: [{ id: 1 }],
                error: null
            })

            // Mock task creator is different user
            mockSingle.mockResolvedValueOnce({
                data: { creator_id: 2 },
                error: null
            })

            const handler = await import('~/server/api/tasks/[id]/index.delete')

            try {
                await handler.default(mockEvent)
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.statusCode).toBe(403)
                expect(error.statusMessage).toContain('Only the task creator can delete')
            }
        })

        it('should allow assigned user to delete assigned task', async () => {
            // Setup successful deletion
            setupSuccessfulDeletion()

            const handler = await import('~/server/api/tasks/[id]/index.delete')
            const result = await handler.default(mockEvent)

            expect(result.success).toBe(true)
            expect(result.message).toContain('soft deleted successfully')
        })

        it('should allow creator to delete unassigned task', async () => {
            // Mock staff and task
            mockSingle.mockReset()
            mockSingle.mockResolvedValueOnce({ data: mockStaffData, error: null })
            mockSingle.mockResolvedValueOnce({ data: mockTaskData, error: null })

            // Mock no assignees
            mockEq.mockResolvedValueOnce({
                data: [],
                error: null
            })

            // Mock department staff
            mockEq.mockResolvedValueOnce({
                data: [{ id: 1 }],
                error: null
            })

            // Mock creator is current user
            mockSingle.mockResolvedValueOnce({
                data: { creator_id: 1 },
                error: null
            })

            // Mock no subtasks
            mockEq.mockResolvedValueOnce({
                data: [],
                error: null
            })

            // Mock successful deletion
            mockSelect.mockResolvedValueOnce({
                data: [{ ...mockTaskData, deleted_at: new Date().toISOString() }],
                error: null
            })

            // Mock assignees for notification
            mockEq.mockResolvedValueOnce({
                data: [],
                error: null
            })

            const handler = await import('~/server/api/tasks/[id]/index.delete')
            const result = await handler.default(mockEvent)

            expect(result.success).toBe(true)
        })
    })

    describe('Soft Deletion', () => {
        beforeEach(() => {
            setupSuccessfulDeletion()
        })

        it('should soft delete task by setting deleted_at timestamp', async () => {
            const handler = await import('~/server/api/tasks/[id]/index.delete')
            await handler.default(mockEvent)

            expect(mockUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    deleted_at: expect.any(String)
                })
            )
        })

        it('should return deleted task data', async () => {
            const deletedTask = {
                ...mockTaskData,
                deleted_at: '2024-01-15T10:30:00Z'
            }

            // Override the delete result
            mockSelect.mockReset()
            mockSelect.mockResolvedValueOnce({
                data: [deletedTask],
                error: null
            })

            const handler = await import('~/server/api/tasks/[id]/index.delete')
            const result = await handler.default(mockEvent)

            expect(result.deletedTask).toEqual(deletedTask)
        })

        it('should return 404 if task not found during deletion', async () => {
            // Override delete to return empty
            mockSelect.mockReset()
            mockSelect.mockResolvedValueOnce({
                data: [],
                error: null
            })

            const handler = await import('~/server/api/tasks/[id]/index.delete')

            try {
                await handler.default(mockEvent)
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.statusCode).toBe(404)
                expect(error.statusMessage).toContain('Task not found or already deleted')
            }
        })

        it('should return 500 if deletion fails', async () => {
            // Override delete to fail
            mockSelect.mockReset()
            mockSelect.mockResolvedValueOnce({
                data: null,
                error: { message: 'Delete failed' }
            })

            const handler = await import('~/server/api/tasks/[id]/index.delete')

            try {
                await handler.default(mockEvent)
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.statusCode).toBe(500)
                expect(error.statusMessage).toContain('Failed to soft delete task')
            }
        })
    })

    describe('Subtask Handling', () => {
        it('should soft delete all subtasks when deleting parent task', async () => {
            // Mock staff and task
            mockSingle.mockReset()
            mockSingle.mockResolvedValueOnce({ data: mockStaffData, error: null })
            mockSingle.mockResolvedValueOnce({ data: mockTaskData, error: null })

            // Mock assignees
            mockEq.mockResolvedValueOnce({
                data: [{ assigned_to_staff_id: 1 }],
                error: null
            })

            // Mock department staff
            mockEq.mockResolvedValueOnce({
                data: [{ id: 1 }],
                error: null
            })

            // Mock subtasks exist
            mockEq.mockResolvedValueOnce({
                data: [{ id: 101 }, { id: 102 }, { id: 103 }],
                error: null
            })

            // Mock subtask deletion
            mockIn.mockResolvedValueOnce({
                error: null
            })

            // Mock parent task deletion
            mockSelect.mockResolvedValueOnce({
                data: [{ ...mockTaskData, deleted_at: new Date().toISOString() }],
                error: null
            })

            // Mock assignees for notification
            mockEq.mockResolvedValueOnce({
                data: [{ assigned_to_staff_id: 1 }],
                error: null
            })

            const handler = await import('~/server/api/tasks/[id]/index.delete')
            const result = await handler.default(mockEvent)

            expect(mockIn).toHaveBeenCalledWith('id', [101, 102, 103])
            expect(result.success).toBe(true)
        })

        it('should return 500 if subtask deletion fails', async () => {
            // Mock staff and task
            mockSingle.mockReset()
            mockSingle.mockResolvedValueOnce({ data: mockStaffData, error: null })
            mockSingle.mockResolvedValueOnce({ data: mockTaskData, error: null })

            // Mock assignees
            mockEq.mockResolvedValueOnce({
                data: [{ assigned_to_staff_id: 1 }],
                error: null
            })

            // Mock department staff
            mockEq.mockResolvedValueOnce({
                data: [{ id: 1 }],
                error: null
            })

            // Mock subtasks exist
            mockEq.mockResolvedValueOnce({
                data: [{ id: 101 }],
                error: null
            })

            // Mock subtask deletion fails
            mockIn.mockResolvedValueOnce({
                error: { message: 'Subtask delete failed' }
            })

            const handler = await import('~/server/api/tasks/[id]/index.delete')

            try {
                await handler.default(mockEvent)
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.statusCode).toBe(500)
                expect(error.statusMessage).toContain('Failed to soft delete subtasks')
            }
        })

        it('should continue deletion if no subtasks exist', async () => {
            // Mock staff and task
            mockSingle.mockReset()
            mockSingle.mockResolvedValueOnce({ data: mockStaffData, error: null })
            mockSingle.mockResolvedValueOnce({ data: mockTaskData, error: null })

            // Mock assignees
            mockEq.mockResolvedValueOnce({
                data: [{ assigned_to_staff_id: 1 }],
                error: null
            })

            // Mock department staff
            mockEq.mockResolvedValueOnce({
                data: [{ id: 1 }],
                error: null
            })

            // Mock no subtasks
            mockEq.mockResolvedValueOnce({
                data: [],
                error: null
            })

            // Mock successful parent deletion
            mockSelect.mockResolvedValueOnce({
                data: [{ ...mockTaskData, deleted_at: new Date().toISOString() }],
                error: null
            })

            // Mock assignees for notification
            mockEq.mockResolvedValueOnce({
                data: [{ assigned_to_staff_id: 1 }],
                error: null
            })

            const handler = await import('~/server/api/tasks/[id]/index.delete')
            const result = await handler.default(mockEvent)

            expect(mockIn).not.toHaveBeenCalled()
            expect(result.success).toBe(true)
        })

        it('should continue deletion even if subtask check fails', async () => {
            // Mock staff and task
            mockSingle.mockReset()
            mockSingle.mockResolvedValueOnce({ data: mockStaffData, error: null })
            mockSingle.mockResolvedValueOnce({ data: mockTaskData, error: null })

            // Mock assignees
            mockEq.mockResolvedValueOnce({
                data: [{ assigned_to_staff_id: 1 }],
                error: null
            })

            // Mock department staff
            mockEq.mockResolvedValueOnce({
                data: [{ id: 1 }],
                error: null
            })

            // Mock subtask check error
            mockEq.mockResolvedValueOnce({
                data: null,
                error: { message: 'Subtask check failed' }
            })

            // Mock successful parent deletion
            mockSelect.mockResolvedValueOnce({
                data: [{ ...mockTaskData, deleted_at: new Date().toISOString() }],
                error: null
            })

            // Mock assignees for notification
            mockEq.mockResolvedValueOnce({
                data: [{ assigned_to_staff_id: 1 }],
                error: null
            })

            const handler = await import('~/server/api/tasks/[id]/index.delete')
            const result = await handler.default(mockEvent)

            expect(result.success).toBe(true)
        })
    })

    describe('Activity Logging and Notifications', () => {
        beforeEach(() => {
            setupSuccessfulDeletion()
        })

        it('should log task deletion activity', async () => {
            const handler = await import('~/server/api/tasks/[id]/index.delete')
            await handler.default(mockEvent)

            expect(mockLogTaskDeletion).toHaveBeenCalledWith(
                supabaseClient,
                100,
                1
            )
        })

        it('should create deletion notifications for all assignees', async () => {
            // Override assignees for notification
            mockEq.mockResolvedValueOnce({
                data: [
                    { assigned_to_staff_id: 1 },
                    { assigned_to_staff_id: 2 },
                    { assigned_to_staff_id: 3 }
                ],
                error: null
            })

            const handler = await import('~/server/api/tasks/[id]/index.delete')
            await handler.default(mockEvent)

            expect(mockCreateTaskDeletionNotification).toHaveBeenCalledTimes(3)
            expect(mockCreateTaskDeletionNotification).toHaveBeenCalledWith(
                supabaseClient,
                100,
                1,
                1,
                'Task to Delete',
                'Test Project'
            )
        })

        it('should not create notifications if no assignees', async () => {
            // Override assignees to empty
            mockEq.mockResolvedValueOnce({
                data: [],
                error: null
            })

            const handler = await import('~/server/api/tasks/[id]/index.delete')
            await handler.default(mockEvent)

            expect(mockCreateTaskDeletionNotification).not.toHaveBeenCalled()
        })

        it('should handle notification creation gracefully if task details unavailable', async () => {
            mockGetTaskDetails.mockResolvedValueOnce(null)

            const handler = await import('~/server/api/tasks/[id]/index.delete')
            const result = await handler.default(mockEvent)

            expect(result.success).toBe(true)
            expect(mockCreateTaskDeletionNotification).not.toHaveBeenCalled()
        })
    })

    describe('Edge Cases', () => {
        it('should handle numeric task ID correctly', async () => {
            mockGetRouterParam.mockReturnValueOnce(100) // Numeric instead of string

            setupSuccessfulDeletion()

            const handler = await import('~/server/api/tasks/[id]/index.delete')
            const result = await handler.default(mockEvent)

            expect(result.success).toBe(true)
        })

        it('should handle string numeric task ID correctly', async () => {
            mockGetRouterParam.mockReturnValueOnce('100')

            setupSuccessfulDeletion()

            const handler = await import('~/server/api/tasks/[id]/index.delete')
            const result = await handler.default(mockEvent)

            expect(result.success).toBe(true)
        })

        it('should handle task ID with leading zeros', async () => {
            mockGetRouterParam.mockReturnValueOnce('0100')

            setupSuccessfulDeletion()

            const handler = await import('~/server/api/tasks/[id]/index.delete')
            const result = await handler.default(mockEvent)

            expect(result.success).toBe(true)
        })

        it('should reject non-numeric task IDs', async () => {
            mockGetRouterParam.mockReturnValueOnce('abc123')

            mockSingle.mockResolvedValueOnce({ data: mockStaffData, error: null })

            const handler = await import('~/server/api/tasks/[id]/index.delete')

            try {
                await handler.default(mockEvent)
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.statusCode).toBe(400)
                expect(error.statusMessage).toContain('Invalid task ID format')
            }
        })

        it('should handle empty assignees array', async () => {
            // Mock staff and task
            mockSingle.mockReset()
            mockSingle.mockResolvedValueOnce({ data: mockStaffData, error: null })
            mockSingle.mockResolvedValueOnce({ data: mockTaskData, error: null })

            // Mock empty assignees
            mockEq.mockResolvedValueOnce({
                data: [],
                error: null
            })

            // Mock department staff
            mockEq.mockResolvedValueOnce({
                data: [{ id: 1 }],
                error: null
            })

            // Must be creator for unassigned task
            mockSingle.mockResolvedValueOnce({
                data: { creator_id: 1 },
                error: null
            })

            // Mock no subtasks
            mockEq.mockResolvedValueOnce({
                data: [],
                error: null
            })

            // Mock successful deletion
            mockSelect.mockResolvedValueOnce({
                data: [{ ...mockTaskData, deleted_at: new Date().toISOString() }],
                error: null
            })

            // Mock assignees for notification (empty)
            mockEq.mockResolvedValueOnce({
                data: [],
                error: null
            })

            const handler = await import('~/server/api/tasks/[id]/index.delete')
            const result = await handler.default(mockEvent)

            expect(result.success).toBe(true)
        })
    })

    describe('Error Recovery', () => {
        it('should throw internal server error for unexpected errors', async () => {
            mockSupabaseServiceRole.mockImplementationOnce(() => {
                throw new Error('Unexpected error')
            })

            const handler = await import('~/server/api/tasks/[id]/index.delete')

            try {
                await handler.default(mockEvent)
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.statusCode).toBe(500)
                expect(error.statusMessage).toContain('Internal server error')
            }
        })

        it('should preserve error statusCode if already set', async () => {
            mockSingle.mockResolvedValueOnce({ data: mockStaffData, error: null })
            mockSingle.mockResolvedValueOnce({
                data: null,
                error: { code: 'PGRST116' }
            })
            mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null })

            const handler = await import('~/server/api/tasks/[id]/index.delete')

            try {
                await handler.default(mockEvent)
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.statusCode).toBe(404)
                expect(error.__isError).toBe(true)
            }
        })
    })

    // Helper function to setup successful deletion
    function setupSuccessfulDeletion() {
        // Reset all mocks
        mockSingle.mockReset()
        mockEq.mockReset()
        mockSelect.mockReset()

        // Mock staff data
        mockSingle.mockResolvedValueOnce({ data: mockStaffData, error: null })

        // Mock task exists
        mockSingle.mockResolvedValueOnce({ data: mockTaskData, error: null })

        // Mock assignees (current user is assigned)
        mockEq.mockResolvedValueOnce({
            data: [{ assigned_to_staff_id: 1 }],
            error: null
        })

        // Mock department staff
        mockEq.mockResolvedValueOnce({
            data: [{ id: 1 }],
            error: null
        })

        // Mock no subtasks
        mockEq.mockResolvedValueOnce({
            data: [],
            error: null
        })

        // Mock successful deletion
        mockSelect.mockResolvedValueOnce({
            data: [{ ...mockTaskData, deleted_at: new Date().toISOString() }],
            error: null
        })

        // Mock assignees for notification
        mockEq.mockResolvedValueOnce({
            data: [{ assigned_to_staff_id: 1 }],
            error: null
        })
    }
})