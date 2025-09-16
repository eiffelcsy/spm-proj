import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Dashboard from '@/pages/personal/dashboard.vue'

describe('Personal Dashboard', () => {
  it('renders the dashboard with correct title', async () => {
    const wrapper = await mountSuspended(Dashboard)

    expect(wrapper.find('h1').text()).toBe('Personal Dashboard')
    expect(wrapper.find('h2').text()).toBe('My Tasks')
  })

  it('renders the data table component', async () => {
    const wrapper = await mountSuspended(Dashboard)

    expect(wrapper.findComponent({ name: 'DataTable' }).exists()).toBe(true)
  })

  it('loads and displays tasks data', async () => {
    const wrapper = await mountSuspended(Dashboard)

    // Check if table rows are rendered (excluding header)
    const tableRows = wrapper.findAll('tbody tr')
    expect(tableRows.length).toBeGreaterThan(0)
  })

  it('displays task data in table format', async () => {
    const wrapper = await mountSuspended(Dashboard)

    // Check if table headers are present
    const headers = wrapper.findAll('thead th')
    expect(headers.length).toBeGreaterThan(0)

    // Check if table body contains data
    const bodyRows = wrapper.findAll('tbody tr')
    expect(bodyRows.length).toBeGreaterThan(0)
  })
})