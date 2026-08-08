'use client'

import { useCallback, useEffect, useReducer, useRef } from 'react'
import { Keyboard, Loader2 } from 'lucide-react'
import { useAccount } from 'wagmi'
import {
  createInitialState,
  raceReducer,
  SELF_ID,
} from '@/lib/typeracer/reducer'
import { useRaceEngine } from '@/lib/typeracer/use-race-engine'
import { useRaceSocket } from '@/lib/hooks/use-race-socket'
import type { PlayerStats } from '@/lib/typeracer/types'
import { RoomLobby } from './room-lobby'
import { CountdownOverlay } from './countdown-overlay'
import { RaceTrack } from './race-track'
import { TypingPanel } from './typing-panel'
import { ResultsPodium } from './results-podium'
import type { Player } from '@/lib/typeracer/types'

const PLAYER_COLORS = ['#f59e0b', '#7c3aed', '#0891b2', '#dc2626', '#16a34a', '#ec4899']

interface RaceAppProps {
  roomId: string
  initialName?: string
  initialHost?: boolean
  initialMaxPlayers?: number
  stakeAmount?: string
}

function mapServerPlayerToUi(
  addr: string,
  index: number,
  isSelf: boolean,
  isHost: boolean,
  name: string,
  ready: boolean,
  connected: boolean,
): Player {
  const isBot = addr.startsWith('bot:')
  const botNum = isBot ? parseInt(addr.split(':')[1]) : 0
  const BOT_NAMES = ['0xB07A...A1fa', '0xB07B...B3tA', '0xB07G...G4mM']
  return {
    id: isSelf ? SELF_ID : addr.toLowerCase(),
    name: isSelf ? name : isBot ? BOT_NAMES[botNum - 1] ?? `Bot ${botNum}` : `${addr.slice(0, 6)}...${addr.slice(-4)}`,
    color: PLAYER_COLORS[index % PLAYER_COLORS.length],
    isHost,
    isSelf,
    isReady: ready,
    isBot,
    stats: { wpm: 0, accuracy: 100, progress: 0 },
    finishedAt: null,
    place: null,
  }
}

