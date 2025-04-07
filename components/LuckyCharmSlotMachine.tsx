import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Easing, Text, Platform } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCasino } from '../context/CasinoContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Lucky charm themed symbols with probabilities and payouts
const SYMBOLS = [
  { symbol: '☘️', name: 'clover', value: 10, probability: 0.25 },
  { symbol: '🍀', name: 'four-leaf-clover', value: 15, probability: 0.20 },
  { symbol: '🌈', name: 'rainbow', value: 20, probability: 0.17 },
  { symbol: '🪙', name: 'gold-coin', value: 25, probability: 0.15 },
  { symbol: '🧩', name: 'puzzle', value: 30, probability: 0.10 },
  { symbol: '🔮', name: 'crystal-ball', value: 40, probability: 0.08 },
  { symbol: '💰', name: 'money-bag', value: 50, probability: 0.04 },
  { symbol: '🎩', name: 'leprechaun-hat', value: 100, probability: 0.01 },
];

// Symbols for the multiplier wheel - many non-clover items with 1 special clover
const MULTIPLIER_WHEEL_SYMBOLS = [
  '🪙', '🍀', '🌈', '💰', '🔮', // repeat these symbols multiple times
  '🪙', '🌟', '🌈', '💰', '🔮',
  '🪙', '🌟', '🌈', '💰', '🔮',
  '🪙', '🌟', '🌈', '💰', '🔮',
  '🪙', '🌟', '🌈', '💰', '🔮',
  '☘️', // The special clover - only 1 in the wheel
];

// Multiplier values that can be won from the wheel
const WHEEL_MULTIPLIERS = [2, 3, 5, 10];

const NUM_REELS = 4; // Added one more reel for more gameplay complexity
const REEL_ITEMS = 20; // Number of items in each reel (for animation)

// Rainbow multiplier values with probabilities
const RAINBOW_MULTIPLIERS = [
  { value: 2, probability: 0.60 },
  { value: 3, probability: 0.25 },
  { value: 5, probability: 0.10 },
  { value: 10, probability: 0.05 },
];

