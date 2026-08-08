'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function GameRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const roomId = searchParams.get('roomId')
    if (!roomId) {
      router.replace('/')
      return
    }

    const params = new URLSearchParams()
    const name = searchParams.get('name')
    const host = searchParams.get('host')
    const max = searchParams.get('max')
    const stake = searchParams.get('stake')

    if (name) params.set('name', name)
    if (host) params.set('host', host)
    if (max) params.set('max', max)
    if (stake) params.set('stake', stake)

    const qs = params.toString()
    router.replace(`/room/${roomId}${qs ? `?${qs}` : ''}`)
  }, [router, searchParams])

  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full" />
    </div>
  )
}

export default function GamePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-dvh items-center justify-center">
        <div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    }>
      <GameRedirect />
    </Suspense>
  )
}