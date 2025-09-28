"use client";
import React, { useEffect, useState } from 'react';
import FlowWalletService from '@/services/FlowWalletService';

export default function FlowConnectWalletButton() {
  const [isConnected, setIsConnected] = useState(false);
  const [userAddress, setUserAddress] = useState(null);
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize Flow wallet service
  useEffect(() => {
    const initializeWallet = async () => {
      try {
        await FlowWalletService.initialize();
        
        // Check if user is already connected
        if (FlowWalletService.isConnected()) {
          const user = FlowWalletService.getCurrentUser();
          setUserAddress(user.addr);
          setIsConnected(true);
          
          // Load balance
          try {
            const flowBalance = await FlowWalletService.getFlowBalance();
            setBalance(flowBalance);
          } catch (error) {
            console.warn('Could not load balance:', error);
          }
        }
      } catch (error) {
        console.error('Failed to initialize Flow wallet:', error);
      }
    };

    initializeWallet();
  }, []);

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      const user = await FlowWalletService.connect();
      setUserAddress(user.addr);
      setIsConnected(true);
      
      // Load balance after connection
      try {
        const flowBalance = await FlowWalletService.getFlowBalance();
        setBalance(flowBalance);
      } catch (error) {
        console.warn('Could not load balance:', error);
      }
    } catch (error) {
      console.error('Failed to connect Flow wallet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await FlowWalletService.disconnect();
      setUserAddress(null);
      setIsConnected(false);
      setBalance(0);
    } catch (error) {
      console.error('Failed to disconnect Flow wallet:', error);
    }
  };

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance) => {
    return parseFloat(balance).toFixed(4);
  };

  if (isConnected && userAddress) {
    return (
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-sm font-medium text-white">
            {formatAddress(userAddress)}
          </div>
          <div className="text-xs text-gray-300">
            {formatBalance(balance)} FLOW
          </div>
        </div>
        <button
          onClick={handleDisconnect}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          disabled={isLoading}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
      disabled={isLoading}
    >
      {isLoading ? 'Connecting...' : 'Connect Flow Wallet'}
    </button>
  );
}
