'use client'

import { Zap } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-border mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-col items-center justify-between gap-5 sm:flex-row">
        <div className="flex items-center gap-2.5 font-mono text-sm font-semibold tracking-tight text-muted-foreground">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary/10">
            <Zap className="size-3.5 text-primary" />
          </div>
          MondType
        </div>

        <div className="flex items-center gap-8">
          <a
            href="#"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Discord
          </a>
          <a
            href="#"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Twitter
          </a>
        </div>
      </div>

      <p className="mt-6 text-center text-[11px] text-muted-foreground/40">
        Testnet only — MON testnet token tidak bernilai nyata.
      </p>
    </footer>
  )
}