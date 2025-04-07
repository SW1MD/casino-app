import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Easing, Text, Platform, ScrollView } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCasino } from '../context/CasinoContext';

// Atlantis themed slot symbols with probabilities and payouts
const SYMBOLS = [
  { symbol: '🐚', name: 'shell', value: 2, probability: 0.20 },
  { symbol: '🐟', name: 'fish', value: 3, probability: 0.18 },
  { symbol: '🦀', name: 'crab', value: 5, probability: 0.15 },
  { symbol: '🐙', name: 'octopus', value: 8, probability: 0.12 },
  { symbol: '🧜‍♀️', name: 'mermaid', value: 15, probability: 0.10 },
  { symbol: '🧜‍♂️', name: 'merman', value: 15, probability: 0.10 },
  { symbol: '🔱', name: 'trident', value: 20, probability: 0.07 },
  { symbol: '⚡', name: 'zeus', value: 25, probability: 0.04 },
  { symbol: '🏛️', name: 'temple', value: 30, probability: 0.02 },
  { symbol: '🧿', name: 'eye', value: 40, probability: 0.01 },
  { symbol: '🏺', name: 'amphora', value: 50, probability: 0.005 },
  { symbol: '🔮', name: 'atlantis', value: 100, probability: 0.001 },
];

// Water levels (determines multipliers)
const WATER_LEVELS = [
  { level: 0, name: 'Low Tide', multiplier: 1 },
  { level: 1, name: 'Rising Tide', multiplier: 2 },
  { level: 2, name: 'High Tide', multiplier: 3 },
  { level: 3, name: 'Poseidon\'s Fury', multiplier: 5 },
];

const NUM_REELS = 5;
const ROWS_PER_REEL = 3;
const REEL_ITEMS = 20; // Number of items in each reel (for animation)
const GLOW_ANIMATION_DURATION = 1500;

