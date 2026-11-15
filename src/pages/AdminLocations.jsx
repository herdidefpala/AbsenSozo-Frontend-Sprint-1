import { useEffect, useState } from 'react'
import { ExternalLink, MapPin } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { getOfficeLocation, updateOfficeLocation } from '../lib/officeLocation'

function formatUpdatedAt(value) {
  return new Date(value).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default function AdminLocations() {
  const [office, setOffice] = useState(null)
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [radiusM, setRadiusM] = useState('100')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    getOfficeLocation().then((data) => {
      if (!active) return
      setOffice(data)
      setLatitude(data.latitude)
      setLongitude(data.longitude)
      setRadiusM(String(data.radiusM))
    }).catch((loadError) => {
      if (active) setError(loadError.message || 'Gagal memuat lokasi kantor.')
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

    const latitudeValue = Number(latitude)
    const longitudeValue = Number(longitude)
    const radiusValue = Number(radiusM)
    if (!latitude.trim() || !longitude.trim()
      || !Number.isFinite(latitudeValue) || latitudeValue < -90 || latitudeValue > 90
      || !Number.isFinite(longitudeValue) || longitudeValue < -180 || longitudeValue > 180) {
      setError('Masukkan koordinat latitude dan longitude yang valid.')
      setNotice('')
      return
    }
    if (!Number.isInteger(radiusValue) || radiusValue < 1 || radiusValue > 10000) {
      setError('Radius harus berupa bilangan bulat antara 1 dan 10.000 meter.')
      setNotice('')
      return
    }

    setSaving(true)
    setError('')
    setNotice('')
    try {
      const updatedOffice = await updateOfficeLocation({
        latitude: latitudeValue,
        longitude: longitudeValue,
        radiusM: radiusValue,
      })
      setOffice(updatedOffice)
      setLatitude(updatedOffice.latitude)
      setLongitude(updatedOffice.longitude)
      setRadiusM(String(updatedOffice.radiusM))
      setNotice('Lokasi kantor berhasil disimpan. Check-in berikutnya akan divalidasi terhadap titik ini.')
    } catch (saveError) {
      setError(saveError.message || 'Gagal menyimpan lokasi kantor.')
    } finally {
      setSaving(false)
    }
  }

  const isConfigured = Boolean(office && office.latitude && office.longitude)

  return <div className="app-shell"><Sidebar admin/><main className="main-area"><Topbar admin title="Lokasi Kantor" subtitle="Atur titik dan radius absensi"/>
    <div className="page-content">
      <div className="welcome-row"><div><div className="page-eyebrow">ADMINISTRATION</div><h1>Lokasi Kantor</h1><p>Tentukan titik kantor dan jarak maksimum check-in.</p></div></div>
      <section className="panel location-panel">
        <div className="panel-heading"><div><h3>Geofence kantor</h3><p>Jarak dihitung di database berdasarkan koordinat check-in dan titik kantor ini.</p></div><div className="location-icon"><MapPin size={18}/></div></div>
        {loading && <div className="attendance-photo-message">Memuat lokasi kantor...</div>}
        {!loading && error && !office && <div className="form-message error" role="alert">{error}</div>}
        {office && <form className="location-form" onSubmit={handleSubmit}>
          <div className="location-coordinate-fields">
            <label>Latitude<input type="number" step="any" min="-90" max="90" value={latitude} onChange={(event) => setLatitude(event.target.value)} placeholder="-6.200000" required/></label>
            <label>Longitude<input type="number" step="any" min="-180" max="180" value={longitude} onChange={(event) => setLongitude(event.target.value)} placeholder="106.816666" required/></label>
            <label>Radius (meter)<input type="number" min="1" max="10000" step="1" value={radiusM} onChange={(event) => setRadiusM(event.target.value)} required/></label>
          </div>
          <div className={`location-state ${isConfigured ? 'configured' : 'unconfigured'}`} role={isConfigured ? 'status' : 'alert'}>
            {isConfigured
              ? `Lokasi aktif. Check-in di luar radius ${office.radiusM} m akan ditolak.`
              : 'Lokasi belum diatur. Check-in karyawan ditolak sampai admin menyimpan titik kantor.'}
          </div>
          {error && <div className="form-message error" role="alert">{error}</div>}
          {notice && <div className="form-message success" role="status">{notice}</div>}
          <div className="location-form-footer">
            <div className="location-last-updated">{office.updatedAt ? `Terakhir diperbarui ${formatUpdatedAt(office.updatedAt)} WIB` : 'Belum pernah diperbarui'}</div>
            <div className="location-actions">
              {isConfigured && <a className="secondary-button" href={`https://www.google.com/maps?q=${office.latitude},${office.longitude}`} target="_blank" rel="noreferrer">Lihat di peta <ExternalLink size={14}/></a>}
              <button type="submit" className="primary-button" disabled={saving || loading}>{saving ? 'Menyimpan...' : 'Simpan lokasi'}</button>
            </div>
          </div>
        </form>}
      </section>
      <p className="employee-admin-note">Ambil koordinat kantor dari pin Google Maps. Geofence membandingkan koordinat yang dikirim browser; ini belum mendeteksi pemalsuan GPS.</p>
    </div>
  </main></div>
}
