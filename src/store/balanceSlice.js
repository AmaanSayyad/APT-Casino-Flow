import { createSlice } from '@reduxjs/toolkit';

// Load initial state from localStorage
const loadInitialState = () => {
  if (typeof window !== 'undefined') {
    const savedBalance = localStorage.getItem('userBalance');
    const savedFlowBalance = localStorage.getItem('userFlowBalance');
    const savedLoading = localStorage.getItem('isLoading');
    
    // FLOW balance validation
    let cleanBalance = "0";
    if (savedBalance && !isNaN(savedBalance) && parseFloat(savedBalance) >= 0) {
      cleanBalance = savedBalance;
    } else {
      // Reset invalid balance to 0
      localStorage.setItem('userBalance', "0");
    }
    
    // Flow balance validation
    let cleanFlowBalance = "0";
    if (savedFlowBalance && !isNaN(savedFlowBalance) && parseFloat(savedFlowBalance) >= 0) {
      cleanFlowBalance = savedFlowBalance;
    } else {
      // Reset invalid Flow balance to 0
      localStorage.setItem('userFlowBalance', "0");
    }
    
    return {
      userBalance: cleanBalance, // FLOW balance
      userFlowBalance: cleanFlowBalance, // Flow balance
      isLoading: savedLoading === 'true' || false,
    };
  }
  return {
    userBalance: "0",
    userFlowBalance: "0",
    isLoading: false,
  };
};

const initialState = loadInitialState();

const balanceSlice = createSlice({
  name: 'balance',
  initialState,
  reducers: {
    // FLOW Balance Actions
    setBalance(state, action) {
      const newBalance = action.payload;
      // Ensure balance never goes negative
      if (parseFloat(newBalance) < 0) {
        state.userBalance = "0";
        console.warn('Attempted to set negative FLOW balance, setting to 0 instead');
      } else {
        state.userBalance = newBalance;
      }
      // Persist to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('userBalance', state.userBalance);
      }
    },
    addToBalance(state, action) {
      const amountToAdd = parseFloat(action.payload);
      const currentBalance = parseFloat(state.userBalance);
      const newBalance = Math.max(0, currentBalance + amountToAdd).toFixed(5);
      state.userBalance = newBalance;
      // Persist to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('userBalance', newBalance);
      }
    },
    subtractFromBalance(state, action) {
      const amountToSubtract = parseFloat(action.payload);
      const currentBalance = parseFloat(state.userBalance);
      const newBalance = Math.max(0, currentBalance - amountToSubtract).toFixed(5);
      state.userBalance = newBalance;
      // Persist to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('userBalance', newBalance);
      }
    },
    
    // Flow Balance Actions
    setFlowBalance(state, action) {
      const newBalance = action.payload;
      // Ensure balance never goes negative
      if (parseFloat(newBalance) < 0) {
        state.userFlowBalance = "0";
        console.warn('Attempted to set negative Flow balance, setting to 0 instead');
      } else {
        state.userFlowBalance = newBalance;
      }
      // Persist to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('userFlowBalance', state.userFlowBalance);
      }
    },
    addToFlowBalance(state, action) {
      const amountToAdd = parseFloat(action.payload);
      const currentBalance = parseFloat(state.userFlowBalance);
      const newBalance = Math.max(0, currentBalance + amountToAdd).toFixed(5);
      state.userFlowBalance = newBalance;
      // Persist to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('userFlowBalance', newBalance);
      }
    },
    subtractFromFlowBalance(state, action) {
      const amountToSubtract = parseFloat(action.payload);
      const currentBalance = parseFloat(state.userFlowBalance);
      const newBalance = Math.max(0, currentBalance - amountToSubtract).toFixed(5);
      state.userFlowBalance = newBalance;
      // Persist to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('userFlowBalance', newBalance);
      }
    },
    
    // Loading state
    setLoading(state, action) {
      state.isLoading = action.payload;
      // Persist to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('isLoading', action.payload.toString());
      }
    },
  },
});

export const { 
  setBalance, 
  addToBalance, 
  subtractFromBalance, 
  setFlowBalance, 
  addToFlowBalance, 
  subtractFromFlowBalance, 
  setLoading 
} = balanceSlice.actions;

// Utility functions for localStorage operations
export const loadBalanceFromStorage = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('userBalance') || "0";
  }
  return "0";
};

export const loadFlowBalanceFromStorage = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('userFlowBalance') || "0";
  }
  return "0";
};

export const saveBalanceToStorage = (balance) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('userBalance', balance);
  }
};

export const saveFlowBalanceToStorage = (balance) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('userFlowBalance', balance);
  }
};

export default balanceSlice.reducer;
