import type { Player, PlayerStats, RaceResult, RaceState } from './types'
import { PASSAGES, pickRandomPassage } from './passages'

export const SELF_ID = 'self'

const PLAYER_COLORS = ['#f59e0b', '#7c3aed', '#0891b2', '#dc2626', '#16a34a', '#ec4899']

export type RaceAction =
  | { type: 'CREATE_ROOM'; name: string; roomCode: string; maxPlayers: number }
  | { type: 'JOIN_ROOM'; name: string; roomCode: string; maxPlayers: number }
  | { type: 'ROOM_STATE'; players: Player[]; roomCode: string; maxPlayers: number }
  | { type: 'PLAYER_JOIN'; player: { id: string; name: string } }
  | { type: 'PLAYER_LEAVE'; playerId: string }
  | { type: 'TOGGLE_READY'; playerId: string }
  | { type: 'START_COUNTDOWN' }
  | { type: 'TICK_COUNTDOWN'; value: number }
  | { type: 'BEGIN_RACE'; startedAt: number; passageIndex: number }
  | { type: 'SELF_PROGRESS'; stats: PlayerStats }
  | { type: 'REMOTE_PROGRESS'; playerId: string; stats: PlayerStats }
  | { type: 'PLAYER_FINISH'; playerId: string; finishedAt: number }
  | { type: 'RACE_FINISHED'; ranking: { address: string; rank: number }[]; txHash: string | null }
  | { type: 'RESET' }

function makeSelf(name: string, isHost: boolean, address: string = ''): Player {
  return {
    id: SELF_ID,
    name: name.trim() || 'You',
    address,
    color: PLAYER_COLORS[0],
    isHost,
    isSelf: true,
    isReady: false,
    isBot: false,
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

    case 'ROOM_STATE': {
      const { players: serverPlayers, roomCode, maxPlayers } = action
      const existingPlayers = state.players
      const merged = serverPlayers.map((sp, i) => {
        const existing = existingPlayers.find(
          (ep) => ep.id === sp.id,
        )
        return {
          ...sp,
          color: sp.color || PLAYER_COLORS[i % PLAYER_COLORS.length],
          isSelf: sp.isSelf || (existing?.isSelf ?? false),
          isHost: existing?.isHost ?? sp.isHost,
          name: existing?.name ?? sp.name,
        }
      })

      return {
        ...state,
        roomCode,
        maxPlayers,
        players: merged,
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
        address: action.player.id,
        color: PLAYER_COLORS[colorIndex],
        isHost: false,
        isSelf: false,
        isReady: false,
        isBot: false,
        stats: { wpm: 0, accuracy: 100, progress: 0 },
        finishedAt: null,
        place: null,
      }
      return {
        ...state,
        players: [...state.players, newPlayer],
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

    case 'BEGIN_RACE': {
      const passage = PASSAGES[action.passageIndex % PASSAGES.length] ?? PASSAGES[0]
      return {
        ...state,
        status: 'racing',
        passage,
        countdownValue: null,
        startedAt: action.startedAt,
      }
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
      const playerId = action.playerId === SELF_ID ? SELF_ID : action.playerId
      const marked = state.players.map((p) =>
        p.id === playerId && p.finishedAt === null
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

    case 'RACE_FINISHED': {
      const placed = state.players.map((p) => {
        const serverRank = action.ranking.find(
          (r) => r.address.toLowerCase() === p.address.toLowerCase() ||
               r.address.toLowerCase() === p.id.toLowerCase(),
        )
        const place = serverRank?.rank ?? 999
        return { ...p, place, finishedAt: p.finishedAt ?? Date.now() }
      })

      return {
        ...state,
        status: 'finished',
        players: placed,
        results: buildResults(placed),
      }
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