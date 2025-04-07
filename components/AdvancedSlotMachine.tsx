import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Easing, Text, Platform, ScrollView } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCasino } from '../context/CasinoContext';

// More slot symbols with probabilities and payouts
const SYMBOLS = [
  { symbol: '🍒', name: 'cherry', value: 1, probability: 0.20 },
  { symbol: '🍋', name: 'lemon', value: 2, probability: 0.18 },
  { symbol: '🍊', name: 'orange', value: 3, probability: 0.16 },
  { symbol: '🍇', name: 'grapes', value: 5, probability: 0.14 },
  { symbol: '🍉', name: 'watermelon', value: 8, probability: 0.10 },
  { symbol: '🔔', name: 'bell', value: 10, probability: 0.08 },
  { symbol: '⭐', name: 'star', value: 15, probability: 0.06 },
  { symbol: '💎', name: 'diamond', value: 25, probability: 0.04 },
  { symbol: '7️⃣', name: 'seven', value: 50, probability: 0.03 },
  { symbol: '🎰', name: 'jackpot', value: 100, probability: 0.01 },
];

// Winning patterns (paylines) - rows and diagonals
const PAYLINES = [
  // Row 0 (top)
  [0, 0, 0, 0, 0],
  // Row 1 (middle)
  [1, 1, 1, 1, 1],
  // Row 2 (bottom)
  [2, 2, 2, 2, 2],
  // Diagonal from top left to bottom right
  [0, 0, 1, 2, 2],
  // Diagonal from bottom left to top right
  [2, 2, 1, 0, 0],
  // V shape
  [0, 1, 2, 1, 0],
  // Inverted V shape
  [2, 1, 0, 1, 2],
  // W shape
  [0, 2, 0, 2, 0],
  // M shape
  [2, 0, 2, 0, 2],
];

const NUM_REELS = 5;
const SYMBOLS_PER_REEL = 3; // Visible symbols per reel
const REEL_ITEMS = 20; // Number of items in each reel (for animation)

