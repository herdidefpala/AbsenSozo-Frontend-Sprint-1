import { getSupabaseClient } from './supabase'
import { isLateCheckIn } from './workSchedule'

export function getJakartaDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}

export async function getEmployeeProfile(userId) {
  const { data, error } = await getSupabaseClient()
    .from('employee_profiles')
    .select('user_id, employee_code, full_name, department, role')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getTodayAttendance(userId) {
  const { data, error } = await getSupabaseClient()
    .from('attendance_records')
    .select('id, user_id, work_date, check_in_at, check_out_at, latitude, longitude, accuracy_m, photo_path')
    .eq('user_id', userId)
    .eq('work_date', getJakartaDate())
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getEmployeeAttendanceHistory(userId, { startDate, endDate, page, pageSize }) {
  let request = getSupabaseClient()
    .from('attendance_records')
    .select('id, work_date, check_in_at, check_out_at, scheduled_start_time', { count: 'exact' })
    .eq('user_id', userId)

  if (startDate) request = request.gte('work_date', startDate)
  if (endDate) request = request.lte('work_date', endDate)

  const { data, count, error } = await request
    .order('work_date', { ascending: false })
    .order('check_in_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)

  if (error) throw error
  return {
    records: data.map((record) => ({
      ...record,
      late: isLateCheckIn(record.check_in_at, record.scheduled_start_time),
    })),
    count: count || 0,
  }
}

export async function submitCheckIn({ user, photoData, location }) {
  const client = getSupabaseClient()
  const date = getJakartaDate()
  const photoBlob = await (await fetch(photoData)).blob()
  const photoPath = `${user.id}/${date}/${crypto.randomUUID()}.jpg`
  const { error: uploadError } = await client.storage
    .from('attendance-photos')
    .upload(photoPath, photoBlob, {
      contentType: 'image/jpeg',
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) throw uploadError

  const { data, error: insertError } = await client
    .from('attendance_records')
    .insert({
      latitude: location.lat,
      longitude: location.lng,
      accuracy_m: location.accuracy,
      photo_path: photoPath,
    })
    .select('id, user_id, work_date, check_in_at, check_out_at, latitude, longitude, accuracy_m, photo_path')
    .single()

  if (insertError) {
    const { error: cleanupError } = await client.storage
      .from('attendance-photos')
      .remove([photoPath])

    if (cleanupError) {
      throw new Error(`${insertError.message} Foto gagal dibersihkan dari storage: ${cleanupError.message}`)
    }

    throw insertError
  }

  return data
}

export async function submitCheckOut(userId) {
  const { data, error } = await getSupabaseClient()
    .from('attendance_records')
    .update({ check_out_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('work_date', getJakartaDate())
    .is('check_out_at', null)
    .select('id, user_id, work_date, check_in_at, check_out_at')
    .maybeSingle()

  if (error) throw error
  if (!data) {
    throw new Error('Check-out tidak dapat dilakukan. Pastikan Anda sudah check-in dan belum check-out.')
  }
  return data
}

export async function getAdminAttendanceOverview() {
  const client = getSupabaseClient()
  const today = getJakartaDate()
  const firstDay = new Date(`${today}T12:00:00+07:00`)
  firstDay.setDate(firstDay.getDate() - 6)
  const weekStart = getJakartaDate(firstDay)
  const profilesRequest = client
    .from('employee_profiles')
    .select('user_id, employee_code, full_name, department')
    .eq('role', 'employee')
    .order('full_name')
  const weeklyAttendanceRequest = client
    .from('attendance_records')
    .select('id, user_id, work_date, check_in_at, check_out_at, scheduled_start_time')
    .gte('work_date', weekStart)
    .lte('work_date', today)
    .order('check_in_at', { ascending: false })

  const [{ data: profiles, error: profilesError }, { data: attendance, error: attendanceError }] = await Promise.all([
    profilesRequest,
    weeklyAttendanceRequest,
  ])
  if (profilesError) throw profilesError
  if (attendanceError) throw attendanceError

  const profilesById = new Map(profiles.map((profile) => [profile.user_id, profile]))
  const records = attendance
    .filter((record) => record.work_date === today)
    .filter((record) => profilesById.has(record.user_id))
    .map((record) => ({
      ...record,
      employee: profilesById.get(record.user_id),
      late: isLateCheckIn(record.check_in_at, record.scheduled_start_time),
    }))
  const weeklyCounts = new Map()
  attendance.forEach((record) => {
    if (profilesById.has(record.user_id)) {
      weeklyCounts.set(record.work_date, (weeklyCounts.get(record.work_date) || 0) + 1)
    }
  })
  const chartData = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(firstDay)
    date.setDate(firstDay.getDate() + index)
    const dateKey = getJakartaDate(date)
    const count = weeklyCounts.get(dateKey) || 0
    return {
      day: new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'short' }).format(date),
      hadir: profiles.length ? Math.round((count / profiles.length) * 100) : 0,
    }
  })

  return {
    totalEmployees: profiles.length,
    records,
    present: records.length,
    late: records.filter((record) => record.late).length,
    absent: Math.max(profiles.length - records.length, 0),
    chartData,
  }
}

export async function getAdminAttendanceRecords(workDate) {
  const client = getSupabaseClient()
  const [{ data: profiles, error: profilesError }, { data: attendance, error: attendanceError }] = await Promise.all([
    client
      .from('employee_profiles')
      .select('user_id, employee_code, full_name, department')
      .eq('role', 'employee')
      .order('full_name'),
    client
      .from('attendance_records')
      .select('id, user_id, work_date, check_in_at, check_out_at, scheduled_start_time, latitude, longitude, accuracy_m, photo_path')
      .eq('work_date', workDate)
      .order('check_in_at', { ascending: false }),
  ])

  if (profilesError) throw profilesError
  if (attendanceError) throw attendanceError

  const profilesById = new Map(profiles.map((profile) => [profile.user_id, profile]))
  return attendance
    .filter((record) => profilesById.has(record.user_id))
    .map((record) => ({
      ...record,
      employee: profilesById.get(record.user_id),
      late: isLateCheckIn(record.check_in_at, record.scheduled_start_time),
    }))
}

export async function getAttendancePhotoUrl(photoPath) {
  const { data, error } = await getSupabaseClient()
    .storage
    .from('attendance-photos')
    .createSignedUrl(photoPath, 600)

  if (error) throw error
  return data.signedUrl
}
