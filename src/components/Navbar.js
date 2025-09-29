"use client";
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from 'react-redux';
import { setFlowBalance, addToFlowBalance, subtractFromFlowBalance, loadFlowBalanceFromStorage } from '@/store/balanceSlice';
import FlowConnectWalletButton from "./FlowConnectWalletButton";
import WithdrawModal from "./WithdrawModal";
import LiveChat from "./LiveChat";
import { useFlowWallet } from '../hooks/useFlowWallet';
import { flowTreasuryService } from '../services/FlowTreasuryService';
import { FLOW_TREASURY_CONFIG } from '../config/flow';
import { debugFlowBalance } from '../utils/flowBalanceCheck';
import { testFlowConnection, withRetry } from '../config/flow';
import { resetFlowBalance, isFlowBalanceCorrupted } from '../utils/resetFlowBalance';
import { checkTreasuryBalance, checkLocalTreasuryBalance } from '../utils/checkTreasuryBalance';

import { useNotification } from './NotificationSystem';

// Flow Treasury System - similar to FLOW but for Flow
const FlowBalanceSystem = {
  getBalance: async (address) => {
    // Try to get Flow balance from localStorage first
    const savedFlowBalance = localStorage.getItem('userFlowBalance');
    if (savedFlowBalance) {
      return savedFlowBalance;
    }
    // Return zero balance
    return "0";
  },
  
  deposit: async (userAddress, amount, transactionId) => {
    try {
      console.log('Processing Flow deposit:', { userAddress, amount, transactionId });
      
      // Use the FlowTreasuryService
      const result = await flowTreasuryService.deposit(userAddress, amount, transactionId);
      
      console.log('FlowBalanceSystem deposit: API call successful, balance already updated');
      
      return result;
    } catch (error) {
      console.error('Flow deposit error:', error);
      throw error;
    }
  },

  withdraw: async (userAddress, amount) => {
    try {
      console.log('Processing Flow withdrawal:', { userAddress, amount });
      
      // Use the FlowTreasuryService
      const result = await flowTreasuryService.withdraw(userAddress, amount);
      
      console.log('FlowBalanceSystem withdrawal: API call successful');
      
      return result;
    } catch (error) {
      console.error('Flow withdrawal error:', error);
      throw error;
    }
  }
};

const parseAptAmount = (amount) => {
  // Mock parsing for demo
  return parseFloat(amount) / 100000000;
};

const ethereumClient = {
  waitForTransaction: async ({ transactionHash }) => {
    // Mock transaction wait for demo
    return new Promise(resolve => setTimeout(resolve, 1000));
  }
};

const CASINO_MODULE_ADDRESS = "0x1234567890123456789012345678901234567890123456789012345678901234";

