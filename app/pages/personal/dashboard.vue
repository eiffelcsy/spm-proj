<template>
  <div class="container mx-auto p-6">
    <h1 class="text-3xl font-bold mb-6">Personal Dashboard</h1>
    
    <div class="mb-4">
      <h2 class="text-xl font-semibold mb-4">My Tasks</h2>
      <DataTable :columns="columns" :data="tasks" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { columns, type Task } from '@/components/tasks/columns'
import DataTable from '@/components/tasks/data-table.vue'

// Dummy task data
const tasks: Task[] = [
  {
    id: '1',
    title: 'Complete project proposal',
    startDate: new Date('2025-09-01'),
    dueDate: new Date('2025-09-20'),
    project: 'SPM Project',
    status: 'not-started'
  },
  {
    id: '2',
    title: 'Review code changes',
    startDate: new Date('2025-09-10'),
    dueDate: new Date('2025-09-15'),
    project: 'personal',
    status: 'in-progress'
  },
  {
    id: '3',
    title: 'Update documentation',
    startDate: new Date('2025-09-12'),
    dueDate: new Date('2025-09-18'),
    project: 'Web Development',
    status: 'completed'
  },
  {
    id: '4',
    title: 'Design user interface mockups',
    startDate: new Date('2025-09-05'),
    dueDate: new Date('2025-09-25'),
    project: 'Mobile App',
    status: 'in-progress'
  },
  {
    id: '5',
    title: 'Set up development environment',
    startDate: new Date('2025-09-02'),
    dueDate: new Date('2025-09-08'),
    project: 'Web Development',
    status: 'completed'
  },
  {
    id: '6',
    title: 'Conduct user research interviews',
    startDate: new Date('2025-09-14'),
    dueDate: new Date('2025-09-28'),
    project: 'UX Research',
    status: 'not-started'
  },
  {
    id: '7',
    title: 'Write unit tests for authentication',
    startDate: new Date('2025-09-11'),
    dueDate: new Date('2025-09-17'),
    project: 'Backend API',
    status: 'in-progress'
  },
  {
    id: '8',
    title: 'Create marketing campaign content',
    startDate: new Date('2025-09-03'),
    dueDate: new Date('2025-09-22'),
    project: 'Marketing',
    status: 'not-started'
  },
  {
    id: '9',
    title: 'Optimize database queries',
    startDate: new Date('2025-09-09'),
    dueDate: new Date('2025-09-16'),
    project: 'Backend API',
    status: 'completed'
  },
  {
    id: '10',
    title: 'Plan team retrospective meeting',
    startDate: new Date('2025-09-13'),
    dueDate: new Date('2025-09-19'),
    project: 'Team Management',
    status: 'not-started'
  },
  {
    id: '11',
    title: 'Implement payment gateway integration',
    startDate: new Date('2025-09-08'),
    dueDate: new Date('2025-09-30'),
    project: 'E-commerce',
    status: 'in-progress'
  },
  {
    id: '12',
    title: 'Update personal portfolio website',
    startDate: new Date('2025-09-06'),
    dueDate: new Date('2025-09-24'),
    project: 'personal',
    status: 'not-started'
  },
  {
    id: '13',
    title: 'Perform security audit',
    startDate: new Date('2025-09-15'),
    dueDate: new Date('2025-09-29'),
    project: 'Security',
    status: 'not-started'
  },
  {
    id: '14',
    title: 'Create API documentation',
    startDate: new Date('2025-09-04'),
    dueDate: new Date('2025-09-21'),
    project: 'Backend API',
    status: 'in-progress'
  },
  {
    id: '15',
    title: 'Set up CI/CD pipeline',
    startDate: new Date('2025-09-07'),
    dueDate: new Date('2025-09-14'),
    project: 'DevOps',
    status: 'completed'
  },
  {
    id: '16',
    title: 'Analyze user feedback data',
    startDate: new Date('2025-09-16'),
    dueDate: new Date('2025-09-23'),
    project: 'Data Analytics',
    status: 'not-started'
  },
  {
    id: '17',
    title: 'Refactor legacy codebase',
    startDate: new Date('2025-09-12'),
    dueDate: new Date('2025-10-05'),
    project: 'Code Maintenance',
    status: 'in-progress'
  },
  {
    id: '18',
    title: 'Organize quarterly budget review',
    startDate: new Date('2025-09-18'),
    dueDate: new Date('2025-09-27'),
    project: 'Finance',
    status: 'not-started'
  },
  {
    id: '19',
    title: 'Deploy staging environment',
    startDate: new Date('2025-09-01'),
    dueDate: new Date('2025-09-10'),
    project: 'DevOps',
    status: 'completed'
  },
  {
    id: '20',
    title: 'Learn new JavaScript framework',
    startDate: new Date('2025-09-20'),
    dueDate: new Date('2025-10-15'),
    project: 'personal',
    status: 'not-started'
  }
]
</script>