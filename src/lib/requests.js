import { getSupabaseClient } from './supabase'

const requestFields = 'id, user_id, request_type, start_date, end_date, reason, status, admin_note, reviewed_by, reviewed_at, created_at'

export async function getEmployeeRequests(userId) {
  const { data, error } = await getSupabaseClient()
    .from('employee_requests')
    .select(requestFields)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getTodayEmployeeRequest(userId, workDate) {
  const { data, error } = await getSupabaseClient()
    .from('employee_requests')
    .select('request_type, status')
    .eq('user_id', userId)
    .in('request_type', ['izin', 'sakit'])
    .in('status', ['pending', 'approved'])
    .lte('start_date', workDate)
    .gte('end_date', workDate)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function submitEmployeeRequest(userId, request) {
  const { data, error } = await getSupabaseClient()
    .from('employee_requests')
    .insert({
      user_id: userId,
      request_type: request.requestType,
      start_date: request.startDate,
      end_date: request.endDate,
      reason: request.reason,
    })
    .select(requestFields)
    .single()

  if (error) throw error
  return data
}

export async function getAdminRequests() {
  const client = getSupabaseClient()
  const [{ data: requests, error: requestsError }, { data: employees, error: employeesError }] = await Promise.all([
    client
      .from('employee_requests')
      .select(requestFields)
      .order('created_at', { ascending: false }),
    client
      .from('employee_profiles')
      .select('user_id, employee_code, full_name, department')
      .eq('role', 'employee')
      .order('full_name'),
  ])

  if (requestsError) throw requestsError
  if (employeesError) throw employeesError

  const employeesById = new Map(employees.map((employee) => [employee.user_id, employee]))
  return requests.map((request) => ({
    ...request,
    employee: employeesById.get(request.user_id) || null,
  }))
}

export async function reviewEmployeeRequest(requestId, status, adminNote) {
  const { data, error } = await getSupabaseClient()
    .from('employee_requests')
    .update({
      status,
      admin_note: adminNote.trim() || null,
    })
    .eq('id', requestId)
    .eq('status', 'pending')
    .select(requestFields)
    .single()

  if (error) throw error
  return data
}
