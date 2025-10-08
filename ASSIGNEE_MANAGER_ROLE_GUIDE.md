# Assignee Management - Manager Role Implementation Guide

## Overview
This document provides a guide for implementing manager role-based assignee removal restrictions in the future.

---

## ✅ Current Implementation

### **Business Rules Enforced:**

1. ✅ **Creator as Default Assignee**: Task creator is automatically assigned on creation
2. ✅ **5 Assignee Maximum**: Cannot assign more than 5 people to a task
3. ✅ **1 Assignee Minimum**: Cannot remove all assignees (at least 1 required)
4. ✅ **Multiple Assignees**: Full support for adding multiple assignees at creation and update

### **Frontend Validation:**
- `AssignCombobox.vue`: Enforces 1-5 assignee limits with visual feedback
- `CreateTask.vue`: Validates assignee count before submission
- `EditTask.vue`: Validates assignee count before updating

### **Backend Validation:**
- `server/api/tasks/index.post.ts`: Validates 1-5 assignees on creation
- `server/api/tasks/[id]/index.put.ts`: Validates 1-5 assignees on update
- `server/api/assignee/index.post.ts`: Validates 1-5 assignees when assigning

---

## 🚀 Future Enhancement: Manager Role-Based Removal

### **Business Rules to Implement:**

1. **Manager Rights**: Only users with "Manager" role in a project can remove assignees
2. **Regular Users**: Can only add new assignees, cannot remove anyone
3. **Self-Removal**: Non-managers cannot remove themselves from tasks
4. **Manager Flexibility**: Managers can remove anyone including themselves (respecting minimum 1 assignee)

---

## 📋 Implementation Steps

### **Step 1: Add Manager Role Detection**

#### **1.1 Create API Endpoint to Get User's Project Role**

Create: `server/api/project-members/role.get.ts`

```typescript
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseServiceRole(event)
  const query = getQuery(event)
  const projectId = query.project_id ? Number(query.project_id) : null

  // Get authenticated user
  const user = await serverSupabaseUser(event)
  if (!user || !user.id) {
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  }

  // Get current user's staff ID
  const { data: staffRow, error: staffError } = await supabase
    .from('staff')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (staffError || !staffRow) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch staff record' })
  }

  if (!projectId) {
    return { role: null, isManager: false }
  }

  // Get user's role in the project
  const { data: projectMember, error: memberError } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('staff_id', staffRow.id)
    .maybeSingle()

  if (memberError) {
    throw createError({ statusCode: 500, statusMessage: memberError.message })
  }

  return {
    role: projectMember?.role || null,
    isManager: projectMember?.role === 'manager'
  }
})
```

#### **1.2 Update Components to Fetch and Use Role**

In `CreateTask.vue` and `EditTask.vue`, add:

```typescript
const projectRole = ref<string | null>(null)
const isProjectManager = ref(false)
const currentUserStaffId = ref<string | null>(null)

// Fetch project role when modal opens
watch(() => props.isOpen, async (isOpen) => {
  if (!isOpen) return
  
  try {
    // Fetch current user ID
    const userMe = await $fetch('/api/user/me')
    currentUserStaffId.value = String(userMe.id)
    
    // Fetch role if project exists
    if (props.project) {
      const roleData = await $fetch('/api/project-members/role', {
        params: { project_id: props.project }
      })
      projectRole.value = roleData.role
      isProjectManager.value = roleData.isManager
    }
  } catch (err) {
    console.error('Failed to fetch project role:', err)
  }
})
```

---

### **Step 2: Update AssignCombobox Props**

In the component that uses `AssignCombobox`, pass the new props:

```vue
<AssignCombobox 
  v-model="assignedTo" 
  label="Assign To" 
  placeholder="Select assignees"
  :staff-members="staffMembers"
  :can-remove-assignees="isProjectManager"
  :current-user-id="currentUserStaffId"
/>
```

---

### **Step 3: Uncomment Manager Logic in AssignCombobox**

In `app/components/task-modals/assign-combobox/AssignCombobox.vue`:

**Uncomment these lines in `canRemoveAssignee()` function:**

```typescript
function canRemoveAssignee(staffId: string): boolean {
  // Enforce minimum assignees - cannot remove if at minimum
  if (selectedIds.value.length <= props.minAssignees) {
    return false
  }
  
  // ✅ UNCOMMENT: Check if current user has manager rights
  if (!props.canRemoveAssignees) {
    return false
  }
  
  // ✅ UNCOMMENT: Prevent non-managers from removing others
  // (They can only add, not remove)
  
  return true
}
```

