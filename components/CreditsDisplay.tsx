import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCasino } from '../context/CasinoContext';

const CREDITS_STORAGE_KEY = '@casino_credits';
const POLL_INTERVAL = 250; // Check more frequently (250ms)

/**
 * Self-contained credits display component that handles its own state updates
 * This ensures the credits display will update even if other components don't trigger re-renders
 */
export default function CreditsDisplay() {
  // Get initial value from context
  const casinoContext = useCasino();
  
  // Keep local state for the displayed value
  const [displayedCredits, setDisplayedCredits] = useState(
    casinoContext?.credits ?? 1000
  );
  
  // Last updated timestamp for debugging
  const lastUpdated = useRef(Date.now());
  
  // Force updates from both context and AsyncStorage
  useEffect(() => {
    // Debug each update source - helpful for troubleshooting
    console.log(`[CreditsDisplay] Context credits: ${casinoContext?.credits}`);
    
    // First source: Context updates
    if (casinoContext && casinoContext.credits !== undefined) {
      if (casinoContext.credits !== displayedCredits) {
        console.log(`[CreditsDisplay] Updating from context: ${casinoContext.credits}`);
        setDisplayedCredits(casinoContext.credits);
        lastUpdated.current = Date.now();
      }
    }
    
    // Second source: Direct from storage
    const checkStorageValue = async () => {
      try {
        const storedValue = await AsyncStorage.getItem(CREDITS_STORAGE_KEY);
        if (storedValue) {
          const parsedValue = Number(storedValue);
          
          // Only update if the value is different from what we're currently showing
          if (parsedValue !== displayedCredits) {
            console.log(`[CreditsDisplay] Updating from storage: ${parsedValue}`);
            setDisplayedCredits(parsedValue);
            lastUpdated.current = Date.now();
            
            // Also update context if it's out of sync
            if (casinoContext && casinoContext.credits !== parsedValue && 
                typeof casinoContext.updateCredits === 'function') {
              console.log(`[CreditsDisplay] Syncing context: ${parsedValue}`);
              casinoContext.updateCredits(parsedValue);
            }
          }
        }
      } catch (error) {
        console.error('[CreditsDisplay] Error reading from storage:', error);
      }
    };
    
    // Check storage immediately on first render
    checkStorageValue();
    
    // Set up polling to check storage frequently
    const interval = setInterval(checkStorageValue, POLL_INTERVAL);
    
    return () => clearInterval(interval);
  }, [casinoContext, displayedCredits]);
  
  // On context change (not affected by displayed credits)
  useEffect(() => {
    if (casinoContext && casinoContext.credits !== undefined && 
        casinoContext.credits !== displayedCredits) {
      console.log(`[CreditsDisplay] Context changed to: ${casinoContext.credits}`);
      setDisplayedCredits(casinoContext.credits);
    }
  }, [casinoContext?.credits]);
  
  // Make the component more visually distinct so we can tell when it updates
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="cash-multiple" size={24} color="#FFD700" />
      <Text style={styles.text}>{displayedCredits}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 2, // Make border slightly thicker
    borderColor: '#FFD700',
  },
  text: {
    color: '#FFD700',
    fontWeight: 'bold',
    marginLeft: 5,
    fontSize: 16,
  },
}); 