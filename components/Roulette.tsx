import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Animated, 
  Easing, 
  TouchableOpacity, 
  ScrollView, 
  Dimensions 
} from 'react-native';
import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCasino } from '../context/CasinoContext';

// Standard roulette numbers in sequential order with their colors
const ROULETTE_NUMBERS = [
  { number: 0, color: 'green' },
  { number: 32, color: 'red' },
  { number: 15, color: 'black' },
  { number: 19, color: 'red' },
  { number: 4, color: 'black' },
  { number: 21, color: 'red' },
  { number: 2, color: 'black' },
  { number: 25, color: 'red' },
  { number: 17, color: 'black' },
  { number: 34, color: 'red' },
  { number: 6, color: 'black' },
  { number: 27, color: 'red' },
  { number: 13, color: 'black' },
  { number: 36, color: 'red' },
  { number: 11, color: 'black' },
  { number: 30, color: 'red' },
  { number: 8, color: 'black' },
  { number: 23, color: 'red' },
  { number: 10, color: 'black' },
  { number: 5, color: 'red' },
  { number: 24, color: 'black' },
  { number: 16, color: 'red' },
  { number: 33, color: 'black' },
  { number: 1, color: 'red' },
  { number: 20, color: 'black' },
  { number: 14, color: 'red' },
  { number: 31, color: 'black' },
  { number: 9, color: 'red' },
  { number: 22, color: 'black' },
  { number: 18, color: 'red' },
  { number: 29, color: 'black' },
  { number: 7, color: 'red' },
  { number: 28, color: 'black' },
  { number: 12, color: 'red' },
  { number: 35, color: 'black' },
  { number: 3, color: 'red' },
  { number: 26, color: 'black' }
];

// Betting options
const BET_OPTIONS = [
  { name: 'Red', value: 'red', odds: 1 },
  { name: 'Black', value: 'black', odds: 1 },
  { name: 'Even', value: 'even', odds: 1 },
  { name: 'Odd', value: 'odd', odds: 1 },
  { name: '1-18', value: 'low', odds: 1 },
  { name: '19-36', value: 'high', odds: 1 },
  { name: '1st 12', value: 'first12', odds: 2 },
  { name: '2nd 12', value: 'second12', odds: 2 },
  { name: '3rd 12', value: 'third12', odds: 2 }
];

