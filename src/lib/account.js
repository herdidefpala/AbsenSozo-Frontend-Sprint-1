import { getSupabaseClient } from './supabase'

export async function updateAccountPassword(password) {
  const { error } = await getSupabaseClient().auth.updateUser({ password })
  if (error) throw error
}
