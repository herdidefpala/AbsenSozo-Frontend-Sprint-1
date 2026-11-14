import { createContext, useContext, useEffect, useState } from 'react'
import { getSupabaseClient, supabaseConfigured } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false)
      setError('Konfigurasi Supabase belum lengkap. Isi file .env.local lalu jalankan ulang aplikasi.')
      return undefined
    }

    const client = getSupabaseClient()
    let active = true
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
      setError('')
    })

    client.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return
      if (sessionError) {
        setError(sessionError.message)
      }
      setUser(data.session?.user ?? null)
      setLoading(false)
    }).catch((sessionError) => {
      if (!active) return
      setError(sessionError.message || 'Gagal memuat sesi login.')
      setLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    const { error: signOutError } = await getSupabaseClient().auth.signOut()
    if (signOutError) throw signOutError
  }

  return <AuthContext.Provider value={{ user, loading, error, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider.')
  }

  return context
}
