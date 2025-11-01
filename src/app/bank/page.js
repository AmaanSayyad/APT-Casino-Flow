"use client";
import React, { useState, useEffect, useCallback } from 'react';
import HeaderText from "@/components/HeaderText";
import StatsOverview from "@/components/StatsOverview";

import BorrowCard from "@/components/BorrowCard";
import LendingTable from "@/components/LendingTable";
import Image from "next/image";
import { FaChartLine, FaHistory, FaInfoCircle, FaExchangeAlt, FaCoins, FaWallet, FaLock, FaUnlock, FaRobot, FaCog, FaClock, FaSync, FaPlay, FaPause, FaBolt } from "react-icons/fa";
import { flowAutomationService } from "@/services/FlowAutomationService";
import { useSelector, useDispatch } from 'react-redux';
import { setFlowBalance, setFrothBalance } from '@/store/balanceSlice';
import { FROTH_CONFIG } from '@/config/flow';
import { addTestFrothBalance, setTestFrothBalance, FROTH_TEST_AMOUNTS, resetFrothBalance } from '@/utils/frothTestUtils';

// Assets for borrowing on Flow testnet only
const BORROW_ASSETS = {
  ethereum_testnet: [
    {
      symbol: "FLOW",
      name: "Flow Testnet Coin",
      iconColor: "#F1324D",
      address: null // Native token
    }
  ]
};

// Mock transaction history
const MOCK_TRANSACTIONS = [
  { type: 'deposit', token: 'FLOW', amount: '120.5', date: new Date(Date.now() - 86400000 * 2), status: 'completed' },
  { type: 'borrow', token: 'MNT', amount: '0.3', date: new Date(Date.now() - 86400000), status: 'completed' },
  { type: 'swap', tokenFrom: 'MNT', tokenTo: 'FLOW', amountFrom: '0.2', amountTo: '98.32', date: new Date(), status: 'completed' }
];