export default function Roulette() {
  // Use global casino context
  const { 
    credits, 
    defaultBet,
    updateCredits, 
    addCredits: addGlobalCredits,
    subtractCredits,
    setLastMachine
  } = useCasino();
  
  const [betAmount, setBetAmount] = useState(defaultBet || 10);
  const [activeBets, setActiveBets] = useState({});
  const [spinResult, setSpinResult] = useState(null);
  const [message, setMessage] = useState('Place your bets!');
  const [isSpinning, setIsSpinning] = useState(false);
  const [history, setHistory] = useState([]);
  const [targetRotation, setTargetRotation] = useState(0);
  
  // Add game ID for tracking
  const GAME_ID = 'roulette';
  
  // Set the last machine when component mounts
  useEffect(() => {
    setLastMachine(GAME_ID);
  }, []);
  
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const screenWidth = Dimensions.get('window').width;
  const WHEEL_SIZE = Math.min(280, screenWidth * 0.7);
  
  // Preset bet amounts
  const BET_AMOUNTS = [1, 5, 10, 25, 50, 100];

  // Reset game
  const resetGame = () => {
    // Don't reset credits, only use global credits
    setHistory([]);
    setMessage('Place your bets!');
    setActiveBets({});
    setSpinResult(null);
    setTargetRotation(0);
  };

  // Function to add credits (for demo purposes)
  const addCredits = () => {
    addGlobalCredits(1000);
    setMessage('1000 credits added!');
  };

  // Place a bet
  const placeBet = (betType) => {
    if (isSpinning) return;
    
    if (credits < betAmount) {
      setMessage('Not enough credits!');
      return;
    }
    
    setActiveBets(prev => {
      const newBets = { ...prev };
      newBets[betType] = (newBets[betType] || 0) + betAmount;
      return newBets;
    });
    
    subtractCredits(betAmount);
    setMessage(`Bet placed on ${betType}!`);
  };

  // Place a bet on a specific number
  const placeBetOnNumber = (number) => {
    if (isSpinning) return;
    
    if (credits < betAmount) {
      setMessage('Not enough credits!');
      return;
    }
    
    setActiveBets(prev => {
      const newBets = { ...prev };
      const betKey = `number_${number}`;
      newBets[betKey] = (newBets[betKey] || 0) + betAmount;
      return newBets;
    });
    
    subtractCredits(betAmount);
    setMessage(`Bet placed on number ${number}!`);
  };

  // Clear all bets
  const clearBets = () => {
    if (isSpinning) return;
    
    const totalBets = Object.values(activeBets).reduce((sum, bet) => sum + bet, 0);
    addGlobalCredits(totalBets);
    setActiveBets({});
    setMessage('All bets cleared!');
  };

  // Spin the wheel
  const spin = () => {
    if (isSpinning) return;
    
    const totalBets = Object.values(activeBets).reduce((sum, bet) => sum + bet, 0);
    if (totalBets === 0) {
      setMessage('Place a bet first!');
      return;
    }
    
    setIsSpinning(true);
    setMessage('Spinning...');
    
    // Random result
    const randomIndex = Math.floor(Math.random() * ROULETTE_NUMBERS.length);
    const result = ROULETTE_NUMBERS[randomIndex];
    
    // Animated spin
    // Each pocket occupies (360 / ROULETTE_NUMBERS.length) degrees
    // For proper alignment, we need to spin the opposite direction
    const segmentAngle = 360 / ROULETTE_NUMBERS.length;
    const spins = 3; // Number of full rotations
    
    // Calculate the exact rotation needed to align the selected number with the pointer at the top
    const baseRotation = spins * 360; // Base number of complete rotations
    const adjustedIndex = ROULETTE_NUMBERS.length - randomIndex; // Adjust index for direction
    const offsetAngle = adjustedIndex * segmentAngle; // Angle offset for the specific number
    
    const targetRotation = baseRotation + offsetAngle;
    setTargetRotation(targetRotation);
    rotateAnim.setValue(0);
    
    Animated.timing(rotateAnim, {
      toValue: 1,
      duration: 4000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start(() => {
      setSpinResult(result);
      setHistory(prev => [result, ...prev].slice(0, 10));
      calculateWinnings(result);
      setIsSpinning(false);
    });
  };

  // Calculate winnings based on active bets and result
  const calculateWinnings = (result) => {
    let winnings = 0;
    const resultNum = result.number;
    const resultColor = result.color;
    
    Object.entries(activeBets).forEach(([betType, amount]) => {
      // Check for direct number bets
      if (betType.startsWith('number_')) {
        const betNumber = parseInt(betType.split('_')[1]);
        if (resultNum === betNumber) {
          winnings += amount * 36;
        }
      } 
      // Check for color bets
      else if ((betType === 'red' && resultColor === 'red') ||
          (betType === 'black' && resultColor === 'black')) {
        winnings += amount * 2;
      }
      // Check for even/odd bets (ignoring 0)
      else if (resultNum !== 0 && 
               ((betType === 'even' && resultNum % 2 === 0) ||
                (betType === 'odd' && resultNum % 2 === 1))) {
        winnings += amount * 2;
      }
      // Check for range bets
      else if ((betType === 'low' && resultNum >= 1 && resultNum <= 18) ||
               (betType === 'high' && resultNum >= 19 && resultNum <= 36)) {
        winnings += amount * 2;
      }
      // Check for dozen bets
      else if ((betType === 'first12' && resultNum >= 1 && resultNum <= 12) ||
               (betType === 'second12' && resultNum >= 13 && resultNum <= 24) ||
               (betType === 'third12' && resultNum >= 25 && resultNum <= 36)) {
        winnings += amount * 3;
      }
    });
    
    if (winnings > 0) {
      addGlobalCredits(winnings);
      setMessage(`You won ${winnings} credits!`);
    } else {
      setMessage(`No win. The result is ${resultNum} ${resultColor}.`);
    }
    
    setActiveBets({});
  };

  const renderNumberButtons = () => {
    const rows = [];
    for (let i = 0; i < 12; i++) {
      const row = [];
      for (let j = 0; j < 3; j++) {
        const num = i + j * 12 + 1;
        const rouletteNumber = ROULETTE_NUMBERS.find(r => r.number === num);
        if (rouletteNumber) {
          row.push(
            <TouchableOpacity
              key={num}
              style={[
                styles.numberButton,
                { backgroundColor: rouletteNumber.color }
              ]}
              onPress={() => placeBetOnNumber(num)}
            >
              <ThemedText style={styles.numberButtonText}>
                {num}
              </ThemedText>
              {activeBets[`number_${num}`] ? (
                <View style={styles.chipIndicator}>
                  <ThemedText style={styles.chipText}>
                    {activeBets[`number_${num}`]}
                  </ThemedText>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        }
      }
      rows.push(
        <View key={i} style={styles.numberRow}>
          {row}
        </View>
      );
    }
    
    // Add zero separately
    const zero = ROULETTE_NUMBERS.find(r => r.number === 0);
    if (zero) {
      rows.unshift(
        <View key="zero" style={styles.zeroRow}>
          <TouchableOpacity
            style={[
              styles.zeroButton,
              { backgroundColor: zero.color }
            ]}
            onPress={() => placeBetOnNumber(0)}
          >
            <ThemedText style={styles.numberButtonText}>
              0
            </ThemedText>
            {activeBets['number_0'] ? (
              <View style={styles.chipIndicator}>
                <ThemedText style={styles.chipText}>
                  {activeBets['number_0']}
                </ThemedText>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
      );
    }
    
    return rows;
  };

  const renderBetOptions = () => {
    return BET_OPTIONS.map(option => (
      <TouchableOpacity
        key={option.value}
        style={[
          styles.betOption,
          option.value === 'red' ? styles.redOption : null,
          option.value === 'black' ? styles.blackOption : null,
          activeBets[option.value] ? styles.activeBetOption : null
        ]}
        onPress={() => placeBet(option.value)}
      >
        <ThemedText style={styles.betOptionText}>
          {option.name}
        </ThemedText>
        {activeBets[option.value] ? (
          <View style={styles.chipIndicator}>
            <ThemedText style={styles.chipText}>
              {activeBets[option.value]}
            </ThemedText>
          </View>
        ) : null}
      </TouchableOpacity>
    ));
  };

  const renderWheel = () => {
    const interpolatedRotation = rotateAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', `${targetRotation}deg`]
    });
    
    return (
      <View style={styles.wheelContainer}>
        <View style={styles.pointerContainer}>
          <View style={styles.pointer} />
        </View>
        <TouchableOpacity 
          activeOpacity={0.9}
          disabled={isSpinning}
          onPress={spin}
        >
          <Animated.View
            style={[
              styles.wheel,
              {
                width: WHEEL_SIZE,
                height: WHEEL_SIZE,
                borderRadius: WHEEL_SIZE / 2,
                transform: [{ rotate: interpolatedRotation }]
              }
            ]}
          >
            {ROULETTE_NUMBERS.map((item, index) => {
              const angle = (index * 360) / ROULETTE_NUMBERS.length;
              return (
                <View
                  key={item.number}
                  style={[
                    styles.pocket,
                    {
                      backgroundColor: item.color,
                      transform: [
                        { rotate: `${angle}deg` },
                        { translateY: -WHEEL_SIZE / 2 + 15 }
                      ],
                      height: WHEEL_SIZE / 2,
                      width: 20,
                    }
                  ]}
                >
                  <ThemedText 
                    style={[
                      styles.pocketText,
                      { 
                        position: 'absolute',
                        bottom: 20 // Move the text further back from the edge
                      }
                    ]}
                  >
                    {item.number}
                  </ThemedText>
                </View>
              );
            })}
          </Animated.View>
        </TouchableOpacity>
        
        {spinResult && (
          <View style={[styles.resultBubble, { backgroundColor: spinResult.color }]}>
            <ThemedText style={styles.resultText}>
              {spinResult.number}
            </ThemedText>
          </View>
        )}
      </View>
    );
  };

  const renderSpinHistory = () => {
    if (history.length === 0) return null;
    
    return (
      <View style={styles.historyContainer}>
        <ThemedText style={styles.historyTitle}>Recent Spins:</ThemedText>
        <ScrollView horizontal style={styles.historyScroll} showsHorizontalScrollIndicator={false}>
          {history.map((result, index) => (
            <View 
              key={index} 
              style={[styles.historyItem, { backgroundColor: result.color }]}
            >
              <ThemedText style={styles.historyNumber}>
                {result.number}
              </ThemedText>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Roulette
        </ThemedText>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="cash" size={20} color="#D4AF37" />
            <ThemedText style={styles.statText}>
              Credits: {credits}
            </ThemedText>
          </View>
          
          <TouchableOpacity style={styles.addCreditsButton} onPress={addCredits}>
            <ThemedText style={styles.addCreditsText}>+1000</ThemedText>
          </TouchableOpacity>
        </View>
        
        <ThemedText style={styles.messageText}>{message}</ThemedText>
        
        {renderWheel()}
        {renderSpinHistory()}
        
        <View style={styles.betAmountContainer}>
          <ThemedText style={styles.betAmountLabel}>Bet Amount:</ThemedText>
          <View style={styles.betAmountButtons}>
            {BET_AMOUNTS.map(amount => (
              <TouchableOpacity
                key={amount}
                style={[
                  styles.betAmountButton,
                  betAmount === amount ? styles.activeBetAmount : null
                ]}
                onPress={() => setBetAmount(amount)}
              >
                <ThemedText style={styles.betAmountText}>{amount}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <View style={styles.betOptionsContainer}>
          <ThemedText style={styles.betOptionsTitle}>Place Your Bets:</ThemedText>
          <View style={styles.betOptionsGrid}>
            {renderBetOptions()}
          </View>
        </View>
        
        <View style={styles.numberBoardContainer}>
          <ThemedText style={styles.numberBoardTitle}>Bet on Numbers:</ThemedText>
          <View style={styles.numberBoard}>
            {renderNumberButtons()}
          </View>
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.clearButton]}
            onPress={clearBets}
            disabled={isSpinning}
          >
            <ThemedText style={styles.actionButtonText}>Clear Bets</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.spinButton]}
            onPress={spin}
            disabled={isSpinning}
          >
            <ThemedText style={styles.actionButtonText}>
              {isSpinning ? 'Spinning...' : 'Spin!'}
            </ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.resetButton]}
            onPress={resetGame}
          >
            <ThemedText style={styles.actionButtonText}>Reset Game</ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    marginBottom: 16,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    marginLeft: 5,
    fontSize: 16,
    fontWeight: 'bold',
  },
  addCreditsButton: {
    backgroundColor: '#D4AF37',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  addCreditsText: {
    color: '#000',
    fontWeight: 'bold',
  },
  messageText: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: '500',
  },
  wheelContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    position: 'relative',
    paddingTop: 15,
  },
  wheel: {
    backgroundColor: '#2C3E50',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#D4AF37',
  },
  pocket: {
    position: 'absolute',
    justifyContent: 'flex-end',
    alignItems: 'center',
    left: '50%',
    marginLeft: -10,
    borderWidth: 1,
    borderColor: '#000',
  },
  pocketText: {
    color: 'white',
    fontSize: 9,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
    transform: [{ rotate: '90deg' }],
  },
  pointerContainer: {
    position: 'absolute',
    top: 0,
    zIndex: 10,
    alignItems: 'center',
    width: 20,
    height: 30,
  },
  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 20,
    borderStyle: 'solid',
    backgroundColor: 'transparent',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#D4AF37',
    transform: [{ translateY: -5 }, { rotate: '180deg' }],
  },
  resultBubble: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    bottom: -60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D4AF37',
  },
  resultText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  historyContainer: {
    width: '100%',
    marginBottom: 20,
  },
  historyTitle: {
    fontSize: 16,
    marginBottom: 8,
  },
  historyScroll: {
    maxHeight: 50,
  },
  historyItem: {
    width: 36,
    height: 36,
    borderRadius: 18,
    margin: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  historyNumber: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  betAmountContainer: {
    width: '100%',
    marginBottom: 20,
  },
  betAmountLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  betAmountButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  betAmountButton: {
    backgroundColor: '#333',
    padding: 10,
    borderRadius: 5,
    margin: 4,
    minWidth: 50,
    alignItems: 'center',
  },
  activeBetAmount: {
    backgroundColor: '#D4AF37',
  },
  betAmountText: {
    fontWeight: 'bold',
  },
  betOptionsContainer: {
    width: '100%',
    marginBottom: 20,
  },
  betOptionsTitle: {
    fontSize: 16,
    marginBottom: 8,
  },
  betOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  betOption: {
    backgroundColor: '#333',
    padding: 10,
    borderRadius: 5,
    margin: 4,
    minWidth: '30%',
    alignItems: 'center',
    position: 'relative',
  },
  redOption: {
    backgroundColor: 'red',
  },
  blackOption: {
    backgroundColor: 'black',
  },
  activeBetOption: {
    borderWidth: 2,
    borderColor: '#D4AF37',
  },
  betOptionText: {
    fontWeight: 'bold',
  },
  chipIndicator: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#D4AF37',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'white',
  },
  chipText: {
    color: 'black',
    fontSize: 10,
    fontWeight: 'bold',
  },
  numberBoardContainer: {
    width: '100%',
    marginBottom: 20,
  },
  numberBoardTitle: {
    fontSize: 16,
    marginBottom: 8,
  },
  numberBoard: {
    width: '100%',
  },
  numberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  zeroRow: {
    marginBottom: 4,
    alignItems: 'center',
  },
  numberButton: {
    width: '32%',
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
    position: 'relative',
  },
  zeroButton: {
    width: '32%',
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
    position: 'relative',
  },
  numberButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  actionButton: {
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  clearButton: {
    backgroundColor: '#e74c3c',
  },
  spinButton: {
    backgroundColor: '#2ecc71',
  },
  resetButton: {
    backgroundColor: '#3498db',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
}); 