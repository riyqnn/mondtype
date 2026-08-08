import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { setupSocketEvents } from './lib/server/socket-events'
import { roomManager } from './lib/server/room-manager'

const app = express()
const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://mondtype.vercel.app',
    ],
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

setupSocketEvents(io)

app.get('/api/check-room', (req, res) => {
  const roomId = parseInt(req.query.roomId as string, 10)
  if (isNaN(roomId) || roomId < 1) {
    res.status(400).json({ joinable: false, reason: 'Invalid room ID' })
    return
  }

  const room = roomManager.getRoom(roomId)
  if (!room) {
    res.json({ joinable: true, reason: 'Room not yet created on server' })
    return
  }

  if (room.status === 'FINISHED') {
    res.json({ joinable: false, reason: 'Room already finished' })
    return
  }
  if (room.players.size >= room.maxPlayers) {
    res.json({ joinable: false, reason: 'Room is full' })
    return
  }
  if (room.status === 'RACING') {
    res.json({ joinable: false, reason: 'Race already started' })
    return
  }

  res.json({
    joinable: true,
    stakeAmount: room.stakeAmount.toString(),
    playerCount: room.players.size,
    maxPlayers: room.maxPlayers,
  })
})

app.get('/api/active-room', (req, res) => {
  const address = req.query.address as string
  if (!address) {
    res.json({ activeRoomId: null })
    return
  }

  const activeId = roomManager.getActiveRoomForWallet(address)
  if (activeId !== null) {
    const room = roomManager.getRoom(activeId)
    if (room && room.status !== 'FINISHED') {
      res.json({ activeRoomId: activeId })
      return
    }
  }

  res.json({ activeRoomId: null })
})

app.get('/', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() })
})

const PORT = parseInt(process.env.PORT || '3001', 10)

httpServer.listen(PORT, () => {
  console.log(`> Socket.io server ready on http://localhost:${PORT}`)
})