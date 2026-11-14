import { Bell, Search, ChevronDown } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Topbar({ title, subtitle, admin = false }) {
  const { user } = useAuth()
  return <header className="topbar">
    <div><div className="topbar-title">{title}</div><div className="topbar-subtitle">{subtitle}</div></div>
    <div className="topbar-actions">
      <button className="icon-button search-button" aria-label="Cari"><Search size={18}/></button>
      <button className="icon-button notification-button" aria-label="Notifikasi"><Bell size={18}/><i/></button>
      <div className="profile-chip"><div className="avatar">{admin ? 'AD' : (user?.email?.[0] || 'K').toUpperCase()}</div><div className="profile-meta"><b>{user?.email || (admin ? 'Administrator' : 'Karyawan')}</b><span>{admin ? 'Admin' : 'Karyawan'}</span></div><ChevronDown size={15}/></div>
    </div>
  </header>
}