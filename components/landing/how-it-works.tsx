'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Wallet, Users, Keyboard, Trophy } from 'lucide-react'

const steps = [
  {
    icon: Wallet,
    title: 'Connect Wallet',
    detail: 'Tautkan wallet kamu ke Monad Testnet. Cuma butuh beberapa detik.',
  },
  {
    icon: Users,
    title: 'Stake & Join Room',
    detail: 'Buat atau join room dengan stake kecil. 2-4 pemain per race.',
  },
  {
    icon: Keyboard,
    title: 'Race Real-time',
    detail: 'Ngetik secepat mungkin. Progress semua pemain terlihat live.',
  },
  {
    icon: Trophy,
    title: 'Dana Otomatis Cair',
    detail: 'Pemenang dapat seluruh pot. Settlement sub-detik di Monad.',
  },
]

function StepCard({
  step,
  index,
}: {
  step: (typeof steps)[number]
  index: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <motion.div
      ref={ref}
      className="group relative flex flex-col rounded-2xl border border-border/60 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all duration-300 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:-translate-y-0.5"
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
      transition={{ duration: 0.45, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-primary/[0.06] ring-1 ring-primary/8">
        <step.icon className="size-5 text-primary" />
      </div>

      <span className="mb-2 font-mono text-[10px] font-bold tracking-[0.22em] text-primary/50 uppercase">
        {String(index + 1).padStart(2, '0')}
      </span>

      <h3 className="mb-1.5 font-mono text-sm font-semibold tracking-tight text-foreground">
        {step.title}
      </h3>

      <p className="text-sm leading-relaxed text-muted-foreground">
        {step.detail}
      </p>
    </motion.div>
  )
}

export function HowItWorks() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section ref={ref} className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32">
      <motion.div
        className="mb-16"
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.5 }}
      >
        <span className="mb-3 inline-block font-mono text-[11px] font-bold tracking-[0.2em] text-primary/60 uppercase">
          How It Works
        </span>
        <h2 className="font-mono text-3xl font-bold tracking-tight sm:text-4xl">
          Empat langkah, langsung race.
        </h2>
        <p className="mt-3 max-w-md text-muted-foreground">
          Dari connect wallet sampai dana cair — semua dalam hitungan detik, bukan menit.
        </p>
      </motion.div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, i) => (
          <StepCard key={step.title} step={step} index={i} />
        ))}
      </div>
    </section>
  )
}