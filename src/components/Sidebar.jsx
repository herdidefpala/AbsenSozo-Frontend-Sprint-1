import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, CalendarCheck, Clock3, MapPin, FileBarChart, Settings, LogOut, Fingerprint } from 'lucide-react'
import Brand from './Brand'
import { useAuth } from '../context/AuthContext'

const employeeLinks = [
  { to: '/employee', label: 'Dashboard', icon: LayoutDashboard },
]
const adminLinks = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard },
  { to: '/admin', label: 'Karyawan', icon: Users },
  { to: '/admin', label: 'Data Absensi', icon: CalendarCheck },
  { to: '/admin', label: 'Jadwal Kerja', icon: Clock3 },
  { to: '/admin', label: 'Lokasi Kantor', icon: MapPin },
  { to: '/admin', label: 'Laporan', icon: FileBarChart },
  { to: '/admin', label: 'Pengaturan', icon: Settings },
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

  return <aside className="sidebar">
    <div className="sidebar-brand"><Brand light /></div>
    <div className="nav-caption">{admin ? 'WORKSPACE' : 'MENU UTAMA'}</div>
    <nav className="nav-list">
      {links.map((item, i) => {
        const Icon = item.icon
        return <NavLink key={`${item.label}-${i}`} to={item.to} end={i === 0} className={({ isActive }) => `nav-item ${isActive && i === 0 ? 'active' : ''}`}>
          <Icon size={18} /><span>{item.label}</span>
        </NavLink>
      })}
    </nav>
    <div className="sidebar-bottom">
      <div className="sidebar-help"><div className="help-icon"><Fingerprint size={18}/></div><b>Butuh bantuan?</b><span>Hubungi administrator untuk bantuan akun.</span></div>
      {error && <div className="sidebar-error" role="alert">{error}</div>}
      <button className="nav-item logout" onClick={handleSignOut}><LogOut size={18}/> Keluar</button>
    </div>
  </aside>
}