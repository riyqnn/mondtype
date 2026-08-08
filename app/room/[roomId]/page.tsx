'use client'

import { use, Suspense } from 'react'
import { RaceApp } from '@/components/typeracer/race-app'

interface RoomPageProps {
  params: Promise<{ roomId: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default function RoomPage({ params, searchParams }: RoomPageProps) {
  return (
    <Suspense fallback={
      <div className="flex min-h-dvh items-center justify-center">
        <div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    }>
      <RoomPageInner params={params} searchParams={searchParams} />
    </Suspense>
  )
}

function RoomPageInner({ params, searchParams }: RoomPageProps) {
  const { roomId } = use(params)
  const sp = use(searchParams)

  return (
    <RaceApp
      roomId={roomId}
      initialName={typeof sp.name === 'string' ? sp.name : undefined}
      initialHost={sp.host === 'true'}
      initialMaxPlayers={typeof sp.max === 'string' ? parseInt(sp.max, 10) : undefined}
      stakeAmount={typeof sp.stake === 'string' ? sp.stake : undefined}
    />
  )
}