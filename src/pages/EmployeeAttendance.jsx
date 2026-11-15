import { useEffect, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { useAuth } from '../context/AuthContext'
import { getEmployeeAttendanceHistory } from '../lib/attendance'

const PAGE_SIZE = 20

function formatDate(value) {
  return new Date(`${value}T12:00:00+07:00`).toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function EmployeeAttendance() {
  const { user } = useAuth()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [appliedRange, setAppliedRange] = useState({ startDate: '', endDate: '' })
  const [page, setPage] = useState(0)
  const [records, setRecords] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterError, setFilterError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    getEmployeeAttendanceHistory(user.id, { ...appliedRange, page, pageSize: PAGE_SIZE }).then((result) => {
      if (!active) return
      setRecords(result.records)
      setCount(result.count)
    }).catch((loadError) => {
      if (active) setError(loadError.message || 'Gagal memuat rekap absensi.')
    }).finally(() => {
      if (active) setLoading(false)
    })

    return () => {
      active = false
    }
  }, [user.id, appliedRange, page])

  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE))

  const handleFilter = (event) => {
    event.preventDefault()
    if (startDate && endDate && startDate > endDate) {
      setFilterError('Tanggal mulai harus sama atau lebih awal dari tanggal akhir.')
      return
    }
    setFilterError('')
    setPage(0)
    setAppliedRange({ startDate, endDate })
  }

  return <div className="app-shell"><Sidebar/><main className="main-area"><Topbar title="Rekap Absensi" subtitle="Riwayat kehadiran pribadi Anda"/>
    <div className="page-content">
      <div className="welcome-row"><div><div className="page-eyebrow">AREA KARYAWAN</div><h1>Rekap Absensi Saya</h1><p>Riwayat ini hanya dapat dilihat dan tidak dapat diubah.</p></div><div className="date-pill"><CalendarDays size={15}/>{count} catatan</div></div>
      <section className="panel employee-history-panel">
        <form className="employee-history-filters" onSubmit={handleFilter}>
          <label>Tanggal mulai<input aria-label="Tanggal mulai rekap" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)}/></label>
          <label>Tanggal akhir<input aria-label="Tanggal akhir rekap" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)}/></label>
          <button type="submit" className="primary-button" disabled={loading}>Tampilkan</button>
        </form>
        {filterError && <div className="form-message error" role="alert">{filterError}</div>}
        {error && <div className="form-message error" role="alert">{error}</div>}
        <div className="attendance-list-summary">{loading ? 'Memuat rekap...' : `${count} catatan absensi · Halaman ${page + 1} dari ${pageCount}`}</div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>TANGGAL</th><th>JAM CHECK-IN</th><th>BATAS JAM MASUK</th><th>STATUS</th></tr></thead>
            <tbody>
              {records.map((record) => <tr key={record.id}>
                <td>{formatDate(record.work_date)}</td>
                <td>{formatTime(record.check_in_at)} WIB</td>
                <td>{record.scheduled_start_time.slice(0, 5)} WIB</td>
                <td><span className={`table-status ${record.late ? 'late' : ''}`}>{record.late ? 'Terlambat' : 'Tepat waktu'}</span></td>
              </tr>)}
              {!loading && !error && !records.length && <tr><td className="attendance-empty-cell" colSpan="4">Belum ada catatan absensi pada rentang tanggal ini.</td></tr>}
              {loading && <tr><td className="attendance-empty-cell" colSpan="4">Memuat riwayat absensi...</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="employee-history-pagination">
          <button type="button" className="secondary-button" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={loading || page === 0}><ChevronLeft size={15}/> Sebelumnya</button>
          <button type="button" className="secondary-button" onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))} disabled={loading || page >= pageCount - 1}>Berikutnya <ChevronRight size={15}/></button>
        </div>
      </section>
      <div className="preview-footnote">Data rekap berasal dari absensi akun yang sedang login. Karyawan tidak memiliki akses untuk mengedit atau menghapus catatan.</div>
    </div>
  </main></div>
}
