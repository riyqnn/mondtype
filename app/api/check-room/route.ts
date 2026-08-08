import { NextRequest, NextResponse } from 'next/server'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001'

export async function GET(request: NextRequest) {
  const roomId = request.nextUrl.searchParams.get('roomId') || ''

  try {
    const res = await fetch(`${WS_URL}/api/check-room?roomId=${roomId}`)
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ joinable: false, reason: 'Cannot reach server' }, { status: 503 })
  }
}