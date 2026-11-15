import { useEffect, useMemo, useState } from 'react'
import { Download, Search } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { getJakartaDate } from '../lib/attendance'
import { getAdminAttendanceReport } from '../lib/reports'

function getInitialRange() {
  const today = getJakartaDate()
  return { startDate: `${today.slice(0, 7)}-01`, endDate: today }
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDate(value) {
  return new Date(`${value}T12:00:00+07:00`).toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function csvCell(value) {
  const text = String(value ?? '')
  const safeText = /^[\t\r\n ]*[=+\-@]/.test(text) ? `'${text}` : text
  return `"${safeText.replace(/"/g, '""')}"`
}

export default function AdminReports() {
  const initialRange = useMemo(getInitialRange, [])
  const [startDate, setStartDate] = useState(initialRange.startDate)
  const [endDate, setEndDate] = useState(initialRange.endDate)
  const [appliedRange, setAppliedRange] = useState(initialRange)
  const [records, setRecords] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    getAdminAttendanceReport(appliedRange).then((data) => {
      if (active) setRecords(data)
    }).catch((loadError) => {
      if (active) setError(loadError.message || 'Gagal memuat laporan absensi.')
    }).finally(() => {
      if (active) setLoading(false)
    })

    return () => {
      active = false
    }
  }, [appliedRange])

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('id-ID')
    return records.filter((record) => {
      const matchesStatus = statusFilter === 'all'
        || (statusFilter === 'late' ? record.late : !record.late)
      const matchesSearch = !query || [
        record.employee.full_name,
        record.employee.employee_code,
        record.employee.department,
      ].some((value) => value.toLocaleLowerCase('id-ID').includes(query))
      return matchesStatus && matchesSearch
    })
  }, [records, search, statusFilter])

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!startDate || !endDate || startDate > endDate) {
      setError('Tanggal mulai harus sama atau lebih awal dari tanggal akhir.')
      return
    }
    setAppliedRange({ startDate, endDate })
  }

  const exportCsv = () => {
    const rows = [
      ['Tanggal', 'Kode karyawan', 'Nama karyawan', 'Departemen', 'Jam masuk (WIB)', 'Jam pulang (WIB)', 'Status'],
      ...filteredRecords.map((record) => [
        record.work_date,
        record.employee.employee_code,
        record.employee.full_name,
        record.employee.department,
        formatTime(record.check_in_at),
        record.check_out_at ? formatTime(record.check_out_at) : '',
        record.late ? 'Terlambat' : 'Tepat waktu',
      ]),
    ]
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `laporan-absensi-${appliedRange.startDate}-${appliedRange.endDate}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  const lateCount = filteredRecords.filter((record) => record.late).length

  return <div className="app-shell"><Sidebar admin/><main className="main-area"><Topbar admin title="Laporan" subtitle="Rekap dan ekspor data absensi"/>
    <div className="page-content">
      <div className="welcome-row"><div><div className="page-eyebrow">ADMINISTRATION</div><h1>Laporan Absensi</h1><p>Rekap kehadiran karyawan berdasarkan rentang tanggal.</p></div></div>
      <section className="panel report-panel">
        <form className="report-filters" onSubmit={handleSubmit}>
          <label>Tanggal mulai<input aria-label="Tanggal mulai laporan" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required/></label>
          <label>Tanggal akhir<input aria-label="Tanggal akhir laporan" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} required/></label>
          <button type="submit" className="primary-button" disabled={loading}>Tampilkan</button>
        </form>

        {error && <div className="form-message error" role="alert">{error}</div>}
        <div className="report-toolbar">
          <label className="attendance-search"><Search size={16}/><input aria-label="Cari laporan" type="search" placeholder="Cari nama, kode, atau departemen" value={search} onChange={(event) => setSearch(event.target.value)}/></label>
          <label className="report-status-filter"><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Semua</option><option value="ontime">Tepat waktu</option><option value="late">Terlambat</option></select></label>
          <button type="button" className="secondary-button report-export-button" onClick={exportCsv} disabled={loading || !filteredRecords.length}><Download size={15}/> Unduh CSV</button>
        </div>
        <div className="report-summary">{loading ? 'Memuat laporan...' : `${filteredRecords.length} catatan · ${lateCount} terlambat · ${formatDate(appliedRange.startDate)} – ${formatDate(appliedRange.endDate)}`}</div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>TANGGAL</th><th>NAMA KARYAWAN</th><th>KODE</th><th>DEPARTEMEN</th><th>JAM MASUK</th><th>JAM PULANG</th><th>STATUS</th></tr></thead>
            <tbody>
              {filteredRecords.map((record) => <tr key={record.id}>
                <td>{formatDate(record.work_date)}</td>
                <td><div className="table-person"><span>{record.employee.full_name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span><b>{record.employee.full_name}</b></div></td>
                <td>{record.employee.employee_code}</td>
                <td>{record.employee.department}</td>
                <td>{formatTime(record.check_in_at)}</td>
                <td>{record.check_out_at ? formatTime(record.check_out_at) : '—'}</td>
                <td><span className={`table-status ${record.late ? 'late' : ''}`}>{record.late ? 'Terlambat' : 'Tepat waktu'}</span></td>
              </tr>)}
              {!loading && !error && !filteredRecords.length && <tr><td className="attendance-empty-cell" colSpan="7">Tidak ada data pada rentang tanggal dan filter tersebut.</td></tr>}
              {loading && <tr><td className="attendance-empty-cell" colSpan="7">Memuat laporan absensi...</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </main></div>
}
