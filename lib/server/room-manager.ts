export type RoomStatus = 'WAITING_FOR_PLAYERS' | 'LOBBY' | 'COUNTDOWN' | 'RACING' | 'FINISHED'

export interface RoomPlayer {
  address: string
  ready: boolean
  connected: boolean
  disconnectTimer: ReturnType<typeof setTimeout> | null
  charsCorrect: number
  wpm: number
  finishedAt: number | null
  rank: number | null
}

export interface RoomState {
  roomId: number
  host: string
  stakeAmount: bigint
  maxPlayers: number
  status: RoomStatus
  players: Map<string, RoomPlayer>
  passageIndex: number
  startTimestamp: number | null
  maxDurationMs: number
  createdAt: number
  raceTimeout: ReturnType<typeof setTimeout> | null
  submitted: boolean
}

class RoomManager {
  private rooms: Map<number, RoomState> = new Map()
  private activeRoomByWallet: Map<string, number> = new Map()

  getActiveRoomForWallet(address: string): number | null {
    return this.activeRoomByWallet.get(address.toLowerCase()) ?? null
  }

  getRoom(roomId: number): RoomState | undefined {
    return this.rooms.get(roomId)
  }

  createRoom(roomId: number, host: string, maxPlayers: number): RoomState {
    const room: RoomState = {
      roomId,
      host: host.toLowerCase(),
      stakeAmount: BigInt(0),
      maxPlayers,
      status: 'WAITING_FOR_PLAYERS',
      players: new Map(),
      passageIndex: Math.floor(Math.random() * 4),
      startTimestamp: null,
      maxDurationMs: 60000,
      createdAt: Date.now(),
      raceTimeout: null,
      submitted: false,
    }
    this.rooms.set(roomId, room)

    if (room.players.size >= 2) {
      room.status = 'LOBBY'
    }

    return room
  }

  addBots(roomId: number): void {
    const room = this.rooms.get(roomId)
    if (!room) return

    const existing = room.players.size
    const needed = room.maxPlayers - existing

    for (let i = 1; i <= needed; i++) {
      const botAddr = `bot:${i}`
      if (room.players.has(botAddr)) continue
      room.players.set(botAddr, {
        address: botAddr,
        ready: true,
        connected: true,
        disconnectTimer: null,
        charsCorrect: 0,
        wpm: 0,
        finishedAt: null,
        rank: null,
      })
    }

    if (room.players.size >= 2) {
      room.status = 'LOBBY'
    }
  }

  isBot(address: string): boolean {
    return address.startsWith('bot:')
  }

  addPlayer(roomId: number, address: string): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false
    if (room.players.size >= room.maxPlayers) return false

    const lowerAddr = address.toLowerCase()
    if (room.players.has(lowerAddr)) return true

    room.players.set(lowerAddr, {
      address: lowerAddr,
      ready: false,
      connected: true,
      disconnectTimer: null,
      charsCorrect: 0,
      wpm: 0,
      finishedAt: null,
      rank: null,
    })

    this.activeRoomByWallet.set(lowerAddr, roomId)

    if (room.players.size >= 2) {
      room.status = 'LOBBY'
    }

