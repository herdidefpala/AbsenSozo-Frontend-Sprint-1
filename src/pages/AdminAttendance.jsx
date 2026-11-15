import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, MapPin, Search, X } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { getAdminAttendanceRecords, getAttendancePhotoUrl, getJakartaDate } from '../lib/attendance'

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
    month: 'long',
    year: 'numeric',
  })
}

export default function AdminAttendance() {
  const [workDate, setWorkDate] = useState(() => getJakartaDate())
  const [records, setRecords] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [photoUrl, setPhotoUrl] = useState('')
  const [photoError, setPhotoError] = useState('')
  const [loadingPhoto, setLoadingPhoto] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    getAdminAttendanceRecords(workDate).then((data) => {
      if (active) setRecords(data)
    }).catch((loadError) => {
      if (active) setError(loadError.message || 'Gagal memuat data absensi.')
    }).finally(() => {
      if (active) setLoading(false)
    })

    return () => {
      active = false
    }
  }, [workDate])

  useEffect(() => {
    if (!selectedRecord) return undefined

    let active = true
    setPhotoUrl('')
    setPhotoError('')
    setLoadingPhoto(true)
    getAttendancePhotoUrl(selectedRecord.photo_path).then((url) => {
      if (active) setPhotoUrl(url)
    }).catch((photoLoadError) => {
      if (active) setPhotoError(photoLoadError.message || 'Gagal memuat foto absensi.')
    }).finally(() => {
      if (active) setLoadingPhoto(false)
    })

    return () => {
      active = false
    }
  }, [selectedRecord])

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

  return <div className="app-shell"><Sidebar admin/><main className="main-area"><Topbar admin title="Data Absensi" subtitle="Pantau catatan kehadiran karyawan"/>
    <div className="page-content">
    <div className="welcome-row"><div><div className="page-eyebrow">ADMINISTRATION</div><h1>Data Absensi</h1><p>Periksa dan telusuri catatan check-in karyawan.</p></div><div className="date-pill"><CalendarDays size={15}/>{formatDate(workDate)}</div></div>

      <section className="panel attendance-list-panel">
        <div className="attendance-filters">
          <label className="attendance-search"><Search size={16}/><input aria-label="Cari karyawan" type="search" placeholder="Cari nama, kode, atau departemen" value={search} onChange={(event) => setSearch(event.target.value)}/></label>
          <label className="attendance-filter-field"><span>Tanggal</span><input aria-label="Pilih tanggal absensi" type="date" value={workDate} onChange={(event) => setWorkDate(event.target.value)}/></label>
          <label className="attendance-filter-field"><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Semua status</option><option value="ontime">Tepat waktu</option><option value="late">Terlambat</option></select></label>
        </div>

        {error && <div className="form-message error" role="alert">{error}</div>}
        <div className="attendance-list-summary">{loading ? 'Memuat data...' : `${filteredRecords.length} catatan · ${formatDate(workDate)}`}</div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>NAMA KARYAWAN</th><th>KODE</th><th>DEPARTEMEN</th><th>JAM MASUK</th><th>JAM PULANG</th><th>STATUS</th><th>DETAIL</th></tr></thead>
            <tbody>
              {filteredRecords.map((record) => <tr key={record.id}>
                <td><div className="table-person"><span>{record.employee.full_name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span><b>{record.employee.full_name}</b></div></td>
                <td>{record.employee.employee_code}</td>
                <td>{record.employee.department}</td>
                <td>{formatTime(record.check_in_at)}</td>
                <td>{record.check_out_at ? formatTime(record.check_out_at) : '—'}</td>
                <td><span className={`table-status ${record.late ? 'late' : ''}`}>{record.late ? 'Terlambat' : 'Tepat waktu'}</span></td>
                <td><button className="attendance-detail-button" type="button" onClick={() => setSelectedRecord(record)}>Lihat detail</button></td>
              </tr>)}
              {!loading && !error && !filteredRecords.length && <tr><td className="attendance-empty-cell" colSpan="7">Tidak ada catatan absensi yang cocok.</td></tr>}
              {loading && <tr><td className="attendance-empty-cell" colSpan="7">Memuat data absensi...</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </main>

    {selectedRecord && <div className="attendance-detail-overlay" onMouseDown={(event) => {
      if (event.target === event.currentTarget) setSelectedRecord(null)
    }}>
      <section className="attendance-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="attendance-detail-title">
        <div className="attendance-detail-heading"><div><h2 id="attendance-detail-title">Detail absensi</h2><p>{selectedRecord.employee.full_name} · {formatDate(selectedRecord.work_date)}</p></div><button type="button" className="attendance-close-button" aria-label="Tutup detail" onClick={() => setSelectedRecord(null)}><X size={18}/></button></div>
        <div className="attendance-detail-meta">
          <div><span>Jam masuk</span><b>{formatTime(selectedRecord.check_in_at)} WIB</b></div>
          <div><span>Jam pulang</span><b>{selectedRecord.check_out_at ? `${formatTime(selectedRecord.check_out_at)} WIB` : 'Belum check-out'}</b></div>
          <div><span>Status</span><b className={selectedRecord.late ? 'detail-late' : 'detail-ontime'}>{selectedRecord.late ? 'Terlambat' : 'Tepat waktu'}</b></div>
          <div><span>Batas jam masuk</span><b>{selectedRecord.scheduled_start_time.slice(0, 5)} WIB</b></div>
          <div><span>Departemen</span><b>{selectedRecord.employee.department}</b></div>
          <div><span>Akurasi lokasi</span><b>{selectedRecord.accuracy_m} m</b></div>
        </div>
        <a className="attendance-map-link" href={`https://www.google.com/maps?q=${selectedRecord.latitude},${selectedRecord.longitude}`} target="_blank" rel="noreferrer"><MapPin size={16}/>Lihat lokasi check-in</a>
        <h3 className="attendance-photo-title">Foto check-in</h3>
        {loadingPhoto && <div className="attendance-photo-message">Memuat foto...</div>}
        {photoError && <div className="form-message error" role="alert">{photoError}</div>}
        {photoUrl && <img className="attendance-detail-photo" src={photoUrl} alt={`Foto check-in ${selectedRecord.employee.full_name}`}/>}
      </section>
    </div>}
  </div>
}
