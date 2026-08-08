'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { PlayerStats } from './types'

interface UseRaceEngineArgs {
  passage: string
  active: boolean
  startedAt: number | null
  onProgress: (stats: PlayerStats) => void
  onFinish: () => void
}

interface UseRaceEngineResult {
  /** Number of characters correctly locked in. */
  typedCount: number
  /** True when the buffer diverges from the passage (blocking char). */
  hasError: boolean
  stats: PlayerStats
  handleInput: (value: string) => void
  reset: () => void
}

/**
 * Owns the typing mechanic: enforces the "no skipping past an error" rule,
 * tracks correct/total keystrokes for accuracy, and emits rolling WPM.
 *
 * The consumer wires this to a hidden controlled input. All timers are cleaned
 * up on unmount / reset so repeated races never leak intervals.
 */
export function useRaceEngine({
  passage,
  active,
  startedAt,
  onProgress,
  onFinish,
}: UseRaceEngineArgs): UseRaceEngineResult {
  const [typedCount, setTypedCount] = useState(0)
  const [hasError, setHasError] = useState(false)
  const [stats, setStats] = useState<PlayerStats>({ wpm: 0, accuracy: 100, progress: 0 })

  // Keystroke accounting kept in refs so it survives rerenders without
  // triggering extra effects.
  const correctKeystrokesRef = useRef(0)
  const totalKeystrokesRef = useRef(0)
  const typedCountRef = useRef(0)
  const finishedRef = useRef(false)
  const rafRef = useRef<number | null>(null)
  const onProgressRef = useRef(onProgress)
  const onFinishRef = useRef(onFinish)

  useEffect(() => {
    onProgressRef.current = onProgress
    onFinishRef.current = onFinish
  }, [onProgress, onFinish])

  const reset = useCallback(() => {
    setTypedCount(0)
    setHasError(false)
    setStats({ wpm: 0, accuracy: 100, progress: 0 })
    correctKeystrokesRef.current = 0
    totalKeystrokesRef.current = 0
    typedCountRef.current = 0
    finishedRef.current = false
  }, [])

  // Reset whenever a fresh race begins.
  useEffect(() => {
    reset()
  }, [passage, reset])

  const computeStats = useCallback((): PlayerStats => {
    const total = passage.length
    const correct = typedCountRef.current
    const progress = total === 0 ? 0 : correct / total
    const minutes =
      startedAt != null ? Math.max((Date.now() - startedAt) / 60000, 1 / 60000) : 0
    const wpm = minutes > 0 ? correct / 5 / minutes : 0
    const totalKeys = totalKeystrokesRef.current
    const accuracy =
      totalKeys === 0 ? 100 : (correctKeystrokesRef.current / totalKeys) * 100
    return {
      wpm: Math.max(0, wpm),
      accuracy: Math.min(100, Math.max(0, accuracy)),
      progress: Math.min(1, progress),
    }
  }, [passage.length, startedAt])

  const handleInput = useCallback(
    (value: string) => {
      if (!active || finishedRef.current) return

      const expectedNext = passage[typedCountRef.current]
      // The controlled input only ever holds 0 or 1 pending characters beyond
      // what is already locked in; we treat the last char as the attempt.
      const attempt = value.slice(-1)

      // Backspace / clearing: the input shrank, clear any error state.
      if (value.length === 0) {
        setHasError(false)
        return
      }

      totalKeystrokesRef.current += 1

      if (attempt === expectedNext) {
        correctKeystrokesRef.current += 1
        const next = typedCountRef.current + 1
        typedCountRef.current = next
        setTypedCount(next)
        setHasError(false)

        if (next >= passage.length) {
          finishedRef.current = true
          const finalStats = { ...computeStats(), progress: 1 }
          setStats(finalStats)
          onProgressRef.current(finalStats)
          onFinishRef.current()
        }
      } else {
        // Wrong character: block progression, flag the error.
        setHasError(true)
      }
    },
    [active, passage, computeStats],
  )

  // Rolling stats loop (~every 250ms) while racing.
  useEffect(() => {
    if (!active || startedAt == null) return
    let mounted = true
    let last = 0

    const loop = (t: number) => {
      if (!mounted) return
      if (t - last >= 250) {
        last = t
        if (!finishedRef.current) {
          const next = computeStats()
          setStats(next)
          onProgressRef.current(next)
        }
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      mounted = false
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [active, startedAt, computeStats])

  return { typedCount, hasError, stats, handleInput, reset }
}
