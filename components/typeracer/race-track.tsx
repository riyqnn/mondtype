'use client'

import { motion } from 'framer-motion'
import { Flag, Trophy } from 'lucide-react'
import type { Player } from '@/lib/typeracer/types'

interface RaceTrackProps {
  players: Player[]
}

function Car({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 64 36" className="size-14 drop-shadow-sm" aria-hidden="true">
      <path d="M8 24h48v6H8z" fill={color} stroke="var(--foreground)" strokeWidth="2.5" />
      <path d="m18 24 6-12h16l9 12" fill={color} stroke="var(--foreground)" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="m27 14 2-2h7l6 12H25z" fill="var(--background)" stroke="var(--foreground)" strokeWidth="1.5" opacity=".9" />
      <circle cx="18" cy="31" r="5" fill="var(--foreground)" />
      <circle cx="49" cy="31" r="5" fill="var(--foreground)" />
      <circle cx="18" cy="31" r="2" fill="var(--background)" />
      <circle cx="49" cy="31" r="2" fill="var(--background)" />
    </svg>
  )
}

function FinishBurst({ color }: { color: string }) {
  return (
    <span className="pointer-events-none absolute -inset-2" aria-hidden="true">
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.i
          key={i}
          initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          animate={{ opacity: 0, x: Math.cos(i * 0.8) * 30, y: Math.sin(i * 0.8) * 30, scale: 0.2 }}
          transition={{ duration: 0.65, delay: i * 0.025, repeat: Infinity, repeatDelay: 1.5 }}
          className="absolute left-1/2 top-1/2 size-1.5 rounded-sm"
          style={{ backgroundColor: color }}
        />
      ))}
    </span>
  )
}

export function RaceTrack({ players }: RaceTrackProps) {
  return (
    <section aria-label="Race track" className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest">
          <span className="size-2 rounded-full bg-success" /> Live track
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Flag className="size-3.5" /> finish line
        </div>
      </div>

      <div className="relative min-w-[680px] bg-track px-4 py-5 sm:px-6">
        <div className="absolute bottom-4 left-6 top-4 w-0.5 bg-success/70" aria-label="Start line" />
        <div className="bg-checker absolute bottom-4 right-5 top-4 w-3" aria-label="Finish line" />
        <div className="flex flex-col gap-2">
          {players.map((player) => {
            const position = Math.min(96, Math.max(0, player.stats.progress * 96))
            return (
              <div key={player.id} className="relative flex h-16 items-center border-b border-track-line last:border-0">
                <div className="absolute left-0 top-1 flex items-center gap-2 text-xs">
                  <span className="max-w-20 truncate font-semibold sm:max-w-28">{player.name}</span>
                  <span className="w-12 font-mono tabular-nums text-muted-foreground">
                    {Math.round(player.stats.wpm)} wpm
                  </span>
                </div>
                <motion.div
                  className="absolute bottom-0 top-7 z-10 flex items-end"
                  initial={false}
                  animate={{ left: `${position}%` }}
                  transition={{ type: 'spring', stiffness: 90, damping: 18, mass: 0.7 }}
                >
                  <div className="relative -translate-x-1/2">
                    {player.finishedAt !== null && <FinishBurst color={player.color} />}
                    <Car color={player.color} />
                    {player.isSelf && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-background">
                        you
                      </span>
                    )}
                  </div>
                </motion.div>
                {player.place !== null && (
                  <span className="absolute right-7 top-1 flex items-center gap-1 text-xs font-bold text-primary">
                    {player.place === 1 && <Trophy className="size-3.5" />}
                    #{player.place}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
