import type { TextPassage } from './types'

export const PASSAGES: TextPassage[] = [
  {
    id: 'p1',
    text: 'The quick brown fox jumps over the lazy dog while the morning sun climbs slowly above the quiet hills and the world begins to wake.',
    source: 'Warm-up',
  },
  {
    id: 'p2',
    text: 'Great software is not written in a single burst of genius but assembled patiently from small, correct decisions made one after another.',
    source: 'On craft',
  },
  {
    id: 'p3',
    text: 'Speed matters, but only when paired with accuracy. A fast racer who makes mistakes will always lose to a steady one who never has to backtrack.',
    source: 'Racing wisdom',
  },
  {
    id: 'p4',
    text: 'Somewhere between the first keystroke and the finish line, a rhythm takes over and your fingers seem to know the words before your eyes have read them.',
    source: 'Flow state',
  },
]

export function pickRandomPassage(): TextPassage {
  return PASSAGES[Math.floor(Math.random() * PASSAGES.length)]
}

/** Six-character uppercase room code, e.g. "K7Q2ZP". */
export function generateRoomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return code
}
