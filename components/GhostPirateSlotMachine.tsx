import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Easing, Text, Platform, ScrollView } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCasino } from '../context/CasinoContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Ghost Pirate Treasure themed symbols with probabilities and payouts
const SYMBOLS = [
  { symbol: '👻', name: 'ghost', value: 2, probability: 0.20 },
  { symbol: '🏴‍☠️', name: 'pirate-flag', value: 3, probability: 0.18 },
  { symbol: '🗡️', name: 'dagger', value: 5, probability: 0.16 },
  { symbol: '🔱', name: 'trident', value: 8, probability: 0.12 },
  { symbol: '⚓', name: 'anchor', value: 10, probability: 0.10 },
  { symbol: '🧭', name: 'compass', value: 15, probability: 0.09 },
  { symbol: '🦜', name: 'parrot', value: 20, probability: 0.07 },
  { symbol: '💎', name: 'diamond', value: 30, probability: 0.04 },
  { symbol: '👑', name: 'crown', value: 50, probability: 0.03 },
  { symbol: '💰', name: 'treasure', value: 100, probability: 0.01 },
];

// Winning patterns (paylines) - rows, diagonals, and zigzags
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
  // Zigzag top-middle-top-middle-top
  [0, 1, 0, 1, 0],
  // Zigzag bottom-middle-bottom-middle-bottom
  [2, 1, 2, 1, 2],
  // V shape
  [0, 1, 2, 1, 0],
  // Inverted V shape
  [2, 1, 0, 1, 2],
];

// Names for each payline
const PAYLINE_NAMES = [
  "Top Row",
  "Middle Row",
  "Bottom Row",
  "Top-to-Bottom Diagonal",
  "Bottom-to-Top Diagonal",
  "Top Zigzag",
  "Bottom Zigzag",
  "V Shape",
  "Inverted V"
];

const NUM_REELS = 5;
const SYMBOLS_PER_REEL = 3; // Visible symbols per reel
const REEL_ITEMS = 20; // Number of items in each reel (for animation)
const MACHINE_ID = 'ghostPirateSlots';
const GLOW_ANIMATION_DURATION = 1500;

