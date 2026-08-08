/**
 * Core domain types for the typing race.
 *
 * These are transport-agnostic: the same shapes are produced locally for
 * single-player and could be produced by a WebSocket server for live
 * multiplayer. See `reducer.ts` for the exact swap seams.
 */

export type RaceStatus = 'idle' | 'lobby' | 'countdown' | 'racing' | 'finished'

export interface TextPassage {
  id: string
  /** The literal characters a player must type. */
  text: string
  /** Short human label, e.g. the source of the quote. */
  source: string
}

export interface PlayerStats {
  /** Rolling words-per-minute (correct chars / 5 / minutes). */
  wpm: number
  /** Percentage 0–100 of correct keystrokes over total keystrokes. */
  accuracy: number
  /** 0–1 fraction of the passage completed. */
  progress: number
}

export interface Player {
  id: string
  name: string
  /** Saturated hex color used for the car + labels. */
  color: string
  isHost: boolean
  /** True for the local human racer. */
  isSelf: boolean
  isReady: boolean
  stats: PlayerStats
  /** ms timestamp when this racer crossed the finish line, else null. */
  finishedAt: number | null
  /** Final placement (1-based) once finished, else null. */
  place: number | null
}

export interface RaceResult {
  playerId: string
  name: string
  color: string
  isSelf: boolean
  place: number
  wpm: number
  accuracy: number
}

export interface RaceState {
  status: RaceStatus
  roomCode: string | null
  passage: TextPassage
  players: Player[]
  maxPlayers: number
  /** ms timestamp when GO fired, else null. */
  startedAt: number | null
  countdownValue: number | null
  results: RaceResult[]
}