export default function AdvancedSlotMachine() {
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
      Array(SYMBOLS_PER_REEL).fill(0).map(() => Math.floor(Math.random() * SYMBOLS.length))
    )
  );
  const [win, setWin] = useState(0);
  const [message, setMessage] = useState('');
  const [activePaylines, setActivePaylines] = useState([0, 1, 2]); // Default to 3 paylines
  const [selectedPaylines, setSelectedPaylines] = useState(3); // Number of active paylines
  
  // Add machine ID for tracking
  const MACHINE_ID = 'superSlots';
  
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
    // Create an array of indices from 0 to number-1
    setActivePaylines(Array.from({ length: number }, (_, i) => i));
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
    
    // Generate random results for each reel
    const newVisibleSymbols = Array(NUM_REELS).fill(0).map(() => 
      Array(SYMBOLS_PER_REEL).fill(0).map(() => {
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
    
    // Set the visible symbols immediately so the reels will use them while animating
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
    let winningPaylines = [];
    
    // Check each active payline
    activePaylines.forEach((paylineIndex) => {
      // Get the actual payline pattern using the index
      const payline = PAYLINES[paylineIndex];
      
      // Get symbols on this payline
      const paylineSymbols = payline.map((row, col) => 
        col < symbolsMatrix.length ? symbolsMatrix[col][row] : 0
      );
      
      // Check for combinations (3, 4, or 5 of a kind)
      const symbolCounts = {};
      paylineSymbols.forEach(symbol => {
        symbolCounts[symbol] = (symbolCounts[symbol] || 0) + 1;
      });
      
      // Find the symbol with the most consecutive matches from the left
      let bestSymbol = -1;
      let bestCount = 0;
      
      Object.entries(symbolCounts).forEach(([symbol, count]) => {
        // Check if they are consecutive from the left
        if (count >= 3) {
          let consecutiveCount = 0;
          for (let i = 0; i < paylineSymbols.length; i++) {
            if (paylineSymbols[i] === parseInt(symbol)) {
              consecutiveCount++;
            } else {
              break;
            }
          }
          
          if (consecutiveCount >= 3 && consecutiveCount > bestCount) {
            bestSymbol = parseInt(symbol);
            bestCount = consecutiveCount;
          }
        }
      });
      
      if (bestCount >= 3) {
        const symbolValue = SYMBOLS[bestSymbol].value;
        // Multiplier based on how many consecutive symbols (3, 4, or 5)
        const multiplier = bestCount === 3 ? 1 : bestCount === 4 ? 5 : 10;
        const winAmount = bet * symbolValue * multiplier;
        
        totalWin += winAmount;
        winningPaylines.push(paylineIndex);
      }
    });
    
    if (totalWin > 0) {
      setWin(totalWin);
      addGlobalCredits(totalWin);
      
      if (totalWin > bet * 50) {
        // Only use haptics on native platforms
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setMessage('MEGA WIN! 🎉');
      } else if (totalWin > bet * 20) {
        // Only use haptics on native platforms
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setMessage('BIG WIN! 🎉');
      } else {
        // Only use haptics on native platforms
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setMessage('You win!');
      }
    } else {
      setMessage('Try again!');
    }
    
    setTimeout(() => setMessage(''), 2000);
  };
  
  // Function to build a reel
  const createReel = (reelIndex) => {
    const items = [];
    const finalSymbols = visibleSymbols[reelIndex];
    
    for (let i = 0; i < REEL_ITEMS - SYMBOLS_PER_REEL; i++) {
      // Random symbols for the animation
      const randomIndex = Math.floor(Math.random() * SYMBOLS.length);
      items.push(SYMBOLS[randomIndex].symbol);
    }
    
    // Add the final visible symbols at the end
    for (let i = 0; i < SYMBOLS_PER_REEL; i++) {
      items.push(SYMBOLS[finalSymbols[i]].symbol);
    }
    
    // Animation translation calculation
    const translateY = reelPositions[reelIndex].interpolate({
      inputRange: [0, 1],
      outputRange: [0, -60 * (REEL_ITEMS - SYMBOLS_PER_REEL)],
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
        <ThemedText type="title" style={styles.title}>Super Slots 5000</ThemedText>
        
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
            {[3, 5, 9].map(number => (
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
          
          {/* Win line for middle row */}
          <View style={styles.winLine} />
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
                  <ThemedText type="small">5x: {item.value * 10}x</ThemedText>
                </View>
              </View>
            ))}
          </View>
        </ThemedView>
        
        {/* Paylines diagram */}
        <ThemedView style={styles.paylinesInfoContainer}>
          <ThemedText type="subtitle">Paylines</ThemedText>
          <View style={styles.paylinesInfo}>
            {PAYLINES.slice(0, 9).map((payline, index) => (
              <View key={`payline-info-${index}`} style={[
                styles.paylineInfo,
                selectedPaylines <= index && styles.paylineInfoInactive
              ]}>
                <ThemedText type="small">{index + 1}</ThemedText>
                <View style={styles.paylinePreview}>
                  {payline.map((row, col) => (
                    <View key={`payline-preview-${index}-${col}`} style={styles.paylinePreviewCell}>
                      <View style={[
                        styles.paylinePreviewDot,
                        row === 0 && styles.paylinePreviewTop,
                        row === 1 && styles.paylinePreviewMiddle,
                        row === 2 && styles.paylinePreviewBottom
                      ]} />
                    </View>
                  ))}
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
    padding: 20,
    alignItems: 'center',
    gap: 15,
  },
  title: {
    marginBottom: 10,
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
  paylinesContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 5,
  },
  paylinesSlider: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '80%',
    marginVertical: 10,
  },
  paylineButton: {
    backgroundColor: '#7F8C8D',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  paylineButtonActive: {
    backgroundColor: '#E67E22',
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
    width: 60,
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
    marginTop: 10,
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
    width: '45%',
    marginBottom: 10,
    gap: 10,
  },
  payoutSymbol: {
    fontSize: 30,
  },
  paylinesInfoContainer: {
    marginTop: 15,
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
  },
  paylinesInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 10,
  },
  paylineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '45%',
    marginBottom: 10,
    gap: 10,
  },
  paylineInfoInactive: {
    opacity: 0.5,
  },
  paylinePreview: {
    flexDirection: 'row',
    height: 30,
    flex: 1,
  },
  paylinePreviewCell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paylinePreviewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E74C3C',
  },
  paylinePreviewTop: {
    marginBottom: 16,
  },
  paylinePreviewMiddle: {
    marginTop: 0,
  },
  paylinePreviewBottom: {
    marginTop: 16,
  },
}); 