import { useEffect, useState } from 'react'
import { CalendarDays, ClipboardList, Send } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { useAuth } from '../context/AuthContext'
import { getJakartaDate } from '../lib/attendance'
import { getEmployeeRequests, submitEmployeeRequest } from '../lib/requests'

const requestTypes = [
  { value: 'izin', label: 'Izin' },
  { value: 'sakit', label: 'Sakit' },
  { value: 'cuti', label: 'Cuti' },
  { value: 'lainnya', label: 'Lainnya' },
]

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

export default function EmployeeRequests({ employeeProfile }) {
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [requestType, setRequestType] = useState('izin')
  const [startDate, setStartDate] = useState(getJakartaDate())
  const [endDate, setEndDate] = useState(getJakartaDate())
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError('')
    getEmployeeRequests(user.id).then((data) => {
      if (active) setRequests(data)
    }).catch((error) => {
      if (active) setLoadError(error.message || 'Gagal memuat pengajuan.')
    }).finally(() => {
      if (active) setLoading(false)
    })

    return () => {
      active = false
    }
  }, [user.id])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (saving) return

    const trimmedReason = reason.trim()
    if (endDate < startDate) {
      setFormError('Tanggal selesai tidak boleh sebelum tanggal mulai.')
      setNotice('')
      return
    }
    if (!trimmedReason) {
      setFormError('Alasan pengajuan wajib diisi.')
      setNotice('')
      return
    }

    setSaving(true)
    setFormError('')
    setNotice('')
    try {
      const request = await submitEmployeeRequest(user.id, {
        requestType,
        startDate,
        endDate,
        reason: trimmedReason,
      })
      setRequests((current) => [request, ...current])
      setReason('')
      setNotice('Pengajuan berhasil dikirim dan menunggu pemeriksaan admin.')
    } catch (submitError) {
      setFormError(submitError.message || 'Gagal mengirim pengajuan.')
    } finally {
      setSaving(false)
    }
  }

  return <div className="app-shell"><Sidebar/><main className="main-area"><Topbar title="Pengajuan" subtitle="Ajukan izin, sakit, atau cuti"/>
    <div className="page-content">
      <div className="welcome-row"><div><div className="page-eyebrow">AREA KARYAWAN</div><h1>Pengajuan</h1><p>Kirim pengajuan dan pantau keputusan administrator.</p></div></div>
      <div className="employee-requests-grid">
        <section className="panel request-form-panel">
          <div className="panel-heading"><div><h3>Buat pengajuan</h3><p>Pengajuan akan diteruskan ke administrator untuk ditinjau.</p></div></div>
          <form className="employee-request-form" onSubmit={handleSubmit}>
            <label>Jenis pengajuan
              <select className="text-input" value={requestType} onChange={(event) => setRequestType(event.target.value)}>
                {requestTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
            </label>
            <div className="request-date-fields">
              <label>Tanggal mulai<input className="text-input" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required/></label>
              <label>Tanggal selesai<input className="text-input" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} min={startDate} required/></label>
            </div>
            <label>Alasan
              <textarea className="text-input request-reason-input" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Tuliskan alasan pengajuan dengan jelas" maxLength={1000} required/>
              <span className="request-field-hint">{reason.length}/1000 karakter</span>
            </label>
            {formError && <div className="form-message error" role="alert">{formError}</div>}
            {notice && <div className="form-message success" role="status">{notice}</div>}
            <button type="submit" className="primary-button full-width" disabled={saving}><Send size={15}/>{saving ? 'Mengirim...' : 'Kirim pengajuan'}</button>
          </form>
        </section>

        <section className="panel employee-request-list-panel">
          <div className="panel-heading"><div><h3>Riwayat pengajuan</h3><p>{employeeProfile?.full_name || 'Pengajuan saya'}</p></div><div className="request-list-icon"><ClipboardList size={17}/></div></div>
          {loadError && <div className="form-message error" role="alert">{loadError}</div>}
          {loading && <div className="request-list-empty">Memuat pengajuan...</div>}
          {!loading && !loadError && requests.length === 0 && <div className="request-list-empty"><ClipboardList size={24}/><b>Belum ada pengajuan</b><span>Pengajuan yang Anda kirim akan tampil di sini.</span></div>}
          {!loading && !loadError && requests.length > 0 && <div className="request-history-list">
            {requests.map((request) => <article className="request-history-card" key={request.id}>
              <div className="request-history-heading"><div><b>{requestTypes.find((type) => type.value === request.request_type)?.label || request.request_type}</b><span className={`request-status ${request.status}`}>{statusLabels[request.status] || request.status}</span></div><small>{new Date(request.created_at).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric' })}</small></div>
              <div className="request-history-date"><CalendarDays size={14}/>{formatDateRange(request)}</div>
              <p>{request.reason}</p>
              {request.admin_note && <div className="request-admin-note"><b>Catatan admin</b><span>{request.admin_note}</span></div>}
            </article>)}
          </div>}
        </section>
      </div>
    </div>
  </main></div>
}
