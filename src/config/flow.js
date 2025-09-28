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
  ADDRESS: process.env.NEXT_PUBLIC_FLOW_TREASURY_ADDRESS || "0x038360087beccc9a", // Generated treasury address
  GAS: {
    DEPOSIT_LIMIT: 1000,
    WITHDRAW_LIMIT: 1000,
  },
  MIN_DEPOSIT: 0.001, // Minimum deposit amount in FLOW
  MIN_WITHDRAW: 0.001, // Minimum withdrawal amount in FLOW
  MAX_WITHDRAW: 1000, // Maximum withdrawal amount in FLOW per transaction
};

// Flow Testnet Network Info
export const FLOW_NETWORK = {
  name: "Flow Testnet",
  chainId: "testnet",
  rpcUrl: "https://rest-testnet.onflow.org",
  blockExplorer: "https://testnet.flowscan.org",
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
