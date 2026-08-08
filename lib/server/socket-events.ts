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
      const { roomId, walletAddress, finishTimeMs } = data
      const allDone = roomManager.playerFinished(roomId, walletAddress, finishTimeMs)

      io.to(`room:${roomId}`).emit('player_finished_event', { walletAddress, finishTimeMs })

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
    }, 4000)
  }
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