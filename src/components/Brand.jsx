export default function Brand({ light = false }) {
  return <div className={`brand ${light ? 'brand-light' : ''}`}>
    <img className="brand-logo" src="/sozo-clinic.webp" alt="Logo Sozo Clinic"/>
    <span className="brand-name">Absen<span className="brand-accent">Sozo</span></span>
  </div>
}