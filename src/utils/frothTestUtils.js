/**
 * FROTH Test Utilities
 * Helper functions for testing FROTH functionality on testnet
 */

import { setFrothBalance } from '@/store/balanceSlice';

/**
 * Add test FROTH balance for testing purposes
 * @param {function} dispatch - Redux dispatch function
 * @param {number} amount - Amount to add
 */
export const addTestFrothBalance = (dispatch, amount = 50000) => {
  const currentBalance = parseFloat(localStorage.getItem('userFrothBalance') || '0');
  const newBalance = (currentBalance + amount).toFixed(2);
  
  localStorage.setItem('userFrothBalance', newBalance);
  dispatch(setFrothBalance(newBalance));
  
  console.log(`✅ Added ${amount} test FROTH. New balance: ${newBalance}`);
  return newBalance;
};

/**
 * Set specific FROTH balance for testing
 * @param {function} dispatch - Redux dispatch function
 * @param {number} amount - Amount to set
 */
export const setTestFrothBalance = (dispatch, amount) => {
  const newBalance = amount.toFixed(2);
  
  localStorage.setItem('userFrothBalance', newBalance);
  dispatch(setFrothBalance(newBalance));
  
  console.log(`✅ Set test FROTH balance to: ${newBalance}`);
  return newBalance;
};

/**
 * Quick test amounts for different scenarios
 */
export const FROTH_TEST_AMOUNTS = {
  SMALL: 1000,      // Minimum bet amount
  MEDIUM: 25000,    // Good for multiple games
  LARGE: 100000,    // High roller testing
  WHALE: 1000000    // Maximum bet testing
};

/**
 * Initialize test FROTH balance if none exists
 * @param {function} dispatch - Redux dispatch function
 */
export const initializeTestFrothBalance = (dispatch) => {
  const currentBalance = localStorage.getItem('userFrothBalance');
  
  if (!currentBalance || parseFloat(currentBalance) === 0) {
    return addTestFrothBalance(dispatch, FROTH_TEST_AMOUNTS.MEDIUM);
  }
  
  return currentBalance;
};

/**
 * Reset FROTH balance to zero
 * @param {function} dispatch - Redux dispatch function
 */
export const resetFrothBalance = (dispatch) => {
  localStorage.setItem('userFrothBalance', '0');
  dispatch(setFrothBalance('0'));
  
  console.log('✅ Reset FROTH balance to 0');
  return '0';
};