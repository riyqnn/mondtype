'use client'

import { RaceApp } from '@/components/typeracer/race-app'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function GameContent() {
  const searchParams = useSearchParams()
  const roomId = searchParams.get('roomId')
  const name = searchParams.get('name')
  const host = searchParams.get('host') === 'true'
  const max = searchParams.get('max')
  const maxPlayers = max ? parseInt(max) : undefined
  const stake = searchParams.get('stake') ?? undefined

  return (
    <RaceApp
      initialRoomCode={roomId}
      initialName={name}
      initialHost={host}
      initialMaxPlayers={maxPlayers}
      stakeAmount={stake}
    />
  )
}

export default function GamePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="size-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          Loading...
        </div>
      </div>
    }>
      <GameContent />
    </Suspense>
  )
}