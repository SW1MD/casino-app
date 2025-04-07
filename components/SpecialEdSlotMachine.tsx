import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Easing, Text, Platform, Alert, ScrollView } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCasino } from '../context/CasinoContext';

// Special Education themed slot symbols with probabilities and payouts
const SYMBOLS = [
  { symbol: '📓', name: 'notebook', value: 1, probability: 0.20 },
  { symbol: '✏️', name: 'pencil', value: 2, probability: 0.18 },
  { symbol: '🧩', name: 'puzzle', value: 4, probability: 0.16 },
  { symbol: '🧠', name: 'brain', value: 6, probability: 0.14 },
  { symbol: '🧸', name: 'teddy', value: 8, probability: 0.10 },
  { symbol: '🔍', name: 'focus', value: 10, probability: 0.08 },
  { symbol: '⭐', name: 'star', value: 15, probability: 0.06 },
  { symbol: '🏆', name: 'trophy', value: 20, probability: 0.04 },
  { symbol: '🎓', name: 'graduation', value: 40, probability: 0.03 },
  { symbol: '💊', name: 'meds', value: 50, probability: 0.009 },
  { symbol: '🌈', name: 'rainbow', value: 100, probability: 0.001 },
];

// Special difficulty levels that affect the machine's behavior
const DIFFICULTY_LEVELS = [
  { level: 0, name: 'Regular Class', description: 'Normal slot machine behavior' },
  { level: 1, name: 'Remedial Class', description: 'Higher chances but lower payouts' },
  { level: 2, name: 'Special Ed Class', description: 'Extra attempts when losing' },
  { level: 3, name: 'IEP Program', description: 'Guaranteed win after several losses' }
];

const NUM_REELS = 5;
const SYMBOLS_PER_REEL = 3;
const REEL_ITEMS = 20; // Number of items in each reel (for animation)
const MACHINE_ID = 'specialEdSlots';
const GLOW_ANIMATION_DURATION = 1500;

