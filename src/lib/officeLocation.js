import { getSupabaseClient } from './supabase'

function normalizeOfficeLocation(data) {
  return {
    latitude: data.latitude === null ? '' : String(data.latitude),
    longitude: data.longitude === null ? '' : String(data.longitude),
    radiusM: data.radius_m,
    updatedAt: data.updated_at,
  }
}

export async function getOfficeLocation() {
  const { data, error } = await getSupabaseClient()
    .from('office_locations')
    .select('latitude, longitude, radius_m, updated_at')
    .eq('id', 'default')
    .single()

  if (error) throw error
  return normalizeOfficeLocation(data)
}

export async function updateOfficeLocation({ latitude, longitude, radiusM }) {
  const { data, error } = await getSupabaseClient()
    .from('office_locations')
    .update({
      latitude,
      longitude,
      radius_m: radiusM,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 'default')
    .select('latitude, longitude, radius_m, updated_at')
    .single()

  if (error) throw error
  return normalizeOfficeLocation(data)
}
