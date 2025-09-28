// Treasury Balance Check Utility

import * as fcl from "@onflow/fcl";
import { FLOW_TREASURY_CONFIG } from '../config/flow';

export const checkTreasuryBalance = async () => {
  try {
    console.log('🔍 Checking Flow treasury balance...');
    console.log('Treasury address:', FLOW_TREASURY_CONFIG.ADDRESS);
    
    // Method 1: Check native balance
    const nativeBalance = await fcl.query({
      cadence: `
        access(all) fun main(account: Address): UFix64 {
          let acct = getAccount(account)
          return acct.balance
        }
      `,
      args: (arg, t) => [arg(FLOW_TREASURY_CONFIG.ADDRESS, t.Address)],
    });
    
    console.log('💰 Treasury native balance:', nativeBalance, 'FLOW');
    
    // Method 2: Check FlowToken vault balance
    let vaultBalance = 0;
    try {
      vaultBalance = await fcl.query({
        cadence: `
          import FungibleToken from 0x9a0766d93b6608b7
          import FlowToken from 0x7e60df042a9c0868
          
          access(all) fun main(account: Address): UFix64 {
            let acct = getAccount(account)
            let vaultCap = acct.capabilities.get<&{FungibleToken.Balance}>(/public/flowTokenBalance)
            
            if !vaultCap.check() {
              return 0.0
            }
            
            let vaultRef = vaultCap.borrow()
            return vaultRef?.balance ?? 0.0
          }
        `,
        args: (arg, t) => [arg(FLOW_TREASURY_CONFIG.ADDRESS, t.Address)],
      });
      
      console.log('💰 Treasury vault balance:', vaultBalance, 'FLOW');
    } catch (vaultError) {
      console.warn('⚠️ Could not check vault balance:', vaultError.message);
    }
    
    return {
      nativeBalance: parseFloat(nativeBalance),
      vaultBalance: parseFloat(vaultBalance),
      address: FLOW_TREASURY_CONFIG.ADDRESS
    };
    
  } catch (error) {
    console.error('❌ Treasury balance check failed:', error);
    return {
      nativeBalance: 0,
      vaultBalance: 0,
      address: FLOW_TREASURY_CONFIG.ADDRESS,
      error: error.message
    };
  }
};

// Check user's local treasury balance (from localStorage)
export const checkLocalTreasuryBalance = (userAddress) => {
  if (typeof window === 'undefined') return '0';
  
  const userSpecificBalance = localStorage.getItem(`userFlowBalance_${userAddress}`);
  const globalBalance = localStorage.getItem('userFlowBalance');
  
  console.log('🔍 Local treasury balance check:', {
    userAddress,
    userSpecificBalance,
    globalBalance
  });
  
  return userSpecificBalance || globalBalance || '0';
};