export function RaceApp({ roomId, initialName, initialHost, initialMaxPlayers, stakeAmount }: RaceAppProps) {
  const { address } = useAccount()
  const [state, dispatch] = useReducer(raceReducer, undefined, createInitialState)
  const initialized = useRef(false)
  const countdownTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  const name = initialName ?? (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Anon')

  const clearCountdownTimers = useCallback(() => {
    countdownTimers.current.forEach(clearTimeout)
    countdownTimers.current = []
  }, [])

  useEffect(() => {
    if (initialized.current) return
    if (roomId && address) {
      initialized.current = true
      const mp = initialMaxPlayers ?? 4
      if (initialHost) {
        dispatch({ type: 'CREATE_ROOM', name, roomCode: roomId, maxPlayers: mp })
      } else {
        dispatch({ type: 'JOIN_ROOM', name, roomCode: roomId, maxPlayers: mp })
      }
    }
  }, [roomId, address, initialHost, initialMaxPlayers, name])

  const {
    connected,
    lobbyState,
    lastProgress,
    finishedPlayer,
    raceData,
    raceResult,
    countdown: socketCountdown,
    disconnectNotice,
    sendReady,
    sendProgress,
    sendFinished,
  } = useRaceSocket({
    roomId: roomId ? parseInt(roomId, 10) : null,
    walletAddress: address,
    enabled: !!address && !!roomId,
  })

  useEffect(() => {
    if (!lobbyState) return

    const hasSelf = state.players.some((p) => p.isSelf)
    const players: Player[] = []

    lobbyState.players.forEach((sp, i) => {
      const isSelfAddr = sp.address.toLowerCase() === address?.toLowerCase()
      const player = mapServerPlayerToUi(
        sp.address,
        i,
        isSelfAddr && hasSelf,
        sp.address.toLowerCase() === lobbyState.host.toLowerCase(),
        isSelfAddr && hasSelf ? name : `${sp.address.slice(0, 6)}...${sp.address.slice(-4)}`,
        sp.ready,
        sp.connected,
      )
      players.push(player)
    })

    if (!hasSelf && address) {
      players.unshift({
        id: SELF_ID,
        name,
        color: PLAYER_COLORS[0],
        isHost: address.toLowerCase() === lobbyState.host.toLowerCase(),
        isSelf: true,
        isReady: false,
        isBot: false,
        stats: { wpm: 0, accuracy: 100, progress: 0 },
        finishedAt: null,
        place: null,
      })
    }

    dispatch({
      type: 'ROOM_STATE',
      players,
      roomCode: String(lobbyState.roomId),
      maxPlayers: lobbyState.maxPlayers,
    })
  }, [lobbyState, address, name, state.players.length])

  useEffect(() => {
    if (socketCountdown) {
      dispatch({ type: 'START_COUNTDOWN' })
    }
  }, [socketCountdown])

  useEffect(() => {
    if (!raceData) return
    dispatch({
      type: 'BEGIN_RACE',
      startedAt: raceData.startTimestamp,
      passageIndex: parseInt(raceData.text, 10),
    })
  }, [raceData?.startTimestamp])

  useEffect(() => {
    if (!lastProgress) return
    dispatch({
      type: 'REMOTE_PROGRESS',
      playerId: lastProgress.walletAddress.toLowerCase(),
      stats: {
        wpm: lastProgress.wpm,
        accuracy: 100,
        progress: lastProgress.progress ?? 0,
      },
    })
  }, [lastProgress?.walletAddress, lastProgress?.charsCorrect, lastProgress?.progress])

  useEffect(() => {
    if (!finishedPlayer) return
    dispatch({
      type: 'PLAYER_FINISH',
      playerId: finishedPlayer.toLowerCase(),
      finishedAt: Date.now(),
    })
  }, [finishedPlayer])

  useEffect(() => {
    if (!raceResult) return
    dispatch({
      type: 'RACE_FINISHED',
      ranking: raceResult.ranking,
      txHash: raceResult.txHash,
    })
  }, [raceResult])

  const handleSelfProgress = useCallback((stats: PlayerStats) => {
    dispatch({ type: 'SELF_PROGRESS', stats })
    sendProgress(Math.round(stats.progress * 100), Math.round(stats.wpm))
  }, [sendProgress])

  const handleSelfFinish = useCallback(() => {
    dispatch({ type: 'PLAYER_FINISH', playerId: SELF_ID, finishedAt: Date.now() })
    sendFinished(Date.now())
  }, [sendFinished])

  const engine = useRaceEngine({
    passage: state.passage.text,
    active: state.status === 'racing',
    startedAt: state.startedAt,
    onProgress: handleSelfProgress,
    onFinish: handleSelfFinish,
  })

  // Countdown sequence
  useEffect(() => {
    if (state.status !== 'countdown') return
    clearCountdownTimers()
    countdownTimers.current.push(setTimeout(() => dispatch({ type: 'TICK_COUNTDOWN', value: 2 }), 1000))
    countdownTimers.current.push(setTimeout(() => dispatch({ type: 'TICK_COUNTDOWN', value: 1 }), 2000))
    countdownTimers.current.push(setTimeout(() => dispatch({ type: 'TICK_COUNTDOWN', value: 0 }), 3000))
    return clearCountdownTimers
  }, [state.status, clearCountdownTimers])

  useEffect(() => clearCountdownTimers, [clearCountdownTimers])

  const handleReset = useCallback(() => {
    clearCountdownTimers()
    engine.reset()
    dispatch({ type: 'RESET' })
  }, [clearCountdownTimers, engine])

  if (!connected && state.status === 'lobby') {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="text-center">
          <Loader2 className="size-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Connecting to room...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4 py-8 sm:py-12">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Keyboard className="size-5" />
          </span>
          <div className="leading-tight">
            <h1 className="text-lg font-black tracking-tight text-foreground">MondType</h1>
            <p className="text-xs text-muted-foreground">Race your words</p>
          </div>
        </div>
        {state.roomCode && (
          <span className="font-mono text-sm font-bold tracking-[0.25em] text-muted-foreground">
            #{state.roomCode}
          </span>
        )}
      </header>

      {disconnectNotice && (
        <div className="mb-4 mx-auto max-w-lg rounded-xl border border-amber/20 bg-amber/5 px-4 py-2.5 text-sm text-amber-700 text-center">
          {disconnectNotice}
        </div>
      )}

      <div className="flex flex-1 flex-col justify-center">
        {state.status === 'lobby' && state.roomCode && (
          <RoomLobby
            roomCode={state.roomCode}
            players={state.players}
            maxPlayers={state.maxPlayers}
            onToggleReady={() => sendReady(true)}
          />
        )}

        {(state.status === 'countdown' || state.status === 'racing') && (
          <div className="space-y-5">
            <RaceTrack players={state.players} />
            <TypingPanel
              passage={state.passage.text}
              typedCount={engine.typedCount}
              hasError={engine.hasError}
              stats={engine.stats}
              active={state.status === 'racing'}
              onInput={engine.handleInput}
            />
          </div>
        )}

        {state.status === 'finished' && (
          <ResultsPodium
            results={state.results}
            roomCode={state.roomCode}
            stakeAmount={stakeAmount}
            playerCount={state.players.length}
            txHash={raceResult?.txHash ?? null}
            submitStatus={raceResult?.status ?? null}
            submitError={raceResult?.error ?? null}
            onRaceAgain={handleReset}
          />
        )}
      </div>

      <CountdownOverlay value={state.status === 'countdown' ? state.countdownValue : null} />
    </main>
  )
}