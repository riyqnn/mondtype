'use client'

import { useCallback, useEffect, useReducer, useRef } from 'react'
import { Keyboard } from 'lucide-react'
import {
  createInitialState,
  raceReducer,
  SELF_ID,
} from '@/lib/typeracer/reducer'
import { generateRoomCode } from '@/lib/typeracer/passages'
import { useRaceEngine } from '@/lib/typeracer/use-race-engine'
import { usePlayerSimulator } from '@/lib/typeracer/use-player-simulator'
import type { PlayerStats } from '@/lib/typeracer/types'
import { LandingScreen } from './landing-screen'
import { RoomLobby } from './room-lobby'
import { CountdownOverlay } from './countdown-overlay'
import { RaceTrack } from './race-track'
import { TypingPanel } from './typing-panel'
import { ResultsPodium } from './results-podium'

interface RaceAppProps {
  initialRoomCode?: string | null
  initialName?: string | null
  initialHost?: boolean
  initialMaxPlayers?: number
  stakeAmount?: string
}

export function RaceApp({ initialRoomCode, initialName, initialHost, initialMaxPlayers, stakeAmount }: RaceAppProps) {
  const [state, dispatch] = useReducer(raceReducer, undefined, createInitialState)
  const initialized = useRef(false)
  const countdownTimers = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearCountdownTimers = useCallback(() => {
    countdownTimers.current.forEach(clearTimeout)
    countdownTimers.current = []
  }, [])

  useEffect(() => {
    if (initialized.current) return
    if (initialRoomCode && initialName) {
      initialized.current = true
      const mp = initialMaxPlayers !== undefined ? initialMaxPlayers : 4
      const roomCode = initialRoomCode
      if (initialHost) {
        dispatch({ type: 'CREATE_ROOM', name: initialName, roomCode, maxPlayers: mp })
      } else {
        dispatch({ type: 'JOIN_ROOM', name: initialName, roomCode, maxPlayers: mp })
      }
    }
  }, [initialRoomCode, initialName, initialHost, initialMaxPlayers])

  const handleSelfProgress = useCallback((stats: PlayerStats) => {
    dispatch({ type: 'SELF_PROGRESS', stats })
  }, [])

  const handleSelfFinish = useCallback(() => {
    dispatch({ type: 'PLAYER_FINISH', playerId: SELF_ID, finishedAt: Date.now() })
  }, [])

  const engine = useRaceEngine({
    passage: state.passage.text,
    active: state.status === 'racing',
    startedAt: state.startedAt,
    onProgress: handleSelfProgress,
    onFinish: handleSelfFinish,
  })

  const handleBotProgress = useCallback((playerId: string, stats: PlayerStats) => {
    dispatch({ type: 'BOT_PROGRESS', playerId, stats })
  }, [])

  const handleBotFinish = useCallback((playerId: string) => {
    dispatch({ type: 'PLAYER_FINISH', playerId, finishedAt: Date.now() })
  }, [])

  usePlayerSimulator({
    players: state.players,
    active: state.status === 'racing',
    startedAt: state.startedAt,
    passageLength: state.passage.text.length,
    onProgress: handleBotProgress,
    onFinish: handleBotFinish,
  })

  useEffect(() => {
    if (state.status !== 'countdown') return
    clearCountdownTimers()
    countdownTimers.current.push(setTimeout(() => dispatch({ type: 'TICK_COUNTDOWN', value: 2 }), 1000))
    countdownTimers.current.push(setTimeout(() => dispatch({ type: 'TICK_COUNTDOWN', value: 1 }), 2000))
    countdownTimers.current.push(setTimeout(() => dispatch({ type: 'TICK_COUNTDOWN', value: 0 }), 3000))
    countdownTimers.current.push(
      setTimeout(() => dispatch({ type: 'BEGIN_RACE', startedAt: Date.now() }), 3800),
    )
    return clearCountdownTimers
  }, [state.status, clearCountdownTimers])

  useEffect(() => clearCountdownTimers, [clearCountdownTimers])

  const handleReset = useCallback(() => {
    clearCountdownTimers()
    engine.reset()
    dispatch({ type: 'RESET' })
  }, [clearCountdownTimers, engine])

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
        {state.roomCode && (state.status === 'racing' || state.status === 'countdown') && (
          <span className="font-mono text-sm font-bold tracking-[0.25em] text-muted-foreground">
            {state.roomCode}
          </span>
        )}
      </header>

      <div className="flex flex-1 flex-col justify-center">
        {state.status === 'idle' && (
          <LandingScreen
            onCreate={(name) =>
              dispatch({ type: 'CREATE_ROOM', name, roomCode: generateRoomCode(), maxPlayers: 4 })
            }
            onJoin={(name, code) => dispatch({ type: 'JOIN_ROOM', name, roomCode: code, maxPlayers: 4 })}
          />
        )}

        {state.status === 'lobby' && state.roomCode && (
          <RoomLobby
            roomCode={state.roomCode}
            players={state.players}
            maxPlayers={state.maxPlayers}
            onToggleReady={(id) => dispatch({ type: 'TOGGLE_READY', playerId: id })}
            onStart={() => dispatch({ type: 'START_COUNTDOWN' })}
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
            onRaceAgain={handleReset}
          />
        )}
      </div>

      <CountdownOverlay value={state.status === 'countdown' ? state.countdownValue : null} />
    </main>
  )
}