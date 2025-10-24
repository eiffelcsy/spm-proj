import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the event handler
const mockSupabaseServiceRole = vi.fn()
const mockSupabaseUser = vi.fn()
const mockReadBody = vi.fn()

// Mock Supabase operations
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockIs = vi.fn()
const mockMaybeSingle = vi.fn()
const mockSingle = vi.fn()
const mockInsert = vi.fn()

// Mock imports
vi.mock('#supabase/server', () => ({
    serverSupabaseServiceRole: () => mockSupabaseServiceRole(),
    serverSupabaseUser: () => mockSupabaseUser()
}))

vi.mock('h3', () => ({
    defineEventHandler: (fn: any) => fn,
    readBody: (...args: any[]) => mockReadBody(...args),
    createError: (opts: any) => ({ ...opts, __isError: true })
}))

describe('Create Project API - POST /api/projects', () => {
    let supabaseClient: any
    let mockEvent: any

    const mockManagerStaff = {
        id: 1,
        is_manager: true
    }

    const mockStaffMember = {
        id: 2,
        is_manager: false
    }

    const mockProjectPayload = {
        name: 'New Project',
        description: 'Project description',
        priority: 'high',
        due_date: '2024-12-31',
        tags: ['#important', '#urgent'],
        status: 'todo'
    }

    const mockCreatedProject = {
        id: 100,
        name: 'New Project',
        description: 'Project description',
        priority: 'high',
        due_date: '2024-12-31',
        tags: ['#important', '#urgent'],
        status: 'todo',
        owner_id: 1,
        created_at: '2024-01-01T00:00:00Z',
        deleted_at: null
    }

    beforeEach(() => {
        // Setup Supabase client mock
        supabaseClient = {
            from: mockFrom
        }

        // Setup chainable methods
        mockFrom.mockReturnValue({
            select: mockSelect,
            insert: mockInsert
        })

        mockSelect.mockReturnValue({
            eq: mockEq,
            is: mockIs,
            maybeSingle: mockMaybeSingle,
            single: mockSingle
        })

        mockEq.mockReturnValue({
            eq: mockEq,
            is: mockIs,
            maybeSingle: mockMaybeSingle,
            single: mockSingle
        })

        mockIs.mockReturnValue({
            maybeSingle: mockMaybeSingle
        })

        mockInsert.mockReturnValue({
            select: mockSelect
        })

        // Default mocks
        mockSupabaseServiceRole.mockReturnValue(supabaseClient)
        mockSupabaseUser.mockResolvedValue({ id: 'user-123' })
        mockReadBody.mockResolvedValue(mockProjectPayload)
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    describe('Authentication & Authorization', () => {
        it('should return 401 if user is not authenticated', async () => {
            mockSupabaseUser.mockResolvedValueOnce(null)

            const handler = await import('../../../server/api/projects/index.post.ts')

            try {
                await handler.default(mockEvent)
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.statusCode).toBe(401)
                expect(error.statusMessage).toContain('Not authenticated')
            }
        })

        it('should return 401 if user id is missing', async () => {
            mockSupabaseUser.mockResolvedValueOnce({ id: null })

            const handler = await import('../../../server/api/projects/index.post.ts')

            try {
                await handler.default(mockEvent)
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.statusCode).toBe(401)
                expect(error.statusMessage).toContain('Not authenticated')
            }
        })

        it('should return 500 if staff fetch fails', async () => {
            mockMaybeSingle.mockResolvedValueOnce({
                data: null,
                error: { message: 'Database error' }
            })

            const handler = await import('../../../server/api/projects/index.post.ts')

            try {
                await handler.default(mockEvent)
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.statusCode).toBe(500)
                expect(error.statusMessage).toContain('Database error')
            }
        })

        it('should return 403 if no staff record found', async () => {
            mockMaybeSingle.mockResolvedValueOnce({
                data: null,
                error: null
            })

            const handler = await import('../../../server/api/projects/index.post.ts')

            try {
                await handler.default(mockEvent)
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.statusCode).toBe(403)
                expect(error.statusMessage).toContain('No staff record found')
            }
        })

        it('should return 403 if user is not a manager', async () => {
            mockMaybeSingle.mockResolvedValueOnce({
                data: mockStaffMember, // Not a manager
                error: null
            })

            const handler = await import('../../../server/api/projects/index.post.ts')

            try {
                await handler.default(mockEvent)
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.statusCode).toBe(403)
                expect(error.statusMessage).toContain('Only managers can create projects')
            }
        })

        it('should allow managers to create projects', async () => {
            setupSuccessfulCreation()

            const handler = await import('../../../server/api/projects/index.post.ts')
            const result = await handler.default(mockEvent)

            expect(result.success).toBe(true)
            expect(result.project).toBeDefined()
        })
    })

    describe('Field Validation', () => {
        beforeEach(() => {
            // Mock manager staff
            mockMaybeSingle.mockResolvedValueOnce({
                data: mockManagerStaff,
                error: null
            })
        })

        it('should return 400 if project name is missing', async () => {
            mockReadBody.mockResolvedValueOnce({ name: '' })

            const handler = await import('../../../server/api/projects/index.post.ts')

            try {
                await handler.default(mockEvent)
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.statusCode).toBe(400)
                expect(error.statusMessage).toContain('Project title is required')
            }
        })

        it('should return 400 if project name is only whitespace', async () => {
            mockReadBody.mockResolvedValueOnce({ name: '   ' })

            const handler = await import('../../../server/api/projects/index.post.ts')

            try {
                await handler.default(mockEvent)
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.statusCode).toBe(400)
                expect(error.statusMessage).toContain('Project title is required')
            }
        })

        it('should return 400 if priority is invalid', async () => {
            mockReadBody.mockResolvedValueOnce({
                name: 'Valid Project',
                priority: 'invalid-priority'
            })

            const handler = await import('../../../server/api/projects/index.post.ts')

            try {
                await handler.default(mockEvent)
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.statusCode).toBe(400)
                expect(error.statusMessage).toContain('Invalid priority value')
            }
        })

        it('should accept valid priority values', async () => {
            const validPriorities = ['low', 'medium', 'high']

            for (const priority of validPriorities) {
                vi.clearAllMocks()
                setupSuccessfulCreation()
                mockReadBody.mockResolvedValueOnce({
                    name: `Project ${priority}`,
                    priority
                })

                const handler = await import('../../../server/api/projects/index.post.ts')
                const result = await handler.default(mockEvent)

                expect(result.success).toBe(true)
            }
        })

        it('should return 400 if status is invalid', async () => {
            mockReadBody.mockResolvedValueOnce({
                name: 'Valid Project',
                status: 'invalid-status'
            })

            const handler = await import('../../../server/api/projects/index.post.ts')

            try {
                await handler.default(mockEvent)
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.statusCode).toBe(400)
                expect(error.statusMessage).toContain('Invalid status value')
            }
        })

        it('should accept valid status values', async () => {
            const validStatuses = ['todo', 'in-progress', 'completed', 'blocked']

            for (const status of validStatuses) {
                vi.clearAllMocks()
                setupSuccessfulCreation()
                mockReadBody.mockResolvedValueOnce({
                    name: `Project ${status}`,
                    status
                })

                const handler = await import('../../../server/api/projects/index.post.ts')
                const result = await handler.default(mockEvent)

                expect(result.success).toBe(true)
            }
        })

        it('should trim project name', async () => {
            mockReadBody.mockResolvedValueOnce({
                name: '  Trimmed Project  '
            })

            setupSuccessfulCreation()

            const handler = await import('../../../server/api/projects/index.post.ts')
            await handler.default(mockEvent)

            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'Trimmed Project'
                })
            )
        })

        it('should trim project description', async () => {
            mockReadBody.mockResolvedValueOnce({
                name: 'Project',
                description: '  Description with spaces  '
            })

            setupSuccessfulCreation()

            const handler = await import('../../../server/api/projects/index.post.ts')
            await handler.default(mockEvent)

            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    description: 'Description with spaces'
                })
            )
        })

        it('should set description to null if not provided', async () => {
            mockReadBody.mockResolvedValueOnce({
                name: 'Project'
            })

            setupSuccessfulCreation()

            const handler = await import('../../../server/api/projects/index.post.ts')
            await handler.default(mockEvent)

            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    description: null
                })
            )
        })

        it('should default priority to medium if not provided', async () => {
            mockReadBody.mockResolvedValueOnce({
                name: 'Project'
            })

            setupSuccessfulCreation()

            const handler = await import('../../../server/api/projects/index.post.ts')
            await handler.default(mockEvent)

            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    priority: 'medium'
                })
            )
        })

        it('should default status to todo if not provided', async () => {
            mockReadBody.mockResolvedValueOnce({
                name: 'Project'
            })

            setupSuccessfulCreation()

            const handler = await import('../../../server/api/projects/index.post.ts')
            await handler.default(mockEvent)

            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'todo'
                })
            )
        })

        it('should default tags to empty array if not provided', async () => {
            mockReadBody.mockResolvedValueOnce({
                name: 'Project'
            })

            setupSuccessfulCreation()

            const handler = await import('../../../server/api/projects/index.post.ts')
            await handler.default(mockEvent)

            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    tags: []
                })
            )
        })

        it('should set due_date to null if not provided', async () => {
            mockReadBody.mockResolvedValueOnce({
                name: 'Project'
            })

            setupSuccessfulCreation()

            const handler = await import('../../../server/api/projects/index.post.ts')
            await handler.default(mockEvent)

            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    due_date: null
                })
            )
        })
    })

    describe('Duplicate Name Validation', () => {
        beforeEach(() => {
            // Mock manager staff
            mockMaybeSingle.mockResolvedValueOnce({
                data: mockManagerStaff,
                error: null
            })
        })

        it('should return 400 if project name already exists for owner', async () => {
            // Mock existing project check - found
            mockMaybeSingle.mockResolvedValueOnce({
                data: { id: 99 },
                error: null
            })

            const handler = await import('../../../server/api/projects/index.post.ts')

            try {
                await handler.default(mockEvent)
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.statusCode).toBe(400)
                expect(error.statusMessage).toContain('A project with this name already exists')
            }
        })

        it('should return 500 if duplicate check fails', async () => {
            // Mock existing project check error
            mockMaybeSingle.mockResolvedValueOnce({
                data: null,
                error: { message: 'Database error' }
            })

            const handler = await import('../../../server/api/projects/index.post.ts')

            try {
                await handler.default(mockEvent)
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.statusCode).toBe(500)
                expect(error.statusMessage).toContain('Database error')
            }
        })

        it('should allow project creation if name does not exist', async () => {
            setupSuccessfulCreation()

            const handler = await import('../../../server/api/projects/index.post.ts')
            const result = await handler.default(mockEvent)

            expect(result.success).toBe(true)
        })

        it('should allow same project name for different owners', async () => {
            // This is implicit in the API - it checks by owner_id
            setupSuccessfulCreation()

            const handler = await import('../../../server/api/projects/index.post.ts')
            const result = await handler.default(mockEvent)

            expect(mockEq).toHaveBeenCalledWith('owner_id', mockManagerStaff.id)
            expect(result.success).toBe(true)
        })

        it('should only check non-deleted projects for duplicates', async () => {
            setupSuccessfulCreation()

            const handler = await import('../../../server/api/projects/index.post.ts')
            await handler.default(mockEvent)

            expect(mockIs).toHaveBeenCalledWith('deleted_at', null)
        })
    })

    describe('Project Creation', () => {
        beforeEach(() => {
            setupSuccessfulCreation()
        })

        it('should create project with all provided fields', async () => {
            mockReadBody.mockResolvedValueOnce(mockProjectPayload)

            const handler = await import('../../../server/api/projects/index.post.ts')
            await handler.default(mockEvent)

            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: mockProjectPayload.name,
                    description: mockProjectPayload.description,
                    priority: mockProjectPayload.priority,
                    due_date: mockProjectPayload.due_date,
                    tags: mockProjectPayload.tags,
                    status: mockProjectPayload.status,
                    owner_id: mockManagerStaff.id
                })
            )
        })

        it('should set owner_id to current staff id', async () => {
            const handler = await import('../../../server/api/projects/index.post.ts')
            await handler.default(mockEvent)

            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    owner_id: 1
                })
            )
        })

        it('should return created project data', async () => {
            const handler = await import('../../../server/api/projects/index.post.ts')
            const result = await handler.default(mockEvent)

            expect(result.project).toEqual(mockCreatedProject)
        })

        it('should return 500 if project creation fails', async () => {
            // Override insert to fail
            mockSingle.mockResolvedValueOnce({
                data: null,
                error: { message: 'Insert failed' }
            })

            const handler = await import('../../../server/api/projects/index.post.ts')

            try {
                await handler.default(mockEvent)
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.statusCode).toBe(500)
                expect(error.statusMessage).toContain('Insert failed')
            }
        })
    })

    describe('Project Member Management', () => {
        beforeEach(() => {
            setupSuccessfulCreation()
        })

        it('should add creator as project member with manager role', async () => {
            const handler = await import('../../../server/api/projects/index.post.ts')
            await handler.default(mockEvent)

            // Check that insert was called for project_members
            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    project_id: mockCreatedProject.id,
                    staff_id: mockManagerStaff.id,
                    role: 'manager',
                    invited_at: expect.any(String),
                    joined_at: expect.any(String)
                })
            )
        })

        it('should return 500 if adding creator as member fails', async () => {
            // Mock project creation success
            mockMaybeSingle
                .mockResolvedValueOnce({ data: mockManagerStaff, error: null })
                .mockResolvedValueOnce({ data: null, error: null })

            mockSingle.mockResolvedValueOnce({
                data: mockCreatedProject,
                error: null
            })

            // Mock member insert failure
            mockInsert.mockResolvedValueOnce({
                error: { message: 'Member insert failed' }
            })

            const handler = await import('../../../server/api/projects/index.post.ts')

            try {
                await handler.default(mockEvent)
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.statusCode).toBe(500)
                expect(error.statusMessage).toContain('Member insert failed')
            }
        })

        it('should add assigned users as project members with member role', async () => {
            mockReadBody.mockResolvedValueOnce({
                name: 'Project',
                assigned_user_ids: [2, 3, 4]
            })

            const handler = await import('../../../server/api/projects/index.post.ts')
            await handler.default(mockEvent)

            // Verify assigned users were added
            expect(mockInsert).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        project_id: mockCreatedProject.id,
                        staff_id: 2,
                        role: 'member'
                    }),
                    expect.objectContaining({
                        project_id: mockCreatedProject.id,
                        staff_id: 3,
                        role: 'member'
                    }),
                    expect.objectContaining({
                        project_id: mockCreatedProject.id,
                        staff_id: 4,
                        role: 'member'
                    })
                ])
            )
        })

        it('should not duplicate creator in assigned users', async () => {
            mockReadBody.mockResolvedValueOnce({
                name: 'Project',
                assigned_user_ids: [1, 2, 3] // 1 is the creator
            })

            const handler = await import('../../../server/api/projects/index.post.ts')
            await handler.default(mockEvent)

            // Verify only users 2 and 3 were added (not 1)
            const assignedUsersCall = mockInsert.mock.calls.find((call: any[]) =>
                Array.isArray(call[0]) && call[0].some((item: any) => item.role === 'member')
            )

            expect(assignedUsersCall).toBeDefined()
            expect(assignedUsersCall[0]).toHaveLength(2)
            expect(assignedUsersCall[0]).not.toContainEqual(
                expect.objectContaining({ staff_id: 1 })
            )
        })

        it('should handle empty assigned_user_ids array', async () => {
            mockReadBody.mockResolvedValueOnce({
                name: 'Project',
                assigned_user_ids: []
            })

            const handler = await import('../../../server/api/projects/index.post.ts')
            const result = await handler.default(mockEvent)

            expect(result.success).toBe(true)
        })

        it('should handle assigned_user_ids as non-array', async () => {
            mockReadBody.mockResolvedValueOnce({
                name: 'Project',
                assigned_user_ids: 'not-an-array'
            })

            const handler = await import('../../../server/api/projects/index.post.ts')
            const result = await handler.default(mockEvent)

            expect(result.success).toBe(true)
        })

        it('should handle assigned_user_ids not provided', async () => {
            mockReadBody.mockResolvedValueOnce({
                name: 'Project'
            })

            const handler = await import('../../../server/api/projects/index.post.ts')
            const result = await handler.default(mockEvent)

            expect(result.success).toBe(true)
        })

        it('should continue if adding assigned users fails', async () => {
            mockReadBody.mockResolvedValueOnce({
                name: 'Project',
                assigned_user_ids: [2, 3]
            })

            // Mock the second insert (assigned users) to fail
            mockInsert
                .mockResolvedValueOnce({ error: null }) // Creator insert succeeds
                .mockResolvedValueOnce({ error: { message: 'Assigned users failed' } }) // Assigned users fails

            const handler = await import('../../../server/api/projects/index.post.ts')
            const result = await handler.default(mockEvent)

            // Should still return success
            expect(result.success).toBe(true)
            expect(result.project).toBeDefined()
        })

        it('should set invited_at and joined_at timestamps', async () => {
            mockReadBody.mockResolvedValueOnce({
                name: 'Project',
                assigned_user_ids: [2]
            })

            const handler = await import('../../../server/api/projects/index.post.ts')
            await handler.default(mockEvent)

            const assignedUsersCall = mockInsert.mock.calls.find((call: any[]) =>
                Array.isArray(call[0]) && call[0].some((item: any) => item.role === 'member')
            )

            expect(assignedUsersCall[0][0]).toMatchObject({
                invited_at: expect.any(String),
                joined_at: expect.any(String)
            })
        })
    })

    describe('Complete Project Creation Flow', () => {
        it('should successfully create project with minimal data', async () => {
            setupSuccessfulCreation()
            mockReadBody.mockResolvedValueOnce({
                name: 'Minimal Project'
            })

            const handler = await import('../../../server/api/projects/index.post.ts')
            const result = await handler.default(mockEvent)

            expect(result.success).toBe(true)
            expect(result.project).toBeDefined()
            expect(result.project.name).toBe('New Project')
        })

        it('should successfully create project with all data', async () => {
            setupSuccessfulCreation()
            mockReadBody.mockResolvedValueOnce({
                name: 'Full Project',
                description: 'Complete description',
                priority: 'high',
                status: 'in-progress',
                due_date: '2024-12-31',
                tags: ['#tag1', '#tag2'],
                assigned_user_ids: [2, 3, 4, 5]
            })

            const handler = await import('../../../server/api/projects/index.post.ts')
            const result = await handler.default(mockEvent)

            expect(result.success).toBe(true)
            expect(result.project).toBeDefined()
        })

        it('should create project and add multiple members in correct order', async () => {
            setupSuccessfulCreation()
            mockReadBody.mockResolvedValueOnce({
                name: 'Project',
                assigned_user_ids: [2, 3]
            })

            const handler = await import('../../../server/api/projects/index.post.ts')
            await handler.default(mockEvent)

            // Verify insert was called 3 times: project, creator member, assigned members
            expect(mockInsert).toHaveBeenCalledTimes(3)
        })
    })

    describe('Edge Cases', () => {
        it('should handle very long project names', async () => {
            setupSuccessfulCreation()
            const longName = 'A'.repeat(500)
            mockReadBody.mockResolvedValueOnce({
                name: longName
            })

            const handler = await import('../../../server/api/projects/index.post.ts')
            const result = await handler.default(mockEvent)

            expect(result.success).toBe(true)
        })

        it('should handle special characters in project name', async () => {
            setupSuccessfulCreation()
            mockReadBody.mockResolvedValueOnce({
                name: 'Project @#$%^&*()_+-=[]{}|;:",.<>?/'
            })

            const handler = await import('../../../server/api/projects/index.post.ts')
            const result = await handler.default(mockEvent)

            expect(result.success).toBe(true)
        })

        it('should handle unicode characters in project name', async () => {
            setupSuccessfulCreation()
            mockReadBody.mockResolvedValueOnce({
                name: 'プロジェクト 项目 🚀'
            })

            const handler = await import('../../../server/api/projects/index.post.ts')
            const result = await handler.default(mockEvent)

            expect(result.success).toBe(true)
        })

        it('should handle large assigned_user_ids array', async () => {
            setupSuccessfulCreation()
            const largeArray = Array.from({ length: 100 }, (_, i) => i + 2)
            mockReadBody.mockResolvedValueOnce({
                name: 'Project',
                assigned_user_ids: largeArray
            })

            const handler = await import('../../../server/api/projects/index.post.ts')
            const result = await handler.default(mockEvent)

            expect(result.success).toBe(true)
        })

        it('should handle null values in tags array', async () => {
            setupSuccessfulCreation()
            mockReadBody.mockResolvedValueOnce({
                name: 'Project',
                tags: ['#valid', null, '#another']
            })

            const handler = await import('../../../server/api/projects/index.post.ts')
            const result = await handler.default(mockEvent)

            expect(result.success).toBe(true)
        })
    })

    describe('Error Recovery', () => {
        it('should throw internal server error for unexpected errors', async () => {
            mockSupabaseServiceRole.mockImplementationOnce(() => {
                throw new Error('Unexpected error')
            })

            const handler = await import('../../../server/api/projects/index.post.ts')

            try {
                await handler.default(mockEvent)
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error).toBeDefined()
            }
        })

        it('should preserve error statusCode if already set', async () => {
            mockSupabaseUser.mockResolvedValueOnce(null)

            const handler = await import('../../../server/api/projects/index.post.ts')

            try {
                await handler.default(mockEvent)
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.statusCode).toBe(401)
                expect(error.__isError).toBe(true)
            }
        })
    })

    // Helper function to setup successful creation
    function setupSuccessfulCreation() {
        // Reset all mocks
        mockMaybeSingle.mockReset()
        mockSingle.mockReset()
        mockInsert.mockReset()

        // Mock manager staff
        mockMaybeSingle.mockResolvedValueOnce({
            data: mockManagerStaff,
            error: null
        })

        // Mock no duplicate project
        mockMaybeSingle.mockResolvedValueOnce({
            data: null,
            error: null
        })

        // Mock project creation
        mockSingle.mockResolvedValueOnce({
            data: mockCreatedProject,
            error: null
        })

        // Mock creator member insert
        mockInsert.mockResolvedValueOnce({
            error: null
        })

        // Mock assigned users insert
        mockInsert.mockResolvedValueOnce({
            error: null
        })
    }
})