    return true
  }

  setPlayerConnected(roomId: number, address: string, connected: boolean): void {
    const room = this.rooms.get(roomId)
    if (!room) return
    const player = room.players.get(address.toLowerCase())
    if (!player) return
    player.connected = connected
    if (player.disconnectTimer) {
      clearTimeout(player.disconnectTimer)
      player.disconnectTimer = null
    }
  }

  setDisconnectTimer(roomId: number, address: string, timer: ReturnType<typeof setTimeout>): void {
    const room = this.rooms.get(roomId)
    if (!room) return
    const player = room.players.get(address.toLowerCase())
    if (!player) return
    player.disconnectTimer = timer
  }

  toggleReady(roomId: number, address: string): boolean {
    const room = this.rooms.get(roomId)
    if (!room || room.status !== 'LOBBY') return false
    const player = room.players.get(address.toLowerCase())
    if (!player) return false
    player.ready = !player.ready
    return true
  }

  allReady(roomId: number): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false
    if (room.players.size < 2) return false
    let ready = true
    room.players.forEach((p) => {
      if (!p.ready) ready = false
    })
    return ready
  }

  startCountdown(roomId: number): void {
    const room = this.rooms.get(roomId)
    if (!room) return
    room.status = 'COUNTDOWN'
  }

  startRace(roomId: number): void {
    const room = this.rooms.get(roomId)
    if (!room) return
    room.status = 'RACING'
    room.startTimestamp = Date.now()
    room.passageIndex = Math.floor(Math.random() * 4)

    if (room.raceTimeout) clearTimeout(room.raceTimeout)
    room.raceTimeout = setTimeout(() => {
      this.finishRaceByTimeout(roomId)
    }, room.maxDurationMs)
  }

  updateProgress(roomId: number, address: string, charsCorrect: number, wpm: number): void {
    const room = this.rooms.get(roomId)
    if (!room || room.status !== 'RACING') return
    const player = room.players.get(address.toLowerCase())
    if (!player || player.finishedAt !== null) return
    player.charsCorrect = charsCorrect
    player.wpm = wpm
  }

  playerFinished(roomId: number, address: string, finishTimeMs: number): boolean {
    const room = this.rooms.get(roomId)
    if (!room || room.status !== 'RACING') return false
    const player = room.players.get(address.toLowerCase())
    if (!player || player.finishedAt !== null) return false
    player.finishedAt = finishTimeMs
    player.charsCorrect = Number.MAX_SAFE_INTEGER
    player.wpm = player.wpm || 0

    return this.checkAllFinished(roomId)
  }

  private finishRaceByTimeout(roomId: number): void {
    const room = this.rooms.get(roomId)
    if (!room || room.status !== 'RACING') return
    room.status = 'FINISHED'
  }

  private checkAllFinished(roomId: number): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false
    let allDone = true
    room.players.forEach((p) => {
      if (p.finishedAt === null) allDone = false
    })
    if (allDone) {
      room.status = 'FINISHED'
      if (room.raceTimeout) clearTimeout(room.raceTimeout)
    }
    return allDone
  }

  getRanking(roomId: number): string[] {
    const room = this.rooms.get(roomId)
    if (!room) return []

    const entries = Array.from(room.players.entries()).map(([addr, p]) => ({
      address: addr,
      finishedAt: p.finishedAt ?? room.maxDurationMs,
    }))

    entries.sort((a, b) => a.finishedAt - b.finishedAt)

    entries.forEach((entry, i) => {
      const player = room.players.get(entry.address)
      if (player) player.rank = i + 1
    })

    return entries.map((e) => e.address)
  }

  markSubmitted(roomId: number): void {
    const room = this.rooms.get(roomId)
    if (!room) return
    room.submitted = true
  }

  cleanupRoom(roomId: number): void {
    const room = this.rooms.get(roomId)
    if (!room) return
    if (room.raceTimeout) clearTimeout(room.raceTimeout)
    room.players.forEach((p) => {
      if (p.disconnectTimer) clearTimeout(p.disconnectTimer)
      this.activeRoomByWallet.delete(p.address)
    })
    this.rooms.delete(roomId)
  }

  getLobbyState(roomId: number) {
    const room = this.rooms.get(roomId)
    if (!room) return null
    return {
      roomId: room.roomId,
      host: room.host,
      maxPlayers: room.maxPlayers,
      status: room.status,
      players: Array.from(room.players.entries()).map(([addr, p]) => ({
        address: addr,
        ready: p.ready,
        connected: p.connected,
        finishedAt: p.finishedAt,
        rank: p.rank,
      })),
    }
  }
}

if (!(globalThis as any).__roomManager) {
  ;(globalThis as any).__roomManager = new RoomManager()
}

export const roomManager: RoomManager = (globalThis as any).__roomManager