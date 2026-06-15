'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'

export function PdfDownloadButton({ imo, port }: { imo: string; port?: string }) {
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    setLoading(true)
    try {
      const url = `/api/report/${imo}${port ? `?port=${encodeURIComponent(port)}` : ''}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('PDF oluşturulamadı')
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = `portready-${imo}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(objectUrl)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {loading ? (
        <>
          <Loader2 size={14} className="animate-spin" />
          Rapor hazırlanıyor...
        </>
      ) : (
        <>
          <Download size={14} />
          PDF Raporu İndir
        </>
      )}
    </button>
  )
}
