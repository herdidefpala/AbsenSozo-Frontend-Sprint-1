import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock3, CalendarDays, MapPin, Camera, ArrowUpRight, CheckCircle2, Coffee, ChevronRight, LocateFixed, AlertCircle, Check, VideoOff } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { useAuth } from '../context/AuthContext'
import { getJakartaDate, getTodayAttendance, submitCheckIn, submitCheckOut } from '../lib/attendance'
import { getTodayEmployeeRequest } from '../lib/requests'
import { getWorkSchedule } from '../lib/workSchedule'

function getTimeBasedGreeting() {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 11) return 'Selamat pagi'
  if (hour >= 11 && hour < 15) return 'Selamat siang'
  if (hour >= 15 && hour < 18) return 'Selamat sore'
  return 'Selamat malam'
}

export default function Dashboard({ employeeProfile: profile }) {
  const [checkedIn, setCheckedIn] = useState(false)
  const [attendance, setAttendance] = useState(null)
  const [photoData, setPhotoData] = useState('')
  const [location, setLocation] = useState(null)
  const [cameraEnabled, setCameraEnabled] = useState(false)
  const [locationStatus, setLocationStatus] = useState('Lokasi belum aktif')
  const [cameraStatus, setCameraStatus] = useState('Kamera belum aktif')
  const [error, setError] = useState('')
  const [schedule, setSchedule] = useState(null)
  const [greeting] = useState(getTimeBasedGreeting)
  const [typedGreeting, setTypedGreeting] = useState('')
  const [loadingAttendance, setLoadingAttendance] = useState(true)
  const [todayRequest, setTodayRequest] = useState(null)
  const [loadingTodayRequest, setLoadingTodayRequest] = useState(true)
  const [todayRequestError, setTodayRequestError] = useState('')
  const [savingAttendance, setSavingAttendance] = useState(false)
  const [savingCheckOut, setSavingCheckOut] = useState(false)
  const [checkOutError, setCheckOutError] = useState('')
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const { user } = useAuth()

  const now = new Date()
  const date = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const fullGreeting = `${greeting}, ${profile?.full_name || 'Karyawan'}`

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTypedGreeting(fullGreeting)
      return
    }

    let characterIndex = 0
    const timer = window.setInterval(() => {
      characterIndex += 1
      setTypedGreeting(fullGreeting.slice(0, characterIndex))
      if (characterIndex >= fullGreeting.length) window.clearInterval(timer)
    }, 55)

    return () => window.clearInterval(timer)
  }, [fullGreeting])

  useEffect(() => {
    let active = true
    Promise.all([getTodayAttendance(user.id), getWorkSchedule()]).then(([existingAttendance, workSchedule]) => {
      if (!active) return
      setAttendance(existingAttendance)
      setSchedule(workSchedule)
      setCheckedIn(Boolean(existingAttendance))
      if (existingAttendance) {
        setLocation({
          lat: existingAttendance.latitude,
          lng: existingAttendance.longitude,
          accuracy: existingAttendance.accuracy_m,
        })
        setLocationStatus(`${existingAttendance.latitude.toFixed(5)}, ${existingAttendance.longitude.toFixed(5)} (${existingAttendance.accuracy_m}m)`)
      }
    }).catch((loadError) => {
      if (active) setError(loadError.message || 'Gagal memuat data absensi hari ini.')
    }).finally(() => {
      if (active) setLoadingAttendance(false)
    })

    return () => {
      active = false
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [user.id])

  useEffect(() => {
    let active = true
    setLoadingTodayRequest(true)
    setTodayRequestError('')
    getTodayEmployeeRequest(user.id, getJakartaDate()).then((request) => {
      if (active) setTodayRequest(request)
    }).catch((loadError) => {
      if (active) setTodayRequestError(loadError.message || 'Gagal memuat status pengajuan hari ini.')
    }).finally(() => {
      if (active) setLoadingTodayRequest(false)
    })

    return () => {
      active = false
    }
  }, [user.id])

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setCameraEnabled(false)
    setCameraStatus('Kamera dimatikan')
  }

  const startCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraStatus('Browser tidak mendukung kamera')
      setError('Browser Anda tidak mendukung akses kamera.')
      return
    }

    try {
      setPhotoData('')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      setCameraEnabled(true)
      setCameraStatus('Kamera siap digunakan')
      setError('')
    } catch {
      setCameraStatus('Izin kamera ditolak')
      setError('Izinkan akses kamera agar absensi dapat mengambil foto.')
    }
  }

  const capturePhoto = () => {
    if (!videoRef.current || !cameraEnabled) {
      setError('Nyalakan kamera terlebih dahulu sebelum mengambil foto.')
      return
    }

    const video = videoRef.current
    if (!video.videoWidth || !video.videoHeight) {
      setError('Kamera sedang dimuat. Tunggu sebentar lalu ambil foto kembali.')
      return
    }

    const canvas = document.createElement('canvas')
    const scale = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight))
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    const context = canvas.getContext('2d')

    if (!context) {
      setError('Gagal menyiapkan foto. Silakan coba lagi.')
      return
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    setPhotoData(canvas.toDataURL('image/jpeg', 0.82))
    stopCamera()
    setError('')
  }

  const getLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Browser tidak mendukung GPS')
      setError('Browser Anda tidak mendukung lokasi GPS.')
      return
    }

    setLocationStatus('Mencari lokasi...')
    setLocation(null)
    setError('')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: Math.max(1, Math.round(position.coords.accuracy)),
        }

        setLocation(nextLocation)
        setLocationStatus(`${nextLocation.lat.toFixed(5)}, ${nextLocation.lng.toFixed(5)} (${nextLocation.accuracy}m)`)
        setError('')
      },
      (locationError) => {
        setLocationStatus('Akses lokasi ditolak')
        setError(locationError.message || 'Izinkan akses lokasi agar absensi bisa diverifikasi.')
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  const handleCheckIn = async () => {
    if (loadingAttendance || savingAttendance) return
    if (!photoData) {
      setError('Ambil foto selfie terlebih dahulu.')
      return
    }

    if (!location) {
      setError('Aktifkan GPS untuk validasi lokasi.')
      return
    }

    setError('')
    setSavingAttendance(true)
    try {
      const savedAttendance = await submitCheckIn({ user, photoData, location })
      setAttendance(savedAttendance)
      setCheckedIn(true)
      setCameraStatus('Foto berhasil tersimpan')
    } catch (saveError) {
      setError(saveError.message || 'Gagal menyimpan check-in. Silakan coba lagi.')
    } finally {
      setSavingAttendance(false)
    }
  }

  const handleCheckOut = async () => {
    if (!attendance || attendance.check_out_at || loadingAttendance || savingCheckOut) return

    setCheckOutError('')
    setSavingCheckOut(true)
    try {
      const savedCheckOut = await submitCheckOut(user.id)
      setAttendance((current) => current ? { ...current, check_out_at: savedCheckOut.check_out_at } : current)
    } catch (checkOutSaveError) {
      setCheckOutError(checkOutSaveError.message || 'Gagal menyimpan check-out. Silakan coba lagi.')
    } finally {
      setSavingCheckOut(false)
    }
  }

  const checkedOut = Boolean(attendance?.check_out_at)
  const attendanceStatus = attendance
    ? { label: 'Masuk', tone: 'present', note: 'Check-in tercatat hari ini.' }
    : loadingAttendance || loadingTodayRequest
      ? { label: 'Memeriksa...', tone: 'loading', note: 'Memuat status kehadiran hari ini.' }
      : todayRequestError
        ? { label: 'Tidak tersedia', tone: 'unavailable', note: todayRequestError }
        : todayRequest
          ? {
              label: todayRequest.request_type === 'izin' ? 'Izin' : 'Sakit',
              tone: todayRequest.request_type,
              note: todayRequest.status === 'pending' ? 'Masih menunggu approval atasan.' : 'Pengajuan disetujui.',
            }
          : { label: 'Belum masuk', tone: 'absent', note: 'Belum ada absensi hari ini.' }

  return <div className="app-shell"><Sidebar/><main className="main-area"><Topbar title="Dashboard" subtitle="Ringkasan aktivitas kehadiran Anda"/>
    <div className="page-content">
      <div className="welcome-row"><div><div className="page-eyebrow">AREA KARYAWAN</div><h1 aria-label={fullGreeting}><span className={`greeting-typing ${typedGreeting.length < fullGreeting.length ? 'typing' : ''}`} aria-hidden="true">{typedGreeting}</span> <span aria-hidden="true">✦</span></h1><p>Semoga harimu produktif. Jangan lupa catat kehadiranmu hari ini.</p></div><div className="date-pill"><CalendarDays size={16}/>{date}</div></div>
      <section className="attendance-hero">
        <div className="hero-content"><span className="hero-label"><i/> ABSENSI HARI INI</span><h2>{checkedIn ? 'Kehadiran berhasil dicatat.' : 'Siap memulai hari?'}</h2><p>{checkedIn ? 'Waktu check-in Anda sudah tercatat pada perangkat ini.' : 'Pastikan kamera dan lokasi aktif sebelum melakukan check-in.'}</p>
          <div className="hero-actions">
            <button className="white-button" onClick={checkedIn ? undefined : startCamera}><Camera size={17}/> {checkedIn ? 'Sudah Check In' : cameraEnabled ? 'Kamera aktif' : 'Mulai Check In'}</button>
            <span><MapPin size={15}/> {location ? 'Lokasi terdeteksi' : 'Lokasi akan diverifikasi'}</span>
          </div>
        </div>
        <div className="hero-time"><span>WAKTU SEKARANG</span><strong>{now.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}</strong><small>WIB · Waktu perangkat</small></div>
      </section>

      <div className="section-heading"><div><h3>Ringkasan hari ini</h3><p>Pantau status kehadiran Anda.</p></div><Link className="text-action" to="/employee/attendance">Lihat riwayat <ArrowUpRight size={15}/></Link></div>
      <div className="stats-grid attendance-summary-grid">
        <div className="stat-card"><div className="stat-icon blue"><Clock3 size={19}/></div><span>Jam masuk</span><b>{attendance ? new Date(attendance.check_in_at).toLocaleTimeString('id-ID',{timeZone:'Asia/Jakarta',hour:'2-digit',minute:'2-digit'}) : '--:--'}</b><small>{checkedIn ? 'Tercatat hari ini' : loadingAttendance ? 'Memuat status absensi...' : 'Belum melakukan check-in'}</small></div>
        <div className="stat-card checkout-stat"><div className="stat-icon green"><CheckCircle2 size={19}/></div><span>Jam pulang</span><b>{attendance?.check_out_at ? new Date(attendance.check_out_at).toLocaleTimeString('id-ID',{timeZone:'Asia/Jakarta',hour:'2-digit',minute:'2-digit'}) : '--:--'}</b><small>{checkedOut ? 'Check-out tercatat hari ini' : attendance ? 'Anda sudah check-in' : 'Belum melakukan check-in'}</small><button type="button" className="checkout-button" onClick={handleCheckOut} disabled={!attendance || checkedOut || loadingAttendance || savingCheckOut}>{checkedOut ? 'Sudah Check Out' : savingCheckOut ? 'Menyimpan...' : 'Mulai Check Out'}</button>{checkOutError && <small className="checkout-error" role="alert">{checkOutError}</small>}</div>
        <div className="stat-card"><div className={`stat-icon ${attendanceStatus.tone === 'present' ? 'green' : attendanceStatus.tone === 'izin' || attendanceStatus.tone === 'sakit' || attendanceStatus.tone === 'loading' ? 'amber' : 'red'}`}><CheckCircle2 size={19}/></div><span>Status kehadiran</span><b className={`attendance-status-value ${attendanceStatus.tone}`}>{attendanceStatus.label}</b><small role={todayRequestError && !attendance ? 'alert' : undefined}>{attendanceStatus.note}</small></div>
        <div className="stat-card"><div className="stat-icon amber"><Coffee size={19}/></div><span>Total jam kerja</span><b>0j 00m</b><small>Akumulasi hari ini</small></div>
      </div>

      <div className="lower-grid">
        <section className="panel attendance-panel">
          <div className="panel-heading"><div><h3>Check-in dengan kamera & lokasi</h3><p>Verifikasi identitas dan posisi Anda saat masuk kerja.</p></div></div>

          <div className="attendance-console">
            <div className="camera-stage">
              {photoData ? <img src={photoData} alt="Foto absensi" /> : <video ref={videoRef} autoPlay muted playsInline />}
              {!photoData && !cameraEnabled && <div className="camera-placeholder"><Camera size={28} /><span>Kamera belum aktif</span></div>}
            </div>

            <div className="attendance-actions">
              <button type="button" className="primary-button" onClick={cameraEnabled ? capturePhoto : startCamera}>
                {cameraEnabled ? 'Ambil foto' : 'Aktifkan kamera'}
              </button>
              {cameraEnabled && <button type="button" className="secondary-button" onClick={stopCamera}><VideoOff size={16}/> Matikan kamera</button>}
              <button type="button" className="secondary-button" onClick={getLocation}><LocateFixed size={16}/> Cek lokasi</button>
            </div>

            <div className="attendance-status-grid">
              <div className={`status-item ${location ? 'success' : ''}`}>
                <MapPin size={16}/>
                <div><span>Lokasi</span><strong>{locationStatus}</strong></div>
              </div>
              <div className={`status-item ${cameraEnabled ? 'success' : ''}`}>
                <Camera size={16}/>
                <div><span>Kamera</span><strong>{cameraStatus}</strong></div>
              </div>
            </div>

            {error && <div className="form-message error"><AlertCircle size={16}/> {error}</div>}
            {checkedIn && !error && <div className="form-message success"><Check size={16}/> Check-in berhasil disimpan.</div>}

            <button type="button" className="primary-button full-width" onClick={handleCheckIn} disabled={checkedIn || loadingAttendance || savingAttendance}>
            {checkedIn ? 'Sudah check-in' : savingAttendance ? 'Menyimpan absensi...' : loadingAttendance ? 'Memeriksa status...' : 'Konfirmasi check-in'}
            </button>
          </div>
        </section>

        <section className="panel profile-panel"><div className="panel-heading"><div><h3>Informasi profil</h3><p>Data akun karyawan</p></div></div>
          <div className="mini-profile"><div className="large-avatar">{(profile?.full_name || 'Karyawan').slice(0, 2).toUpperCase()}</div><div><b>{profile?.full_name || 'Karyawan'}</b><span>{profile?.employee_code || 'Belum ada kode'} · {profile?.department || 'Belum ada departemen'}</span></div></div>
          <div className="profile-line"><span>Departemen</span><b>{profile?.department || 'Belum diatur'}</b></div>
          <div className="profile-line"><span>Jadwal kerja</span><b>{schedule ? `${schedule.startTime} – ${schedule.endTime}` : '--:--'}</b></div>
          <div className="profile-line"><span>Status akun</span><b className="status-active">Aktif</b></div>
          <div className="profile-line"><span>Lokasi saat ini</span><b>{location ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : 'Belum tersimpan'}</b></div>
        </section>
      </div>
      <div className="preview-footnote">Foto dan data lokasi disimpan di Supabase. Check-in divalidasi terhadap radius kantor.</div>
    </div>
  </main></div>
}