'use client'

import { useState } from 'react'
import { motion, useScroll, useMotionValueEvent } from 'framer-motion'
import { Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import { CreateRoomModal } from './create-room-modal'
import { JoinRoomModal } from './join-room-modal'

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [joinModalOpen, setJoinModalOpen] = useState(false)
  const { isConnected } = useAccount()
  const { scrollY } = useScroll()

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setScrolled(latest > 40)
  })

  return (
    <>
      <motion.header
        className="fixed top-0 left-0 right-0 z-50 h-16"
        animate={
          scrolled
            ? {
                backgroundColor: 'rgba(250,249,246,0.78)',
                backdropFilter: 'blur(24px) saturate(180%)',
                borderBottom: '1px solid rgba(0,0,0,0.06)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              }
            : {
                backgroundColor: 'rgba(250,249,246,0)',
                backdropFilter: 'blur(0px)',
                borderBottom: '1px solid transparent',
                boxShadow: 'none',
              }
        }
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
          <a href="/" className="flex items-center gap-2.5 group select-none">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary shadow-[0_2px_8px_rgba(45,59,255,0.2)] transition-shadow duration-300 group-hover:shadow-[0_4px_14px_rgba(45,59,255,0.3)]">
              <Zap className="size-4 text-white" />
            </div>
            <span className="font-mono text-base font-semibold tracking-tight">
              MondType
            </span>
          </a>

          <div className="flex items-center gap-2.5">
            <div className="relative group/tooltip">
              <Button
                size="sm"
                className="bg-primary text-white hover:bg-primary/90 font-medium rounded-xl shadow-[0_2px_8px_rgba(45,59,255,0.15)] hover:shadow-[0_4px_16px_rgba(45,59,255,0.25)] transition-all duration-300"
                disabled={!isConnected}
                onClick={() => setCreateModalOpen(true)}
              >
                Create Room
              </Button>
              {!isConnected && (
                <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-white border border-border px-3 py-1.5 text-xs text-muted-foreground opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none shadow-lg z-50">
                  Connect wallet dulu
                </span>
              )}
            </div>

            <div className="relative group/tooltip">
              <Button
                variant="ghost"
                size="sm"
                className="border border-border text-muted-foreground hover:text-foreground hover:border-foreground/15 hover:bg-muted/60 font-medium rounded-xl transition-all duration-200"
                disabled={!isConnected}
                onClick={() => setJoinModalOpen(true)}
              >
                Join Room
              </Button>
              {!isConnected && (
                <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-white border border-border px-3 py-1.5 text-xs text-muted-foreground opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none shadow-lg z-50">
                  Connect wallet dulu
                </span>
              )}
            </div>

            <div className="scale-[0.9] origin-right [&_button]:!rounded-xl">
              <ConnectButton
                showBalance={false}
                chainStatus="icon"
                label="Connect Wallet"
              />
            </div>
          </div>
        </div>
      </motion.header>

      <CreateRoomModal open={createModalOpen} onClose={() => setCreateModalOpen(false)} />
      <JoinRoomModal open={joinModalOpen} onClose={() => setJoinModalOpen(false)} />
    </>
  )
}