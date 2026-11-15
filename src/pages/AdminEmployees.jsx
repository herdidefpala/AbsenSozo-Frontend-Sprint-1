import { useEffect, useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { getAdminEmployees, updateAdminEmployee } from '../lib/employees'

function formatDate(value) {
  return new Date(value).toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function AdminEmployees() {
  const [employees, setEmployees] = useState([])
  const [search, setSearch] = useState('')
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [form, setForm] = useState({ employeeCode: '', fullName: '', department: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    getAdminEmployees().then((data) => {
      if (active) setEmployees(data)
    }).catch((loadError) => {
      if (active) setError(loadError.message || 'Gagal memuat data karyawan.')
    }).finally(() => {
      if (active) setLoading(false)
    })

    return () => {
      active = false
    }
  }, [])

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('id-ID')
    if (!query) return employees
    return employees.filter((employee) => [
      employee.full_name,
      employee.employee_code,
      employee.department,
    ].some((value) => value.toLocaleLowerCase('id-ID').includes(query)))
  }, [employees, search])

  const openEditor = (employee) => {
    setEditingEmployee(employee)
    setForm({
      employeeCode: employee.employee_code,
      fullName: employee.full_name,
      department: employee.department,
    })
    setSaveError('')
    setNotice('')
  }

  const closeEditor = () => {
    if (saving) return
    setEditingEmployee(null)
    setSaveError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!editingEmployee || saving) return

    const employeeCode = form.employeeCode.trim().toUpperCase()
    const fullName = form.fullName.trim()
    const department = form.department.trim()
    if (!employeeCode || !fullName || !department) {
      setSaveError('Kode, nama, dan departemen wajib diisi.')
      return
    }

    setSaving(true)
    setSaveError('')
    setNotice('')
    try {
      const updatedEmployee = await updateAdminEmployee(editingEmployee.user_id, {
        employeeCode,
        fullName,
        department,
      })
      setEmployees((current) => current.map((employee) => (
        employee.user_id === updatedEmployee.user_id ? updatedEmployee : employee
      )).sort((first, second) => first.full_name.localeCompare(second.full_name, 'id')))
      setEditingEmployee(null)
      setNotice(`Profil ${updatedEmployee.full_name} berhasil diperbarui.`)
    } catch (saveErrorValue) {
      setSaveError(saveErrorValue.message || 'Gagal menyimpan perubahan profil.')
    } finally {
      setSaving(false)
    }
  }

  return <div className="app-shell"><Sidebar admin/><main className="main-area"><Topbar admin title="Karyawan" subtitle="Kelola profil karyawan"/>
    <div className="page-content">
      <div className="welcome-row"><div><div className="page-eyebrow">ADMINISTRATION</div><h1>Data Karyawan</h1><p>Lihat dan perbarui profil karyawan yang sudah terdaftar.</p></div><div className="date-pill">{loading ? 'Memuat...' : `${employees.length} karyawan`}</div></div>
      {notice && <div className="form-message success employee-notice" role="status">{notice}</div>}
      <section className="panel employee-list-panel">
        <div className="employee-toolbar">
          <label className="attendance-search"><Search size={16}/><input aria-label="Cari karyawan" type="search" placeholder="Cari nama, kode, atau departemen" value={search} onChange={(event) => setSearch(event.target.value)}/></label>
        </div>
        {error && <div className="form-message error" role="alert">{error}</div>}
        <div className="attendance-list-summary">{loading ? 'Memuat data...' : `${filteredEmployees.length} dari ${employees.length} karyawan`}</div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>NAMA KARYAWAN</th><th>KODE</th><th>DEPARTEMEN</th><th>TERDAFTAR</th><th>AKSI</th></tr></thead>
            <tbody>
              {filteredEmployees.map((employee) => <tr key={employee.user_id}>
                <td><div className="table-person"><span>{employee.full_name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span><b>{employee.full_name}</b></div></td>
                <td>{employee.employee_code}</td>
                <td>{employee.department}</td>
                <td>{formatDate(employee.created_at)}</td>
                <td><button className="attendance-detail-button" type="button" onClick={() => openEditor(employee)}>Edit profil</button></td>
              </tr>)}
              {!loading && !error && !filteredEmployees.length && <tr><td className="attendance-empty-cell" colSpan="5">Tidak ada karyawan yang cocok.</td></tr>}
              {loading && <tr><td className="attendance-empty-cell" colSpan="5">Memuat data karyawan...</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <p className="employee-admin-note">Pembuatan akun login dilakukan melalui Supabase Authentication. Halaman ini mengelola profil untuk akun karyawan yang sudah terdaftar.</p>
    </div>
  </main>

    {editingEmployee && <div className="attendance-detail-overlay" onMouseDown={(event) => {
      if (event.target === event.currentTarget) closeEditor()
    }}>
      <section className="attendance-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="employee-edit-title">
        <div className="attendance-detail-heading"><div><h2 id="employee-edit-title">Edit profil karyawan</h2><p>Perbarui informasi dasar karyawan.</p></div><button type="button" className="attendance-close-button" aria-label="Tutup form edit" onClick={closeEditor} disabled={saving}><X size={18}/></button></div>
        <form className="employee-edit-form" onSubmit={handleSubmit}>
          <label>Kode karyawan<input className="text-input" value={form.employeeCode} onChange={(event) => setForm((current) => ({ ...current, employeeCode: event.target.value }))} required maxLength={40}/></label>
          <label>Nama lengkap<input className="text-input" value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} required maxLength={120}/></label>
          <label>Departemen<input className="text-input" value={form.department} onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))} required maxLength={100}/></label>
          {saveError && <div className="form-message error" role="alert">{saveError}</div>}
          <div className="employee-form-actions"><button type="button" className="secondary-button" onClick={closeEditor} disabled={saving}>Batal</button><button type="submit" className="primary-button" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan perubahan'}</button></div>
        </form>
      </section>
    </div>}
  </div>
}
