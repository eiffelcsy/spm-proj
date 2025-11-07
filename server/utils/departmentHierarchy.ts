/**
 * Department Hierarchy Configuration
 * Defines the organizational structure and visibility rules
 */

export interface DepartmentHierarchy {
  department: string
  canView: string[] // departments this role can view (including own)
}

/**
 * Department hierarchy mapping
 * Each department can view itself and its sub-departments
 */
export const DEPARTMENT_HIERARCHY: DepartmentHierarchy[] = [
  {
    department: 'Managing Director',
    canView: [
      'Managing Director',
      'Sales Director',
      'Sales Manager',
      'Account Managers',
      'Consultancy Division Director',
      'Consultant',
      'System Solutioning Division Director',
      'Developers',
      'Support Team',
      'Engineering Operation Division Director',
      'Senior Engineers',
      'Junior Engineers',
      'Call Centre',
      'Operations Planning Team',
      'HR and Admin Director',
      'HR Team',
      'L&D Team',
      'Admin Team',
      'Finance Director',
      'Finance Managers',
      'Finance Executive',
      'IT Director',
      'IT Team'
    ]
  },
  {
    department: 'Sales Director',
    canView: ['Sales Director', 'Sales Manager', 'Account Managers']
  },
  {
    department: 'Sales Manager',
    canView: ['Sales Manager', 'Account Managers']
  },
  {
    department: 'Account Managers',
    canView: ['Account Managers']
  },
  {
    department: 'Consultancy Division Director',
    canView: ['Consultancy Division Director', 'Consultant']
  },
  {
    department: 'Consultant',
    canView: ['Consultant']
  },
  {
    department: 'System Solutioning Division Director',
    canView: ['System Solutioning Division Director', 'Developers', 'Support Team']
  },
  {
    department: 'Developers',
    canView: ['Developers']
  },
  {
    department: 'Support Team',
    canView: ['Support Team']
  },
  {
    department: 'Engineering Operation Division Director',
    canView: [
      'Engineering Operation Division Director',
      'Senior Engineers',
      'Junior Engineers',
      'Call Centre',
      'Operations Planning Team'
    ]
  },
  {
    department: 'Senior Engineers',
    canView: ['Senior Engineers']
  },
  {
    department: 'Junior Engineers',
    canView: ['Junior Engineers']
  },
  {
    department: 'Call Centre',
    canView: ['Call Centre']
  },
  {
    department: 'Operations Planning Team',
    canView: ['Operations Planning Team']
  },
  {
    department: 'HR and Admin Director',
    canView: ['HR and Admin Director', 'HR Team', 'L&D Team', 'Admin Team']
  },
  {
    department: 'HR Team',
    canView: ['HR Team']
  },
  {
    department: 'L&D Team',
    canView: ['L&D Team']
  },
  {
    department: 'Admin Team',
    canView: ['Admin Team']
  },
  {
    department: 'Finance Director',
    canView: ['Finance Director', 'Finance Managers', 'Finance Executive']
  },
  {
    department: 'Finance Managers',
    canView: ['Finance Managers', 'Finance Executive']
  },
  {
    department: 'Finance Executive',
    canView: ['Finance Executive']
  },
  {
    department: 'IT Director',
    canView: ['IT Director', 'IT Team']
  },
  {
    department: 'IT Team',
    canView: ['IT Team']
  }
]

/**
 * Get all departments that a user can view based on their department
 * @param userDepartment - The department of the current user
 * @returns Array of department names the user can view
 */
export function getVisibleDepartments(userDepartment: string | null): string[] {
  if (!userDepartment) {
    return []
  }

  const hierarchy = DEPARTMENT_HIERARCHY.find(h => h.department === userDepartment)
  
  if (!hierarchy) {
    // If department not in hierarchy, user can only see their own department
    return [userDepartment]
  }

  return hierarchy.canView
}

/**
 * Check if a user can view a specific department
 * @param userDepartment - The department of the current user
 * @param targetDepartment - The department to check visibility for
 * @returns boolean indicating if user can view the target department
 */
export function canViewDepartment(
  userDepartment: string | null,
  targetDepartment: string | null
): boolean {
  if (!userDepartment || !targetDepartment) {
    return false
  }

  const visibleDepartments = getVisibleDepartments(userDepartment)
  return visibleDepartments.includes(targetDepartment)
}

/**
 * Get staff IDs that belong to departments visible to the current user
 * @param supabase - Supabase client
 * @param userDepartment - The department of the current user
 * @returns Array of staff IDs the user can view
 */
export async function getVisibleStaffIds(
  supabase: any,
  userDepartment: string | null
): Promise<number[]> {
  if (!userDepartment) {
    return []
  }

  const visibleDepartments = getVisibleDepartments(userDepartment)

  if (visibleDepartments.length === 0) {
    return []
  }

  const { data: staffData, error } = await supabase
    .from('staff')
    .select('id')
    .in('department', visibleDepartments)

  if (error) {
    console.error('Error fetching visible staff:', error)
    throw new Error('Failed to fetch department staff')
  }

  return staffData?.map((s: any) => s.id) || []
}