export default function AtlantisSlotMachine() {
  // Use global casino context
  const { 
    credits, 
    defaultBet,
    addCredits: addGlobalCredits,
    subtractCredits,
    setLastMachine
  } = useCasino();
  
  const [bet, setBet] = useState(defaultBet || 10);
  const [spinning, setSpinning] = useState(false);
  const [visibleSymbols, setVisibleSymbols] = useState(
    Array(NUM_REELS).fill(0).map(() => 
      Array(ROWS_PER_REEL).fill(0).map(() => Math.floor(Math.random() * SYMBOLS.length))
    )
  );
  const [win, setWin] = useState(0);
  const [message, setMessage] = useState('');
  const [waterLevel, setWaterLevel] = useState(0);
  const [consecutiveWins, setConsecutiveWins] = useState(0);
  const [lastWin, setLastWin] = useState(false);
  // Add state to track winning positions
  const [winningPositions, setWinningPositions] = useState([]);
  const [glowOpacity] = useState(new Animated.Value(0));
  
  // Animation values for each reel
  const reelPositions = useRef(Array(NUM_REELS).fill(0).map(() => new Animated.Value(0))).current;
  
  // Water level animation
  const waterAnimation = useRef(new Animated.Value(0)).current;
  
  // Add machine ID for tracking
  const MACHINE_ID = 'atlantisSlots';
  
  // Set the last machine when component mounts
  useEffect(() => {
    setLastMachine(MACHINE_ID);
  }, []);
  
  // Effect to animate water level changes
  useEffect(() => {
    Animated.timing(waterAnimation, {
      toValue: waterLevel,
      duration: 500,
      easing: Easing.elastic(1),
      useNativeDriver: false,
    }).start();
  }, [waterLevel]);
  
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
    
    subtractCredits(bet);
    setSpinning(true);
    setWin(0);
    setMessage('');
    
    // Generate random results for each reel and row
    const newVisibleSymbols = Array(NUM_REELS).fill(0).map(() => 
      Array(ROWS_PER_REEL).fill(0).map(() => {
        const rand = Math.random();
        let cumulativeProbability = 0;
        
        for (let i = 0; i < SYMBOLS.length; i++) {
          cumulativeProbability += SYMBOLS[i].probability;
          if (rand < cumulativeProbability) {
            return i;
          }
        }
        return 0; // Default to first symbol if something goes wrong
      })
    );
    
    // Set the visible symbols immediately
    setVisibleSymbols(newVisibleSymbols);
    
    // Animate each reel with different durations
    const animations = reelPositions.map((position, index) => {
      // Reset position
      position.setValue(0);
      
      // Add a delay for each subsequent reel
      const duration = 1000 + (index * 300);
      
      return Animated.timing(position, {
        toValue: 1,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });
    });
    
    Animated.stagger(150, animations).start(() => {
      setSpinning(false);
      
      // Calculate winnings
      calculateWinnings(newVisibleSymbols);
    });
  };
  
  // Calculate winnings based on results
  const calculateWinnings = (symbolsMatrix) => {
    let totalWin = 0;
    let specialFeatures = [];
    // Create array to store winning positions
    let newWinningPositions = [];
    
    // Check for consecutive symbols in rows
    for (let row = 0; row < ROWS_PER_REEL; row++) {
      let currentSymbol = symbolsMatrix[0][row];
      let consecutiveCount = 1;
      let positions = [[0, row]]; // Track positions starting with first reel
      
      for (let reel = 1; reel < NUM_REELS; reel++) {
        if (symbolsMatrix[reel][row] === currentSymbol) {
          consecutiveCount++;
          positions.push([reel, row]); // Add position to the tracking array
        } else {
          break;
        }
      }
      
      // Need at least 3 consecutive symbols to win
      if (consecutiveCount >= 3) {
        const symbolValue = SYMBOLS[currentSymbol].value;
        // Base win calculation
        let winAmount = bet * symbolValue * (consecutiveCount - 2);
        
        // Apply water level multiplier
        winAmount *= WATER_LEVELS[waterLevel].multiplier;
        
        // Special handling for mythology symbols
        if (SYMBOLS[currentSymbol].name === 'mermaid' || 
            SYMBOLS[currentSymbol].name === 'merman') {
          specialFeatures.push('mermaid');
          // Merfolk bonus: 1.5x multiplier for merfolk wins
          winAmount = Math.floor(winAmount * 1.5);
        }
        
        if (SYMBOLS[currentSymbol].name === 'zeus') {
          specialFeatures.push('zeus');
          // Zeus bonus: 2x multiplier for the line win
          winAmount = winAmount * 2;
        }
        
        if (SYMBOLS[currentSymbol].name === 'trident') {
          specialFeatures.push('trident');
          // Trident handling happens after all wins are calculated
        }
        
        if (SYMBOLS[currentSymbol].name === 'atlantis') {
          specialFeatures.push('atlantis');
          // Atlantis handling happens after all wins are calculated
        }
        
        totalWin += winAmount;
        
        // Add winning positions to the array
        newWinningPositions = [...newWinningPositions, ...positions];
      }
    }
    
    // Check for matching symbols across different rows (V patterns)
    // Middle, Top, Middle
    if (visibleSymbols[0][1] === visibleSymbols[1][0] && 
        visibleSymbols[1][0] === visibleSymbols[2][1]) {
      const symbolValue = SYMBOLS[visibleSymbols[0][1]].value;
      const winAmount = bet * symbolValue * WATER_LEVELS[waterLevel].multiplier;
      totalWin += winAmount;
      
      // Add these positions to winning positions
      newWinningPositions.push([0, 1], [1, 0], [2, 1]);
      
      // Check for special symbols in the V pattern
      const symbolName = SYMBOLS[visibleSymbols[0][1]].name;
      if (symbolName === 'mermaid' || symbolName === 'merman') {
        specialFeatures.push('mermaid');
      } else if (symbolName === 'zeus') {
        specialFeatures.push('zeus');
      } else if (symbolName === 'trident') {
        specialFeatures.push('trident');
      } else if (symbolName === 'atlantis') {
        specialFeatures.push('atlantis');
      }
    }
    
    // Middle, Bottom, Middle
    if (visibleSymbols[0][1] === visibleSymbols[1][2] && 
        visibleSymbols[1][2] === visibleSymbols[2][1]) {
      const symbolValue = SYMBOLS[visibleSymbols[0][1]].value;
      const winAmount = bet * symbolValue * WATER_LEVELS[waterLevel].multiplier;
      totalWin += winAmount;
      
      // Add these positions to winning positions
      newWinningPositions.push([0, 1], [1, 2], [2, 1]);
      
      // Check for special symbols in the V pattern
      const symbolName = SYMBOLS[visibleSymbols[0][1]].name;
      if (symbolName === 'mermaid' || symbolName === 'merman') {
        specialFeatures.push('mermaid');
      } else if (symbolName === 'zeus') {
        specialFeatures.push('zeus');
      } else if (symbolName === 'trident') {
        specialFeatures.push('trident');
      } else if (symbolName === 'atlantis') {
        specialFeatures.push('atlantis');
      }
    }
    
    // Update the winning positions state
    setWinningPositions(newWinningPositions);
    
    // Start the glow animation if there are winning positions
    if (newWinningPositions.length > 0) {
      glowOpacity.setValue(0);
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, {
            toValue: 1,
            duration: GLOW_ANIMATION_DURATION / 2,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.3,
            duration: GLOW_ANIMATION_DURATION / 2,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
        ]),
        { iterations: 3 }
      ).start(() => {
        // Clear winning positions after animation completes
        setTimeout(() => {
          setWinningPositions([]);
        }, 500);
      });
    }
    
    // Update consecutive wins and water level
    if (totalWin > 0) {
      // Apply bonus for zeus if in special features (double total winnings)
      if (specialFeatures.includes('zeus') && !specialFeatures.includes('atlantis')) {
        totalWin = Math.floor(totalWin * 1.5);
        setMessage('ZEUS GRANTS FAVOR! 1.5x TOTAL WIN!');
      }
      
      // Player won
      setWin(totalWin);
      addGlobalCredits(totalWin);
      
      if (lastWin) {
        // Consecutive win
        const newConsecutiveWins = consecutiveWins + 1;
        setConsecutiveWins(newConsecutiveWins);
        
        // Increase water level on 2nd, 4th, and 6th consecutive wins
        if (newConsecutiveWins === 2 || newConsecutiveWins === 4 || newConsecutiveWins === 6) {
          const newWaterLevel = Math.min(waterLevel + 1, WATER_LEVELS.length - 1);
          setWaterLevel(newWaterLevel);
          
          // Play haptic feedback on water level increase
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
          
          if (!specialFeatures.includes('atlantis') && !specialFeatures.includes('trident')) {
            setMessage(`${WATER_LEVELS[newWaterLevel].name}! ${WATER_LEVELS[newWaterLevel].multiplier}x Multiplier!`);
          }
        } else if (!specialFeatures.includes('atlantis') && 
                  !specialFeatures.includes('trident') && 
                  !specialFeatures.includes('zeus') &&
                  !specialFeatures.includes('mermaid')) {
          setMessage('You win!');
        }
      } else {
        // First win after a loss
        setConsecutiveWins(1);
        if (!specialFeatures.includes('atlantis') && 
            !specialFeatures.includes('trident') && 
            !specialFeatures.includes('zeus') &&
            !specialFeatures.includes('mermaid')) {
          setMessage('You win!');
        }
      }
      
      // Handle special feature messages and effects
      if (specialFeatures.includes('atlantis')) {
        // Atlantis symbol activates max water level
        setWaterLevel(3);
        setMessage('ATLANTIS RISES! 5x MULTIPLIER!');
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else if (specialFeatures.includes('trident')) {
        setMessage('POSEIDON\'S TRIDENT! WATER RISES!');
        // Increase water level by 1 when trident appears
        const newWaterLevel = Math.min(waterLevel + 1, WATER_LEVELS.length - 1);
        setWaterLevel(newWaterLevel);
        
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      } else if (specialFeatures.includes('mermaid')) {
        setMessage('MERFOLK MAGIC! 1.5x BONUS!');
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
      
      setLastWin(true);
    } else {
      // Player lost
      setConsecutiveWins(0);
      // Reset water level on loss
      if (waterLevel > 0) {
        setWaterLevel(Math.max(0, waterLevel - 1));
        setMessage('The tide recedes...');
      } else {
        setMessage('Try again!');
      }
      setLastWin(false);
    }
    
    setTimeout(() => setMessage(''), 3000);
  };
  
  // Function to build a reel
  const createReel = (reelIndex) => {
    const items = [];
    const finalSymbols = visibleSymbols[reelIndex];
    
    // Add random symbols for animation
    for (let i = 0; i < REEL_ITEMS - ROWS_PER_REEL; i++) {
      const randomIndex = Math.floor(Math.random() * SYMBOLS.length);
      items.push(SYMBOLS[randomIndex].symbol);
    }
    
    // Add the final visible symbols
    for (let i = 0; i < ROWS_PER_REEL; i++) {
      items.push(SYMBOLS[finalSymbols[i]].symbol);
    }
    
    // Animation translation calculation
    const translateY = reelPositions[reelIndex].interpolate({
      inputRange: [0, 1],
      outputRange: [0, -60 * (REEL_ITEMS - ROWS_PER_REEL)],
    });
    
    return (
      <Animated.View 
        key={`reel-${reelIndex}`} 
        style={[styles.reel, { transform: [{ translateY }] }]}
      >
        {items.map((item, i) => {
          // Determine if this is a winning symbol (visible on the grid)
          const isVisibleItem = i >= (REEL_ITEMS - ROWS_PER_REEL);
          const rowIndex = isVisibleItem ? (i - (REEL_ITEMS - ROWS_PER_REEL)) : -1;
          const isWinningSymbol = isVisibleItem && winningPositions.some(
            ([reel, row]) => reel === reelIndex && row === rowIndex
          );
          
          return (
            <View 
              key={`item-${i}`}
              style={[
                styles.symbolContainer,
                isWinningSymbol && styles.winningSymbolContainer
              ]}
            >
              {isWinningSymbol && (
                <Animated.View 
                  style={[
                    styles.symbolGlow,
                    { opacity: glowOpacity }
                  ]} 
                />
              )}
              <Text style={[
                styles.symbol,
                isWinningSymbol && styles.winningSymbol
              ]}>
                {item}
              </Text>
            </View>
          );
        })}
      </Animated.View>
    );
  };
  
  // Get the water level background styles
  const waterBackgroundStyle = {
    height: waterAnimation.interpolate({
      inputRange: [0, WATER_LEVELS.length - 1],
      outputRange: ['0%', '100%']
    }),
    backgroundColor: waterAnimation.interpolate({
      inputRange: [0, 1, 2, 3],
      outputRange: ['rgba(0, 100, 255, 0.1)', 'rgba(0, 100, 255, 0.3)', 'rgba(0, 100, 255, 0.5)', 'rgba(0, 200, 255, 0.7)']
    })
  };
  
  return (
    <ScrollView>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>Atlantis Rising</ThemedText>
        
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
        
        {/* Water level indicator */}
        <ThemedView style={styles.waterLevelContainer}>
          <ThemedText type="defaultSemiBold">Tide Level:</ThemedText>
          <ThemedText type="subtitle">{WATER_LEVELS[waterLevel].name} ({WATER_LEVELS[waterLevel].multiplier}x)</ThemedText>
        </ThemedView>
        
        {/* Slot machine display with water animation */}
        <ThemedView style={styles.slotMachineWrapper}>
          <Animated.View style={[styles.waterBackground, waterBackgroundStyle]} />
          <ThemedView style={styles.slotMachine}>
            <View style={styles.reelsContainer}>
              {Array(NUM_REELS).fill(0).map((_, index) => (
                <View key={`reel-container-${index}`} style={styles.reelContainer}>
                  {createReel(index)}
                </View>
              ))}
            </View>
          </ThemedView>
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
        
        {/* Information about the rising tide feature */}
        <ThemedView style={styles.featureInfoContainer}>
          <ThemedText type="subtitle" style={styles.featureTitle}>Rising Tides Feature</ThemedText>
          <ThemedText style={styles.featureText}>
            Consecutive wins raise the tide, increasing your win multiplier!
          </ThemedText>
          <View style={styles.waterLevelsInfo}>
            {WATER_LEVELS.map((level, index) => (
              <View key={`level-${index}`} style={styles.waterLevelRow}>
                <View style={[styles.waterLevelIndicator, { backgroundColor: index === 0 ? 'rgba(0, 100, 255, 0.1)' : 
                              index === 1 ? 'rgba(0, 100, 255, 0.3)' : 
                              index === 2 ? 'rgba(0, 100, 255, 0.5)' : 
                              'rgba(0, 200, 255, 0.7)' }]} />
                <ThemedText>{level.name}</ThemedText>
                <ThemedText type="defaultSemiBold">{level.multiplier}x</ThemedText>
              </View>
            ))}
          </View>
        </ThemedView>
        
        {/* Payout table */}
        <ThemedView style={styles.payoutContainer}>
          <ThemedText type="subtitle">Payouts (per line)</ThemedText>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    gap: 15,
  },
  title: {
    marginBottom: 5,
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 5,
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
  waterLevelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(0, 100, 255, 0.1)',
    borderRadius: 5,
    marginBottom: 5,
  },
  slotMachineWrapper: {
    width: '100%',
    maxWidth: 350,
    height: 180,
    borderWidth: 5,
    borderColor: '#1E88E5',
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  waterBackground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
  },
  slotMachine: {
    width: '100%',
    height: '100%',
    padding: 5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    position: 'relative',
  },
  reelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    height: 160,
  },
  reelContainer: {
    width: 60,
    height: 160,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#64B5F6',
  },
  reel: {
    alignItems: 'center',
  },
  symbolContainer: {
    width: 60,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginVertical: 5,
  },
  symbol: {
    fontSize: 40,
    textAlign: 'center',
    zIndex: 2,
  },
  winningSymbolContainer: {
    overflow: 'visible',
  },
  winningSymbol: {
    color: '#00FFFF',
    textShadowColor: '#00FFFF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  symbolGlow: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 200, 255, 0.5)',
    zIndex: 1,
    shadowColor: '#0099ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 10,
  },
  spinButton: {
    backgroundColor: '#00838F',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 30,
    marginVertical: 10,
  },
  spinningButton: {
    backgroundColor: '#78909C',
  },
  disabledButton: {
    backgroundColor: '#78909C',
    opacity: 0.7,
  },
  spinText: {
    color: '#FFFFFF',
  },
  winMessage: {
    marginVertical: 5,
    padding: 10,
    borderRadius: 5,
    backgroundColor: '#00838F',
  },
  winText: {
    color: '#FFFFFF',
  },
  messageContainer: {
    marginVertical: 5,
    padding: 5,
    borderRadius: 5,
  },
  message: {
    textAlign: 'center',
  },
  featureInfoContainer: {
    width: '100%',
    maxWidth: 350,
    padding: 10,
    backgroundColor: 'rgba(0, 100, 255, 0.1)',
    borderRadius: 5,
    marginTop: 10,
  },
  featureTitle: {
    textAlign: 'center',
    marginBottom: 5,
  },
  featureText: {
    textAlign: 'center',
    marginBottom: 10,
  },
  waterLevelsInfo: {
    width: '100%',
  },
  waterLevelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  waterLevelIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 5,
  },
  payoutContainer: {
    marginTop: 10,
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