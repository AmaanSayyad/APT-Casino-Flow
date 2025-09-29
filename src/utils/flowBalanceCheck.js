// Flow Balance Check Utility
// Alternative balance query methods for debugging

import * as fcl from "@onflow/fcl";

// Method 1: Simple FlowToken balance query (Cadence 1.0 compatible)
export async function getFlowBalanceSimple(address) {
  try {
    const balance = await fcl.query({
      cadence: `
        import FungibleToken from 0x9a0766d93b6608b7
        import FlowToken from 0x7e60df042a9c0868
        
        access(all) fun main(address: Address): UFix64 {
          let account = getAccount(address)
          let vaultCap = account.capabilities.get<&{FungibleToken.Balance}>(/public/flowTokenBalance)
          
          if !vaultCap.check() {
            return 0.0
          }
          
          let vaultRef = vaultCap.borrow()
          return vaultRef?.balance ?? 0.0
        }
      `,
      args: (arg, t) => [arg(address, t.Address)],
    });
    
    console.log('✅ Simple balance query result:', balance);
    return parseFloat(balance);
  } catch (error) {
    console.error('❌ Simple balance query failed:', error);
    return null;
  }
}

// Method 2: Using account.balance (native FLOW)
export async function getFlowBalanceNative(address) {
  try {
    const balance = await fcl.query({
      cadence: `
        access(all) fun main(address: Address): UFix64 {
          let account = getAccount(address)
          return account.balance
        }
      `,
      args: (arg, t) => [arg(address, t.Address)],
    });
    
    console.log('✅ Native balance query result:', balance);
    return parseFloat(balance);
  } catch (error) {
    console.error('❌ Native balance query failed:', error);
    return null;
  }
}

// Method 3: Check if vault exists first (Cadence 1.0 compatible)
export async function getFlowBalanceWithCheck(address) {
  try {
    const result = await fcl.query({
      cadence: `
        import FungibleToken from 0x9a0766d93b6608b7
        import FlowToken from 0x7e60df042a9c0868
        
        access(all) fun main(address: Address): {String: AnyStruct} {
          let account = getAccount(address)
          
          // Check if the capability exists
          let capability = account.capabilities.get<&{FungibleToken.Balance}>(/public/flowTokenBalance)
          
          if !capability.check() {
            return {
              "hasVault": false,
              "balance": account.balance,
              "nativeBalance": account.balance,
              "error": "No FlowToken vault capability found, using native balance"
            }
          }
          
          let vaultRef = capability.borrow()
          if vaultRef == nil {
            return {
              "hasVault": false,
              "balance": account.balance,
              "nativeBalance": account.balance,
              "error": "Could not borrow vault reference, using native balance"
            }
          }
          
          return {
            "hasVault": true,
            "balance": vaultRef!.balance,
            "nativeBalance": account.balance,
            "error": nil
          }
        }
      `,
      args: (arg, t) => [arg(address, t.Address)],
    });
    
    console.log('✅ Detailed balance check result:', result);
    return result;
  } catch (error) {
    console.error('❌ Detailed balance check failed:', error);
    return null;
  }
}

// Test all methods
export async function debugFlowBalance(address) {
  console.log('🔍 Starting Flow balance debug for address:', address);
  
  console.log('--- Method 1: Simple Query ---');
  const simple = await getFlowBalanceSimple(address);
  
  console.log('--- Method 2: Native Balance ---');
  const native = await getFlowBalanceNative(address);
  
  console.log('--- Method 3: Detailed Check ---');
  const detailed = await getFlowBalanceWithCheck(address);
  
  console.log('🔍 Debug Summary:', {
    address,
    simpleBalance: simple,
    nativeBalance: native,
    detailedResult: detailed
  });
  
  return {
    simple,
    native,
    detailed
  };
}


