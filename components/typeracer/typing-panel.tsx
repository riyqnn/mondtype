'use client'

import { useEffect, useRef, type ChangeEvent, type ClipboardEvent } from 'react'
import { Gauge, Target } from 'lucide-react'
import type { PlayerStats } from '@/lib/typeracer/types'

interface TypingPanelProps {
  passage: string
  typedCount: number
  hasError: boolean
  stats: PlayerStats
  active: boolean
  onInput: (value: string) => void
}

export function TypingPanel({
  passage,
  typedCount,
  hasError,
  stats,
  active,
  onInput,
}: TypingPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus when the race becomes active.
  useEffect(() => {
    if (active) inputRef.current?.focus()
  }, [active])

  const focusInput = () => inputRef.current?.focus()

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onInput(e.target.value)
    // Keep the controlled input from accumulating: we only care about the
    // latest attempt char, so clear it back to empty after each keystroke.
    e.target.value = ''
  }

  const chars = passage.split('')

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Gauge className="size-4 text-primary" />
          <span className="font-mono text-2xl font-bold tabular-nums" style={{ width: '4ch' }}>
            {Math.round(stats.wpm)}
          </span>
          <span className="text-sm text-muted-foreground">wpm</span>
        </div>
        <div className="flex items-center gap-2">
          <Target className="size-4 text-highlight" />
          <span className="font-mono text-2xl font-bold tabular-nums" style={{ width: '5ch' }}>
            {Math.round(stats.accuracy)}%
          </span>
          <span className="text-sm text-muted-foreground">acc</span>
        </div>
      </div>

      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
      <div
        onClick={focusInput}
        className={`relative cursor-text select-none rounded-lg border-2 bg-muted/40 p-4 font-mono text-lg leading-relaxed tracking-wide transition-colors sm:text-xl ${
          hasError ? 'border-destructive' : 'border-transparent'
        }`}
      >
        {chars.map((char, i) => {
          const isTyped = i < typedCount
          const isCurrent = i === typedCount
          return (
            <span
              key={i}
              className={
                isTyped
                  ? 'text-muted-foreground'
                  : isCurrent
                    ? hasError
                      ? 'rounded-sm bg-destructive/15 text-destructive underline decoration-2 underline-offset-4'
                      : 'text-foreground'
                    : 'text-foreground/35'
              }
            >
              {isCurrent && !hasError && (
                <span className="animate-caret absolute -left-px top-0 h-full w-0.5 bg-foreground" aria-hidden />
              )}
              {char}
            </span>
          )
        })}

        <input
          ref={inputRef}
          type="text"
          value=""
          onChange={handleChange}
          onPaste={(e: ClipboardEvent) => e.preventDefault()}
          disabled={!active}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label="Typing input"
          className="absolute inset-0 h-full w-full cursor-text opacity-0"
        />
      </div>

      {hasError && (
        <p className="mt-2 text-sm font-medium text-destructive">
          Wrong key — fix it to continue. You can&apos;t skip ahead.
        </p>
      )}

      {/* Personal progress bar */}
      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-xs font-medium text-muted-foreground">
          <span>Your progress</span>
          <span className="tabular-nums">{Math.round(stats.progress * 100)}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
            style={{ width: `${stats.progress * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
