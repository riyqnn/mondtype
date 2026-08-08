'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { KeyRound, Plus, Zap, Shield, Flame, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useEnsName, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther } from 'viem'
import { TYPERACE_PVP_ADDRESS, TYPERACE_PVP_ABI } from '@/lib/web3/abi'

interface LandingScreenProps {
  onCreate: (name: string, txHash: string, roomId?: string) => void
  onJoin: (name: string, roomId: string, txHash: string) => void
}

export function LandingScreen({ onCreate, onJoin }: LandingScreenProps) {
  const [name, setName] = useState('')
  const [roomIdInput, setRoomIdInput] = useState('')
  const [stakeAmount, setStakeAmount] = useState('0.1')
  const [maxPlayers, setMaxPlayers] = useState('2')
  const [mode, setMode] = useState<'create' | 'join'>('create')
  
  const { address, isConnected } = useAccount()
  const { data: ensName } = useEnsName({ address })

  const { data: hash, isPending, writeContract, error: writeError } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess: isConfirmed, data: receipt } = 
    useWaitForTransactionReceipt({ hash })

  useEffect(() => {
    if (isConnected && !name) {
      if (ensName) setName(ensName)
      else if (address) setName(`${address.slice(0, 6)}...${address.slice(-4)}`)
    }
  }, [isConnected, address, ensName, name])

  useEffect(() => {
    if (isConfirmed && receipt) {
      // In a real app we'd decode the RoomCreated event to get the actual Room ID
      // For now we pass the txHash so the app can transition to a loading state
      if (mode === 'create') {
        onCreate(name || 'Anon', receipt.transactionHash, 'pending')
      } else {
        onJoin(name || 'Anon', roomIdInput, receipt.transactionHash)
      }
    }
  }, [isConfirmed, receipt, mode, name, roomIdInput, onCreate, onJoin])

  const submit = () => {
    if (mode === 'create') {
      try {
        const stakeWei = parseEther(stakeAmount)
        const players = parseInt(maxPlayers)
        if (players < 2 || players > 4) return alert("Players must be 2-4")
        writeContract({
          address: TYPERACE_PVP_ADDRESS,
          abi: TYPERACE_PVP_ABI,
          functionName: 'createRoom',
          args: [stakeWei, players],
        })
      } catch (err) {
        console.error(err)
      }
    } else {
      try {
        const stakeWei = parseEther(stakeAmount) // Must match room's stake
        const id = BigInt(roomIdInput)
        writeContract({
          address: TYPERACE_PVP_ADDRESS,
          abi: TYPERACE_PVP_ABI,
          functionName: 'joinRoom',
          args: [id],
          value: stakeWei,
        })
      } catch (err) {
        console.error(err)
      }
    }
  }

  const joinValid = roomIdInput.length > 0 && !isNaN(Number(roomIdInput))
  const isBusy = isPending || isConfirming

  return (
    <div className="relative mx-auto w-full max-w-5xl pt-8 pb-20">
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-full h-[400px] max-w-3xl bg-primary/20 blur-[140px] rounded-full pointer-events-none" />
      
      <div className="relative z-10 grid gap-12 lg:grid-cols-[1.1fr_420px] items-center">
        
        {/* Left Column */}
        <div className="flex flex-col justify-center space-y-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 text-xs font-semibold border rounded-full border-primary/30 bg-primary/10 text-primary backdrop-blur-md shadow-[0_0_15px_rgba(var(--primary),0.15)] uppercase tracking-widest">
              <span className="relative flex size-2">
                <span className="absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping bg-primary" />
                <span className="relative inline-flex rounded-full size-2 bg-primary" />
              </span>
              Live on Monad Testnet
            </div>
            <h1 className="text-5xl font-black tracking-tighter sm:text-6xl md:text-7xl lg:text-8xl bg-clip-text text-transparent bg-gradient-to-b from-foreground via-foreground/90 to-muted-foreground drop-shadow-sm leading-[1.1]">
              Type.<br/>Race.<br/>Earn.
            </h1>
            <p className="max-w-[420px] mt-6 text-lg text-muted-foreground leading-relaxed">
              The premier Web3 typing arena built on Monad. Stake MON, out-type your opponents, and claim the prize pool with sub-second finality.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.6 }} className="grid grid-cols-2 gap-4 max-w-[420px]">
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-card/40 border border-border/50 backdrop-blur-md shadow-sm">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary shadow-[0_0_15px_rgba(var(--primary),0.2)]">
                <Zap className="size-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-tight text-foreground">Ultra Fast</h3>
                <p className="text-xs text-muted-foreground mt-1">Powered by parallel EVM execution</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-card/40 border border-border/50 backdrop-blur-md shadow-sm">
              <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.2)]">
                <Flame className="size-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-tight text-foreground">High Stakes</h3>
                <p className="text-xs text-muted-foreground mt-1">Winner takes the entire MON pot</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Column */}
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1, type: "spring", stiffness: 200, damping: 20 }} className="relative">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-card/40 p-8 shadow-2xl backdrop-blur-2xl ring-1 ring-white/5">
            <div className="absolute -top-24 -right-24 size-48 bg-primary/20 blur-[60px] rounded-full pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 size-48 bg-purple-500/10 blur-[60px] rounded-full pointer-events-none" />
            
            <div className="relative z-10 flex flex-col items-center mb-8">
              <div className="mb-6 w-full flex justify-center scale-[1.05]">
                <ConnectButton showBalance={false} chainStatus="icon" />
              </div>
              <div className="w-full h-px bg-gradient-to-r from-transparent via-border/80 to-transparent" />
            </div>

            {isConnected ? (
              <div className="relative z-10 space-y-6">
                <div className="inline-flex w-full p-1.5 rounded-2xl bg-background/50 backdrop-blur-xl border border-border/50 shadow-inner">
                  <button onClick={() => setMode('create')} className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors duration-300 ${mode === 'create' ? 'bg-card text-foreground shadow-md ring-1 ring-border/80' : 'bg-card/0 text-muted-foreground hover:text-foreground hover:bg-card/30'}`}>Create Match</button>
                  <button onClick={() => setMode('join')} className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors duration-300 ${mode === 'join' ? 'bg-card text-foreground shadow-md ring-1 ring-border/80' : 'bg-card/0 text-muted-foreground hover:text-foreground hover:bg-card/30'}`}>Join Match</button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="name" className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Racer Identity</label>
                    <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Anon" maxLength={16} className="w-full rounded-2xl border border-input/50 bg-background/40 px-4 py-3 text-sm font-medium outline-none transition-all focus:bg-background/80 focus:ring-2 focus:ring-primary/30 focus:border-primary shadow-sm" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Stake (MON)</label>
                      <input type="number" step="0.01" value={stakeAmount} onChange={(e) => setStakeAmount(e.target.value)} className="w-full rounded-2xl border border-input/50 bg-background/40 px-4 py-3 text-sm font-medium outline-none transition-all focus:bg-background/80 focus:ring-2 focus:ring-primary/30 focus:border-primary shadow-sm" />
                    </div>
                    {mode === 'create' && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Max Players</label>
                        <select value={maxPlayers} onChange={(e) => setMaxPlayers(e.target.value)} className="w-full rounded-2xl border border-input/50 bg-background/40 px-4 py-3 text-sm font-medium outline-none transition-all focus:bg-background/80 focus:ring-2 focus:ring-primary/30 focus:border-primary shadow-sm appearance-none">
                          <option value="2">2 Players</option>
                          <option value="3">3 Players</option>
                          <option value="4">4 Players</option>
                        </select>
                      </div>
                    )}
                    {mode === 'join' && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Room ID</label>
                        <input value={roomIdInput} onChange={(e) => setRoomIdInput(e.target.value)} placeholder="1" className="w-full rounded-2xl border border-input/50 bg-background/40 px-4 py-3 text-sm font-medium outline-none transition-all focus:bg-background/80 focus:ring-2 focus:ring-primary/30 focus:border-primary shadow-sm" />
                      </div>
                    )}
                  </div>
                  
                  {writeError && (
                    <p className="text-xs text-destructive mt-2 break-words">{(writeError as any).shortMessage || writeError.message}</p>
                  )}

                  <Button size="lg" className="w-full h-14 mt-4 text-base font-bold rounded-2xl shadow-[0_0_20px_rgba(var(--primary),0.2)] hover:shadow-[0_0_30px_rgba(var(--primary),0.4)] transition-all duration-300 group overflow-hidden relative" onClick={submit} disabled={(mode === 'join' && !joinValid) || isBusy}>
                    <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[100%] group-hover:animate-[shimmer_1.5s_infinite]" />
                    {isBusy ? (
                      <><Loader2 className="size-5 mr-2 animate-spin" /> {isPending ? 'Confirming in Wallet...' : 'Waiting for Tx...'}</>
                    ) : mode === 'create' ? (
                      <><Plus className="size-5 mr-2 transition-transform duration-300 group-hover:rotate-90" /> Initialize Lobby</>
                    ) : (
                      <><KeyRound className="size-5 mr-2 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-12" /> Enter Arena</>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="relative z-10 flex flex-col items-center justify-center py-10 text-center space-y-4">
                <div className="size-20 rounded-3xl bg-muted/30 border border-border/30 flex items-center justify-center mb-2 shadow-inner">
                  <Shield className="size-10 text-muted-foreground/60" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Authentication Required</h3>
                <p className="text-sm text-muted-foreground max-w-[260px] leading-relaxed">
                  Connect your Web3 wallet to access the arena, stake MON, and start racing.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