export default function Bank() {
  const [chainId, setChainId] = useState('ethereum_testnet'); // Default to Flow testnet
  const [assets, setAssets] = useState([]);
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('balances'); // Default to balances tab
  const [transactions, setTransactions] = useState([]);
  const [showNetworkBanner, setShowNetworkBanner] = useState(true);
  const [marketTrends, setMarketTrends] = useState({
    ethPrice: 2.83,
    eth24hChange: 12.5,
    marketCap: 18500000,
    totalLocked: 3200000
  });

  // Redux state for balances
  const dispatch = useDispatch();
  const { userFlowBalance, userFrothBalance } = useSelector((state) => state.balance);

  // Flow Automation States
  const [automationRules, setAutomationRules] = useState([]);
  const [showAutomationModal, setShowAutomationModal] = useState(false);
  const [automationStats, setAutomationStats] = useState({
    totalRules: 0,
    activeRules: 0,
    totalSaved: 0,
    lastExecution: null
  });

  const isDev = process.env.NODE_ENV === 'development';

  // Format currency with dollar sign
  const formatCurrency = useCallback((value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }, []);

  // Format large numbers with commas
  const formatNumber = useCallback((value) => {
    return new Intl.NumberFormat('en-US').format(value);
  }, []);

  useEffect(() => {
    setIsClient(true);

    // In development mode, use mock data
    if (isDev) {
      setChainId('ethereum_testnet'); // Flow testnet for development
      setAssets([
        {
          symbol: "FLOW",
          name: "Flow Testnet Coin",
          iconColor: "#F1324D",
          address: "0x...",
          apr: "12.5%",
          totalDeposited: "$240,000",
          available: "$120,000"
        },
        {
          symbol: "APTC",
          name: "APT Casino Token",
          iconColor: "#34C759",
          address: "0x...",
          apr: "8.2%",
          totalDeposited: "$520,000",
          available: "$320,000"
        },
        {
          symbol: "FLOW",
          name: "Flow",
          iconColor: "#2196F3",
          address: null,
          apr: "4.8%",
          totalDeposited: "$180,000",
          available: "$95,000"
        }
      ]);

      // Set mock transactions
      setTransactions(MOCK_TRANSACTIONS);

      // Initialize Flow Automation mock data
      setAutomationRules([
        {
          id: 1,
          name: "Auto Stake FLOW",
          type: "auto_stake",
          condition: "balance >= 100 FLOW",
          action: "Stake 80% of balance",
          status: "active",
          lastTriggered: new Date(Date.now() - 86400000),
          totalSaved: 45.2
        },
        {
          id: 2,
          name: "Compound Rewards",
          type: "compound",
          condition: "rewards >= 5 FLOW",
          action: "Reinvest all rewards",
          status: "active",
          lastTriggered: new Date(Date.now() - 3600000),
          totalSaved: 12.8
        },
        {
          id: 3,
          name: "Rebalance Portfolio",
          type: "rebalance",
          condition: "Weekly on Sunday",
          action: "Maintain 60/40 FLOW/USDC",
          status: "paused",
          lastTriggered: new Date(Date.now() - 604800000),
          totalSaved: 23.1
        }
      ]);

      setAutomationStats({
        totalRules: 3,
        activeRules: 2,
        totalSaved: 81.1,
        lastExecution: new Date(Date.now() - 3600000)
      });

      setIsLoading(false);
      return;
    }

    // Load Flow testnet data
    const loadChainData = async () => {
      try {
        // Set to Flow testnet
        setChainId('ethereum_testnet');

        // Set mock lending market data for Flow testnet
        setAssets([
          {
            symbol: "FLOW",
            name: "Flow Testnet Coin",
            iconColor: "#F1324D",
            address: "0x...",
            apr: "12.5%",
            totalDeposited: "$240,000",
            available: "$120,000"
          },
          {
            symbol: "APTC",
            name: "APT Casino Token",
            iconColor: "#34C759",
            address: "0x...",
            apr: "8.2%",
            totalDeposited: "$520,000",
            available: "$320,000"
          }
        ]);

        // Load transaction history
        setTransactions(MOCK_TRANSACTIONS);

        // Initialize Flow Automation data for production
        setAutomationRules([
          {
            id: 1,
            name: "Auto Stake FLOW",
            type: "auto_stake",
            condition: "balance >= 100 FLOW",
            action: "Stake 80% of balance",
            status: "active",
            lastTriggered: new Date(Date.now() - 86400000),
            totalSaved: 45.2
          },
          {
            id: 2,
            name: "Compound Rewards",
            type: "compound",
            condition: "rewards >= 5 FLOW",
            action: "Reinvest all rewards",
            status: "active",
            lastTriggered: new Date(Date.now() - 3600000),
            totalSaved: 12.8
          }
        ]);

        setAutomationStats({
          totalRules: 2,
          activeRules: 2,
          totalSaved: 58.0,
          lastExecution: new Date(Date.now() - 3600000)
        });

        setIsLoading(false);
      } catch (err) {
        console.warn("Failed to load chain data:", err);
        setIsLoading(false);
      }
    };

    loadChainData();
  }, [isDev]);

  // Get appropriate borrow assets for Flow testnet
  const borrowAssets = BORROW_ASSETS.ethereum_testnet;

  // Flow Automation Functions
  const toggleAutomationRule = useCallback((ruleId) => {
    setAutomationRules(prev => prev.map(rule =>
      rule.id === ruleId
        ? { ...rule, status: rule.status === 'active' ? 'paused' : 'active' }
        : rule
    ));
  }, []);

  const createAutomationRule = useCallback((ruleData) => {
    const newRule = {
      id: Date.now(),
      ...ruleData,
      status: 'active',
      lastTriggered: null,
      totalSaved: 0
    };
    setAutomationRules(prev => [...prev, newRule]);
    setAutomationStats(prev => ({
      ...prev,
      totalRules: prev.totalRules + 1,
      activeRules: prev.activeRules + 1
    }));
  }, []);

  const executeAutomationRule = useCallback(async (ruleId) => {
    try {
      console.log(`Executing automation rule ${ruleId}`);

      // Execute rule using Flow Automation Service
      await flowAutomationService.executeAutomationRules("0x01", [ruleId]);

      // Update rule execution time
      setAutomationRules(prev => prev.map(rule =>
        rule.id === ruleId
          ? { ...rule, lastTriggered: new Date() }
          : rule
      ));

      setAutomationStats(prev => ({
        ...prev,
        lastExecution: new Date()
      }));

      console.log("✅ Automation rule executed successfully");
    } catch (error) {
      console.error("❌ Failed to execute automation rule:", error);
    }
  }, []);

  // Initialize Flow Automation Service
  useEffect(() => {
    const initializeAutomation = async () => {
      try {
        await flowAutomationService.initialize();
        console.log("🤖 Flow Automation Service ready");
      } catch (error) {
        console.error("❌ Failed to initialize Flow Automation:", error);
      }
    };

    if (isClient) {
      initializeAutomation();
    }
  }, [isClient]);

  // Animated number component for stats
  const AnimatedNumber = ({ value, prefix = '', suffix = '', duration = 2000 }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
      let startValue = 0;
      const endValue = parseFloat(value);
      const startTime = Date.now();

      const updateValue = () => {
        const now = Date.now();
        const elapsed = now - startTime;

        if (elapsed >= duration) {
          setDisplayValue(endValue);
          return;
        }

        const progress = elapsed / duration;
        const currentValue = startValue + progress * (endValue - startValue);
        setDisplayValue(currentValue);
        requestAnimationFrame(updateValue);
      };

      requestAnimationFrame(updateValue);

      return () => {
        startValue = displayValue;
      };
    }, [value, duration]);

    return (
      <span>
        {prefix}{typeof displayValue === 'number' ? displayValue.toFixed(2) : displayValue}{suffix}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sharp-black to-[#150012] text-white">
      <div className="container mx-auto px-4 lg:px-8 pt-32 pb-16">
        {/* Network banner moved inside the container and positioned after the navbar */}
        {showNetworkBanner && (
          <div className="bg-gradient-to-r from-red-magic/80 to-blue-magic/80 py-2 px-4 text-center relative mb-8 rounded-lg">
            <p className="text-white text-sm">
              Connected to Flow Testnet Testnet.
              <button className="underline ml-2">Switch Network</button>
            </p>
            <button
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white"
              onClick={() => setShowNetworkBanner(false)}
            >
              ✕
            </button>
          </div>
        )}

        <div className="mb-10 text-center">
          <HeaderText
            header="APT Casino Bank"
            description="Manage your assets, deposit collateral, and borrow tokens to play your favorite casino games"
          />
        </div>

        {/* Main Tabs */}
        <div className="mb-8">
          <div className="flex border-b border-white/10 overflow-x-auto custom-scrollbar">
            <button
              className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${activeTab === 'balances' ? 'text-white border-b-2 border-blue-magic' : 'text-white/50 hover:text-white/80'}`}
              onClick={() => setActiveTab('balances')}
            >
              <FaWallet /> Balances
            </button>
            <button
              className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${activeTab === 'swap' ? 'text-white border-b-2 border-blue-magic' : 'text-white/50 hover:text-white/80'}`}
              onClick={() => setActiveTab('swap')}
            >
              <FaExchangeAlt /> Swap
            </button>
            <button
              className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${activeTab === 'borrow' ? 'text-white border-b-2 border-blue-magic' : 'text-white/50 hover:text-white/80'}`}
              onClick={() => setActiveTab('borrow')}
            >
              <FaUnlock /> Borrow
            </button>
            <button
              className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${activeTab === 'lend' ? 'text-white border-b-2 border-blue-magic' : 'text-white/50 hover:text-white/80'}`}
              onClick={() => setActiveTab('lend')}
            >
              <FaLock /> Lend
            </button>
            <button
              className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${activeTab === 'automation' ? 'text-white border-b-2 border-blue-magic' : 'text-white/50 hover:text-white/80'}`}
              onClick={() => setActiveTab('automation')}
            >
              <FaRobot /> Flow Automation
            </button>
            <button
              className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${activeTab === 'history' ? 'text-white border-b-2 border-blue-magic' : 'text-white/50 hover:text-white/80'}`}
              onClick={() => setActiveTab('history')}
            >
              <FaHistory /> History
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="mb-12">
          {activeTab === 'balances' && (
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* FLOW Balance Card */}
                <div className="bg-gradient-to-r p-[1px] from-green-500/50 to-green-400/50 rounded-xl">
                  <div className="bg-[#1A0015] rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center mr-3">
                          <FaCoins className="text-green-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">FLOW Balance</h3>
                          <p className="text-sm text-gray-400">Native Flow Token</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <div className="text-3xl font-bold text-white mb-1">
                        {parseFloat(userFlowBalance || '0').toFixed(4)} FLOW
                      </div>
                      <div className="text-sm text-gray-400">
                        ≈ ${(parseFloat(userFlowBalance || '0') * 2.83).toFixed(2)} USD
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const amount = prompt('Enter FLOW amount to add (for testing):');
                          if (amount && !isNaN(amount)) {
                            const newBalance = (parseFloat(userFlowBalance || '0') + parseFloat(amount)).toFixed(4);
                            dispatch(setFlowBalance(newBalance));
                          }
                        }}
                        className="flex-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 py-2 px-4 rounded-lg transition-colors border border-green-600/30"
                      >
                        Add FLOW (Test)
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Reset FLOW balance to 0?')) {
                            dispatch(setFlowBalance('0'));
                          }
                        }}
                        className="bg-red-600/20 hover:bg-red-600/30 text-red-400 py-2 px-4 rounded-lg transition-colors border border-red-600/30"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>

                {/* FROTH Balance Card */}
                <div className="bg-gradient-to-r p-[1px] from-orange-500/50 to-orange-400/50 rounded-xl">
                  <div className="bg-[#1A0015] rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center mr-3">
                          <FaCoins className="text-orange-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">FROTH Balance</h3>
                          <p className="text-sm text-gray-400">KittyPunch Memecoin</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <div className="text-3xl font-bold text-white mb-1">
                        {parseFloat(userFrothBalance || '0').toLocaleString()} FROTH
                      </div>
                      <div className="text-sm text-gray-400">
                        Flow EVM Mainnet Token
                      </div>
                    </div>

                    <div className="text-center py-4">
                      <p className="text-sm text-gray-400 mb-2">
                        FROTH balance is managed through Flow EVM Mainnet
                      </p>
                      <p className="text-xs text-gray-500">
                        Use the Navbar "Manage" button to deposit/withdraw FROTH
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Token Information */}
              <div className="bg-gradient-to-r p-[1px] from-purple-500/50 to-blue-500/50 rounded-xl">
                <div className="bg-[#1A0015] rounded-xl p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">Token Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-lg font-medium text-white mb-3">FLOW Token</h4>
                      <ul className="space-y-2 text-sm text-gray-300">
                        <li>• Native Flow blockchain token</li>
                        <li>• Used for transaction fees and staking</li>
                        <li>• Minimum bet: 0.001 FLOW</li>
                        <li>• Maximum bet: 1000 FLOW</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="text-lg font-medium text-white mb-3">FROTH Token</h4>
                      <ul className="space-y-2 text-sm text-gray-300">
                        <li>• KittyPunch memecoin on Flow EVM</li>
                        <li>• Independent token with its own value</li>
                        <li>• Minimum bet: {FROTH_CONFIG.MIN_BET.toLocaleString()} FROTH</li>
                        <li>• Maximum bet: {FROTH_CONFIG.MAX_BET.toLocaleString()} FROTH</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                    <div className="flex items-center mb-2">
                      <FaInfoCircle className="text-green-400 mr-2" />
                      <span className="text-green-400 font-medium">Mainnet Integration</span>
                    </div>
                    <p className="text-sm text-gray-300">
                      FROTH is a real ERC-20 token on Flow EVM Mainnet. 
                      Deposits and withdrawals interact with the actual FROTH contract.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'swap' && (
            <>
              <div className="max-w-2xl mx-auto mb-12">
                <div className="bg-gradient-to-r p-[1px] from-red-magic to-blue-magic rounded-xl">
                  {/* Flow Testnet Only - No Uniswap Integration */}
                  <div className="bg-gray-800 rounded-lg p-6 text-center">
                    <h3 className="text-xl font-semibold text-white mb-2">Flow Testnet Testnet Only</h3>
                    <p className="text-gray-400">This application works exclusively with Flow testnet</p>
                  </div>
                </div>
              </div>

              {/* Market Trends - Only shown in swap tab */}
              <div className="mb-12 p-[1px] bg-gradient-to-r from-red-magic/50 to-blue-magic/50 rounded-xl">
                <div className="bg-[#1A0015] rounded-xl p-6">
                  <div className="flex items-center mb-4">
                    <FaChartLine className="text-blue-magic mr-2" />
                    <h2 className="text-xl font-display font-medium">Market Trends</h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-[#250020] p-4 rounded-lg hover:bg-[#350030] transition-colors">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-white/70 text-sm">FLOW Price</span>
                        <div className="flex items-center">
                          <div className="h-2 w-16 bg-[#120010] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-red-magic to-blue-magic"
                              style={{ width: `${Math.min(Math.abs(marketTrends.eth24hChange), 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-baseline">
                        <span className="text-2xl font-bold">
                          <AnimatedNumber value={marketTrends.ethPrice} prefix="$" />
                        </span>
                        <span className={`ml-2 text-sm ${marketTrends.eth24hChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {marketTrends.eth24hChange >= 0 ? '↑' : '↓'} {Math.abs(marketTrends.eth24hChange)}%
                        </span>
                      </div>
                    </div>

                    <div className="bg-[#250020] p-4 rounded-lg hover:bg-[#350030] transition-colors">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-white/70 text-sm">Market Cap</span>
                        <FaInfoCircle className="text-white/40 hover:text-white/70 transition-colors cursor-help" />
                      </div>
                      <div className="text-2xl font-bold">
                        <AnimatedNumber value={marketTrends.marketCap / 1000000} suffix="M" prefix="$" />
                      </div>
                    </div>

                    <div className="bg-[#250020] p-4 rounded-lg hover:bg-[#350030] transition-colors">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-white/70 text-sm">Total Value Locked</span>
                        <FaInfoCircle className="text-white/40 hover:text-white/70 transition-colors cursor-help" />
                      </div>
                      <div className="text-2xl font-bold">
                        <AnimatedNumber value={marketTrends.totalLocked / 1000000} suffix="M" prefix="$" />
                      </div>
                    </div>

                    <div className="bg-[#250020] p-4 rounded-lg hover:bg-[#350030] transition-colors">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-white/70 text-sm">APY Range</span>
                        <FaInfoCircle className="text-white/40 hover:text-white/70 transition-colors cursor-help" />
                      </div>
                      <div className="text-2xl font-bold">4.8% - 12.5%</div>
                      <div className="text-white/60 text-xs mt-1">Updated 5 min ago</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Overview - Only shown in swap tab */}
              <div className="mb-12">
                <StatsOverview />
              </div>
            </>
          )}

          {activeTab === 'borrow' && (
            <div>
              <p className="text-white/70 mb-6">Borrow tokens with your deposited collateral. Maintain a healthy collateral ratio to avoid liquidation.</p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {borrowAssets.map((asset, index) => (
                  <BorrowCard key={index} asset={asset} />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'lend' && (
            <div>
              <p className="text-white/70 mb-6">Deposit collateral to earn interest and unlock borrowing power. The more you deposit, the more you can borrow.</p>
              <LendingTable assets={assets} isLoading={isLoading} />
            </div>
          )}

          {activeTab === 'automation' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Flow Automation</h2>
                  <p className="text-white/70">Set up automated strategies to optimize your DeFi portfolio with Flow's smart contract automation.</p>
                </div>
                <button
                  onClick={() => setShowAutomationModal(true)}
                  className="bg-gradient-to-r from-red-magic to-blue-magic hover:from-blue-magic hover:to-red-magic transition-all text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2"
                >
                  <FaRobot /> Create Rule
                </button>
              </div>

              {/* Automation Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-[#1A0015] p-4 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <FaCog className="text-blue-magic" />
                    <span className="text-2xl font-bold">{automationStats.totalRules}</span>
                  </div>
                  <p className="text-white/70 text-sm">Total Rules</p>
                </div>
                <div className="bg-[#1A0015] p-4 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <FaPlay className="text-green-500" />
                    <span className="text-2xl font-bold">{automationStats.activeRules}</span>
                  </div>
                  <p className="text-white/70 text-sm">Active Rules</p>
                </div>
                <div className="bg-[#1A0015] p-4 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <FaCoins className="text-yellow-500" />
                    <span className="text-2xl font-bold">${automationStats.totalSaved.toFixed(1)}</span>
                  </div>
                  <p className="text-white/70 text-sm">Total Saved</p>
                </div>
                <div className="bg-[#1A0015] p-4 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <FaClock className="text-purple-500" />
                    <span className="text-sm font-bold">
                      {automationStats.lastExecution ?
                        new Date(automationStats.lastExecution).toLocaleTimeString() :
                        'Never'
                      }
                    </span>
                  </div>
                  <p className="text-white/70 text-sm">Last Execution</p>
                </div>
              </div>

              {/* Automation Rules */}
              <div className="space-y-4">
                {automationRules.map((rule) => (
                  <div key={rule.id} className="bg-[#1A0015] p-6 rounded-xl border border-white/10 hover:border-white/20 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${rule.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                        <h3 className="text-lg font-semibold">{rule.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs ${rule.status === 'active' ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-500'
                          }`}>
                          {rule.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => {
                            try {
                              await flowAutomationService.toggleAutomationRule(rule.id, rule.status !== 'active');
                              toggleAutomationRule(rule.id);
                              console.log(`✅ Rule ${rule.id} toggled successfully`);
                            } catch (error) {
                              console.error("❌ Failed to toggle rule:", error);
                            }
                          }}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                          {rule.status === 'active' ? <FaPause className="text-yellow-500" /> : <FaPlay className="text-green-500" />}
                        </button>
                        <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                          <FaCog className="text-white/70" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-white/50 text-sm mb-1">Condition</p>
                        <p className="text-white font-medium">{rule.condition}</p>
                      </div>
                      <div>
                        <p className="text-white/50 text-sm mb-1">Action</p>
                        <p className="text-white font-medium">{rule.action}</p>
                      </div>
                      <div>
                        <p className="text-white/50 text-sm mb-1">Last Triggered</p>
                        <p className="text-white font-medium">{rule.lastTriggered.toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <FaBolt className="text-yellow-500" />
                          <span className="text-sm text-white/70">
                            {rule.type === 'auto_stake' && 'Auto Staking'}
                            {rule.type === 'compound' && 'Compound Interest'}
                            {rule.type === 'rebalance' && 'Portfolio Rebalancing'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-green-500 font-semibold">${rule.totalSaved.toFixed(1)} saved</p>
                        <p className="text-white/50 text-xs">Total optimization</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Flow Forte Integration */}
              <div className="mt-8 p-6 bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-xl border border-purple-500/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <FaBolt className="text-purple-400 text-xl" />
                    <h3 className="text-xl font-semibold">Flow Forte Integration</h3>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await flowAutomationService.executeFlowForteStrategy("yield_optimization");
                        console.log("✅ Flow Forte strategy executed");
                      } catch (error) {
                        console.error("❌ Failed to execute Flow Forte strategy:", error);
                      }
                    }}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <FaBolt /> Execute Strategy
                  </button>
                </div>
                <p className="text-white/70 mb-4">
                  Leverage Flow Forte's advanced automation capabilities for institutional-grade DeFi strategies.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#1A0015] p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Advanced Strategies</h4>
                    <ul className="text-sm text-white/70 space-y-1">
                      <li>• Delta-neutral farming</li>
                      <li>• Yield optimization</li>
                      <li>• Risk management</li>
                    </ul>
                  </div>
                  <div className="bg-[#1A0015] p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Smart Execution</h4>
                    <ul className="text-sm text-white/70 space-y-1">
                      <li>• Gas optimization</li>
                      <li>• MEV protection</li>
                      <li>• Slippage control</li>
                    </ul>
                  </div>
                </div>

                {/* Demo Automation Actions */}
                <div className="mt-4 pt-4 border-t border-white/10">
                  <h4 className="font-semibold mb-3">Quick Actions</h4>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={async () => {
                        try {
                          await flowAutomationService.checkAutomationConditions("0x01");
                          console.log("✅ Automation conditions checked");
                        } catch (error) {
                          console.error("❌ Failed to check conditions:", error);
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      Check Conditions
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await flowAutomationService.getAutomationStats("0x01");
                          console.log("✅ Automation stats retrieved");
                        } catch (error) {
                          console.error("❌ Failed to get stats:", error);
                        }
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      Get Stats
                    </button>
                    <button
                      onClick={() => {
                        const intervalId = flowAutomationService.startAutomationMonitoring("0x01");
                        setTimeout(() => {
                          flowAutomationService.stopAutomationMonitoring(intervalId);
                        }, 10000); // Stop after 10 seconds for demo
                      }}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      Start Monitoring
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <p className="text-white/70 mb-6">Your transaction history in the APT Casino Bank. All transactions are recorded on the blockchain for transparency.</p>

              {transactions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="py-3 px-4 text-white/70 font-medium">Type</th>
                        <th className="py-3 px-4 text-white/70 font-medium">Details</th>
                        <th className="py-3 px-4 text-white/70 font-medium">Date</th>
                        <th className="py-3 px-4 text-white/70 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx, i) => (
                        <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              {tx.type === 'deposit' && <FaWallet className="text-green-500" />}
                              {tx.type === 'borrow' && <FaUnlock className="text-yellow-500" />}
                              {tx.type === 'swap' && <FaExchangeAlt className="text-blue-magic" />}
                              <span className="capitalize">{tx.type}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            {tx.type === 'swap' ? (
                              <span>{tx.amountFrom} {tx.tokenFrom} → {tx.amountTo} {tx.tokenTo}</span>
                            ) : (
                              <span>{tx.amount} {tx.token}</span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-white/70">
                            {tx.date.toLocaleString()}
                          </td>
                          <td className="py-4 px-4">
                            <span className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-500 capitalize">
                              {tx.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 bg-[#1A0015] rounded-xl">
                  <FaHistory className="mx-auto text-4xl text-white/30 mb-4" />
                  <h3 className="text-xl mb-2">No transactions yet</h3>
                  <p className="text-white/50">Your transaction history will appear here</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="p-[1px] bg-gradient-to-r from-red-magic/30 to-blue-magic/30 rounded-xl hover:from-red-magic hover:to-blue-magic transition-all duration-300">
            <div className="bg-[#1A0015] rounded-xl p-6 h-full">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-[#250020] flex items-center justify-center mr-3">
                  <FaCoins className="text-yellow-500" />
                </div>
                <h3 className="text-lg font-medium">Earn Interest</h3>
              </div>
              <p className="text-white/70 mb-4">
                Deposit your tokens to earn competitive interest rates. APT Casino Bank offers some of the highest APYs in DeFi.
              </p>
              <ul className="space-y-2 mb-4">
                <li className="flex justify-between">
                  <span className="text-white/60">FLOW</span>
                  <span className="text-green-500">12.5% APY</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-white/60">USDC</span>
                  <span className="text-green-500">8.2% APY</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-white/60">MNT</span>
                  <span className="text-green-500">4.8% APY</span>
                </li>
              </ul>
              <button
                onClick={() => setActiveTab('lend')}
                className="text-sm bg-[#250020] hover:bg-[#350030] transition-colors py-2 px-4 rounded-lg flex items-center gap-2"
              >
                <FaLock /> Deposit Now
              </button>
            </div>
          </div>

          <div className="p-[1px] bg-gradient-to-r from-red-magic/30 to-blue-magic/30 rounded-xl hover:from-red-magic hover:to-blue-magic transition-all duration-300">
            <div className="bg-[#1A0015] rounded-xl p-6 h-full">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-[#250020] flex items-center justify-center mr-3">
                  <FaWallet className="text-blue-magic" />
                </div>
                <h3 className="text-lg font-medium">How It Works</h3>
              </div>
              <ol className="space-y-4 mb-6">
                <li className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#250020] flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-sm">1</span>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Deposit Collateral</h4>
                    <p className="text-white/60 text-sm">Deposit supported tokens as collateral to earn interest.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#250020] flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-sm">2</span>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Borrow Tokens</h4>
                    <p className="text-white/60 text-sm">Borrow up to 70% of your collateral value in other tokens.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#250020] flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-sm">3</span>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Play & Win</h4>
                    <p className="text-white/60 text-sm">Use borrowed tokens to play games and win big.</p>
                  </div>
                </li>
              </ol>
              <div className="text-center">
                <button className="bg-gradient-to-r from-red-magic to-blue-magic hover:from-blue-magic hover:to-red-magic transition-all text-white px-4 py-2 rounded-lg font-medium text-sm">
                  Learn More
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Flow Automation Modal */}
        {showAutomationModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1A0015] rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/20">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Create Automation Rule</h2>
                <button
                  onClick={() => setShowAutomationModal(false)}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Rule Templates */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Choose a Template</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border border-white/10 rounded-lg hover:border-blue-magic/50 cursor-pointer transition-colors">
                      <div className="flex items-center gap-3 mb-2">
                        <FaCoins className="text-yellow-500" />
                        <h4 className="font-semibold">Auto Stake</h4>
                      </div>
                      <p className="text-white/70 text-sm">Automatically stake FLOW when balance reaches threshold</p>
                    </div>

                    <div className="p-4 border border-white/10 rounded-lg hover:border-blue-magic/50 cursor-pointer transition-colors">
                      <div className="flex items-center gap-3 mb-2">
                        <FaSync className="text-green-500" />
                        <h4 className="font-semibold">Compound Rewards</h4>
                      </div>
                      <p className="text-white/70 text-sm">Reinvest staking rewards automatically</p>
                    </div>

                    <div className="p-4 border border-white/10 rounded-lg hover:border-blue-magic/50 cursor-pointer transition-colors">
                      <div className="flex items-center gap-3 mb-2">
                        <FaChartLine className="text-blue-magic" />
                        <h4 className="font-semibold">Rebalance Portfolio</h4>
                      </div>
                      <p className="text-white/70 text-sm">Maintain target asset allocation</p>
                    </div>

                    <div className="p-4 border border-white/10 rounded-lg hover:border-blue-magic/50 cursor-pointer transition-colors">
                      <div className="flex items-center gap-3 mb-2">
                        <FaClock className="text-purple-500" />
                        <h4 className="font-semibold">Scheduled Buy</h4>
                      </div>
                      <p className="text-white/70 text-sm">Dollar-cost average into positions</p>
                    </div>
                  </div>
                </div>

                {/* Rule Configuration */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Rule Configuration</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Rule Name</label>
                      <input
                        type="text"
                        placeholder="My Automation Rule"
                        className="w-full bg-[#250020] border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:border-blue-magic focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Trigger Condition</label>
                        <select className="w-full bg-[#250020] border border-white/20 rounded-lg px-4 py-2 text-white focus:border-blue-magic focus:outline-none">
                          <option>Balance threshold</option>
                          <option>Time-based</option>
                          <option>Price change</option>
                          <option>Yield threshold</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Action</label>
                        <select className="w-full bg-[#250020] border border-white/20 rounded-lg px-4 py-2 text-white focus:border-blue-magic focus:outline-none">
                          <option>Stake tokens</option>
                          <option>Swap tokens</option>
                          <option>Add liquidity</option>
                          <option>Compound rewards</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Parameters</label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input
                          type="number"
                          placeholder="Amount"
                          className="bg-[#250020] border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:border-blue-magic focus:outline-none"
                        />
                        <select className="bg-[#250020] border border-white/20 rounded-lg px-4 py-2 text-white focus:border-blue-magic focus:outline-none">
                          <option>FLOW</option>
                          <option>USDC</option>
                          <option>FUSD</option>
                        </select>
                        <input
                          type="number"
                          placeholder="Threshold"
                          className="bg-[#250020] border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:border-blue-magic focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Advanced Settings */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Advanced Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Gas Optimization</h4>
                        <p className="text-white/70 text-sm">Optimize transaction timing for lower gas costs</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-magic"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">MEV Protection</h4>
                        <p className="text-white/70 text-sm">Protect against front-running attacks</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-magic"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-6 border-t border-white/10">
                  <button
                    onClick={() => setShowAutomationModal(false)}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        // Create rule using Flow Automation Service
                        const ruleData = {
                          name: "New Automation Rule",
                          type: "auto_stake",
                          condition: "balance >= 100 FLOW",
                          action: "Stake 80% of balance",
                          amount: 100,
                          threshold: 100
                        };

                        await flowAutomationService.createAutomationRule(ruleData);

                        // Add to local state
                        createAutomationRule(ruleData);

                        setShowAutomationModal(false);
                        console.log("✅ Automation rule created successfully");
                      } catch (error) {
                        console.error("❌ Failed to create automation rule:", error);
                      }
                    }}
                    className="flex-1 bg-gradient-to-r from-red-magic to-blue-magic hover:from-blue-magic hover:to-red-magic text-white py-3 rounded-lg font-medium transition-all"
                  >
                    Create Rule
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
