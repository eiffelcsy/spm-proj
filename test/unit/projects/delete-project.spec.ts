import { describe, it, expect, vi, beforeEach } from 'vitest'
import handler from '~/server/api/projects/[id].delete'
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

describe('DELETE /api/projects/[id] - Delete Project API Endpoint', () => {
  let mockEvent: Partial<H3Event>
  let mockSupabase: any
  let mockGetRouterParam: any

  beforeEach(async () => {
    vi.clearAllMocks()
    
    const { getRouterParam } = await import('h3')
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

  describe('Successful Project Deletion', () => {
    it('should soft delete project successfully', async () => {
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
            name: 'Test Project',
            owner_id: 1,
            deleted_at: null
          },
          error: null
        })
      }
      
      // Mock tasks query
      const mockTasksQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        data: [{ id: 1 }, { id: 2 }],
        error: null
      }
      
      // Mock tasks update (soft delete)
      const mockTasksUpdate = {
        update: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ error: null })
      }
      
      // Mock project update (soft delete)
      const mockProjectUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      }
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        if (table === 'projects') {
          callCount++
          if (callCount === 1) return mockProjectExistsQuery
          return mockProjectUpdate
        }
        if (table === 'tasks') {
          callCount++
          if (callCount === 2) return mockTasksQuery
          return mockTasksUpdate
        }
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      const response = await handler(mockEvent as any)
      
      expect(response.success).toBe(true)
      expect(response.message).toBe('Project and all associated tasks have been successfully soft deleted.')
      expect(mockProjectUpdate.update).toHaveBeenCalled()
    })

    it('should soft delete project with no associated tasks', async () => {
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
      
      // No tasks
      const mockTasksQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        data: [],
        error: null
      }
      
      const mockProjectUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      }
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        if (table === 'projects') {
          callCount++
          if (callCount === 1) return mockProjectExistsQuery
          return mockProjectUpdate
        }
        if (table === 'tasks') return mockTasksQuery
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      const response = await handler(mockEvent as any)
      
      expect(response.success).toBe(true)
    })
  })

  describe('Authentication and Authorization', () => {
    it('should return 401 if user is not authenticated', async () => {
      const { serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue(null as any)
      mockGetRouterParam.mockReturnValue('1')
      
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
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(403)
        expect(error.statusMessage).toBe('Only managers can delete projects')
      }
    })

    it('should return 403 if user is not the project owner', async () => {
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
      
      // Project exists but owned by different user
      const mockProjectExistsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null, // No project found for this owner
          error: null
        })
      }
      
      // Check if project exists at all
      const mockAnyProjectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            owner_id: 2, // Different owner
            deleted_at: null
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
          return mockAnyProjectQuery
        }
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(403)
        expect(error.statusMessage).toBe('You do not have permission to delete this project')
      }
    })
  })

  describe('Project Not Found', () => {
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
      
      const mockAnyProjectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      }
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        if (table === 'projects') {
          callCount++
          if (callCount === 1) return mockProjectExistsQuery
          return mockAnyProjectQuery
        }
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(404)
        expect(error.statusMessage).toBe('Project not found')
      }
    })

    it('should return 404 if project is already soft deleted', async () => {
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
          data: null,
          error: null
        })
      }
      
      const mockAnyProjectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            owner_id: 1,
            deleted_at: '2024-01-01T00:00:00Z' // Already deleted
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
          return mockAnyProjectQuery
        }
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(404)
        expect(error.statusMessage).toBe('Project not found')
      }
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
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(500)
        expect(error.statusMessage).toBe('Database connection failed')
      }
    })

    it('should handle database errors during project deletion', async () => {
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
      
      const mockTasksQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        data: [],
        error: null
      }
      
      const mockProjectUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: { message: 'Failed to delete project' }
        })
      }
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        if (table === 'projects') {
          callCount++
          if (callCount === 1) return mockProjectExistsQuery
          return mockProjectUpdate
        }
        if (table === 'tasks') return mockTasksQuery
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(500)
        expect(error.statusMessage).toBe('Failed to soft delete project')
      }
    })

    it('should handle database errors during tasks deletion', async () => {
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
      
      const mockTasksQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        data: null,
        error: { message: 'Failed to fetch tasks' }
      }
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        if (table === 'projects') return mockProjectExistsQuery
        if (table === 'tasks') return mockTasksQuery
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(500)
        expect(error.statusMessage).toBe('Failed to fetch associated tasks')
      }
    })
  })
})
