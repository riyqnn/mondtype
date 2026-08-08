'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

const WS_URL = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001')
  : ''

interface UseRaceSocketOptions {
  roomId: number | null
  walletAddress: string | null | undefined
  enabled: boolean
}

interface LobbyPlayer {
  address: string
  ready: boolean
  connected: boolean
  finishedAt: number | null
  rank: number | null
}

export interface LobbyState {
  roomId: number
  host: string
  maxPlayers: number
  status: string
  players: LobbyPlayer[]
}

interface ProgressData {
  walletAddress: string
  charsCorrect: number
  wpm: number
}

interface RankEntry {
  address: string
  rank: number
}

interface RaceFinishedData {
  ranking: RankEntry[]
  txHash: string | null
  status: 'confirmed' | 'failed'
  error?: string
}

interface UseRaceSocketReturn {
  socket: Socket | null
  connected: boolean
  lobbyState: LobbyState | null
  lastProgress: ProgressData | null
  finishedPlayer: string | null
  raceData: { text: string; startTimestamp: number; maxDurationMs: number } | null
  raceResult: RaceFinishedData | null
  countdown: boolean
  disconnectNotice: string | null
  sendReady: (ready: boolean) => void
  sendProgress: (charsCorrect: number, wpm: number) => void
  sendFinished: (finishTimeMs: number) => void
}

export function useRaceSocket({
  roomId,
  walletAddress,
  enabled,
}: UseRaceSocketOptions): UseRaceSocketReturn {
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [lobbyState, setLobbyState] = useState<LobbyState | null>(null)
  const [lastProgress, setLastProgress] = useState<ProgressData | null>(null)
  const [finishedPlayer, setFinishedPlayer] = useState<string | null>(null)
  const [raceData, setRaceData] = useState<{
    text: string
    startTimestamp: number
    maxDurationMs: number
  } | null>(null)
  const [raceResult, setRaceResult] = useState<RaceFinishedData | null>(null)
  const [countdown, setCountdown] = useState(false)
  const [disconnectNotice, setDisconnectNotice] = useState<string | null>(null)
  const hasJoined = useRef(false)

  useEffect(() => {
    if (!enabled || !walletAddress || !roomId || hasJoined.current) return

    const socket = io(WS_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      socket.emit('join_lobby', { roomId, walletAddress })
      hasJoined.current = true
    })

    socket.on('disconnect', () => {
      setConnected(false)
    })

    socket.on('lobby_update', (data: LobbyState) => {
      setLobbyState(data)
      setCountdown(false)
    })

    socket.on('countdown_start', (_data: { startsInMs: number }) => {
      setCountdown(true)
    })

    socket.on(
      'race_start',
      (data: {
        passageIndex: number
        startTimestamp: number
        maxDurationMs: number
        players: LobbyPlayer[]
      }) => {
        setCountdown(false)
        setRaceData({
          text: String(data.passageIndex),
          startTimestamp: data.startTimestamp,
          maxDurationMs: data.maxDurationMs,
        })
      },
    )

    socket.on('progress_update', (data: ProgressData) => {
      setLastProgress(data)
    })

    socket.on('player_finished_event', (data: { walletAddress: string }) => {
      setFinishedPlayer(data.walletAddress)
    })

    socket.on('player_disconnected', (data: { walletAddress: string; message: string }) => {
      if (data.walletAddress !== walletAddress) {
        setDisconnectNotice(data.message)
      }
    })

    socket.on('race_finished', (data: RaceFinishedData) => {
      setRaceResult(data)
    })

    socket.on('error', (data: { message: string }) => {
      console.error('[Socket] Error:', data.message)
    })

    return () => {
      hasJoined.current = false
      socket.disconnect()
      socketRef.current = null
    }
  }, [enabled, roomId, walletAddress])

  const sendReady = useCallback(
    (ready: boolean) => {
      if (socketRef.current && roomId && walletAddress) {
        socketRef.current.emit('toggle_ready', { roomId, walletAddress })
      }
    },
    [roomId, walletAddress],
  )

  const sendProgress = useCallback(
    (charsCorrect: number, wpm: number) => {
      if (socketRef.current && roomId && walletAddress) {
        socketRef.current.emit('progress_update', {
          roomId,
          walletAddress,
          charsCorrect,
          wpm,
        })
      }
    },
    [roomId, walletAddress],
  )

  const sendFinished = useCallback(
    (finishTimeMs: number) => {
      if (socketRef.current && roomId && walletAddress) {
        socketRef.current.emit('player_finished', {
          roomId,
          walletAddress,
          finishTimeMs,
        })
      }
    },
    [roomId, walletAddress],
  )

  return {
    socket: socketRef.current,
    connected,
    lobbyState,
    lastProgress,
    finishedPlayer,
    raceData,
    raceResult,
    countdown,
    disconnectNotice,
    sendReady,
    sendProgress,
    sendFinished,
  }
}