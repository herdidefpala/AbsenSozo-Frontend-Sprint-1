import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { useAuth } from '../context/AuthContext'
import { updateAccountPassword } from '../lib/account'

export default function AdminSettings() {
  const { user } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (saving) return
    if (password.length < 8) {
      setError('Kata sandi baru minimal 8 karakter.')
      setNotice('')
      return
    }
    if (password !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak sama.')
      setNotice('')
      return
    }

    setSaving(true)
    setError('')
    setNotice('')
    try {
      await updateAccountPassword(password)
      setPassword('')
      setConfirmPassword('')
      setNotice('Kata sandi berhasil diperbarui.')
    } catch (updateError) {
      setError(updateError.message || 'Gagal memperbarui kata sandi.')
    } finally {
      setSaving(false)
    }
  }

  return <div className="app-shell"><Sidebar admin/><main className="main-area"><Topbar admin title="Pengaturan" subtitle="Kelola keamanan akun admin"/>
    <div className="page-content">
      <div className="welcome-row"><div><div className="page-eyebrow">ADMINISTRATION</div><h1>Pengaturan</h1><p>Kelola keamanan akun administrator yang sedang digunakan.</p></div></div>
      <section className="panel settings-panel">
        <div className="panel-heading"><div><h3>Keamanan akun</h3><p>Perbarui kata sandi untuk akun administrator ini.</p></div></div>
        <div className="settings-account"><span>Email akun</span><b>{user?.email || 'Administrator'}</b></div>
        <form className="settings-password-form" onSubmit={handleSubmit}>
          <label>Kata sandi baru<input className="text-input" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required/></label>
          <label>Konfirmasi kata sandi baru<input className="text-input" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} required/></label>
          {error && <div className="form-message error" role="alert">{error}</div>}
          {notice && <div className="form-message success" role="status">{notice}</div>}
          <div className="settings-form-footer"><span>Gunakan minimal 8 karakter.</span><button type="submit" className="primary-button" disabled={saving}>{saving ? 'Menyimpan...' : 'Perbarui kata sandi'}</button></div>
        </form>
      </section>
    </div>
  </main></div>
}
