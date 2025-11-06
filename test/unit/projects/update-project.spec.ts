import { describe, it, expect, vi, beforeEach } from 'vitest'
import handler from '~/server/api/projects/[id].put'
import type { H3Event } from 'h3'

// Mock the Supabase server functions
vi.mock('#supabase/server', () => ({
  serverSupabaseServiceRole: vi.fn(),
  serverSupabaseUser: vi.fn(),
}))

// Mock h3 functions
vi.mock('h3', async () => {
  const actual = await vi.importActual('h3')
  return {
    ...actual,
    readBody: vi.fn(),
    getRouterParam: vi.fn(),
    defineEventHandler: (fn: any) => fn,
    createError: (error: any) => {
      const err = new Error(error.statusMessage) as any
      err.statusCode = error.statusCode
      err.statusMessage = error.statusMessage
      return err
    },
  }
})

describe('PUT /api/projects/[id] - Update Project API Endpoint', () => {
  let mockEvent: Partial<H3Event>
  let mockSupabase: any
  let mockReadBody: any
  let mockGetRouterParam: any

  beforeEach(async () => {
    vi.clearAllMocks()
    
    const { readBody, getRouterParam } = await import('h3')
    mockReadBody = vi.mocked(readBody)
    mockGetRouterParam = vi.mocked(getRouterParam)
    
    // Setup mock event
    mockEvent = {
      node: { req: {}, res: {} }
    } as any
    
    // Setup mock Supabase client
    mockSupabase = {
      from: vi.fn()
    }
  })

  describe('Successful Project Update', () => {
    it('should update project successfully', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      mockGetRouterParam.mockReturnValue('1')
      
      // Mock staff lookup with manager status
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 1, is_manager: true },
          error: null
        })
      }
      
      // Mock project existence check
      const mockProjectExistsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            name: 'Old Project Name',
            owner_id: 1,
            deleted_at: null
          },
          error: null
        })
      }
      
      // Mock duplicate check
      const mockDuplicateCheck = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      }
      
      // Mock project update
      const mockProjectUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            name: 'Updated Project Name',
            description: 'Updated description',
            priority: 'high',
            due_date: '2024-12-31',
            tags: ['updated'],
            status: 'in-progress',
            owner_id: 1,
            updated_at: new Date().toISOString()
          },
          error: null
        })
      }
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        if (table === 'projects') {
          callCount++
          if (callCount === 1) return mockProjectExistsQuery
          if (callCount === 2) return mockDuplicateCheck
          return mockProjectUpdate
        }
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        name: 'Updated Project Name',
        description: 'Updated description',
        priority: 'high',
        due_date: '2024-12-31',
        tags: ['updated'],
        status: 'in-progress'
      })
      
      const response = await handler(mockEvent as any)
      
      expect(response.success).toBe(true)
      expect(response.project).toBeDefined()
      expect(response.project.name).toBe('Updated Project Name')
      expect(response.project.priority).toBe('high')
      expect(response.project.status).toBe('in-progress')
    })

    it('should update project and ignore assigned users when project_members removed', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      mockGetRouterParam.mockReturnValue('1')
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 1, is_manager: true },
          error: null
        })
      }
      
      const mockProjectExistsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            name: 'Test Project',
            owner_id: 1,
            deleted_at: null
          },
          error: null
        })
      }
      
      const mockDuplicateCheck = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      }
      
      const mockProjectUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            name: 'Test Project',
            owner_id: 1
          },
          error: null
        })
      }
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        if (table === 'projects') {
          callCount++
          if (callCount === 1) return mockProjectExistsQuery
          if (callCount === 2) return mockDuplicateCheck
          return mockProjectUpdate
        }
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        name: 'Test Project',
        description: 'Test description',
        priority: 'medium',
        status: 'todo',
        assigned_user_ids: [1, 2, 3, 4] // Adding users 3 and 4
      })
      
      const response = await handler(mockEvent as any)
      
      expect(response.success).toBe(true)
      // No project_members calls expected
      expect(mockSupabase.from).not.toHaveBeenCalledWith('project_members')
    })
  })

  describe('Authentication and Authorization', () => {
    it('should return 401 if user is not authenticated', async () => {
      const { serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue(null as any)
      mockGetRouterParam.mockReturnValue('1')
      
      mockReadBody.mockResolvedValue({
        name: 'Test Project'
      })
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(401)
        expect(error.statusMessage).toBe('Not authenticated')
      }
    })

    it('should return 400 if project ID is invalid', async () => {
      const { serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      mockGetRouterParam.mockReturnValue('invalid')
      
      mockReadBody.mockResolvedValue({
        name: 'Test Project'
      })
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(400)
        expect(error.statusMessage).toBe('Invalid project ID')
      }
    })

    it('should return 403 if user is not a manager', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      mockGetRouterParam.mockReturnValue('1')
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 1, is_manager: false },
          error: null
        })
      }
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        name: 'Test Project'
      })
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(403)
        expect(error.statusMessage).toBe('Only managers can edit projects.')
      }
    })

    it('should return 404 if project does not exist', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      mockGetRouterParam.mockReturnValue('999')
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 1, is_manager: true },
          error: null
        })
      }
      
      const mockProjectExistsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      }
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        if (table === 'projects') return mockProjectExistsQuery
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        name: 'Test Project'
      })
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(404)
        expect(error.statusMessage).toBe('Project not found')
      }
    })
  })

  describe('Validation', () => {
    it('should reject project without name', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      mockGetRouterParam.mockReturnValue('1')
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 1, is_manager: true },
          error: null
        })
      }
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        name: '',
        description: 'Test description'
      })
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(400)
        expect(error.statusMessage).toBe('Project title is required.')
      }
    })

    it('should reject project with invalid priority', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      mockGetRouterParam.mockReturnValue('1')
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 1, is_manager: true },
          error: null
        })
      }
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        name: 'Test Project',
        priority: 'invalid'
      })
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(400)
        expect(error.statusMessage).toBe('Invalid priority value.')
      }
    })

    it('should reject project with invalid status', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      mockGetRouterParam.mockReturnValue('1')
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 1, is_manager: true },
          error: null
        })
      }
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        name: 'Test Project',
        status: 'invalid'
      })
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(400)
        expect(error.statusMessage).toBe('Invalid status value.')
      }
    })

    it('should reject duplicate project name for same owner', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      mockGetRouterParam.mockReturnValue('1')
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 1, is_manager: true },
          error: null
        })
      }
      
      const mockProjectExistsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            name: 'Old Project Name',
            owner_id: 1,
            deleted_at: null
          },
          error: null
        })
      }
      
      const mockDuplicateCheck = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 2 }, // Another project with same name exists
          error: null
        })
      }
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        if (table === 'projects') {
          callCount++
          if (callCount === 1) return mockProjectExistsQuery
          return mockDuplicateCheck
        }
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        name: 'Existing Project Name',
        description: 'Test description'
      })
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(400)
        expect(error.statusMessage).toBe('A project with this name already exists.')
      }
    })
  })

  describe('Default Values', () => {
    it('should use default priority if not provided', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      mockGetRouterParam.mockReturnValue('1')
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 1, is_manager: true },
          error: null
        })
      }
      
      const mockProjectExistsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            name: 'Test Project',
            owner_id: 1,
            deleted_at: null
          },
          error: null
        })
      }
      
      const mockDuplicateCheck = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      }
      
      let capturedUpdateData: any = null
      const mockProjectUpdate = {
        update: vi.fn((data: any) => {
          capturedUpdateData = data
          return mockProjectUpdate
        }),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            name: 'Test Project',
            ...capturedUpdateData
          },
          error: null
        })
      }
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        if (table === 'projects') {
          callCount++
          if (callCount === 1) return mockProjectExistsQuery
          if (callCount === 2) return mockDuplicateCheck
          return mockProjectUpdate
        }
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        name: 'Test Project',
        description: 'Test description'
      })
      
      const response = await handler(mockEvent as any)
      
      expect(response.success).toBe(true)
      expect(capturedUpdateData.priority).toBe('medium')
    })

    it('should use default status if not provided', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      mockGetRouterParam.mockReturnValue('1')
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 1, is_manager: true },
          error: null
        })
      }
      
      const mockProjectExistsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            name: 'Test Project',
            owner_id: 1,
            deleted_at: null
          },
          error: null
        })
      }
      
      const mockDuplicateCheck = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      }
      
      let capturedUpdateData: any = null
      const mockProjectUpdate = {
        update: vi.fn((data: any) => {
          capturedUpdateData = data
          return mockProjectUpdate
        }),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            name: 'Test Project',
            ...capturedUpdateData
          },
          error: null
        })
      }
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        if (table === 'projects') {
          callCount++
          if (callCount === 1) return mockProjectExistsQuery
          if (callCount === 2) return mockDuplicateCheck
          return mockProjectUpdate
        }
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        name: 'Test Project',
        description: 'Test description'
      })
      
      const response = await handler(mockEvent as any)
      
      expect(response.success).toBe(true)
      expect(capturedUpdateData.status).toBe('todo')
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors during staff lookup', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      mockGetRouterParam.mockReturnValue('1')
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' }
        })
      }
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        name: 'Test Project'
      })
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(500)
        expect(error.statusMessage).toBe('Database connection failed')
      }
    })

    it('should handle database errors during project update', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      mockGetRouterParam.mockReturnValue('1')
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 1, is_manager: true },
          error: null
        })
      }
      
      const mockProjectExistsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            name: 'Test Project',
            owner_id: 1,
            deleted_at: null
          },
          error: null
        })
      }
      
      const mockDuplicateCheck = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      }
      
      const mockProjectUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Failed to update project' }
        })
      }
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        if (table === 'projects') {
          callCount++
          if (callCount === 1) return mockProjectExistsQuery
          if (callCount === 2) return mockDuplicateCheck
          return mockProjectUpdate
        }
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        name: 'Test Project',
        description: 'Test description'
      })
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(500)
        expect(error.statusMessage).toBe('Failed to update project')
      }
    })
  })
})
