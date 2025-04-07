import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Platform, Modal } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCasino } from '../context/CasinoContext';

// Craps bet types
const BET_TYPES = {
  PASS_LINE: 'Pass Line',
  DONT_PASS: "Don't Pass",
  COME: 'Come',
  DONT_COME: "Don't Come",
  FIELD: 'Field',
  ANY_7: 'Any 7',
};

// Place bet types in a separate object for the dropdown
const PLACE_BET_TYPES = {
  PLACE_4: 'Place 4',
  PLACE_5: 'Place 5',
  PLACE_6: 'Place 6',
  PLACE_8: 'Place 8',
  PLACE_9: 'Place 9',
  PLACE_10: 'Place 10',
};

// Hard bet types in a separate object for the dropdown
const HARD_BET_TYPES = {
  HARD_4: 'Hard 4',
  HARD_6: 'Hard 6',
  HARD_8: 'Hard 8',
  HARD_10: 'Hard 10',
};

export default function Craps() {
  // Use global casino context
  const { 
    credits, 
    defaultBet,
    updateCredits, 
    addCredits: addGlobalCredits,
    subtractCredits,
    setLastMachine
  } = useCasino();
  
  // Game state
  const [bets, setBets] = useState({});
  const [totalBet, setTotalBet] = useState(0);
  const [currentBetType, setCurrentBetType] = useState(BET_TYPES.PASS_LINE);
  const [currentBetAmount, setCurrentBetAmount] = useState(defaultBet || 10);
  const [maxBet, setMaxBet] = useState(500);
  const [betIncrement, setBetIncrement] = useState(10);
  
  // Add game ID for tracking
  const GAME_ID = 'craps';
  
  // Set the last machine when component mounts
  useEffect(() => {
    setLastMachine(GAME_ID);
  }, []);
  
  // Dropdown state
  const [placeBetDropdownVisible, setPlaceBetDropdownVisible] = useState(false);
  
  // Dice state
  const [die1, setDie1] = useState(1);
  const [die2, setDie2] = useState(1);
  const [diceTotal, setDiceTotal] = useState(2);
  const [diceRolling, setDiceRolling] = useState(false);
  
  // Game round state
  const [gameState, setGameState] = useState('comeOut'); // 'comeOut', 'point', 'resolve'
  const [point, setPoint] = useState(null);
  const [message, setMessage] = useState('Place your bets and roll to start');
  const [isRolled, setIsRolled] = useState(false);
  const [history, setHistory] = useState([]);
  
  // Reset the game
  const resetGame = () => {
    setBets({});
    setTotalBet(0);
    setCurrentBetType(BET_TYPES.PASS_LINE);
    setCurrentBetAmount(10);
    setDie1(1);
    setDie2(1);
    setDiceTotal(2);
    setGameState('comeOut');
    setPoint(null);
    setMessage('Place your bets and roll to start');
    setIsRolled(false);
    setHistory([]);
  };
  
  // Place a bet
  const placeBet = (betType) => {
    if (credits < currentBetAmount) {
      setMessage('Not enough credits!');
      return;
    }
    
    // Update bets
    const newBets = { ...bets };
    newBets[betType] = (newBets[betType] || 0) + currentBetAmount;
    setBets(newBets);
    
    // Update credits and total bet
    subtractCredits(currentBetAmount);
    setTotalBet(prev => prev + currentBetAmount);
    
    // Provide feedback
    setMessage(`Bet placed on ${betType}`);
    
    // Haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };
  
  // Remove a bet
  const removeBet = (betType) => {
    if (!bets[betType]) return;
    
    // Return credits
    addGlobalCredits(bets[betType]);
    
    // Update total bet
    setTotalBet(prev => prev - bets[betType]);
    
    // Remove the bet
    const newBets = { ...bets };
    delete newBets[betType];
    setBets(newBets);
    
    setMessage(`Removed bet from ${betType}`);
  };
  
  // Roll the dice
  const rollDice = () => {
    if (totalBet === 0) {
      setMessage('Place at least one bet before rolling');
      return;
    }
    
    setDiceRolling(true);
    
    // Immediately show some dice movement
    setDie1(Math.floor(Math.random() * 6) + 1);
    setDie2(Math.floor(Math.random() * 6) + 1);
    
    // Animate dice roll with more frequent updates
    const rollCount = 10; // Number of visual dice changes
    let count = 0;
    
    const rollInterval = setInterval(() => {
      count++;
      setDie1(Math.floor(Math.random() * 6) + 1);
      setDie2(Math.floor(Math.random() * 6) + 1);
      
      // End the animation after rollCount iterations
      if (count >= rollCount) {
        clearInterval(rollInterval);
        
        // Final dice values
        const finalDie1 = Math.floor(Math.random() * 6) + 1;
        const finalDie2 = Math.floor(Math.random() * 6) + 1;
        const total = finalDie1 + finalDie2;
        
        setDie1(finalDie1);
        setDie2(finalDie2);
        setDiceTotal(total);
        setDiceRolling(false);
        setIsRolled(true);
        
        // Add to history
        setHistory(prev => [...prev.slice(-9), total]);
        
        // Resolve the roll
        resolveRoll(total, finalDie1, finalDie2);
        
        // Haptic feedback
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      }
    }, 100); // Slow down to 100ms per update for better visibility
  };
  
  // Resolve the current roll
  const resolveRoll = (total, die1Value, die2Value) => {
    // Check if the dice are a pair (hard way)
    const isHardWay = die1Value === die2Value;
    
    // Come out roll
    if (gameState === 'comeOut') {
      // Natural (7 or 11) - Pass Line wins, Don't Pass loses
      if (total === 7 || total === 11) {
        handleWin(BET_TYPES.PASS_LINE, 1);
        handleLoss(BET_TYPES.DONT_PASS);
        setMessage(`${total} - Natural! Pass Line wins`);
      }
      // Craps (2, 3, or 12)
      else if (total === 2 || total === 3) {
        handleLoss(BET_TYPES.PASS_LINE);
        handleWin(BET_TYPES.DONT_PASS, 1);
        setMessage(`${total} - Craps! Don't Pass wins`);
      }
      // 12 is a push on Don't Pass
      else if (total === 12) {
        handleLoss(BET_TYPES.PASS_LINE);
        handlePush(BET_TYPES.DONT_PASS);
        setMessage(`${total} - Craps! Don't Pass pushes`);
      }
      // Point is established
      else {
        setPoint(total);
        setGameState('point');
        setMessage(`Point is ${total}`);
      }
    }
    // Point roll
    else if (gameState === 'point') {
      // Hit the point - Pass Line wins, Don't Pass loses
      if (total === point) {
        handleWin(BET_TYPES.PASS_LINE, 1);
        handleLoss(BET_TYPES.DONT_PASS);
        setGameState('comeOut');
        setPoint(null);
        setMessage(`${total} - Hit the point! Pass Line wins`);
      }
      // Seven out - Pass Line loses, Don't Pass wins
      else if (total === 7) {
        handleLoss(BET_TYPES.PASS_LINE);
        handleWin(BET_TYPES.DONT_PASS, 1);
        setGameState('comeOut');
        setPoint(null);
        setMessage(`${total} - Seven out! Don't Pass wins`);
      }
    }
    
    // Field bets (one roll bet)
    if (bets[BET_TYPES.FIELD]) {
      if ([2, 3, 4, 9, 10, 11, 12].includes(total)) {
        // 2 and 12 pay double
        if (total === 2 || total === 12) {
          handleWin(BET_TYPES.FIELD, 2);
          setMessage(prev => `${prev}. Field wins double!`);
        } else {
          handleWin(BET_TYPES.FIELD, 1);
          setMessage(prev => `${prev}. Field wins!`);
        }
      } else {
        handleLoss(BET_TYPES.FIELD);
      }
    }
    
    // Any 7 (one roll bet)
    if (bets[BET_TYPES.ANY_7]) {
      if (total === 7) {
        handleWin(BET_TYPES.ANY_7, 4);
        setMessage(prev => `${prev}. Any 7 wins!`);
      } else {
        handleLoss(BET_TYPES.ANY_7);
      }
    }
    
    // Hard way bets
    if (isHardWay) {
      if (total === 4 && bets[BET_TYPES.HARD_4]) {
        handleWin(BET_TYPES.HARD_4, 7);
        setMessage(prev => `${prev}. Hard 4 wins!`);
      }
      if (total === 6 && bets[BET_TYPES.HARD_6]) {
        handleWin(BET_TYPES.HARD_6, 9);
        setMessage(prev => `${prev}. Hard 6 wins!`);
      }
      if (total === 8 && bets[BET_TYPES.HARD_8]) {
        handleWin(BET_TYPES.HARD_8, 9);
        setMessage(prev => `${prev}. Hard 8 wins!`);
      }
      if (total === 10 && bets[BET_TYPES.HARD_10]) {
        handleWin(BET_TYPES.HARD_10, 7);
        setMessage(prev => `${prev}. Hard 10 wins!`);
      }
    } else {
      // Easy way, lose hard way bets
      if (total === 4) handleLoss(BET_TYPES.HARD_4);
      if (total === 6) handleLoss(BET_TYPES.HARD_6);
      if (total === 8) handleLoss(BET_TYPES.HARD_8);
      if (total === 10) handleLoss(BET_TYPES.HARD_10);
    }
    
    // Place bets
    if (gameState === 'point' && total !== 7) {
      if (total === 4 && bets[BET_TYPES.PLACE_4]) {
        handleWin(BET_TYPES.PLACE_4, 1.8);
        setMessage(prev => `${prev}. Place 4 wins!`);
      }
      if (total === 5 && bets[BET_TYPES.PLACE_5]) {
        handleWin(BET_TYPES.PLACE_5, 1.4);
        setMessage(prev => `${prev}. Place 5 wins!`);
      }
      if (total === 6 && bets[BET_TYPES.PLACE_6]) {
        handleWin(BET_TYPES.PLACE_6, 1.16);
        setMessage(prev => `${prev}. Place 6 wins!`);
      }
      if (total === 8 && bets[BET_TYPES.PLACE_8]) {
        handleWin(BET_TYPES.PLACE_8, 1.16);
        setMessage(prev => `${prev}. Place 8 wins!`);
      }
      if (total === 9 && bets[BET_TYPES.PLACE_9]) {
        handleWin(BET_TYPES.PLACE_9, 1.4);
        setMessage(prev => `${prev}. Place 9 wins!`);
      }
      if (total === 10 && bets[BET_TYPES.PLACE_10]) {
        handleWin(BET_TYPES.PLACE_10, 1.8);
        setMessage(prev => `${prev}. Place 10 wins!`);
      }
    } else if (total === 7) {
      // Seven out loses all place bets
      handleLoss(BET_TYPES.PLACE_4);
      handleLoss(BET_TYPES.PLACE_5);
      handleLoss(BET_TYPES.PLACE_6);
      handleLoss(BET_TYPES.PLACE_8);
      handleLoss(BET_TYPES.PLACE_9);
      handleLoss(BET_TYPES.PLACE_10);
    }
    
    // Recalculate total bet
    calculateTotalBet();
  };
  
  // Update total bet amount
  const calculateTotalBet = () => {
    const total = Object.values(bets).reduce((sum, amount) => sum + amount, 0);
    setTotalBet(total);
  };
  
  // Handle winning bet
  const handleWin = (betType, multiplier) => {
    if (!bets[betType]) return;
    
    const winAmount = Math.floor(bets[betType] * multiplier);
    const totalWin = bets[betType] + winAmount;
    
    addGlobalCredits(totalWin);
    
    // Remove the bet after it's resolved
    const newBets = { ...bets };
    delete newBets[betType];
    setBets(newBets);
    
    // Haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };
  
  // Handle losing bet
  const handleLoss = (betType) => {
    if (!bets[betType]) return;
    
    // Remove the bet after it's lost
    const newBets = { ...bets };
    delete newBets[betType];
    setBets(newBets);
  };
  
  // Handle push (tie)
  const handlePush = (betType) => {
    if (!bets[betType]) return;
    
    // Return the original bet amount
    addGlobalCredits(bets[betType]);
    
    // Remove the bet
    const newBets = { ...bets };
    delete newBets[betType];
    setBets(newBets);
  };
  
  // Bet controls
  const increaseBet = () => {
    if (currentBetAmount < maxBet && currentBetAmount < credits) {
      setCurrentBetAmount(prev => Math.min(prev + betIncrement, maxBet, credits));
    }
  };
  
  const decreaseBet = () => {
    if (currentBetAmount > 10) {
      setCurrentBetAmount(prev => Math.max(prev - betIncrement, 10));
    }
  };
  
  const changeBetIncrement = () => {
    // Cycle through bet increments: 10 -> 50 -> 100 -> 10
    if (betIncrement === 10) {
      setBetIncrement(50);
    } else if (betIncrement === 50) {
      setBetIncrement(100);
    } else {
      setBetIncrement(10);
    }
  };
  
  const setMaximumBet = () => {
    setCurrentBetAmount(Math.min(maxBet, credits));
  };
  
  // Add free credits
  const addCredits = () => {
    addGlobalCredits(1000);
    setMessage('1000 free credits added!');
    setTimeout(() => setMessage(''), 2000);
  };
  
  // Render a die
  const renderDie = (value, index) => {
    const dotStyle = {
      position: 'absolute',
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#333',
    };
    
    const dots = [];
    
    // Center dot (for 1, 3, 5)
    if ([1, 3, 5].includes(value)) {
      dots.push(<View key="center" style={{ ...dotStyle, top: 24, left: 24 }} />);
    }
    
    // Top-left and bottom-right (for 2, 3, 4, 5, 6)
    if ([2, 3, 4, 5, 6].includes(value)) {
      dots.push(<View key="topLeft" style={{ ...dotStyle, top: 10, left: 10 }} />);
      dots.push(<View key="bottomRight" style={{ ...dotStyle, top: 38, left: 38 }} />);
    }
    
    // Top-right and bottom-left (for 4, 5, 6)
    if ([4, 5, 6].includes(value)) {
      dots.push(<View key="topRight" style={{ ...dotStyle, top: 10, left: 38 }} />);
      dots.push(<View key="bottomLeft" style={{ ...dotStyle, top: 38, left: 10 }} />);
    }
    
    // Middle-left and middle-right (for 6)
    if (value === 6) {
      dots.push(<View key="middleLeft" style={{ ...dotStyle, top: 24, left: 10 }} />);
      dots.push(<View key="middleRight" style={{ ...dotStyle, top: 24, left: 38 }} />);
    }
    
    // Apply animation styles when dice are rolling
    const dieStyle = [
      styles.die,
      diceRolling && styles.rollingDie
    ];
    
    return (
      <View key={`die-${index}`} style={dieStyle}>
        {dots}
      </View>
    );
  };
  
  // Handle selecting a bet from dropdown
  const selectDropdownBet = (betType) => {
    setCurrentBetType(betType);
    setPlaceBetDropdownVisible(false);
    
    // Haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };
  
  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        {/* Header with game info */}
        <View style={styles.headerRow}>
          <ThemedText type="title" style={styles.title}>Craps</ThemedText>
          <View style={styles.statusAndMessage}>
            <ThemedText style={styles.statusText}>
              {gameState === 'comeOut' ? 'Come Out' : `Point: ${point}`}
            </ThemedText>
            <ThemedText style={styles.messageText}>{message}</ThemedText>
          </View>
          <View style={styles.creditsContainer}>
            <ThemedText type="subtitle" style={styles.creditsLabel}>Credits:</ThemedText>
            <ThemedText type="subtitle" style={styles.creditsValue}>{credits}</ThemedText>
            <TouchableOpacity onPress={addCredits} style={styles.addButton}>
              <ThemedText style={styles.addButtonText}>+</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Main game area */}
        <View style={styles.gameArea}>
          {/* Dice section */}
          <View style={styles.diceSection}>
            <View style={styles.diceContainer}>
              <View style={styles.diceWrapper}>
                {renderDie(die1, 1)}
                {renderDie(die2, 2)}
              </View>
            </View>
            
            <View style={styles.diceInfoRow}>
              <View style={styles.diceInfoContainer}>
                <ThemedText style={styles.diceTotal}>{diceTotal}</ThemedText>
                <View style={styles.historyContainer}>
                  {history.slice(-6).map((roll, index) => (
                    <View key={`history-${index}`} style={styles.historyItem}>
                      <ThemedText style={styles.historyText}>{roll}</ThemedText>
                    </View>
                  ))}
                </View>
              </View>
            </View>
            
            <View style={styles.gameButtons}>
              <TouchableOpacity 
                style={[styles.rollButton, diceRolling && styles.disabledButton]}
                onPress={rollDice}
                disabled={diceRolling}
              >
                <ThemedText style={styles.rollButtonText}>
                  {diceRolling ? 'Rolling' : 'Roll'}
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.resetButton} onPress={resetGame}>
                <ThemedText style={styles.resetButtonText}>New</ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bets section */}
          <View style={styles.betsSection}>
            {/* Active bets panel */}
            <View style={styles.activeBetsPanel}>
              <View style={styles.panelHeader}>
                <ThemedText style={styles.panelTitle}>Active Bets</ThemedText>
                <ThemedText style={styles.totalBetText}>Total: {totalBet}</ThemedText>
              </View>
              <ScrollView style={styles.activeBetsList}>
                {Object.entries(bets).map(([betType, amount]) => (
                  <View key={`bet-${betType}`} style={styles.activeBetItem}>
                    <ThemedText style={styles.activeBetName}>{betType}</ThemedText>
                    <ThemedText style={styles.activeBetAmount}>{amount}</ThemedText>
                  </View>
                ))}
                {Object.keys(bets).length === 0 && (
                  <ThemedText style={styles.noBetsText}>No active bets</ThemedText>
                )}
              </ScrollView>
            </View>
            
            {/* Bet controls panel */}
            <View style={styles.betControlsPanel}>
              <View style={styles.amountAndBetControls}>
                <View style={styles.amountControlRow}>
                  <ThemedText style={styles.amountLabel}>Amount:</ThemedText>
                  <ThemedText style={styles.amountValue}>{currentBetAmount}</ThemedText>
                  <View style={styles.amountButtons}>
                    <TouchableOpacity onPress={decreaseBet} style={styles.amountButton}>
                      <ThemedText style={styles.amountButtonText}>-</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={increaseBet} style={styles.amountButton}>
                      <ThemedText style={styles.amountButtonText}>+</ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.betControlButtonsContainer}>
                  <View style={styles.betControlButtonRow}>
                    <TouchableOpacity onPress={changeBetIncrement} style={styles.betControlButton}>
                      <ThemedText style={styles.betControlText}>+{betIncrement}</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={setMaximumBet} style={[styles.betControlButton, styles.maxButton]}>
                      <ThemedText style={styles.betControlText}>Max</ThemedText>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.betControlButtonRow}>
                    <TouchableOpacity 
                      style={[styles.betControlButton, styles.placeBetButton]}
                      onPress={() => placeBet(currentBetType)}
                    >
                      <ThemedText style={styles.actionButtonText}>Place</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.betControlButton, styles.removeBetButton]}
                      onPress={() => removeBet(currentBetType)}
                    >
                      <ThemedText style={styles.actionButtonText}>Remove</ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
        
        {/* Bet types selection */}
        <View style={styles.betTypesSection}>
          <View style={styles.betTypesSectionHeader}>
            <ThemedText style={styles.betTypesSectionTitle}>Select Bet Type</ThemedText>
            <ThemedText style={styles.selectedBetText}>
              Selected: <ThemedText style={styles.selectedBetName}>{currentBetType}</ThemedText>
            </ThemedText>
          </View>
          <ScrollView horizontal={true} showsHorizontalScrollIndicator={false}>
            <View style={styles.betGrid}>
              {/* Regular bet types */}
              {Object.entries(BET_TYPES).map(([key, label]) => (
                <TouchableOpacity 
                  key={key}
                  style={[
                    styles.betButton, 
                    currentBetType === label && styles.selectedBetButton
                  ]}
                  onPress={() => setCurrentBetType(label)}
                >
                  <ThemedText style={[
                    styles.betButtonText,
                    currentBetType === label && styles.selectedBetButtonText
                  ]}>
                    {label}
                  </ThemedText>
                </TouchableOpacity>
              ))}
              
              {/* Place/Hard bet dropdown button */}
              <TouchableOpacity 
                style={[
                  styles.betButton, 
                  styles.placeBetDropdownButton,
                  (Object.values(PLACE_BET_TYPES).includes(currentBetType) || 
                  Object.values(HARD_BET_TYPES).includes(currentBetType)) && styles.selectedBetButton
                ]}
                onPress={() => setPlaceBetDropdownVisible(true)}
              >
                <ThemedText style={[
                  styles.betButtonText,
                  (Object.values(PLACE_BET_TYPES).includes(currentBetType) || 
                  Object.values(HARD_BET_TYPES).includes(currentBetType)) && styles.selectedBetButtonText
                ]}>
                  Place/Hard ▾
                </ThemedText>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
        
        {/* Place bet dropdown modal */}
        <Modal
          visible={placeBetDropdownVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setPlaceBetDropdownVisible(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1} 
            onPress={() => setPlaceBetDropdownVisible(false)}
          >
            <View style={styles.dropdownContainer}>
              <View style={styles.dropdownHeader}>
                <ThemedText style={styles.dropdownTitle}>Select Bet Type</ThemedText>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setPlaceBetDropdownVisible(false)}
                >
                  <ThemedText style={styles.closeButtonText}>✕</ThemedText>
                </TouchableOpacity>
              </View>
              
              <ThemedText style={styles.dropdownGroupLabel}>Place Bets</ThemedText>
              <View style={styles.dropdownGrid}>
                {Object.entries(PLACE_BET_TYPES).map(([key, label]) => (
                  <TouchableOpacity 
                    key={key}
                    style={[
                      styles.dropdownItem,
                      currentBetType === label && styles.selectedDropdownItem
                    ]}
                    onPress={() => selectDropdownBet(label)}
                  >
                    <ThemedText 
                      style={[
                        styles.dropdownItemText,
                        currentBetType === label && styles.selectedDropdownItemText
                      ]}
                    >
                      {label}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
              
              <View style={styles.dropdownDivider} />
              
              <ThemedText style={styles.dropdownGroupLabel}>Hard Way Bets</ThemedText>
              <View style={styles.dropdownGrid}>
                {Object.entries(HARD_BET_TYPES).map(([key, label]) => (
                  <TouchableOpacity 
                    key={key}
                    style={[
                      styles.dropdownItem,
                      currentBetType === label && styles.selectedDropdownItem
                    ]}
                    onPress={() => selectDropdownBet(label)}
                  >
                    <ThemedText 
                      style={[
                        styles.dropdownItemText,
                        currentBetType === label && styles.selectedDropdownItemText
                      ]}
                    >
                      {label}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 8,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.15)',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusAndMessage: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'column',
    paddingHorizontal: 10,
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#D4AF37',
  },
  messageText: {
    fontStyle: 'italic',
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.8,
  },
  creditsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  creditsLabel: {
    marginRight: 4,
    fontSize: 12,
    opacity: 0.8,
  },
  creditsValue: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#D4AF37',
  },
  addButton: {
    marginLeft: 6,
    backgroundColor: '#D4AF37',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12,
    lineHeight: 20,
  },
  
  // Game area layout
  gameArea: {
    flex: 1,
    flexDirection: 'column',
    marginBottom: 8,
  },
  
  // Dice section
  diceSection: {
    backgroundColor: 'rgba(0,0,0,0.2)', 
    borderRadius: 8,
    padding: 15,
    marginBottom: 8,
  },
  diceContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  diceWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  diceInfoRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 15,
  },
  diceInfoContainer: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  die: {
    width: 60,
    height: 60,
    backgroundColor: '#FFF',
    borderRadius: 10,
    margin: 12,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
  },
  rollingDie: {
    backgroundColor: '#FFFAF0',
    transform: [{ rotate: '5deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 6,
  },
  diceTotal: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  historyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  historyItem: {
    width: 22,
    height: 22,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 2,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  historyText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.9)',
  },
  gameButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 44,
  },
  rollButton: {
    backgroundColor: '#D4AF37',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 3,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  rollButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.5,
  },
  resetButton: {
    backgroundColor: '#34495E',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  resetButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  
  // Bets section
  betsSection: {
    flexDirection: 'row',
    flex: 1,
    marginBottom: 8,
  },
  activeBetsPanel: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    padding: 10,
    marginRight: 8,
    height: 180,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingBottom: 6,
  },
  panelTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#D4AF37',
  },
  activeBetsList: {
    flex: 1,
  },
  activeBetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  activeBetName: {
    flex: 1,
    fontSize: 12,
  },
  activeBetAmount: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#D4AF37',
  },
  noBetsText: {
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 8,
    fontSize: 12,
    opacity: 0.7,
  },
  totalBetText: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#FFF',
  },
  betControlsPanel: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    padding: 10,
    height: 180,
  },
  amountAndBetControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  amountControlRow: {
    flexDirection: 'column',
    flex: 1,
    marginRight: 8,
    justifyContent: 'center',
  },
  amountLabel: {
    fontSize: 12,
    marginBottom: 5,
  },
  amountValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#D4AF37',
    marginBottom: 8,
  },
  amountButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  amountButton: {
    backgroundColor: '#2C3E50',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  amountButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  betControlButtonsContainer: {
    flex: 1,
  },
  betControlButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  betControlButton: {
    flex: 1,
    height: 36,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
    marginLeft: 4,
  },
  incrementButton: {
    backgroundColor: '#3498DB',
  },
  maxButton: {
    backgroundColor: '#E74C3C',
  },
  placeBetButton: {
    backgroundColor: '#27AE60',
  },
  removeBetButton: {
    backgroundColor: '#E74C3C',
  },
  betControlText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  actionButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  
  // Bet types section
  betTypesSection: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    padding: 10,
  },
  betTypesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingBottom: 6,
  },
  betTypesSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#D4AF37',
  },
  selectedBetText: {
    fontSize: 12,
  },
  selectedBetName: {
    fontWeight: 'bold',
    color: '#D4AF37',
  },
  betGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 4,
  },
  betButton: {
    backgroundColor: '#2C3E50',
    padding: 8,
    borderRadius: 6,
    marginRight: 6,
    minWidth: 80,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  selectedBetButton: {
    backgroundColor: '#D4AF37',
    borderColor: '#FFF',
  },
  betButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  selectedBetButtonText: {
    color: '#000',
  },
  placeBetDropdownButton: {
    minWidth: 110,
  },
  
  // Dropdown styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    backgroundColor: '#2C3E50',
    borderRadius: 6,
    padding: 10,
    width: '85%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: '#D4AF37',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingBottom: 6,
    marginBottom: 6,
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#FFF',
    flex: 1,
  },
  closeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  dropdownGroupLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#D4AF37',
    marginBottom: 5,
  },
  dropdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dropdownItem: {
    padding: 8,
    borderRadius: 4,
    marginBottom: 5,
    width: '48%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  selectedDropdownItem: {
    backgroundColor: '#D4AF37',
    borderColor: '#FFF',
  },
  dropdownItemText: {
    color: '#FFF',
    fontSize: 12,
  },
  selectedDropdownItemText: {
    color: '#000',
    fontWeight: 'bold',
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 10,
  },
}); 