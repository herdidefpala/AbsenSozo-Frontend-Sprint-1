import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, ShieldCheck, Fingerprint, Clock3, MapPin } from 'lucide-react'
import Brand from '../components/Brand'
import { getEmployeeProfile } from '../lib/attendance'
import { getSupabaseClient, supabaseConfigured } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [mode, setMode] = useState('login')
  const [show, setShow] = useState(false)
  const [role, setRole] = useState('employee')
  const [fullName, setFullName] = useState('')
  const [employeeCode, setEmployeeCode] = useState('')
  const [department, setDepartment] = useState('Operasional')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()
  const { error: authError } = useAuth()

  const submit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      if (!supabaseConfigured) {
        throw new Error('Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY di .env.local.')
      }

      if (mode === 'signup') {
        if (password !== confirmPassword) {
          throw new Error('Konfirmasi password tidak sama.')
        }

        const { data, error: signupError } = await getSupabaseClient().auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              full_name: fullName.trim(),
              employee_code: employeeCode.trim().toUpperCase(),
              department: department.trim() || 'Operasional',
            },
          },
        })
        if (signupError) throw signupError

        if (data.session) {
          navigate('/employee', { replace: true })
        } else {
          setMode('login')
          setPassword('')
          setConfirmPassword('')
          setSuccess('Pendaftaran berhasil. Buka tautan konfirmasi yang dikirim ke email Anda, lalu masuk dengan akun tersebut.')
        }
        return
      }

      const { data, error: loginError } = await getSupabaseClient().auth.signInWithPassword({ email, password })
      if (loginError) throw loginError

      const profile = await getEmployeeProfile(data.user.id)
      if (!profile) {
        const { error: signOutError } = await getSupabaseClient().auth.signOut()
        if (signOutError) throw new Error(`Profil akun belum terdaftar dan sesi gagal ditutup: ${signOutError.message}`)
        throw new Error('Profil akun belum terdaftar. Hubungi administrator untuk menyiapkan profil karyawan.')
      }
      if (profile.role !== role) {
        const { error: signOutError } = await getSupabaseClient().auth.signOut()
        if (signOutError) throw new Error(`Jenis akun tidak sesuai dan sesi gagal ditutup: ${signOutError.message}`)
        throw new Error(`Akun ini terdaftar sebagai ${profile.role === 'admin' ? 'administrator' : 'karyawan'}. Pilih jenis akun yang sesuai.`)
      }

      navigate(profile.role === 'admin' ? '/admin' : '/employee', { replace: true })
    } catch (loginError) {
      setError(loginError.message || 'Login gagal. Periksa koneksi dan kredensial akun Anda.')
    } finally {
      setSubmitting(false)
    }
  }

  return <main className="login-page">
    <section className="login-visual">
      <div className="visual-top"><Brand light/><span className="secure-label"><ShieldCheck size={14}/> SISTEM ABSENSI DIGITAL</span></div>
      <div className="visual-copy">
        <div className="eyebrow"><span/> WORK SMARTER, BE PRESENT</div>
        <h1>Waktu kerja<br/>tercatat <em>lebih baik.</em></h1>
        <p>Kelola kehadiran tim dengan proses yang sederhana, akurat, dan transparan.</p>
        <div className="feature-stack">
          <div className="feature-row"><span><Fingerprint size={19}/></span><div><b>Verifikasi foto</b><small>Bukti kehadiran melalui kamera</small></div></div>
          <div className="feature-row"><span><MapPin size={19}/></span><div><b>Validasi lokasi</b><small>Catat titik lokasi saat absensi</small></div></div>
          <div className="feature-row"><span><Clock3 size={19}/></span><div><b>Rekap real-time</b><small>Pantau aktivitas kehadiran tim</small></div></div>
        </div>
      </div>
      <div className="visual-footer">© 2026 AbsenSozo. Employee Attendance System.</div>
    </section>
    <section className="login-form-side">
      <div className="mobile-brand"><Brand/></div>
      <div className="login-card">
        <div className="form-heading"><span className="form-kicker">{mode === 'login' ? 'SELAMAT DATANG' : 'PENDAFTARAN KARYAWAN'}</span><h2>{mode === 'login' ? 'Masuk ke akun Anda' : 'Buat akun karyawan'}</h2><p>{mode === 'login' ? 'Gunakan akun AbsenSozo untuk melanjutkan.' : 'Daftar dengan email aktif untuk menerima tautan konfirmasi.'}</p></div>
        <form onSubmit={submit}>
          {mode === 'login' && <>
            <label className="field-label">Masuk sebagai</label>
            <div className="role-switch">
              <button type="button" className={role === 'employee' ? 'selected' : ''} onClick={() => setRole('employee')}>Karyawan</button>
              <button type="button" className={role === 'admin' ? 'selected' : ''} onClick={() => setRole('admin')}>Administrator</button>
            </div>
          </>}
          {mode === 'signup' && <>
            <label className="field-label" htmlFor="full-name">Nama lengkap</label>
            <input id="full-name" className="text-input" type="text" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} required/>
            <label className="field-label" htmlFor="employee-code">ID karyawan</label>
            <input id="employee-code" className="text-input" type="text" autoComplete="off" value={employeeCode} onChange={(event) => setEmployeeCode(event.target.value)} required/>
            <label className="field-label" htmlFor="department">Departemen</label>
            <input id="department" className="text-input" type="text" value={department} onChange={(event) => setDepartment(event.target.value)} required/>
          </>}
          <label className="field-label" htmlFor="email">Email</label>
          <input id="email" className="text-input" type="email" autoComplete="username" placeholder="nama@perusahaan.com" value={email} onChange={(event) => setEmail(event.target.value)} required/>
          <div className="password-label"><label className="field-label" htmlFor="password">Password</label></div>
          <div className="password-wrap"><input id="password" className="text-input" type={show ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="Masukkan password" minLength={mode === 'signup' ? 8 : undefined} value={password} onChange={(event) => setPassword(event.target.value)} required/><button type="button" onClick={() => setShow(!show)} aria-label="Tampilkan password">{show ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div>
          {mode === 'signup' && <>
            <label className="field-label" htmlFor="confirm-password">Konfirmasi password</label>
            <input id="confirm-password" className="text-input" type={show ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required/>
          </>}
          {(error || authError) && <div className="form-message error" role="alert">{error || authError}</div>}
          {success && <div className="form-message success" role="status">{success}</div>}
          <button className="primary-button login-submit" type="submit" disabled={submitting}>{submitting ? 'Memproses...' : mode === 'login' ? 'Masuk ke Dashboard' : 'Daftar sebagai Karyawan'} <ArrowRight size={17}/></button>
        </form>
        <button type="button" className="auth-mode-toggle" onClick={() => {setMode(mode === 'login' ? 'signup' : 'login');setError('');setSuccess('')}}>{mode === 'login' ? 'Belum punya akun? Daftar sebagai karyawan' : 'Sudah punya akun? Masuk'}</button>
        <div className="demo-note"><ShieldCheck size={16}/><span><b>Terhubung dengan Supabase</b><br/>Akun baru mendapat role karyawan. Email perlu dikonfirmasi sebelum login.</span></div>
      </div>
      <div className="form-bottom">Dengan masuk, Anda menyetujui kebijakan penggunaan AbsenSozo.</div>
    </section>
  </main>
}
