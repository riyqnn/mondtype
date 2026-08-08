import type { Player } from './types'

export interface BotProfile {
  id: string
  name: string
  color: string
  /** Target sustained WPM the simulator aims for. */
  targetWpm: number
}

/**
 * Pool of simulated opponents. In a live build this list would be replaced by
 * players joining over a socket; the shapes below match the `Player` type so
 * the swap is mechanical.
 */
export const BOT_POOL: BotProfile[] = [
  { id: 'bot-nova', name: 'Nova', color: '#7c3aed', targetWpm: 82 },
  { id: 'bot-ace', name: 'Ace', color: '#0891b2', targetWpm: 71 },
  { id: 'bot-blaze', name: 'Blaze', color: '#dc2626', targetWpm: 95 },
  { id: 'bot-pixel', name: 'Pixel', color: '#16a34a', targetWpm: 64 },
]

export function createBotPlayers(count: number): Player[] {
  return BOT_POOL.slice(0, count).map((profile) => ({
    id: profile.id,
    name: profile.name,
    color: profile.color,
    isHost: false,
    isBot: true,
    isSelf: false,
    isReady: true,
    stats: { wpm: 0, accuracy: 100, progress: 0 },
    finishedAt: null,
    place: null,
  }))
}

export function getBotTargetWpm(botId: string): number {
  return BOT_POOL.find((b) => b.id === botId)?.targetWpm ?? 70
}
