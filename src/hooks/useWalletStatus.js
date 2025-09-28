'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useFlowWallet } from './useFlowWallet';

const WalletStatusContext = createContext(null);

export function WalletStatusProvider({ children }) {
  // Always use real wallet - no dev wallet
  const isDev = false;

  const { 
    address: account,
    isConnected: connected,
    connect,
    disconnect
  } = useFlowWallet();

  const [devWallet, setDevWallet] = useState({
    isConnected: false,
    address: null,
    chain: null,
  });

  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isDev) return;

    const savedState = localStorage.getItem('dev-wallet-state');
    if (savedState === 'connected') {
      setDevWallet({
        isConnected: true,
        address: '0x01cf0e2f2f715450',
        chain: { id: 'flow_testnet', name: 'Flow Testnet' },
      });
    }

    const handleToggle = () => {
      setDevWallet((prev) => {
        const newState = !prev.isConnected;
        localStorage.setItem(
          'dev-wallet-state',
          newState ? 'connected' : 'disconnected'
        );

        return newState
          ? {
              isConnected: true,
              address: '0x01cf0e2f2f715450',
              chain: { id: 'flow_testnet', name: 'Flow Testnet' },
            }
          : {
              isConnected: false,
              address: null,
              chain: null,
            };
      });
    };

    window.addEventListener('dev-wallet-toggle', handleToggle);
    return () => {
      window.removeEventListener('dev-wallet-toggle', handleToggle);
    };
  }, [isDev]);

  const connectWallet = useCallback(async () => {
    if (isDev) {
      localStorage.setItem('dev-wallet-state', 'connected');
      setDevWallet({
        isConnected: true,
        address: '0x01cf0e2f2f715450',
        chain: { id: 'flow_testnet', name: 'Flow Testnet' },
      });
      return;
    }

    try {
      // Flow wallet ile bağlan
      await connect();
    } catch (err) {
      setError('Flow cüzdanına bağlanılamadı: ' + err.message);
    }
  }, [connect, isDev]);

  const disconnectWallet = useCallback(async () => {
    if (isDev) {
      localStorage.setItem('dev-wallet-state', 'disconnected');
      setDevWallet({
        isConnected: false,
        address: null,
        chain: null,
      });
      return;
    }

    try {
      await disconnect();
    } catch (err) {
      setError('Flow cüzdanı bağlantısı kesilemedi: ' + err.message);
    }
  }, [disconnect, isDev]);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const currentStatus = {
    isConnected: !!connected && !!account, // Only connected if we have both connected and address
    address: account, // account is already the address string
    chain: { id: 'flow_testnet', name: 'Flow Testnet' }, // Flow network info
  };

  // Debug currentStatus calculation
  console.log('🔍 Flow currentStatus calculation:', {
    connected,
    account,
    accountAddress: account, // account is already the address
    finalIsConnected: !!connected && !!account
  });

  useEffect(() => {
    console.log('🔌 Flow Wallet connection changed:');
    console.log('=== CURRENT STATUS ===');
    console.log('Connected:', currentStatus.isConnected);
    console.log('Address:', currentStatus.address);
    console.log('Chain:', currentStatus.chain);
    console.log('=== RAW FLOW VALUES ===');
    console.log('Raw connected:', connected);
    console.log('Raw account:', account);
    console.log('=== ENVIRONMENT ===');
    console.log('Is Dev:', isDev);
    console.log('Dev Wallet:', devWallet);
    console.log('=== LOCAL STORAGE ===');
    console.log('Dev wallet state:', localStorage.getItem('dev-wallet-state'));
    console.log('Flow storage:', localStorage.getItem('fcl:current_user'));
  }, [currentStatus, connected, account, isDev, devWallet]);

  return (
    <WalletStatusContext.Provider
      value={{
        ...currentStatus,
        isDev,
        connectWallet,
        disconnectWallet,
        resetError,
        error,
      }}
    >
      {children}
    </WalletStatusContext.Provider>
  );
}

export default function useWalletStatus() {
  const context = useContext(WalletStatusContext);
  if (!context) {
    throw new Error('useWalletStatus must be used within a WalletStatusProvider');
  }
  return context;
}
