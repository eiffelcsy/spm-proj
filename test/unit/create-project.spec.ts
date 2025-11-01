import { describe, it, expect, vi, beforeEach } from 'vitest'
import handler from '~/server/api/projects/index.post'
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
    defineEventHandler: (fn: any) => fn,
    createError: (error: any) => {
      const err = new Error(error.statusMessage) as any
      err.statusCode = error.statusCode
      err.statusMessage = error.statusMessage
      return err
    },
  }
})

describe('POST /api/projects - Create Project API Endpoint', () => {
  let mockEvent: Partial<H3Event>
  let mockSupabase: any
  let mockReadBody: any

  beforeEach(async () => {
    vi.clearAllMocks()
    
    const { readBody } = await import('h3')
    mockReadBody = vi.mocked(readBody)
    
    // Setup mock event
    mockEvent = {
      node: { req: {}, res: {} }
    } as any
    
    // Setup mock Supabase client
    mockSupabase = {
      from: vi.fn()
    }
  })

  describe('Successful Project Creation', () => {
    it('should create project successfully with all required fields', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      
      // Mock staff lookup with manager status
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 1, is_manager: true },
          error: null
        })
      }
      
      // Mock duplicate check
      const mockDuplicateCheck = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      }
      
      // Mock project insert
      const mockProjectInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            name: 'Test Project',
            description: 'Test description',
            priority: 'medium',
            due_date: '2024-12-31',
            tags: ['urgent', 'frontend'],
            owner_id: 1,
            status: 'todo',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            deleted_at: null
          },
          error: null
        })
      }
      
      // Mock project_members insert
      const mockMemberInsert = {
        insert: vi.fn().mockResolvedValue({ error: null })
      }
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        if (table === 'projects') {
          callCount++
          if (callCount === 1) return mockDuplicateCheck
          return mockProjectInsert
        }
        if (table === 'project_members') return mockMemberInsert
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        name: 'Test Project',
        description: 'Test description',
        priority: 'medium',
        due_date: '2024-12-31',
        tags: ['urgent', 'frontend'],
        assigned_user_ids: [2, 3],
        status: 'todo'
      })
      
      const response = await handler(mockEvent as any)
      
      expect(response.success).toBe(true)
      expect(response.project).toBeDefined()
      expect(response.project.name).toBe('Test Project')
      expect(response.project.priority).toBe('medium')
      expect(response.project.status).toBe('todo')
      expect(mockSupabase.from).toHaveBeenCalledWith('projects')
      expect(mockSupabase.from).toHaveBeenCalledWith('project_members')
    })

    it('should create project with assigned users', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 1, is_manager: true },
          error: null
        })
      }
      
      const mockDuplicateCheck = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      }
      
      const mockProjectInsert = {
        insert: vi.fn().mockReturnThis(),
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
      
      let memberInsertCalls = 0
      const mockMemberInsert = {
        insert: vi.fn((data: any) => {
          memberInsertCalls++
          return { error: null }
        })
      }
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        if (table === 'projects') {
          callCount++
          if (callCount === 1) return mockDuplicateCheck
          return mockProjectInsert
        }
        if (table === 'project_members') return mockMemberInsert
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        name: 'Test Project',
        description: 'Test description',
        priority: 'medium',
        status: 'todo',
        assigned_user_ids: [2, 3, 4]
      })
      
      const response = await handler(mockEvent as any)
      
      expect(response.success).toBe(true)
      // Should insert creator as manager + 3 assigned users = 2 insert calls
      expect(mockMemberInsert.insert).toHaveBeenCalledTimes(2)
    })

    it('should create project without assigned users', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 1, is_manager: true },
          error: null
        })
      }
      
      const mockDuplicateCheck = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      }
      
      const mockProjectInsert = {
        insert: vi.fn().mockReturnThis(),
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
      
      const mockMemberInsert = {
        insert: vi.fn().mockResolvedValue({ error: null })
      }
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        if (table === 'projects') {
          callCount++
          if (callCount === 1) return mockDuplicateCheck
          return mockProjectInsert
        }
        if (table === 'project_members') return mockMemberInsert
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        name: 'Test Project',
        description: 'Test description',
        priority: 'medium',
        status: 'todo',
        assigned_user_ids: []
      })
      
      const response = await handler(mockEvent as any)
      
      expect(response.success).toBe(true)
      // Should only insert creator as manager
      expect(mockMemberInsert.insert).toHaveBeenCalledTimes(1)
    })
  })

  describe('Authentication and Authorization', () => {
    it('should return 401 if user is not authenticated', async () => {
      const { serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue(null as any)
      
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

    it('should return 403 if no staff record found', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
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
        expect(error.statusMessage).toBe('No staff record found for authenticated user.')
      }
    })

    it('should return 403 if user is not a manager', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      
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
        expect(error.statusMessage).toBe('Only managers can create projects.')
      }
    })
  })

  describe('Validation', () => {
    it('should reject project without name', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      
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
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 1, is_manager: true },
          error: null
        })
      }
      
      const mockDuplicateCheck = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 2 }, // Existing project found
          error: null
        })
      }
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        if (table === 'projects') return mockDuplicateCheck
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
        expect(error.statusCode).toBe(400)
        expect(error.statusMessage).toBe('A project with this name already exists.')
      }
    })
  })

  describe('Default Values', () => {
    it('should use default priority if not provided', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 1, is_manager: true },
          error: null
        })
      }
      
      const mockDuplicateCheck = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      }
      
      let capturedPayload: any = null
      const mockProjectInsert = {
        insert: vi.fn((payload: any) => {
          capturedPayload = payload
          return mockProjectInsert
        }),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            name: 'Test Project',
            ...capturedPayload
          },
          error: null
        })
      }
      
      const mockMemberInsert = {
        insert: vi.fn().mockResolvedValue({ error: null })
      }
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        if (table === 'projects') {
          callCount++
          if (callCount === 1) return mockDuplicateCheck
          return mockProjectInsert
        }
        if (table === 'project_members') return mockMemberInsert
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        name: 'Test Project',
        description: 'Test description'
      })
      
      const response = await handler(mockEvent as any)
      
      expect(response.success).toBe(true)
      expect(capturedPayload.priority).toBe('medium')
    })

    it('should use default status if not provided', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 1, is_manager: true },
          error: null
        })
      }
      
      const mockDuplicateCheck = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      }
      
      let capturedPayload: any = null
      const mockProjectInsert = {
        insert: vi.fn((payload: any) => {
          capturedPayload = payload
          return mockProjectInsert
        }),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            name: 'Test Project',
            ...capturedPayload
          },
          error: null
        })
      }
      
      const mockMemberInsert = {
        insert: vi.fn().mockResolvedValue({ error: null })
      }
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        if (table === 'projects') {
          callCount++
          if (callCount === 1) return mockDuplicateCheck
          return mockProjectInsert
        }
        if (table === 'project_members') return mockMemberInsert
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        name: 'Test Project',
        description: 'Test description'
      })
      
      const response = await handler(mockEvent as any)
      
      expect(response.success).toBe(true)
      expect(capturedPayload.status).toBe('todo')
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors during staff lookup', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      
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

    it('should handle database errors during project insert', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 1, is_manager: true },
          error: null
        })
      }
      
      const mockDuplicateCheck = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      }
      
      const mockProjectInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Failed to insert project' }
        })
      }
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        if (table === 'projects') {
          callCount++
          if (callCount === 1) return mockDuplicateCheck
          return mockProjectInsert
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
        expect(error.statusMessage).toBe('Failed to insert project')
      }
    })
  })
})
