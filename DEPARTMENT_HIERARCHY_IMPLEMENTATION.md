# Department Hierarchy System Implementation

## Overview
This document describes the implementation of a department hierarchy system that restricts task visibility based on organizational structure. Users can only view tasks assigned to staff in their department or sub-departments.

## Department Hierarchy Structure

The following hierarchy has been implemented:

```
Managing Director → ALL departments (Full visibility)

Sales Division:
├─ Sales Director → Sales Manager, Account Managers
└─ Sales Manager → Account Managers

Consultancy Division:
└─ Consultancy Division Director → Consultant

System Solutioning Division:
└─ System Solutioning Division Director → Developers, Support Team

Engineering Operations Division:
└─ Engineering Operation Division Director → Senior Engineers, Junior Engineers, Call Centre, Operations Planning Team

HR and Admin Division:
└─ HR and Admin Director → HR Team, L&D Team, Admin Team

Finance Division:
├─ Finance Director → Finance Managers, Finance Executive
└─ Finance Managers → Finance Executive

IT Division:
└─ IT Director → IT Team
```

## Implementation Details

### 1. Backend Changes

#### New Files Created

**`server/utils/departmentHierarchy.ts`**
- Contains the complete department hierarchy configuration
- Provides utility functions:
  - `getVisibleDepartments(userDepartment)`: Returns all departments a user can view
  - `canViewDepartment(userDepartment, targetDepartment)`: Checks if user can view a specific department
  - `getVisibleStaffIds(supabase, userDepartment)`: Returns staff IDs from visible departments

#### Modified API Endpoints

**Task Endpoints:**
1. **`server/api/tasks/index.get.ts`** (Personal Dashboard Tasks)
   - Now shows tasks assigned to staff in visible departments (not just current user)
   - Respects department hierarchy for task visibility

2. **`server/api/tasks/overdue.get.ts`** (Overdue Tasks)
   - Filters overdue tasks based on department hierarchy
   - Shows overdue tasks for visible department members

3. **`server/api/tasks/by-project.get.ts`** (Project Tasks)
   - Filters project tasks to only show those assigned to visible staff
   - Maintains project context while respecting department boundaries

**Staff Endpoints:**
4. **`server/api/staff/index.get.ts`**
   - Returns only staff from departments visible to the current user
   - Used in assignment dropdowns and staff selection

5. **`server/api/project-members/index.get.ts`**
   - Filters project members by department visibility
   - Ensures users only see and assign tasks to visible staff

**Report Endpoints:**
6. **`server/api/reports/task-completion.get.ts`**
   - Reports show only tasks assigned to visible staff
   - Validates user_id filter against visible staff

7. **`server/api/reports/logged-time.get.ts`**
   - Filters time logs by department visibility
   - Validates department filter against visible departments

8. **`server/api/reports/team-summary.get.ts`**
   - Shows team performance only for visible staff members
   - Respects hierarchy in performance metrics

### 2. Frontend Changes

**`app/pages/admin/users.vue`**
- Changed department input from text field to dropdown select
- Provides predefined department options matching hierarchy
- Ensures data consistency

**`app/components/app-sidebar/AppSidebar.vue`**
- Updated currentUser interface to include department field
- Displays user's department in sidebar footer
- Shows full user context (name, email, department)

## How It Works

### Visibility Rules

1. **Managing Director** sees ALL tasks across all departments
2. **Division Directors** see tasks for:
   - Their own department
   - All sub-departments under them
3. **Managers** see tasks for:
   - Their own department
   - Their direct reports' departments
4. **Regular Staff** see tasks for:
   - Only their own department

### Example Scenarios

**Scenario 1: Sales Director Views Tasks**
- Can see tasks assigned to:
  - Sales Director staff
  - Sales Manager staff
  - Account Managers staff

**Scenario 2: Finance Manager Views Reports**
- Can see reports for:
  - Finance Managers
  - Finance Executive
- Cannot see Finance Director tasks (upward restriction)

**Scenario 3: Developer Views Dashboard**
- Can only see tasks assigned to Developers
- Cannot see Support Team tasks (sibling restriction)

## Database Requirements

### Existing Schema
The system uses the existing `staff` table which already has a `department` field:
- No database migrations required
- Field type: `string | null`

### Data Setup Required

**Important:** All staff members must have their department field set to one of the predefined values for the system to work correctly.

To assign departments to users:
1. Go to Admin → User Management
2. Edit each user
3. Select their department from the dropdown
4. Save changes

## Testing Recommendations

1. **Test Department Visibility:**
   - Create users in different departments
   - Assign tasks across departments
   - Verify each user only sees appropriate tasks

2. **Test Hierarchy Levels:**
   - Test director-level visibility (can see sub-departments)
   - Test manager-level visibility (limited sub-department access)
   - Test staff-level visibility (own department only)

3. **Test Edge Cases:**
   - User with no department (should see no tasks)
   - User with invalid department (should see no tasks)
   - Managing Director (should see everything)

4. **Test Reports:**
   - Verify reports respect department boundaries
   - Test filter restrictions (can't filter by non-visible departments)

5. **Test Staff Selection:**
   - Assignment dropdowns should only show visible staff
   - Project member lists should be filtered

## Security Considerations

1. **Authorization:** All endpoints validate department visibility server-side
2. **Data Isolation:** Users cannot bypass restrictions via API calls
3. **Report Access:** Manager/admin role required for reports, plus department filtering
4. **Cascading Restrictions:** Sub-department restrictions cascade automatically

## Future Enhancements

Potential improvements for consideration:

1. **Dynamic Hierarchy Management:**
   - Admin UI to modify hierarchy without code changes
   - Database-driven hierarchy configuration

2. **Cross-Department Collaboration:**
   - Special permissions for cross-department projects
   - Temporary access grants

3. **Audit Trail:**
   - Log department-based access attempts
   - Track visibility rule usage

4. **Department Filtering UI:**
   - Add department filter to task lists
   - Visual indicator of task department
   - Department-based task grouping

## Maintenance

### Adding New Departments

To add a new department:

1. Update `server/utils/departmentHierarchy.ts`:
   - Add department to `DEPARTMENT_HIERARCHY` array
   - Define its visibility rules (canView array)

2. Update `app/pages/admin/users.vue`:
   - Add new SelectItem to department dropdown

3. Test the new department's visibility rules

### Modifying Hierarchy

To change reporting relationships:

1. Edit the `canView` array for affected departments in `departmentHierarchy.ts`
2. Test visibility changes thoroughly
3. Document changes in this file

## Troubleshooting

**Issue:** User can't see any tasks
- **Solution:** Verify user has a valid department assigned

**Issue:** User sees too many tasks
- **Solution:** Check department hierarchy configuration
- Verify department name matches exactly (case-sensitive)

**Issue:** Reports show no data
- **Solution:** Ensure user has manager/admin role
- Verify department is correctly set
- Check that tasks have assignees with valid departments

## Notes

- Department names are case-sensitive and must match exactly
- Empty/null department means no visibility (except Managing Director with full access)
- The system is fully backward compatible - existing functionality is preserved
- All changes are server-side enforced and cannot be bypassed client-side