**Update `getRemovalBlockReason()` function:**

```typescript
function getRemovalBlockReason(): string {
  if (selectedIds.value.length <= props.minAssignees) {
    return `At least ${props.minAssignees} assignee${props.minAssignees > 1 ? 's are' : ' is'} required`
  }
  
  // ✅ UNCOMMENT: Add manager-specific message
  if (!props.canRemoveAssignees) {
    return 'Only managers can remove assignees'
  }
  
  return 'Cannot remove this assignee'
}
```

---

### **Step 4: Update Backend Validation (Optional)**

While frontend prevents unauthorized removal, you can add backend checks too:

In `server/api/tasks/[id]/index.put.ts`, before allowing assignee removal:

```typescript
// Check if user has manager rights to remove assignees
if (body.assignee_ids !== undefined) {
  // Get task's project
  const { data: taskData } = await supabase
    .from('tasks')
    .select('project_id')
    .eq('id', taskId)
    .single()
    
  if (taskData?.project_id) {
    // Check if user is manager in the project
    const { data: projectMember } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', taskData.project_id)
      .eq('staff_id', currentStaffId)
      .maybeSingle()
    
    const isManager = projectMember?.role === 'manager'
    
    // Get current assignees
    const { data: currentAssignees } = await supabase
      .from('task_assignees')
      .select('assigned_to_staff_id')
      .eq('task_id', taskId)
      .eq('is_active', true)
    
    const currentIds = currentAssignees?.map(a => a.assigned_to_staff_id) || []
    const newIds = body.assignee_ids.map((id: any) => Number(id))
    
    // If removing assignees and not a manager, reject
    const isRemoving = currentIds.some(id => !newIds.includes(id))
    if (isRemoving && !isManager) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Only managers can remove assignees'
      })
    }
  }
}
```

---

## 🎨 UI/UX Enhancements

### **Visual Indicators:**

1. **For Non-Managers:**
   - Show "(Required)" next to all assignees they cannot remove
   - Display tooltip: "Only managers can remove assignees"
   - Allow adding new assignees without restrictions

2. **For Managers:**
   - Show delete button on all assignees except when at minimum (1)
   - Display tooltip on last assignee: "At least 1 assignee is required"

---

## 📊 Database Schema Reference

### **Relevant Tables:**

```sql
-- project_members table
project_id          | integer
staff_id            | integer  
role                | text ('member' | 'manager')
invited_at          | timestamp
joined_at           | timestamp

-- task_assignees table
task_id                  | integer
assigned_to_staff_id     | integer
assigned_by_staff_id     | integer
is_active                | boolean
assigned_at              | timestamp
```

---

## 🧪 Testing Checklist

When implementing manager role features, test:

- [ ] Regular user cannot remove any assignees
- [ ] Regular user can add new assignees (up to 5 total)
- [ ] Manager can remove assignees (except last one)
- [ ] Manager can add new assignees
- [ ] Minimum 1 assignee is always enforced
- [ ] Maximum 5 assignees is always enforced
- [ ] Visual feedback is clear for both roles
- [ ] Backend rejects unauthorized removal attempts
- [ ] Error messages are user-friendly

---

## 📝 Code References

### **Key Files:**

- **Component:** `app/components/task-modals/assign-combobox/AssignCombobox.vue`
  - Props already set up for manager features
  - Functions ready to uncomment: `canRemoveAssignee()`, `getRemovalBlockReason()`

- **Task Creation:** `app/components/task-modals/create-task/CreateTask.vue`
  - Need to add role fetching logic

- **Task Edit:** `app/components/task-modals/edit-task/EditTask.vue`
  - Need to add role fetching logic

- **API Endpoints:**
  - `server/api/tasks/index.post.ts` - Task creation
  - `server/api/tasks/[id]/index.put.ts` - Task update
  - `server/api/assignee/index.post.ts` - Assignee management

---

## 🎯 Summary

The codebase is **ready for manager role features**. To implement:

1. Create the role fetching API endpoint
2. Update CreateTask/EditTask to fetch and pass role data
3. Uncomment the manager logic in AssignCombobox
4. Optionally add backend validation
5. Test thoroughly with both manager and non-manager users

All the infrastructure is in place with proper props, functions, and validation logic already structured for easy enhancement.

