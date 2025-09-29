"use client";

import { useState, useEffect, useRef } from "react";
import GameWheel, { wheelDataByRisk, getHighRiskMultiplier, getHighRiskProbability } from "../../../components/wheel/GameWheel";
import BettingPanel from "../../../components/wheel/BettingPanel";
import GameHistory from "../../../components/wheel/GameHistory";
import { calculateResult } from "../../../lib/gameLogic";
import Image from "next/image";
// Using Next.js public asset reference instead of import
import { motion } from "framer-motion";
import { FaHistory, FaTrophy, FaInfoCircle, FaChartLine, FaCoins, FaChevronDown, FaPercentage, FaBalanceScale } from "react-icons/fa";
import { GiCardRandom, GiWheelbarrow, GiSpinningBlades, GiTrophyCup } from "react-icons/gi";
import { HiOutlineTrendingUp, HiOutlineChartBar } from "react-icons/hi";
import { useSelector, useDispatch } from 'react-redux';
import { setBalance, setFlowBalance, setLoading, loadBalanceFromStorage } from '@/store/balanceSlice';
import { useNotification } from '@/components/NotificationSystem';
import useWalletStatus from '@/hooks/useWalletStatus';
// Flow wallet integration
import { useFlowWallet } from '@/hooks/useFlowWallet';

// Import new components
import WheelVideo from "./components/WheelVideo";
import WheelDescription from "./components/WheelDescription";
import WheelStrategyGuide from "./components/WheelStrategyGuide";
import WheelProbability from "./components/WheelProbability";
import WheelPayouts from "./components/WheelPayouts";
import WheelHistory from "./components/WheelHistory";

