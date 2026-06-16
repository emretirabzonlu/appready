'use client'
import type { ReactNode } from 'react'
import { usePortLoading } from './PortLoadingContext'
import { Loader } from '@/app/_components/ui/Loader'

export function PortSectionsWrapper({ children }: { children: ReactNode }) {
  const { isPending } = usePortLoading()
  if (!isPending) return <>{children}</>
  return (
    <div className="relative">
      <div className="pointer-events-none select-none opacity-25">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center">
        <Loader size={22} label="" />
      </div>
    </div>
  )
}
