import { describe, it, expect, vi } from 'vitest'

// Mock Nuxt-specific functions globally
global.definePageMeta = vi.fn()

// Tag filtering function extracted from column-helpers.ts
function tagFilterFn(row: any, id: string, value: string[]): boolean {
  const tags = row.getValue(id) as string[] | undefined
  if (!tags || tags.length === 0) {
    return value.includes('no-tags')
  }
  
  // Check if any of the task's tags match the filter (case-insensitive)
  return tags.some((tag: string) => 
    value.some(filterValue => 
      filterValue === 'no-tags' ? false : 
      tag.toLowerCase() === filterValue.toLowerCase()
    )
  )
}

describe('Tag Filtering Tests', () => {

  describe('Basic Tag Filtering', () => {
    it('should filter tasks with matching tags', () => {
      const row = {
        getValue: (id: string) => ['urgent', 'bug', 'frontend'] as string[]
      }
      
      const filterValues = ['urgent', 'feature']
      
      const result = tagFilterFn(row, 'tags', filterValues)
      
      expect(result).toBe(true) // 'urgent' matches
    })

    it('should not filter tasks when no tags match', () => {
      const row = {
        getValue: (id: string) => ['urgent', 'bug'] as string[]
      }
      
      const filterValues = ['feature', 'enhancement']
      
      const result = tagFilterFn(row, 'tags', filterValues)
      
      expect(result).toBe(false) // No matches
    })

    it('should filter tasks with multiple tags where one matches', () => {
      const row = {
        getValue: (id: string) => ['urgent', 'bug', 'frontend', 'backend'] as string[]
      }
      
      const filterValues = ['frontend']
      
      const result = tagFilterFn(row, 'tags', filterValues)
      
      expect(result).toBe(true)
    })

    it('should filter tasks when multiple filter values match', () => {
      const row = {
        getValue: (id: string) => ['urgent', 'bug'] as string[]
      }
      
      const filterValues = ['urgent', 'bug', 'feature']
      
      const result = tagFilterFn(row, 'tags', filterValues)
      
      expect(result).toBe(true)
    })
  })

  describe('Case-Insensitive Filtering', () => {
    it('should match tags regardless of case', () => {
      const row = {
        getValue: (id: string) => ['Urgent', 'BUG', 'Frontend'] as string[]
      }
      
      const filterValues = ['urgent', 'bug', 'FRONTEND']
      
      const result = tagFilterFn(row, 'tags', filterValues)
      
      expect(result).toBe(true)
    })

    it('should match mixed case tags', () => {
      const row = {
        getValue: (id: string) => ['UrGeNt', 'bUg'] as string[]
      }
      
      const filterValues = ['URGENT', 'BUG']
      
      const result = tagFilterFn(row, 'tags', filterValues)
      
      expect(result).toBe(true)
    })
  })

  describe('No Tags Handling', () => {
    it('should filter tasks with no tags when "no-tags" is in filter', () => {
      const row = {
        getValue: (id: string) => [] as string[]
      }
      
      const filterValues = ['no-tags', 'urgent']
      
      const result = tagFilterFn(row, 'tags', filterValues)
      
      expect(result).toBe(true)
    })

    it('should filter tasks with undefined tags when "no-tags" is in filter', () => {
      const row = {
        getValue: (id: string) => undefined as string[] | undefined
      }
      
      const filterValues = ['no-tags']
      
      const result = tagFilterFn(row, 'tags', filterValues)
      
      expect(result).toBe(true)
    })

    it('should not filter tasks with no tags when "no-tags" is not in filter', () => {
      const row = {
        getValue: (id: string) => [] as string[]
      }
      
      const filterValues = ['urgent', 'bug']
      
      const result = tagFilterFn(row, 'tags', filterValues)
      
      expect(result).toBe(false)
    })

    it('should not filter tasks with tags when "no-tags" is in filter', () => {
      const row = {
        getValue: (id: string) => ['urgent', 'bug'] as string[]
      }
      
      const filterValues = ['no-tags']
      
      const result = tagFilterFn(row, 'tags', filterValues)
      
      expect(result).toBe(false)
    })
  })

  describe('Empty Filter Values', () => {
    it('should not filter tasks when filter values array is empty', () => {
      const row = {
        getValue: (id: string) => ['urgent', 'bug'] as string[]
      }
      
      const filterValues: string[] = []
      
      const result = tagFilterFn(row, 'tags', filterValues)
      
      expect(result).toBe(false)
    })

    it('should filter tasks with no tags when filter is empty', () => {
      const row = {
        getValue: (id: string) => [] as string[]
      }
      
      const filterValues: string[] = []
      
      const result = tagFilterFn(row, 'tags', filterValues)
      
      expect(result).toBe(false)
    })
  })

  describe('Multiple Filter Scenarios', () => {
    it('should handle "no-tags" filter combined with regular tags', () => {
      const taskWithTags = {
        getValue: (id: string) => ['urgent'] as string[]
      }
      
      const taskWithoutTags = {
        getValue: (id: string) => [] as string[]
      }
      
      const filterValues = ['no-tags', 'urgent']
      
      const resultWithTags = tagFilterFn(taskWithTags, 'tags', filterValues)
      const resultWithoutTags = tagFilterFn(taskWithoutTags, 'tags', filterValues)
      
      expect(resultWithTags).toBe(true) // Matches 'urgent'
      expect(resultWithoutTags).toBe(true) // Matches 'no-tags'
    })

    it('should filter multiple tasks with different tag combinations', () => {
      const tasks = [
        { getValue: (id: string) => ['urgent', 'bug'] as string[] },
        { getValue: (id: string) => ['feature', 'enhancement'] as string[] },
        { getValue: (id: string) => ['urgent', 'feature'] as string[] },
        { getValue: (id: string) => [] as string[] },
        { getValue: (id: string) => ['documentation'] as string[] }
      ]
      
      const filterValues = ['urgent']
      
      const results = tasks.map(task => tagFilterFn(task, 'tags', filterValues))
      
      expect(results[0]).toBe(true) // Has 'urgent'
      expect(results[1]).toBe(false) // No 'urgent'
      expect(results[2]).toBe(true) // Has 'urgent'
      expect(results[3]).toBe(false) // No tags, but 'no-tags' not in filter
      expect(results[4]).toBe(false) // No 'urgent'
    })
  })

  describe('Edge Cases', () => {
    it('should handle single tag task', () => {
      const row = {
        getValue: (id: string) => ['urgent'] as string[]
      }
      
      const filterValues = ['urgent']
      
      const result = tagFilterFn(row, 'tags', filterValues)
      
      expect(result).toBe(true)
    })

    it('should handle task with many tags', () => {
      const row = {
        getValue: (id: string) => ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6', 'tag7', 'tag8'] as string[]
      }
      
      const filterValues = ['tag5']
      
      const result = tagFilterFn(row, 'tags', filterValues)
      
      expect(result).toBe(true)
    })

    it('should handle empty string tags', () => {
      const row = {
        getValue: (id: string) => ['', 'urgent'] as string[]
      }
      
      const filterValues = ['']
      
      const result = tagFilterFn(row, 'tags', filterValues)
      
      expect(result).toBe(true) // Empty string matches empty string
    })

    it('should handle whitespace in tags', () => {
      const row = {
        getValue: (id: string) => [' urgent ', ' bug'] as string[]
      }
      
      const filterValues = ['urgent']
      
      const result = tagFilterFn(row, 'tags', filterValues)
      
      // Note: This will match because toLowerCase() doesn't trim whitespace
      // The actual behavior depends on how tags are stored (with or without trimming)
      expect(result).toBe(false) // ' urgent ' !== 'urgent' after toLowerCase()
    })
  })

  describe('Integration', () => {
    it('should correctly filter a collection of tasks', () => {
      const tasks = [
        { id: 1, tags: ['urgent', 'bug'] },
        { id: 2, tags: ['feature', 'enhancement'] },
        { id: 3, tags: ['urgent', 'feature'] },
        { id: 4, tags: [] },
        { id: 5, tags: undefined },
        { id: 6, tags: ['documentation'] },
        { id: 7, tags: ['bug', 'critical'] }
      ]
      
      const filterValues = ['urgent', 'bug', 'no-tags']
      
      const rows = tasks.map(task => ({
        getValue: (id: string) => task.tags as string[] | undefined
      }))
      
      const filteredResults = rows.map(row => tagFilterFn(row, 'tags', filterValues))
      
      // Task 1: matches 'urgent' and 'bug' -> true
      expect(filteredResults[0]).toBe(true)
      // Task 2: no match -> false
      expect(filteredResults[1]).toBe(false)
      // Task 3: matches 'urgent' -> true
      expect(filteredResults[2]).toBe(true)
      // Task 4: matches 'no-tags' -> true
      expect(filteredResults[3]).toBe(true)
      // Task 5: matches 'no-tags' -> true
      expect(filteredResults[4]).toBe(true)
      // Task 6: no match -> false
      expect(filteredResults[5]).toBe(false)
      // Task 7: matches 'bug' -> true
      expect(filteredResults[6]).toBe(true)
    })

    it('should handle complex filtering scenarios', () => {
      const task = {
        getValue: (id: string) => ['frontend', 'React', 'urgent', 'bug'] as string[]
      }
      
      // Test with multiple filters where one matches
      expect(tagFilterFn(task, 'tags', ['frontend'])).toBe(true)
      expect(tagFilterFn(task, 'tags', ['react'])).toBe(true) // Case-insensitive
      expect(tagFilterFn(task, 'tags', ['urgent', 'feature'])).toBe(true)
      expect(tagFilterFn(task, 'tags', ['documentation', 'enhancement'])).toBe(false)
      expect(tagFilterFn(task, 'tags', ['no-tags', 'urgent'])).toBe(true) // Matches 'urgent', not 'no-tags'
    })
  })

})

