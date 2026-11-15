import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, UserCheck, Clock3, UserX, ArrowUpRight } from 'lucide-react'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { getAdminAttendanceOverview } from '../lib/attendance'

function formatTime(value) {
  return new Date(value).toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminDashboard() {
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getAdminAttendanceOverview().then((data) => {
      if (active) setOverview(data)
    }).catch((loadError) => {
      if (active) setError(loadError.message || 'Gagal memuat ringkasan absensi.')
    }).finally(() => {
      if (active) setLoading(false)
    })

    return () => {
      active = false
    }
  }, [])

  const stats = [
    { label: 'Total karyawan', value: overview?.totalEmployees ?? '—', note: 'Profil karyawan terdaftar', icon: Users, tone: 'blue' },
    { label: 'Hadir hari ini', value: overview?.present ?? '—', note: 'Check-in tersimpan', icon: UserCheck, tone: 'green' },
    { label: 'Terlambat', value: overview?.late ?? '—', note: 'Mengacu pada jadwal saat check-in', icon: Clock3, tone: 'amber' },
    { label: 'Belum hadir', value: overview?.absent ?? '—', note: 'Belum check-in hari ini', icon: UserX, tone: 'red' },
  ]
  const attendanceRate = overview?.totalEmployees
    ? Math.round((overview.present / overview.totalEmployees) * 100)
    : 0
  const today = new Date().toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return <div className="app-shell"><Sidebar admin/><main className="main-area"><Topbar admin title="Overview" subtitle="Pantau aktivitas kehadiran seluruh karyawan"/>
    <div className="page-content">
      <div className="welcome-row"><div><div className="page-eyebrow">ADMINISTRATION</div><h1>Dashboard Overview</h1><p>Berikut ringkasan kehadiran dan aktivitas tim Anda.</p></div><div className="date-pill">{today}</div></div>
      {error && <div className="form-message error" role="alert">{error}</div>}
      <div className="stats-grid admin-stats">{stats.map((stat) => {const Icon=stat.icon;return <div className="stat-card admin-stat" key={stat.label}><div className={`stat-icon ${stat.tone}`}><Icon size={19}/></div><span>{stat.label}</span><b>{stat.value}</b><small>{stat.note}</small></div>})}</div>
      <div className="admin-content-grid">
        <section className="panel chart-panel"><div className="panel-heading"><div><h3>Tren kehadiran</h3><p>Persentase kehadiran selama 7 hari terakhir</p></div><span className="more-button">Minggu ini</span></div>
          <div className="chart-area"><ResponsiveContainer width="100%" height="100%"><BarChart data={overview?.chartData || []}><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill:'#8792A5',fontSize:12}}/><Tooltip cursor={{fill:'#F3F6FC'}} formatter={(value) => [`${value}%`, 'Hadir']}/><Bar dataKey="hadir" fill="#3478F6" radius={[5,5,0,0]} maxBarSize={32}/></BarChart></ResponsiveContainer></div>
        </section>
        <section className="panel"><div className="panel-heading"><div><h3>Ringkasan status</h3><p>Komposisi kehadiran hari ini</p></div></div>
          <div className="status-summary"><div className="summary-number">{loading ? '—' : `${attendanceRate}%`}<span>Tingkat kehadiran</span></div><div className="progress-track"><div style={{width:`${attendanceRate}%`}}/></div><div className="legend-row"><i className="dot green-dot"/>Hadir <b>{overview?.present ?? '—'}</b></div><div className="legend-row"><i className="dot amber-dot"/>Terlambat <b>{overview?.late ?? '—'}</b></div><div className="legend-row"><i className="dot red-dot"/>Belum hadir <b>{overview?.absent ?? '—'}</b></div></div>
        </section>
      </div>
      <section className="panel recent-panel"><div className="panel-heading"><div><h3>Absensi terbaru</h3><p>Aktivitas check-in karyawan hari ini</p></div><Link className="text-action" to="/admin/attendance">Lihat semua <ArrowUpRight size={15}/></Link></div>
        <div className="table-wrap"><table><thead><tr><th>NAMA KARYAWAN</th><th>DEPARTEMEN</th><th>JAM MASUK</th><th>JAM PULANG</th><th>STATUS</th></tr></thead><tbody>
          {overview?.records.map((record) => <tr key={record.id}><td><div className="table-person"><span>{record.employee.full_name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span><b>{record.employee.full_name}</b></div></td><td>{record.employee.department}</td><td>{formatTime(record.check_in_at)}</td><td>{record.check_out_at ? formatTime(record.check_out_at) : '—'}</td><td><span className={`table-status ${record.late ? 'late' : ''}`}>{record.late ? 'Terlambat' : 'Tepat waktu'}</span></td></tr>)}
          {!loading && !overview?.records.length && <tr><td colSpan="5">Belum ada absensi hari ini.</td></tr>}
          {loading && <tr><td colSpan="5">Memuat absensi...</td></tr>}
        </tbody></table></div>
      </section>
      <div className="preview-footnote">Data dashboard ditampilkan langsung dari Supabase. Status terlambat menggunakan jam masuk yang tersimpan pada tiap absensi.</div>
    </div>
  </main></div>
}
