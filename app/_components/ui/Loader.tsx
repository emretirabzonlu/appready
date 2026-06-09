import { Anchor } from 'lucide-react'

type Props = {
  label?: string
  size?: number
}

export function Loader({ label = 'Yükleniyor', size = 28 }: Props) {
  return (
    <div className="flex flex-col items-center gap-3">
      <Anchor size={size} className="text-navy-700 animate-anchor-swing" />
      {label && <p className="text-xs text-text-muted">{label}</p>}
    </div>
  )
}