// Mock search results for demo purposes
const MOCK_SEARCH_RESULTS = {
  games: [
    { id: 'game1', name: 'Roulette', path: '/game/roulette', type: 'Featured' },
    { id: 'game2', name: 'Mines', path: '/game/mines', type: 'Popular' },
    { id: 'game3', name: 'Spin Wheel', path: '/game/wheel', type: 'Featured' },
    { id: 'game4', name: 'Plinko', path: '/game/plinko', type: 'Popular' },
  ],
  tournaments: [
    { id: 'tournament1', name: 'High Roller Tournament', path: '/tournaments/high-roller', prize: '10,000 FLOW' },
    { id: 'tournament2', name: 'Weekend Battle', path: '/tournaments/weekend-battle', prize: '5,000 FLOW' },
  ],
  pages: [
    { id: 'page1', name: 'Bank', path: '/bank', description: 'Deposit and withdraw funds' },
    { id: 'page2', name: 'Profile', path: '/profile', description: 'Your account details' },
  ]
};

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userAddress, setUserAddress] = useState(null);
  const [isClient, setIsClient] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const searchInputRef = useRef(null);
  const searchPanelRef = useRef(null);
  const notification = useNotification();
  const isDev = process.env.NODE_ENV === 'development';
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const dispatch = useDispatch();
  const { userFlowBalance, isLoading: isLoadingBalance } = useSelector((state) => state.balance);
  const [walletNetworkName, setWalletNetworkName] = useState("");

  // Flow balance management
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [flowDepositAmount, setFlowDepositAmount] = useState("");
  const [isFlowDepositing, setIsFlowDepositing] = useState(false);
  const [flowWithdrawAmount, setFlowWithdrawAmount] = useState("0");
  const [isFlowWithdrawing, setIsFlowWithdrawing] = useState(false);
  
  const [showLiveChat, setShowLiveChat] = useState(false);

  // Format Flow balance for display
  const formatFlowBalance = (balance) => {
    const numBalance = parseFloat(balance || '0');
    return numBalance === 0 ? '0' : numBalance.toFixed(5);
  };


  // Flow wallet connection
  const { 
    isConnected, 
    address, 
    isConnecting, 
    isDisconnecting, 
    error: walletError,
    getFlowBalance,
    transferToTreasury
  } = useFlowWallet();
  const isWalletReady = isConnected && address;

  // Debug wallet connection
  useEffect(() => {
    console.log('🔗 Flow wallet connection state:', { 
      isConnected, 
      address, 
      isConnecting,
      isDisconnecting,
      walletError,
      isWalletReady 
    });
  }, [isConnected, address, isConnecting, isDisconnecting, walletError, isWalletReady]);


  // Mock notifications for UI purposes
  const [notifications, setNotifications] = useState([
    {
      id: '1',
      title: 'Balance Updated',
      message: 'Your FLOW balance has been updated',
      isRead: false,
      time: '2 min ago'
    },
    {
      id: '2',
      title: 'New Tournament',
      message: 'High Roller Tournament starts in 1 hour',
      isRead: false,
      time: '1 hour ago'
    }
  ]);


  // Reset Flow balance if it's corrupted
  const resetFlowBalanceIfCorrupted = () => {
    const currentBalance = localStorage.getItem('userFlowBalance');
    if (currentBalance && parseFloat(currentBalance) > 100000) {
      console.warn('🚨 Detected corrupted Flow balance:', currentBalance, 'Resetting to 0');
      localStorage.setItem('userFlowBalance', '0');
      dispatch(setFlowBalance('0'));
      notification.info('Flow bakiyesi sıfırlandı (bozuk veri tespit edildi)');
    }
  };

  // Load Flow treasury balance (separate from wallet balance)
  const loadFlowBalance = async () => {
    if (!address) return;
    
    try {
      // First check for corrupted balance
      resetFlowBalanceIfCorrupted();
      
      // Load Flow treasury balance from localStorage
      const localFlowBalance = localStorage.getItem(`userFlowBalance_${address}`);
      console.log('Loading Flow treasury balance from localStorage:', localFlowBalance);
      
      if (localFlowBalance && parseFloat(localFlowBalance) >= 0 && parseFloat(localFlowBalance) < 100000) {
        dispatch(setFlowBalance(localFlowBalance));
        console.log('Flow treasury balance loaded from localStorage:', localFlowBalance);
      } else {
        // Try global Flow balance
        const globalFlowBalance = localStorage.getItem('userFlowBalance');
        if (globalFlowBalance && parseFloat(globalFlowBalance) >= 0 && parseFloat(globalFlowBalance) < 100000) {
          dispatch(setFlowBalance(globalFlowBalance));
          console.log('Global Flow treasury balance loaded:', globalFlowBalance);
        } else {
          dispatch(setFlowBalance("0"));
        }
      }
      
    } catch (error) {
      console.error('Error loading Flow treasury balance:', error);
      dispatch(setFlowBalance("0"));
    }
  };


  // Load balance when wallet connects
  useEffect(() => {
    if (isWalletReady && address) {
      // Load Flow treasury balance
      loadFlowBalance();
    }
  }, [isWalletReady, address]);
  
  // Auto-refresh Flow balance every 5 seconds when wallet is connected
  useEffect(() => {
    if (!isWalletReady || !address) return;
    
    const interval = setInterval(() => {
      const localFlowBalance = localStorage.getItem('userFlowBalance');
      if (localFlowBalance && localFlowBalance !== userFlowBalance) {
        console.log('Auto-refreshing Flow balance:', { localFlowBalance, userFlowBalance });
        dispatch(setFlowBalance(localFlowBalance));
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isWalletReady, address, userFlowBalance]);
  
  // Load deposit history


  // Check if wallet was previously connected on page load
  useEffect(() => {
    const checkWalletConnection = async () => {
      // Check if wallet was previously connected
      const wasConnected = localStorage.getItem('flow.connected');
      if (wasConnected === 'true') {
        console.log('🔄 Flow wallet was previously connected, restoring balance...');
        
        // Restore balance from localStorage
        const savedBalance = localStorage.getItem('userBalance');
        if (savedBalance) {
          console.log('💰 Restoring balance from localStorage:', savedBalance);
          dispatch(setBalance(parseFloat(savedBalance)));
        }
      }
    };
    
    checkWalletConnection();
  }, [dispatch]);

  useEffect(() => {
    setIsClient(true);
    setUnreadNotifications(notifications.filter(n => !n.isRead).length);
    
    // Check for corrupted Flow balance on startup
    if (isFlowBalanceCorrupted()) {
      console.warn('🚨 Corrupted Flow balance detected on startup');
      resetFlowBalance();
      return; // Page will reload
    }
    
    // Initialize dark mode from local storage if available
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode !== null) {
      setIsDarkMode(savedMode === 'true');
    }
    
    // Flow wallet integration - simplified for testnet only
    // In development mode, use mock data
    if (isDev) {
      setUserAddress('0x1234...dev');
    }
    
    // Handle click outside search panel
    const handleClickOutside = (event) => {
      if (
        searchPanelRef.current && 
        !searchPanelRef.current.contains(event.target) &&
        !searchInputRef.current?.contains(event.target)
      ) {
        setShowSearch(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDev, notifications]);

  // Close balance modal with ESC
  useEffect(() => {
    if (!showBalanceModal) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setShowBalanceModal(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showBalanceModal]);
  
  // Poll for balance changes
  const pollForBalance = async (initialBalance, attempts = 10, interval = 2000) => {
    dispatch(setLoading(true));
    for (let i = 0; i < attempts; i++) {
      try {
        const newBalance = await UserBalanceSystem.getBalance(address);
        if (newBalance !== initialBalance) {
          dispatch(setBalance(newBalance));
          notification.success('Balance updated successfully!');
          dispatch(setLoading(false));
          return;
        }
      } catch (error) {
        console.error(`Polling attempt ${i + 1} failed:`, error);
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    notification.error('Balance update timed out. Please refresh manually.');
    dispatch(setLoading(false));
  };


  // Debug treasury balance
  const debugTreasuryBalance = async () => {
    console.log('🔍 === TREASURY BALANCE DEBUG ===');
    
    // Check local balance
    const localBalance = checkLocalTreasuryBalance(address);
    console.log('Local treasury balance:', localBalance);
    
    // Check Redux balance
    console.log('Redux Flow balance:', userFlowBalance);
    
    // Check actual treasury balance on-chain
    const treasuryInfo = await checkTreasuryBalance();
    console.log('On-chain treasury info:', treasuryInfo);
    
    return {
      local: localBalance,
      redux: userFlowBalance,
      onChain: treasuryInfo
    };
  };

  // Handle Flow withdraw from treasury
  const handleFlowWithdraw = async () => {
    if (!isConnected || !address) {
      notification.error('Please connect your Flow wallet first');
      return;
    }
    
    // Debug treasury balance first
    console.log('🔍 Debugging treasury balance before withdrawal...');
    const balanceInfo = await debugTreasuryBalance();
    console.log('Balance info:', balanceInfo);

    const amount = parseFloat(flowWithdrawAmount);
    if (!amount || amount <= 0) {
      notification.error('Please enter a valid Flow withdrawal amount');
      return;
    }

    // Check if user has sufficient Flow balance in treasury
    const currentFlowBalance = parseFloat(userFlowBalance || '0');
    if (currentFlowBalance < amount) {
      notification.error(`Insufficient Flow treasury balance. You have ${currentFlowBalance} FLOW, but trying to withdraw ${amount} FLOW`);
      return;
    }

    // Check withdrawal limits
    if (amount < FLOW_TREASURY_CONFIG.MIN_WITHDRAW) {
      notification.error(`Minimum Flow withdrawal amount is ${FLOW_TREASURY_CONFIG.MIN_WITHDRAW} FLOW`);
      return;
    }

    if (amount > FLOW_TREASURY_CONFIG.MAX_WITHDRAW) {
      notification.error(`Maximum Flow withdrawal amount is ${FLOW_TREASURY_CONFIG.MAX_WITHDRAW} FLOW per transaction`);
      return;
    }

    setIsFlowWithdrawing(true);
    console.log('🚀 Starting Flow withdrawal process for:', amount, 'FLOW');

    try {
      console.log('Withdrawing from Flow treasury:', { address: address, amount });

      // Call Flow withdrawal API
      const result = await FlowBalanceSystem.withdraw(address, amount);
      
      if (result.success) {
        console.log('🔄 Flow balance update after withdrawal:', { currentFlowBalance, amount });
        
        // Use subtractFromFlowBalance for safer arithmetic
        dispatch(subtractFromFlowBalance(amount));
        
        console.log('✅ Flow balance updated in Redux store after withdrawal');
        
        notification.success(`Successfully withdrew ${amount} FLOW! Transaction ID: ${result.transactionId?.slice(0, 10)}...`);
        setFlowWithdrawAmount("0"); // Reset the input
        
        // Close modal if it exists
        setShowWithdrawModal(false);
      } else {
        throw new Error(result.error || 'Flow withdrawal failed');
      }

    } catch (error) {
      console.error('Flow withdrawal error:', error);
      
      // Safe error message handling
      const errorMessage = error?.message || 'Unknown error occurred';
      const safeErrorMessage = typeof errorMessage === 'string' ? errorMessage : 'Unknown error occurred';
      
      notification.error(`Flow withdrawal failed: ${safeErrorMessage}`);
    } finally {
      setIsFlowWithdrawing(false);
    }
  };


  // Handle Flow deposit to treasury
  const handleFlowDeposit = async () => {
    // Prevent multiple simultaneous deposits
    if (isFlowDepositing) {
      console.log('🚫 Flow deposit already in progress, ignoring duplicate call');
      return;
    }
    
    if (!isConnected || !address) {
      notification.error('Please connect your Flow wallet first');
      return;
    }

    const amount = parseFloat(flowDepositAmount);
    if (!amount || amount <= 0) {
      notification.error('Please enter a valid Flow deposit amount');
      return;
    }
    
    // Check deposit limits
    if (amount < FLOW_TREASURY_CONFIG.MIN_DEPOSIT) {
      notification.error(`Minimum Flow deposit amount is ${FLOW_TREASURY_CONFIG.MIN_DEPOSIT} FLOW`);
      return;
    }

    setIsFlowDepositing(true);
    console.log('🚀 Starting Flow deposit process for:', amount, 'FLOW');
    
    try {
      console.log('Depositing to Flow treasury:', { address: address, amount });
      
      // Test Flow connection first
      console.log('🔍 Testing Flow connection...');
      const connectionOk = await testFlowConnection();
      if (!connectionOk) {
        throw new Error('Flow network connection failed. Please check your internet connection and try again.');
      }
      
      // Get user's Flow balance first to check if they have enough
      console.log('🔍 Checking user Flow balance for address:', address);
      
      // Run debug check to see all balance methods with retry
      const debugResult = await withRetry(() => debugFlowBalance(address));
      console.log('🔍 Debug balance results:', debugResult);
      
      const userFlowBalance = await withRetry(() => getFlowBalance());
      console.log('🔍 Retrieved Flow balance from hook:', userFlowBalance, typeof userFlowBalance);
      
      // Try alternative balance if main method returns 0
      let actualBalance = userFlowBalance;
      if (!userFlowBalance || parseFloat(userFlowBalance) === 0) {
        console.log('🔄 Main balance query returned 0, trying native balance...');
        actualBalance = debugResult?.native || 0;
        console.log('🔄 Native balance result:', actualBalance);
      }
      
      if (!actualBalance || parseFloat(actualBalance) < amount) {
        console.error('❌ Insufficient Flow balance detected:', {
          hookBalance: userFlowBalance,
          nativeBalance: debugResult?.native,
          detailedCheck: debugResult?.detailed,
          parsedBalance: parseFloat(actualBalance || '0'),
          requiredAmount: amount,
          userAddress: address
        });
        
        // Provide more helpful error message
        const balanceStr = actualBalance ? parseFloat(actualBalance).toFixed(4) : '0';
        throw new Error(`Yetersiz Flow bakiyesi. Mevcut bakiyeniz: ${balanceStr} FLOW, gerekli miktar: ${amount} FLOW. Lütfen cüzdanınızda yeterli Flow olduğundan emin olun.`);
      }
      
      console.log('✅ Flow balance check passed:', actualBalance, 'FLOW available');

      // Execute real Flow transaction to send FLOW from user wallet to treasury
      console.log('💡 Sending FLOW from user wallet to treasury:', address, '→', FLOW_TREASURY_CONFIG.ADDRESS);
      
      notification.info('Executing Flow transaction...');
      
      // Execute the real Flow transaction
      console.log('💡 Executing Flow transaction...');
      const transaction = await transferToTreasury(amount, FLOW_TREASURY_CONFIG.ADDRESS);
      
      if (!transaction || (!transaction.id && !transaction.transactionId)) {
        throw new Error('İşlem tamamlanamadı. Lütfen tekrar deneyin.');
      }
      
      console.log('✅ Flow transaction completed:', transaction);
      
      // Safe transaction ID handling
      const txId = transaction?.id || transaction?.transactionId || 'unknown';
      const shortTxId = typeof txId === 'string' && txId.length > 10 ? txId.slice(0, 10) + '...' : txId;
      
      notification.success(`Flow transaction successful! ID: ${shortTxId}`);
      
      // After successful transaction, update local Flow balance
      const currentFlowBalance = parseFloat(userFlowBalance || '0');
      const depositAmount = parseFloat(amount);
      
      console.log('🔄 Flow balance update before dispatch:', { 
        currentFlowBalance, 
        depositAmount,
        userFlowBalanceRaw: userFlowBalance,
        amountRaw: amount
      });
      
      // Use addToFlowBalance for safer arithmetic
      dispatch(addToFlowBalance(depositAmount));
      
      console.log('✅ Flow balance updated in Redux store');
      
      // Call Flow deposit API to record the transaction
      try {
        if (address) {
          const txId = transaction?.id || transaction?.transactionId || `flow_tx_${Date.now()}`;
          const result = await FlowBalanceSystem.deposit(address, amount, txId);
          console.log('✅ Flow deposit recorded in API:', result);
        } else {
          console.warn('Flow account address not available for API call');
        }
        
      } catch (apiError) {
        console.warn('⚠️ Could not record Flow deposit in API:', apiError);
        // Don't fail the deposit if API call fails - balance is already updated
      }
      
      notification.success(`Successfully deposited ${amount} FLOW to your treasury balance!`);
      setFlowDepositAmount(""); // Clear the input
      
    } catch (error) {
      console.error('Flow deposit error:', error);
      
      // Provide user-friendly error messages in English
      let errorMessage = error.message;
      if (error.message.includes('network') || error.message.includes('connection')) {
        errorMessage = 'Network connection error. Please check your internet connection and try again.';
      } else if (error.message.includes('insufficient') || error.message.includes('Yetersiz')) {
        errorMessage = 'Insufficient balance. Please check your balance and try again.';
      } else if (error.message.includes('transaction')) {
        errorMessage = 'Transaction failed. Please check your wallet and try again.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Transaction timed out. Please try again.';
      } else {
        errorMessage = `Flow deposit error: ${error.message}`;
      }
      
      notification.error(errorMessage);
    } finally {
      setIsFlowDepositing(false);
    }
  };

  // Handle search input
  useEffect(() => {
    if (searchQuery.length > 1) {
      // In a real app, you would call an API here
      // For demo, we'll filter the mock data
      const query = searchQuery.toLowerCase();
      const games = MOCK_SEARCH_RESULTS.games.filter(
        game => game.name.toLowerCase().includes(query)
      );
      const tournaments = MOCK_SEARCH_RESULTS.tournaments.filter(
        tournament => tournament.name.toLowerCase().includes(query)
      );
      const pages = MOCK_SEARCH_RESULTS.pages.filter(
        page => page.name.toLowerCase().includes(query) || 
               (page.description && page.description.toLowerCase().includes(query))
      );
      
      setSearchResults({ games, tournaments, pages });
    } else {
      setSearchResults(null);
    }
  }, [searchQuery]);

  const navLinks = [
    {
      name: "Home",
      path: "/",
      classes: "text-hover-gradient-home",
    },
    {
      name: "Game",
      path: "/game",
      classes: "text-hover-gradient-game",
    },
    {
      name: "Live",
      path: "/live",
      classes: "text-hover-gradient-live",
    },
    {
      name: "Bank",
      path: "/bank",
      classes: "text-hover-gradient-bank",
    },
  ];

  const handleProfileClick = () => {
    router.push("/profile");
  };
  
  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('darkMode', newMode.toString());
    // Here you would also apply the theme change to your app
  };
  
  const markNotificationAsRead = (id) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? {...n, isRead: true} : n)
    );
    setUnreadNotifications(prev => Math.max(0, prev - 1));
  };
  
  const clearAllNotifications = () => {
    setNotifications(prev => prev.map(n => ({...n, isRead: true})));
    setUnreadNotifications(0);
    setShowNotificationsPanel(false);
    notification.success("All notifications marked as read");
  };
  
  const handleSearchIconClick = () => {
    setShowSearch(prev => !prev);
    if (!showSearch) {
      // Focus the search input when opening
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  };
  
  const handleSearchItemClick = (path) => {
    router.push(path);
    setShowSearch(false);
    setSearchQuery('');
  };

  // Pyth Entropy handles randomness generation

  // Detect Flow wallet network (best-effort)
  useEffect(() => {
    const readNetwork = async () => {
      try {
        if (typeof window !== 'undefined' && window.flow?.network) {
          const n = await window.flow.network();
          if (n?.name) setWalletNetworkName(String(n.name).toLowerCase());
        }
      } catch {}
    };
    readNetwork();
    const off = window?.flow?.onNetworkChange?.((n) => {
      try { setWalletNetworkName(String(n?.name || '').toLowerCase()); } catch {}
    });
    return () => {
      try { off && off(); } catch {}
    };
  }, []);

      // switchToTestnet function removed

  return (
    <>
      <nav className="backdrop-blur-md bg-[#070005]/90 fixed w-full z-20 transition-all duration-300 shadow-lg">
        <div className="flex w-full items-center justify-between py-6 px-4 sm:px-10 md:px-20 lg:px-36">
          <div className="flex items-center">
            <a href="/" className="logo mr-6">
            <Image
              src="/PowerPlay.png"
              alt="powerplay image"
              width={172}
              height={15}
              />
            </a>
            
            {/* Mobile menu button */}
            <button 
              className="md:hidden text-white p-1 rounded-lg hover:bg-purple-500/20 transition-colors"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              aria-label="Toggle mobile menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {showMobileMenu ? (
                  <>
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </>
                ) : (
                  <>
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                  </>
                )}
              </svg>
            </button>
          </div>
          
          {/* Desktop Navigation Links */}
          <div className="hidden md:flex font-display gap-8 lg:gap-12 items-center">
            {navLinks.map(({ name, path, classes }, index) => (
              <div key={index} className="relative group">
              <Link
                  className={`${path === pathname ? "text-transparent bg-clip-text bg-gradient-to-r from-red-magic to-blue-magic font-semibold" : classes} flex items-center gap-1 text-lg font-medium transition-all duration-200 hover:scale-105`}
                href={path}
              >
                {name}
              </Link>
              </div>
            ))}
          </div>
          
          <div className="flex items-center gap-2 md:gap-3">
            {/* Search Icon */}
            <div className="relative">
              <button 
                className="p-2 text-white/70 hover:text-white transition-colors rounded-full hover:bg-purple-500/20"
                onClick={handleSearchIconClick}
                aria-label="Search"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </button>
              
              {/* Search Panel */}
              {showSearch && (
                <div 
                  className="absolute right-0 mt-2 w-80 md:w-96 bg-[#1A0015]/95 backdrop-blur-md border border-purple-500/30 rounded-lg shadow-xl z-40 animate-fadeIn"
                  ref={searchPanelRef}
                >
                  <div className="p-3">
                    <div className="relative">
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search games, tournaments..."
                        className="w-full py-2 px-3 pr-10 bg-[#250020] border border-purple-500/20 rounded-md text-white focus:outline-none focus:border-purple-500"
                      />
                      <svg 
                        className="absolute right-3 top-2.5 text-white/50" 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="16" 
                        height="16" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2"
                      >
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      </svg>
                    </div>
                  </div>
                  
                  {searchQuery.length > 1 && (
                    <div className="max-h-96 overflow-y-auto">
                      {(!searchResults || 
                        (searchResults.games.length === 0 && 
                         searchResults.tournaments.length === 0 && 
                         searchResults.pages.length === 0)) ? (
                        <div className="p-4 text-center text-white/50">
                          No results found
                        </div>
                      ) : (
                        <>
                          {/* Games */}
                          {searchResults.games.length > 0 && (
                            <div className="p-2">
                              <h3 className="text-xs font-medium text-white/50 uppercase px-3 mb-1">Games</h3>
                              {searchResults.games.map(game => (
                                <div 
                                  key={game.id}
                                  className="p-2 hover:bg-purple-500/10 rounded-md cursor-pointer mx-1"
                                  onClick={() => handleSearchItemClick(game.path)}
                                >
                                  <div className="flex items-center">
                                    <div className="w-8 h-8 rounded-md bg-purple-800/30 flex items-center justify-center mr-3">
                                      <span className="text-sm">{game.name.charAt(0)}</span>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-white">{game.name}</p>
                                      <span className="text-xs text-white/50">{game.type}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Tournaments */}
                          {searchResults.tournaments.length > 0 && (
                            <div className="p-2">
                              <h3 className="text-xs font-medium text-white/50 uppercase px-3 mb-1">Tournaments</h3>
                              {searchResults.tournaments.map(tournament => (
                                <div 
                                  key={tournament.id}
                                  className="p-2 hover:bg-purple-500/10 rounded-md cursor-pointer mx-1"
                                  onClick={() => handleSearchItemClick(tournament.path)}
                                >
                                  <div className="flex items-center">
                                    <div className="w-8 h-8 rounded-md bg-red-800/30 flex items-center justify-center mr-3">
                                      <span className="text-sm">🏆</span>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-white">{tournament.name}</p>
                                      <span className="text-xs text-white/50">Prize: {tournament.prize}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Pages */}
                          {searchResults.pages.length > 0 && (
                            <div className="p-2">
                              <h3 className="text-xs font-medium text-white/50 uppercase px-3 mb-1">Pages</h3>
                              {searchResults.pages.map(page => (
                                <div 
                                  key={page.id}
                                  className="p-2 hover:bg-purple-500/10 rounded-md cursor-pointer mx-1"
                                  onClick={() => handleSearchItemClick(page.path)}
                                >
                                  <div className="flex items-center">
                                    <div className="w-8 h-8 rounded-md bg-blue-800/30 flex items-center justify-center mr-3">
                                      <span className="text-sm">{page.name.charAt(0)}</span>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-white">{page.name}</p>
                                      {page.description && (
                                        <span className="text-xs text-white/50">{page.description}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  
                  {searchQuery.length > 0 && (
                    <div className="p-2 border-t border-purple-500/20 text-center">
                      <span className="text-xs text-white/50">
                        Press Enter to search for "{searchQuery}"
                </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          
            {/* Theme Toggle */}
            <button 
              onClick={toggleDarkMode}
              className="p-2 text-white/70 hover:text-white transition-colors hidden md:block rounded-full hover:bg-purple-500/20"
              aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDarkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="4"></circle>
                  <path d="M12 2v2"></path>
                  <path d="M12 20v2"></path>
                  <path d="M5 5l1.5 1.5"></path>
                  <path d="M17.5 17.5l1.5 1.5"></path>
                  <path d="M2 12h2"></path>
                  <path d="M20 12h2"></path>
                  <path d="M5 19l1.5-1.5"></path>
                  <path d="M17.5 6.5l1.5-1.5"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
              )}
            </button>
            
            {/* Notifications */}
            <div className="relative hidden md:block">
              <button 
                onClick={() => setShowNotificationsPanel(!showNotificationsPanel)}
                className="p-2 text-white/70 hover:text-white transition-colors relative rounded-full hover:bg-purple-500/20"
                aria-label="Notifications"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                {unreadNotifications > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center font-bold">
                    {unreadNotifications}
                  </span>
                )}
              </button>
              
              {/* Notifications Panel */}
              {showNotificationsPanel && (
                <div className="absolute right-0 mt-2 w-80 bg-[#1A0015]/95 backdrop-blur-md border border-purple-500/30 rounded-lg shadow-xl z-30 animate-fadeIn">
                  <div className="p-3 border-b border-purple-500/20 flex justify-between items-center">
                    <h3 className="font-medium text-white">Notifications</h3>
                    <button 
                      onClick={clearAllNotifications}
                      className="text-xs text-white/50 hover:text-white"
                    >
                      Mark all as read
                    </button>
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-white/50">
                        No notifications
                      </div>
                    ) : (
                      notifications.map(notification => (
                        <div 
                          key={notification.id}
                          className={`p-3 border-b border-purple-500/10 hover:bg-purple-500/5 cursor-pointer ${!notification.isRead ? 'bg-purple-900/10' : ''}`}
                          onClick={() => markNotificationAsRead(notification.id)}
                        >
                          <div className="flex justify-between">
                            <h4 className="font-medium text-white text-sm">{notification.title}</h4>
                            <span className="text-xs text-white/40">{notification.time}</span>
                          </div>
                          <p className="text-xs text-white/70 mt-1">{notification.message}</p>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-red-500 rounded-full absolute top-3 right-3"></div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  
                  <div className="p-2 border-t border-purple-500/20 text-center">
                    <a href="/notifications" className="text-xs text-white/70 hover:text-white">
                      View all notifications
                    </a>
                  </div>
                </div>
              )}
            </div>
            

            
            {/* User Balance Display */}
            {isWalletReady && (
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-green-900/20 to-green-800/10 rounded-lg border border-green-800/30 px-3 py-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-300">Balance:</span>
                    <span className="text-sm text-blue-300 font-medium">
                      {isLoadingBalance ? 'Loading...' : `${formatFlowBalance(userFlowBalance)} FLOW`}
                    </span>
                    <button
                      onClick={() => setShowBalanceModal(true)}
                      className="ml-2 text-xs bg-green-600/30 hover:bg-green-500/30 text-green-300 px-2 py-1 rounded transition-colors"
                    >
                      Manage
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Flow Testnet Status */}
            {isConnected && (
              <div className="px-3 py-2 bg-gradient-to-r from-blue-500/20 to-purple-600/20 border border-blue-500/30 text-blue-300 font-medium rounded-lg flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
                Flow Testnet
              </div>
            )}
            
            {/* Live Chat Button */}
            <button
              onClick={() => setShowLiveChat(true)}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium rounded-lg transition-all duration-200 hover:scale-105 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              Live Chat
            </button>
            
            {/* Flow Wallet Button */}
            <FlowConnectWalletButton />
      
          </div>
        </div>
        
        {/* Mobile Navigation Menu */}
        {showMobileMenu && (
          <div className="md:hidden bg-[#0A0008]/95 backdrop-blur-md p-4 border-t border-purple-500/20 animate-slideDown">
            <div className="flex flex-col space-y-3">
              {navLinks.map(({ name, path, classes }, index) => (
                <div key={index}>
                  <Link
                    className={`${path === pathname ? 'text-white font-semibold' : 'text-white/80'} py-2 px-3 rounded-md hover:bg-purple-500/10 flex items-center w-full text-lg`}
                    href={path}
                    onClick={() => setShowMobileMenu(false)}
                  >
                    {name}
                  </Link>
                </div>
              ))}
              {/* Switch to Testnet button removed */}
              <div className="flex justify-between items-center py-2 px-3">
                <span className="text-white/70">Dark Mode</span>
                <button 
                  onClick={toggleDarkMode}
                  className="p-2 text-white/70 hover:text-white bg-purple-500/10 rounded-full flex items-center justify-center h-8 w-8"
                >
                  {isDarkMode ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="4"></circle>
                      <path d="M12 2v2"></path>
                      <path d="M12 20v2"></path>
                      <path d="M5 5l1.5 1.5"></path>
                      <path d="M17.5 17.5l1.5 1.5"></path>
                      <path d="M2 12h2"></path>
                      <path d="M20 12h2"></path>
                      <path d="M5 19l1.5-1.5"></path>
                      <path d="M17.5 6.5l1.5-1.5"></path>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                    </svg>
                  )}
                </button>
              </div>
              
              {/* User Balance in Mobile Menu */}
              {isWalletReady && (
                <div className="pt-2 mt-2 border-t border-purple-500/10">
                  <div className="p-3 bg-gradient-to-r from-green-900/20 to-green-800/10 rounded-lg border border-green-800/30">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-300">FLOW Balance:</span>
                      <span className="text-sm text-blue-300 font-medium">
                        {isLoadingBalance ? 'Loading...' : `${formatFlowBalance(userFlowBalance)} FLOW`}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setShowBalanceModal(true);
                        setShowMobileMenu(false);
                      }}
                      className="w-full text-xs bg-green-600/30 hover:bg-green-500/30 text-green-300 px-3 py-2 rounded transition-colors"
                    >
                      Manage Balance
                    </button>
                  </div>
                </div>
              )}
              
              <div className="pt-2 mt-2 border-t border-purple-500/10">
                <a 
                  href="#support" 
                  className="block py-2 px-3 text-white/80 hover:text-white hover:bg-purple-500/10 rounded-md"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Support
                </a>
              </div>
            </div>
          </div>
        )}
        
        {/* Balance Management Modal (portal) */}
        {isClient && showBalanceModal && createPortal(
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowBalanceModal(false)}
          >
            <div
              className="bg-[#0A0008] border border-purple-500/20 rounded-lg p-6 w-full max-w-md mx-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">FLOW Treasury</h3>
                <button
                  onClick={() => setShowBalanceModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Current Balance */}
              <div className="mb-4">
                <div className="p-3 bg-gradient-to-r from-blue-900/20 to-blue-800/10 rounded-lg border border-blue-800/30">
                  <span className="text-sm text-gray-300">Current Balance:</span>
                  <div className="text-lg text-blue-300 font-bold">
                    {isLoadingBalance ? 'Loading...' : `${formatFlowBalance(userFlowBalance)} FLOW`}
                  </div>
                </div>
              </div>
              
              {/* Flow Deposit Section */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-white mb-2">Deposit FLOW to Treasury</h4>
                <div className="text-xs text-gray-400 mb-2">
                  Treasury: {FLOW_TREASURY_CONFIG.ADDRESS.slice(0, 10)}...{FLOW_TREASURY_CONFIG.ADDRESS.slice(-8)}
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={flowDepositAmount}
                    onChange={(e) => setFlowDepositAmount(e.target.value)}
                    placeholder="Enter FLOW amount"
                    className="flex-1 px-3 py-2 bg-gray-800/50 border border-gray-600/50 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25"
                    min="0"
                    step="0.00000001"
                    disabled={isFlowDepositing}
                  />
                  <button
                    onClick={handleFlowDeposit}
                    disabled={!isConnected || !flowDepositAmount || parseFloat(flowDepositAmount) <= 0 || isFlowDepositing}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded font-medium transition-colors flex items-center gap-2"
                  >
                    {isFlowDepositing ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white/20 border-t-white rounded-full"></div>
                        Depositing...
                      </>
                    ) : (
                      <>
                        Deposit
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8l-8-8-8 8" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Transfer FLOW from your wallet to house balance for gaming
                </p>
                {/* Quick Deposit Buttons */}
                <div className="flex gap-1 mt-2">
                  {[100, 500, 1000, 5000].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setFlowDepositAmount(amount.toString())}
                      className="flex-1 px-2 py-1 text-xs bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 rounded transition-colors"
                      disabled={isFlowDepositing}
                    >
                      {amount} FLOW
                    </button>
                  ))}
                </div>
                
              </div>

              {/* Withdraw Section */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-white mb-2">Withdraw FLOW</h4>
                <div className="flex gap-2 mb-2">
                  <input
                    type="number"
                    value={flowWithdrawAmount}
                    onChange={(e) => setFlowWithdrawAmount(e.target.value)}
                    placeholder="Enter amount to withdraw"
                    className="flex-1 px-3 py-2 bg-gray-800/50 border border-gray-600/50 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25"
                    min="0"
                    step="0.00000001"
                    disabled={isFlowWithdrawing}
                  />
                  <button
                    onClick={handleFlowWithdraw}
                    disabled={!isConnected || parseFloat(userFlowBalance || '0') <= 0 || isFlowWithdrawing || !flowWithdrawAmount || parseFloat(flowWithdrawAmount) <= 0}
                    className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded font-medium transition-colors flex items-center gap-2"
                  >
                    {isFlowWithdrawing ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white/20 border-t-white rounded-full"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        Withdraw
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
                <button
                  onClick={() => setFlowWithdrawAmount(userFlowBalance || '0')}
                  disabled={!isConnected || parseFloat(userFlowBalance || '0') <= 0 || isFlowWithdrawing}
                  className="w-full px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 disabled:bg-gray-800/50 disabled:cursor-not-allowed text-gray-300 rounded text-sm transition-colors"
                >
                  Withdraw All ({formatFlowBalance(userFlowBalance)} FLOW)
                </button>
                {isConnected && parseFloat(userFlowBalance || '0') > 0 && (
                  <p className="text-xs text-gray-400 mt-1 text-center">
                    Available: {formatFlowBalance(userFlowBalance)} FLOW
                  </p>
                )}
              </div>
              
              {/* Refresh Balance */}
              <div className="mt-6">
                <button
                  onClick={() => {
                    // Only refresh from localStorage, don't try blockchain
                    const savedBalance = loadBalanceFromStorage(address);
                    if (savedBalance && savedBalance !== "0") {
                      console.log('Refreshing balance from localStorage:', savedBalance);
                      dispatch(setBalance(savedBalance));
                    } else {
                      console.log('No saved balance in localStorage');
                    }
                  }}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition-colors"
                >
                  Refresh Balance
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
        
        <div className="w-full h-[2px] magic-gradient overflow-hidden"></div>
      </nav>
      
      {/* Pyth Entropy handles randomness generation */}
      
      {/* Live Chat Modal */}
      <LiveChat
        open={showLiveChat}
        onClose={() => setShowLiveChat(false)}
      />
      
    </>
  );
}