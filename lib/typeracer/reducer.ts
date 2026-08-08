import type { Player, PlayerStats, RaceResult, RaceState } from './types'
import { pickRandomPassage } from './passages'

export const SELF_ID = 'self'

/** Color palette for assigning to players who join. */
const PLAYER_COLORS = ['#f59e0b', '#7c3aed', '#0891b2', '#dc2626', '#16a34a', '#ec4899']

/**
 * All state transitions funnel through this reducer so race phases stay
 * explicit (idle → lobby → countdown → racing → finished) instead of being
 * spread across ad-hoc booleans.
 */
export type RaceAction =
  | { type: 'CREATE_ROOM'; name: string; roomCode: string; maxPlayers: number }
  | { type: 'JOIN_ROOM'; name: string; roomCode: string; maxPlayers: number }
  | { type: 'PLAYER_JOIN'; player: { id: string; name: string } }
  | { type: 'SYNC_PLAYERS'; addresses: readonly string[], hostAddress: string }
  | { type: 'PLAYER_LEAVE'; playerId: string }
  | { type: 'TOGGLE_READY'; playerId: string }
  | { type: 'START_COUNTDOWN' }
  | { type: 'TICK_COUNTDOWN'; value: number }
  | { type: 'BEGIN_RACE'; startedAt: number }
  // Local human typing progress.
  | { type: 'SELF_PROGRESS'; stats: PlayerStats }
  // Remote player progress — dispatched from socket/WebRTC events.
  | { type: 'REMOTE_PROGRESS'; playerId: string; stats: PlayerStats }
  | { type: 'PLAYER_FINISH'; playerId: string; finishedAt: number }
  | { type: 'RESET' }

function makeSelf(name: string, isHost: boolean): Player {
  return {
    id: SELF_ID,
    name: name.trim() || 'You',
    color: PLAYER_COLORS[0],
    isHost,
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
      return {
        ...createInitialState(),
        status: 'lobby',
        roomCode: action.roomCode,
        maxPlayers: action.maxPlayers,
        passage: state.passage,
        players: [self],
      }
    }

    case 'JOIN_ROOM': {
      const self = makeSelf(action.name, false)
      return {
        ...createInitialState(),
        status: 'lobby',
        roomCode: action.roomCode,
        maxPlayers: action.maxPlayers,
        passage: state.passage,
        players: [self],
      }
    }

    case 'PLAYER_JOIN': {
      if (state.status !== 'lobby') return state
      if (state.players.length >= state.maxPlayers) return state
      if (state.players.some((p) => p.id === action.player.id)) return state
      const colorIndex = state.players.length % PLAYER_COLORS.length
      const newPlayer: Player = {
        id: action.player.id,
        name: action.player.name,
        color: PLAYER_COLORS[colorIndex],
        isHost: false,
        isSelf: false,
        isReady: false,
        stats: { wpm: 0, accuracy: 100, progress: 0 },
        finishedAt: null,
        place: null,
      }
      return {
        ...state,
        players: [...state.players, newPlayer],
      }
    }

    case 'SYNC_PLAYERS': {
      if (state.status !== 'lobby') return state
      
      const newPlayers = [...state.players]
      
      // Add missing players from addresses
      action.addresses.forEach(address => {
        // Assume self is already in the list, we don't want to override self. 
        // A real app would link wallet address to the self player.
        // For now, if we don't have this address (and it's not the first self player creating a clash), add it.
        const id = address.toLowerCase()
        if (!newPlayers.some(p => p.id === id || (p.isSelf && p.id === SELF_ID))) {
           const colorIndex = newPlayers.length % PLAYER_COLORS.length
           newPlayers.push({
             id: id,
             name: `${address.slice(0, 6)}...${address.slice(-4)}`,
             color: PLAYER_COLORS[colorIndex],
             isHost: address.toLowerCase() === action.hostAddress.toLowerCase(),
             isSelf: false,
             isReady: false,
             stats: { wpm: 0, accuracy: 100, progress: 0 },
             finishedAt: null,
             place: null,
           })
        }
      })
      
      // Remove players that are no longer in the addresses list (except self)
      const filteredPlayers = newPlayers.filter(p => p.isSelf || action.addresses.some(a => a.toLowerCase() === p.id))
      
      // Update host status
      const updatedPlayers = filteredPlayers.map(p => ({
        ...p,
        isHost: p.isSelf ? p.isHost : (p.id === action.hostAddress.toLowerCase())
      }))
      
      return {
        ...state,
        players: updatedPlayers
      }
    }

    case 'PLAYER_LEAVE': {
      return {
        ...state,
        players: state.players.filter((p) => p.id !== action.playerId),
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
    case 'REMOTE_PROGRESS': {
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
