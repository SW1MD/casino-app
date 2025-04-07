import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Easing, Text, Platform, ScrollView } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCasino } from '../context/CasinoContext';

// Egyptian themed slot symbols with probabilities and payouts
const SYMBOLS = [
  { symbol: '🪙', name: 'coin', value: 1, probability: 0.20 },
  { symbol: '📜', name: 'papyrus', value: 2, probability: 0.18 },
  { symbol: '🔮', name: 'crystal', value: 4, probability: 0.16 },
  { symbol: '🐫', name: 'camel', value: 6, probability: 0.14 },
  { symbol: '🐊', name: 'crocodile', value: 8, probability: 0.10 },
  { symbol: '🐍', name: 'snake', value: 10, probability: 0.08 },
  { symbol: '👁️', name: 'eye', value: 15, probability: 0.06 },
  { symbol: '🏺', name: 'vase', value: 20, probability: 0.04 },
  { symbol: '🔱', name: 'ankh', value: 40, probability: 0.03 },
  { symbol: '🏆', name: 'treasure', value: 70, probability: 0.009 },
  { symbol: '🔺', name: 'pyramid', value: 100, probability: 0.001 },
];

// Winning patterns (paylines) for a 4x5 grid
const PAYLINES = [
  // Horizontal rows (4)
  [0, 0, 0, 0, 0], // Row 0 (top)
  [1, 1, 1, 1, 1], // Row 1
  [2, 2, 2, 2, 2], // Row 2 
  [3, 3, 3, 3, 3], // Row 3 (bottom)
  
  // Vertical columns (5)
  [[0,1,2,3], null, null, null, null], // Column 0
  [null, [0,1,2,3], null, null, null], // Column 1
  [null, null, [0,1,2,3], null, null], // Column 2
  [null, null, null, [0,1,2,3], null], // Column 3
  [null, null, null, null, [0,1,2,3]], // Column 4
  
  // Diagonals
  [0, 1, 2, 3, null], // Diagonal from top-left
  [3, 2, 1, 0, null], // Diagonal from bottom-left
  [null, 0, 1, 2, 3], // Diagonal from top-center to bottom-right
  [null, 3, 2, 1, 0], // Diagonal from bottom-center to top-right
  
  // V and W shapes
  [0, 1, 3, 1, 0], // V shape
  [3, 2, 0, 2, 3], // Inverted V shape
  [0, 3, 0, 3, 0], // W shape
  [3, 0, 3, 0, 3], // M shape
  
  // Zigzag patterns
  [0, 1, 0, 1, 0], // Zigzag top
  [3, 2, 3, 2, 3], // Zigzag bottom
];

const NUM_REELS = 5;
const ROWS_PER_REEL = 4; // 4 visible rows for more complex patterns
const REEL_ITEMS = 15; // Number of items in each reel (for animation)

