'use client'

import { useEffect, useRef } from 'react'
import type { Player, PlayerStats } from './types'
import { getBotTargetWpm } from './bot'

interface UsePlayerSimulatorArgs {
  players: Player[]
  active: boolean
  startedAt: number | null
  passageLength: number
  onProgress: (playerId: string, stats: PlayerStats) => void
  onFinish: (playerId: string) => void
}

interface BotRuntime {
  target: number
  chars: number
  pausedUntil: number
  finished: boolean
  jitter: number
}

/**
 * Drives the simulated opponents with human-feeling pacing: each bot has a
 * target WPM with per-tick jitter and occasional micro-pauses so the cars do
 * not slide in a perfectly straight line.
 *
 * This is the injectable data source the spec calls for. To go live, delete
 * this hook and dispatch BOT_PROGRESS / PLAYER_FINISH from socket events with
 * the identical payload shapes.
 */
export function usePlayerSimulator({
  players,
  active,
  startedAt,
  passageLength,
  onProgress,
  onFinish,
}: UsePlayerSimulatorArgs): void {
  const runtimeRef = useRef<Map<string, BotRuntime>>(new Map())
  const rafRef = useRef<number | null>(null)
  const lastRef = useRef<number>(0)
  const onProgressRef = useRef(onProgress)
  const onFinishRef = useRef(onFinish)

  useEffect(() => {
    onProgressRef.current = onProgress
    onFinishRef.current = onFinish
  }, [onProgress, onFinish])

  // (Re)seed runtime whenever a race starts.
  useEffect(() => {
    if (!active || startedAt == null) return
    const map = new Map<string, BotRuntime>()
    for (const p of players) {
      if (!p.isBot) continue
      map.set(p.id, {
        target: getBotTargetWpm(p.id),
        chars: 0,
        pausedUntil: 0,
        finished: false,
        jitter: 0,
      })
    }
    runtimeRef.current = map
    lastRef.current = 0

    const step = (frameTime: number) => {
      const now = Date.now()
      if (lastRef.current === 0) lastRef.current = frameTime
      const dt = (frameTime - lastRef.current) / 1000
      lastRef.current = frameTime

      for (const [id, rt] of runtimeRef.current) {
        if (rt.finished) continue

        // Occasionally take a short micro-pause to look human.
        if (now < rt.pausedUntil) continue
        if (Math.random() < 0.006) {
          rt.pausedUntil = now + 80 + Math.random() * 320
          continue
        }

        // Drift the effective WPM around the target each tick.
        rt.jitter += (Math.random() - 0.5) * 6
        rt.jitter = Math.max(-14, Math.min(14, rt.jitter))
        const effectiveWpm = Math.max(12, rt.target + rt.jitter)
        const charsPerSecond = (effectiveWpm * 5) / 60

        rt.chars = Math.min(passageLength, rt.chars + charsPerSecond * dt)
        const progress = passageLength === 0 ? 0 : rt.chars / passageLength
        const minutes = Math.max((now - startedAt) / 60000, 1 / 60000)
        const wpm = rt.chars / 5 / minutes
        // Bots type near-perfectly with tiny variance.
        const accuracy = 95 + Math.random() * 4

        if (progress >= 1) {
          rt.finished = true
          onProgressRef.current(id, { wpm, accuracy, progress: 1 })
          onFinishRef.current(id)
        } else {
          onProgressRef.current(id, { wpm, accuracy, progress })
        }
      }

      rafRef.current = requestAnimationFrame(step)
    }

    rafRef.current = requestAnimationFrame(step)

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      runtimeRef.current.clear()
    }
    // Re-seed only on a new race start (startedAt changes) or activation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, startedAt, passageLength])
}
