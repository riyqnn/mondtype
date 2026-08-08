'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Cpu } from 'lucide-react'

const chains = [
  { name: 'Monad', seconds: 0.3, gradient: 'bg-gradient-to-r from-electric to-primary', delay: 0 },
  { name: 'Ethereum', seconds: 12, gradient: 'bg-gradient-to-r from-muted-foreground/30 to-muted-foreground/20', delay: 0.2 },
  { name: 'Solana', seconds: 0.4, gradient: 'bg-gradient-to-r from-purple-400/50 to-purple-400/30', delay: 0.4 },
]

function SpeedBar({ chain }: { chain: (typeof chains)[number] }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const widthPct = (chain.seconds / 12) * 100

  return (
    <motion.div
      ref={ref}
      className="flex items-center gap-3"
      initial={{ opacity: 0, x: -14 }}
      animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -14 }}
      transition={{ duration: 0.4, delay: chain.delay, ease: 'easeOut' }}
    >
      <span className="w-20 text-right font-mono text-xs font-medium text-muted-foreground">
        {chain.name}
      </span>

      <div className="relative flex-1 h-8 rounded-lg bg-secondary overflow-hidden">
        <motion.div
          className={`absolute inset-y-0 left-0 rounded-lg ${chain.gradient}`}
          initial={{ width: 0 }}
          animate={inView ? { width: `${widthPct}%` } : { width: 0 }}
          transition={{ duration: 0.6, delay: chain.delay + 0.12, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      <span className="w-14 font-mono text-sm font-semibold tabular-nums text-foreground">
        ~{chain.seconds}s
      </span>
    </motion.div>
  )
}

export function MonadSpeed() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section ref={ref} className="mx-auto max-w-7xl px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-2xl">
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
        >
          <span className="mb-3 inline-block font-mono text-[11px] font-bold tracking-[0.2em] text-primary/60 uppercase">
            Why Monad
          </span>
          <h2 className="font-mono text-3xl font-bold tracking-tight sm:text-4xl">
            Finality under one second.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Near-zero transaction fees. Race and payout feel instant — no waiting around for confirmations.
          </p>
        </motion.div>

        <div className="rounded-2xl border border-border/60 bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="space-y-5">
            {chains.map((chain) => (
              <SpeedBar key={chain.name} chain={chain} />
            ))}
          </div>
        </div>

        <motion.div
          className="mt-8 flex items-start gap-3 rounded-xl border border-primary/10 bg-primary/[0.03] p-5"
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/8">
            <Cpu className="size-4 text-primary" />
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground pt-0.5">
            Monad processes transactions in parallel with ~0.3s finality — faster than it takes to read this sentence.
          </p>
        </motion.div>
      </div>
    </section>
  )
}