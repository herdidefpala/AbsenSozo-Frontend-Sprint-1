import { useEffect, useState } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import EmployeeAttendance from './pages/EmployeeAttendance'
import AdminDashboard from './pages/AdminDashboard'
import AdminAttendance from './pages/AdminAttendance'
import AdminEmployees from './pages/AdminEmployees'
import AdminLocations from './pages/AdminLocations'
import AdminReports from './pages/AdminReports'
import AdminSchedule from './pages/AdminSchedule'
import AdminSettings from './pages/AdminSettings'
import { useAuth } from './context/AuthContext'
import { getEmployeeProfile } from './lib/attendance'

function AuthRoute({ role, children }) {
  const { user, loading } = useAuth()
  const [profile, setProfile] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    if (loading || !user) return

    let active = true
    setStatus('loading')
    setProfile(null)
    setError('')
    getEmployeeProfile(user.id).then((employeeProfile) => {
      if (!active) return
      setProfile(employeeProfile)
      setStatus('ready')
    }).catch((profileError) => {
      if (!active) return
      setError(profileError.message || 'Gagal memuat profil karyawan.')
      setStatus('error')
    })

    return () => {
      active = false
    }
  }, [loading, user])

  if (loading || status === 'loading') {
    if (!user && !loading) return <Navigate to="/" replace />
    return <div className="auth-loading">Memeriksa sesi akun...</div>
  }
  if (!user) return <Navigate to="/" replace />
  if (status === 'error') {
    return <main className="auth-error"><h1>Gagal memeriksa akses</h1><p>{error}</p><Link to="/">Kembali ke login</Link></main>
  }
  if (!profile) {
    return <main className="auth-error"><h1>Profil karyawan belum tersedia</h1><p>Minta administrator menambahkan profil akun ini di tabel employee_profiles.</p><Link to="/">Kembali ke login</Link></main>
  }
  if (profile.role !== role) {
    return <Navigate to={profile.role === 'admin' ? '/admin' : '/employee'} replace />
  }

  return children
}

export default function App() {
  return <Routes>
    <Route path="/" element={<Login />} />
    <Route path="/employee" element={<AuthRoute role="employee"><Dashboard /></AuthRoute>} />
    <Route path="/employee/attendance" element={<AuthRoute role="employee"><EmployeeAttendance /></AuthRoute>} />
    <Route path="/admin" element={<AuthRoute role="admin"><AdminDashboard /></AuthRoute>} />
    <Route path="/admin/attendance" element={<AuthRoute role="admin"><AdminAttendance /></AuthRoute>} />
    <Route path="/admin/employees" element={<AuthRoute role="admin"><AdminEmployees /></AuthRoute>} />
    <Route path="/admin/schedule" element={<AuthRoute role="admin"><AdminSchedule /></AuthRoute>} />
    <Route path="/admin/locations" element={<AuthRoute role="admin"><AdminLocations /></AuthRoute>} />
    <Route path="/admin/reports" element={<AuthRoute role="admin"><AdminReports /></AuthRoute>} />
    <Route path="/admin/settings" element={<AuthRoute role="admin"><AdminSettings /></AuthRoute>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
}