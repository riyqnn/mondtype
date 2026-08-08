import { NextRequest, NextResponse } from 'next/server'

const WS_URL = process.env.WS_URL || process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001'

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address')

  try {
    const res = await fetch(`${WS_URL}/api/active-room?address=${address}`)
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ activeRoomId: null })
  }
}