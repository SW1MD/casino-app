import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useCasinoState } from '../hooks/useCasinoState';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

// Storage keys - replicated from useCasinoState for direct access
const STORAGE_KEYS = {
  CREDITS: '@casino_credits',
  LAST_MACHINE: '@casino_last_machine',
  DEFAULT_BET: '@casino_default_bet',
};

// Create the context with a default value
const CasinoContext = createContext({
  credits: 1000,
  defaultBet: 10,
  lastMachine: null,
  isLoaded: false,
  updateCredits: () => {},
  addCredits: () => {},
  subtractCredits: () => {},
  forceUpdate: () => {},
  syncWithStorage: () => {},
  setDefaultBet: () => {},
  setLastMachine: () => {},
});

// Provider component with enhanced credit consistency
export function CasinoProvider({ children }) {
  // Get the base casino state
  const casinoState = useCasinoState();
  
  // Tracking refs for debugging
  const lastUpdatedRef = useRef(Date.now());
  const creditsRef = useRef(casinoState.credits);
  
  // Manual trigger for UI updates
  const [updateCounter, setUpdateCounter] = useState(0);
  
  // Force a context update
  const forceUpdate = () => {
    lastUpdatedRef.current = Date.now();
    setUpdateCounter(prev => prev + 1);
  };
  
  // Keep refs in sync
  useEffect(() => {
    creditsRef.current = casinoState.credits;
  }, [casinoState.credits]);
  
  // Handle app state changes (background/foreground)
  useEffect(() => {
    const handleAppStateChange = async (nextAppState) => {
      if (nextAppState === 'active') {
        // App has come to the foreground, sync credits
        try {
          const storedCredits = await AsyncStorage.getItem('@casino_credits');
          if (storedCredits !== null) {
            const parsedCredits = Number(storedCredits);
            if (parsedCredits !== creditsRef.current && typeof casinoState.updateCredits === 'function') {
              console.log(`[CasinoProvider] App foregrounded, updating credits from ${creditsRef.current} to ${parsedCredits}`);
              casinoState.updateCredits(parsedCredits);
              forceUpdate();
            }
          }
        } catch (error) {
          console.error("[CasinoProvider] Error syncing credits:", error);
        }
      }
    };
    
    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, [casinoState]);
  
  // Direct storage access function
  const syncWithStorage = async () => {
    // Don't sync too frequently (throttle to once per second)
    if (Date.now() - lastUpdatedRef.current < 1000) {
      return;
    }
    
    try {
      const storedCredits = await AsyncStorage.getItem('@casino_credits');
      if (storedCredits !== null) {
        const parsedCredits = Number(storedCredits);
        if (parsedCredits !== creditsRef.current && typeof casinoState.updateCredits === 'function') {
          console.log(`[CasinoProvider] Syncing credits from storage: ${parsedCredits}`);
          casinoState.updateCredits(parsedCredits);
          lastUpdatedRef.current = Date.now();
          forceUpdate();
        }
      }
    } catch (error) {
      console.error("[CasinoProvider] Error syncing with storage:", error);
    }
  };
  
  // Enhanced methods for credit operations
  const enhancedAddCredits = (amount) => {
    console.log(`[CasinoProvider] Adding ${amount} credits to ${creditsRef.current}`);
    if (typeof casinoState.addCredits === 'function') {
      // Directly update the casinoState credits first
      const newTotal = casinoState.credits + amount;
      // Force an immediate state update for the UI
      if (typeof casinoState.updateCredits === 'function') {
        casinoState.updateCredits(newTotal);
      }
      forceUpdate();
      
      // Also save to AsyncStorage directly for extra reliability
      try {
        AsyncStorage.setItem(STORAGE_KEYS.CREDITS, String(newTotal))
          .then(() => console.log(`[CasinoProvider] Credits saved after adding: ${newTotal}`))
          .catch(err => console.error('[CasinoProvider] Error saving credits:', err));
      } catch (error) {
        console.error('[CasinoProvider] Error in addCredits:', error);
      }
    }
  };
  
  const enhancedSubtractCredits = (amount) => {
    console.log(`[CasinoProvider] Subtracting ${amount} credits from ${creditsRef.current}`);
    if (typeof casinoState.subtractCredits === 'function') {
      // Directly update the casinoState credits first
      const newTotal = Math.max(0, casinoState.credits - amount);
      // Force an immediate state update for the UI
      if (typeof casinoState.updateCredits === 'function') {
        casinoState.updateCredits(newTotal);
      }
      forceUpdate();
      
      // Also save to AsyncStorage directly for extra reliability
      try {
        AsyncStorage.setItem(STORAGE_KEYS.CREDITS, String(newTotal))
          .then(() => console.log(`[CasinoProvider] Credits saved after subtracting: ${newTotal}`))
          .catch(err => console.error('[CasinoProvider] Error saving credits:', err));
      } catch (error) {
        console.error('[CasinoProvider] Error in subtractCredits:', error);
      }
    }
  };
  
  // Enhanced context value with all our improvements
  const contextValue = {
    ...casinoState,
    updateCounter,
    addCredits: enhancedAddCredits,
    subtractCredits: enhancedSubtractCredits,
    forceUpdate,
    syncWithStorage,
  };
  
  return (
    <CasinoContext.Provider value={contextValue}>
      {children}
    </CasinoContext.Provider>
  );
}

// Custom hook to use the casino context
export function useCasino() {
  return useContext(CasinoContext);
} 