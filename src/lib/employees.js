import { getSupabaseClient } from './supabase'

export async function getAdminEmployees() {
  const { data, error } = await getSupabaseClient()
    .from('employee_profiles')
    .select('user_id, employee_code, full_name, department, created_at')
    .eq('role', 'employee')
    .order('full_name')

  if (error) throw error
  return data
}

export async function updateAdminEmployee(userId, { employeeCode, fullName, department }) {
  const { data, error } = await getSupabaseClient()
    .from('employee_profiles')
    .update({
      employee_code: employeeCode,
      full_name: fullName,
      department,
    })
    .eq('user_id', userId)
    .eq('role', 'employee')
    .select('user_id, employee_code, full_name, department, created_at')
    .single()

  if (error) throw error
  return data
}
