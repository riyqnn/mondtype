'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Copy, Crown, Link, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Player } from '@/lib/typeracer/types'

interface RoomLobbyProps {
  roomCode: string
  players: Player[]
  maxPlayers: number
  onToggleReady: () => void
}

export function RoomLobby({ roomCode, players, maxPlayers, onToggleReady }: RoomLobbyProps) {
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  const self = players.find((p) => p.isSelf)
  const host = players.find((p) => p.isHost)
  const allReady = players.length >= 2 && players.every((p) => p.isReady)

  const copyCode = async () => {
    await navigator.clipboard.writeText(roomCode)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 1800)
  }

  const copyLink = async () => {
    const link = `${window.location.origin}/room/${roomCode}`
    await navigator.clipboard.writeText(link)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 1800)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto w-full max-w-lg"
    >
      <span className="mb-2 inline-block font-mono text-[11px] font-bold tracking-[0.2em] text-primary/60 uppercase">
        Race Lobby
      </span>
      <h2 className="font-mono text-2xl font-bold tracking-tight sm:text-3xl mb-1">
        Waiting for players
      </h2>
      <p className="text-sm text-muted-foreground mb-8">
        {players.length < maxPlayers
          ? 'Share the code below so others can join.'
          : 'Lobby full. Everyone ready up to start.'}
      </p>

      <div className="mb-8 space-y-3">
        <button
          onClick={copyCode}
          className="group relative flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary/20 bg-primary/[0.02] px-6 py-4 transition-all duration-200 hover:border-primary/40 hover:bg-primary/[0.04]"
        >
          <span className="font-mono text-2xl font-bold text-foreground sm:text-3xl">
            #{roomCode}
          </span>
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
            {copiedCode ? (
              <Check className="size-4 text-success" />
            ) : (
              <Copy className="size-4 text-primary" />
            )}
          </span>
          {copiedCode && (
            <motion.span
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-xs font-medium text-success"
            >
              Copied!
            </motion.span>
          )}
        </button>

        <button
          onClick={copyLink}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border/40 bg-white/50 px-4 py-2.5 text-xs font-medium text-muted-foreground transition-all hover:bg-white hover:text-foreground hover:border-border/80"
        >
          <Link className="size-3.5" />
          {copiedLink ? 'Link copied!' : 'Copy invite link'}
        </button>
      </div>

      <div className="mb-8 rounded-2xl border border-border/60 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="flex items-center gap-2.5 border-b border-border/60 px-5 py-3.5">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/[0.06] ring-1 ring-primary/8">
            <Users className="size-3.5 text-primary" />
          </div>
          <span className="font-mono text-xs font-semibold tracking-[0.1em] text-muted-foreground uppercase">
            Players
          </span>
          <span className="ml-auto font-mono text-sm font-semibold tabular-nums text-foreground">
            {players.length}/{maxPlayers}
          </span>
        </div>

        <div className="divide-y divide-border/40">
          {players.map((p) => (
            <div key={p.id} className="flex items-center gap-3.5 px-5 py-3.5">
              <div
                className="flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm"
                style={{ backgroundColor: p.color }}
              >
                {p.name.charAt(0).toUpperCase()}
              </div>

              <div className="flex flex-col min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground truncate">
                  {p.name}
                  {p.isSelf && (
                    <span className="text-[11px] font-normal text-muted-foreground">
                      (you)
                    </span>
                  )}
                  {p.isHost && (
                    <Crown className="size-3.5 text-primary shrink-0" />
                  )}
                </span>
              </div>

              <div className="ml-auto shrink-0">
                {p.isReady ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/[0.08] px-3 py-1 text-[11px] font-semibold text-success ring-1 ring-success/20">
                    <Check className="size-3" />
                    Ready
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-[11px] font-semibold text-muted-foreground">
                    Waiting
                  </span>
                )}
              </div>
            </div>
          ))}

          {Array.from({ length: maxPlayers - players.length }).map((_, i) => (
            <div key={`empty-${i}`} className="flex items-center gap-3.5 px-5 py-3.5 opacity-40">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground">
                ?
              </div>
              <span className="text-sm text-muted-foreground italic">Waiting for player...</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Button
          variant={self?.isReady ? 'secondary' : 'default'}
          size="lg"
          className="w-full rounded-xl font-semibold text-sm"
          onClick={onToggleReady}
        >
          {self?.isReady ? 'Cancel Ready' : "I'm Ready"}
        </Button>
      </div>

      {allReady && (
        <p className="mt-4 text-center text-sm font-medium text-success">
          All players ready — race starting soon!
        </p>
      )}
      {!allReady && players.length >= 2 && (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Waiting for all players to ready up...
        </p>
      )}
      {players.length < 2 && (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Need at least 2 players to start.
        </p>
      )}
    </motion.div>
  )
}