import { Fingerprint } from 'lucide-react'

export default function Brand({ light = false }) {
  return <div className={`brand ${light ? 'brand-light' : ''}`}>
    <span className="brand-mark"><Fingerprint size={23} strokeWidth={2.2} /></span>
    <span>Absen<span className="brand-accent">Sozo</span></span>
  </div>
}