# Privacy-Preserving On-Chain Compliance & KYC Registry

A full-stack decentralized application (dApp) built on the **Stellar network** using **Soroban (Rust)** for smart contracts and **Node.js (Express)** for the backend. 

This project implements a compliance registry that verifies user KYC (Know Your Customer) status without exposing Personally Identifiable Information (PII) on the public blockchain.

## 🏗 Architecture

To maintain user privacy on a public ledger, this project uses a hybrid on-chain/off-chain architecture:

1. **Smart Contract (Soroban / Rust):** Acts as an immutable, tamper-proof registry. It stores only a SHA-256 cryptographic hash of the user's KYC data, tied to their Stellar wallet address.
2. **Backend (Node.js / Express):** Acts as a secure intermediary. It receives raw user PII, stores it securely in a traditional off-chain database, hashes the data, and submits only the hash to the Stellar testnet.
3. **Client SDK (JavaScript):** Utilizes `@stellar/stellar-sdk` to prepare, simulate, sign, and submit transactions to the Soroban RPC server.

## 🚀 Prerequisites

- **Node.js** (v18 or higher recommended)
- **Rust** (with `wasm32-unknown-unknown` target installed)
- **Stellar CLI** (`stellar-cli`)
- **Soroban CLI** (`soroban-cli`)
- **Docker** (for running a local network)

## 🛠 Getting Started

You can either run the entire stack on your local machine or deploy it to the public Stellar Testnet.

### Option A: Running Locally (Recommended for Development)

This approach uses `soroban-cli` to spin up a local, self-contained Stellar network using Docker.

**1. Start the Local Network**

Make sure Docker is running on your machine, then start the standalone network.

```bash
# This will pull a Docker image and start a local RPC server and Friendbot
soroban network start
```

Generate a testnet identity for your Admin and deploy the contract:

```bash
stellar keys generate admin --network testnet

stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/stellar_kyc_registry.wasm \
  --source admin \
  --network testnet
```

*Note down the deployed Contract ID (e.g., `C...`) and the Admin's Secret Key (e.g., `S...`).*

### 2. Backend Setup

Navigate to the backend directory and install the necessary dependencies:

```bash
npm install express @stellar/stellar-sdk dotenv
```

Update the `client.js` and `server.js` files with your newly generated credentials:
- In `client.js`: Update `CONTRACT_ID` with your deployed Contract ID.
- In `server.js`: Update `ADMIN_SECRET` with the Admin's secret key.

*(Note: In a production environment, always use `.env` files to store secrets!)*

Ensure your `package.json` contains `"type": "module"` to support ES6 imports.

### 3. Running the Server

Start the Express backend:

```bash
node server.js
```

You should see: `🚀 KYC Backend server running on port 3000`

## 📡 API Endpoints

### Submit KYC Data
**POST** `/api/kyc/submit`

Expects a JSON payload with user PII. The server stores this off-chain, hashes it, and submits the hash to Stellar.

```json
// Request Body
{
  "userAddress": "G...",
  "fullName": "John Doe",
  "documentId": "ABC123456"
}
```

### Check KYC Status
**GET** `/api/kyc/status/:address`

Queries the Soroban smart contract directly (read-only, zero fees) to check if a Stellar address has a verified KYC record.

## 🛡 Security Notes
- **Never store PII on-chain.** Always hash or encrypt data before it touches the blockchain.
- Secure the `ADMIN_SECRET` using environment variables.