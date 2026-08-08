import type { Server, Socket } from 'socket.io'
import { roomManager } from './room-manager'
import { submitResultToContract } from './submit-result'

export function setupSocketEvents(io: Server): void {
  io.on('connection', (socket: Socket) => {
    let currentRoomId: number | null = null
    let currentAddress: string | null = null

    socket.on('join_lobby', (data: { roomId: number; walletAddress: string; maxPlayers?: number }) => {
      const { roomId, walletAddress } = data
      const room = roomManager.getRoom(roomId)

      if (!room) {
        roomManager.createRoom(roomId, walletAddress, data.maxPlayers ?? 4)
      }

      const created = roomManager.addPlayer(roomId, walletAddress)
      if (!created) {
        socket.emit('error', { message: 'Room is full' })
        return
      }

      currentRoomId = roomId
      currentAddress = walletAddress

      socket.join(`room:${roomId}`)

      const existingRoom = roomManager.getRoom(roomId)
      if (existingRoom) {
        existingRoom.players.forEach((p) => {
          if (p.disconnectTimer) {
            clearTimeout(p.disconnectTimer)
            p.disconnectTimer = null
          }
        })
        roomManager.setPlayerConnected(roomId, walletAddress, true)
      }

      roomManager.addBots(roomId)
      io.to(`room:${roomId}`).emit('lobby_update', roomManager.getLobbyState(roomId))

      checkAutoStart(io, roomId)
    })

    socket.on('toggle_ready', (data: { roomId: number; walletAddress: string }) => {
      const { roomId, walletAddress } = data
      const ok = roomManager.toggleReady(roomId, walletAddress)
      if (!ok) return

      io.to(`room:${roomId}`).emit('lobby_update', roomManager.getLobbyState(roomId))

      checkAutoStart(io, roomId)
    })

    socket.on('progress_update', (data: { roomId: number; walletAddress: string; charsCorrect: number; wpm: number }) => {
      const { roomId, walletAddress, charsCorrect, wpm } = data
      roomManager.updateProgress(roomId, walletAddress, charsCorrect, wpm)

      socket.to(`room:${roomId}`).emit('progress_update', {
        walletAddress,
        charsCorrect,
        wpm,
      })
    })

    socket.on('player_finished', (data: { roomId: number; walletAddress: string; finishTimeMs: number }) => {
      const { roomId, walletAddress } = data
      const serverFinishTime = Date.now()
      const allDone = roomManager.playerFinished(roomId, walletAddress, serverFinishTime)

      io.to(`room:${roomId}`).emit('player_finished_event', { walletAddress, finishTimeMs: serverFinishTime })

      if (allDone) {
        finalizeRace(io, roomId)
      }
    })

    socket.on('disconnect', () => {
      if (currentRoomId && currentAddress) {
        const room = roomManager.getRoom(currentRoomId)
        if (!room || room.status === 'FINISHED') return

        roomManager.setPlayerConnected(currentRoomId, currentAddress, false)

        const timer = setTimeout(() => {
          io.to(`room:${currentRoomId}`).emit('lobby_update', roomManager.getLobbyState(currentRoomId!))
        }, 30000)
        roomManager.setDisconnectTimer(currentRoomId, currentAddress, timer)

        io.to(`room:${currentRoomId}`).emit('player_disconnected', {
          walletAddress: currentAddress,
          message: 'Player disconnected. Waiting for reconnect...',
        })
      }
    })
  })

  setInterval(() => {
    const rooms = (io.sockets as any).adapter?.rooms instanceof Map
      ? [...((io.sockets as any).adapter.rooms as Map<string, Set<string>>).keys()]
      : []
    // No-op: periodic cleanup could go here
  }, 60000)
}

function checkAutoStart(io: Server, roomId: number): void {
  const room = roomManager.getRoom(roomId)
  if (!room || room.status !== 'LOBBY') return

  if (roomManager.allReady(roomId)) {
    roomManager.startCountdown(roomId)

    io.to(`room:${roomId}`).emit('countdown_start', { startsInMs: 4000 })

    setTimeout(() => {
      roomManager.startRace(roomId)

      const state = roomManager.getLobbyState(roomId)
      io.to(`room:${roomId}`).emit('race_start', {
        passageIndex: room.passageIndex,
        startTimestamp: room.startTimestamp,
        maxDurationMs: room.maxDurationMs,
        players: state?.players ?? [],
      })

      startBotSimulation(io, roomId)
    }, 4000)
  }
}

const BOT_NAMES = ['0xB07A...A1fa', '0xB07B...B3tA', '0xB07G...G4mM']

function startBotSimulation(io: Server, roomId: number): void {
  const room = roomManager.getRoom(roomId)
  if (!room) return

  const passageLength = 130

  let botIndex = 0
  room.players.forEach((player, addr) => {
    if (!roomManager.isBot(addr)) return

    const totalChars = passageLength
    const wpm = 35 + Math.random() * 40
    const totalTimeMs = ((totalChars / 5) / wpm) * 60000
    const tickInterval = 300 + Math.random() * 400
    const startTime = room.startTimestamp ?? Date.now()
    const botName = BOT_NAMES[botIndex % BOT_NAMES.length]
    botIndex++

    const timer = setInterval(() => {
      const currentRoom = roomManager.getRoom(roomId)
      if (!currentRoom || currentRoom.status !== 'RACING') {
        clearInterval(timer)
        return
      }

      const elapsed = Date.now() - startTime
      const progress = Math.min(1, elapsed / totalTimeMs)
      const charsCorrect = Math.floor(progress * totalChars)
      const currentWpm = elapsed > 0 ? (charsCorrect / 5) / (elapsed / 60000) : 0

      roomManager.updateProgress(roomId, addr, charsCorrect, Math.round(currentWpm))

      io.to(`room:${roomId}`).emit('progress_update', {
        walletAddress: addr,
        charsCorrect,
        wpm: Math.round(currentWpm),
        progress,
      })

      if (progress >= 1) {
        clearInterval(timer)
        const finishTime = Date.now()
        const allDone = roomManager.playerFinished(roomId, addr, finishTime)
        io.to(`room:${roomId}`).emit('player_finished_event', { walletAddress: addr, finishTimeMs: finishTime })

        if (allDone) {
          finalizeRace(io, roomId)
        }
      }
    }, tickInterval)
  })
}

async function finalizeRace(io: Server, roomId: number): Promise<void> {
  const room = roomManager.getRoom(roomId)
  if (!room || room.submitted) return

  const ranking = roomManager.getRanking(roomId)

  roomManager.markSubmitted(roomId)

  try {
    const txHash = await submitResultToContract(roomId, ranking)

    io.to(`room:${roomId}`).emit('race_finished', {
      ranking: ranking.map((addr, i) => ({
        address: addr,
        rank: i + 1,
      })),
      txHash,
      status: 'confirmed',
    })
  } catch (err: any) {
    console.error(`[submitResult] Failed for room ${roomId}:`, err.message)

    io.to(`room:${roomId}`).emit('race_finished', {
      ranking: ranking.map((addr, i) => ({
        address: addr,
        rank: i + 1,
      })),
      txHash: null,
      status: 'failed',
      error: err.shortMessage || err.message || 'Transaction failed',
    })
  }
}