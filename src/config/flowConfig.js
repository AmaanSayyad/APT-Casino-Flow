/**
 * Flow Configuration
 * Configuration for Flow blockchain integration
 */

export const FLOW_CONFIG = {
  // Flow networks
  NETWORKS: {
    'testnet': {
      name: 'Flow Testnet',
      accessNode: process.env.NEXT_PUBLIC_FLOW_ACCESS_NODE || 'https://rest-testnet.onflow.org',
      discoveryWallet: process.env.NEXT_PUBLIC_FLOW_DISCOVERY_WALLET || 'https://fcl-discovery.onflow.org/testnet/authn',
      explorerUrl: 'https://testnet.flowscan.org',
      chainId: 'testnet'
    },
    'mainnet': {
      name: 'Flow Mainnet',
      accessNode: process.env.NEXT_PUBLIC_FLOW_ACCESS_NODE || 'https://rest-mainnet.onflow.org',
      discoveryWallet: process.env.NEXT_PUBLIC_FLOW_DISCOVERY_WALLET || 'https://fcl-discovery.onflow.org/mainnet/authn',
      explorerUrl: 'https://flowscan.org',
      chainId: 'mainnet'
    }
  },

  // Current network
  CURRENT_NETWORK: process.env.NEXT_PUBLIC_FLOW_NETWORK || 'testnet',

  // Contract addresses
  CONTRACTS: {
    CASINO_CONTRACT: process.env.NEXT_PUBLIC_FLOW_CASINO_CONTRACT || '0x1234567890abcdef',
    VRF_CONTRACT: process.env.NEXT_PUBLIC_FLOW_VRF_CONTRACT || '0x1234567890abcdef',
    FLOW_TOKEN: '0x7e60df042a9c0868', // Flow token contract address
    FUSD_TOKEN: '0xe223d8a629e49c68' // FUSD token contract address
  },

  // Treasury configuration
  TREASURY: {
    ADDRESS: process.env.NEXT_PUBLIC_FLOW_TREASURY_ADDRESS || '0x1234567890abcdef',
    PRIVATE_KEY: process.env.FLOW_TREASURY_PRIVATE_KEY || '', // For server-side operations
  },

  // Game configuration
  GAMES: {
    MIN_BET: 0.001, // Minimum bet in FLOW
    MAX_BET: 100, // Maximum bet in FLOW
    HOUSE_EDGE: 0.02 // 2% house edge
  },

  // VRF configuration
  VRF: {
    COMMIT_REVEAL_DELAY: 1, // Blocks to wait between commit and reveal
    RANDOM_SEED_LENGTH: 32, // Random seed length in bytes
  }
};

// Helper function to get current network config
export const getCurrentNetworkConfig = () => {
  return FLOW_CONFIG.NETWORKS[FLOW_CONFIG.CURRENT_NETWORK];
};

// Helper function to get contract address
export const getContractAddress = (contractName) => {
  return FLOW_CONFIG.CONTRACTS[contractName];
};

// Helper function to validate Flow address
export const isValidFlowAddress = (address) => {
  return /^0x[a-fA-F0-9]{16}$/.test(address);
};
