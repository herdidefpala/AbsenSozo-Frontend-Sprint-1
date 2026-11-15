import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, CalendarCheck, Clock3, MapPin, FileBarChart, FileText, Settings, LogOut, Fingerprint, ClipboardCheck, Menu, X } from 'lucide-react'
import Brand from './Brand'
import { useAuth } from '../context/AuthContext'

const employeeLinks = [
  { to: '/employee', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/employee/requests', label: 'Pengajuan', icon: FileText },
  { to: '/employee/attendance', label: 'Rekap Absensi', icon: CalendarCheck },
]
const adminLinks = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard },
  { to: '/admin/employees', label: 'Karyawan', icon: Users },
  { to: '/admin/attendance', label: 'Data Absensi', icon: CalendarCheck },
  { to: '/admin/schedule', label: 'Jadwal Kerja', icon: Clock3 },
  { to: '/admin/locations', label: 'Lokasi Kantor', icon: MapPin },
  { to: '/admin/requests', label: 'Pengajuan', icon: ClipboardCheck },
  { to: '/admin/reports', label: 'Laporan', icon: FileBarChart },
  { to: '/admin/settings', label: 'Pengaturan', icon: Settings },
]
export default function Sidebar({ admin = false }) {
  const { signOut } = useAuth()
  const [error, setError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const links = admin ? adminLinks : employeeLinks

  const handleSignOut = async () => {
    setError('')
    try {
      await signOut()
    } catch (signOutError) {
      setError(signOutError.message || 'Gagal keluar dari akun.')
    }
  }

  return <>
    {!admin && <button type="button" className="employee-menu-toggle" aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'} aria-expanded={menuOpen} aria-controls="employee-navigation" onClick={() => setMenuOpen((open) => !open)}>
      {menuOpen ? <X size={20}/> : <Menu size={20}/>}
    </button>}
    {!admin && menuOpen && <button type="button" className="employee-menu-backdrop" aria-label="Tutup menu" onClick={() => setMenuOpen(false)}/>}
    <aside id={admin ? undefined : 'employee-navigation'} className={`sidebar ${admin ? 'admin-sidebar' : 'employee-sidebar'} ${menuOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-brand"><Brand light /></div>
      <div className="nav-caption">{admin ? 'WORKSPACE' : 'MENU UTAMA'}</div>
      <nav className="nav-list">
        {links.map((item) => {
          const Icon = item.icon
          return <NavLink key={item.label} to={item.to} end onClick={() => setMenuOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Icon size={18} /><span>{item.label}</span>
          </NavLink>
        })}
      </nav>
      <div className="sidebar-bottom">
        <a className="sidebar-help sidebar-help-button" href="https://wa.me/6285697315516?text=Halo%20Admin%20AbsenSozo%2C%20saya%20membutuhkan%20bantuan%20terkait%20aplikasi%20absensi." target="_blank" rel="noopener noreferrer" aria-label="Hubungi administrator melalui WhatsApp">
          <div className="help-icon"><Fingerprint size={18}/></div><b>Butuh bantuan?</b><span>Hubungi administrator untuk bantuan akun.</span><span className="help-mobile-label">Bantuan</span>
        </a>
        {error && <div className="sidebar-error" role="alert">{error}</div>}
        <button type="button" className="nav-item logout" onClick={handleSignOut}><LogOut size={18}/> <span>Keluar</span></button>
      </div>
    </aside>
  </>
}