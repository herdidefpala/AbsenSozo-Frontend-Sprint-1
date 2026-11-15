import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'

export default function AdminSection({ title, description }) {
  return <div className="app-shell"><Sidebar admin/><main className="main-area"><Topbar admin title={title} subtitle="Workspace administrator"/>
    <div className="page-content">
      <div className="welcome-row"><div><div className="page-eyebrow">ADMINISTRATION</div><h1>{title}</h1><p>{description}</p></div></div>
      <section className="panel admin-placeholder"><h3>Halaman dalam pengembangan</h3><p>Menu ini sudah dapat dibuka. Fitur pengelolaannya akan dibuat pada tahap berikutnya.</p></section>
    </div>
  </main></div>
}
