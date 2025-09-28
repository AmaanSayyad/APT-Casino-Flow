"use client";
import React from 'react';
import { useFlowWallet } from '@/hooks/useFlowWallet';

/**
 * Global Wallet Manager
 * This component should be included in every page to ensure wallet persistence
 * Uses Flow wallet for Flow Testnet connection
 */
export default function GlobalWalletManager() {
  // Use Flow wallet
  const { isConnected, address, isConnecting, isDisconnecting, error } = useFlowWallet();
  
  // Debug logging
  React.useEffect(() => {
    console.log('🔧 GlobalWalletManager state:', {
      isConnected,
      address,
      isConnecting,
      isDisconnecting,
      error
    });
  }, [isConnected, address, isConnecting, isDisconnecting, error]);
  
  // This component doesn't render anything, it just manages wallet state
  return null;
}
