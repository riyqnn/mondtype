'use client'

import { useCallback } from 'react'
import { motion } from 'framer-motion'
import { Medal, RotateCcw, Trophy, Loader2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { TYPERACE_PVP_ADDRESS, TYPERACE_PVP_ABI } from '@/lib/web3/abi'
import type { RaceResult } from '@/lib/typeracer/types'

interface ResultsPodiumProps {
  results: RaceResult[]
  roomCode: string | null
  stakeAmount?: string
  playerCount: number
  onRaceAgain: () => void
}

function getPrizeDistribution(playerCount: number) {
  if (playerCount === 2) return [90, 10]
  if (playerCount === 3) return [60, 40, 0]
  return [50, 30, 20, 0]
}

export function ResultsPodium({
  results,
  roomCode,
  stakeAmount,
  playerCount,
  onRaceAgain,
}: ResultsPodiumProps) {
  const { address } = useAccount()
  const winner = results[0]
  const stake = stakeAmount ? parseFloat(stakeAmount) : 0.1
  const totalPot = stake * playerCount
  const platformFee = totalPot * 0.05
  const netPot = totalPot - platformFee
  const distribution = getPrizeDistribution(playerCount)

  const rankedAddresses = results
    .filter((r) => r.isSelf && address)
    .map((r) => address as `0x${string}`)

  const { data: hash, isPending, writeContract } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed, data: receipt } =
    useWaitForTransactionReceipt({ hash })

  const handleClaim = useCallback(() => {
    if (!roomCode || rankedAddresses.length === 0) return
    writeContract({
      address: TYPERACE_PVP_ADDRESS,
      abi: TYPERACE_PVP_ABI,
      functionName: 'submitResult',
      args: [BigInt(roomCode), rankedAddresses],
    })
  }, [roomCode, rankedAddresses, writeContract])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto w-full max-w-lg space-y-6"
    >
      <div className="text-center">
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 14 }}
          className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-primary text-white shadow-lg"
        >
          <Trophy className="size-7" />
        </motion.div>
        <h2 className="font-mono text-2xl font-bold tracking-tight">
          {winner?.isSelf ? 'You won!' : `${winner?.name ?? 'Nobody'} wins!`}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Final standings</p>
      </div>

      <ul className="space-y-2">
        {results.map((r, i) => {
          const prizePct = distribution[i] ?? 0
          const prize = (netPot * prizePct) / 100
          return (
            <motion.li
              key={r.playerId}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06, type: 'spring', stiffness: 240, damping: 22 }}
              className={`flex items-center gap-3 rounded-xl border bg-white p-4 shadow-sm ${
                r.isSelf ? 'border-primary/30 ring-1 ring-primary/10' : 'border-border/60'
              }`}
            >
              <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                r.place === 1
                  ? 'bg-primary text-white'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {r.place <= 3 ? <Medal className="size-4" /> : r.place}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                  <span className="truncate">{r.name}</span>
                  {r.isSelf && <span className="text-muted-foreground font-normal text-xs">(you)</span>}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-mono text-base font-bold tabular-nums">{r.wpm}</p>
                <p className="text-[10px] text-muted-foreground">wpm</p>
              </div>
              {prizePct > 0 && (
                <div className="text-right shrink-0 min-w-[60px]">
                  <p className="font-mono text-sm font-semibold text-success tabular-nums">
                    {prize.toFixed(3)}
                  </p>
                  <p className="text-[10px] text-success/70">{prizePct}% MON</p>
                </div>
              )}
            </motion.li>
          )
        })}
      </ul>

      <div className="rounded-xl border border-border/60 bg-white p-5 shadow-sm">
        <h3 className="font-mono text-xs font-bold tracking-[0.15em] text-muted-foreground uppercase mb-3">
          Prize Pool
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total pot</span>
            <span className="font-mono font-semibold tabular-nums">{totalPot.toFixed(3)} MON</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Platform fee (5%)</span>
            <span className="font-mono text-muted-foreground tabular-nums">-{platformFee.toFixed(3)} MON</span>
          </div>
          <div className="flex justify-between border-t border-border/40 pt-2">
            <span className="font-semibold">Net pot</span>
            <span className="font-mono font-bold tabular-nums">{netPot.toFixed(3)} MON</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        {!isConfirmed && roomCode && rankedAddresses.length > 0 && (
          <Button
            size="lg"
            className="flex-1 rounded-xl font-semibold text-sm"
            onClick={handleClaim}
            disabled={isPending || isConfirming}
          >
            {isPending || isConfirming ? (
              <><Loader2 className="size-4 animate-spin" /> Claiming...</>
            ) : (
              <>Claim Prize</>
            )}
          </Button>
        )}
        {isConfirmed && receipt && (
          <a
            href={`https://testnet.monadscan.com/tx/${receipt.transactionHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-success/10 px-4 py-3 text-sm font-semibold text-success hover:bg-success/15 transition-colors"
          >
            <ExternalLink className="size-4" /> View on MonadScan
          </a>
        )}
        <Button
          variant="outline"
          size="lg"
          className="flex-1 rounded-xl font-semibold text-sm"
          onClick={onRaceAgain}
        >
          <RotateCcw className="size-4" />
          Race Again
        </Button>
      </div>
    </motion.div>
  )
}