import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Easing, Text, Platform, Image } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCasino } from '../context/CasinoContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBackButton } from '../utils/backButtonHandler';
import { LinearGradient } from 'expo-linear-gradient';

// Define symbol type
type Symbol = {
  symbol: string;
  name: string;
  value: number;
  probability: number;
};

// Define heat level type
type HeatLevel = {
  level: number;
  name: string;
  multiplier: number;
  color: string;
};

// Slot symbols with probabilities and payouts
const SYMBOLS = [
  { symbol: '💵', name: 'cash', value: 10, probability: 0.18 },
  { symbol: '🔫', name: 'gun', value: 15, probability: 0.22 },
  { symbol: '🏙️', name: 'hood', value: 20, probability: 0.15 },
  { symbol: '🚬', name: 'cigarette', value: 25, probability: 0.12 },
  { symbol: '🍺', name: 'beer', value: 30, probability: 0.10 },
  { symbol: '💊', name: 'pills', value: 40, probability: 0.08 },
  { symbol: '💎', name: 'bling', value: 50, probability: 0.05 },
  { symbol: '👑', name: 'crown', value: 100, probability: 0.02 },
  { symbol: '🚔', name: 'police', value: 0, probability: 0.08 },
];

const NUM_REELS = 3;
const REEL_ITEMS = 20; // Number of items in each reel (for animation)

// HEAT METER SYSTEM - unique feature for this slot machine
const HEAT_LEVELS: HeatLevel[] = [
  { level: 0, name: 'Cold', multiplier: 1, color: '#3498db' },
  { level: 1, name: 'Warm', multiplier: 1.5, color: '#f39c12' },
  { level: 2, name: 'Hot', multiplier: 2, color: '#e74c3c' },
  { level: 3, name: 'On Fire', multiplier: 3, color: '#9b59b6' },
  { level: 4, name: 'Straight Fire', multiplier: 5, color: '#e74c3c' }
];

// Placeholder for our sound effects
const SOUND_EFFECTS = {
  spin: 'spin',
  win: 'win',
  jackpot: 'jackpot'
};

// Add type for props
interface GhettoSlotMachineProps {
  onBackPress?: () => void;
}

