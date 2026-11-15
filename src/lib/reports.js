import { getSupabaseClient } from './supabase'
import { isLateCheckIn } from './workSchedule'

const PAGE_SIZE = 500

export async function getAdminAttendanceReport({ startDate, endDate }) {
  if (!startDate || !endDate || startDate > endDate) {
    throw new Error('Rentang tanggal laporan tidak valid.')
  }

  const client = getSupabaseClient()
  const { data: profiles, error: profilesError } = await client
    .from('employee_profiles')
    .select('user_id, employee_code, full_name, department')
    .eq('role', 'employee')
    .order('full_name')

  if (profilesError) throw profilesError

  const attendance = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await client
      .from('attendance_records')
      .select('id, user_id, work_date, check_in_at, scheduled_start_time')
      .gte('work_date', startDate)
      .lte('work_date', endDate)
      .order('work_date')
      .order('check_in_at')
      .order('id')
      .range(offset, offset + PAGE_SIZE - 1)

    if (error) throw error
    attendance.push(...data)
    if (data.length < PAGE_SIZE) break
  }

  const profilesById = new Map(profiles.map((profile) => [profile.user_id, profile]))
  return attendance
    .filter((record) => profilesById.has(record.user_id))
    .map((record) => ({
      ...record,
      employee: profilesById.get(record.user_id),
      late: isLateCheckIn(record.check_in_at, record.scheduled_start_time),
    }))
    .sort((first, second) => (
      second.work_date.localeCompare(first.work_date)
      || second.check_in_at.localeCompare(first.check_in_at)
    ))
}
