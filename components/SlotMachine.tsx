import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Easing, Text, Platform } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCasino } from '../context/CasinoContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBackButton } from '../utils/backButtonHandler';

// Slot symbols with probabilities and payouts
const SYMBOLS = [
  { symbol: '🍒', name: 'cherry', value: 10, probability: 0.25 },
  { symbol: '🍋', name: 'lemon', value: 15, probability: 0.20 },
  { symbol: '🍊', name: 'orange', value: 20, probability: 0.17 },
  { symbol: '🍉', name: 'watermelon', value: 25, probability: 0.15 },
  { symbol: '🍇', name: 'grapes', value: 30, probability: 0.10 },
  { symbol: '🔔', name: 'bell', value: 40, probability: 0.08 },
  { symbol: '💎', name: 'diamond', value: 50, probability: 0.04 },
  { symbol: '7️⃣', name: 'seven', value: 100, probability: 0.01 },
];

const NUM_REELS = 3;
const REEL_ITEMS = 20; // Number of items in each reel (for animation)

// Add type for props
interface SlotMachineProps {
  onBackPress?: () => void;
}

export default function SlotMachine({ onBackPress }: SlotMachineProps) {
  // Use the casino context for credits
  const { 
    credits, 
    addCredits: addGlobalCredits, 
    subtractCredits: subtractGlobalCredits 
  } = useCasino();
  
  // Use the back button handler hook
  useBackButton(onBackPress);
  
  const [bet, setBet] = useState(10);
  const [spinning, setSpinning] = useState(false);
  const [results, setResults] = useState(Array(NUM_REELS).fill(0));
  const [win, setWin] = useState(0);
  const [message, setMessage] = useState('');
  
  // Animation values for each reel
  const reelPositions = useRef(Array(NUM_REELS).fill(0).map(() => new Animated.Value(0))).current;
  
  // Track credit changes for debugging
  useEffect(() => {
    console.log(`Credits in SlotMachine: ${credits}`);
  }, [credits]);
  
  // Increase bet amount
  const increaseBet = () => {
    if (bet < 100 && bet < credits) {
      setBet(prev => Math.min(prev + 10, 100, credits));
    }
  };
  
  // Decrease bet amount
  const decreaseBet = () => {
    if (bet > 10) {
      setBet(prev => prev - 10);
    }
  };
  
  // Add free credits
  const addCredits = () => {
    // Use the context function to add credits globally
    addGlobalCredits(1000);
    setMessage('1000 free credits added!');
    setTimeout(() => setMessage(''), 2000);
  };

  // Spin the slot machine
  const spin = () => {
    if (spinning) return;
    if (credits < bet) {
      setMessage('Not enough credits!');
      setTimeout(() => setMessage(''), 2000);
      return;
    }
    
    // Only use haptics on native platforms
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    // Subtract bet amount globally
    subtractGlobalCredits(bet);
    console.log(`Betting ${bet} from SlotMachine`);
    
    setSpinning(true);
    setWin(0);
    setMessage('');
    
    // Generate random results for each reel
    const newResults = Array(NUM_REELS).fill(0).map(() => {
      const rand = Math.random();
      let cumulativeProbability = 0;
      
      for (let i = 0; i < SYMBOLS.length; i++) {
        cumulativeProbability += SYMBOLS[i].probability;
        if (rand < cumulativeProbability) {
          return i;
        }
      }
      return 0; // Default to first symbol if something goes wrong
    });
    
    // Set the results immediately so the reels can use them while animating
    setResults(newResults);
    
    // Animate each reel with different durations
    const animations = reelPositions.map((position, index) => {
      // Reset position
      position.setValue(0);
      
      // Add a delay for each subsequent reel
      const duration = 1000 + (index * 500);
      
      return Animated.timing(position, {
        toValue: 1,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });
    });
    
    Animated.stagger(200, animations).start(() => {
      setSpinning(false);
      
      // Calculate winnings
      calculateWinnings(newResults);
    });
  };
  
  // Calculate winnings based on results
  const calculateWinnings = (results) => {
    // Check if all symbols are the same
    const allSame = results.every(r => r === results[0]);
    
    if (allSame) {
      const symbolValue = SYMBOLS[results[0]].value;
      const winAmount = bet * symbolValue;
      
      setWin(winAmount);
      // Add winnings globally
      addGlobalCredits(winAmount);
      console.log(`Won ${winAmount} in SlotMachine`);
      
      if (symbolValue >= 50) {
        // Only use haptics on native platforms
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setMessage('JACKPOT! 🎉');
      } else {
        // Only use haptics on native platforms
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setMessage('You win!');
      }
    } else {
      // Check for pairs
      for (let i = 0; i < NUM_REELS; i++) {
        for (let j = i + 1; j < NUM_REELS; j++) {
          if (results[i] === results[j]) {
            const symbolValue = SYMBOLS[results[i]].value;
            const winAmount = Math.floor(bet * (symbolValue / 5));
            
            if (winAmount > 0) {
              setWin(winAmount);
              // Add winnings globally
              addGlobalCredits(winAmount);
              console.log(`Won ${winAmount} in SlotMachine (pair)`);
              setMessage('Pair! Small win');
              // Only use haptics on native platforms
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              return;
            }
          }
        }
      }
      
      setMessage('Try again!');
    }
    
    setTimeout(() => setMessage(''), 2000);
  };
  
  // Function to build a reel
  const createReel = (index) => {
    const items = [];
    
    // If we're spinning, the final symbol should be the result for this reel
    const finalSymbol = SYMBOLS[results[index]].symbol;
    
    // Add random symbols for the animation (excluding the last position)
    for (let i = 0; i < REEL_ITEMS - 1; i++) {
      const randomIndex = Math.floor(Math.random() * SYMBOLS.length);
      items.push(SYMBOLS[randomIndex].symbol);
    }
    
    // Add the final result symbol
    items.push(finalSymbol);
    
    // Animation translation calculation
    const translateY = reelPositions[index].interpolate({
      inputRange: [0, 1],
      outputRange: [0, -60 * (REEL_ITEMS - 1)],
    });
    
    return (
      <Animated.View 
        key={`reel-${index}`} 
        style={[styles.reel, { transform: [{ translateY }] }]}
      >
        {items.map((item, i) => (
          <Text key={`item-${i}`} style={styles.symbol}>
            {item}
          </Text>
        ))}
      </Animated.View>
    );
  };
  
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>Lucky Slots</ThemedText>
      
      {/* Credits and bet display */}
      <View style={styles.infoContainer}>
        <ThemedView style={styles.creditContainer}>
          <ThemedText type="defaultSemiBold">Credits:</ThemedText>
          <ThemedText type="subtitle">{credits}</ThemedText>
          <TouchableOpacity style={styles.addButton} onPress={addCredits}>
            <ThemedText type="smallSemiBold">+1000</ThemedText>
          </TouchableOpacity>
        </ThemedView>
        
        <ThemedView style={styles.betContainer}>
          <ThemedText type="defaultSemiBold">Bet:</ThemedText>
          <View style={styles.betControls}>
            <TouchableOpacity 
              style={styles.betButton} 
              onPress={decreaseBet}
              disabled={spinning || bet <= 10}
            >
              <MaterialCommunityIcons name="minus" size={18} color="#FFF" />
            </TouchableOpacity>
            
            <ThemedText type="subtitle">{bet}</ThemedText>
            
            <TouchableOpacity 
              style={styles.betButton} 
              onPress={increaseBet}
              disabled={spinning || bet >= 100 || bet >= credits}
            >
              <MaterialCommunityIcons name="plus" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        </ThemedView>
      </View>
      
      {/* Slot machine display */}
      <ThemedView style={styles.slotMachine}>
        <View style={styles.reelsContainer}>
          {Array(NUM_REELS).fill(0).map((_, index) => (
            <View key={`reel-container-${index}`} style={styles.reelContainer}>
              {createReel(index)}
            </View>
          ))}
        </View>
        
        {/* Win line */}
        <View style={styles.winLine} />
      </ThemedView>
      
      {/* Spin button */}
      <TouchableOpacity 
        style={[
          styles.spinButton, 
          spinning && styles.spinningButton,
          credits < bet && styles.disabledButton
        ]} 
        onPress={spin}
        disabled={spinning || credits < bet}
      >
        <ThemedText type="subtitle" style={styles.spinText}>
          {spinning ? 'SPINNING...' : 'SPIN'}
        </ThemedText>
      </TouchableOpacity>
      
      {/* Win message */}
      {win > 0 && (
        <ThemedView style={styles.winMessage}>
          <ThemedText type="subtitle" style={styles.winText}>
            YOU WON {win} CREDITS!
          </ThemedText>
        </ThemedView>
      )}
      
      {/* Status message */}
      {message ? (
        <ThemedView style={styles.messageContainer}>
          <ThemedText type="defaultSemiBold" style={styles.message}>
            {message}
          </ThemedText>
        </ThemedView>
      ) : null}
      
      {/* Payout table */}
      <ThemedView style={styles.payoutContainer}>
        <ThemedText type="subtitle">Payouts</ThemedText>
        <View style={styles.payoutTable}>
          {SYMBOLS.map((item, index) => (
            <View key={`payout-${index}`} style={styles.payoutRow}>
              <Text style={styles.payoutSymbol}>{item.symbol}</Text>
              <ThemedText>x{item.value}</ThemedText>
            </View>
          ))}
        </View>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    gap: 20,
  },
  title: {
    marginBottom: 10,
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
  },
  creditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  betContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  betControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  betButton: {
    backgroundColor: '#3498db',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotMachine: {
    width: '100%',
    maxWidth: 350,
    height: 120,
    borderWidth: 5,
    borderColor: '#D4AF37',
    borderRadius: 10,
    padding: 5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
    position: 'relative',
  },
  reelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    height: 80,
  },
  reelContainer: {
    width: 80,
    height: 80,
    overflow: 'hidden',
    backgroundColor: '#222',
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#666',
  },
  reel: {
    alignItems: 'center',
  },
  symbol: {
    fontSize: 40,
    height: 50,
    textAlign: 'center',
    marginVertical: 5,
  },
  winLine: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 3,
    backgroundColor: 'red',
    zIndex: 10,
  },
  spinButton: {
    backgroundColor: '#E74C3C',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 30,
    marginTop: 20,
  },
  spinningButton: {
    backgroundColor: '#95A5A6',
  },
  disabledButton: {
    backgroundColor: '#95A5A6',
    opacity: 0.7,
  },
  spinText: {
    color: '#FFFFFF',
  },
  winMessage: {
    marginTop: 10,
    padding: 10,
    borderRadius: 5,
    backgroundColor: '#F1C40F',
  },
  winText: {
    color: '#000000',
  },
  messageContainer: {
    marginTop: 10,
    padding: 5,
    borderRadius: 5,
  },
  message: {
    textAlign: 'center',
  },
  payoutContainer: {
    marginTop: 20,
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
  },
  payoutTable: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 10,
  },
  payoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '25%',
    marginBottom: 5,
    gap: 5,
  },
  payoutSymbol: {
    fontSize: 20,
  },
}); 