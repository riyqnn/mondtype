import type { Player, PlayerStats, RaceResult, RaceState } from './types'
import { createBotPlayers } from './bot'
import { pickRandomPassage } from './passages'

export const SELF_ID = 'self'

/**
 * All state transitions funnel through this reducer so race phases stay
 * explicit (idle → lobby → countdown → racing → finished) instead of being
 * spread across ad-hoc booleans.
 */
export type RaceAction =
  | { type: 'CREATE_ROOM'; name: string; roomCode: string; maxPlayers: number }
  | { type: 'JOIN_ROOM'; name: string; roomCode: string; maxPlayers: number }
  | { type: 'TOGGLE_READY'; playerId: string }
  | { type: 'START_COUNTDOWN' }
  | { type: 'TICK_COUNTDOWN'; value: number }
  | { type: 'BEGIN_RACE'; startedAt: number }
  // Local human typing progress.
  | { type: 'SELF_PROGRESS'; stats: PlayerStats }
  // TODO: replace with live socket.on('player:progress') — same payload shape.
  | { type: 'BOT_PROGRESS'; playerId: string; stats: PlayerStats }
  | { type: 'PLAYER_FINISH'; playerId: string; finishedAt: number }
  | { type: 'RESET' }

function makeSelf(name: string, isHost: boolean): Player {
  return {
    id: SELF_ID,
    name: name.trim() || 'You',
    color: '#f59e0b',
    isHost,
    isBot: false,
    isSelf: true,
    isReady: false,
    stats: { wpm: 0, accuracy: 100, progress: 0 },
    finishedAt: null,
    place: null,
  }
}

export function createInitialState(): RaceState {
  return {
    status: 'idle',
    roomCode: null,
    passage: pickRandomPassage(),
    players: [],
    maxPlayers: 4,
    startedAt: null,
    countdownValue: null,
    results: [],
  }
}

/** Assign 1-based places to whoever has finished, ordered by finish time. */
function assignPlaces(players: Player[]): Player[] {
  const finishOrder = players
    .filter((p) => p.finishedAt !== null)
    .sort((a, b) => (a.finishedAt as number) - (b.finishedAt as number))
    .map((p) => p.id)

  return players.map((p) => {
    const idx = finishOrder.indexOf(p.id)
    return idx === -1 ? p : { ...p, place: idx + 1 }
  })
}

function buildResults(players: Player[]): RaceResult[] {
  return players
    .filter((p) => p.place !== null)
    .sort((a, b) => (a.place as number) - (b.place as number))
    .map((p) => ({
      playerId: p.id,
      name: p.name,
      color: p.color,
      isSelf: p.isSelf,
      place: p.place as number,
      wpm: Math.round(p.stats.wpm),
      accuracy: Math.round(p.stats.accuracy),
    }))
}

export function raceReducer(state: RaceState, action: RaceAction): RaceState {
  switch (action.type) {
    case 'CREATE_ROOM': {
      const self = makeSelf(action.name, true)
      const botCount = Math.max(1, action.maxPlayers - 1)
      return {
        ...createInitialState(),
        status: 'lobby',
        roomCode: action.roomCode,
        maxPlayers: action.maxPlayers,
        passage: state.passage,
        players: [self, ...createBotPlayers(botCount)],
      }
    }

    case 'JOIN_ROOM': {
      const self = makeSelf(action.name, false)
      const botCount = Math.max(1, action.maxPlayers - 1)
      const bots = createBotPlayers(botCount)
      const host = bots[0] ? { ...bots[0], isHost: true } : undefined
      const rest = bots.slice(1)
      return {
        ...createInitialState(),
        status: 'lobby',
        roomCode: action.roomCode,
        maxPlayers: action.maxPlayers,
        passage: state.passage,
        players: host ? [host, self, ...rest] : [self, ...rest],
      }
    }

    case 'TOGGLE_READY': {
      return {
        ...state,
        players: state.players.map((p) =>
          p.id === action.playerId ? { ...p, isReady: !p.isReady } : p,
        ),
      }
    }

    case 'START_COUNTDOWN': {
      // Reset per-race data, keep the roster + room.
      return {
        ...state,
        status: 'countdown',
        countdownValue: 3,
        startedAt: null,
        results: [],
        players: state.players.map((p) => ({
          ...p,
          stats: { wpm: 0, accuracy: 100, progress: 0 },
          finishedAt: null,
          place: null,
        })),
      }
    }

    case 'TICK_COUNTDOWN':
      return { ...state, countdownValue: action.value }

    case 'BEGIN_RACE':
      return {
        ...state,
        status: 'racing',
        countdownValue: null,
        startedAt: action.startedAt,
      }

    case 'SELF_PROGRESS':
    case 'BOT_PROGRESS': {
      if (state.status !== 'racing') return state
      const playerId = action.type === 'SELF_PROGRESS' ? SELF_ID : action.playerId
      return {
        ...state,
        players: state.players.map((p) =>
          p.id === playerId && p.finishedAt === null
            ? { ...p, stats: action.stats }
            : p,
        ),
      }
    }

    case 'PLAYER_FINISH': {
      if (state.status !== 'racing') return state
      const marked = state.players.map((p) =>
        p.id === action.playerId && p.finishedAt === null
          ? {
              ...p,
              finishedAt: action.finishedAt,
              stats: { ...p.stats, progress: 1 },
            }
          : p,
      )
      const placed = assignPlaces(marked)
      const everyoneDone = placed.every((p) => p.finishedAt !== null)
      if (everyoneDone) {
        return {
          ...state,
          status: 'finished',
          players: placed,
          results: buildResults(placed),
        }
      }
      return { ...state, players: placed }
    }

    case 'RESET':
      return {
        ...createInitialState(),
        passage: pickRandomPassage(),
      }

    default:
      return state
  }
}
