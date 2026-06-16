'use client'
import { createContext, useContext, useTransition, type ReactNode } from 'react'

const Ctx = createContext<{
  isPending: boolean
  startPortTransition: (fn: () => void) => void
}>({
  isPending: false,
  startPortTransition: (fn) => fn(),
})

export function PortLoadingProvider({ children }: { children: ReactNode }) {
  const [isPending, startTransition] = useTransition()
  return (
    <Ctx.Provider value={{ isPending, startPortTransition: startTransition }}>
      {children}
    </Ctx.Provider>
  )
}

export function usePortLoading() {
  return useContext(Ctx)
}
