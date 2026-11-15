import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ClipboardCheck, Search, X } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { getAdminRequests, reviewEmployeeRequest } from '../lib/requests'

const requestTypeLabels = {
  izin: 'Izin',
  sakit: 'Sakit',
  cuti: 'Cuti',
  lainnya: 'Lainnya',
}

const statusLabels = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  rejected: 'Ditolak',
}

function formatDate(value) {
  return new Date(`${value}T12:00:00+07:00`).toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatDateRange(request) {
  return request.start_date === request.end_date
    ? formatDate(request.start_date)
    : `${formatDate(request.start_date)} – ${formatDate(request.end_date)}`
}

export default function AdminRequests() {
  const [requests, setRequests] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [adminNote, setAdminNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [reviewError, setReviewError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    getAdminRequests().then((data) => {
      if (active) setRequests(data)
    }).catch((loadError) => {
      if (active) setError(loadError.message || 'Gagal memuat pengajuan karyawan.')
    }).finally(() => {
      if (active) setLoading(false)
    })

    return () => {
      active = false
    }
  }, [])

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('id-ID')
    return requests.filter((request) => {
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter
      const matchesSearch = !query || [
        request.employee?.full_name || '',
        request.employee?.employee_code || '',
        request.employee?.department || '',
        request.reason,
        requestTypeLabels[request.request_type] || request.request_type,
      ].some((value) => value.toLocaleLowerCase('id-ID').includes(query))
      return matchesStatus && matchesSearch
    })
  }, [requests, search, statusFilter])

  const openRequest = (request) => {
    setSelectedRequest(request)
    setAdminNote(request.admin_note || '')
    setReviewError('')
  }

  const closeRequest = () => {
    if (saving) return
    setSelectedRequest(null)
    setReviewError('')
  }

  const handleReview = async (status) => {
    if (!selectedRequest || saving) return
    setSaving(true)
    setReviewError('')
    try {
      const reviewed = await reviewEmployeeRequest(selectedRequest.id, status, adminNote)
      setRequests((current) => current.map((request) => (
        request.id === reviewed.id ? { ...request, ...reviewed } : request
      )))
      setSelectedRequest((current) => ({ ...current, ...reviewed }))
      setNotice(`Pengajuan ${status === 'approved' ? 'disetujui' : 'ditolak'}${selectedRequest.employee?.full_name ? ` untuk ${selectedRequest.employee.full_name}` : ''}.`)
    } catch (saveError) {
      setReviewError(saveError.message || 'Gagal menyimpan keputusan pengajuan.')
    } finally {
      setSaving(false)
    }
  }

  const pendingCount = requests.filter((request) => request.status === 'pending').length

  return <div className="app-shell"><Sidebar admin/><main className="main-area"><Topbar admin title="Pengajuan" subtitle="Tinjau permohonan karyawan"/>
    <div className="page-content">
      <div className="welcome-row"><div><div className="page-eyebrow">ADMINISTRATION</div><h1>Pengajuan Karyawan</h1><p>Tinjau permohonan izin, sakit, dan cuti dari karyawan.</p></div><div className="date-pill"><ClipboardCheck size={15}/>{pendingCount} menunggu</div></div>
      {notice && <div className="form-message success request-admin-notice" role="status">{notice}</div>}
      <section className="panel admin-request-panel">
        <div className="attendance-filters">
          <label className="attendance-search"><Search size={16}/><input aria-label="Cari pengajuan" type="search" placeholder="Cari nama, kode, jenis, atau alasan" value={search} onChange={(event) => setSearch(event.target.value)}/></label>
          <label className="attendance-filter-field"><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Semua status</option><option value="pending">Menunggu</option><option value="approved">Disetujui</option><option value="rejected">Ditolak</option></select></label>
        </div>
        {error && <div className="form-message error" role="alert">{error}</div>}
        <div className="attendance-list-summary">{loading ? 'Memuat data...' : `${filteredRequests.length} pengajuan · ${pendingCount} menunggu ditinjau`}</div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>NAMA KARYAWAN</th><th>JENIS</th><th>TANGGAL PENGAJUAN</th><th>PERIODE</th><th>STATUS</th><th>AKSI</th></tr></thead>
            <tbody>
              {filteredRequests.map((request) => <tr key={request.id}>
                <td><div className="table-person"><span>{(request.employee?.full_name || '?').split(' ').map((part) => part[0]).slice(0, 2).join('')}</span><div><b>{request.employee?.full_name || 'Profil karyawan tidak tersedia'}</b><small className="request-employee-code">{request.employee?.employee_code || '—'} · {request.employee?.department || '—'}</small></div></div></td>
                <td>{requestTypeLabels[request.request_type] || request.request_type}</td>
                <td>{new Date(request.created_at).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric' })}</td>
                <td>{formatDateRange(request)}</td>
                <td><span className={`request-status ${request.status}`}>{statusLabels[request.status] || request.status}</span></td>
                <td><button className="attendance-detail-button" type="button" onClick={() => openRequest(request)}>{request.status === 'pending' ? 'Tinjau' : 'Detail'}</button></td>
              </tr>)}
              {!loading && !error && !filteredRequests.length && <tr><td className="attendance-empty-cell" colSpan="6">Tidak ada pengajuan yang cocok.</td></tr>}
              {loading && <tr><td className="attendance-empty-cell" colSpan="6">Memuat pengajuan...</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </main>

    {selectedRequest && <div className="attendance-detail-overlay" onMouseDown={(event) => {
      if (event.target === event.currentTarget) closeRequest()
    }}>
      <section className="attendance-detail-dialog request-review-dialog" role="dialog" aria-modal="true" aria-labelledby="request-review-title">
        <div className="attendance-detail-heading"><div><h2 id="request-review-title">Detail pengajuan</h2><p>{selectedRequest.employee?.full_name || 'Karyawan'} · {requestTypeLabels[selectedRequest.request_type] || selectedRequest.request_type}</p></div><button type="button" className="attendance-close-button" aria-label="Tutup detail pengajuan" onClick={closeRequest} disabled={saving}><X size={18}/></button></div>
        <div className="request-review-meta">
          <div><span>Periode</span><b><CalendarDays size={14}/>{formatDateRange(selectedRequest)}</b></div>
          <div><span>Status</span><b><span className={`request-status ${selectedRequest.status}`}>{statusLabels[selectedRequest.status] || selectedRequest.status}</span></b></div>
          <div className="request-review-reason"><span>Alasan karyawan</span><p>{selectedRequest.reason}</p></div>
        </div>
        {selectedRequest.status === 'pending'
          ? <label className="request-admin-note-field">Catatan admin (opsional)<textarea className="text-input request-reason-input" value={adminNote} onChange={(event) => setAdminNote(event.target.value)} maxLength={1000} placeholder="Tambahkan catatan untuk karyawan"/></label>
          : selectedRequest.admin_note && <div className="request-admin-note"><b>Catatan admin</b><span>{selectedRequest.admin_note}</span></div>}
        {reviewError && <div className="form-message error" role="alert">{reviewError}</div>}
        {selectedRequest.status === 'pending' && <div className="request-review-actions">
          <button type="button" className="secondary-button reject-request-button" onClick={() => handleReview('rejected')} disabled={saving}>{saving ? 'Menyimpan...' : 'Tolak'}</button>
          <button type="button" className="primary-button" onClick={() => handleReview('approved')} disabled={saving}>{saving ? 'Menyimpan...' : 'Setujui'}</button>
        </div>}
      </section>
    </div>}
  </div>
}