export default function SpecialEdSlotMachine() {
  // Global casino context
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
      Array(SYMBOLS_PER_REEL).fill(0).map(() => Math.floor(Math.random() * SYMBOLS.length))
    )
  );
  const [win, setWin] = useState(0);
  const [message, setMessage] = useState('');
  const [difficultyLevel, setDifficultyLevel] = useState(0);
  const [consecutiveLosses, setConsecutiveLosses] = useState(0);
  const [extraAttempts, setExtraAttempts] = useState(0);
  const [iepModeActive, setIepModeActive] = useState(false);
  
  // Animation values for each reel
  const reelPositions = useRef(Array(NUM_REELS).fill(0).map(() => new Animated.Value(0))).current;
  
  // Difficulty level animation
  const difficultyAnimation = useRef(new Animated.Value(0)).current;
  
  // Add winning positions and glow animation
  const [winningPositions, setWinningPositions] = useState([]);
  const [glowOpacity] = useState(new Animated.Value(0));
  
  // Set the last machine when component mounts
  useEffect(() => {
    setLastMachine(MACHINE_ID);
  }, []);
  
  // Effect to animate difficulty level changes
  useEffect(() => {
    Animated.timing(difficultyAnimation, {
      toValue: difficultyLevel,
      duration: 500,
      easing: Easing.elastic(1),
      useNativeDriver: false,
    }).start();
  }, [difficultyLevel]);
  
  // Handle glowing animation for winning positions
  useEffect(() => {
    if (winningPositions.length > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, {
            toValue: 1,
            duration: GLOW_ANIMATION_DURATION / 2,
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.3,
            duration: GLOW_ANIMATION_DURATION / 2,
            useNativeDriver: true,
          })
        ])
      ).start();
    } else {
      glowOpacity.setValue(0);
    }
  }, [winningPositions]);
  
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
  
  // Change difficulty level
  const changeDifficultyLevel = () => {
    setDifficultyLevel((difficultyLevel + 1) % DIFFICULTY_LEVELS.length);
    setMessage(`Switched to ${DIFFICULTY_LEVELS[(difficultyLevel + 1) % DIFFICULTY_LEVELS.length].name}!`);
    setTimeout(() => setMessage(''), 2000);
  };
  
  // Create animated reel for a specific index
  const createReel = (reelIndex) => {
    return (
      <Animated.View
        style={[
          styles.reel,
          {
            transform: [
              {
                translateY: reelPositions[reelIndex].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -REEL_ITEMS * 60 + 60]
                })
              }
            ]
          }
        ]}
      >
        {Array(REEL_ITEMS).fill(0).map((_, itemIndex) => {
          // For the last position (visible at the end), use the actual result
          const symbolIndex = itemIndex >= REEL_ITEMS - SYMBOLS_PER_REEL
            ? visibleSymbols[reelIndex][itemIndex - (REEL_ITEMS - SYMBOLS_PER_REEL)]
            : Math.floor(Math.random() * SYMBOLS.length);
            
          // Check if this position is in the winning positions
          const isWinningPosition = winningPositions.some(pos => 
            pos[0] === reelIndex && 
            pos[1] === (itemIndex >= REEL_ITEMS - SYMBOLS_PER_REEL ? itemIndex - (REEL_ITEMS - SYMBOLS_PER_REEL) : -1)
          );
            
          return (
            <View 
              key={`symbol-${reelIndex}-${itemIndex}`} 
              style={[
                styles.symbolContainer,
                isWinningPosition && styles.winningSymbolContainer
              ]}
            >
              {isWinningPosition && (
                <Animated.View 
                  style={[
                    styles.glowEffect,
                    { opacity: glowOpacity }
                  ]} 
                />
              )}
              <Text style={styles.symbol}>
                {SYMBOLS[symbolIndex].symbol}
              </Text>
            </View>
          );
        })}
      </Animated.View>
    );
  };
  
  // Calculate winnings based on results
  const calculateWinnings = (symbolsMatrix) => {
    let totalWin = 0;
    let newWinningPositions = [];
    
    // Apply different rules based on difficulty level
    const currentLevel = DIFFICULTY_LEVELS[difficultyLevel];
    
    // Check each row for matches (horizontal lines)
    for (let row = 0; row < SYMBOLS_PER_REEL; row++) {
      let maxConsecutive = 1;
      let currentSymbol = symbolsMatrix[0][row];
      let currentCount = 1;
      let positions = [[0, row]];
      
      for (let reel = 1; reel < NUM_REELS; reel++) {
        if (symbolsMatrix[reel][row] === currentSymbol) {
          currentCount++;
          positions.push([reel, row]);
        } else {
          // If we have at least 3 consecutive symbols, record the win
          if (currentCount >= 3 && currentCount > maxConsecutive) {
            maxConsecutive = currentCount;
          }
          
          // Reset counters for a new potential match
          currentSymbol = symbolsMatrix[reel][row];
          currentCount = 1;
          positions = [[reel, row]];
        }
      }
      
      // Check if the last sequence was a match
      if (currentCount >= 3 && currentCount > maxConsecutive) {
        maxConsecutive = currentCount;
      }
      
      if (maxConsecutive >= 3) {
        const symbolValue = SYMBOLS[currentSymbol].value;
        
        // Apply difficulty level modifiers to winnings
        let winAmount = bet * symbolValue * (maxConsecutive - 2);
        
        if (difficultyLevel === 1) { // Remedial class - higher chances but lower payouts
          winAmount = Math.floor(winAmount * 0.8);
        } else if (difficultyLevel === 3 && iepModeActive) { // IEP mode - guaranteed bigger win
          winAmount = Math.floor(winAmount * 1.5);
        }
        
        totalWin += winAmount;
        
        // Add winning positions
        for (let i = 0; i < positions.length; i++) {
          if (i < maxConsecutive) {
            newWinningPositions.push(positions[i]);
          }
        }
      }
    }
    
    // Store winning positions
    setWinningPositions(newWinningPositions);
    
    if (totalWin > 0) {
      // Reset consecutive losses
      setConsecutiveLosses(0);
      setExtraAttempts(0);
      setIepModeActive(false);
      
      // Add winnings
      setWin(totalWin);
      addGlobalCredits(totalWin);
      
      // Show message
      if (totalWin >= bet * 20) {
        setMessage("HONOR ROLL! BIG WIN! 🎓🎉");
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        setMessage("You passed the test! 📝✅");
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } else {
      // Handle loss based on difficulty level
      handleLoss();
    }
    
    setTimeout(() => setMessage(''), 2000);
  };
  
  // Handle losses based on difficulty level
  const handleLoss = () => {
    setConsecutiveLosses(prev => prev + 1);
    
    // Special Ed Class - Extra attempts
    if (difficultyLevel === 2 && consecutiveLosses >= 3 && extraAttempts === 0) {
      setExtraAttempts(2);
      setMessage("Teacher gave you extra attempts! ✏️");
      return;
    }
    
    // IEP Program - Guaranteed win after several losses
    if (difficultyLevel === 3 && consecutiveLosses >= 5 && !iepModeActive) {
      setIepModeActive(true);
      setMessage("IEP activated! Next spin is a guaranteed win! 🌈");
      return;
    }
    
    setMessage("Need to study more... 📚");
  };
  
  // Spin the slot machine
  const spin = () => {
    if (spinning) return;
    if (credits < bet) {
      setMessage('Not enough credits for tuition!');
      setTimeout(() => setMessage(''), 2000);
      return;
    }
    
    // Only use haptics on native platforms
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    // Subtract bet amount globally
    subtractCredits(bet);
    
    setSpinning(true);
    setWin(0);
    setMessage('');
    setWinningPositions([]);
    
    // Handle difficulty level adjustments
    let newSymbols = Array(NUM_REELS).fill(0).map(() => Array(SYMBOLS_PER_REEL).fill(0));
    
    // Manipulate results based on difficulty level
    if (difficultyLevel === 1) { // Remedial Class - Higher chances
      // Higher chance of matching symbols
      for (let reel = 0; reel < NUM_REELS; reel++) {
        for (let row = 0; row < SYMBOLS_PER_REEL; row++) {
          // 40% chance of repeating previous symbol if not the first reel
          if (reel > 0 && Math.random() < 0.4) {
            newSymbols[reel][row] = newSymbols[reel-1][row];
          } else {
            const rand = Math.random();
            let cumulativeProbability = 0;
            
            for (let i = 0; i < SYMBOLS.length; i++) {
              cumulativeProbability += SYMBOLS[i].probability;
              if (rand < cumulativeProbability) {
                newSymbols[reel][row] = i;
                break;
              }
            }
          }
        }
      }
    } else if (difficultyLevel === 3 && iepModeActive) { // IEP Program - Guaranteed win
      // Force a match on middle row
      const randomSymbol = Math.floor(Math.random() * 5); // Use one of the first 5 symbols
      for (let reel = 0; reel < NUM_REELS; reel++) {
        newSymbols[reel][1] = randomSymbol; // Set middle row
        
        // Set random symbols for other rows
        for (let row of [0, 2]) {
          const rand = Math.random();
          let cumulativeProbability = 0;
          
          for (let i = 0; i < SYMBOLS.length; i++) {
            cumulativeProbability += SYMBOLS[i].probability;
            if (rand < cumulativeProbability) {
              newSymbols[reel][row] = i;
              break;
            }
          }
        }
      }
    } else { // Normal randomization
      for (let reel = 0; reel < NUM_REELS; reel++) {
        for (let row = 0; row < SYMBOLS_PER_REEL; row++) {
          const rand = Math.random();
          let cumulativeProbability = 0;
          
          for (let i = 0; i < SYMBOLS.length; i++) {
            cumulativeProbability += SYMBOLS[i].probability;
            if (rand < cumulativeProbability) {
              newSymbols[reel][row] = i;
              break;
            }
          }
        }
      }
    }
    
    // Set the results immediately so the reels can use them while animating
    setVisibleSymbols(newSymbols);
    
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
    
    Animated.stagger(200, animations).start(() => {
      setSpinning(false);
      
      // Calculate winnings
      calculateWinnings(newSymbols);
      
      // Handle extra attempts
      if (extraAttempts > 0) {
        setExtraAttempts(prev => prev - 1);
      }
    });
  };
  
  // Get difficulty level label color
  const getDifficultyColor = () => {
    const colors = ['#4CAF50', '#FFC107', '#FF9800', '#2196F3'];
    return colors[difficultyLevel];
  };
  
  return (
    <ThemedView style={styles.container}>
      <ScrollView 
        style={styles.mainScrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <ThemedText type="title" style={styles.title}>Special Education Slots</ThemedText>
        
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
        
        {/* Difficulty level selector */}
        <TouchableOpacity 
          style={[styles.difficultyContainer, { borderColor: getDifficultyColor() }]} 
          onPress={changeDifficultyLevel}
          disabled={spinning}
        >
          <ThemedText type="defaultSemiBold">Difficulty: </ThemedText>
          <ThemedText 
            type="defaultSemiBold" 
            style={{ color: getDifficultyColor() }}
          >
            {DIFFICULTY_LEVELS[difficultyLevel].name}
          </ThemedText>
          {(extraAttempts > 0 || iepModeActive) && (
            <View style={styles.specialModeIndicator}>
              <ThemedText type="small" style={styles.specialModeText}>
                {extraAttempts > 0 ? `${extraAttempts} extra attempts!` : 'IEP Mode Active!'}
              </ThemedText>
            </View>
          )}
        </TouchableOpacity>
        
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
            credits < bet && styles.disabledButton
          ]} 
          onPress={spin}
          disabled={spinning || credits < bet}
        >
          <ThemedText type="subtitle" style={styles.spinText}>
            {spinning ? 'TAKING TEST...' : 'TAKE TEST'}
          </ThemedText>
        </TouchableOpacity>
        
        {/* Win message */}
        {win > 0 && (
          <ThemedView style={styles.winMessage}>
            <ThemedText type="subtitle" style={styles.winText}>
              YOU EARNED {win} CREDITS!
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
          <ThemedText type="subtitle">Symbol Values</ThemedText>
          <View style={styles.payoutTable}>
            {SYMBOLS.map((item, index) => (
              <View key={`payout-${index}`} style={styles.payoutRow}>
                <Text style={styles.payoutSymbol}>{item.symbol}</Text>
                <ThemedText>x{item.value}</ThemedText>
              </View>
            ))}
          </View>
          
          <ThemedText type="subtitle" style={{marginTop: 15}}>Difficulty Modes</ThemedText>
          <View style={styles.modesTable}>
            {DIFFICULTY_LEVELS.map((item, index) => (
              <View key={`mode-${index}`} style={styles.modeRow}>
                <ThemedText type="defaultSemiBold" style={{color: ['#4CAF50', '#FFC107', '#FF9800', '#2196F3'][index]}}>
                  {item.name}
                </ThemedText>
                <ThemedText type="small">{item.description}</ThemedText>
              </View>
            ))}
          </View>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainScrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
    paddingBottom: 40,
  },
  title: {
    marginBottom: 10,
    color: '#3F51B5', // Special education blue
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
  difficultyContainer: {
    width: '100%',
    flexDirection: 'row',
    padding: 10,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(63, 81, 181, 0.1)',
  },
  specialModeIndicator: {
    marginLeft: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#FF5722',
    borderRadius: 10,
  },
  specialModeText: {
    color: 'white',
    fontWeight: 'bold',
  },
  slotMachine: {
    width: '100%',
    maxWidth: 500,
    height: 120,
    borderWidth: 5,
    borderColor: '#3F51B5', // Special education blue
    borderRadius: 10,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8EAF6', // Light blue background
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
    backgroundColor: '#C5CAE9', // Lighter blue
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#7986CB', // Medium blue
  },
  reel: {
    alignItems: 'center',
  },
  symbolContainer: {
    height: 60,
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  winningSymbolContainer: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)', // Gold highlight
  },
  glowEffect: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFD700', // Gold glow
    borderRadius: 5,
  },
  symbol: {
    fontSize: 30,
    textAlign: 'center',
  },
  spinButton: {
    backgroundColor: '#3F51B5', // Special education blue
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 30,
    marginTop: 20,
  },
  spinningButton: {
    backgroundColor: '#9E9E9E', // Gray
  },
  disabledButton: {
    backgroundColor: '#9E9E9E', // Gray
    opacity: 0.5,
  },
  spinText: {
    color: 'white',
  },
  winMessage: {
    backgroundColor: '#4CAF50', // Green
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  winText: {
    color: 'white',
  },
  messageContainer: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(63, 81, 181, 0.2)', // Light blue
  },
  message: {
    textAlign: 'center',
  },
  payoutScrollView: {
    maxHeight: 200,
    width: '100%',
  },
  payoutContainer: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(63, 81, 181, 0.1)', // Light blue
    alignItems: 'center',
  },
  payoutTable: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  payoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '25%',
    marginBottom: 10,
    justifyContent: 'center',
    gap: 5,
  },
  payoutSymbol: {
    fontSize: 20,
  },
  modesTable: {
    width: '100%',
    marginTop: 10,
  },
  modeRow: {
    marginBottom: 10,
  }
}); 