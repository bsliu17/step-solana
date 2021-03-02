# Step Finance
Protoype for Step protocol built on Solana for the Hackathon

# Quickstart

```bash

git clone https://github.com/aaronovz1/step-solana
cd step-solana
git clone https://github.com/solana-labs/solana-program-library

```

```bash

npm install

```

```bash

npm start

```

# Environment Setup
1. Install Rust from https://rustup.rs/
2. Install Solana v1.5.0 or later from https://docs.solana.com/cli/install-solana-cli-tools#use-solanas-install-tool
3. Install Node
4. Install NPM

# Build Smart Contract

```bash
$ yarn build:program
$ yarn test:program
```

# Deploy Smart Contract

```bash
$ yarn airdrop
$ yarn ts-node scripts/deploy-program.ts
```

# Directory structure

## program

Step program in Rust

## scripts

Developments scripts for protoyping

## src

React Dapp
