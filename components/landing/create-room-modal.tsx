'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Plus, X, AlertTriangle } from 'lucide-react'
import { useAccount, useEnsName, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther, decodeEventLog } from 'viem'
import { TYPERACE_PVP_ADDRESS, TYPERACE_PVP_ABI } from '@/lib/web3/abi'

const API_BASE = ''

interface CreateRoomModalProps {
  open: boolean
  onClose: () => void
}

export function CreateRoomModal({ open, onClose }: CreateRoomModalProps) {
  const router = useRouter()
  const { address } = useAccount()
  const { data: ensName } = useEnsName({ address })

  const [stakeAmount, setStakeAmount] = useState('0.1')
  const [maxPlayers, setMaxPlayers] = useState('2')
  const [existingRoomId, setExistingRoomId] = useState<number | null>(null)
  const [checkingExisting, setCheckingExisting] = useState(false)

  const { data: hash, isPending, writeContract, error: writeError } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed, data: receipt } =
    useWaitForTransactionReceipt({ hash })

  const [actualRoomId, setActualRoomId] = useState<number | null>(null)
  const playerName = ensName ?? (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Anon')

  useEffect(() => {
    if (open && address) {
      setCheckingExisting(true)
      setExistingRoomId(null)
      fetch(`/api/active-room?address=${address}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.activeRoomId !== null) {
            setExistingRoomId(data.activeRoomId)
          }
        })
        .catch(() => {})
        .finally(() => setCheckingExisting(false))
    }
  }, [open, address])

  useEffect(() => {
    if (isConfirmed && receipt) {
      let foundRoomId: number | null = null
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: TYPERACE_PVP_ABI,
            data: log.data,
            topics: log.topics,
          })
          if (decoded.eventName === 'RoomCreated') {
            foundRoomId = Number((decoded.args as any).roomId)
            break
          }
        } catch {
          // not our event
        }
      }

      if (foundRoomId !== null) {
        setActualRoomId(foundRoomId)
        const encodedName = encodeURIComponent(playerName)
        const timer = setTimeout(() => {
          onClose()
          router.push(
            `/room/${foundRoomId}?name=${encodedName}&host=true&max=${maxPlayers}&stake=${stakeAmount}`,
          )
        }, 1200)
        return () => clearTimeout(timer)
      } else {
        console.error('Could not find RoomCreated event in receipt logs!', receipt.logs)
      }
    }
  }, [isConfirmed, receipt, onClose, router, playerName, maxPlayers, stakeAmount])

  useEffect(() => {
    if (!open) {
      setStakeAmount('0.1')
      setMaxPlayers('2')
      setActualRoomId(null)
      setExistingRoomId(null)
    }
  }, [open])

  const handleCreate = useCallback(() => {
    if (isPending || isConfirming) return
    try {
      const stakeWei = parseEther(stakeAmount)
      const players = parseInt(maxPlayers)
      if (players < 2 || players > 4) return
      writeContract({
        address: TYPERACE_PVP_ADDRESS,
        abi: TYPERACE_PVP_ABI,
        functionName: 'createRoom',
        args: [stakeWei, players],
      })
    } catch (err) {
      console.error(err)
    }
  }, [stakeAmount, maxPlayers, isPending, isConfirming, writeContract])

  const isBusy = isPending || isConfirming || (isConfirmed && actualRoomId === null)
  const showExistingRoom = existingRoomId !== null && !checkingExisting && !isConfirmed

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
                <h3 className="text-lg font-semibold text-foreground mb-1">Room Created!</h3>
                <p className="text-sm text-muted-foreground">
                  Room #{actualRoomId ?? '...'}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">Redirecting to lobby...</p>
              </div>
            ) : showExistingRoom ? (
              <>
                <div className="mb-6">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-amber/[0.06] ring-1 ring-amber/8 mb-3">
                    <AlertTriangle className="size-5 text-amber-600" />
                  </div>
                  <h2 className="font-mono text-xl font-bold tracking-tight">Active Room Found</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    You already have an active room. Finish or leave it before creating a new one.
                  </p>
                </div>
                <button
                  onClick={() => {
                    onClose()
                    router.push(`/room/${existingRoomId}`)
                  }}
                  className="group relative w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-sm font-semibold text-white shadow-[0_2px_12px_rgba(45,59,255,0.2)] transition-all duration-300 hover:shadow-[0_4px_18px_rgba(45,59,255,0.3)] hover:-translate-y-0.5 active:translate-y-0"
                >
                  Go to Room #{existingRoomId}
                </button>
              </>
            ) : checkingExisting ? (
              <div className="py-12 flex items-center justify-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/[0.06] ring-1 ring-primary/8 mb-3">
                    <Plus className="size-5 text-primary" />
                  </div>
                  <h2 className="font-mono text-xl font-bold tracking-tight">Create Room</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Set stake and player count. You&apos;ll race as{' '}
                    <span className="font-mono text-xs text-foreground">{playerName}</span>
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block mb-1.5 font-mono text-[11px] font-bold tracking-[0.16em] text-muted-foreground uppercase">
                      Stake (MON)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm font-medium outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                    />
                  </div>

                  <div>
                    <label className="block mb-1.5 font-mono text-[11px] font-bold tracking-[0.16em] text-muted-foreground uppercase">
                      Max Players
                    </label>
                    <select
                      value={maxPlayers}
                      onChange={(e) => setMaxPlayers(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm font-medium outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/10 appearance-none"
                    >
                      <option value="2">2 Players</option>
                      <option value="3">3 Players</option>
                      <option value="4">4 Players</option>
                    </select>
                  </div>

                  {writeError && (
                    <div className="rounded-xl border border-destructive/20 bg-destructive/[0.04] px-4 py-3">
                      <p className="text-xs text-destructive break-words">
                        {(writeError as any).shortMessage || writeError.message}
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handleCreate}
                    disabled={isBusy}
                    className="group relative w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-sm font-semibold text-white shadow-[0_2px_12px_rgba(45,59,255,0.2)] transition-all duration-300 hover:shadow-[0_4px_18px_rgba(45,59,255,0.3)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[0_2px_12px_rgba(45,59,255,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    {isBusy ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        {isPending ? 'Confirm in wallet...' : isConfirming ? 'Waiting confirmation...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                        <Plus className="size-4" />
                        Create Room
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}