/**
 * Clearnode Testnet Token Configuration
 * Based on Yellow Network Clearnode Testnet and ERC-7824 standards
 * Supports Testnet and other popular testnets
 */

export const CLEARNODE_TESTNET_TOKENS = {
  // Testnet FLOW (Native)
  FLOW: {
    symbol: 'FLOW',
    name: 'Flow (Testnet)',
    decimals: 18,
    address: '0x0000000000000000000000000000000000000000', // Native FLOW
    isNative: true,
    testnet: 'testnet',
    icon: '⟠',
    faucet: 'https://testnetfaucet.com'
  },

  // Testnet USDC (Test)
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin (Testnet)',
    decimals: 6,
    address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Testnet USDC
    isStablecoin: true,
    testnet: 'testnet',
    icon: '💰',
    faucet: 'https://faucet.circle.com'
  },

  // Testnet USDT (Test)
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD (Testnet)',
    decimals: 6,
    address: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06', // Testnet USDT
    isStablecoin: true,
    testnet: 'testnet',
    icon: '💵',
    faucet: 'https://faucet.tether.to'
  },

  // Flow Testnet FLOW
  ARB_ETH: {
    symbol: 'FLOW',
    name: 'Flow (Flow Testnet)',
    decimals: 18,
    address: '0x0000000000000000000000000000000000000000', // Native FLOW
    isNative: true,
    testnet: 'flow-testnet',
    icon: '🔵',
    faucet: 'https://faucet.flow.io'
  },

  // Flow Testnet USDC
  ARB_USDC: {
    symbol: 'USDC',
    name: 'USD Coin (Flow Testnet)',
    decimals: 6,
    address: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', // Flow Testnet USDC
    isStablecoin: true,
    testnet: 'flow-testnet',
    icon: '🔵💰',
    faucet: 'https://faucet.flow.io'
  },

  // Polygon Mumbai MATIC
  MATIC: {
    symbol: 'MATIC',
    name: 'Polygon (Mumbai)',
    decimals: 18,
    address: '0x0000000000000000000000000000000000000000', // Native MATIC
    isNative: true,
    testnet: 'polygon-mumbai',
    icon: '🟣',
    faucet: 'https://faucet.polygon.technology'
  },

  // Optimism Testnet FLOW
  OP_ETH: {
    symbol: 'FLOW',
    name: 'Flow (Optimism Testnet)',
    decimals: 18,
    address: '0x0000000000000000000000000000000000000000', // Native FLOW
    isNative: true,
    testnet: 'optimism-testnet',
    icon: '🔴',
    faucet: 'https://faucet.optimism.io'
  }
};

// Default token for casino operations (Flow Testnet FLOW)
export const DEFAULT_CASINO_TOKEN = CLEARNODE_TESTNET_TOKENS.ARB_ETH;

// Supported tokens for betting by testnet
export const SUPPORTED_BETTING_TOKENS = {
  testnet: [
    CLEARNODE_TESTNET_TOKENS.FLOW,
    CLEARNODE_TESTNET_TOKENS.USDC,
    CLEARNODE_TESTNET_TOKENS.USDT
  ],
  'flow-testnet': [
    CLEARNODE_TESTNET_TOKENS.ARB_ETH,
    CLEARNODE_TESTNET_TOKENS.ARB_USDC
  ],
  'polygon-mumbai': [
    CLEARNODE_TESTNET_TOKENS.MATIC
  ],
  'optimism-testnet': [
    CLEARNODE_TESTNET_TOKENS.OP_ETH
  ]
};

// All supported tokens
export const ALL_SUPPORTED_TOKENS = Object.values(CLEARNODE_TESTNET_TOKENS);

// Token addresses for easy lookup
export const TOKEN_ADDRESSES = Object.fromEntries(
  Object.entries(CLEARNODE_TESTNET_TOKENS).map(([key, token]) => [
    token.address.toLowerCase(),
    { ...token, key }
  ])
);

// Helper functions
export const getTokenBySymbol = (symbol, testnet = 'testnet') => {
  return Object.values(CLEARNODE_TESTNET_TOKENS).find(
    token => token.symbol.toLowerCase() === symbol.toLowerCase() && 
             token.testnet === testnet
  );
};

export const getTokensByTestnet = (testnet) => {
  return Object.values(CLEARNODE_TESTNET_TOKENS).filter(
    token => token.testnet === testnet
  );
};

export const getTokenByAddress = (address) => {
  return TOKEN_ADDRESSES[address.toLowerCase()];
};

export const isStablecoin = (tokenAddress) => {
  const token = getTokenByAddress(tokenAddress);
  return token?.isStablecoin || false;
};

export const formatTokenAmount = (amount, tokenAddress) => {
  const token = getTokenByAddress(tokenAddress);
  if (!token) return amount;
  
  const divisor = Math.pow(10, token.decimals);
  return (amount / divisor).toFixed(token.decimals === 6 ? 2 : 4);
};