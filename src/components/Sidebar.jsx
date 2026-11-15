import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, CalendarCheck, Clock3, MapPin, FileBarChart, Settings, LogOut, Fingerprint } from 'lucide-react'
import Brand from './Brand'
import { useAuth } from '../context/AuthContext'

const employeeLinks = [
  { to: '/employee', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/employee/attendance', label: 'Rekap Absensi', icon: CalendarCheck },
]
const adminLinks = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard },
  { to: '/admin/employees', label: 'Karyawan', icon: Users },
  { to: '/admin/attendance', label: 'Data Absensi', icon: CalendarCheck },
  { to: '/admin/schedule', label: 'Jadwal Kerja', icon: Clock3 },
  { to: '/admin/locations', label: 'Lokasi Kantor', icon: MapPin },
  { to: '/admin/reports', label: 'Laporan', icon: FileBarChart },
  { to: '/admin/settings', label: 'Pengaturan', icon: Settings },
]
export default function Sidebar({ admin = false }) {
  const { signOut } = useAuth()
  const [error, setError] = useState('')
  const links = admin ? adminLinks : employeeLinks

  const handleSignOut = async () => {
    setError('')
    try {
      await signOut()
    } catch (signOutError) {
      setError(signOutError.message || 'Gagal keluar dari akun.')
    }
  }

  return <aside className={`sidebar ${admin ? 'admin-sidebar' : 'employee-sidebar'}`}>
    <div className="sidebar-brand"><Brand light /></div>
    <div className="nav-caption">{admin ? 'WORKSPACE' : 'MENU UTAMA'}</div>
    <nav className="nav-list">
      {links.map((item) => {
        const Icon = item.icon
        return <NavLink key={item.label} to={item.to} end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Icon size={18} /><span>{item.label}</span>
        </NavLink>
      })}
    </nav>
    <div className="sidebar-bottom">
      <div className="sidebar-help"><div className="help-icon"><Fingerprint size={18}/></div><b>Butuh bantuan?</b><span>Hubungi administrator untuk bantuan akun.</span></div>
      {error && <div className="sidebar-error" role="alert">{error}</div>}
      <button type="button" className="nav-item logout" onClick={handleSignOut}><LogOut size={18}/> Keluar</button>
    </div>
  </aside>
}