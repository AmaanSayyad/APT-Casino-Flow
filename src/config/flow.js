import * as fcl from "@onflow/fcl";

// Suppress WalletConnect warnings in console
const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  const message = args.join(' ');
  if (message.includes('WalletConnect') || message.includes('projectId')) {
    return; // Suppress WalletConnect warnings
  }
  originalConsoleWarn.apply(console, args);
};

// Flow Testnet Configuration with fallback endpoints
fcl.config({
  "accessNode.api": "https://rest-testnet.onflow.org", // Primary endpoint
  "discovery.wallet": "https://fcl-discovery.onflow.org/testnet/authn",
  "app.detail.title": "APT Casino",
  "app.detail.icon": "https://apt-casino.vercel.app/favicon.ico",
  "service.OpenID.scopes": "email",
  "fcl.limit": 1000,
  "fcl.eventPollRate": 2000,
  "fcl.timeout": 10000, // 10 second timeout
  "walletconnect.projectId": "dummy-project-id", // Dummy ID to suppress warning
  "discovery.authn.endpoint": "https://fcl-discovery.onflow.org/api/testnet/authn",
});

// Fallback access nodes for better reliability
export const FLOW_ACCESS_NODES = [
  "https://rest-testnet.onflow.org",
  "https://testnet.onflow.org",
  "https://access-testnet.onflow.org"
];

// Flow Testnet Contract Addresses (Updated for Cadence 1.0)
export const FLOW_CONTRACTS = {
  // Updated Flow Testnet addresses for Cadence 1.0
  FLOW_TOKEN: "0x7e60df042a9c0868",
  FUNGIBLE_TOKEN: "0x9a0766d93b6608b7", 
  // Add your casino contracts here when deployed
  CASINO_CONTRACT: "0x0c0c904844c9a720", // Placeholder - update with actual contract address
};

// Flow Treasury Configuration
export const FLOW_TREASURY_CONFIG = {
  ADDRESS: process.env.NEXT_PUBLIC_FLOW_TREASURY_ADDRESS || "0x2083a55fb16f8f60",
  GAS: {
    DEPOSIT_LIMIT: 1000,
    WITHDRAW_LIMIT: 1000,
  },
  MIN_DEPOSIT: parseFloat(process.env.NEXT_PUBLIC_FLOW_MIN_BET) || 0.001,
  MIN_WITHDRAW: 0.001,
  MAX_WITHDRAW: parseFloat(process.env.NEXT_PUBLIC_FLOW_MAX_BET) || 1000,
};

// Flow Casino Contract Configuration
export const FLOW_CASINO_CONFIG = {
  CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_FLOW_CASINO_CONTRACT_ADDRESS || "0x2083a55fb16f8f60",
  CONTRACT_NAME: process.env.NEXT_PUBLIC_FLOW_CASINO_CONTRACT_NAME || "CasinoGames",
  DEPLOYMENT_TX: process.env.FLOW_CASINO_DEPLOYMENT_TX || "6366c5753e26e39258ecd1581f0696a8688bab85b8bebe968ed06fdc8584f23a",
  MIN_BET: parseFloat(process.env.NEXT_PUBLIC_FLOW_MIN_BET) || 0.001,
  MAX_BET: parseFloat(process.env.NEXT_PUBLIC_FLOW_MAX_BET) || 1000,
  HOUSE_EDGE: parseFloat(process.env.NEXT_PUBLIC_FLOW_HOUSE_EDGE) || 0.02,
  VRF_ENABLED: process.env.NEXT_PUBLIC_FLOW_VRF_ENABLED === 'true',
};

// Flow Testnet Network Info
export const FLOW_NETWORK = {
  name: "Flow Testnet",
  chainId: "testnet",
  rpcUrl: "https://rest-testnet.onflow.org",
  blockExplorer: "https://testnet.flowscan.io",
  nativeCurrency: {
    name: "FLOW",
    symbol: "FLOW",
    decimals: 18,
  },
};

// HTTP Error handling utility
export const withRetry = async (fn, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      console.warn(`Attempt ${i + 1} failed:`, error.message);
      
      if (i === retries - 1) throw error;
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      
      // Try different access node if available
      if (i < FLOW_ACCESS_NODES.length - 1) {
        console.log(`Switching to access node: ${FLOW_ACCESS_NODES[i + 1]}`);
        fcl.config({
          "accessNode.api": FLOW_ACCESS_NODES[i + 1]
        });
      }
    }
  }
};

// Test Flow connection
export const testFlowConnection = async () => {
  try {
    const result = await fcl.query({
      cadence: `
        access(all) fun main(): UInt64 {
          return getCurrentBlock().height
        }
      `
    });
    console.log('✅ Flow connection test successful, block height:', result);
    return true;
  } catch (error) {
    console.error('❌ Flow connection test failed:', error);
    return false;
  }
};

export default fcl;
