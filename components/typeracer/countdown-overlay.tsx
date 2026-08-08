'use client'

import { AnimatePresence, motion } from 'framer-motion'

interface CountdownOverlayProps {
  value: number | null
}

export function CountdownOverlay({ value }: CountdownOverlayProps) {
  return (
    <AnimatePresence mode="wait">
      {value !== null && (
        <motion.div
          key={value}
          initial={{ opacity: 0, scale: 0.35 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.35 }}
          transition={{ type: 'spring', stiffness: 320, damping: 18 }}
          className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center bg-foreground/10 backdrop-blur-[2px]"
          aria-live="assertive"
          aria-label={value === 0 ? 'Go!' : `${value}`}
        >
          <span className="font-mono text-[clamp(5rem,18vw,12rem)] font-black leading-none text-primary drop-shadow-[0_5px_0_var(--foreground)]">
            {value === 0 ? 'GO' : value}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
