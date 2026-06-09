'use client'
import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

type BaseProps = { children: ReactNode; className?: string }

export function FadeUp({ children, className, delay = 0 }: BaseProps & { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut', delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function StaggerList({ children, className }: BaseProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className }: BaseProps) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 8 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