export default function EgyptianSlotMachine() {
  // Use global casino context instead of local state
  const { 
    credits, 
    defaultBet,
    updateCredits, 
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
  const [activePaylines, setActivePaylines] = useState([0, 1, 2, 3]); // Default to 4 paylines (horizontal rows)
  const [selectedPaylines, setSelectedPaylines] = useState(4); // Number of active paylines
  const [winningLines, setWinningLines] = useState([]); // Track which paylines won
  
  // Add machine ID for tracking
  const MACHINE_ID = 'egyptianSlots';
  
  // Set the last machine when component mounts
  useEffect(() => {
    setLastMachine(MACHINE_ID);
  }, []);
  
  // Animation values for each reel
  const reelPositions = useRef(Array(NUM_REELS).fill(0).map(() => new Animated.Value(0))).current;
  
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

  // Change the number of active paylines
  const changePaylines = (number) => {
    setSelectedPaylines(number);
    
    let newActivePaylines = [];
    
    if (number === 4) {
      // Just the horizontal rows
      newActivePaylines = [0, 1, 2, 3];
    } else if (number === 10) {
      // Horizontal rows + vertical columns
      newActivePaylines = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    } else if (number === 15) {
      // Horizontal rows + vertical columns + some diagonals
      newActivePaylines = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
    } else {
      // All paylines
      newActivePaylines = Array.from({ length: PAYLINES.length }, (_, i) => i);
    }
    
    setActivePaylines(newActivePaylines);
  };

  // Spin the slot machine
  const spin = () => {
    if (spinning) return;
    
    const totalBet = bet * selectedPaylines;
    if (credits < totalBet) {
      setMessage('Not enough credits!');
      setTimeout(() => setMessage(''), 2000);
      return;
    }
    
    // Only use haptics on native platforms
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    subtractCredits(totalBet);
    setSpinning(true);
    setWin(0);
    setMessage('');
    setWinningLines([]);
    
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
    let newWinningLines = [];
    
    // Check each active payline
    activePaylines.forEach((paylineIndex) => {
      const payline = PAYLINES[paylineIndex];
      
      // Array to store symbols in this payline
      const lineSymbols = [];
      
      // Get symbols on this payline (handle different payline formats)
      for (let i = 0; i < NUM_REELS; i++) {
        const rowIndexOrArray = payline[i];
        
        // Skip if null (for partial paylines)
        if (rowIndexOrArray === null) continue;
        
        // Handle arrays (for vertical paylines)
        if (Array.isArray(rowIndexOrArray)) {
          // For vertical paylines, we need all symbols in the column
          // We'll consider this later when calculating matches
          const colSymbols = rowIndexOrArray.map(row => symbolsMatrix[i][row]);
          // For simplicity, just take the first symbol for the line
          lineSymbols.push(colSymbols[0]);
        } else {
          // Standard horizontal paylines and diagonals
          if (i < symbolsMatrix.length && rowIndexOrArray < symbolsMatrix[i].length) {
            lineSymbols.push(symbolsMatrix[i][rowIndexOrArray]);
          }
        }
      }
      
      // Count consecutive matching symbols from the left
      let symbolCount = 1;
      let currentSymbol = lineSymbols[0];
      
      for (let i = 1; i < lineSymbols.length; i++) {
        if (lineSymbols[i] === currentSymbol) {
          symbolCount++;
        } else {
          break;
        }
      }
      
      // Need at least 3 matching symbols to win
      if (symbolCount >= 3) {
        const symbolValue = SYMBOLS[currentSymbol].value;
        // Multiplier based on count of consecutive matching symbols
        const multiplier = symbolCount === 3 ? 1 : symbolCount === 4 ? 5 : 15;
        const winAmount = bet * symbolValue * multiplier;
        
        totalWin += winAmount;
        newWinningLines.push(paylineIndex);
      }
      
      // Special case: handle vertical matches for vertical paylines
      if (Array.isArray(payline[0]) || Array.isArray(payline[1]) || Array.isArray(payline[2]) || 
          Array.isArray(payline[3]) || Array.isArray(payline[4])) {
        
        // For each column with a vertical line
        for (let i = 0; i < NUM_REELS; i++) {
          const rowIndices = payline[i];
          if (!rowIndices || !Array.isArray(rowIndices)) continue;
          
          // Get all symbols in this column that are part of this payline
          const colSymbols = rowIndices.map(row => symbolsMatrix[i][row]);
          
          // Count consecutive matching symbols
          const symbolCounts = {};
          colSymbols.forEach(symbol => {
            symbolCounts[symbol] = (symbolCounts[symbol] || 0) + 1;
          });
          
          // Check for 3 or 4 of the same symbol (full column)
          Object.entries(symbolCounts).forEach(([symbol, count]) => {
            if (count >= 3) {
              const symbolValue = SYMBOLS[parseInt(symbol)].value;
              const multiplier = count === 3 ? 2 : 8; // Higher multiplier for vertical matches
              const winAmount = bet * symbolValue * multiplier;
              
              totalWin += winAmount;
              // Only add the payline once if it hasn't been added yet
              if (!newWinningLines.includes(paylineIndex)) {
                newWinningLines.push(paylineIndex);
              }
            }
          });
        }
      }
    });
    
    if (totalWin > 0) {
      setWin(totalWin);
      addGlobalCredits(totalWin);
      setWinningLines(newWinningLines);
      
      // Set appropriate message based on win amount
      if (totalWin > bet * 100) {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setMessage('PHARAOH\'S FORTUNE! 🔺✨');
      } else if (totalWin > bet * 50) {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setMessage('GOLDEN TREASURE! 🏆');
      } else if (totalWin > bet * 20) {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setMessage('ANCIENT RICHES! 🔱');
      } else {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setMessage('You win!');
      }
    } else {
      setMessage('Try again!');
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
        {items.map((item, i) => (
          <Text key={`item-${i}`} style={styles.symbol}>
            {item}
          </Text>
        ))}
      </Animated.View>
    );
  };
  
  return (
    <ScrollView>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>Egyptian Treasures</ThemedText>
        
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
        
        {/* Paylines selector */}
        <ThemedView style={styles.paylinesContainer}>
          <ThemedText type="defaultSemiBold">Paylines: {selectedPaylines}</ThemedText>
          <View style={styles.paylinesSlider}>
            {[4, 10, 15, 20].map(number => (
              <TouchableOpacity 
                key={`payline-${number}`}
                style={[
                  styles.paylineButton,
                  selectedPaylines === number && styles.paylineButtonActive
                ]}
                onPress={() => changePaylines(number)}
                disabled={spinning}
              >
                <ThemedText type="smallSemiBold">{number}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
          <ThemedText type="small">Total bet: {bet * selectedPaylines}</ThemedText>
        </ThemedView>
        
        {/* Slot machine display */}
        <ThemedView style={styles.slotMachine}>
          <View style={styles.reelsContainer}>
            {Array(NUM_REELS).fill(0).map((_, index) => (
              <View key={`reel-container-${index}`} style={styles.reelContainer}>
                {createReel(index)}
              </View>
            ))}
          </View>
        </ThemedView>
        
        {/* Spin button */}
        <TouchableOpacity 
          style={[
            styles.spinButton, 
            spinning && styles.spinningButton,
            credits < (bet * selectedPaylines) && styles.disabledButton
          ]} 
          onPress={spin}
          disabled={spinning || credits < (bet * selectedPaylines)}
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
          <ThemedText type="subtitle">Payouts (per line bet)</ThemedText>
          <View style={styles.payoutTable}>
            {SYMBOLS.map((item, index) => (
              <View key={`payout-${index}`} style={styles.payoutRow}>
                <Text style={styles.payoutSymbol}>{item.symbol}</Text>
                <View>
                  <ThemedText type="small">3x: {item.value}x</ThemedText>
                  <ThemedText type="small">4x: {item.value * 5}x</ThemedText>
                  <ThemedText type="small">5x: {item.value * 15}x</ThemedText>
                </View>
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
    padding: 16,
    alignItems: 'center',
  },
  title: {
    marginBottom: 10,
    color: '#FFD700', // Gold color for Egyptian theme
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
  paylinesContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
  },
  paylinesSlider: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
    marginVertical: 10,
  },
  paylineButton: {
    backgroundColor: '#3A5875',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3A5875',
  },
  paylineButtonActive: {
    borderColor: '#FFD700', // Gold border for active
    backgroundColor: '#8B4513', // Darker brown for active
  },
  slotMachine: {
    width: '100%',
    maxWidth: 350,
    height: 260, // Taller to fit 4 rows
    borderWidth: 5,
    borderColor: '#FFD700', // Gold border for Egyptian theme
    borderRadius: 10,
    padding: 5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#8B4513', // Dark brown for Egyptian theme
    position: 'relative',
    marginVertical: 10,
  },
  reelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    height: 240,
  },
  reelContainer: {
    width: 60,
    height: 240, // Taller to fit 4 symbols
    overflow: 'hidden',
    backgroundColor: '#D2B48C', // Tan color for papyrus/sand
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#CD853F', // Darker border
  },
  reel: {
    alignItems: 'center',
  },
  symbol: {
    fontSize: 40,
    height: 60,
    textAlign: 'center',
    marginVertical: 0,
    paddingVertical: 8,
  },
  spinButton: {
    backgroundColor: '#C83200', // Darker red for Egyptian theme
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 30,
    marginVertical: 10,
    borderWidth: 2,
    borderColor: '#FFD700', // Gold border
  },
  spinningButton: {
    backgroundColor: '#555',
  },
  disabledButton: {
    backgroundColor: '#888',
    opacity: 0.7,
  },
  spinText: {
    color: '#FFF',
  },
  winMessage: {
    backgroundColor: '#FFD700',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginTop: 10,
  },
  winText: {
    color: '#8B4513',
    fontWeight: 'bold',
  },
  messageContainer: {
    marginTop: 10,
    padding: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  message: {
    textAlign: 'center',
  },
  payoutContainer: {
    alignItems: 'center',
    marginTop: 10,
    padding: 10,
    width: '100%',
    maxWidth: 350,
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 10,
  },
  payoutTable: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  payoutRow: {
    width: '30%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 5,
  },
  payoutSymbol: {
    fontSize: 25,
    marginRight: 5,
  },
}); 