export default function GhettoSlotMachine({ onBackPress }: GhettoSlotMachineProps) {
  // Use the casino context for credits
  const { 
    credits, 
    addCredits: addGlobalCredits, 
    subtractCredits: subtractGlobalCredits,
    lastMachine,
    setLastMachine
  } = useCasino();
  
  // Use the back button handler hook
  useBackButton(onBackPress);
  
  const [bet, setBet] = useState(10);
  const [spinning, setSpinning] = useState(false);
  const [results, setResults] = useState<number[]>(Array(NUM_REELS).fill(0));
  const [win, setWin] = useState(0);
  const [message, setMessage] = useState('');
  const [heatLevel, setHeatLevel] = useState(0);
  const [consecutiveSpins, setConsecutiveSpins] = useState(0);
  const [lastWinTime, setLastWinTime] = useState(0);
  
  // Animation values for each reel
  const reelPositions = useRef(Array(NUM_REELS).fill(0).map(() => new Animated.Value(0))).current;
  const heatMeterAnim = useRef(new Animated.Value(0)).current;
  
  // Add gang war mode state
  const [gangWarActive, setGangWarActive] = useState(false);
  const [gangWarChoices, setGangWarChoices] = useState<string[]>([]);
  const [gangWarResults, setGangWarResults] = useState<{win: boolean, amount: number} | null>(null);
  
  // Add armed robbery mode state
  const [robberyActive, setRobberyActive] = useState(false);
  const [robberyTime, setRobberyTime] = useState(0);
  const [robberyAmount, setRobberyAmount] = useState(0);
  const [robberyTaps, setRobberyTaps] = useState(0);
  
  // Add police state variables
  const [policeActive, setPoliceActive] = useState(false);
  const [policeCount, setPoliceCount] = useState(0);
  const [policeOutcome, setPoliceOutcome] = useState<'lit' | 'pulled' | 'shot' | null>(null);
  
  // Add overdose state
  const [overdoseActive, setOverdoseActive] = useState(false);
  
  // Add a new state variable to track raw amount
  const [robberyRawAmount, setRobberyRawAmount] = useState(0);
  
  // Track credit changes for debugging
  useEffect(() => {
    console.log(`Credits in GhettoSlotMachine: ${credits}`);
  }, [credits]);

  // Set this machine as the last played machine
  useEffect(() => {
    if (lastMachine !== 'ghettoSlots') {
      setLastMachine('ghettoSlots');
    }
  }, [lastMachine, setLastMachine]);
  
  // Cool down heat meter over time
  useEffect(() => {
    const cooldownTimer = setInterval(() => {
      if (heatLevel > 0 && !spinning) {
        // Check if it's been more than 20 seconds since last win
        const now = Date.now();
        if (now - lastWinTime > 20000) {
          setHeatLevel(prev => Math.max(prev - 1, 0));
        }
      }
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(cooldownTimer);
  }, [heatLevel, spinning, lastWinTime]);
  
  // Heat meter animation
  useEffect(() => {
    Animated.timing(heatMeterAnim, {
      toValue: heatLevel,
      duration: Platform.OS === 'web' ? 0 : 300,
      useNativeDriver: false
    }).start();
  }, [heatLevel, heatMeterAnim]);
  
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
    setMessage('Got 1000 credits from the welfare office! 💰');
    setTimeout(() => setMessage(''), 2000);
  };

  // Heat up the meter
  const increaseHeat = () => {
    // Increase consecutive spins
    setConsecutiveSpins(prev => prev + 1);
    
    // Update heat based on consecutive spins
    if (consecutiveSpins >= 10) {
      setHeatLevel(prev => Math.min(prev + 1, HEAT_LEVELS.length - 1));
      setConsecutiveSpins(0); // Reset after upgrading
    }
  };
  
  // Spin the slot machine
  const spin = () => {
    if (spinning) return;
    if (credits < bet) {
      setMessage('You broke AF! No credits!');
      setTimeout(() => setMessage(''), 2000);
      return;
    }
    
    // Only use haptics on native platforms
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    // Subtract bet amount globally
    subtractGlobalCredits(bet);
    console.log(`Betting ${bet} from GhettoSlotMachine`);
    
    setSpinning(true);
    setWin(0);
    setMessage('');
    
    // Increment the consecutive spins and heat meter
    increaseHeat();
    
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
  
  // Calculate winnings based on results with heat meter multiplier
  const calculateWinnings = (results: number[]) => {
    // Get current heat multiplier
    const heatMultiplier = HEAT_LEVELS[heatLevel].multiplier;
    
    // Create an array to track active features
    const activeFeatures = [];
    let totalWin = 0;
    
    // Check for guns
    const gunSymbols = results.filter(r => SYMBOLS[r].name === 'gun');
    if (gunSymbols.length > 0) {
      if (gunSymbols.length === 3) {
        // Track Gang War
        activeFeatures.push('gangWar');
      } else if (gunSymbols.length === 2) {
        // Track Armed Robbery
        activeFeatures.push('robbery');
      } else {
        // Track Get Robbed
        activeFeatures.push('robbed');
      }
    }
    
    // Check for police
    const policeSymbols = results.filter(r => SYMBOLS[r].name === 'police');
    if (policeSymbols.length > 0) {
      activeFeatures.push('police');
    }
    
    // Check for cash
    const cashSymbols = results.filter(r => SYMBOLS[r].name === 'cash');
    if (cashSymbols.length >= 1) {
      activeFeatures.push('cash');
      
      // Calculate cash reward
      const percentage = cashSymbols.length * 0.0075; // 0.75% per cash symbol
      const cashReward = Math.ceil(credits * percentage);
      totalWin += cashReward;
    }
    
    // Check for pills
    const pillSymbols = results.filter(r => SYMBOLS[r].name === 'pills');
    if (pillSymbols.length > 0) {
      if (pillSymbols.length === 3) {
        // Track Overdose
        activeFeatures.push('overdose');
      } else if (pillSymbols.length === 2) {
        // Track Get High
        activeFeatures.push('high');
        
        // Calculate reward
        const highReward = Math.ceil(credits * 0.025);
        totalWin += highReward;
      }
    }
    
    // Check for beer
    const beerSymbols = results.filter(r => SYMBOLS[r].name === 'beer');
    if (beerSymbols.length === 2) {
      // Track Get Drunk
      activeFeatures.push('drunk');
      
      // Calculate reward
      const drunkReward = Math.ceil(credits * 0.025);
      totalWin += drunkReward;
    }
    
    // If we have multiple features, handle them all
    if (activeFeatures.length > 1) {
      handleMultipleFeatures(activeFeatures, totalWin);
      return;
    }
    
    // If we have a single feature, handle it individually
    if (activeFeatures.length === 1) {
      switch (activeFeatures[0]) {
        case 'gangWar':
          activateGangWar();
          return;
        case 'robbery':
          activateRobbery();
          return;
        case 'robbed':
          getGunpointRobbed();
          return;
        case 'police':
          handlePoliceEncounter(policeSymbols.length);
          return;
        case 'overdose':
          triggerOverdose();
          return;
        case 'high':
          handleGetHigh('pills');
          return;
        case 'drunk':
          handleGetHigh('beer');
          return;
        case 'cash':
          // Handle cash bonus
          addGlobalCredits(totalWin);
          setWin(totalWin);
          setLastWinTime(Date.now());
          setMessage(`Stack of cash! Earned ${totalWin} credits (${cashSymbols.length * 0.75}% of stack)! 💵x${cashSymbols.length}`);
          
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          
          setTimeout(() => setMessage(''), 3000);
          return;
      }
    }
    
    // Continue with existing match checks for regular wins...
    // Check if all symbols are the same
    const allSame = results.every(r => r === results[0]);
    
    if (allSame) {
      const symbolValue = SYMBOLS[results[0]].value;
      const winAmount = Math.floor(bet * symbolValue * heatMultiplier);
      
      setWin(winAmount);
      // Add winnings globally
      addGlobalCredits(winAmount);
      console.log(`Won ${winAmount} in GhettoSlotMachine`);
      
      // Update heat level on big win
      if (symbolValue >= 40) {
        setHeatLevel(prev => Math.min(prev + 1, HEAT_LEVELS.length - 1));
      }
      
      // Set last win time
      setLastWinTime(Date.now());
      
      if (symbolValue >= 50) {
        // Only use haptics on native platforms
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setMessage('STRAIGHT FIRE! CASH OUT! 💯');
      } else {
        // Only use haptics on native platforms
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setMessage('You winnin! Respect ✊');
      }
    } else {
      // Check for pairs
      for (let i = 0; i < NUM_REELS; i++) {
        for (let j = i + 1; j < NUM_REELS; j++) {
          if (results[i] === results[j]) {
            const symbolValue = SYMBOLS[results[i]].value;
            const winAmount = Math.floor(bet * (symbolValue / 5) * heatMultiplier);
            
            if (winAmount > 0) {
              setWin(winAmount);
              // Add winnings globally
              addGlobalCredits(winAmount);
              setLastWinTime(Date.now());
              console.log(`Won ${winAmount} in GhettoSlotMachine (pair)`);
              setMessage('Not bad, homie! Small win');
              // Only use haptics on native platforms
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              return;
            }
          }
        }
      }
      
      setMessage('Damn, you got robbed!');
    }
    
    setTimeout(() => setMessage(''), 2000);
  };
  
  // Gang War bonus game mode
  const activateGangWar = () => {
    setMessage('GANG WAR MODE ACTIVATED! 🔫');
    
    // Vibrate the device for gang war mode
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    
    // Generate 3 rival gangs to choose from
    const gangChoices = ['Bloods', 'Crips', 'Latin Kings'];
    setGangWarChoices(gangChoices);
    
    // Set gang war mode active
    setGangWarActive(true);
  };
  
  // Handle gang choice
  const handleGangChoice = (gangName: string) => {
    // Calculate win chance and reward
    const baseReward = bet * 50;
    const heatBonus = Math.floor(baseReward * HEAT_LEVELS[heatLevel].multiplier);
    
    // 40% chance to win the gang war
    const win = Math.random() < 0.4;
    
    // Set results
    const result = {
      win,
      amount: win ? heatBonus : 0
    };
    
    setGangWarResults(result);
    
    // Award credits if won
    if (win) {
      addGlobalCredits(result.amount);
      setWin(result.amount);
      setMessage(`Your gang won the territory! +${result.amount} CREDITS! 💰`);
      
      // Boost heat level on gang war win
      setHeatLevel(prev => Math.min(prev + 2, HEAT_LEVELS.length - 1));
      setLastWinTime(Date.now());
      
      // Haptics on win
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } else {
      setMessage(`You lost the gang war! Better luck next time! 😵`);
    }
    
    // Reset gang war after a delay
    setTimeout(() => {
      setGangWarActive(false);
      setGangWarChoices([]);
      setGangWarResults(null);
    }, 3000);
  };
  
  // Armed Robbery bonus game mode
  const activateRobbery = () => {
    setMessage('ARMED ROBBERY MODE! 🔫 Tap fast to grab cash!');
    
    // Vibrate the device
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    
    // Set robbery time limit (5 seconds)
    setRobberyTime(5);
    setRobberyTaps(0);
    setRobberyRawAmount(0);
    setRobberyAmount(0);
    setRobberyActive(true);
    
    // Start the robbery timer countdown
    const timer = setInterval(() => {
      setRobberyTime(prev => {
        if (prev <= 1) {
          // Time's up, end the robbery
          clearInterval(timer);
          completeRobbery();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  // Completely rewrite the tap handler function to use a more direct approach
  const handleRobberyTap = () => {
    // Increase tap count
    const newTapCount = robberyTaps + 1;
    setRobberyTaps(newTapCount);
    
    // Fixed amount: 50 credits per tap
    const newRawAmount = 50 * newTapCount;
    
    // Apply multiplier
    const newMultipliedAmount = Math.floor(newRawAmount * HEAT_LEVELS[heatLevel].multiplier);
    
    // Update both values
    setRobberyRawAmount(newRawAmount);
    setRobberyAmount(newMultipliedAmount);
    
    // Log values for debugging
    console.log(`Tap ${newTapCount}: ${newRawAmount} × ${HEAT_LEVELS[heatLevel].multiplier} = ${newMultipliedAmount}`);
    
    // Haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };
  
  // Simplify the completeRobbery function to just use the current state values
  const completeRobbery = () => {
    // The robberyAmount should already have the multiplier applied
    const finalAmount = robberyAmount;
    
    // Double-check calculation
    console.log(`Robbery complete: ${robberyTaps} taps × 50 = ${robberyTaps * 50} raw × ${HEAT_LEVELS[heatLevel].multiplier} = ${finalAmount}`);
    
    // Award credits
    addGlobalCredits(finalAmount);
    setWin(finalAmount);
    
    // Success message
    setMessage(`You stole ${finalAmount} credits! 💰`);
    
    // Update heat meter
    setHeatLevel(prev => Math.min(prev + 1, HEAT_LEVELS.length - 1));
    setLastWinTime(Date.now());
    
    // End robbery mode after showing results
    setTimeout(() => {
      setRobberyActive(false);
    }, 3000);
  };
  
  // Update the "Get Robbed" negative event
  const getGunpointRobbed = () => {
    // Strong haptic feedback for getting robbed
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    
    // Take 2.5% (1/40) of player's total credits (changed from 5%)
    const robbedAmount = Math.ceil(credits / 40);
    
    // Make sure we don't take more than the player has (safety check)
    const actualRobbedAmount = Math.min(robbedAmount, credits);
    
    // Subtract the robbed amount (on top of the bet that was already subtracted)
    subtractGlobalCredits(actualRobbedAmount);
    
    // Calculate total lost (original bet + robbed amount)
    const totalLost = bet + actualRobbedAmount;
    
    // Show the negative message about losing 2.5% of total money
    setMessage(`ROBBED! Lost ${actualRobbedAmount} credits (2.5% of your stack)! 🔫`);
    
    // Update last win time to prevent heat level decrease
    setLastWinTime(Date.now());
    
    // Set a negative win amount (just for display purposes)
    setWin(-actualRobbedAmount);
    
    setTimeout(() => setMessage(''), 3000);
  };
  
  // Updated police encounter handler
  const handlePoliceEncounter = (count: number) => {
    setPoliceCount(count);
    setPoliceActive(true);
    
    // Vibrate the device for police encounter
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(
        count === 3 
          ? Haptics.NotificationFeedbackType.Success  // Changed to Success for big win
          : Haptics.NotificationFeedbackType.Warning
      );
    }
    
    // Handle different police outcomes based on count
    switch (count) {
      case 1: // Lit up by police - small fine
        const litFine = Math.floor(bet * 0.5);
        setPoliceOutcome('lit');
        subtractGlobalCredits(litFine);
        setMessage(`Police lit you up! Paid ${litFine} credits to avoid arrest! 🚔`);
        setWin(-litFine);
        break;
        
      case 2: // Pulled over - larger fine
        const pulloverFine = Math.floor(bet * 1.5);
        setPoliceOutcome('pulled');
        subtractGlobalCredits(pulloverFine);
        setMessage(`Pulled over! Paid ${pulloverFine} credits in fines! 🚔🚔`);
        setWin(-pulloverFine);
        break;
        
      case 3: // Shot by police - get HUGE settlement money!
        const settlementAmount = credits * 2; // 2x their total stack as settlement
        setPoliceOutcome('shot');
        addGlobalCredits(settlementAmount);
        setMessage(`SHOT BY POLICE! Won ${settlementAmount} credits in settlement! 🚔🚔🚔💰`);
        setWin(settlementAmount);
        break;
    }
    
    // Hide police encounter after delay
    setTimeout(() => {
      setPoliceActive(false);
      setPoliceOutcome(null);
      setMessage('');
    }, 3000);
  };
  
  // Add overdose function
  const triggerOverdose = () => {
    // Strong haptic feedback for overdose
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    
    // Lose all heat progress and take a big loss
    const overdoseCost = Math.floor(bet * 10); // 10x bet loss
    
    // Make sure we don't take more than the player has
    const actualLoss = Math.min(overdoseCost, credits);
    
    // Subtract the overdose cost
    subtractGlobalCredits(actualLoss);
    
    // Set overdose active to show visual effect
    setOverdoseActive(true);
    
    // Reset heat to zero
    setHeatLevel(0);
    
    // Show message
    setMessage(`OVERDOSED! Lost ${actualLoss} credits & all heat! 💊`);
    
    // Set negative win amount
    setWin(-actualLoss);
    
    // Hide overdose effect after 3 seconds
    setTimeout(() => {
      setOverdoseActive(false);
      setMessage('');
    }, 3000);
  };
  
  // Add a function to handle pills/beer rewards
  const handleGetHigh = (type: 'pills' | 'beer') => {
    // Calculate 2.5% of player's total stack
    const rewardAmount = Math.ceil(credits * 0.025);
    
    // Success haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    // Add the reward to player's credits
    addGlobalCredits(rewardAmount);
    
    // Set win amount
    setWin(rewardAmount);
    
    // Set message based on type
    if (type === 'pills') {
      setMessage(`Got high on pills! Earned ${rewardAmount} credits (2.5% of stack)! 💊`);
    } else {
      setMessage(`Got drunk on beer! Earned ${rewardAmount} credits (2.5% of stack)! 🍺`);
    }
    
    // Update last win time
    setLastWinTime(Date.now());
    
    setTimeout(() => setMessage(''), 3000);
  };
  
  // Function to build a reel
  const createReel = (index: number) => {
    const items = [];
    
    // If we're spinning, the final symbol should be the result for this reel
    const finalSymbol = SYMBOLS[results[index]].symbol;
    
    // Add random symbols for the animation (excluding the last position)
    for (let i = 0; i < REEL_ITEMS - 1; i++) {
      // For every 5th position, force a gun symbol to appear more frequently
      // This increases the chances of hitting Gang War mode
      if (i % 5 === 0) {
        // Get the gun symbol (index 1 in our SYMBOLS array)
        items.push(SYMBOLS[1].symbol); // 🔫 symbol
      } else {
        const randomIndex = Math.floor(Math.random() * SYMBOLS.length);
        items.push(SYMBOLS[randomIndex].symbol);
      }
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
  
  // Heat meter width animation
  const heatWidth = heatMeterAnim.interpolate({
    inputRange: [0, HEAT_LEVELS.length - 1],
    outputRange: ['0%', '100%'],
  });
  
  // Heat meter color animation
  const heatColor = heatMeterAnim.interpolate({
    inputRange: HEAT_LEVELS.map((_, i) => i),
    outputRange: HEAT_LEVELS.map(level => level.color),
  });
  
  // Add new function to handle multiple features being triggered at once
  const handleMultipleFeatures = (features: string[], bonusWin: number) => {
    // Start with any bonus win amount
    let totalWin = bonusWin;
    
    // Create a combined message
    let combinedMessage = "MULTIPLE BONUSES! ";
    
    // Process all positive features first
    if (features.includes('cash')) {
      combinedMessage += "💵 Cash bonus! ";
    }
    
    if (features.includes('high')) {
      combinedMessage += "💊 Got high! ";
      // We already added this to totalWin in the calculateWinnings function
    }
    
    if (features.includes('drunk')) {
      combinedMessage += "🍺 Got drunk! ";
      // We already added this to totalWin in the calculateWinnings function
    }
    
    // Handle special features
    if (features.includes('gangWar') && features.includes('police')) {
      // Special case: Gang War during police encounter!
      combinedMessage += "😱 GANG WAR WITH POLICE! ";
      
      // Boost reward for this rare combo
      const gangWarPoliceBonus = bet * 100 * HEAT_LEVELS[heatLevel].multiplier;
      totalWin += gangWarPoliceBonus;
      
      // Super boost heat 
      setHeatLevel(HEAT_LEVELS.length - 1); // Set to max
    } 
    else {
      // Handle individual features
      if (features.includes('gangWar')) {
        // Add Gang War bonus (use lower end of possible outcomes)
        const gangWarBonus = bet * 20 * HEAT_LEVELS[heatLevel].multiplier;
        totalWin += gangWarBonus;
        combinedMessage += "🔫🔫🔫 Gang War! ";
        
        // Increase heat level
        setHeatLevel(prev => Math.min(prev + 1, HEAT_LEVELS.length - 1));
      }
      
      if (features.includes('robbery')) {
        // Add Armed Robbery bonus (equivalent to about 10 taps)
        const robberyBonus = 500 * HEAT_LEVELS[heatLevel].multiplier;
        totalWin += robberyBonus;
        combinedMessage += "🔫🔫 Armed Robbery! ";
        
        // Small heat increase
        setHeatLevel(prev => Math.min(prev + 1, HEAT_LEVELS.length - 1));
      }
      
      if (features.includes('police')) {
        const policeSymbols = features.filter(r => r === 'police').length;
        if (policeSymbols === 3) {
          // Police settlement
          const settlementBonus = credits * 1.5; // Slightly reduced for combined bonus
          totalWin += settlementBonus;
          combinedMessage += "🚔🚔🚔 Police Settlement! ";
        }
        else if (policeSymbols === 2) {
          // Police fine (negative)
          const pulloverFine = Math.floor(bet * 1.5);
          totalWin -= pulloverFine;
          combinedMessage += "🚔🚔 Pulled Over! ";
        }
        else {
          // Small police fine (negative)
          const litFine = Math.floor(bet * 0.5);
          totalWin -= litFine;
          combinedMessage += "🚔 Lit Up! ";
        }
      }
    }
    
    // Handle negative features
    if (features.includes('robbed')) {
      // Get robbed (negative)
      const robbedAmount = Math.ceil(credits / 40);
      totalWin -= robbedAmount;
      combinedMessage += "🔫 Robbed! ";
    }
    
    if (features.includes('overdose')) {
      // Overdose (negative)
      const overdoseCost = Math.floor(bet * 5); // Reduced for combined feature
      totalWin -= overdoseCost;
      combinedMessage += "💊💊💊 Overdose! ";
      
      // Still lose heat for overdose
      setHeatLevel(0);
    }
    
    // Make sure we don't take more than player has if negative
    if (totalWin < 0) {
      totalWin = Math.max(-credits, totalWin);
    }
    
    // Apply the final win/loss
    if (totalWin >= 0) {
      addGlobalCredits(totalWin);
      combinedMessage += `+${totalWin} CREDITS!`;
      
      // Haptic success
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } else {
      subtractGlobalCredits(Math.abs(totalWin));
      combinedMessage += `LOST ${Math.abs(totalWin)} CREDITS!`;
      
      // Haptic error
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
    
    // Set win amount and message
    setWin(totalWin);
    setMessage(combinedMessage);
    setLastWinTime(Date.now());
    
    // Clear message after delay
    setTimeout(() => setMessage(''), 5000);
  };
  
  return (
    <ThemedView style={styles.container}>
      <LinearGradient
        colors={['#121212', '#333333']}
        style={styles.background}
      />
      
      <ThemedText type="title" style={styles.title}>Hood Rich Slots</ThemedText>
      
      {/* Heat meter */}
      <View style={styles.heatMeterContainer}>
        <ThemedText type="defaultSemiBold" style={styles.heatLabel}>
          {HEAT_LEVELS[heatLevel].name} {HEAT_LEVELS[heatLevel].multiplier}x
        </ThemedText>
        <View style={styles.heatMeter}>
          <Animated.View 
            style={[
              styles.heatFill, 
              { 
                width: heatWidth,
                backgroundColor: heatColor
              }
            ]} 
          />
        </View>
      </View>
      
      {/* Credits and bet display */}
      <View style={styles.infoContainer}>
        <ThemedView style={styles.creditContainer}>
          <ThemedText type="defaultSemiBold">Stack:</ThemedText>
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
        
        {/* Graffiti decoration */}
        <View style={styles.graffitiContainer}>
          <Text style={styles.graffiti}>$$$</Text>
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
          {spinning ? 'HUSTLIN\'...' : 'HUSTLE'}
        </ThemedText>
      </TouchableOpacity>
      
      {/* Win message */}
      {win > 0 && (
        <ThemedView style={styles.winMessage}>
          <ThemedText type="subtitle" style={styles.winText}>
            YOU GOT {win} CREDITS! 💸
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
        <ThemedText type="subtitle">Street Payouts</ThemedText>
        <View style={styles.payoutTable}>
          {SYMBOLS.map((item, index) => (
            <View key={`payout-${index}`} style={styles.payoutRow}>
              <Text style={styles.payoutSymbol}>{item.symbol}</Text>
              <ThemedText>x{item.value}</ThemedText>
            </View>
          ))}
        </View>
        
        <View style={styles.specialFeatureInfo}>
          <ThemedText type="subtitle" style={styles.specialFeatureTitle}>
            GANG WAR BONUS 🔫🔫🔫
          </ThemedText>
          <ThemedText style={styles.specialFeatureText}>
            Get 3 guns for Gang War bonus! Win up to 50x bet with heat multiplier!
          </ThemedText>
        </View>
        
        <View style={styles.specialFeatureInfo}>
          <ThemedText type="subtitle" style={styles.specialFeatureTitle}>
            ARMED ROBBERY 🔫🔫
          </ThemedText>
          <ThemedText style={styles.specialFeatureText}>
            Get 2 guns to start an Armed Robbery! Each tap = 50 credits × your heat multiplier. Tap fast to maximize your haul!
          </ThemedText>
        </View>
        
        <View style={[styles.specialFeatureInfo, styles.dangerFeature]}>
          <ThemedText type="subtitle" style={styles.dangerTitle}>
            DANGER: GET ROBBED 🔫
          </ThemedText>
          <ThemedText style={styles.specialFeatureText}>
            Watch out! 1 gun and you'll be robbed at gunpoint - lose 2.5% of your TOTAL CREDITS!
          </ThemedText>
        </View>
        
        <View style={styles.heatInfoContainer}>
          <ThemedText type="smallSemiBold" style={styles.heatInfoText}>
            Stay in the game to build heat! Higher heat = bigger payouts!
          </ThemedText>
        </View>
        
        {/* Update the police warning text */}
        <View style={[styles.specialFeatureInfo, styles.dangerFeature, styles.policeFeature]}>
          <ThemedText type="subtitle" style={styles.dangerTitle}>
            POLICE DANGER/JACKPOT 🚔
          </ThemedText>
          <ThemedText style={styles.specialFeatureText}>
            Watch out for cops! 1 = small fine, 2 = big fine, 3 = SHOT + 2X TOTAL STACK SETTLEMENT!
          </ThemedText>
        </View>
        
        {/* Add a warning about the overdose to the payout info */}
        <View style={[styles.specialFeatureInfo, styles.dangerFeature, styles.overdoseFeature]}>
          <ThemedText type="subtitle" style={styles.dangerTitle}>
            DANGER: OVERDOSE 💊
          </ThemedText>
          <ThemedText style={styles.specialFeatureText}>
            3 pills = OVERDOSE! Lose 10x your bet & reset all your heat progress!
          </ThemedText>
        </View>
        
        {/* Add pill/beer info to payout section */}
        <View style={[styles.specialFeatureInfo, styles.bonusFeature]}>
          <ThemedText type="subtitle" style={styles.bonusTitle}>
            BONUS: GET HIGH/DRUNK! 💊💊 or 🍺🍺
          </ThemedText>
          <ThemedText style={styles.specialFeatureText}>
            Get 2 pills or 2 beers to earn 2.5% of your total stack as a bonus!
          </ThemedText>
        </View>
        
        {/* Add cash info to payout section */}
        <View style={[styles.specialFeatureInfo, styles.bonusFeature]}>
          <ThemedText type="subtitle" style={styles.bonusTitle}>
            BONUS: CASH STACKS 💵
          </ThemedText>
          <ThemedText style={styles.specialFeatureText}>
            Each cash symbol gives you 0.75% of your total credits! More cash = bigger bonus!
          </ThemedText>
        </View>
      </ThemedView>
      
      {/* Gang War Modal */}
      {gangWarActive && (
        <View style={styles.gangWarOverlay}>
          <View style={styles.gangWarContainer}>
            <LinearGradient
              colors={['#660000', '#990000']}
              style={{borderRadius: 15}}
            >
              <View style={styles.gangWarContent}>
                <ThemedText type="title" style={styles.gangWarTitle}>
                  GANG WAR
                </ThemedText>
                
                {gangWarResults === null ? (
                  <>
                    <ThemedText style={styles.gangWarDescription}>
                      Choose your gang to fight for territory!
                    </ThemedText>
                    
                    <View style={styles.gangChoicesContainer}>
                      {gangWarChoices.map((gang, index) => (
                        <TouchableOpacity
                          key={gang}
                          style={styles.gangChoice}
                          onPress={() => handleGangChoice(gang)}
                        >
                          <MaterialCommunityIcons
                            name={index === 0 ? "pistol" : index === 1 ? "knife" : "bomb"}
                            size={32}
                            color="#FFFFFF"
                          />
                          <ThemedText style={styles.gangName}>{gang}</ThemedText>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                ) : (
                  <View style={styles.gangWarResultContainer}>
                    <MaterialCommunityIcons
                      name={gangWarResults.win ? "trophy" : "skull"}
                      size={60}
                      color={gangWarResults.win ? "#FFD700" : "#FFFFFF"}
                    />
                    <ThemedText type="title" style={[
                      styles.gangWarResultText,
                      {color: gangWarResults.win ? "#FFD700" : "#FFFFFF"}
                    ]}>
                      {gangWarResults.win ? "VICTORY!" : "DEFEAT!"}
                    </ThemedText>
                    {gangWarResults.win && (
                      <ThemedText style={styles.gangWarRewardText}>
                        +{gangWarResults.amount} CREDITS
                      </ThemedText>
                    )}
                  </View>
                )}
              </View>
            </LinearGradient>
          </View>
        </View>
      )}
      
      {/* Armed Robbery Modal */}
      {robberyActive && (
        <View style={styles.robberyOverlay}>
          <View style={styles.robberyContainer}>
            <LinearGradient
              colors={['#333333', '#000000']}
              style={{borderRadius: 15}}
            >
              <View style={styles.robberyContent}>
                <ThemedText type="title" style={styles.robberyTitle}>
                  ARMED ROBBERY
                </ThemedText>
                
                {robberyTime > 0 ? (
                  <>
                    <View style={styles.robberyTimerContainer}>
                      <ThemedText style={styles.robberyTimer}>
                        {robberyTime}s
                      </ThemedText>
                    </View>
                    
                    <ThemedText style={styles.robberyInstructions}>
                      TAP REPEATEDLY TO GRAB CASH!
                    </ThemedText>
                    
                    <TouchableOpacity
                      style={styles.robberyTapArea}
                      onPress={handleRobberyTap}
                      activeOpacity={0.6}
                    >
                      <MaterialCommunityIcons name="cash-multiple" size={50} color="#4CAF50" />
                      <ThemedText style={styles.robberyAmount}>
                        ${robberyAmount} (${robberyRawAmount} × {HEAT_LEVELS[heatLevel].multiplier})
                      </ThemedText>
                      <ThemedText style={styles.robberyInfo}>
                        50 credits per tap
                      </ThemedText>
                    </TouchableOpacity>
                    
                    <ThemedText style={styles.robberyTapCount}>
                      {robberyTaps} taps
                    </ThemedText>
                  </>
                ) : (
                  <View style={styles.robberyResultContainer}>
                    <MaterialCommunityIcons
                      name="bank-robbery"
                      size={60}
                      color="#FFD700"
                    />
                    <ThemedText type="title" style={styles.robberyResultText}>
                      HEIST COMPLETE!
                    </ThemedText>
                    <ThemedText style={styles.robberyRewardText}>
                      +{robberyAmount} CREDITS
                    </ThemedText>
                    <ThemedText style={styles.robberyStatsText}>
                      {robberyTaps} taps × 50 = {robberyRawAmount} × {HEAT_LEVELS[heatLevel].multiplier} heat
                    </ThemedText>
                  </View>
                )}
              </View>
            </LinearGradient>
          </View>
        </View>
      )}
      
      {/* Police Encounter Modal */}
      {policeActive && (
        <View style={styles.policeOverlay}>
          <View style={styles.policeContainer}>
            <LinearGradient
              colors={['#1a237e', '#303f9f']} 
              style={{borderRadius: 15}}
            >
              <View style={styles.policeContent}>
                <View style={styles.policeLights}>
                  <View style={[styles.policeLight, styles.redLight]} />
                  <View style={[styles.policeLight, styles.blueLight]} />
                </View>
                
                <ThemedText type="title" style={styles.policeTitle}>
                  {policeOutcome === 'lit' && 'LIT UP BY POLICE'}
                  {policeOutcome === 'pulled' && 'PULLED OVER'}
                  {policeOutcome === 'shot' && 'SHOT BY POLICE'}
                </ThemedText>
                
                <View style={styles.policeSymbols}>
                  {Array(policeCount).fill(0).map((_, i) => (
                    <Text key={i} style={styles.policeSymbol}>🚔</Text>
                  ))}
                </View>
                
                <ThemedText style={styles.policeMessage}>
                  {policeOutcome === 'lit' && 'You got lit up by the cops! Paid a small fine to avoid arrest.'}
                  {policeOutcome === 'pulled' && 'Cops pulled you over! License, registration, and a big fine.'}
                  {policeOutcome === 'shot' && 'The police shot you! But you sued the department and won a MASSIVE settlement! Ka-ching!'}
                </ThemedText>
              </View>
            </LinearGradient>
          </View>
        </View>
      )}
      
      {/* Overdose Effect */}
      {overdoseActive && (
        <View style={styles.overdoseOverlay}>
          <View style={styles.overdoseContainer}>
            <LinearGradient
              colors={['#6a0dad', '#9400d3']} 
              style={{borderRadius: 15}}
            >
              <View style={styles.overdoseContent}>
                <MaterialCommunityIcons name="pill" size={70} color="#FFFFFF" />
                <ThemedText type="title" style={styles.overdoseTitle}>
                  OVERDOSE
                </ThemedText>
                <ThemedText style={styles.overdoseMessage}>
                  Too many pills! You overdosed and lost all your heat progress and a massive amount of credits!
                </ThemedText>
                <View style={styles.pillContainer}>
                  <Text style={styles.pillSymbol}>💊</Text>
                  <Text style={styles.pillSymbol}>💊</Text>
                  <Text style={styles.pillSymbol}>💊</Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    gap: 15,
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  title: {
    marginBottom: 5,
    color: '#FFCC00',
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
  heatMeterContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 5,
  },
  heatLabel: {
    marginBottom: 5,
    color: '#FFFFFF',
  },
  heatMeter: {
    width: '100%',
    height: 15,
    backgroundColor: '#444',
    borderRadius: 7.5,
    overflow: 'hidden',
  },
  heatFill: {
    height: '100%',
    borderRadius: 7.5,
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
  slotMachine: {
    width: '100%',
    maxWidth: 350,
    height: 130,
    borderWidth: 5,
    borderColor: '#FFCC00',
    borderRadius: 10,
    padding: 5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#222',
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
    height: 60,
    backgroundColor: '#000',
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#444',
  },
  reel: {
    alignItems: 'center',
  },
  symbol: {
    fontSize: 40,
    lineHeight: 60,
    textAlign: 'center',
    width: 60,
    height: 60,
  },
  winLine: {
    position: 'absolute',
    height: 3,
    width: '90%',
    backgroundColor: '#FF0000',
    top: '50%',
    marginTop: -1.5,
  },
  graffitiContainer: {
    position: 'absolute',
    top: 0,
    right: 10,
  },
  graffiti: {
    fontFamily: 'System',
    fontSize: 24,
    color: '#FFCC00',
    fontWeight: 'bold',
    transform: [{ rotate: '15deg' }],
  },
  spinButton: {
    backgroundColor: '#9b59b6',
    width: '80%',
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  spinningButton: {
    backgroundColor: '#8e44ad',
  },
  disabledButton: {
    backgroundColor: '#555',
    opacity: 0.7,
  },
  spinText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  winMessage: {
    backgroundColor: '#FFCC00',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginTop: 5,
  },
  winText: {
    color: '#000',
    fontWeight: 'bold',
  },
  messageContainer: {
    marginTop: 5,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
  },
  message: {
    textAlign: 'center',
  },
  payoutContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
  payoutTable: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 5,
  },
  payoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 5,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  payoutSymbol: {
    fontSize: 20,
    marginRight: 5,
  },
  heatInfoContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 10,
    width: '100%',
  },
  heatInfoText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#FFCC00',
  },
  // Gang War Styles
  gangWarOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  gangWarContainer: {
    width: '90%',
    maxWidth: 350,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
  },
  gangWarContent: {
    padding: 20,
    alignItems: 'center',
  },
  gangWarTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
    marginBottom: 15,
  },
  gangWarDescription: {
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
  },
  gangChoicesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  gangChoice: {
    padding: 15,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 80,
    borderWidth: 1,
    borderColor: '#CCCCCC',
  },
  gangName: {
    color: '#FFFFFF',
    marginTop: 8,
    fontWeight: 'bold',
  },
  gangWarResultContainer: {
    alignItems: 'center',
    padding: 20,
  },
  gangWarResultText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
  },
  gangWarRewardText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  specialFeatureInfo: {
    marginTop: 10,
    padding: 10,
    backgroundColor: 'rgba(155, 89, 182, 0.3)',
    borderRadius: 10,
    width: '100%',
    borderWidth: 1,
    borderColor: '#9b59b6',
  },
  specialFeatureTitle: {
    color: '#FFCC00',
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  specialFeatureText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#FFFFFF',
  },
  // Armed Robbery Styles
  robberyOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  robberyContainer: {
    width: '90%',
    maxWidth: 350,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
  },
  robberyContent: {
    padding: 20,
    alignItems: 'center',
  },
  robberyTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
    marginBottom: 15,
  },
  robberyTimerContainer: {
    backgroundColor: 'rgba(255,0,0,0.3)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#FF0000',
  },
  robberyTimer: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  robberyInstructions: {
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
    fontWeight: 'bold',
  },
  robberyTapArea: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
    width: '80%',
    marginBottom: 10,
  },
  robberyAmount: {
    color: '#4CAF50',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 10,
  },
  robberyTapCount: {
    color: '#CCCCCC',
    fontSize: 14,
  },
  robberyResultContainer: {
    alignItems: 'center',
    padding: 20,
  },
  robberyResultText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    marginTop: 15,
    marginBottom: 10,
  },
  robberyRewardText: {
    fontSize: 20,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  robberyStatsText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  dangerFeature: {
    backgroundColor: 'rgba(231, 76, 60, 0.3)',
    borderColor: '#e74c3c',
  },
  dangerTitle: {
    color: '#FF5252',
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  // Police Styles
  policeOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  policeContainer: {
    width: '90%',
    maxWidth: 350,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
  },
  policeContent: {
    padding: 20,
    alignItems: 'center',
  },
  policeLights: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 15,
  },
  policeLight: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginHorizontal: 10,
    opacity: 0.8,
  },
  redLight: {
    backgroundColor: '#f44336',
    shadowColor: '#f44336',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  blueLight: {
    backgroundColor: '#2196f3',
    shadowColor: '#2196f3',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  policeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 15,
  },
  policeSymbols: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 15,
  },
  policeSymbol: {
    fontSize: 30,
    marginHorizontal: 5,
  },
  policeMessage: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 22,
  },
  policeFeature: {
    backgroundColor: 'rgba(33, 150, 243, 0.3)',
    borderColor: '#1a237e',
  },
  // Overdose Styles
  overdoseOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  overdoseContainer: {
    width: '90%',
    maxWidth: 350,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
  },
  overdoseContent: {
    padding: 20,
    alignItems: 'center',
  },
  overdoseTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginVertical: 15,
  },
  overdoseMessage: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 15,
  },
  pillContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  pillSymbol: {
    fontSize: 30,
    marginHorizontal: 5,
  },
  overdoseFeature: {
    backgroundColor: 'rgba(106, 13, 173, 0.3)',
    borderColor: '#9400d3',
  },
  // Bonus Styles
  bonusFeature: {
    backgroundColor: 'rgba(46, 204, 113, 0.3)',
    borderColor: '#2ecc71',
  },
  bonusTitle: {
    color: '#2ecc71',
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  robberyInfo: {
    color: '#CCCCCC',
    fontSize: 12,
    marginTop: 5,
  },
}); 