import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the event handler
const mockSupabaseServiceRole = vi.fn()
const mockSupabaseUser = vi.fn()
const mockGetRouterParam = vi.fn()
const mockReadBody = vi.fn()

// Mock Supabase operations
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockNeq = vi.fn()
const mockIs = vi.fn()
const mockMaybeSingle = vi.fn()
const mockSingle = vi.fn()
const mockUpdate = vi.fn()
const mockInsert = vi.fn()

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

describe('Update Project API - PUT /api/projects/[id]', () => {
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

  const mockExistingProject = {
    id: 100,
    name: 'Original Project',
    description: 'Original description',
    priority: 'medium',
    due_date: '2024-12-31',
    tags: ['#original'],
    status: 'todo',
    owner_id: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    deleted_at: null
  }

  const mockUpdatePayload = {
    name: 'Updated Project',
    description: 'Updated description',
    priority: 'high',
    due_date: '2024-12-31',
    tags: ['#updated'],
    status: 'in-progress'
  }

  beforeEach(() => {
    // Setup Supabase client mock
    supabaseClient = {
      from: mockFrom
    }

    // Setup chainable methods
    mockFrom.mockReturnValue({
      select: mockSelect,
      update: mockUpdate,
      insert: mockInsert
    })

    mockSelect.mockReturnValue({
      eq: mockEq,
      is: mockIs,
      neq: mockNeq,
      maybeSingle: mockMaybeSingle,
      single: mockSingle
    })

    mockEq.mockReturnValue({
      eq: mockEq,
      is: mockIs,
      neq: mockNeq,
      maybeSingle: mockMaybeSingle,
      single: mockSingle
    })

    mockNeq.mockReturnValue({
      is: mockIs,
      maybeSingle: mockMaybeSingle
    })

    mockIs.mockReturnValue({
      maybeSingle: mockMaybeSingle
    })

    mockUpdate.mockReturnValue({
      eq: mockEq,
      select: mockSelect
    })

    // Default mocks
    mockSupabaseServiceRole.mockReturnValue(supabaseClient)
    mockSupabaseUser.mockResolvedValue({ id: 'user-123' })
    mockGetRouterParam.mockReturnValue('100')
    mockReadBody.mockResolvedValue(mockUpdatePayload)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication and Authorization', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockSupabaseUser.mockResolvedValueOnce(null)

      const handler = await import('../../../server/api/projects/[id].put')
      
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

      const handler = await import('../../../server/api/projects/[id].put')
      
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

      const handler = await import('../../../server/api/projects/[id].put')
      
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

      const handler = await import('../../../server/api/projects/[id].put')
      
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
        data: mockStaffMember,
        error: null
      })

      const handler = await import('../../../server/api/projects/[id].put')
      
      try {
        await handler.default(mockEvent)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(403)
        expect(error.statusMessage).toContain('Only managers can edit projects')
      }
    })

    it('should allow managers to update projects', async () => {
      setupSuccessfulUpdate()

      const handler = await import('../../../server/api/projects/[id].put')
      const result = await handler.default(mockEvent)

      expect(result.success).toBe(true)
      expect(result.project).toBeDefined()
    })
  })

  describe('Project ID Validation', () => {
    beforeEach(() => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: mockManagerStaff,
        error: null
      })
    })

    it('should return 400 if project ID is missing', async () => {
      mockGetRouterParam.mockReturnValueOnce(null)

      const handler = await import('../../../server/api/projects/[id].put')
      
      try {
        await handler.default(mockEvent)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(400)
        expect(error.statusMessage).toContain('Invalid project ID')
      }
    })

    it('should return 400 if project ID is not a number', async () => {
      mockGetRouterParam.mockReturnValueOnce('invalid-id')

      const handler = await import('../../../server/api/projects/[id].put')
      
      try {
        await handler.default(mockEvent)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(400)
        expect(error.statusMessage).toContain('Invalid project ID')
      }
    })

    it('should accept valid numeric project ID', async () => {
      mockGetRouterParam.mockReturnValueOnce('100')
      setupSuccessfulUpdate()

      const handler = await import('../../../server/api/projects/[id].put')
      const result = await handler.default(mockEvent)

      expect(result.success).toBe(true)
    })

    it('should accept numeric project ID as number', async () => {
      mockGetRouterParam.mockReturnValueOnce(100)
      setupSuccessfulUpdate()

      const handler = await import('../../../server/api/projects/[id].put')
      const result = await handler.default(mockEvent)

      expect(result.success).toBe(true)
    })
  })

  describe('Field Validation', () => {
    beforeEach(() => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: mockManagerStaff,
        error: null
      })
    })

    it('should return 400 if project name is missing', async () => {
      mockReadBody.mockResolvedValueOnce({ name: '' })

      const handler = await import('../../../server/api/projects/[id].put')
      
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

      const handler = await import('../../../server/api/projects/[id].put')
      
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

      const handler = await import('../../../server/api/projects/[id].put')
      
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
        setupSuccessfulUpdate()
        mockReadBody.mockResolvedValueOnce({
          name: 'Project',
          priority
        })

        const handler = await import('../../../server/api/projects/[id].put')
        const result = await handler.default(mockEvent)

        expect(result.success).toBe(true)
      }
    })

    it('should return 400 if status is invalid', async () => {
      mockReadBody.mockResolvedValueOnce({
        name: 'Valid Project',
        status: 'invalid-status'
      })

      const handler = await import('../../../server/api/projects/[id].put')
      
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
        setupSuccessfulUpdate()
        mockReadBody.mockResolvedValueOnce({
          name: 'Project',
          status
        })

        const handler = await import('../../../server/api/projects/[id].put')
        const result = await handler.default(mockEvent)

        expect(result.success).toBe(true)
      }
    })

    it('should trim project name', async () => {
      setupSuccessfulUpdate()
      mockReadBody.mockResolvedValueOnce({
        name: '  Trimmed Project  '
      })

      const handler = await import('../../../server/api/projects/[id].put')
      await handler.default(mockEvent)

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Trimmed Project'
        })
      )
    })

    it('should trim project description', async () => {
      setupSuccessfulUpdate()
      mockReadBody.mockResolvedValueOnce({
        name: 'Project',
        description: '  Description with spaces  '
      })

      const handler = await import('../../../server/api/projects/[id].put')
      await handler.default(mockEvent)

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Description with spaces'
        })
      )
    })

    it('should set description to null if not provided', async () => {
      setupSuccessfulUpdate()
      mockReadBody.mockResolvedValueOnce({
        name: 'Project'
      })

      const handler = await import('../../../server/api/projects/[id].put')
      await handler.default(mockEvent)

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          description: null
        })
      )
    })

    it('should default priority to medium if not provided', async () => {
      setupSuccessfulUpdate()
      mockReadBody.mockResolvedValueOnce({
        name: 'Project'
      })

      const handler = await import('../../../server/api/projects/[id].put')
      await handler.default(mockEvent)

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'medium'
        })
      )
    })

    it('should default status to todo if not provided', async () => {
      setupSuccessfulUpdate()
      mockReadBody.mockResolvedValueOnce({
        name: 'Project'
      })

      const handler = await import('../../../server/api/projects/[id].put')
      await handler.default(mockEvent)

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'todo'
        })
      )
    })

    it('should default tags to empty array if not provided', async () => {
      setupSuccessfulUpdate()
      mockReadBody.mockResolvedValueOnce({
        name: 'Project'
      })

      const handler = await import('../../../server/api/projects/[id].put')
      await handler.default(mockEvent)

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: []
        })
      )
    })

    it('should set due_date to null if not provided', async () => {
      setupSuccessfulUpdate()
      mockReadBody.mockResolvedValueOnce({
        name: 'Project'
      })

      const handler = await import('../../../server/api/projects/[id].put')
      await handler.default(mockEvent)

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          due_date: null
        })
      )
    })

    it('should set updated_at timestamp', async () => {
      setupSuccessfulUpdate()

      const handler = await import('../../../server/api/projects/[id].put')
      await handler.default(mockEvent)

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          updated_at: expect.any(String)
        })
      )
    })
  })

  describe('Project Existence and Ownership', () => {
    beforeEach(() => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: mockManagerStaff,
        error: null
      })
    })

    it('should return 404 if project does not exist', async () => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: null,
        error: null
      })

      const handler = await import('../../../server/api/projects/[id].put')
      
      try {
        await handler.default(mockEvent)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(404)
        expect(error.statusMessage).toContain('Project not found')
      }
    })

    it('should return 404 if project belongs to different owner', async () => {
      const differentOwnerProject = {
        ...mockExistingProject,
        owner_id: 999
      }

      mockMaybeSingle.mockResolvedValueOnce({
        data: differentOwnerProject,
        error: null
      })

      const handler = await import('../../../server/api/projects/[id].put')
      
      try {
        await handler.default(mockEvent)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(404)
        expect(error.statusMessage).toContain('Project not found')
      }
    })

    it('should return 500 if project fetch fails', async () => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' }
      })

      const handler = await import('../../../server/api/projects/[id].put')
      
      try {
        await handler.default(mockEvent)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(500)
        expect(error.statusMessage).toContain('Database error')
      }
    })

    it('should exclude soft-deleted projects', async () => {
      setupSuccessfulUpdate()

      const handler = await import('../../../server/api/projects/[id].put')
      await handler.default(mockEvent)

      expect(mockIs).toHaveBeenCalledWith('deleted_at', null)
    })

    it('should verify owner_id matches current user', async () => {
      setupSuccessfulUpdate()

      const handler = await import('../../../server/api/projects/[id].put')
      await handler.default(mockEvent)

      expect(mockEq).toHaveBeenCalledWith('owner_id', mockManagerStaff.id)
    })
  })

  describe('Duplicate Name Validation', () => {
    beforeEach(() => {
      mockMaybeSingle
        .mockResolvedValueOnce({ data: mockManagerStaff, error: null })
        .mockResolvedValueOnce({ data: mockExistingProject, error: null })
    })

    it('should return 400 if another project with same name exists', async () => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: { id: 200 },
        error: null
      })

      const handler = await import('../../../server/api/projects/[id].put')
      
      try {
        await handler.default(mockEvent)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(400)
        expect(error.statusMessage).toContain('A project with this name already exists')
      }
    })

    it('should return 500 if duplicate check fails', async () => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' }
      })

      const handler = await import('../../../server/api/projects/[id].put')
      
      try {
        await handler.default(mockEvent)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(500)
        expect(error.statusMessage).toContain('Database error')
      }
    })

    it('should allow updating project with same name', async () => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: null,
        error: null
      })

      mockSingle.mockResolvedValueOnce({
        data: mockExistingProject,
        error: null
      })

      const handler = await import('../../../server/api/projects/[id].put')
      const result = await handler.default(mockEvent)

      expect(result.success).toBe(true)
    })

    it('should exclude current project from duplicate check', async () => {
      setupSuccessfulUpdate()

      const handler = await import('../../../server/api/projects/[id].put')
      await handler.default(mockEvent)

      expect(mockNeq).toHaveBeenCalledWith('id', '100')
    })

    it('should check duplicates only for same owner', async () => {
      setupSuccessfulUpdate()

      const handler = await import('../../../server/api/projects/[id].put')
      await handler.default(mockEvent)

      expect(mockEq).toHaveBeenCalledWith('owner_id', mockManagerStaff.id)
    })

    it('should exclude soft-deleted projects from duplicate check', async () => {
      setupSuccessfulUpdate()

      const handler = await import('../../../server/api/projects/[id].put')
      await handler.default(mockEvent)

      const isDuplicateCheckCall = mockIs.mock.calls.some(
        (call: any[]) => call[0] === 'deleted_at' && call[1] === null
      )
      expect(isDuplicateCheckCall).toBe(true)
    })
  })

  describe('Project Update', () => {
    beforeEach(() => {
      setupSuccessfulUpdate()
    })

    it('should update project with all provided fields', async () => {
      mockReadBody.mockResolvedValueOnce(mockUpdatePayload)

      const handler = await import('../../../server/api/projects/[id].put')
      await handler.default(mockEvent)

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: mockUpdatePayload.name,
          description: mockUpdatePayload.description,
          priority: mockUpdatePayload.priority,
          due_date: mockUpdatePayload.due_date,
          tags: mockUpdatePayload.tags,
          status: mockUpdatePayload.status
        })
      )
    })

    it('should update project by correct project ID', async () => {
      const handler = await import('../../../server/api/projects/[id].put')
      await handler.default(mockEvent)

      expect(mockEq).toHaveBeenCalledWith('id', '100')
    })

    it('should return updated project data', async () => {
      const handler = await import('../../../server/api/projects/[id].put')
      const result = await handler.default(mockEvent)

      expect(result.project).toEqual(mockExistingProject)
    })

    it('should return 500 if update fails', async () => {
      mockSingle.mockReset()
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed' }
      })

      const handler = await import('../../../server/api/projects/[id].put')
      
      try {
        await handler.default(mockEvent)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(500)
        expect(error.statusMessage).toContain('Update failed')
      }
    })

    it('should return success true on successful update', async () => {
      const handler = await import('../../../server/api/projects/[id].put')
      const result = await handler.default(mockEvent)

      expect(result.success).toBe(true)
    })
  })

  describe('Assigned Users Management', () => {
    beforeEach(() => {
      setupSuccessfulUpdate()
    })

    it('should add new assigned users if provided', async () => {
      mockReadBody.mockResolvedValueOnce({
        name: 'Project',
        assigned_user_ids: [2, 3, 4]
      })

      mockSelect.mockResolvedValueOnce({
        data: [{ staff_id: 1 }],
        error: null
      })

      const handler = await import('../../../server/api/projects/[id].put')
      await handler.default(mockEvent)

      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ staff_id: 2, role: 'member' }),
          expect.objectContaining({ staff_id: 3, role: 'member' }),
          expect.objectContaining({ staff_id: 4, role: 'member' })
        ])
      )
    })

    it('should not add existing members', async () => {
      mockReadBody.mockResolvedValueOnce({
        name: 'Project',
        assigned_user_ids: [1, 2]
      })

      mockSelect.mockResolvedValueOnce({
        data: [{ staff_id: 1 }],
        error: null
      })

      const handler = await import('../../../server/api/projects/[id].put')
      await handler.default(mockEvent)

      const insertCall = mockInsert.mock.calls[0]
      expect(insertCall[0]).toHaveLength(1)
      expect(insertCall[0][0]).toMatchObject({ staff_id: 2 })
    })

    it('should not add members if all are existing', async () => {
      mockReadBody.mockResolvedValueOnce({
        name: 'Project',
        assigned_user_ids: [1]
      })

      mockSelect.mockResolvedValueOnce({
        data: [{ staff_id: 1 }],
        error: null
      })

      const handler = await import('../../../server/api/projects/[id].put')
      await handler.default(mockEvent)

      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should set role to member for assigned users', async () => {
      mockReadBody.mockResolvedValueOnce({
        name: 'Project',
        assigned_user_ids: [2]
      })

      mockSelect.mockResolvedValueOnce({
        data: [],
        error: null
      })

      const handler = await import('../../../server/api/projects/[id].put')
      await handler.default(mockEvent)

      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role: 'member' })
        ])
      )
    })

    it('should set invited_at and joined_at timestamps', async () => {
      mockReadBody.mockResolvedValueOnce({
        name: 'Project',
        assigned_user_ids: [2]
      })

      mockSelect.mockResolvedValueOnce({
        data: [],
        error: null
      })

      const handler = await import('../../../server/api/projects/[id].put')
      await handler.default(mockEvent)

      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            invited_at: expect.any(String),
            joined_at: expect.any(String)
          })
        ])
      )
    })

    it('should handle empty assigned_user_ids array', async () => {
      mockReadBody.mockResolvedValueOnce({
        name: 'Project',
        assigned_user_ids: []
      })

      const handler = await import('../../../server/api/projects/[id].put')
      const result = await handler.default(mockEvent)

      expect(result.success).toBe(true)
    })

    it('should handle assigned_user_ids as non-array', async () => {
      mockReadBody.mockResolvedValueOnce({
        name: 'Project',
        assigned_user_ids: 'not-an-array'
      })

      const handler = await import('../../../server/api/projects/[id].put')
      const result = await handler.default(mockEvent)

      expect(result.success).toBe(true)
    })

    it('should handle assigned_user_ids not provided', async () => {
      mockReadBody.mockResolvedValueOnce({
        name: 'Project'
      })

      const handler = await import('../../../server/api/projects/[id].put')
      const result = await handler.default(mockEvent)

      expect(result.success).toBe(true)
    })

    it('should parse project ID correctly when adding members', async () => {
      mockReadBody.mockResolvedValueOnce({
        name: 'Project',
        assigned_user_ids: [2]
      })

      mockSelect.mockResolvedValueOnce({
        data: [],
        error: null
      })

      const handler = await import('../../../server/api/projects/[id].put')
      await handler.default(mockEvent)

      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            project_id: 100
          })
        ])
      )
    })
  })

  describe('Complete Update Flow', () => {
    it('should successfully update project with minimal data', async () => {
      setupSuccessfulUpdate()
      mockReadBody.mockResolvedValueOnce({
        name: 'Minimal Update'
      })

      const handler = await import('../../../server/api/projects/[id].put')
      const result = await handler.default(mockEvent)

      expect(result.success).toBe(true)
      expect(result.project).toBeDefined()
    })

    it('should successfully update project with all fields', async () => {
      setupSuccessfulUpdate()
      mockReadBody.mockResolvedValueOnce({
        name: 'Full Update',
        description: 'Complete description',
        priority: 'high',
        status: 'completed',
        due_date: '2024-12-31',
        tags: ['#tag1', '#tag2'],
        assigned_user_ids: [2, 3, 4]
      })

      mockSelect.mockResolvedValueOnce({
        data: [],
        error: null
      })

      const handler = await import('../../../server/api/projects/[id].put')
      const result = await handler.default(mockEvent)

      expect(result.success).toBe(true)
      expect(result.project).toBeDefined()
    })

    it('should update project and add members in correct sequence', async () => {
      setupSuccessfulUpdate()
      mockReadBody.mockResolvedValueOnce({
        name: 'Project',
        assigned_user_ids: [2]
      })

      mockSelect.mockResolvedValueOnce({
        data: [],
        error: null
      })

      const handler = await import('../../../server/api/projects/[id].put')
      await handler.default(mockEvent)

      expect(mockUpdate).toHaveBeenCalled()
      expect(mockInsert).toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long project names', async () => {
      setupSuccessfulUpdate()
      const longName = 'A'.repeat(500)
      mockReadBody.mockResolvedValueOnce({
        name: longName
      })

      const handler = await import('../../../server/api/projects/[id].put')
      const result = await handler.default(mockEvent)

      expect(result.success).toBe(true)
    })

    it('should handle special characters in project name', async () => {
      setupSuccessfulUpdate()
      mockReadBody.mockResolvedValueOnce({
        name: 'Project @#$%^&*()_+-=[]{}|;:",.<>?/'
      })

      const handler = await import('../../../server/api/projects/[id].put')
      const result = await handler.default(mockEvent)

      expect(result.success).toBe(true)
    })

    it('should handle unicode characters in project name', async () => {
      setupSuccessfulUpdate()
      mockReadBody.mockResolvedValueOnce({
        name: 'Project Unicode Text'
      })

      const handler = await import('../../../server/api/projects/[id].put')
      const result = await handler.default(mockEvent)

      expect(result.success).toBe(true)
    })

    it('should handle large assigned_user_ids array', async () => {
      setupSuccessfulUpdate()
      const largeArray = Array.from({ length: 100 }, (_, i) => i + 2)
      mockReadBody.mockResolvedValueOnce({
        name: 'Project',
        assigned_user_ids: largeArray
      })

      mockSelect.mockResolvedValueOnce({
        data: [],
        error: null
      })

      const handler = await import('../../../server/api/projects/[id].put')
      const result = await handler.default(mockEvent)

      expect(result.success).toBe(true)
    })

    it('should handle project ID with leading zeros', async () => {
      setupSuccessfulUpdate()
      mockGetRouterParam.mockReturnValueOnce('0100')

      const handler = await import('../../../server/api/projects/[id].put')
      const result = await handler.default(mockEvent)

      expect(result.success).toBe(true)
    })

    it('should handle null values in tags array', async () => {
      setupSuccessfulUpdate()
      mockReadBody.mockResolvedValueOnce({
        name: 'Project',
        tags: ['#valid', null, '#another']
      })

      const handler = await import('../../../server/api/projects/[id].put')
      const result = await handler.default(mockEvent)

      expect(result.success).toBe(true)
    })
  })

  describe('Error Recovery', () => {
    it('should throw internal server error for unexpected errors', async () => {
      mockSupabaseServiceRole.mockImplementationOnce(() => {
        throw new Error('Unexpected error')
      })

      const handler = await import('../../../server/api/projects/[id].put')
      
      try {
        await handler.default(mockEvent)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error).toBeDefined()
      }
    })

    it('should preserve error statusCode if already set', async () => {
      mockSupabaseUser.mockResolvedValueOnce(null)

      const handler = await import('../../../server/api/projects/[id].put')
      
      try {
        await handler.default(mockEvent)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(401)
        expect(error.__isError).toBe(true)
      }
    })
  })

  // Helper function to setup successful update
  function setupSuccessfulUpdate() {
    mockMaybeSingle.mockReset()
    mockSingle.mockReset()
    mockSelect.mockReset()

    // Mock manager staff
    mockMaybeSingle.mockResolvedValueOnce({
      data: mockManagerStaff,
      error: null
    })

    // Mock existing project
    mockMaybeSingle.mockResolvedValueOnce({
      data: mockExistingProject,
      error: null
    })

    // Mock no duplicate project
    mockMaybeSingle.mockResolvedValueOnce({
      data: null,
      error: null
    })

    // Mock successful update
    mockSingle.mockResolvedValueOnce({
      data: mockExistingProject,
      error: null
    })
  }
})