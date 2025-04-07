import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Keys for storage
const STORAGE_KEYS = {
  CREDITS: '@casino_credits',
  LAST_MACHINE: '@casino_last_machine',
  DEFAULT_BET: '@casino_default_bet',
};

// Default values
const DEFAULT_CREDITS = 1000;
const DEFAULT_BET = 10;

export function useCasinoState() {
  // Basic state
  const [credits, setCredits] = useState(DEFAULT_CREDITS);
  const [defaultBet, setDefaultBet] = useState(DEFAULT_BET);
  const [lastMachine, setLastMachine] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Safe storage access with retries
  const safeStorage = useCallback(async (operation, defaultValue = null) => {
    try {
      return await operation();
    } catch (error) {
      console.error("Storage operation failed:", error);
      return defaultValue;
    }
  }, []);
  
  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Get credits from storage
        const storedCredits = await safeStorage(
          async () => await AsyncStorage.getItem(STORAGE_KEYS.CREDITS)
        );
        
        if (storedCredits !== null) {
          setCredits(Number(storedCredits));
        } else {
          // If no credits in storage, set the default and save it
          await AsyncStorage.setItem(STORAGE_KEYS.CREDITS, String(DEFAULT_CREDITS));
        }
        
        // Get bet settings
        const storedDefaultBet = await safeStorage(
          async () => await AsyncStorage.getItem(STORAGE_KEYS.DEFAULT_BET)
        );
        
        if (storedDefaultBet !== null) {
          setDefaultBet(Number(storedDefaultBet));
        }
        
        // Get last machine
        const storedLastMachine = await safeStorage(
          async () => await AsyncStorage.getItem(STORAGE_KEYS.LAST_MACHINE)
        );
        
        if (storedLastMachine !== null) {
          setLastMachine(storedLastMachine);
        }

        setIsLoaded(true);
      } catch (error) {
        console.error('Error loading casino data:', error);
        setIsLoaded(true);
      }
    };

    loadData();
  }, [safeStorage]);
  
  // Update credits
  const updateCredits = useCallback(async (newCredits) => {
    // First update state for immediate UI feedback
    setCredits(newCredits);
    
    // Then save to storage
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CREDITS, String(newCredits));
      console.log(`[useCasinoState] Credits updated and saved: ${newCredits}`);
    } catch (error) {
      console.error('Error saving credits:', error);
    }
  }, []);
  
  // Add credits
  const addCredits = useCallback((amount) => {
    const newTotal = credits + amount;
    console.log(`[useCasinoState] Adding ${amount} credits. New total: ${newTotal}`);
    updateCredits(newTotal);
  }, [credits, updateCredits]);
  
  // Subtract credits
  const subtractCredits = useCallback((amount) => {
    const newTotal = Math.max(0, credits - amount);
    console.log(`[useCasinoState] Subtracting ${amount} credits. New total: ${newTotal}`);
    updateCredits(newTotal);
  }, [credits, updateCredits]);
  
  // Set default bet
  const saveDefaultBet = useCallback(async (bet) => {
    setDefaultBet(bet);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.DEFAULT_BET, String(bet));
    } catch (error) {
      console.error('Error saving default bet:', error);
    }
  }, []);
  
  // Set last machine
  const saveLastMachine = useCallback(async (machineId) => {
    setLastMachine(machineId);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_MACHINE, machineId);
    } catch (error) {
      console.error('Error saving last machine:', error);
    }
  }, []);
  
  return {
    credits,
    defaultBet,
    lastMachine,
    isLoaded,
    updateCredits,
    addCredits,
    subtractCredits,
    setDefaultBet: saveDefaultBet,
    setLastMachine: saveLastMachine,
  };
} 