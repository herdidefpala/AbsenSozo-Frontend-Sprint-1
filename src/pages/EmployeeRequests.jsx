import { FileText } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'

export default function EmployeeRequests() {
  return <div className="app-shell"><Sidebar/><main className="main-area"><Topbar title="Pengajuan" subtitle="Pengajuan karyawan"/>
    <div className="page-content">
      <div className="welcome-row"><div><div className="page-eyebrow">AREA KARYAWAN</div><h1>Pengajuan</h1><p>Menu pengajuan karyawan.</p></div></div>
      <section className="panel employee-request-empty">
        <div className="request-empty-icon"><FileText size={22}/></div>
        <h2>Form pengajuan belum tersedia</h2>
        <p>Menu sudah disiapkan. Jenis pengajuan dan alur persetujuannya perlu ditentukan sebelum pengajuan dapat dikirim.</p>
      </section>
    </div>
  </main></div>
}
