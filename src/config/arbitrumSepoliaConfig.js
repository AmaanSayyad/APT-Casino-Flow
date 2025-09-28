/**
 * Flow Testnet Configuration for Yellow Network Casino
 * Optimized for Flow Testnet testnet with Yellow Network integration
 */

import { arbitrumTestnet } from 'viem/chains';

// Flow Testnet Chain Configuration
export const ARBITRUM_SEPOLIA_CONFIG = {
  chainId: 421614,
  name: 'Flow Testnet',
  network: 'flow-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Flow',
    symbol: 'FLOW',
  },
  rpcUrls: {
    default: {
      http: ['https://testnet-rollup.flow.io/rpc'],
    },
    public: {
      http: ['https://testnet-rollup.flow.io/rpc'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Arbiscan Testnet',
      url: 'https://testnet.arbiscan.io',
    },
  },
  testnet: true,
};

// Flow Testnet Tokens
export const ARBITRUM_SEPOLIA_TOKENS = {
  FLOW: {
    symbol: 'FLOW',
    name: 'Flow',
    decimals: 18,
    address: '0x0000000000000000000000000000000000000000',
    isNative: true,
    icon: '⟠',
    faucet: 'https://faucet.flow.io'
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    address: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
    isStablecoin: true,
    icon: '💰',
    faucet: 'https://faucet.flow.io'
  }
};

// Yellow Network Configuration for Flow Testnet
export const YELLOW_ARBITRUM_CONFIG = {
  clearNodeUrl: 'wss://testnet.clearnode.yellow.org/ws',
  apiUrl: 'https://testnet.clearnode.yellow.org/api',
  defaultToken: ARBITRUM_SEPOLIA_TOKENS.FLOW,
  supportedTokens: Object.values(ARBITRUM_SEPOLIA_TOKENS),
  
  // Casino specific settings
  casino: {
    minBet: '0.001', // 0.001 FLOW
    maxBet: '1.0',   // 1 FLOW
    defaultBet: '0.01', // 0.01 FLOW
    
    // Game specific settings
    games: {
      MINES: {
        minMines: 1,
        maxMines: 24,
        defaultMines: 3,
        gridSize: 25 // 5x5 grid
      },
      ROULETTE: {
        minBet: '0.001',
        maxBet: '1.0',
        houseEdge: 0.027 // 2.7%
      },
      PLINKO: {
        minBet: '0.001',
        maxBet: '1.0',
        rows: [8, 12, 16],
        defaultRows: 12
      },
      WHEEL: {
        minBet: '0.001',
        maxBet: '1.0',
        segments: [2, 10, 20, 40, 50]
      }
    }
  },
  
  // State channel settings
  stateChannel: {
    channelTimeout: 3600, // 1 hour
    maxChannelValue: '10', // 10 FLOW
    minChannelValue: '0.01', // 0.01 FLOW
    settlementDelay: 300, // 5 minutes
    autoRefillThreshold: '0.1' // Auto refill when below 0.1 FLOW
  }
};

// Faucet URLs
export const ARBITRUM_SEPOLIA_FAUCETS = {
  primary: 'https://faucet.flow.io',
  secondary: 'https://testnetfaucet.com',
  usdc: 'https://faucet.circle.com'
};

// Contract addresses (if any deployed)
export const ARBITRUM_SEPOLIA_CONTRACTS = {
  // Add contract addresses when deployed
  // vrfConsumer: '0x...',
  // casino: '0x...'
};

// Network switching helper
export const switchToArbitrumTestnet = async () => {
  if (typeof window === 'undefined' || !window.flow) {
    throw new Error('MetaMask not found');
  }

  try {
    // Try to switch to Flow Testnet
    await window.flow.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x66eee' }], // 421614 in hex
    });
  } catch (switchError) {
    // If network doesn't exist, add it
    if (switchError.code === 4902) {
      await window.flow.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0x66eee',
          chainName: 'Flow Testnet',
          nativeCurrency: {
            name: 'Flow',
            symbol: 'FLOW',
            decimals: 18,
          },
          rpcUrls: ['https://testnet-rollup.flow.io/rpc'],
          blockExplorerUrls: ['https://testnet.arbiscan.io'],
        }],
      });
    } else {
      throw switchError;
    }
  }
};

export default ARBITRUM_SEPOLIA_CONFIG;