# MonadType

A multiplayer typing race dApp on Monad Testnet. Stake MON tokens, race against friends in real-time, and winners get paid out instantly via smart contracts.

## How It Works

1. **Connect Wallet** — Link your wallet to Monad Testnet
2. **Create Room** — Set stake amount and max players (2-4)
3. **Share Code** — Invite friends with your room code
4. **Race** — Type the passage as fast as you can
5. **Get Paid** — Winner takes the pot with sub-second settlement

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, Framer Motion |
| Realtime | Socket.io |
| Backend | Express, TypeScript |
| Blockchain | Solidity (Monad Testnet) |
| Wallet | RainbowKit, wagmi, viem |

## Architecture

```
VerCel                               Fly.io
mondtype.vercel.app                  mondtype.fly.dev
│                                    │
│  Next.js Pages                     │  Express + Socket.io
│  API routes (proxy) ───fetch───▶  │  /api/check-room
│  Socket.io-client ─────WS──────▶  │  Room manager
│                                    │  Oracle wallet
│                                    │
│  Wallet (wagmi) ────────TX──────▶ │  Smart contract
│                                    │  createRoom / joinRoom
│                                    │  submitResult
```

## Getting Started

### Prerequisites

- Node.js 24+
- pnpm 10+
- A wallet with Monad Testnet MON tokens

### Environment Variables

```env
NEXT_PUBLIC_WC_PROJECT_ID=your_reown_project_id
NEXT_PUBLIC_WS_URL=http://localhost:3001
ORACLE_PRIVATE_KEY=0x_your_oracle_wallet_key
```

### Development

```bash
pnpm install
pnpm dev:all    # Starts Next.js (:3000) + Socket.io (:3001)
```

Or run separately:

```bash
pnpm dev        # Next.js only (:3000)
pnpm dev:ws     # Socket.io only (:3001)
```

### Production

```bash
pnpm build      # Build Next.js
pnpm start      # Start production server
```

## Smart Contract

Deployed on Monad Testnet at `0x634F07d9Ae6968D71bf0c50B2792a91Ac4af8984`.

### Functions

| Function | Description |
|---|---|
| `createRoom(stake, maxPlayers)` | Create a new room with stake amount |
| `joinRoom(roomId)` | Join a room with matching stake |
| `submitResult(roomId, rankedWinners)` | Submit race results (oracle only) |

## License

MIT