export default function Home() {
  const [betAmount, setBetAmount] = useState(100);
  const [risk, setRisk] = useState("medium");
  const [noOfSegments, setSegments] = useState(10);
  const [isSpinning, setIsSpinning] = useState(false);
  const [gameMode, setGameMode] = useState("manual");
  const [currentMultiplier, setCurrentMultiplier] = useState(null);
  const [gameHistory, setGameHistory] = useState([]);
  const [showVRFModal, setShowVRFModal] = useState(false);
  const [targetMultiplier, setTargetMultiplier] = useState(null);
  const [wheelPosition, setWheelPosition] = useState(0);
  const [hasSpun, setHasSpun] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState('medium');
  const [result, setResult] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [detectedColor, setDetectedColor] = useState(null);
  const [detectedMultiplier, setDetectedMultiplier] = useState(null);
  const [winningSegmentIndex, setWinningSegmentIndex] = useState(0);
  const [winningMultiplier, setWinningMultiplier] = useState(0);
  const [finalWheelPosition, setFinalWheelPosition] = useState(0);
  const [calculatedSegment, setCalculatedSegment] = useState(0);
  
  // Store the latest wheel data for immediate use
  const latestWheelDataRef = useRef({
    segmentIndex: 0,
    multiplier: 0,
    wheelPosition: 0,
    calculatedSegment: 0
  });
  
  const dispatch = useDispatch();
  const { userBalance, userFlowBalance, isLoading: isLoadingBalance } = useSelector((state) => state.balance);
  const notification = useNotification();
  const { isConnected } = useWalletStatus();
  const { executeTreasuryTransaction, address } = useFlowWallet();
  
  // Format balance for display (show 0 instead of 0.00000)
  const formatBalance = (balance) => {
    const num = parseFloat(balance || '0');
    if (num === 0) return '0';
    // If it's a whole number, show without decimals
    if (num % 1 === 0) return num.toString();
    // Otherwise show with up to 5 decimals, removing trailing zeros
    return parseFloat(num.toFixed(5)).toString();
  };
  
  // Use ref to prevent infinite loop in useEffect
  const isInitialized = useRef(false);
  
  // Reset wheel data ref when starting new spin
  const resetWheelData = () => {
    latestWheelDataRef.current = {
      segmentIndex: 0,
      multiplier: 0,
      wheelPosition: 0,
      calculatedSegment: 0,
      source: 'initial'
    };
    console.log('🎯 Reset wheel data ref for new spin');
  };
  
  // Load balance from localStorage on component mount
  useEffect(() => {
    if (isInitialized.current) return; // Prevent multiple executions
    
    const savedBalance = loadBalanceFromStorage();
    if (savedBalance) {
      console.log('Loading saved balance from localStorage:', savedBalance);
      dispatch(setBalance(savedBalance));
    } else {
      // Initialize with zero balance
      console.log('No saved balance, initializing with zero');
      dispatch(setBalance("0"));
    }
    
    isInitialized.current = true; // Mark as initialized
  }, []); // Empty dependency array since we use ref

  // Scroll to section function
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Game modes
  const manulBet = async () => {
    if (betAmount < 1 || isSpinning) return;
    
    // Reset wheel data for fresh spin
    resetWheelData();

    // Check if wallet is connected first
    console.log('🔌 Wheel Bet - Wallet Status:', { isConnected, userFlowBalance });
    if (!isConnected) {
      alert("Please connect your Flow wallet first to play Wheel!");
      return;
    }

    // Generate Flow VRF in background for provably fair proof
  const generateVRFInBackground = async (historyItemId, winningSegment = 0, multiplier = 0, wheelPos = 0, calcSegment = 0) => {
    try {
      console.log('🏦 Executing treasury-sponsored Wheel transaction...');
      console.log('🎯 Parameters received by generateVRFInBackground:', {
        winningSegment,
        multiplier,
        wheelPos,
        calcSegment,
        betAmount,
        noOfSegments
      });
      
      const transactionParams = {
        betAmount: betAmount,
        segments: noOfSegments,
        winningSegment: winningSegment,
        multiplier: multiplier,
        wheelPosition: wheelPos,
        calculatedSegment: calcSegment
      };
      
      console.log('🎯 Transaction parameters being sent:', transactionParams);
      
      const transactionResult = await executeTreasuryTransaction('wheel', transactionParams);
      
      console.log('✅ Flow Transaction: Background transaction completed successfully');
      console.log('🔗 Transaction:', transactionResult.id);
      
      // Parse game events from treasury transaction result
      const gameResultData = transactionResult.events?.find(event => 
        event.type?.includes('GamePlayed')
      )?.data;
      
      // Update the history item with real transaction proof
      setGameHistory(prev => prev.map(item => 
        item.id === historyItemId 
          ? {
              ...item,
              flowVRF: {
                transactionId: transactionResult.id || transactionResult.transactionId,
                blockHeight: transactionResult.blockId,
                randomSeed: gameResultData?.randomSeed || Math.floor(Math.random() * 1000000000),
                explorerUrl: `https://testnet.flowscan.io/tx/${transactionResult.id || transactionResult.transactionId}`,
                timestamp: Date.now(),
                source: 'Flow Blockchain',
                winningSegment: gameResultData?.result?.winningSegment,
                payout: parseFloat(gameResultData?.payout || '0')
              }
            }
          : item
      ));
      
      // Log on-chain via casino wallet (non-blocking)
      try {
        fetch('/api/casino-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: transactionResult.id || `wheel_${Date.now()}`,
            gameType: 'WHEEL',
            channelId: entropyResult.entropyProof?.requestId || 'entropy_channel',
            valueEth: 0
          })
        })
          .then(async (r) => {
            const t = await r.text().catch(() => '');
            console.log('🎡 Casino session log (Wheel):', r.status, t);
          })
          .catch((e) => console.warn('Casino session log failed (Wheel):', e));
      } catch (e) {
        console.warn('Casino session log threw (Wheel):', e);
      }
      
    } catch (error) {
      console.error('❌ FLOW VRF: Background generation failed:', error);
    }
  };

    // Check Redux Flow balance (balance is already in FLOW)
    const currentBalance = parseFloat(userFlowBalance || '0');
    
    if (currentBalance < betAmount) {
      alert(`Insufficient balance. You have ${formatBalance(currentBalance)} FLOW but need ${betAmount} FLOW`);
      return;
    }

    try {
      setIsSpinning(true);
      setHasSpun(false);

      console.log('=== STARTING WHEEL BET WITH REDUX BALANCE ===');
      console.log('Bet amount (FLOW):', betAmount);
      console.log('Current balance (FLOW):', currentBalance);
      console.log('Sectors:', noOfSegments);
      
      // Deduct bet amount from Redux Flow balance
      const newBalance = (parseFloat(userFlowBalance || '0') - betAmount).toString();
      dispatch(setFlowBalance(newBalance));
      
      console.log('Balance deducted. New balance:', formatBalance(newBalance), 'FLOW');
      
      // Set up callback to handle wheel animation completion
      window.wheelBetCallback = async (landedMultiplier) => {
        console.log('🎯 Wheel animation completed with multiplier:', landedMultiplier);
        
        // Stop spinning immediately when animation completes
        setIsSpinning(false);
        
        // Wait a moment for color detection to update, then get the REAL result
        setTimeout(async () => {
          let actualMultiplier = 0;
          let detectedColor = "#333947";
          
          // Get the final result from color detection
          if (window.triggerWheelColorDetection) {
            const detectionResult = window.triggerWheelColorDetection();
            if (detectionResult && detectionResult.multiplier !== null) {
              actualMultiplier = detectionResult.multiplier;
              detectedColor = detectionResult.color || "#333947";
              console.log('🎯 Using DETECTED multiplier:', actualMultiplier, 'Color:', detectedColor);
            } else {
              console.log('⚠️ Color detection failed, using landed multiplier:', landedMultiplier);
              actualMultiplier = landedMultiplier;
            }
          } else {
            console.log('⚠️ Color detection not available, using landed multiplier:', landedMultiplier);
            actualMultiplier = landedMultiplier;
          }
          
          const winAmount = betAmount * actualMultiplier;
          
          // Add to game history
          const newHistoryItem = {
            id: Date.now(),
            game: 'Wheel',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            betAmount: formatBalance(betAmount),
            multiplier: `${actualMultiplier.toFixed(2)}x`,
            payout: formatBalance(winAmount),
            result: 0,
            color: detectedColor
          };

          // Add temporary entropy proof (will be updated by background process)
          newHistoryItem.entropyProof = {
            requestId: 'generating_' + Date.now(),
            sequenceNumber: Date.now().toString(),
            randomValue: Math.floor(Math.random() * 1000000),
            randomNumber: Math.floor(Math.random() * 1000000),
            transactionHash: 'generating...',
            arbiscanUrl: 'https://testnet.arbiscan.io/',
            explorerUrl: 'https://testnet.flowscan.io',
            timestamp: Date.now(),
            source: 'Generating...'
          };

          setGameHistory(prev => [newHistoryItem, ...prev]);
          
          setIsSpinning(false);
          setHasSpun(true);
          
          // Show result and update balance immediately
          if (actualMultiplier > 0) {
            notification.success(`Congratulations! ${betAmount} FLOW × ${actualMultiplier.toFixed(2)} = ${formatBalance(winAmount)} FLOW won!`);
            
            // Update Flow balance with winnings
            const currentBalance = parseFloat(userFlowBalance || '0');
            const newBalanceWithWin = currentBalance + winAmount;
            
            console.log('💰 Adding winnings:', {
              currentBalance: formatBalance(currentBalance),
              winAmount: formatBalance(winAmount),
              newBalance: formatBalance(newBalanceWithWin)
            });
            
            dispatch(setFlowBalance(newBalanceWithWin.toString()));
          } else {
            notification.info(`Game over. Multiplier: ${actualMultiplier.toFixed(2)}x`);
          }

          // Generate Flow VRF in background for provably fair proof
          const wheelData = latestWheelDataRef.current;
          console.log('🎯 Calling generateVRFInBackground with FINAL ref values:', wheelData);
          console.log('🎯 Using ColorDetector multiplier:', wheelData.multiplier, 'Source:', wheelData.source);
          
          generateVRFInBackground(
            newHistoryItem.id, 
            wheelData.segmentIndex, 
            wheelData.multiplier,  // This MUST be from ColorDetector
            wheelData.wheelPosition, 
            wheelData.calculatedSegment
          ).catch(error => {
            console.error('❌ Background entropy generation failed:', error);
          });
          
          // Clean up callback
          window.wheelBetCallback = null;
        }, 50); // Faster transaction execution
      };
      
    } catch (e) {
      console.error('Bet failed:', e);
      alert(`Bet failed: ${e?.message || e}`);
      setIsSpinning(false);
      
      // Refund the deducted Flow balance on error
      dispatch(setFlowBalance(userFlowBalance));
    }
  };

  const autoBet = async ({
    numberOfBets,
    winIncrease = 0,
    lossIncrease = 0,
    stopProfit = 0,
    stopLoss = 0,
    betAmount: initialBetAmount,
    risk,
    noOfSegments,
  }) => {
    // Check if wallet is connected first
    if (!isConnected) {
      alert('Please connect your Flow wallet first to play Wheel!');
      return;
    }
    
    // Check if VRF proofs are available for this game
    try {
      const vrfStats = vrfProofService.getProofStats();
      const availableProofs = vrfStats.availableVRFs.WHEEL || 0;
      
      if (availableProofs <= 0) {
        setShowVRFModal(true);
        return;
      }
      
      if (availableProofs < numberOfBets) {
        alert(`❌ Not enough VRF proofs for ${numberOfBets} bets! Only ${availableProofs} proofs available. Please generate more VRF proofs first.`);
        console.warn(`🚫 Wheel auto betting blocked: Need ${numberOfBets} proofs but only ${availableProofs} available`);
        return;
      }
      
      console.log(`✅ Wheel auto betting allowed: ${availableProofs} VRF proofs available for ${numberOfBets} bets`);
    } catch (error) {
      console.error('❌ Error checking VRF proof availability:', error);
      alert('❌ Error checking VRF proof availability. Please try again.');
      return;
    }
    
    if (isSpinning) return; // Prevent overlapping spins

    let currentBet = initialBetAmount;
    let totalProfit = 0;

    for (let i = 0; i < numberOfBets; i++) {
      // Check Redux Flow balance before each bet
      let currentBalance = parseFloat(userFlowBalance || '0');
      
      console.log(`💰 Auto bet ${i + 1} balance check:`, {
        currentBalance: formatBalance(currentBalance),
        currentBet: formatBalance(currentBet),
        hasEnoughBalance: currentBalance >= currentBet
      });
      
      if (currentBalance < currentBet) {
        alert(`Insufficient balance for bet ${i + 1}. Need ${formatBalance(currentBet)} FLOW but have ${formatBalance(currentBalance)} FLOW`);
        break;
      }

      setIsSpinning(true);
      setHasSpun(false);
      
      // Deduct bet amount from Redux Flow balance
      const newBalance = (parseFloat(userFlowBalance || '0') - currentBet).toString();
      dispatch(setFlowBalance(newBalance));

      // Calculate result position
      const resultPosition = Math.floor(Math.random() * noOfSegments);
      
      // Get the wheel data based on risk level to determine proper multipliers
      let wheelSegmentData;
      if (risk === "high") {
        const highRiskData = wheelDataByRisk.high(noOfSegments);
        const zeroSegments = Math.round((1 - getHighRiskProbability(noOfSegments)) * noOfSegments);
        wheelSegmentData = resultPosition < zeroSegments ? 
          { multiplier: 0.0, color: "#333947" } : 
          { multiplier: getHighRiskMultiplier(noOfSegments), color: "#D72E60" };
      } else if (risk === "medium") {
        // For medium risk, alternate between zero and non-zero multipliers
        if (resultPosition % 2 === 0) {
          wheelSegmentData = { multiplier: 0.0, color: "#333947" };
        } else {
          // Pick one of the non-zero multipliers based on result
          const nonZeroOptions = [
            { multiplier: 1.5, color: "#00E403" },
            { multiplier: 1.7, color: "#D9D9D9" },
            { multiplier: 2.0, color: "#FDE905" },
            { multiplier: 3.0, color: "#7F46FD" },
            { multiplier: 4.0, color: "#FCA32F" }
          ];
          const nonZeroIndex = Math.floor(resultPosition / 2) % nonZeroOptions.length;
          wheelSegmentData = nonZeroOptions[nonZeroIndex];
        }
      } else {
        // Low risk
        if (resultPosition % 2 === 0) {
          wheelSegmentData = { multiplier: 1.2, color: "#D9D9D9" };
        } else {
          wheelSegmentData = resultPosition % 4 === 1 ? 
            { multiplier: 0.0, color: "#333947" } : 
            { multiplier: 1.5, color: "#00E403" };
        }
      }
      
      // Set wheel position first
      setWheelPosition(resultPosition);

      // Simulate spin delay
      await new Promise((r) => setTimeout(r, 3000)); // spin animation time

      // Now get the REAL multiplier from color detection
      let actualMultiplier = 0;
      
      // Trigger color detection and get the REAL result
      if (window.triggerWheelColorDetection) {
        const detectionResult = window.triggerWheelColorDetection();
        if (detectionResult && detectionResult.multiplier !== null) {
          actualMultiplier = detectionResult.multiplier;
          console.log('🎯 AutoBet - Using DETECTED multiplier:', actualMultiplier);
        } else {
          console.log('⚠️ AutoBet - Color detection failed!');
          actualMultiplier = 0;
        }
      } else {
        console.log('⚠️ AutoBet - Color detection not available!');
        actualMultiplier = 0;
      }

      setCurrentMultiplier(actualMultiplier);
      setIsSpinning(false);
      setHasSpun(true);

      // Wait 2 seconds to show the result
      await new Promise((r) => setTimeout(r, 2000));

      // Calculate win amount
      const winAmount = currentBet * actualMultiplier;

      // Update Redux Flow balance with winnings
      if (actualMultiplier > 0) {
        const currentBalance = parseFloat(userFlowBalance || '0');
        const newBalanceWithWin = currentBalance + winAmount;
        
        console.log('💰 Auto bet winnings:', {
          currentBalance: formatBalance(currentBalance),
          winAmount: formatBalance(winAmount),
          newBalance: formatBalance(newBalanceWithWin)
        });
        
        dispatch(setFlowBalance(newBalanceWithWin.toString()));
      }

      // Update total profit
      const profit = winAmount - currentBet;
      totalProfit += profit;
      
      // Show notification for win
      if (actualMultiplier > 0) {
        notification.success(`Congratulations! ${currentBet} FLOW × ${actualMultiplier.toFixed(2)} = ${formatBalance(winAmount)} FLOW won!`);
      }

      // Store history entry
      const newHistoryItem = {
        id: Date.now() + i, // unique id per bet
        game: "Wheel",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        betAmount: currentBet,
        multiplier: `${actualMultiplier.toFixed(2)}x`,
        payout: winAmount,
        result: resultPosition,
        color: wheelSegmentData.color
      };

      // Consume VRF proof for this auto bet game
      try {
        const vrfResult = vrfProofService.generateRandomFromProof('WHEEL');
        console.log(`🎲 Wheel auto bet ${i + 1} completed, VRF proof consumed:`, vrfResult);
        
        // Add VRF proof info to the history item
        newHistoryItem.vrfProof = {
          proofId: vrfResult.proofId,
          transactionHash: vrfResult.transactionHash,
          logIndex: vrfResult.logIndex,
          requestId: vrfResult.requestId,
          randomNumber: vrfResult.randomNumber
        };
        
        // Log proof consumption
        const stats = vrfProofService.getProofStats();
        console.log(`📊 VRF Proof Stats after Wheel auto bet ${i + 1}:`, stats);
        
      } catch (error) {
        console.error(`❌ Error consuming VRF proof for Wheel auto bet ${i + 1}:`, error);
      }

      setGameHistory(prev => [newHistoryItem, ...prev]);

      // Adjust bet for next round based on win/loss increase
      if (actualMultiplier > 1) {
        currentBet = currentBet + (currentBet * winIncrease);
      } else {
        currentBet = currentBet + (currentBet * lossIncrease);
      }

      // Clamp bet to Flow balance
      currentBalance = parseFloat(userFlowBalance || '0');
      if (currentBet > currentBalance) {
        console.log(`💰 Bet amount ${formatBalance(currentBet)} exceeds Flow balance ${formatBalance(currentBalance)}, clamping to balance`);
        currentBet = currentBalance;
      }
      if (currentBet <= 0) currentBet = initialBetAmount;

      // Stop conditions
      if (stopProfit > 0 && totalProfit >= stopProfit) break;
      if (stopLoss > 0 && totalProfit <= -stopLoss) break;
    }

    setIsSpinning(false);
    setBetAmount(currentBet); // update bet amount in panel
  };

  const handleSelectMultiplier = (value) => {
    setTargetMultiplier(value);
  };

  // Header Section
  const renderHeader = () => {
    // Sample statistics
    const gameStatistics = {
      totalBets: '1,856,342',
      totalVolume: '8.3M FLOW',
      maxWin: '243,500 FLOW'
    };
    
    return (
      <div className="relative text-white px-4 md:px-8 lg:px-20 mb-8 pt-28 md:pt-32 mt-4">
        {/* Background Elements */}
        <div className="absolute top-5 -right-32 w-64 h-64 bg-red-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-28 left-1/3 w-32 h-32 bg-green-500/10 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-20 left-1/4 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl"></div>
        
        <div className="relative">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6">
            {/* Left Column - Game Info */}
            <div className="md:w-1/2">
              <div className="flex items-center">
                <div className="mr-3 p-3 bg-gradient-to-br from-red-900/40 to-red-700/10 rounded-lg shadow-lg shadow-red-900/10 border border-red-800/20">
                  <GiWheelbarrow className="text-3xl text-red-300" />
                </div>
                <div>
                  <motion.div 
                    className="flex items-center gap-2"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <p className="text-sm text-gray-400 font-sans">Games / Wheel</p>
                    <span className="text-xs px-2 py-0.5 bg-red-900/30 rounded-full text-red-300 font-display">Classic</span>
                    <span className="text-xs px-2 py-0.5 bg-green-900/30 rounded-full text-green-300 font-display">Live</span>
                  </motion.div>
                  <motion.h1 
                    className="text-3xl md:text-4xl font-bold font-display bg-gradient-to-r from-red-300 to-amber-300 bg-clip-text text-transparent"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                  >
                    Fortune Wheel
                  </motion.h1>
                </div>
              </div>
              <motion.p 
                className="text-white/70 mt-2 max-w-xl font-sans"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                Place your bets and experience the thrill of the spinning wheel. From simple risk levels to customizable segments, the choice is yours.
              </motion.p>
              
              {/* Game highlights */}
              <motion.div 
                className="flex flex-wrap gap-4 mt-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="flex items-center text-sm bg-gradient-to-r from-red-900/30 to-red-800/10 px-3 py-1.5 rounded-full">
                  <FaPercentage className="mr-1.5 text-amber-400" />
                  <span className="font-sans">No house edge</span>
                </div>
                <div className="flex items-center text-sm bg-gradient-to-r from-red-900/30 to-red-800/10 px-3 py-1.5 rounded-full">
                  <GiSpinningBlades className="mr-1.5 text-blue-400" />
                  <span className="font-sans">Multiple risk levels</span>
                </div>
                <div className="flex items-center text-sm bg-gradient-to-r from-red-900/30 to-red-800/10 px-3 py-1.5 rounded-full">
                  <FaBalanceScale className="mr-1.5 text-green-400" />
                  <span className="font-sans">Provably fair gaming</span>
                </div>
              </motion.div>
            </div>
            
            {/* Right Column - Stats and Controls */}
            <div className="md:w-1/2">
              <div className="bg-gradient-to-br from-red-900/20 to-red-800/5 rounded-xl p-4 border border-red-800/20 shadow-lg shadow-red-900/10">
                {/* Quick stats in top row */}
                <motion.div 
                  className="grid grid-cols-3 gap-2 mb-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                >
                  <div className="flex flex-col items-center p-2 bg-black/20 rounded-lg">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600/20 mb-1">
                      <FaChartLine className="text-blue-400" />
                    </div>
                    <div className="text-xs text-white/50 font-sans text-center">Total Bets</div>
                    <div className="text-white font-display text-sm md:text-base">{gameStatistics.totalBets}</div>
                  </div>
                  
                  <div className="flex flex-col items-center p-2 bg-black/20 rounded-lg">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-600/20 mb-1">
                      <FaCoins className="text-yellow-400" />
                    </div>
                    <div className="text-xs text-white/50 font-sans text-center">Volume</div>
                    <div className="text-white font-display text-sm md:text-base">{gameStatistics.totalVolume}</div>
                  </div>
                  
                  <div className="flex flex-col items-center p-2 bg-black/20 rounded-lg">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-600/20 mb-1">
                      <FaTrophy className="text-yellow-500" />
                    </div>
                    <div className="text-xs text-white/50 font-sans text-center">Max Win</div>
                    <div className="text-white font-display text-sm md:text-base">{gameStatistics.maxWin}</div>
                  </div>
                </motion.div>
                
                {/* Quick actions */}
                <motion.div
                  className="flex flex-wrap justify-between gap-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <button 
                    onClick={() => scrollToSection('strategy-guide')}
                    className="flex items-center justify-center px-4 py-2 bg-gradient-to-r from-red-800/40 to-red-900/20 rounded-lg text-white font-medium text-sm hover:from-red-700/40 hover:to-red-800/20 transition-all duration-300"
                  >
                    <GiCardRandom className="mr-2" />
                    Strategy Guide
                  </button>
                  <button 
                    onClick={() => scrollToSection('probability')}
                    className="flex items-center justify-center px-4 py-2 bg-gradient-to-r from-blue-800/40 to-blue-900/20 rounded-lg text-white font-medium text-sm hover:from-blue-700/40 hover:to-blue-800/20 transition-all duration-300"
                  >
                    <HiOutlineChartBar className="mr-2" />
                    Probabilities
                  </button>
                  <button 
                    onClick={() => scrollToSection('history')}
                    className="flex items-center justify-center px-4 py-2 bg-gradient-to-r from-purple-800/40 to-purple-900/20 rounded-lg text-white font-medium text-sm hover:from-purple-700/40 hover:to-purple-800/20 transition-all duration-300"
                  >
                    <FaChartLine className="mr-2" />
                    Game History
                  </button>
                </motion.div>
              </div>
            </div>
          </div>

          <div className="w-full h-0.5 bg-gradient-to-r from-red-600 via-blue-500/30 to-transparent mt-6"></div>
        </div>
      </div>
    );
  };


  return (
    <div className="min-h-screen bg-[#070005] text-white pb-20 game-page-container">
      {/* Header */}
      {renderHeader()}

      {/* Main Game Section */}
      <div className="px-4 md:px-8 lg:px-20">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-2/3">
            <GameWheel
              risk={risk}
              isSpinning={isSpinning}
              noOfSegments={noOfSegments}
              currentMultiplier={currentMultiplier}
              targetMultiplier={targetMultiplier}
              handleSelectMultiplier={handleSelectMultiplier}
              wheelPosition={wheelPosition}
              setWheelPosition={setWheelPosition}
              hasSpun={hasSpun}
              onColorDetected={({ color, multiplier }) => {
                setDetectedColor(color);
                setDetectedMultiplier(multiplier);
                console.log('🎯 ColorDetector: REAL multiplier detected:', multiplier, 'Color:', color);
                
                // Update ref with detected multiplier (this is the REAL one for transaction!)
                if (multiplier !== null && multiplier !== undefined) {
                  // Calculate current position and segment based on wheelPosition
                  const currentWheelPos = wheelPosition % (Math.PI * 2);
                  const segmentAngle = (Math.PI * 2) / noOfSegments;
                  const offsetPosition = (currentWheelPos + Math.PI/2 + Math.PI) % (Math.PI * 2);
                  const currentSegmentIndex = Math.floor(offsetPosition / segmentAngle) % noOfSegments;
                  
                  latestWheelDataRef.current = {
                    segmentIndex: currentSegmentIndex,
                    multiplier: multiplier, // REAL multiplier from ColorDetector
                    wheelPosition: currentWheelPos,
                    calculatedSegment: currentSegmentIndex,
                    detectedColor: color,
                    source: 'colorDetector'
                  };
                  console.log('🎯 FINAL ref updated with ColorDetector data:', latestWheelDataRef.current);
                }
              }}
        onWinningSegment={(result) => {
          console.log('🎯 Page: Received initial data from GameWheel:', result);
          
          // Only update ref if ColorDetector hasn't provided data yet
          if (latestWheelDataRef.current.source !== 'colorDetector') {
            latestWheelDataRef.current = {
              segmentIndex: result.segmentIndex,
              multiplier: result.multiplier,
              wheelPosition: result.wheelPosition,
              calculatedSegment: result.calculatedSegment,
              source: result.source || 'gameWheel'
            };
            console.log('🎯 Page: Initial data stored in ref (will be overridden by ColorDetector):', latestWheelDataRef.current);
          } else {
            console.log('🎯 Page: Ignoring GameWheel data, ColorDetector data already available');
          }
          
          // Update state for UI
          setWinningSegmentIndex(result.segmentIndex);
          setWinningMultiplier(result.multiplier);
          setFinalWheelPosition(result.wheelPosition);
          setCalculatedSegment(result.calculatedSegment);
        }}
            />
          </div>
          <div className="w-full lg:w-1/3">
            <BettingPanel
              gameMode={gameMode}
              setGameMode={setGameMode}
              betAmount={betAmount}
              setBetAmount={setBetAmount}
              balance={parseFloat(userFlowBalance || '0')} // Use Flow balance
              manulBet={manulBet}
              risk={selectedRisk}
              setRisk={setSelectedRisk}
              noOfSegments={noOfSegments}
              setSegments={setSegments}
              autoBet={autoBet}
              isSpinning={isSpinning}
            />
          </div>
        </div>
      </div>
      
      {/* Video and Description Section */}
      <div className="px-4 md:px-8 lg:px-20 my-12">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="w-full lg:w-1/2">
            <WheelVideo />
          </div>
          <div className="w-full lg:w-1/2">
            <WheelDescription />
          </div>
        </div>
      </div>
      
      {/* Strategy Guide and Probabilities Section */}
      <div className="px-4 md:px-8 lg:px-20 my-12">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="w-full lg:w-1/2">
            <WheelStrategyGuide />
          </div>
          <div className="w-full lg:w-1/2">
            <WheelProbability />
          </div>
        </div>
      </div>
      
      {/* Payouts and History Section */}
      <div className="px-4 md:px-8 lg:px-20 my-12">
        <div className="flex flex-col gap-12">
          <WheelPayouts />
          <WheelHistory gameHistory={gameHistory} />
        </div>
      </div>

      {/* VRF modal removed for Yellow-only mode */}
    </div>
  );
}