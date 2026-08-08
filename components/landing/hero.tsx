'use client'

import { useEffect, useState, useRef } from 'react'
import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import {
  motion,
  useReducedMotion,
  useMotionValue,
  useSpring,
  useInView,
} from 'framer-motion'
import { AnimatedGridPattern } from '@/components/ui/animated-grid-pattern'
import { cn } from '@/lib/utils'

const HEADLINE = 'Type fast.'
const SUBHEADLINE = 'Get paid faster.'
const SUBTEXT =
  'Create a room, put up a stake, and win typing races. Payouts settle before you can even blink.'

function TypingText({
  text,
  delay = 0,
  className,
  onComplete,
}: {
  text: string
  delay?: number
  className?: string
  onComplete?: () => void
}) {
  const [displayed, setDisplayed] = useState(0)
  const [showCursor, setShowCursor] = useState(false)
  const prefersReduced = useReducedMotion()
  const completed = useRef(false)

  useEffect(() => {
    if (prefersReduced) {
      setDisplayed(text.length)
      return
    }
    const start = setTimeout(() => {
      let i = 0
      const interval = setInterval(() => {
        i++
        setDisplayed(i)
        if (i >= text.length) {
          clearInterval(interval)
          setTimeout(() => {
            setShowCursor(true)
            if (!completed.current) {
              completed.current = true
              onComplete?.()
            }
          }, 150)
        }
      }, 75)
      return () => clearInterval(interval)
    }, delay)
    return () => clearTimeout(start)
  }, [text, delay, prefersReduced])

  return (
    <span className={className}>
      {text.slice(0, displayed)}
      {showCursor && (
        <span className="inline-block w-[3px] h-[0.78em] bg-primary ml-1 align-middle animate-caret rounded-[1px]" />
      )}
    </span>
  )
}

function AnimatedCounter({
  from,
  to,
  suffix,
  decimals = 1,
}: {
  from: number
  to: number
  suffix: string
  decimals?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })
  const motionVal = useMotionValue(from)
  const spring = useSpring(motionVal, { stiffness: 55, damping: 16 })
  const [display, setDisplay] = useState(from.toFixed(decimals))

  useEffect(() => {
    motionVal.set(inView ? to : from)
  }, [inView, to, from, motionVal])

  useEffect(() => {
    const unsub = spring.on('change', (latest) => {
      setDisplay(latest.toFixed(decimals))
    })
    return unsub
  }, [spring, decimals])

  return (
    <span ref={ref} className="tabular-nums">
      {display}
      {suffix}
    </span>
  )
}

export function Hero() {
  const { isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()
  const [subReady, setSubReady] = useState(false)

  const handleCTA = () => {
    if (!isConnected && openConnectModal) {
      openConnectModal()
    } else {
      alert('Create Room — connect to smart contract')
    }
  }

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      <AnimatedGridPattern
        numSquares={40}
        maxOpacity={0.06}
        duration={2.5}
        repeatDelay={0.8}
        className={cn(
          '[mask-image:radial-gradient(700px_circle_at_50%_50%,white,transparent)]',
          'inset-x-0 inset-y-[-20%] h-[140%] skew-y-0',
          'fill-primary/30 stroke-primary/15'
        )}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background pointer-events-none" />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pt-24 pb-28 sm:pt-28 sm:pb-32">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7 }}
        >
          <h1 className="font-mono font-bold leading-[1.06] tracking-tight text-foreground text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem]">
            <TypingText text={HEADLINE} />
            <br />
            <span className="text-primary">
              <TypingText
                text={SUBHEADLINE}
                delay={1100}
                onComplete={() => setSubReady(true)}
              />
            </span>
          </h1>

          <motion.p
            className="mt-6 max-w-[480px] text-lg leading-relaxed text-muted-foreground sm:text-xl"
            initial={{ opacity: 0, y: 10 }}
            animate={subReady ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            {SUBTEXT}
          </motion.p>
        </motion.div>

        <motion.div
          className="mt-16 flex flex-wrap items-center gap-6 sm:gap-10"
          initial={{ opacity: 0, y: 20 }}
          animate={subReady ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.12, ease: 'easeOut' }}
        >
          <div className="flex items-center gap-5 rounded-2xl border border-border/60 bg-white/70 backdrop-blur-xl px-6 py-4 shadow-[0_2px_12px_rgba(0,0,0,0.03),0_6px_24px_rgba(0,0,0,0.03)]">
            <div className="flex flex-col">
              <span className="font-mono text-4xl font-bold text-foreground sm:text-5xl tabular-nums">
                <AnimatedCounter from={0} to={88} suffix="" decimals={0} />
              </span>
              <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground mt-1.5 uppercase">
                WPM keystroke
              </span>
            </div>
          </div>

          <div className="hidden sm:block w-px h-14 bg-border/50" />

          <div className="flex items-center gap-5 rounded-2xl border border-border/60 bg-white/70 backdrop-blur-xl px-6 py-4 shadow-[0_2px_12px_rgba(0,0,0,0.03),0_6px_24px_rgba(0,0,0,0.03)]">
            <div className="flex flex-col">
              <span className="font-mono text-4xl font-bold text-electric sm:text-5xl tabular-nums">
                <AnimatedCounter from={12} to={0.6} suffix="s" decimals={1} />
              </span>
              <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground mt-1.5 uppercase">
                Monad finality
              </span>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="mt-12"
          initial={{ opacity: 0, y: 16 }}
          animate={subReady ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.5, delay: 0.28, ease: 'easeOut' }}
        >
          <motion.button
            onClick={handleCTA}
            className="group relative inline-flex items-center gap-2.5 rounded-2xl bg-primary px-8 py-4 text-base font-semibold text-white shadow-[0_2px_12px_rgba(45,59,255,0.2),0_6px_20px_rgba(45,59,255,0.12)] transition-all duration-300 hover:shadow-[0_4px_18px_rgba(45,59,255,0.3),0_10px_28px_rgba(45,59,255,0.18)] hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.985 }}
          >
            <span className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-r from-primary via-primary to-primary/70 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-25" />
            {!isConnected ? 'Connect to Play' : 'Create Room'}
          </motion.button>
        </motion.div>
      </div>
    </section>
  )
}