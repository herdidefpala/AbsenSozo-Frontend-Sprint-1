import { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { getWorkSchedule, updateWorkSchedule } from '../lib/workSchedule'

function formatUpdatedAt(value) {
  return new Date(value).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default function AdminSchedule() {
  const [schedule, setSchedule] = useState(null)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    getWorkSchedule().then((data) => {
      if (!active) return
      setSchedule(data)
      setStartTime(data.startTime)
      setEndTime(data.endTime)
    }).catch((loadError) => {
      if (active) setError(loadError.message || 'Gagal memuat jadwal kerja.')
    }).finally(() => {
      if (active) setLoading(false)
    })

    return () => {
      active = false
    }
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (saving) return
    if (!startTime || !endTime || endTime <= startTime) {
      setError('Jam pulang harus lebih akhir dari jam masuk.')
      setNotice('')
      return
    }

    setSaving(true)
    setError('')
    setNotice('')
    try {
      const updatedSchedule = await updateWorkSchedule({ startTime, endTime })
      setSchedule(updatedSchedule)
      setStartTime(updatedSchedule.startTime)
      setEndTime(updatedSchedule.endTime)
      setNotice('Jadwal kerja berhasil diperbarui.')
    } catch (saveError) {
      setError(saveError.message || 'Gagal menyimpan jadwal kerja.')
    } finally {
      setSaving(false)
    }
  }

  return <div className="app-shell"><Sidebar admin/><main className="main-area"><Topbar admin title="Jadwal Kerja" subtitle="Atur jam kerja standar"/>
    <div className="page-content">
      <div className="welcome-row"><div><div className="page-eyebrow">ADMINISTRATION</div><h1>Jadwal Kerja</h1><p>Atur jam kerja standar yang digunakan seluruh karyawan.</p></div></div>
      <section className="panel schedule-panel">
        <div className="panel-heading"><div><h3>Jadwal standar perusahaan</h3><p>Batas jam masuk ini juga digunakan untuk menentukan status terlambat.</p></div></div>
        {loading && <div className="attendance-photo-message">Memuat jadwal kerja...</div>}
        {!loading && error && !schedule && <div className="form-message error" role="alert">{error}</div>}
        {schedule && <form className="schedule-form" onSubmit={handleSubmit}>
          <div className="schedule-time-fields">
            <label>Jam masuk<input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} required/></label>
            <span className="schedule-separator">sampai</span>
            <label>Jam pulang<input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} required/></label>
          </div>
          {error && <div className="form-message error" role="alert">{error}</div>}
          {notice && <div className="form-message success" role="status">{notice}</div>}
          <div className="schedule-form-footer"><span>{schedule.updatedAt ? `Terakhir diperbarui ${formatUpdatedAt(schedule.updatedAt)} WIB` : 'Jadwal standar'}</span><button type="submit" className="primary-button" disabled={saving || loading}>{saving ? 'Menyimpan...' : 'Simpan jadwal'}</button></div>
        </form>}
      </section>
      <p className="employee-admin-note">Versi ini menerapkan satu jadwal standar untuk seluruh karyawan. Jadwal per departemen atau shift malam belum didukung.</p>
    </div>
  </main></div>
}
