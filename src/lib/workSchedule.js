import { getSupabaseClient } from './supabase'

function normalizeSchedule(data) {
  return {
    startTime: data.start_time.slice(0, 5),
    endTime: data.end_time.slice(0, 5),
    updatedAt: data.updated_at,
  }
}

export async function getWorkSchedule() {
  const { data, error } = await getSupabaseClient()
    .from('work_schedules')
    .select('start_time, end_time, updated_at')
    .eq('id', 'default')
    .single()

  if (error) throw error
  return normalizeSchedule(data)
}

export async function updateWorkSchedule({ startTime, endTime }) {
  const { data, error } = await getSupabaseClient()
    .from('work_schedules')
    .update({
      start_time: startTime,
      end_time: endTime,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 'default')
    .select('start_time, end_time, updated_at')
    .single()

  if (error) throw error
  return normalizeSchedule(data)
}

export function isLateCheckIn(checkInAt, startTime) {
  const localTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(checkInAt))
  return localTime > startTime
}
