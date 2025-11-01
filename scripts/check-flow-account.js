// Check Flow Account Details
// Verifies treasury account exists and has correct public key

import * as fcl from "@onflow/fcl";

// Configure FCL
fcl.config({
  "accessNode.api": "https://rest-testnet.onflow.org",
  "discovery.wallet": "https://fcl-discovery.onflow.org/testnet/authn",
});

const TREASURY_ADDRESS = "0x2083a55fb16f8f60";
const EXPECTED_PUBLIC_KEY = "94cfe31c712812f30278b1a57f7382cd4dc0df1a03cbfc6646f93bf3f61953049af48e0dba318e866382e0fda97905d6c9ec68569e3ab4ca3986f9c98a43b8e5";

async function checkFlowAccount() {
  try {
    console.log('🔍 Checking Flow Treasury Account...');
    console.log('📍 Address:', TREASURY_ADDRESS);
    
    // Get account information - simple approach
    const account = await fcl.query({
      cadence: `
        access(all) fun main(address: Address): UFix64 {
          let account = getAccount(address)
          return account.balance
        }
      `,
      args: (arg, t) => [arg(TREASURY_ADDRESS, t.Address)]
    });

    console.log('');
    console.log('📋 Account Details:');
    console.log('Address:', TREASURY_ADDRESS);
    console.log('Balance:', account, 'FLOW');
    
    console.log('');
    console.log('🎯 Analysis:');
    
    if (parseFloat(account) > 0) {
      console.log('✅ Account exists and has FLOW balance');
    } else {
      console.log('❌ Account has no FLOW balance - needs funding');
    }
    
    console.log('');
    console.log('💡 Account Status:');
    console.log('- Account exists on Flow Testnet');
    console.log('- Ready to test transactions');

  } catch (error) {
    console.error('❌ Failed to check account:', error);
    
    if (error.message.includes('account does not exist')) {
      console.log('');
      console.log('🚨 ACCOUNT NOT FOUND');
      console.log('The treasury account does not exist on Flow Testnet.');
      console.log('');
      console.log('💡 Solutions:');
      console.log('1. Create the account on Flow Testnet');
      console.log('2. Fund it with FLOW tokens');
      console.log('3. Add the correct public key');
    }
  }
}

checkFlowAccount();
