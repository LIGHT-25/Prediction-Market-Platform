# Contributing to StellarPredict

Thank you for your interest in contributing to **StellarPredict**! We welcome bug reports, feature suggestions, documentation improvements, and pull requests.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Branch & Commit Conventions](#branch--commit-conventions)
5. [Frontend Guidelines](#frontend-guidelines)
6. [Smart Contract Guidelines](#smart-contract-guidelines)
7. [Testing Requirements](#testing-requirements)
8. [Pull Request Process](#pull-request-process)
9. [Reporting Bugs](#reporting-bugs)
10. [Proposing Features](#proposing-features)

---

## Code of Conduct

Be respectful and inclusive. We follow the [Contributor Covenant v2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).

---

## Getting Started

### Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | ≥ 22.13 | Use `nvm` or `fnm` |
| npm | ≥ 10 | Bundled with Node |
| Rust | stable | `rustup default stable` |
| wasm32-unknown-unknown target | — | `rustup target add wasm32-unknown-unknown` |
| Stellar CLI | latest | `cargo install --locked stellar-cli` |
| Freighter wallet | ≥ 5.0 | Browser extension |

### Clone & Install

```bash
git clone https://github.com/<your-org>/prediction-market-platform.git
cd prediction-market-platform
npm install
```

### Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_RPC_URL` | Soroban RPC endpoint (default: testnet) |
| `NEXT_PUBLIC_NETWORK` | `testnet` or `mainnet` |
| `NEXT_PUBLIC_NETWORK_PASSPHRASE` | Network passphrase |
| `NEXT_PUBLIC_CONTRACT_ID` | Deployed PredictionMarket contract address |
| `NEXT_PUBLIC_ORACLE_CONTRACT_ID` | Deployed Oracle contract address |

### Run Locally

```bash
npm run dev        # Start Next.js dev server on http://localhost:3000
npm run test       # Run Vitest test suite in watch mode
npm run test:run   # Run tests once (CI mode)
```

---

## Development Workflow

```
main        ← protected; merges only via PR from develop
develop     ← integration branch
feature/*   ← individual feature branches
fix/*       ← bug fixes
chore/*     ← tooling, CI, docs
```

1. Branch off `develop`:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/my-feature
   ```
2. Make your changes, write tests.
3. Push and open a PR against `develop`.
4. CI must be green before merge.

---

## Branch & Commit Conventions

We follow **Conventional Commits**:

```
<type>(<scope>): <short description>

[optional body]

[optional footer: Closes #<issue>]
```

| Type | When to use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `chore` | Build scripts, CI, tooling |
| `test` | Tests only |
| `refactor` | Code refactor without feature change |
| `perf` | Performance improvement |

Examples:
```
feat(markets): add oracle-linked market creation
fix(detail): hide bet form when market is expired
test(eventPoller): add deduplication property test
```

---

## Frontend Guidelines

- **Framework**: Next.js 15 (App Router, static export)
- **Styling**: TailwindCSS 3 — no inline styles except for dynamic values
- **State**: TanStack Query for server state; Zustand for client state
- **Types**: All shared interfaces must be exported from `types/index.ts`
- **Components**: Use `"use client"` directive for interactive components
- **Icons**: lucide-react only
- **No new dependencies** without discussion in a GitHub issue first
- **Skeletons**: Use components from `components/skeletons/` for loading states
- **Error handling**: Wrap new page sections in `<ErrorBoundary>`

### File Structure

```
app/            Next.js pages (App Router)
components/     Reusable UI components
  skeletons/    Loading skeleton components
hooks/          TanStack Query hooks
lib/            Utilities, stores, contract wrappers
types/          Shared TypeScript interfaces
tests/          Vitest test files
  components/   Component tests
scripts/        Deployment scripts
contracts/      Rust/Soroban smart contracts
  oracle/       Price oracle contract
  prediction_market/  Main prediction market contract
```

---

## Smart Contract Guidelines

- **Language**: Rust with soroban-sdk `21.x`
- **Workspace**: All contracts share `contracts/Cargo.toml`
- **Build target**: `wasm32-unknown-unknown --release`
- **Error types**: Use `ContractError` enum with `#[contracterror]`
- **Events**: Emit events for all state-changing operations
- **Tests**: All public functions must have unit tests inside the contract module

### Building contracts

```bash
cd contracts

# Build both contracts
cargo build --workspace --target wasm32-unknown-unknown --release

# Run unit tests (uses native target)
cargo test --workspace
```

---

## Testing Requirements

All PRs must maintain or improve test coverage.

### Frontend Tests (Vitest)

```bash
npm run test:run
```

- **Utility tests** — `tests/utils.test.ts`
- **Store tests** — `tests/stores.test.ts`
- **EventPoller tests** — `tests/eventPoller.test.ts`
- **Component tests** — `tests/components/`
- **Property-based tests** — `tests/property.test.ts` (fast-check)

### Smart Contract Tests

```bash
cd contracts && cargo test --workspace
```

All new contract functions must include at least:
- A success test
- A failure/error test (wrong caller, invalid state, etc.)

---

## Pull Request Process

1. Ensure `npm run test:run` passes locally.
2. Ensure `npm run build` passes locally.
3. Fill in the PR template (describe changes, link related issues).
4. Request at least **1 review** from a maintainer.
5. Squash-merge once approved.

---

## Reporting Bugs

Open a GitHub Issue with:
- **Steps to reproduce**
- **Expected behaviour**
- **Actual behaviour**
- **Browser + OS + wallet version**
- Screenshots or console logs if applicable

---

## Proposing Features

Open a GitHub Discussion or Issue with:
- **Problem statement** — what pain does this solve?
- **Proposed solution**
- **Alternatives considered**
- **Potential impact on existing features**

Large changes should be discussed before implementation to avoid wasted effort.

---

Thank you for contributing! 🚀
