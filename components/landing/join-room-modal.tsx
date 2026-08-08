'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, KeyRound, X, AlertTriangle } from 'lucide-react'
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { formatEther } from 'viem'
import { TYPERACE_PVP_ADDRESS, TYPERACE_PVP_ABI } from '@/lib/web3/abi'

interface JoinRoomModalProps {
  open: boolean
  onClose: () => void
}

export function JoinRoomModal({ open, onClose }: JoinRoomModalProps) {
  const router = useRouter()
  const [roomId, setRoomId] = useState('')
  const [roomCheckResult, setRoomCheckResult] = useState<{
    joinable: boolean
    reason?: string
    stakeAmount?: string
    playerCount?: number
    maxPlayers?: number
  } | null>(null)
  const [checkingRoom, setCheckingRoom] = useState(false)

  const roomIdNum = roomId && !isNaN(Number(roomId)) && Number(roomId) > 0 ? BigInt(roomId) : undefined

  const { data: roomInfo } = useReadContract({
    address: TYPERACE_PVP_ADDRESS,
    abi: TYPERACE_PVP_ABI,
    functionName: 'getRoomInfo',
    args: roomIdNum !== undefined ? [roomIdNum] : undefined,
    query: { enabled: roomIdNum !== undefined, staleTime: 3000 },
  })

  const { data: hash, isPending, writeContract, error: writeError, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed, data: receipt } =
    useWaitForTransactionReceipt({ hash })

  const maxFromRoom = roomInfo ? Number((roomInfo as any)[2]) : 4

  useEffect(() => {
    if (!roomId || isNaN(Number(roomId)) || Number(roomId) < 1) {
      setRoomCheckResult(null)
      return
    }

    const handler = setTimeout(() => {
      setCheckingRoom(true)
      fetch(`/api/check-room?roomId=${roomId}`)
        .then((res) => res.json())
        .then((data) => setRoomCheckResult(data))
        .catch(() => setRoomCheckResult({ joinable: false, reason: 'Cannot reach server' }))
        .finally(() => setCheckingRoom(false))
    }, 500)

    return () => clearTimeout(handler)
  }, [roomId])

  useEffect(() => {
    if (isConfirmed && receipt && roomIdNum !== undefined) {
      const encodedName = encodeURIComponent('Player')
      const timer = setTimeout(() => {
        onClose()
        router.push(`/room/${roomId}?name=${encodedName}&host=false&max=${maxFromRoom}`)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [isConfirmed, receipt, onClose, router, roomId, roomIdNum, maxFromRoom])

  useEffect(() => {
    if (!open) {
      setRoomId('')
      setRoomCheckResult(null)
      setCheckingRoom(false)
      reset()
    }
  }, [open, reset])

  const handleJoin = useCallback(() => {
    if (roomIdNum === undefined || !roomInfo) return
    const stakeWei = (roomInfo as any)[1] as bigint
    writeContract({
      address: TYPERACE_PVP_ADDRESS,
      abi: TYPERACE_PVP_ABI,
      functionName: 'joinRoom',
      args: [roomIdNum],
      value: stakeWei,
    })
  }, [roomIdNum, roomInfo, writeContract])

  const isBusy = isPending || isConfirming
  const isValid = roomId.length > 0 && !isNaN(Number(roomId)) && Number(roomId) > 0
  const roomStake = roomInfo ? formatEther((roomInfo as any)[1] as bigint) : null
  const canJoin = roomCheckResult !== null && roomCheckResult.joinable

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={!isBusy ? onClose : undefined}
          />
          <motion.div
            className="relative z-10 w-full max-w-sm rounded-2xl border border-border/60 bg-white p-6 shadow-2xl sm:p-7"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {!isBusy && !isConfirmed && (
              <button
                type="button"
                onClick={onClose}
                className="absolute top-5 right-5 flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="size-4" />
              </button>
            )}

            {isConfirmed ? (
              <div className="py-8 text-center">
                <div className="flex size-16 mx-auto mb-4 items-center justify-center rounded-2xl bg-success/10">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    className="size-8 rounded-full bg-success flex items-center justify-center"
                  >
                    <svg className="size-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </motion.div>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">Joined!</h3>
                <p className="text-sm text-muted-foreground">Room #{roomId}</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Redirecting to lobby...</p>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); if (canJoin) handleJoin() }}>
                <div className="mb-6">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/[0.06] ring-1 ring-primary/8 mb-3">
                    <KeyRound className="size-5 text-primary" />
                  </div>
                  <h2 className="font-mono text-xl font-bold tracking-tight">Join Room</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Enter the room number (e.g. 1, 2, 3...)
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="join-room-id" className="block mb-1.5 font-mono text-[11px] font-bold tracking-[0.16em] text-muted-foreground uppercase">
                      Room Number
                    </label>
                    <input
                      id="join-room-id"
                      type="number"
                      min="1"
                      step="1"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value)}
                      placeholder="1"
                      className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm font-medium text-center outline-none transition-all placeholder:text-muted-foreground/30 focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                      autoFocus
                    />
                  </div>

                  {isValid && checkingRoom && (
                    <div className="rounded-xl border border-primary/10 bg-primary/[0.03] px-4 py-3 flex items-center justify-center gap-2">
                      <Loader2 className="size-3.5 animate-spin text-primary" />
                      <span className="text-xs text-muted-foreground">Checking room...</span>
                    </div>
                  )}

                  {roomCheckResult && !roomCheckResult.joinable && (
                    <div className="rounded-xl border border-destructive/20 bg-destructive/[0.04] px-4 py-3 flex items-center gap-2">
                      <AlertTriangle className="size-4 text-destructive shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-destructive">Cannot join</p>
                        <p className="text-xs text-destructive/70">{roomCheckResult.reason}</p>
                      </div>
                    </div>
                  )}

                  {roomCheckResult?.joinable && (
                    <div className="rounded-xl border border-success/20 bg-success/[0.04] px-4 py-3 text-center">
                      <p className="text-xs text-success font-medium mb-0.5">Room available</p>
                      {roomCheckResult.stakeAmount && (
                        <p className="font-mono text-sm font-semibold text-foreground">
                          {roomCheckResult.stakeAmount} MON
                        </p>
                      )}
                      {roomCheckResult.playerCount !== undefined && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {roomCheckResult.playerCount}/{roomCheckResult.maxPlayers} players
                        </p>
                      )}
                    </div>
                  )}

                  {roomStake && (
                    <div className="rounded-xl border border-primary/10 bg-primary/[0.03] px-4 py-3 text-center">
                      <span className="text-xs text-muted-foreground">Entry stake: </span>
                      <span className="font-mono text-sm font-semibold text-foreground">{roomStake} MON</span>
                    </div>
                  )}

                  {writeError && (
                    <div className="rounded-xl border border-destructive/20 bg-destructive/[0.04] px-4 py-3">
                      <p className="text-xs text-destructive break-words">
                        {(writeError as any).shortMessage || writeError.message}
                      </p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!isValid || !roomInfo || isBusy}
                    className="group relative w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-sm font-semibold text-white shadow-[0_2px_12px_rgba(45,59,255,0.2)] transition-all duration-300 hover:shadow-[0_4px_18px_rgba(45,59,255,0.3)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[0_2px_12px_rgba(45,59,255,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    {isBusy ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        {isPending ? 'Confirm in wallet...' : 'Waiting...'}
                      </>
                    ) : (
                      <>
                        <KeyRound className="size-4" />
                        Enter Room
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}