export default function LuckyCharmSlotMachine() {
  // Use the casino context for credits
  const { 
    credits, 
    addCredits: addGlobalCredits, 
    subtractCredits: subtractGlobalCredits 
  } = useCasino();
  
  const [bet, setBet] = useState(10);
  const [spinning, setSpinning] = useState(false);
  const [results, setResults] = useState(Array(NUM_REELS).fill(0));
  const [win, setWin] = useState(0);
  const [message, setMessage] = useState('');
  const [rainbowMultiplier, setRainbowMultiplier] = useState(1);
  const [showMultiplier, setShowMultiplier] = useState(false);
  
  // Multiplier wheel states
  const [wheelSpinning, setWheelSpinning] = useState(false);
  const [wheelSymbols, setWheelSymbols] = useState([...MULTIPLIER_WHEEL_SYMBOLS]);
  const [wheelIndex, setWheelIndex] = useState(0);
  const [wheelMultiplier, setWheelMultiplier] = useState(1);
  const [showWheelMultiplier, setShowWheelMultiplier] = useState(false);
  const [wheelPosition, setWheelPosition] = useState(0);
  const [showStopButton, setShowStopButton] = useState(false);
  
  // Animation values for each reel
  const reelPositions = useRef(Array(NUM_REELS).fill(0).map(() => new Animated.Value(0))).current;
  
  // Animation for the multiplier wheel
  const wheelPositionAnim = useRef(new Animated.Value(0)).current;
  
  // Animation for rainbow multiplier
  const multiplierScale = useRef(new Animated.Value(1)).current;
  
  // Timer refs for wheel animation
  const wheelAnimationRef = useRef(null);
  const wheelIntervalRef = useRef(null);
  
  // Track credit changes for debugging
  useEffect(() => {
    console.log(`Credits in LuckyCharmSlotMachine: ${credits}`);
  }, [credits]);
  
  // Cleanup wheel animations on unmount
  useEffect(() => {
    return () => {
      if (wheelAnimationRef.current) {
        clearTimeout(wheelAnimationRef.current);
      }
      if (wheelIntervalRef.current) {
        clearInterval(wheelIntervalRef.current);
      }
    };
  }, []);
  
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

  // Generate a random rainbow multiplier
  const getRandomMultiplier = () => {
    const rand = Math.random();
    let cumulativeProbability = 0;
    
    for (let i = 0; i < RAINBOW_MULTIPLIERS.length; i++) {
      cumulativeProbability += RAINBOW_MULTIPLIERS[i].probability;
      if (rand < cumulativeProbability) {
        return RAINBOW_MULTIPLIERS[i].value;
      }
    }
    return 2; // Default multiplier if something goes wrong
  };
  
  // Start spinning the multiplier wheel
  const startWheelSpin = () => {
    // Shuffle wheel symbols for more randomness
    const shuffled = [...MULTIPLIER_WHEEL_SYMBOLS].sort(() => 0.5 - Math.random());
    setWheelSymbols(shuffled);
    setWheelSpinning(true);
    setShowStopButton(true);
    
    // Clear any existing animations
    if (wheelIntervalRef.current) {
      clearInterval(wheelIntervalRef.current);
    }
    
    // Use interval instead of setTimeout for more reliable continuous motion
    // This avoids React state closure problems
    wheelIntervalRef.current = setInterval(() => {
      setWheelPosition(prev => prev + 1);
    }, 50); // Fast spin speed
  };
  
  // Stop the multiplier wheel
  const stopWheel = () => {
    // Clear any spinning animations
    setWheelSpinning(false);
    
    if (wheelAnimationRef.current) {
      clearTimeout(wheelAnimationRef.current);
      wheelAnimationRef.current = null;
    }
    
    if (wheelIntervalRef.current) {
      clearInterval(wheelIntervalRef.current);
      wheelIntervalRef.current = null;
    }
    
    setShowStopButton(false);
    
    // Snap to nearest full icon position (to avoid stopping between icons)
    const snappedPosition = Math.round(wheelPosition);
    setWheelPosition(snappedPosition);
    
    // Get the current index in the wheel
    const currentIndex = snappedPosition % wheelSymbols.length;
    setWheelIndex(currentIndex);
    
    // Check if user stopped on the special clover
    const stoppedOnClover = wheelSymbols[currentIndex] === '☘️';
    
    if (stoppedOnClover) {
      // User wins a multiplier!
      const multiplier = WHEEL_MULTIPLIERS[Math.floor(Math.random() * WHEEL_MULTIPLIERS.length)];
      setWheelMultiplier(multiplier);
      setShowWheelMultiplier(true);
      
      // Apply multiplier to winnings
      if (win > 0) {
        const newWinAmount = win * multiplier;
        setWin(newWinAmount);
        addGlobalCredits(newWinAmount - win); // Add the extra winnings
        
        setMessage(`Lucky Clover! ${multiplier}x Multiplier!`);
        
        // Haptic feedback
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
      
      // Animate the multiplier
      Animated.sequence([
        Animated.timing(multiplierScale, {
          toValue: 1.5,
          duration: 300,
          easing: Easing.bounce,
          useNativeDriver: true,
        }),
        Animated.timing(multiplierScale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      setMessage('Try again next time!');
      setShowWheelMultiplier(false);
    }
    
    // Hide multiplier after a delay
    setTimeout(() => {
      setShowWheelMultiplier(false);
      setTimeout(() => setMessage(''), 2000);
    }, 3000);
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
    console.log(`Betting ${bet} from LuckyCharmSlotMachine`);
    
    setSpinning(true);
    setWin(0);
    setMessage('');
    setShowMultiplier(false);
    setShowWheelMultiplier(false);
    
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
    
    // Determine if we get a rainbow multiplier (10% chance)
    const hasRainbowMultiplier = Math.random() < 0.10;
    const multiplier = hasRainbowMultiplier ? getRandomMultiplier() : 1;
    setRainbowMultiplier(multiplier);
    
    // Animate each reel with different durations
    const animations = reelPositions.map((position, index) => {
      // Reset position
      position.setValue(0);
      
      // Add a delay for each subsequent reel
      const duration = 1000 + (index * 400);
      
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
      calculateWinnings(newResults, multiplier);
      
      // Show multiplier if applicable
      if (multiplier > 1) {
        setShowMultiplier(true);
        
        // Animate the multiplier
        Animated.sequence([
          Animated.timing(multiplierScale, {
            toValue: 1.5,
            duration: 300,
            easing: Easing.bounce,
            useNativeDriver: true,
          }),
          Animated.timing(multiplierScale, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          })
        ]).start();
      }
      
      // Start the multiplier wheel after the main reels stop
      startWheelSpin();
    });
  };
  
  // Calculate winnings based on results and rainbow multiplier
  const calculateWinnings = (results, multiplier) => {
    // Count how many of each symbol we have
    const symbolCounts = {};
    results.forEach(symbolIndex => {
      const symbolName = SYMBOLS[symbolIndex].name;
      symbolCounts[symbolName] = (symbolCounts[symbolName] || 0) + 1;
    });
    
    // Find the most frequent symbol
    let maxCount = 0;
    let maxSymbol = null;
    
    for (const [symbol, count] of Object.entries(symbolCounts)) {
      if (count > maxCount) {
        maxCount = count;
        maxSymbol = symbol;
      }
    }
    
    // Calculate base win amount based on the count of the most frequent symbol
    let winAmount = 0;
    
    if (maxCount === NUM_REELS) {
      // All symbols match - jackpot!
      const symbolIndex = SYMBOLS.findIndex(s => s.name === maxSymbol);
      const symbolValue = SYMBOLS[symbolIndex].value;
      winAmount = bet * symbolValue;
      
      // Only use haptics on native platforms
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setMessage('JACKPOT! 🎩☘️🍀');
    } else if (maxCount >= 3) {
      // At least 3 matching symbols
      const symbolIndex = SYMBOLS.findIndex(s => s.name === maxSymbol);
      const symbolValue = SYMBOLS[symbolIndex].value;
      winAmount = bet * (symbolValue / (NUM_REELS - maxCount + 1));
      
      // Only use haptics on native platforms
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setMessage(`${maxCount} of a kind!`);
    } else {
      // Special case: Check for consecutive "clover" and "four-leaf-clover" symbols
      const totalClovers = (symbolCounts['clover'] || 0) + (symbolCounts['four-leaf-clover'] || 0);
      if (totalClovers >= 3) {
        winAmount = bet * 5;
        setMessage('Lucky Clovers!');
        
        // Only use haptics on native platforms
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        setMessage('Try again!');
      }
    }
    
    // Apply the rainbow multiplier
    if (winAmount > 0 && multiplier > 1) {
      winAmount = Math.floor(winAmount * multiplier);
      setMessage(prev => `${prev} (x${multiplier} Rainbow Bonus!)`);
    }
    
    // Set the win amount and add it to credits
    if (winAmount > 0) {
      setWin(winAmount);
      addGlobalCredits(winAmount);
      console.log(`Won ${winAmount} in LuckyCharmSlotMachine`);
    }
    
    setTimeout(() => setMessage(''), 3000);
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
  
  // Render the multiplier wheel
  const renderMultiplierWheel = () => {
    // Calculate visible items in the wheel
    const visibleItems = [];
    const currentIndex = Math.round(wheelPosition) % wheelSymbols.length; // Ensure we're using whole positions
    
    // Get a fixed number of items centered around current index
    for (let i = -2; i <= 2; i++) { // Show 5 items centered around the current one
      const index = (currentIndex + i + wheelSymbols.length) % wheelSymbols.length;
      visibleItems.push(wheelSymbols[index]);
    }
    
    // We'll use a fixed position for the wheel to ensure perfect alignment with center line
    return (
      <View style={styles.multiplierReelContainer}>
        <View style={styles.wheelCenterMark} /> {/* Add a visible center marker */}
        
        <View style={styles.wheelItems}>
          {visibleItems.map((symbol, i) => (
            <Text 
              key={`wheel-item-${i}`} 
              style={[
                styles.multiplierSymbol, 
                i === 2 && styles.centerSymbol // Highlight the center (active) symbol
              ]}
            >
              {symbol}
            </Text>
          ))}
        </View>
        
        {showStopButton && (
          <TouchableOpacity 
            style={styles.stopButtonOverlay}
            onPress={stopWheel}
          >
            <ThemedText style={styles.stopText}>
              STOP
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>
    );
  };
  
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>Lucky Charm Slots</ThemedText>
      
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
      
      {/* Rainbow multiplier bonus callout */}
      <ThemedView style={styles.rainbowBonus}>
        <ThemedText type="subtitle" style={styles.rainbowText}>
          🌈 Rainbow Multiplier Bonus! 🌈
        </ThemedText>
        <ThemedText type="smallSemiBold">
          10% chance of a 2x-10x multiplier on any win!
        </ThemedText>
      </ThemedView>
      
      {/* Clover wheel instruction */}
      <ThemedView style={styles.cloverBonus}>
        <ThemedText type="smallSemiBold" style={styles.cloverText}>
          Stop the center wheel on ☘️ for bonus multiplier!
        </ThemedText>
      </ThemedView>
      
      {/* Game area container with all 5 wheels */}
      <ThemedView style={styles.slotMachine}>
        {/* All 5 reels in a row with multiplier wheel in the center */}
        <View style={styles.reelsContainer}>
          {/* First 2 regular reels */}
          {Array(NUM_REELS/2).fill(0).map((_, index) => (
            <View key={`reel-container-left-${index}`} style={styles.reelContainer}>
              {createReel(index)}
            </View>
          ))}
          
          {/* The multiplier wheel as center (3rd) reel */}
          {renderMultiplierWheel()}
          
          {/* Last 2 regular reels */}
          {Array(NUM_REELS/2).fill(0).map((_, index) => (
            <View key={`reel-container-right-${index}`} style={styles.reelContainer}>
              {createReel(index + NUM_REELS/2)}
            </View>
          ))}
        </View>
        
        {/* Win line */}
        <View style={styles.winLine} />
      </ThemedView>
      
      {/* Multiplier display */}
      {showMultiplier && (
        <Animated.View 
          style={[
            styles.multiplierContainer, 
            { transform: [{ scale: multiplierScale }] }
          ]}
        >
          <ThemedText type="title" style={styles.multiplierText}>
            x{rainbowMultiplier}
          </ThemedText>
        </Animated.View>
      )}
      
      {/* Wheel multiplier display */}
      {showWheelMultiplier && (
        <Animated.View 
          style={[
            styles.wheelMultiplierContainer, 
            { transform: [{ scale: multiplierScale }] }
          ]}
        >
          <ThemedText type="title" style={styles.multiplierText}>
            x{wheelMultiplier}
          </ThemedText>
        </Animated.View>
      )}
      
      {/* Spin button */}
      <TouchableOpacity 
        style={[
          styles.spinButton, 
          spinning && styles.spinningButton,
          credits < bet && styles.disabledButton
        ]} 
        onPress={spin}
        disabled={spinning || credits < bet || wheelSpinning}
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
    color: '#34AD00', // Lucky green color
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
  rainbowBonus: {
    width: '100%',
    padding: 10,
    marginBottom: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(52, 173, 0, 0.1)', // Light green background
    borderWidth: 2,
    borderColor: '#FFD700', // Gold border
    alignItems: 'center',
  },
  rainbowText: {
    fontWeight: 'bold',
    color: '#FD5F00', // Vibrant orange
  },
  slotMachine: {
    width: '100%',
    maxWidth: 500,
    height: 120,
    borderWidth: 5,
    borderColor: '#34AD00', // Lucky green
    borderRadius: 10,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B5345', // Dark green
    position: 'relative',
  },
  reelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    height: 80,
  },
  reelContainer: {
    width: 60, // Slightly smaller to fit 5 reels
    height: 80,
    overflow: 'hidden',
    backgroundColor: '#0A3A2A', // Darker green
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#FFD700', // Gold
    position: 'relative', // To position stop button
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
    backgroundColor: '#FFD700', // Gold
    zIndex: 10,
  },
  // Multiplier wheel styles
  wheelOuter: undefined,
  wheelContainer: undefined,
  wheelHeading: undefined,
  wheelFrame: undefined,
  wheelShadowTop: undefined,
  wheelShadowBottom: undefined,
  wheelSelector: undefined,
  wheelSymbols: undefined,
  wheelSymbol: undefined,
  wheelSymbolCenter: undefined,
  wheelSymbolBlur: undefined,
  wheelTitle: undefined,
  wheelInstructions: undefined,
  multiplierContainer: {
    position: 'absolute',
    top: '35%',
    left: '25%',
    zIndex: 100,
    backgroundColor: 'rgba(255, 215, 0, 0.8)', // Semi-transparent gold
    borderRadius: 50,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#34AD00', // Lucky green
  },
  wheelMultiplierContainer: {
    position: 'absolute',
    top: '35%',
    right: '25%',
    zIndex: 100,
    backgroundColor: 'rgba(52, 173, 0, 0.8)', // Semi-transparent green
    borderRadius: 50,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFD700', // Gold
  },
  multiplierText: {
    color: '#FFFFFF', // White text
    fontSize: 32,
    fontWeight: 'bold',
  },
  spinButton: {
    backgroundColor: '#FD5F00', // Vibrant orange (pot of gold color)
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 30,
    marginTop: 20,
    borderWidth: 2,
    borderColor: '#FFD700', // Gold
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
    backgroundColor: '#FFD700', // Gold
  },
  winText: {
    color: '#0B5345', // Dark green
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
  cloverBonus: {
    width: '100%',
    paddingVertical: 5,
    marginBottom: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(231, 76, 60, 0.1)', // Light red background
    borderWidth: 2,
    borderColor: '#E74C3C', // Red border
    alignItems: 'center',
  },
  cloverText: {
    fontWeight: 'bold',
    color: '#E74C3C', // Red text
  },
  stopButtonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(231, 76, 60, 0.7)', // Semi-transparent red
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  stopText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  multiplierReelContainer: {
    width: 40, // Skinnier than regular reels (60px)
    height: 120, // 50% taller than regular reels (80px + 40px)
    overflow: 'hidden',
    backgroundColor: '#0A3A2A', // Darker green
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#E74C3C', // Red border to highlight it's special
    position: 'relative', // To position stop button
    marginTop: -20, // Exactly 25% of regular height (80px * 0.25) to center align
    marginBottom: -20, // Ensure it extends equally below
    alignSelf: 'center', // Help with center alignment
    zIndex: 5, // Keep it above other elements
  },
  multiplierSymbol: {
    fontSize: 24, // Smaller font size for better proportions
    height: 40, // Adjust height to match center alignment
    lineHeight: 40, // Ensure vertical centering
    textAlign: 'center',
  },
  wheelItems: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
  },
  centerSymbol: {
    fontSize: 32, // Make the center symbol larger
    color: '#FFD700', // Gold color for emphasis
    fontWeight: 'bold',
  },
  wheelCenterMark: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#FFD700', // Gold line
    top: '50%',
    zIndex: 6,
  },
}); 