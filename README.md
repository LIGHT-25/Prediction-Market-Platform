# StellarPredict — Prediction Markets on Stellar

Decentralized prediction market platform built on the Stellar network using Soroban smart contracts.

## Features

### 🔐 Freighter Wallet Integration
- Connect with the Freighter browser extension (direct extension popup — no modal)
- Wallet connection status indicator
- Address display with copy + explorer link
- Disconnect option

### 📊 Prediction Markets
- View all active prediction markets
- Create markets with question, description, end date, and token selection
- Market details page with pool stats, probabilities, and participant count
- Current odds/probabilities (YES vs NO percentage bar)

### 🎯 Place Predictions
- Predict YES or NO on any open market
- Enter stake amount in XLM
- Submit prediction through deployed Soroban smart contract
- Contract stores prediction data on-chain

### ⚡ Real-Time Updates
- Live activity feed of contract events (MarketCreated, BetPlaced, MarketResolved, RewardClaimed)
- Auto-refresh every 10 seconds
- Event-driven state synchronization

### 📜 Smart Contract Integration
- Read active markets from contract
- Write predictions to contract
- Fetch market statistics from contract
- Display deployed contract address

### 🚦 Transaction Tracking
- Transaction status modal (Pending / Success / Failed)
- Filterable transaction history
- Transaction hash display
- Link to Stellar Explorer
- Timestamp tracking

### ❌ Error Handling (3 Required)
- **Freighter not installed** — Detects missing extension and shows clear message
- **Transaction rejected by user** — Catches user rejection in Freighter popup
- **Insufficient XLM balance** — Checks Horizon balance before submitting

### 📈 Analytics Dashboard
- Total markets created
- Total predictions made
- Total XLM volume
- Most active market
- User prediction history (wins/losses, total staked)

### 👤 User Profile
- Connected wallet information
- Prediction history table
- Win/Loss statistics
- Total amount staked

## Tech Stack

- **Frontend:** Next.js 15 (App Router), React 19, Tailwind CSS, shadcn/ui
- **State:** Zustand, TanStack React Query
- **Blockchain:** Stellar Soroban, `@stellar/stellar-sdk`, `@creit.tech/stellar-wallets-kit`
- **Smart Contract:** Rust + Soroban SDK

## Prerequisites

- Node.js 18+
- npm or pnpm
- [Rust/Cargo](https://rustup.rs/) (for smart contract compilation)
- A Stellar wallet (Freighter, xBull, or Albedo)

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment

```bash
cp .env.example .env
```

Edit `.env` with your contract ID after deployment.

### 3. Compile & Deploy Smart Contract

```bash
npm run deploy
```

This will:
1. Compile the Soroban contract with Cargo
2. Fund a deployer keypair via Friendbot
3. Upload the WASM bytecode and instantiate the contract
4. Update `.env` with the deployed contract address

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Fund Your Wallet

Use the [Stellar Friendbot](https://friendbot.stellar.org/) to fund your Testnet wallet:

```
https://friendbot.stellar.org/?addr=YOUR_PUBLIC_KEY
```

## Manual Deployment Steps (without cargo)

If Cargo is not available, compile the contract separately:

```bash
cd contracts
cargo build --target wasm32-unknown-unknown --release
```

Then run the deploy script:

```bash
npx tsx scripts/deploy.ts
```

## Smart Contract

The smart contract is located in `contracts/` and provides:

| Method | Description |
|--------|-------------|
| `create_market` | Create a new prediction market |
| `place_bet` | Place a YES/NO bet with token transfer |
| `get_market` | Fetch a single market |
| `get_all_markets` | Fetch all markets |
| `resolve_market` | Creator resolves an expired market |
| `claim_reward` | Claim winnings from a resolved market |
| `get_user_position` | Get user's YES/NO shares |

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Home page with hero + active markets
│   ├── dashboard/          # Wallet dashboard with balance
│   ├── markets/            # Market list + create form
│   ├── markets/[id]/       # Market detail with bet/resolve/claim
│   ├── activity/           # Contract events stream
│   └── transactions/       # Transaction history
├── components/             # Reusable UI components
│   ├── Navbar.tsx          # Navigation + wallet connect
│   ├── Providers.tsx       # React Query + dark mode
│   ├── Toast.tsx           # Toast notifications
│   └── ui/                 # shadcn/ui components
├── contracts/              # Soroban smart contract
│   ├── Cargo.toml
│   └── lib.rs
├── hooks/                  # React Query hooks
│   ├── useMarkets.ts
│   ├── useCreateMarket.ts
│   ├── usePlaceBet.ts
│   ├── useResolveMarket.ts
│   └── useClaimReward.ts
├── lib/                    # Core libraries
│   ├── config.ts           # Environment config
│   ├── wallet.ts           # StellarWalletsKit integration
│   ├── contract.ts         # Low-level Soroban calls
│   ├── stellar.ts          # Frontend contract wrappers
│   ├── walletStore.ts      # Wallet state (Zustand)
│   ├── marketStore.ts      # Market state (Zustand)
│   ├── transactionStore.ts # Transaction history (Zustand)
│   └── eventStore.ts       # Event polling state (Zustand)
├── scripts/
│   └── deploy.ts           # Contract deployment script
└── types/
    └── index.ts            # TypeScript definitions
```

## Verification Checklist

- [ ] Connect Freighter/xBull/Albedo wallet
- [ ] Fund wallet via Friendbot
- [ ] Create a market (verify toast + transaction history)
- [ ] Buy YES/NO positions
- [ ] Resolve market after expiration
- [ ] Claim reward
- [ ] View activity feed with live events
- [ ] Check transaction history with status badges

## License

MIT
