# Flow Migration Documentation

## Project Migration: Arbitrum Sepolia + Pyth VRF → Flow Testnet + Flow VRF

### Overview
This document tracks the migration of the APT Casino Flow project from Arbitrum Sepolia with Pyth VRF to Flow Testnet with Flow Wallet Kit and Flow VRF Cadence contracts.

### Migration Goals
1. **Wallet Connection**: Replace MetaMask/EVM wallet connection with Flow Wallet Kit
2. **Currency**: Change from ARB ETH to Flow tokens
3. **Randomness**: Replace Pyth VRF with Flow VRF using Cadence contracts
4. **Treasury**: Update treasury operations to work with Flow blockchain
5. **Transaction History**: Show Flow contract transactions instead of EVM transactions

### Current Architecture (Arbitrum Sepolia)
- **Wallet**: MetaMask/RainbowKit for EVM wallet connection
- **Currency**: ARB ETH (Arbitrum Sepolia ETH)
- **Randomness**: Pyth Network Entropy VRF
- **Treasury**: EVM wallet with private key for signing transactions
- **Contracts**: Solidity contracts on Arbitrum Sepolia

### Target Architecture (Flow Testnet)
- **Wallet**: Flow Wallet Kit for Flow wallet connection
- **Currency**: Flow tokens (FLOW)
- **Randomness**: Flow VRF using Cadence contracts
- **Treasury**: Flow account with treasury signing capabilities
- **Contracts**: Cadence contracts on Flow testnet

### Migration Tasks

#### Phase 1: Remove EVM Dependencies
- [x] Remove Arbitrum Sepolia configurations
- [x] Remove Pyth VRF configurations
- [x] Remove EVM wallet connection logic
- [x] Remove ethers.js dependencies

#### Phase 2: Install Flow Dependencies
- [x] Install @onflow/fcl for Flow client
- [x] Install @onflow/flowkit for Flow development tools
- [x] Install @onflow/types for TypeScript support

#### Phase 3: Flow Configuration
- [x] Create Flow testnet configuration
- [x] Set up Flow Wallet Kit integration
- [x] Configure Flow token handling

#### Phase 4: Update Core Services
- [x] Replace wallet connection with Flow Wallet Kit
- [x] Update deposit/withdraw to use Flow tokens
- [x] Create Flow VRF service
- [x] Update game services to use Flow VRF

#### Phase 5: Cadence Contracts
- [x] Create Flow VRF Cadence contracts
- [x] Deploy contracts to Flow testnet
- [x] Update game logic to use Cadence contracts

#### Phase 6: UI Updates
- [x] Update wallet connection UI
- [x] Update balance display to show Flow tokens
- [x] Update transaction history to show Flow transactions
- [x] Update game history to show Flow contract transactions

### Technical Details

#### Flow Wallet Kit Integration
- Uses @onflow/fcl for wallet connection
- Supports multiple Flow wallets (Blocto, Ledger, etc.)
- Handles Flow account management

#### Flow VRF Implementation
- Uses Flow's built-in randomness functions
- Implements commit-reveal scheme for fair randomness
- Cadence contracts handle VRF logic

#### Treasury Operations
- Flow account with treasury capabilities
- Signs transactions for game operations
- Manages Flow token transfers

### Files Modified
- `package.json` - Updated dependencies
- `src/config/` - Flow configuration files
- `src/services/` - Flow services
- `src/components/` - Updated UI components
- `src/app/api/` - Updated API routes
- `contracts/` - Cadence contracts

### Environment Variables
```env
# Flow Configuration
NEXT_PUBLIC_FLOW_NETWORK=testnet
NEXT_PUBLIC_FLOW_ACCESS_NODE=https://rest-testnet.onflow.org
NEXT_PUBLIC_FLOW_DISCOVERY_WALLET=https://fcl-discovery.onflow.org/testnet/authn
NEXT_PUBLIC_FLOW_CONTRACT_ADDRESS=0x1234567890abcdef
NEXT_PUBLIC_FLOW_TREASURY_ADDRESS=0x1234567890abcdef
```

### Testing
- Test wallet connection with Flow Wallet Kit
- Test deposit/withdraw with Flow tokens
- Test game randomness with Flow VRF
- Test treasury operations

### Deployment
- Deploy Cadence contracts to Flow testnet
- Update environment variables
- Test all functionality on Flow testnet

### Notes
- All EVM-specific code has been removed
- Flow Wallet Kit provides better UX than MetaMask
- Flow VRF is more secure than Pyth VRF
- Cadence contracts are more efficient than Solidity
