"use client";
import React, { useState, useEffect } from 'react';
import { useFlowWallet } from '@/hooks/useFlowWallet';

export default function FlowConnectWalletButton() {
  const { 
    isConnected, 
    address, 
    isConnecting, 
    isDisconnecting, 
    error, 
    connect, 
    disconnect,
    getFlowBalance 
  } = useFlowWallet();
  
  const [balance, setBalance] = useState(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Get balance when connected
  useEffect(() => {
    if (isConnected && address) {
      setIsLoadingBalance(true);
      getFlowBalance()
        .then(setBalance)
        .catch(console.error)
        .finally(() => setIsLoadingBalance(false));
    } else {
      setBalance(null);
    }
  }, [isConnected, address, getFlowBalance]);

  // Format address for display
  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Format balance for display
  const formatBalance = (bal) => {
    if (bal === null) return 'Loading...';
    if (bal === undefined) return 'N/A';
    return `${bal.toFixed(4)} FLOW`;
  };

  if (isConnected) {
    return (
      <div className="flex items-center gap-3">
        {/* Address Display */}
        <div className="bg-gray-800 px-3 py-2 rounded-lg">
          <div className="text-sm text-gray-300">Address</div>
          <div className="text-white font-medium font-mono">
            {formatAddress(address)}
          </div>
        </div>

        {/* Disconnect Button */}
        <button
          onClick={disconnect}
          disabled={isDisconnecting}
          className="bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50"
        >
          {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Connect Button */}
      <button
        onClick={connect}
        disabled={isConnecting}
        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 shadow-lg hover:shadow-xl"
      >
        {isConnecting ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Connecting...
          </div>
        ) : (
          'Connect Flow Wallet'
        )}
      </button>

      {/* Error Display */}
      {error && (
        <div className="text-red-400 text-sm text-center max-w-xs">
          {error}
        </div>
      )}

    </div>
  );
}