export default function GhostPirateSlotMachine() {
  // Global casino state
  const { 
    credits, 
    defaultBet, 
    updateCredits, 
    addCredits: addGlobalCredits,
    subtractCredits,
    setLastMachine
  } = useCasino();

  // Local state
  const [bet, setBet] = useState(defaultBet);
  const [spinning, setSpinning] = useState(false);
  const [visibleSymbols, setVisibleSymbols] = useState(
    Array(NUM_REELS).fill(0).map(() => 
      Array(SYMBOLS_PER_REEL).fill(0).map(() => Math.floor(Math.random() * SYMBOLS.length))
    )
  );
  const [win, setWin] = useState(0);
  const [message, setMessage] = useState('');
  const [activePaylines, setActivePaylines] = useState([0, 1, 2]); // Default to first 3 paylines
  const [extraSpinAvailable, setExtraSpinAvailable] = useState(false);
  const [respunColumns, setRespunColumns] = useState(Array(NUM_REELS).fill(false));
  const [hasSpunOnce, setHasSpunOnce] = useState(false);
  // Add state to track winning positions and glow animation
  const [winningPositions, setWinningPositions] = useState([]);
  const [glowOpacity] = useState(new Animated.Value(0));
  
  // Animation values for each reel
  const reelPositions = useRef(Array(NUM_REELS).fill(0).map(() => new Animated.Value(0))).current;
  const singleReelPosition = useRef(new Animated.Value(0)).current;

  // Set the last machine when component mounts
  useEffect(() => {
    setLastMachine(MACHINE_ID);
  }, []);
  
  // Track credit changes for debugging
  useEffect(() => {
    console.log(`Credit update in GhostPirateSlotMachine: ${credits}`);
  }, [credits]);
  
  // Add specific debug messages before and after credit operations
  const logBeforeBet = (amount) => {
    console.log(`BEFORE BET: Current credits=${credits}, bet amount=${amount}`);
  };
  
  const logAfterBet = (amount) => {
    console.log(`AFTER BET: Current credits=${credits}, bet amount=${amount}`);
    // Force a rerender of the component with a timeout to ensure UI updates
    setTimeout(() => {
      console.log("Credit check after timeout:", credits);
    }, 500);
  };
  
  // Reset extra spin availability after main spin
  useEffect(() => {
    if (!spinning && hasSpunOnce) {
      setExtraSpinAvailable(true);
    }
  }, [spinning, hasSpunOnce]);
  
  // Toggle an individual payline
  const togglePayline = (paylineIndex) => {
    if (spinning) return;
    
    setActivePaylines(prev => {
      // If payline is already active, remove it
      if (prev.includes(paylineIndex)) {
        return prev.filter(index => index !== paylineIndex);
      } 
      // Otherwise add it
      else {
        return [...prev, paylineIndex];
      }
    });
  };
  
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

  // Add debug helper for credits
  useEffect(() => {
    console.log(`Current credit balance in GhostPirateSlot: ${credits}`);
  }, [credits]);

  // Add this after addCredits function
  // Force refresh of credits from storage when component mounts or remounts
  useEffect(() => {
    const loadStoredCredits = async () => {
      try {
        // React Native's AsyncStorage
        const storedCredits = await AsyncStorage.getItem('@casino_credits');
        console.log("Retrieved credits from storage:", storedCredits);
        
        if (storedCredits !== null) {
          const parsedCredits = Number(storedCredits);
          // Only update if the credits are different to avoid loops
          if (parsedCredits !== credits) {
            console.log("Updating credits from storage:", parsedCredits);
            updateCredits(parsedCredits);
          }
        }
      } catch (error) {
        console.error("Error loading credits in slot machine:", error);
      }
    };
    
    loadStoredCredits();
  }, []);

  // Spin the slot machine
  const spin = () => {
    if (spinning) return;
    
    if (activePaylines.length === 0) {
      setMessage('Select at least one payline!');
      setTimeout(() => setMessage(''), 2000);
      return;
    }
    
    const totalBet = bet * activePaylines.length;
    if (credits < totalBet) {
      setMessage('Not enough credits!');
      setTimeout(() => setMessage(''), 2000);
      return;
    }
    
    // Only use haptics on native platforms
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    // Log before bet
    logBeforeBet(totalBet);
    
    // Subtract credits
    subtractCredits(totalBet);
    
    // Log after bet
    logAfterBet(totalBet);
    
    setSpinning(true);
    setWin(0);
    setMessage('');
    setExtraSpinAvailable(false); // Reset extra spin for new round
    setRespunColumns(Array(NUM_REELS).fill(false)); // Reset respun columns tracker
    
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
      setHasSpunOnce(true);
      
      // Calculate winnings
      calculateWinnings(newVisibleSymbols);
    });
  };
  
  // Spin a single column
  const spinSingleColumn = (columnIndex) => {
    if (spinning || !extraSpinAvailable || respunColumns[columnIndex]) return;
    
    // Extra spin costs half the total bet
    const extraSpinCost = Math.ceil(bet * activePaylines.length / 2);
    
    if (credits < extraSpinCost) {
      setMessage('Not enough credits for extra spin!');
      setTimeout(() => setMessage(''), 2000);
      return;
    }
    
    // Only use haptics on native platforms
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    subtractCredits(extraSpinCost);
    setSpinning(true);
    setWin(0);
    setMessage('');
    
    // Mark this column as respun
    const newRespunColumns = [...respunColumns];
    newRespunColumns[columnIndex] = true;
    setRespunColumns(newRespunColumns);
    
    // Check if all columns have been respun
    const allRespun = newRespunColumns.every(respun => respun);
    if (allRespun) {
      setExtraSpinAvailable(false);
    }
    
    // Copy current symbols
    const newVisibleSymbols = JSON.parse(JSON.stringify(visibleSymbols));
    
    // Generate new random symbols for the selected column
    for (let row = 0; row < SYMBOLS_PER_REEL; row++) {
      const rand = Math.random();
      let cumulativeProbability = 0;
      
      for (let i = 0; i < SYMBOLS.length; i++) {
        cumulativeProbability += SYMBOLS[i].probability;
        if (rand < cumulativeProbability) {
          newVisibleSymbols[columnIndex][row] = i;
          break;
        }
      }
    }
    
    // Set the visible symbols
    setVisibleSymbols(newVisibleSymbols);
    
    // Reset and start animation for the single reel
    const reelPosition = reelPositions[columnIndex];
    reelPosition.setValue(0);
    
    Animated.timing(reelPosition, {
      toValue: 1,
      duration: 1500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setSpinning(false);
      
      // Calculate winnings
      calculateWinnings(newVisibleSymbols);
    });
  };
  
  // Calculate winnings based on results
  const calculateWinnings = (symbolsMatrix) => {
    let totalWin = 0;
    let winningPaylines = [];
    // Array to store winning positions
    let newWinningPositions = [];
    
    // Check each active payline
    activePaylines.forEach((paylineIndex) => {
      // Get the actual payline pattern using the index
      const payline = PAYLINES[paylineIndex];
      
      // Check each possible starting position for wins (can start at positions 0, 1, or 2)
      for (let startPos = 0; startPos <= 2; startPos++) {
        // Skip if we don't have enough symbols left for a win (need at least 3)
        if (startPos > NUM_REELS - 3) continue;
        
        // Get the symbol at the starting position
        const startRow = payline[startPos];
        const startSymbol = symbolsMatrix[startPos][startRow];
        
        let count = 1;
        let positions = [[startPos, startRow]];
        
        // Check subsequent positions for matches
        for (let i = startPos + 1; i < NUM_REELS; i++) {
          const row = payline[i];
          const symbol = symbolsMatrix[i][row];
          
          if (symbol === startSymbol) {
            count++;
            positions.push([i, row]);
          } else {
            break; // Stop at first non-match
          }
        }
        
        // If we have at least 3 consecutive matches
        if (count >= 3) {
          const symbolValue = SYMBOLS[startSymbol].value;
          const multiplier = count === 3 ? 1 : count === 4 ? 5 : 10;
          const winAmount = bet * symbolValue * multiplier;
          
          totalWin += winAmount;
          winningPaylines.push(paylineIndex);
          
          // Add all the winning positions to our tracking array
          newWinningPositions = [...newWinningPositions, ...positions];
          
          // We found a win on this payline, no need to check other starting positions
          break;
        }
      }
    });
    
    // Log the winning positions for debugging
    console.log("Winning positions:", JSON.stringify(newWinningPositions));
    console.log("Total win:", totalWin, "Credits");
    
    // Update winning positions state
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
    
    if (totalWin > 0) {
      // Log before adding winnings
      console.log(`BEFORE WIN: Current credits=${credits}, win amount=${totalWin}`);
      
      // Set win state
      setWin(totalWin);
      
      // Add credits to global state
      addGlobalCredits(totalWin);
      
      // Log after adding winnings
      console.log(`AFTER WIN: Current credits=${credits}, win amount=${totalWin}`);
      
      // Force a UI update check
      setTimeout(() => {
        console.log(`WIN CREDIT CHECK: Current credits=${credits}`);
      }, 500);
      
      if (totalWin > bet * 50) {
        // Only use haptics on native platforms
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setMessage('GHOST CAPTAIN\'S TREASURE! 🎉');
      } else if (totalWin > bet * 20) {
        // Only use haptics on native platforms
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setMessage('PHANTOM HAUL! 🎉');
      } else {
        // Only use haptics on native platforms
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setMessage('You found treasure!');
      }
    } else {
      setMessage('Walk the plank! Try again!');
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
        {items.map((item, i) => {
          // Determine if this is a winning symbol (visible on the grid)
          const isVisibleItem = i >= (REEL_ITEMS - SYMBOLS_PER_REEL);
          
          // For visible items, calculate row index (0, 1, or 2)
          const rowIndex = isVisibleItem ? (i - (REEL_ITEMS - SYMBOLS_PER_REEL)) : -1;
          
          // Check if this position is in the winning positions array
          const isWinningSymbol = isVisibleItem && winningPositions.some(
            position => position[0] === reelIndex && position[1] === rowIndex
          );
          
          // Log winning symbols for debugging (uncomment if needed)
          // if (isVisibleItem && isWinningSymbol) {
          //   console.log(`Winning symbol at reel ${reelIndex}, row ${rowIndex}`);
          // }
          
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
  
  // Calculate how many columns can still be respun
  const remainingRespins = extraSpinAvailable ? 
    respunColumns.filter(respun => !respun).length : 0;
  
  return (
    <ScrollView>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>Phantom Pirate's Fortune</ThemedText>
        
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
            <ThemedText type="defaultSemiBold">Bet per line:</ThemedText>
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
        
        {/* Individual Paylines selector */}
        <ThemedView style={styles.paylinesContainer}>
          <ThemedText type="defaultSemiBold">Active Paylines: {activePaylines.length}</ThemedText>
          <ThemedText type="small">Total bet: {bet * activePaylines.length}</ThemedText>
          
          <View style={styles.paylineButtonsContainer}>
            {PAYLINES.map((_, index) => (
              <TouchableOpacity 
                key={`payline-${index}`}
                style={[
                  styles.paylineButton,
                  activePaylines.includes(index) && styles.paylineButtonActive
                ]}
                onPress={() => togglePayline(index)}
                disabled={spinning}
              >
                <ThemedText type="smallSemiBold" style={styles.paylineNumber}>{index + 1}</ThemedText>
                <ThemedText type="small" style={styles.paylineName} numberOfLines={1}>
                  {PAYLINE_NAMES[index]}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </ThemedView>
        
        {/* Slot machine display */}
        <ThemedView style={styles.slotMachine}>
          <View style={styles.reelsContainer}>
            {Array(NUM_REELS).fill(0).map((_, index) => (
              <View key={`reel-container-${index}`} style={styles.reelContainer}>
                {createReel(index)}
                
                {/* Extra Spin Column Button */}
                {!spinning && extraSpinAvailable && !respunColumns[index] && (
                  <TouchableOpacity
                    style={styles.extraSpinColumnButton}
                    onPress={() => spinSingleColumn(index)}
                  >
                    <MaterialCommunityIcons name="reload" size={20} color="#FFF" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
          
          {/* Win lines for visualization */}
          {/* Top row */}
          <View style={[styles.winLine, { top: 28 }]} />
          {/* Middle row */}
          <View style={[styles.winLine, { top: 78 }]} />
          {/* Bottom row */}
          <View style={[styles.winLine, { top: 128 }]} />
        </ThemedView>
        
        {/* Extra Spin Info */}
        {hasSpunOnce && (
          <ThemedView style={styles.extraSpinInfo}>
            <ThemedText type="small">
              {extraSpinAvailable ? 
                `Extra Column Spins Available: ${remainingRespins}/${NUM_REELS} (Cost: ${Math.ceil(bet * activePaylines.length / 2)} credits each)` : 
                'All extra spins used for this round'}
            </ThemedText>
          </ThemedView>
        )}
        
        {/* Spin button */}
        <TouchableOpacity 
          style={[
            styles.spinButton, 
            spinning && styles.spinningButton,
            (credits < (bet * activePaylines.length) || activePaylines.length === 0) && styles.disabledButton
          ]} 
          onPress={spin}
          disabled={spinning || credits < (bet * activePaylines.length) || activePaylines.length === 0}
        >
          <ThemedText type="subtitle" style={styles.spinText}>
            {spinning ? 'SPINNING...' : 'SPIN'}
          </ThemedText>
        </TouchableOpacity>
        
        {/* Win message */}
        {win > 0 && (
          <ThemedView style={styles.winMessage}>
            <ThemedText type="subtitle" style={styles.winText}>
              YOU PLUNDERED {win} CREDITS!
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
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    gap: 10,
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
  paylinesContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
  },
  paylineButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: 10,
    marginBottom: 5,
  },
  paylineButton: {
    width: '31%',
    height: 50,
    backgroundColor: '#666',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 5,
  },
  paylineButtonActive: {
    backgroundColor: '#E74C3C',
  },
  paylineNumber: {
    fontSize: 16,
  },
  paylineName: {
    fontSize: 10,
    textAlign: 'center',
  },
  slotMachine: {
    width: '100%',
    maxWidth: 350,
    height: 180,
    borderWidth: 5,
    borderColor: '#8E44AD', // Purple for ghost theme
    borderRadius: 10,
    padding: 5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2C3E50', // Dark blue for pirate theme
    position: 'relative',
  },
  reelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    height: 150,
  },
  reelContainer: {
    width: 60,
    height: 150,
    overflow: 'hidden',
    backgroundColor: '#1E2A38', // Darker blue for contrast
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#666',
    position: 'relative',
  },
  extraSpinColumnButton: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#E67E22', // Orange for pirate gold
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  extraSpinInfo: {
    marginTop: 5,
    marginBottom: 5,
    alignItems: 'center',
    padding: 5,
    backgroundColor: 'rgba(230, 126, 34, 0.2)',
    borderRadius: 5,
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
    color: '#FFD700', // Gold color for winning symbols
    textShadowColor: '#ff0000', // Red glow
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  symbolGlow: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 0, 0, 0.4)', // Semi-transparent red
    zIndex: 1,
    shadowColor: '#ff3333', // Red accent
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 10,
  },
  winLine: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: 'rgba(255, 0, 0, 0.5)',
    zIndex: 10,
  },
  spinButton: {
    backgroundColor: '#8E44AD', // Purple for ghost theme
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 30,
    marginTop: 10,
  },
  spinningButton: {
    backgroundColor: '#555',
  },
  disabledButton: {
    backgroundColor: '#555',
    opacity: 0.5,
  },
  spinText: {
    color: '#FFF',
  },
  winMessage: {
    backgroundColor: '#E67E22', // Orange for pirate gold
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  winText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  messageContainer: {
    marginTop: 10,
    padding: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    alignItems: 'center',
  },
  message: {
    textAlign: 'center',
  },
  payoutContainer: {
    width: '100%',
    padding: 10,
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
  },
  payoutTable: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  payoutRow: {
    width: '30%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 5,
  },
  payoutSymbol: {
    fontSize: 30,
  },
}); 