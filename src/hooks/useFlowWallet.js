"use client";
import { useState, useEffect, useCallback } from 'react';
import * as fcl from "@onflow/fcl";

export const useFlowWallet = () => {
  const [user, setUser] = useState({ loggedIn: false, addr: null });
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState(null);

  // Initialize FCL and set up user subscription
  useEffect(() => {
    fcl.currentUser.subscribe(setUser);
  }, []);

  // Connect wallet
  const connect = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);
      console.log('🔗 Connecting to Flow wallet...');

      await fcl.authenticate();
      console.log('✅ Flow wallet connected successfully');
    } catch (err) {
      console.error('❌ Flow wallet connection failed:', err);
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // Disconnect wallet
  const disconnect = useCallback(async () => {
    try {
      setIsDisconnecting(true);
      setError(null);
      console.log('🔌 Disconnecting Flow wallet...');

      await fcl.unauthenticate();
      console.log('✅ Flow wallet disconnected successfully');
    } catch (err) {
      console.error('❌ Flow wallet disconnection failed:', err);
      setError(err.message || 'Failed to disconnect wallet');
    } finally {
      setIsDisconnecting(false);
    }
  }, []);

  // Get user's FLOW balance with multiple fallback methods
  const getFlowBalance = useCallback(async () => {
    if (!user.loggedIn || !user.addr) return null;

    // Method 1: Try native account balance first (most reliable)
    try {
      console.log('🔍 Trying native balance query for:', user.addr);
      const nativeBalance = await fcl.query({
        cadence: `
          access(all) fun main(account: Address): UFix64 {
            let acct = getAccount(account)
            return acct.balance
          }
        `,
        args: (arg, t) => [arg(user.addr, t.Address)],
      });

      console.log('✅ Native balance query successful:', nativeBalance);
      return parseFloat(nativeBalance);
    } catch (nativeError) {
      console.warn('⚠️ Native balance query failed:', nativeError);
    }

    // Method 2: Try FlowToken vault balance (Cadence 1.0 syntax)
    try {
      console.log('🔍 Trying FlowToken vault balance for:', user.addr);
      const vaultBalance = await fcl.query({
        cadence: `
          import FungibleToken from 0x9a0766d93b6608b7
          import FlowToken from 0x7e60df042a9c0868
          
          access(all) fun main(account: Address): UFix64 {
            let acct = getAccount(account)
            
            // Try to get the FlowToken vault capability
            let vaultCap = acct.capabilities.get<&{FungibleToken.Balance}>(/public/flowTokenBalance)
            
            if !vaultCap.check() {
              // If no capability, return account balance
              return acct.balance
            }
            
            let vaultRef = vaultCap.borrow()
            if vaultRef == nil {
              return acct.balance
            }
            
            return vaultRef!.balance
          }
        `,
        args: (arg, t) => [arg(user.addr, t.Address)],
      });

      console.log('✅ FlowToken vault balance query successful:', vaultBalance);
      return parseFloat(vaultBalance);
    } catch (vaultError) {
      console.warn('⚠️ FlowToken vault balance query failed:', vaultError);
    }

    // Method 3: Last resort - return 0 but log the issue
    console.error('❌ All Flow balance queries failed for address:', user.addr);
    return 0;
  }, [user.loggedIn, user.addr]);

  // Execute a treasury-sponsored transaction via API
  const executeTreasuryTransaction = useCallback(async (gameType, gameParams) => {
    try {
      console.log('🏦 Executing treasury-sponsored transaction via API...');
      console.log('🎮 Game type:', gameType);
      console.log('📊 Game params:', gameParams);
      console.log('👤 Player address:', user.addr);

      // For treasury transactions, we use a placeholder player address if wallet not connected
      const playerAddress = user.addr || '0x0000000000000000';

      // Call treasury transaction API
      const response = await fetch('/api/treasury-transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameType,
          playerAddress: playerAddress,
          gameParams
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Treasury transaction failed');
      }

      console.log('✅ Treasury transaction completed:', result.transactionId);

      return result.transaction;
    } catch (err) {
      console.error('❌ Treasury transaction failed:', err);
      throw new Error(`Treasury transaction failed: ${err.message}`);
    }
  }, []); // Treasury transactions don't depend on wallet connection

  // Execute a regular user transaction (deprecated - use treasury instead)
  const executeTransaction = useCallback(async (cadence, args = [], limit = 1000) => {
    if (!user.loggedIn) {
      throw new Error('Kullanıcı Flow cüzdanına bağlı değil');
    }

    try {
      console.log('📝 Executing Flow transaction...');

      const transactionId = await fcl.mutate({
        cadence,
        args,
        limit,
      });

      console.log('✅ Transaction submitted with ID:', transactionId);

      if (!transactionId) {
        throw new Error('İşlem ID alınamadı');
      }

      // Wait for transaction to be sealed
      console.log('⏳ Waiting for transaction to be sealed...');
      const transaction = await fcl.tx(transactionId).onceSealed();
      console.log('✅ Transaction sealed:', transaction);

      // Return transaction with guaranteed ID
      return {
        ...transaction,
        id: transactionId,
        transactionId: transactionId
      };
    } catch (err) {
      console.error('❌ Transaction failed:', err);

      // Provide user-friendly error messages
      if (err.message.includes('declined') || err.message.includes('rejected')) {
        throw new Error('İşlem kullanıcı tarafından reddedildi');
      } else if (err.message.includes('timeout')) {
        throw new Error('İşlem zaman aşımına uğradı');
      } else if (err.message.includes('network')) {
        throw new Error('Ağ bağlantısı hatası');
      }

      throw err;
    }
  }, [user.loggedIn]);

  // Transfer FLOW to treasury (deposit)
  const transferToTreasury = useCallback(async (amount, treasuryAddress) => {
    if (!user.loggedIn) {
      throw new Error('Kullanıcı Flow cüzdanına bağlı değil');
    }

    console.log('🚀 Starting FLOW transfer to treasury:', { amount, treasuryAddress, userAddress: user.addr });

    const cadence = `
      import FungibleToken from 0x9a0766d93b6608b7
      import FlowToken from 0x7e60df042a9c0868

      transaction(amount: UFix64, treasuryAddress: Address) {
          
          let sentVault: @{FungibleToken.Vault}
          
          prepare(signer: auth(BorrowValue) &Account) {
              
              let vaultRef = signer.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(
                  from: /storage/flowTokenVault
              ) ?? panic("Cüzdanınızdan Flow vault referansı alınamadı!")

              self.sentVault <- vaultRef.withdraw(amount: amount)
          }

          execute {
              let recipient = getAccount(treasuryAddress)

              let receiverRef = recipient.capabilities.borrow<&{FungibleToken.Receiver}>(
                  /public/flowTokenReceiver
              ) ?? panic("Treasury hesabına erişim sağlanamadı")

              receiverRef.deposit(from: <-self.sentVault)
              
              log("Flow başarıyla treasury'ye transfer edildi")
          }
      }
    `;

    const args = (arg, t) => [
      arg(amount.toFixed(8), t.UFix64),
      arg(treasuryAddress, t.Address)
    ];

    try {
      const result = await executeTransaction(cadence, args);
      console.log('✅ Transfer to treasury completed:', result);
      return result;
    } catch (error) {
      console.error('❌ Transfer to treasury failed:', error);

      // Provide user-friendly error messages
      if (error.message.includes('panic')) {
        if (error.message.includes('vault')) {
          throw new Error('Cüzdanınızda Flow vault bulunamadı. Lütfen cüzdanınızı kontrol edin.');
        } else if (error.message.includes('treasury') || error.message.includes('Treasury')) {
          throw new Error('Treasury hesabına bağlanılamadı. Lütfen daha sonra tekrar deneyin.');
        }
      } else if (error.message.includes('insufficient')) {
        throw new Error('Yetersiz Flow bakiyesi. Lütfen bakiyenizi kontrol edin.');
      }

      throw new Error(`Flow transfer hatası: ${error.message}`);
    }
  }, [user.loggedIn, executeTransaction]);

  // Execute a script (read-only)
  const executeScript = useCallback(async (cadence, args = []) => {
    try {
      console.log('📖 Executing Flow script...');

      const result = await fcl.query({
        cadence,
        args,
      });

      console.log('✅ Script executed successfully:', result);
      return result;
    } catch (err) {
      console.error('❌ Script execution failed:', err);
      throw err;
    }
  }, []);

  return {
    // User state
    user,
    isConnected: user.loggedIn,
    address: user.addr,

    // Connection state
    isConnecting,
    isDisconnecting,
    error,

    // Actions
    connect,
    disconnect,
    getFlowBalance,
    executeTransaction,
    executeTreasuryTransaction,
    executeScript,
    transferToTreasury,

    // FCL instance for advanced usage
    fcl,
  };
};
