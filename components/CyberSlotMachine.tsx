import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Easing, Text, Platform, ScrollView, Dimensions, TextInput } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCasino } from '../context/CasinoContext';

// Cyberpunk themed slot symbols with probabilities and payouts
const SYMBOLS = [
  { symbol: '💾', name: 'floppy', value: 1, probability: 0.20 },
  { symbol: '📟', name: 'pager', value: 2, probability: 0.18 },
  { symbol: '📼', name: 'cassette', value: 3, probability: 0.15 },
  { symbol: '🖥️', name: 'computer', value: 5, probability: 0.12 },
  { symbol: '🔒', name: 'lock', value: 8, probability: 0.10 },
  { symbol: '⚡', name: 'power', value: 12, probability: 0.08 },
  { symbol: '🌐', name: 'network', value: 15, probability: 0.07 },
  { symbol: '🤖', name: 'robot', value: 25, probability: 0.05 },
  { symbol: '👾', name: 'invader', value: 40, probability: 0.03 },
  { symbol: '📡', name: 'satellite', value: 75, probability: 0.015 },
  { symbol: '🔍', name: 'decrypt', value: 150, probability: 0.005 },
];

// Special symbols that can appear through "glitches"
const GLITCH_SYMBOLS = [
  { symbol: '🧨', name: 'virus', value: -20, effect: 'Bad glitch! Lose credits.' },
  { symbol: '🔑', name: 'key', value: 50, effect: 'Unlocks bonus credits!' },
  { symbol: '💯', name: 'multiplier', value: 2, effect: 'Multiplies your win!' },
  { symbol: '🔄', name: 'refresh', value: 0, effect: 'Respins one column!' },
];

// Easter egg and secret features
const SECRET_CODES = {
  KONAMI: [38, 38, 40, 40, 37, 39, 37, 39, 66, 65], // Up Up Down Down Left Right Left Right B A
  L33T: [76, 51, 51, 84], // "L33T"
  DEBUG: [68, 69, 66, 85, 71], // "DEBUG"
  SUDO: [83, 85, 68, 79], // "SUDO"
};

const POWER_UPS = [
  { 
    id: 'overclock',
    name: 'CPU Overclock', 
    description: 'Multiplies all wins by 3x for the next 3 spins',
    symbol: '⚡',
    duration: 3,
    effect: 'multiplier',
    value: 3
  },
  { 
    id: 'firewall',
    name: 'Firewall', 
    description: 'Blocks all negative glitches for the next 5 spins',
    symbol: '🛡️',
    duration: 5,
    effect: 'protection'
  },
  { 
    id: 'debugger',
    name: 'Debugger', 
    description: 'Reveals optimal patterns and increases win chance',
    symbol: '🐞',
    duration: 2,
    effect: 'reveal'
  }
];

const DEBUFFS = [
  {
    id: 'virus',
    name: 'System Virus',
    description: 'Infects random positions, reducing winnings',
    symbol: '🦠',
    duration: 3,
    effect: 'reduce_wins',
    value: 0.5 // 50% reduction
  },
  {
    id: 'memoryLeak',
    name: 'Memory Leak',
    description: 'Gradually decreases credits each spin',
    symbol: '💧',
    duration: 4,
    effect: 'drain_credits',
    value: 5 // Credits lost per spin
  },
  {
    id: 'kernelPanic',
    name: 'Kernel Panic',
    description: 'Freezes random positions, making them unmatchable',
    symbol: '❄️',
    duration: 2,
    effect: 'freeze_positions'
  }
];

const HIDDEN_SPINS = [
  {
    id: 'backdoor',
    name: 'Backdoor Access',
    description: '5 free spins with increased win rate',
    trigger: 'sequence', // Triggered by specific symbol sequence
    spins: 5,
    winMultiplier: 1.5
  },
  {
    id: 'rootAccess',
    name: 'Root Access',
    description: 'Guaranteed win with special pattern',
    trigger: 'code', // Triggered by secret code
    pattern: 'Network Exploit'
  },
  {
    id: 'stealthMode',
    name: 'Stealth Mode',
    description: 'Hidden symbols with mega win potential',
    trigger: 'random', // Randomly triggered
    probability: 0.05,
    megaWinMultiplier: 5
  }
];

// Define grid dimensions
const GRID_COLS = 5;
const GRID_ROWS = 4;
const REEL_ITEMS = 20; // For animation

// Define special patterns (coordinates in the grid)
const SPECIAL_PATTERNS = [
  { 
    name: 'Firewall Breach',
    pattern: [
      [0,0], [0,1], [0,2], [0,3], [0,4],
      [1,0], [2,0], [3,0], [3,1], [3,2], [3,3], [3,4]
    ],
    multiplier: 5
  },
  { 
    name: 'Mainframe Access',
    pattern: [
      [0,0], [1,0], [2,0], [3,0],
      [0,4], [1,4], [2,4], [3,4],
      [1,1], [1,2], [1,3], [2,1], [2,2], [2,3] 
    ],
    multiplier: 8
  },
  { 
    name: 'Network Exploit',
    pattern: [
      [0,0], [0,4], [3,0], [3,4], 
      [1,1], [1,3], [2,1], [2,3], 
      [1,2], [2,2]
    ],
    multiplier: 12
  },
];

// Create a new glow animation duration constant
const GLOW_ANIMATION_DURATION = 1500;

export default function CyberSlotMachine() {
  // Global casino state
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
  const [grid, setGrid] = useState(
    Array(GRID_ROWS).fill(0).map(() => 
      Array(GRID_COLS).fill(0).map(() => Math.floor(Math.random() * SYMBOLS.length))
    )
  );
  const [win, setWin] = useState(0);
  const [message, setMessage] = useState('');
  const [hackAvailable, setHackAvailable] = useState(false);
  const [selectedHackCol, setSelectedHackCol] = useState(-1);
  const [glitchActive, setGlitchActive] = useState(false);
  const [glitchCoordinates, setGlitchCoordinates] = useState([]);
  const [hackCharge, setHackCharge] = useState(0);
  // Add state to track winning positions
  const [winningPositions, setWinningPositions] = useState([]);
  const [glowOpacity] = useState(new Animated.Value(0));
  
  // Easter egg and secret feature states
  const [keySequence, setKeySequence] = useState([]);
  const [activePowerUps, setActivePowerUps] = useState([]);
  const [activeDebuffs, setActiveDebuffs] = useState([]);
  const [hiddenSpinActive, setHiddenSpinActive] = useState(false);
  const [hiddenSpinType, setHiddenSpinType] = useState(null);
  const [freeSpinsRemaining, setFreeSpinsRemaining] = useState(0);
  const [secretCodeInput, setSecretCodeInput] = useState('');
  const [debugMode, setDebugMode] = useState(false);
  const [frozenPositions, setFrozenPositions] = useState([]);
  const [easterEggsDiscovered, setEasterEggsDiscovered] = useState([]);
  const [touchSequence, setTouchSequence] = useState([]);
  const [consecutiveWins, setConsecutiveWins] = useState(0);
  
  // Animation values for each column
  const colPositions = useRef(Array(GRID_COLS).fill(0).map(() => new Animated.Value(0))).current;
  
  // Reference to track if effects are mounted
  const isMounted = useRef(true);
  
  // Add machine ID for tracking
  const MACHINE_ID = 'cyberSlots';
  
  // Set the last machine when component mounts
  useEffect(() => {
    setLastMachine(MACHINE_ID);
  }, []);
  
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Track key presses for secret codes
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Add the key code to the sequence
      const newSequence = [...keySequence, e.keyCode];
      
      // Keep only the last 10 keys pressed
      if (newSequence.length > 10) {
        newSequence.shift();
      }
      
      setKeySequence(newSequence);
      
      // Check for any matching secret codes
      Object.entries(SECRET_CODES).forEach(([codeName, sequence]) => {
        if (arraysMatch(newSequence.slice(-sequence.length), sequence)) {
          activateSecretCode(codeName);
        }
      });
    };
    
    // Add event listener for secret key combinations
    if (Platform.OS === 'web') {
      window.addEventListener('keydown', handleKeyDown);
      
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [keySequence]);

  // Check for power-up and debuff expiration
  useEffect(() => {
    if (activePowerUps.length > 0 || activeDebuffs.length > 0) {
      // Decrement duration on each spin
      const updateEffects = () => {
        // Update power-ups
        const updatedPowerUps = activePowerUps
          .map(powerUp => ({
            ...powerUp,
            remainingDuration: powerUp.remainingDuration - 1
          }))
          .filter(powerUp => powerUp.remainingDuration > 0);
        
        // Update debuffs
        const updatedDebuffs = activeDebuffs
          .map(debuff => ({
            ...debuff,
            remainingDuration: debuff.remainingDuration - 1
          }))
          .filter(debuff => debuff.remainingDuration > 0);
        
        setActivePowerUps(updatedPowerUps);
        setActiveDebuffs(updatedDebuffs);
        
        // Notify about expired effects
        const expiredPowerUps = activePowerUps.filter(p => p.remainingDuration === 1);
        const expiredDebuffs = activeDebuffs.filter(d => d.remainingDuration === 1);
        
        if (expiredPowerUps.length > 0) {
          setMessage(`${expiredPowerUps.map(p => p.name).join(', ')} expired!`);
        } else if (expiredDebuffs.length > 0) {
          setMessage(`${expiredDebuffs.map(d => d.name).join(', ')} cleared!`);
        }
      };
      
      // Only update after a spin completes
      if (!spinning && win !== null) {
        updateEffects();
      }
    }
  }, [spinning, win]);

  // Track consecutive wins for easter eggs
  useEffect(() => {
    if (win > 0) {
      setConsecutiveWins(prev => prev + 1);
      
      // Easter egg: Unlock Overclock after 5 consecutive wins
      if (consecutiveWins === 4 && !activePowerUps.some(p => p.id === 'overclock')) {
        activatePowerUp('overclock');
        setEasterEggsDiscovered(prev => 
          prev.includes('consecutive_wins') ? prev : [...prev, 'consecutive_wins']
        );
        setMessage('ACHIEVEMENT UNLOCKED: OVERCLOCK ACTIVATED! 🏆');
      }
    } else if (win === 0 && !spinning) {
      setConsecutiveWins(0);
    }
  }, [win, spinning]);

  // Increment touch sequence for mobile easter eggs
  const trackTouchSequence = (position) => {
    const newSequence = [...touchSequence, position];
    
    // Keep only the last 6 touches
    if (newSequence.length > 6) {
      newSequence.shift();
    }
    
    setTouchSequence(newSequence);
    
    // Check for 'clockwise circle' pattern (0,1,2,5,8,7,6,3,0)
    const clockwisePattern = [0, 1, 2, 5, 8, 7, 6, 3, 0];
    let patternMatched = true;
    
    if (newSequence.length >= 5) {
      // Check if the sequence contains a circular pattern in any direction
      for (let i = 0; i < newSequence.length - 4; i++) {
        if (
          (newSequence[i] === 0 || newSequence[i] === 1 || newSequence[i] === 3 || newSequence[i] === 4) &&
          (newSequence[i+4] === newSequence[i])
        ) {
          activateHiddenSpin('stealth');
          break;
        }
      }
    }
  };

  // Helper to check if arrays match
  const arraysMatch = (arr1, arr2) => {
    if (arr1.length !== arr2.length) return false;
    return arr1.every((val, idx) => val === arr2[idx]);
  };

  // Activate secret code effects
  const activateSecretCode = (codeName) => {
    if (easterEggsDiscovered.includes(`code_${codeName}`)) {
      return; // Already discovered
    }
    
    setEasterEggsDiscovered(prev => [...prev, `code_${codeName}`]);
    
    switch (codeName) {
      case 'KONAMI':
        // 30 free spins
        setFreeSpinsRemaining(30);
        setMessage('KONAMI CODE ACTIVATED! 30 FREE SPINS! 🎮');
        break;
      case 'L33T':
        // Activate Overclock power-up
        activatePowerUp('overclock');
        setMessage('1337 M0D3 4CT1V4T3D! OVERCLOCK ENGAGED! 🔥');
        break;
      case 'DEBUG':
        // Enable debug mode
        setDebugMode(true);
        activatePowerUp('debugger');
        setMessage('DEBUG MODE ENGAGED! SYSTEM VULNERABILITIES EXPOSED! 🐞');
        break;
      case 'SUDO':
        // Root access
        activateHiddenSpin('root');
        addGlobalCredits(5000);
        setMessage('SUPERUSER DO! +5000 CREDITS & ROOT ACCESS GRANTED! 🔑');
        break;
    }
  };

  // Activate a power-up
  const activatePowerUp = (powerUpId) => {
    const powerUp = POWER_UPS.find(p => p.id === powerUpId);
    if (!powerUp) return;
    
    // Check if already active and just refresh duration
    const existingIndex = activePowerUps.findIndex(p => p.id === powerUpId);
    
    if (existingIndex >= 0) {
      const newPowerUps = [...activePowerUps];
      newPowerUps[existingIndex].remainingDuration = powerUp.duration;
      setActivePowerUps(newPowerUps);
    } else {
      setActivePowerUps(prev => [
        ...prev,
        {
          ...powerUp,
          remainingDuration: powerUp.duration
        }
      ]);
    }
    
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  // Apply debuff effect
  const applyDebuff = (debuffId) => {
    const debuff = DEBUFFS.find(d => d.id === debuffId);
    if (!debuff) return;
    
    // Check for firewall protection
    if (activePowerUps.some(p => p.id === 'firewall')) {
      setMessage('FIREWALL BLOCKED A SYSTEM VIRUS! 🛡️');
      return;
    }
    
    // Add debuff to active list
    setActiveDebuffs(prev => [
      ...prev,
      {
        ...debuff,
        remainingDuration: debuff.duration
      }
    ]);
    
    // Apply immediate effects
    if (debuff.id === 'kernelPanic') {
      // Freeze 2-4 random positions
      const numFrozen = 2 + Math.floor(Math.random() * 3);
      const newFrozenPositions = [];
      
      for (let i = 0; i < numFrozen; i++) {
        const row = Math.floor(Math.random() * GRID_ROWS);
        const col = Math.floor(Math.random() * GRID_COLS);
        newFrozenPositions.push([row, col]);
      }
      
      setFrozenPositions(newFrozenPositions);
    }
    
    setMessage(`WARNING: ${debuff.name} DETECTED! ${debuff.symbol}`);
    
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  // Activate hidden spin
  const activateHiddenSpin = (spinId) => {
    const hiddenSpin = HIDDEN_SPINS.find(s => s.id === spinId);
    if (!hiddenSpin) return;
    
    setHiddenSpinActive(true);
    setHiddenSpinType(hiddenSpin);
    
    if (hiddenSpin.id === 'backdoor') {
      setFreeSpinsRemaining(hiddenSpin.spins);
      setMessage('BACKDOOR ACCESS GRANTED! 5 FREE SPINS!');
    } else if (hiddenSpin.id === 'stealthMode') {
      setMessage('STEALTH MODE ENGAGED! INVISIBLE SYMBOLS ACTIVE!');
    } else if (hiddenSpin.id === 'rootAccess') {
      setMessage('ROOT ACCESS GRANTED! GUARANTEED WIN!');
    }
    
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  // Check for random events after spin
  const checkRandomEvents = () => {
    // Random debuff chance (5%)
    if (Math.random() < 0.05 && !activeDebuffs.length) {
      const randomDebuff = DEBUFFS[Math.floor(Math.random() * DEBUFFS.length)];
      applyDebuff(randomDebuff.id);
    }
    
    // Random power-up chance (3%)
    if (Math.random() < 0.03 && !activePowerUps.length) {
      const randomPowerUp = POWER_UPS[Math.floor(Math.random() * POWER_UPS.length)];
      activatePowerUp(randomPowerUp.id);
      setMessage(`POWER-UP FOUND: ${randomPowerUp.name}! ${randomPowerUp.symbol}`);
    }
    
    // Random hidden spin chance (1%)
    if (Math.random() < 0.01 && !hiddenSpinActive) {
      activateHiddenSpin('stealthMode');
    }
  };

  // Apply active power-ups to win amount
  const applyPowerUpEffects = (winAmount) => {
    let modifiedWin = winAmount;
    
    activePowerUps.forEach(powerUp => {
      if (powerUp.effect === 'multiplier') {
        modifiedWin *= powerUp.value;
        setMessage(`${powerUp.name} MULTIPLIED WIN BY ${powerUp.value}X! 💰`);
      }
    });
    
    return modifiedWin;
  };

  // Apply active debuffs to win amount
  const applyDebuffEffects = (winAmount) => {
    let modifiedWin = winAmount;
    
    activeDebuffs.forEach(debuff => {
      if (debuff.effect === 'reduce_wins') {
        modifiedWin = Math.floor(modifiedWin * debuff.value);
      } else if (debuff.effect === 'drain_credits') {
        subtractCredits(debuff.value);
        setMessage(`${debuff.name} drained ${debuff.value} credits! 💧`);
      }
    });
    
    return modifiedWin;
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

  // Check if player has enough hack charge to perform a hack
  const canHack = () => {
    const result = hackCharge >= 100;
    console.log("Can hack?", result, "Hack charge:", hackCharge);
    return result;
  };

  // Track hack charge changes and auto-enable hack availability when full
  useEffect(() => {
    // Always enable hack when charge is 100%, regardless of current hackAvailable state
    if (hackCharge >= 100) {
      setHackAvailable(true);
      
      // Show hint message when hack is ready, but only if not already visible
      if (message !== 'HACK READY! TAP COLUMN TO OPTIMIZE!') {
        setMessage('HACK READY! TAP COLUMN TO OPTIMIZE!');
        setTimeout(() => {
          if (isMounted.current && message === 'HACK READY! TAP COLUMN TO OPTIMIZE!') {
            setMessage('');
          }
        }, 3000);
      }
    }
  }, [hackCharge, message]);

  // Handle hack column selection
  const selectHackColumn = (colIndex) => {
    console.log("selectHackColumn called", { hackAvailable, canHack: canHack(), spinning, colIndex });
    
    // Double-check the conditions here
    if (!hackAvailable || !canHack() || spinning) {
      console.log("Hack not available or spinning");
      return;
    }
    
    try {
      setSelectedHackCol(colIndex);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          .catch(err => console.log("Haptics error:", err));
      }
      
      // Fill column with better symbols
      const newGrid = [...grid];
      for (let row = 0; row < GRID_ROWS; row++) {
        // Weighted selection favoring better symbols
        const rand = Math.random();
        if (rand < 0.6) {
          // Higher value symbols (indices 5-10)
          const symbolIndex = 5 + Math.floor(Math.random() * 6);
          newGrid[row][colIndex] = symbolIndex;
        } else {
          // Random symbol
          newGrid[row][colIndex] = Math.floor(Math.random() * SYMBOLS.length);
        }
      }
      
      // Update the state in a safe way
      setGrid(newGrid);
      setHackCharge(0);
      setHackAvailable(false);
      setMessage('HACK SUCCESSFUL! COLUMN OPTIMIZED!');
      
      // Give immediate visual feedback even if animation is slow
      // Force a UI update
      setTimeout(() => {
        // Calculate winnings after hack (there might be a match now)
        if (isMounted.current) {
          calculateWinnings(newGrid);
          // Clear selection after a delay
          setTimeout(() => {
            if (isMounted.current) {
              setSelectedHackCol(-1);
              if (message === 'HACK SUCCESSFUL! COLUMN OPTIMIZED!') {
                setMessage('');
              }
            }
          }, 1000);
        }
      }, 500);
    } catch (err) {
      console.error("Error in selectHackColumn:", err);
      // Reset states in case of error
      setHackAvailable(false);
      setSelectedHackCol(-1);
      setMessage('HACK FAILED. SYSTEM ERROR.');
    }
  };

  // Trigger a random glitch
  const triggerGlitch = (newGrid) => {
    // Random chance for a glitch (10%)
    if (Math.random() < 0.1) {
      setGlitchActive(true);
      
      // Select 1-3 random positions to glitch
      const numGlitches = 1 + Math.floor(Math.random() * 3);
      const glitchedPositions = [];
      
      for (let i = 0; i < numGlitches; i++) {
        const row = Math.floor(Math.random() * GRID_ROWS);
        const col = Math.floor(Math.random() * GRID_COLS);
        glitchedPositions.push([row, col]);
        
        // Select a random glitch symbol
        const glitchIndex = Math.floor(Math.random() * GLITCH_SYMBOLS.length);
        const glitchSymbol = GLITCH_SYMBOLS[glitchIndex];
        
        // Store original symbol index in grid for later use
        newGrid[row][col] = -1 - glitchIndex; // Negative to indicate glitch symbol
      }
      
      setGlitchCoordinates(glitchedPositions);
      
      // Show glitch message
      setMessage('SYSTEM GLITCH DETECTED');
      
      // Clear glitch after calculation
      setTimeout(() => {
        if (isMounted.current) {
          setGlitchActive(false);
          setGlitchCoordinates([]);
        }
      }, 3000);
    }
    
    return newGrid;
  };

  // Handle glitch effects
  const applyGlitchEffects = (winAmount) => {
    let finalWin = winAmount;
    let glitchMessages = [];
    
    // Process each glitched position
    glitchCoordinates.forEach(([row, col]) => {
      const glitchSymbolIndex = -1 - grid[row][col]; // Convert back from negative
      const glitchSymbol = GLITCH_SYMBOLS[glitchSymbolIndex];
      
      if (glitchSymbol.name === 'virus') {
        // Virus: lose credits
        finalWin = Math.max(0, finalWin + glitchSymbol.value);
        glitchMessages.push('Virus detected! -20 credits');
      } else if (glitchSymbol.name === 'key') {
        // Key: bonus credits
        finalWin += glitchSymbol.value;
        glitchMessages.push('Access key found! +50 credits');
      } else if (glitchSymbol.name === 'multiplier') {
        // Multiplier: double win
        finalWin *= glitchSymbol.value;
        glitchMessages.push('Win multiplier x2!');
      } else if (glitchSymbol.name === 'refresh') {
        // Refresh: This doesn't change the win amount, just visual feedback
        glitchMessages.push('Column refresh activated!');
        
        // Will trigger a respin of the column after payout
        setTimeout(() => {
          if (isMounted.current && !spinning) {
            respinColumn(col);
          }
        }, 2000);
      }
    });
    
    // Show glitch messages
    if (glitchMessages.length > 0) {
      setMessage(glitchMessages.join(' • '));
      setTimeout(() => {
        if (isMounted.current) setMessage('');
      }, 3000);
    }
    
    return finalWin;
  };

  // Respin a single column
  const respinColumn = (colIndex) => {
    // Generate new symbols for the column
    const newGrid = [...grid];
    for (let row = 0; row < GRID_ROWS; row++) {
      newGrid[row][colIndex] = Math.floor(Math.random() * SYMBOLS.length);
    }
    
    // Animate just that column - with improved error handling
    colPositions[colIndex].setValue(0);
    try {
      Animated.timing(colPositions[colIndex], {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false, // Use JS driver for compatibility
      }).start((finished) => {
        if (isMounted.current) {
          setGrid(newGrid);
          // Check for new wins after respin
          if (finished) {
            calculateWinnings(newGrid);
          }
        }
      });
    } catch (error) {
      console.error("Respin animation error:", error);
      // Update state even if animation fails
      setGrid(newGrid);
      calculateWinnings(newGrid);
    }
    
    setMessage(`Respinning column ${colIndex + 1}`);
    setTimeout(() => {
      if (isMounted.current) setMessage('');
    }, 2000);
  };

  // Spin the grid
  const spin = () => {
    if (spinning) return;
    
    // Calculate effective bet
    const effectiveBet = bet;
    
    // Check if we have free spins
    const usingFreeSpin = freeSpinsRemaining > 0;
    
    if (!usingFreeSpin && credits < effectiveBet) {
      setMessage('Not enough credits!');
      setTimeout(() => setMessage(''), 2000);
      return;
    }
    
    // Only use haptics on native platforms
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    // Deduct credits if not using free spin
    if (!usingFreeSpin) {
      subtractCredits(effectiveBet);
    } else {
      setFreeSpinsRemaining(prev => prev - 1);
    }
    
    setSpinning(true);
    setWin(0);
    setMessage('');
    setSelectedHackCol(-1);
    
    // Apply memory leak debuff effect (drain credits)
    const memoryLeakDebuff = activeDebuffs.find(d => d.id === 'memoryLeak');
    if (memoryLeakDebuff) {
      subtractCredits(memoryLeakDebuff.value);
      setMessage(`${memoryLeakDebuff.name} drained ${memoryLeakDebuff.value} credits! 💧`);
      
      setTimeout(() => {
        if (isMounted.current) setMessage('');
      }, 1500);
    }
    
    // Random chance to enable hacking after spin (20%)
    if (Math.random() < 0.2 && hackCharge < 100) {
      const newCharge = Math.min(hackCharge + 25, 100);
      setHackCharge(newCharge);
      
      // If this charge increment results in 100%, a separate useEffect will handle enabling hack
    }
    
    // Generate new grid with random symbols
    let newGrid = Array(GRID_ROWS).fill(0).map(() => 
      Array(GRID_COLS).fill(0).map(() => {
        // Check if this position is frozen
        const row = 0; // Current row being generated
        const col = 0; // Current column being generated
        
        if (frozenPositions.some(([r, c]) => r === row && c === col)) {
          // Use existing symbol
          return grid[row][col];
        }
        
        // Apply weighted probability for symbols
        let rand = Math.random();
        
        // Modify probabilities based on active effects
        if (debugMode || activePowerUps.some(p => p.id === 'debugger')) {
          // Increase chance of high-value symbols in debug mode
          rand = Math.min(rand + 0.2, 0.99);
        }
        
        if (hiddenSpinActive && hiddenSpinType?.id === 'rootAccess') {
          // For root access, force high value symbols
          return 6 + Math.floor(Math.random() * 5); // Indices 6-10 (higher value symbols)
        }
        
        let cumulativeProbability = 0;
        
        for (let i = 0; i < SYMBOLS.length; i++) {
          cumulativeProbability += SYMBOLS[i].probability;
          if (rand < cumulativeProbability) {
            return i;
          }
        }
        return 0; // Default to first symbol
      })
    );
    
    // Check for glitches unless prevented by firewall
    if (!activePowerUps.some(p => p.id === 'firewall')) {
      newGrid = triggerGlitch(newGrid);
    }
    
    // For root access, ensure a winning pattern
    if (hiddenSpinActive && hiddenSpinType?.id === 'rootAccess') {
      // Force a Network Exploit pattern with high-value symbols
      const pattern = SPECIAL_PATTERNS.find(p => p.name === 'Network Exploit');
      if (pattern) {
        const highValueSymbol = 7; // Index of a high-value symbol
        
        // Apply the pattern to the grid
        pattern.pattern.forEach(([row, col]) => {
          newGrid[row][col] = highValueSymbol;
        });
      }
    }
    
    // Set the grid for later use
    setGrid(newGrid);
    
    // Animate each column with different durations - fix animation issues
    const animations = colPositions.map((position, index) => {
      // Reset position
      position.setValue(0);
      
      // Add a delay for each subsequent column
      const duration = 1000 + (index * 200);
      
      return Animated.timing(position, {
        toValue: 1,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false, // Use JS driver instead of native for compatibility
      });
    });
    
    // Use sequential animation with error handling
    try {
      Animated.stagger(150, animations).start((finished) => {
        if (isMounted.current) {
          setSpinning(false);
          
          // Only continue if animation completed successfully
          if (finished) {
            // Add hack charge occasionally
            if (Math.random() < 0.3 && hackCharge < 100) {
              const newCharge = Math.min(hackCharge + 25, 100);
              setHackCharge(newCharge);
            }
            
            // Calculate winnings
            calculateWinnings(newGrid);
            
            // Check for random events
            checkRandomEvents();
            
            // Clear hidden spin flag after use
            if (hiddenSpinActive) {
              setHiddenSpinActive(false);
              setHiddenSpinType(null);
            }
          } else {
            console.log("Animation was interrupted or didn't finish");
            // Still calculate winnings even if animation failed
            calculateWinnings(newGrid);
          }
        }
      });
    } catch (error) {
      console.error("Animation error:", error);
      // Ensure we still complete the spin even if animation fails
      setSpinning(false);
      calculateWinnings(newGrid);
    }
  };
  
  // Calculate winnings based on grid
  const calculateWinnings = (gridData) => {
    let totalWin = 0;
    let matchedPatterns = [];
    // Create array to store winning positions
    let newWinningPositions = [];
    
    // First, check for horizontal matches (3+ in a row)
    for (let row = 0; row < GRID_ROWS; row++) {
      let currentSymbol = gridData[row][0];
      let count = 1;
      let positions = [[row, 0]]; // Start tracking positions
      
      // Skip if it's a glitch symbol (negative index)
      if (currentSymbol < 0) {
        currentSymbol = gridData[row][1];
        count = 0;
        positions = [];
      }
      
      for (let col = 1; col < GRID_COLS; col++) {
        if (gridData[row][col] === currentSymbol && gridData[row][col] >= 0) {
          count++;
          positions.push([row, col]); // Track position
        } else {
          // If we have at least 3 matches, calculate win
          if (count >= 3) {
            const symbolValue = SYMBOLS[currentSymbol].value;
            let winMultiplier = count === 3 ? 1 : count === 4 ? 3 : 10;
            
            // Apply boost for stealth mode
            if (hiddenSpinActive && hiddenSpinType?.id === 'stealthMode') {
              winMultiplier *= hiddenSpinType.megaWinMultiplier;
              matchedPatterns.push(`STEALTH BOOST: ${hiddenSpinType.megaWinMultiplier}x MULTIPLIER`);
            }
            
            totalWin += bet * symbolValue * winMultiplier;
            matchedPatterns.push(`Row ${row + 1}: ${count}x ${SYMBOLS[currentSymbol].name}`);
            
            // Add positions to winning positions array
            newWinningPositions = [...newWinningPositions, ...positions];
          }
          
          // Reset for next potential match
          currentSymbol = gridData[row][col];
          count = 1;
          positions = [[row, col]]; // Reset positions
          
          // Skip if it's a glitch symbol
          if (currentSymbol < 0) {
            count = 0;
            positions = [];
            if (col < GRID_COLS - 1) {
              currentSymbol = gridData[row][col + 1];
            }
          }
        }
      }
      
      // Check at the end of row
      if (count >= 3) {
        const symbolValue = SYMBOLS[currentSymbol].value;
        let winMultiplier = count === 3 ? 1 : count === 4 ? 3 : 10;
        
        // Apply boost for stealth mode
        if (hiddenSpinActive && hiddenSpinType?.id === 'stealthMode') {
          winMultiplier *= hiddenSpinType.megaWinMultiplier;
          matchedPatterns.push(`STEALTH BOOST: ${hiddenSpinType.megaWinMultiplier}x MULTIPLIER`);
        }
        
        totalWin += bet * symbolValue * winMultiplier;
        matchedPatterns.push(`Row ${row + 1}: ${count}x ${SYMBOLS[currentSymbol].name}`);
        
        // Add positions to winning positions array
        newWinningPositions = [...newWinningPositions, ...positions];
      }
    }
    
    // Check for vertical matches (3+ in a column)
    for (let col = 0; col < GRID_COLS; col++) {
      let currentSymbol = gridData[0][col];
      let count = 1;
      let positions = [[0, col]]; // Start tracking positions
      
      // Skip if it's a glitch symbol
      if (currentSymbol < 0) {
        currentSymbol = gridData[1][col];
        count = 0;
        positions = [];
      }
      
      for (let row = 1; row < GRID_ROWS; row++) {
        if (gridData[row][col] === currentSymbol && gridData[row][col] >= 0) {
          count++;
          positions.push([row, col]); // Track position
        } else {
          // If we have at least 3 matches, calculate win
          if (count >= 3) {
            const symbolValue = SYMBOLS[currentSymbol].value;
            const winMultiplier = count === 3 ? 1 : 2; // Lower multiplier for vertical matches
            totalWin += bet * symbolValue * winMultiplier;
            matchedPatterns.push(`Column ${col + 1}: ${count}x ${SYMBOLS[currentSymbol].name}`);
            
            // Add positions to winning positions array
            newWinningPositions = [...newWinningPositions, ...positions];
          }
          
          // Reset for next potential match
          currentSymbol = gridData[row][col];
          count = 1;
          positions = [[row, col]]; // Reset positions
          
          // Skip if it's a glitch symbol
          if (currentSymbol < 0) {
            count = 0;
            positions = [];
            if (row < GRID_ROWS - 1) {
              currentSymbol = gridData[row + 1][col];
            }
          }
        }
      }
      
      // Check at the end of column
      if (count >= 3) {
        const symbolValue = SYMBOLS[currentSymbol].value;
        const winMultiplier = count === 3 ? 1 : 2; // Lower multiplier for vertical matches
        totalWin += bet * symbolValue * winMultiplier;
        matchedPatterns.push(`Column ${col + 1}: ${count}x ${SYMBOLS[currentSymbol].name}`);
        
        // Add positions to winning positions array
        newWinningPositions = [...newWinningPositions, ...positions];
      }
    }
    
    // Check for special patterns
    SPECIAL_PATTERNS.forEach(pattern => {
      // Count occurrences of each symbol in the pattern
      const symbolCounts = {};
      let isValid = true;
      
      // Check if all coordinates exist and there are no glitch symbols
      for (const [row, col] of pattern.pattern) {
        if (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS) {
          const symbolIndex = gridData[row][col];
          
          // If there's a glitch symbol, pattern doesn't match
          if (symbolIndex < 0) {
            isValid = false;
            break;
          }
          
          symbolCounts[symbolIndex] = (symbolCounts[symbolIndex] || 0) + 1;
        } else {
          isValid = false;
          break;
        }
      }
      
      if (isValid) {
        // Find the symbol that appears the most in the pattern
        let mostCommonSymbol = 0;
        let highestCount = 0;
        
        Object.entries(symbolCounts).forEach(([symbol, count]) => {
          if (count > highestCount) {
            mostCommonSymbol = parseInt(symbol);
            highestCount = count;
          }
        });
        
        // Need at least 50% of pattern to be the same symbol to trigger
        const patternSize = pattern.pattern.length;
        const threshold = Math.floor(patternSize / 2);
        
        if (highestCount >= threshold) {
          const symbolValue = SYMBOLS[mostCommonSymbol].value;
          const patternWin = bet * symbolValue * pattern.multiplier;
          totalWin += patternWin;
          matchedPatterns.push(`Pattern: ${pattern.name} (${patternWin} credits)`);
          
          // Add all positions from this pattern to winning positions
          newWinningPositions = [...newWinningPositions, ...pattern.pattern];
        }
      }
    });
    
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
        if (isMounted.current) {
          setTimeout(() => {
            setWinningPositions([]);
          }, 500);
        }
      });
    }
    
    // Apply glitch effects if active
    if (glitchActive) {
      totalWin = applyGlitchEffects(totalWin);
    }
    
    // Apply power-up and debuff effects
    totalWin = applyPowerUpEffects(totalWin);
    totalWin = applyDebuffEffects(totalWin);
    
    // Apply backdoor spin boost if active
    if (hiddenSpinActive && hiddenSpinType?.id === 'backdoor') {
      totalWin *= hiddenSpinType.winMultiplier;
      matchedPatterns.push(`BACKDOOR BOOST: ${hiddenSpinType.winMultiplier}x MULTIPLIER`);
    }
    
    if (totalWin > 0) {
      setWin(Math.floor(totalWin));
      addGlobalCredits(Math.floor(totalWin));
      
      // Set message based on win amount
      if (totalWin > bet * 50) {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setMessage('SYSTEM COMPROMISED! MAJOR PAYOUT! 👾');
      } else if (totalWin > bet * 20) {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setMessage('ACCESS GRANTED! BIG WIN! 🔓');
      } else if (totalWin > bet * 10) {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setMessage('FIREWALL BREACHED! 🔥');
      } else {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setMessage('CONNECTION ESTABLISHED! WIN!');
      }
      
      // After 10 consecutive wins - big reward
      if (consecutiveWins === 9) {
        setMessage('10 CONSECUTIVE WINS! SYSTEM BACKDOOR UNLOCKED! 🎉');
        activateHiddenSpin('backdoor');
        setEasterEggsDiscovered(prev => 
          prev.includes('10consecutive') ? prev : [...prev, '10consecutive']
        );
      }
    } else {
      setMessage('ACCESS DENIED! TRY AGAIN.');
    }
    
    setTimeout(() => {
      if (isMounted.current) setMessage('');
    }, 3000);
  };
  
  // Function to build a column
  const createColumn = (colIndex) => {
    const items = [];
    const finalSymbols = [];
    
    // Get symbols for this column
    for (let row = 0; row < GRID_ROWS; row++) {
      const symbolIndex = grid[row][colIndex];
      
      // Handle glitch symbols (negative indices)
      if (symbolIndex < 0) {
        const glitchIndex = -1 - symbolIndex;
        finalSymbols.push(GLITCH_SYMBOLS[glitchIndex].symbol);
      } else {
        finalSymbols.push(SYMBOLS[symbolIndex].symbol);
      }
    }
    
    // Add random symbols for animation
    for (let i = 0; i < REEL_ITEMS - GRID_ROWS; i++) {
      const randomIndex = Math.floor(Math.random() * SYMBOLS.length);
      items.push(SYMBOLS[randomIndex].symbol);
    }
    
    // Add the final visible symbols
    items.push(...finalSymbols);
    
    // Animation translation calculation
    const translateY = colPositions[colIndex].interpolate({
      inputRange: [0, 1],
      outputRange: [0, -60 * (REEL_ITEMS - GRID_ROWS)],
    });
    
    return (
      <Animated.View 
        key={`col-${colIndex}`} 
        style={[
          styles.column, 
          // Use transform without animation during hacking for reliable interaction
          selectedHackCol === colIndex && hackAvailable ? 
            { marginTop: -60 * (REEL_ITEMS - GRID_ROWS) } : 
            { transform: [{ translateY }] }
        ]}
      >
        {items.map((item, i) => {
          // Determine if this is a winning symbol (visible on the grid)
          const isVisibleItem = i >= (REEL_ITEMS - GRID_ROWS);
          const rowIndex = isVisibleItem ? (i - (REEL_ITEMS - GRID_ROWS)) : -1;
          const isWinningSymbol = isVisibleItem && winningPositions.some(
            ([row, col]) => row === rowIndex && col === colIndex
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
  
  // Render cell for a specific position
  const renderCell = (row, col) => {
    const isGlitched = glitchActive && glitchCoordinates.some(([r, c]) => r === row && c === col);
    const isHacked = col === selectedHackCol;
    
    return (
      <View 
        key={`cell-${row}-${col}`}
        style={[
          styles.gridCell,
          isGlitched && styles.glitchedCell,
          isHacked && styles.hackedCell
        ]}
      >
        {/* Cell content */}
      </View>
    );
  };
  
  return (
    <ScrollView style={styles.scrollView}>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>CyberHack 2000</ThemedText>
        
        {/* Free spins indicator */}
        {freeSpinsRemaining > 0 && (
          <View style={styles.freeSpinsIndicator}>
            <ThemedText type="smallSemiBold" style={styles.freeSpinsText}>
              FREE SPINS: {freeSpinsRemaining}
            </ThemedText>
          </View>
        )}
        
        {/* Active Power-ups and Debuffs */}
        {(activePowerUps.length > 0 || activeDebuffs.length > 0) && (
          <View style={styles.effectsContainer}>
            {activePowerUps.map((powerUp, index) => (
              <View key={`power-${index}`} style={styles.effectBadge}>
                <Text style={styles.effectSymbol}>{powerUp.symbol}</Text>
                <ThemedText type="small" style={styles.effectText}>
                  {powerUp.remainingDuration}
                </ThemedText>
              </View>
            ))}
            
            {activeDebuffs.map((debuff, index) => (
              <View key={`debuff-${index}`} style={[styles.effectBadge, styles.debuffBadge]}>
                <Text style={styles.effectSymbol}>{debuff.symbol}</Text>
                <ThemedText type="small" style={styles.effectText}>
                  {debuff.remainingDuration}
                </ThemedText>
              </View>
            ))}
          </View>
        )}
        
        {/* Debug mode indicator */}
        {debugMode && (
          <View style={styles.debugBanner}>
            <ThemedText type="smallSemiBold" style={styles.debugText}>
              DEBUG MODE ACTIVE
            </ThemedText>
          </View>
        )}
        
        {/* Credits and bet display */}
        <View style={styles.infoContainer}>
          <ThemedView style={styles.creditContainer}>
            <ThemedText type="defaultSemiBold">Credits:</ThemedText>
            <ThemedText type="subtitle">{credits}</ThemedText>
            <TouchableOpacity 
              style={styles.addButton} 
              onPress={() => {
                addCredits();
                // Track special taps in a 3x3 grid (positions 0-8)
                trackTouchSequence(4); // Center position
              }}
            >
              <ThemedText type="smallSemiBold">+1000</ThemedText>
            </TouchableOpacity>
          </ThemedView>
          
          <ThemedView style={styles.betContainer}>
            <ThemedText type="defaultSemiBold">Bet:</ThemedText>
            <View style={styles.betControls}>
              <TouchableOpacity 
                style={styles.betButton} 
                onPress={() => {
                  decreaseBet();
                  trackTouchSequence(3); // Left-middle position
                }}
                disabled={spinning || bet <= 10}
              >
                <MaterialCommunityIcons name="minus" size={18} color="#00FF41" />
              </TouchableOpacity>
              
              <ThemedText type="subtitle" style={styles.betText}>{bet}</ThemedText>
              
              <TouchableOpacity 
                style={styles.betButton} 
                onPress={() => {
                  increaseBet();
                  trackTouchSequence(5); // Right-middle position
                }}
                disabled={spinning || bet >= 100 || bet >= credits}
              >
                <MaterialCommunityIcons name="plus" size={18} color="#00FF41" />
              </TouchableOpacity>
            </View>
          </ThemedView>
        </View>
        
        {/* Hack charge meter */}
        <ThemedView style={styles.hackMeterContainer}>
          <ThemedText type="smallSemiBold">HACK POWER:</ThemedText>
          <View style={styles.hackMeter}>
            <View 
              style={[
                styles.hackCharge, 
                { width: `${hackCharge}%` },
                canHack() && styles.hackChargeReady
              ]} 
            />
          </View>
          <ThemedText type="small" style={canHack() ? styles.hackReadyText : {}}>
            {canHack() ? 'READY' : `${hackCharge}%`}
          </ThemedText>
        </ThemedView>
        
        {/* Easter egg: Secret code input (appear after discovering Konami code) */}
        {easterEggsDiscovered.includes('code_KONAMI') && (
          <View style={styles.secretCodeContainer}>
            <TextInput
              style={styles.secretCodeInput}
              placeholder="ENTER SECRET CODE"
              placeholderTextColor="#00FF41"
              value={secretCodeInput}
              onChangeText={setSecretCodeInput}
              onSubmitEditing={() => {
                // Check for custom text codes
                if (secretCodeInput.toUpperCase() === "GOD") {
                  addGlobalCredits(99999);
                  setMessage("GOD MODE ACTIVATED!");
                } else if (secretCodeInput.toUpperCase() === "MATRIX") {
                  activatePowerUp('debugger');
                  setMessage("REALITY BENDING ACTIVATED!");
                }
                setSecretCodeInput('');
              }}
            />
          </View>
        )}
        
        {/* Slot grid */}
        <ThemedView style={styles.gridContainer}>
          <View style={styles.grid}>
            {(() => {
              // Map columns to positions in a 3x3 grid for easter egg pattern tracking
              const posMap = [0, 1, 2, 5, 8];
              
              return Array(GRID_COLS).fill(0).map((_, colIndex) => (
                <TouchableOpacity
                  key={`col-container-${colIndex}`}
                  style={[
                    styles.colContainer,
                    selectedHackCol === colIndex && styles.selectedHackCol,
                    frozenPositions.some(([_, c]) => c === colIndex) && styles.frozenColumn,
                    hackAvailable && canHack() && { 
                      borderColor: '#00FF41',
                      borderWidth: 6,
                      backgroundColor: 'rgba(0, 255, 65, 0.2)',
                      shadowColor: '#00FF41',
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.8,
                      shadowRadius: 10,
                      elevation: 5,
                    }
                  ]}
                  onPress={() => {
                    if (hackAvailable && canHack() && !spinning) {
                      console.log("HACKING COLUMN:", colIndex);
                      setTimeout(() => {
                        selectHackColumn(colIndex);
                      }, 0);
                    }
                    
                    // Use colIndex directly instead of referencing posMap
                    trackTouchSequence(colIndex);
                  }}
                  activeOpacity={hackAvailable && canHack() ? 0.5 : 0.9}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {createColumn(colIndex)}
                  
                  {/* Show frozen positions */}
                  {frozenPositions
                    .filter(([_, c]) => c === colIndex)
                    .map(([row, _], index) => (
                      <View 
                        key={`frozen-${index}`}
                        style={[
                          styles.frozenIndicator,
                          { top: row * 60 + 10 } // Position based on row
                        ]}
                      >
                        <Text style={styles.frozenSymbol}>❄️</Text>
                      </View>
                    ))}
                </TouchableOpacity>
              ));
            })()}
          </View>
          
          {/* Hack instruction - make it more noticeable and interactive */}
          {hackAvailable && canHack() && (
            <View style={[styles.hackOverlay, { pointerEvents: 'none' }]}>
              <View style={styles.hackPrompt}>
                <ThemedText type="defaultSemiBold" style={styles.hackText}>
                  TAP ANY COLUMN TO HACK
                </ThemedText>
                <View style={styles.hackArrows}>
                  {Array(GRID_COLS).fill(0).map((_, i) => (
                    <MaterialCommunityIcons key={i} name="arrow-up" size={24} color="#00FF41" />
                  ))}
                </View>
              </View>
            </View>
          )}
          
          {/* Debug mode pattern highlight */}
          {debugMode && (
            <View style={styles.debugOverlay} pointerEvents="none">
              {SPECIAL_PATTERNS.map((pattern, patternIndex) => (
                <React.Fragment key={`pattern-${patternIndex}`}>
                  {pattern.pattern.map(([row, col], pointIndex) => (
                    <View
                      key={`pattern-point-${pointIndex}`}
                      style={[
                        styles.debugPoint,
                        {
                          left: col * 60 + 30,
                          top: row * 60 + 30
                        }
                      ]}
                    />
                  ))}
                </React.Fragment>
              ))}
            </View>
          )}
        </ThemedView>
        
        {/* Spin button */}
        <TouchableOpacity 
          style={[
            styles.spinButton, 
            spinning && styles.spinningButton,
            credits < bet && freeSpinsRemaining === 0 && styles.disabledButton,
            hiddenSpinActive && styles.hiddenSpinButton
          ]} 
          onPress={() => {
            spin();
            // Track as bottom-center for easter egg
            trackTouchSequence(7); // Position 7 is bottom-center
          }}
          disabled={spinning || (credits < bet && freeSpinsRemaining === 0)}
        >
          <ThemedText type="subtitle" style={styles.spinText}>
            {spinning ? 'PROCESSING...' : freeSpinsRemaining > 0 ? 'FREE RUN' : 'RUN'}
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
        
        {/* Easter eggs discovered */}
        {easterEggsDiscovered.length > 0 && (
          <TouchableOpacity 
            style={styles.easterEggsButton}
            onPress={() => setMessage(
              `EASTER EGGS: ${easterEggsDiscovered.length} DISCOVERED!`
            )}
          >
            <ThemedText type="small" style={styles.easterEggsText}>
              🥚 {easterEggsDiscovered.length}
            </ThemedText>
          </TouchableOpacity>
        )}
        
        {/* Payout info */}
        <ThemedView style={styles.payoutContainer}>
          <ThemedText type="subtitle" style={styles.payoutTitle}>DATA VALUES</ThemedText>
          <View style={styles.payoutTable}>
            {SYMBOLS.map((item, index) => (
              <View key={`payout-${index}`} style={styles.payoutRow}>
                <Text style={styles.payoutSymbol}>{item.symbol}</Text>
                <ThemedText type="small" style={styles.payoutText}>
                  {item.value}x
                </ThemedText>
              </View>
            ))}
          </View>
          
          <ThemedText type="smallSemiBold" style={styles.patternTitle}>
            PATTERNS
          </ThemedText>
          <View style={styles.patternContainer}>
            <ThemedText type="small" style={styles.patternText}>
              • 3 in a row: 1x • 4 in a row: 3x • 5 in a row: 10x
            </ThemedText>
            <ThemedText type="small" style={styles.patternText}>
              • 3 in a column: 1x • 4 in a column: 2x
            </ThemedText>
            <ThemedText type="small" style={styles.patternText}>
              • Firewall Breach: 5x • Mainframe Access: 8x
            </ThemedText>
            <ThemedText type="small" style={styles.patternText}>
              • Network Exploit: 12x
            </ThemedText>
          </View>
          
          <ThemedText type="smallSemiBold" style={styles.patternTitle}>
            SYSTEM GLITCHES
          </ThemedText>
          <View style={styles.patternContainer}>
            {GLITCH_SYMBOLS.map((item, index) => (
              <ThemedText key={`glitch-${index}`} type="small" style={styles.patternText}>
                • {item.symbol} {item.name}: {item.effect}
              </ThemedText>
            ))}
          </View>
        </ThemedView>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#0C0C0C',
  },
  title: {
    marginBottom: 10,
    color: '#00FF41', // Matrix-style green
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textShadowColor: '#00FF41',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#444',
    backgroundColor: '#111',
    padding: 10,
    borderRadius: 5,
  },
  creditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addButton: {
    backgroundColor: '#004D25',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#00FF41',
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
    backgroundColor: '#191970',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0000FF',
  },
  betText: {
    color: '#00FF41',
  },
  hackMeterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
    backgroundColor: '#111',
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#444',
  },
  hackMeter: {
    flex: 1,
    height: 10,
    backgroundColor: '#333',
    borderRadius: 5,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  hackCharge: {
    height: '100%',
    backgroundColor: '#0000FF',
  },
  hackChargeReady: {
    backgroundColor: '#00FF41',
  },
  hackReadyText: {
    color: '#00FF41',
  },
  gridContainer: {
    width: '100%',
    maxWidth: 350,
    height: 260,
    borderWidth: 3,
    borderColor: '#0000FF',
    borderRadius: 10,
    padding: 5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    position: 'relative',
    marginVertical: 10,
    overflow: 'visible',
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    height: 240,
    zIndex: 1,
  },
  colContainer: {
    width: 60,
    height: 240,
    overflow: 'hidden',
    backgroundColor: '#111',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#333',
    opacity: 1,
  },
  selectedHackCol: {
    borderColor: '#00FF41',
    borderWidth: 2,
    backgroundColor: '#002211',
  },
  column: {
    alignItems: 'center',
  },
  symbolContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  symbol: {
    fontSize: 40,
    textAlign: 'center',
    zIndex: 2,
  },
  winningSymbolContainer: {
    overflow: 'visible',
  },
  gridCell: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glitchedCell: {
    backgroundColor: 'rgba(255, 0, 0, 0.3)',
  },
  hackedCell: {
    backgroundColor: 'rgba(0, 255, 65, 0.3)',
  },
  hackOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 5,
    pointerEvents: 'box-none',
  },
  hackPrompt: {
    backgroundColor: '#000',
    padding: 15,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#00FF41',
    alignItems: 'center',
    minWidth: 250,
    shadowColor: '#00FF41',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  hackText: {
    color: '#00FF41',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 20,
    textShadowColor: '#00FF41',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    textAlign: 'center',
  },
  hackArrows: {
    flexDirection: 'row',
    marginTop: 10,
    justifyContent: 'space-around',
    width: '100%',
  },
  spinButton: {
    backgroundColor: '#191970',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 30,
    marginVertical: 10,
    borderWidth: 2,
    borderColor: '#0000FF',
  },
  spinningButton: {
    backgroundColor: '#333',
    borderColor: '#666',
  },
  disabledButton: {
    backgroundColor: '#333',
    opacity: 0.5,
  },
  spinText: {
    color: '#FFF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  winMessage: {
    backgroundColor: '#191970',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#0000FF',
  },
  winText: {
    color: '#00FF41',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  messageContainer: {
    marginTop: 10,
    padding: 10,
    borderRadius: 5,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#444',
    width: '100%',
  },
  message: {
    textAlign: 'center',
    color: '#00FF41',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  payoutContainer: {
    alignItems: 'flex-start',
    marginTop: 10,
    padding: 10,
    width: '100%',
    maxWidth: 350,
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 5,
    backgroundColor: '#111',
  },
  payoutTitle: {
    color: '#00FF41',
    marginBottom: 5,
    alignSelf: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  payoutTable: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  payoutRow: {
    width: '30%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 5,
  },
  payoutSymbol: {
    fontSize: 22,
    marginRight: 5,
  },
  payoutText: {
    color: '#00FF41',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  patternTitle: {
    color: '#00FF41',
    marginTop: 15,
    marginBottom: 5,
    alignSelf: 'flex-start',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  patternContainer: {
    width: '100%',
    alignItems: 'flex-start',
  },
  patternText: {
    color: '#00FF41',
    marginBottom: 3,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
  },
  freeSpinsIndicator: {
    backgroundColor: '#191970',
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#0000FF',
  },
  freeSpinsText: {
    color: '#00FF41',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  effectsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 10,
    width: '100%',
  },
  effectBadge: {
    backgroundColor: '#191970',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 15,
    margin: 3,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0000FF',
  },
  debuffBadge: {
    backgroundColor: '#700000',
    borderColor: '#FF0000',
  },
  effectSymbol: {
    fontSize: 16,
    marginRight: 5,
  },
  effectText: {
    color: '#00FF41',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  debugBanner: {
    backgroundColor: '#004D40',
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#00FF41',
  },
  debugText: {
    color: '#00FF41',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  secretCodeContainer: {
    width: '100%',
    marginBottom: 10,
  },
  secretCodeInput: {
    backgroundColor: '#111',
    color: '#00FF41',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#00FF41',
    textAlign: 'center',
  },
  frozenColumn: {
    borderColor: '#00BFFF',
    backgroundColor: '#101830',
  },
  frozenIndicator: {
    position: 'absolute',
    right: 5,
    zIndex: 10,
  },
  frozenSymbol: {
    fontSize: 16,
  },
  debugOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
  },
  debugPoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 255, 65, 0.7)',
    zIndex: 30,
  },
  hiddenSpinButton: {
    backgroundColor: '#6A0DAD', // Purple for hidden spin
    borderColor: '#8A2BE2',
  },
  easterEggsButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  easterEggsText: {
    color: '#FFD700',
  },
  // Add styles for winning symbols
  winningSymbol: {
    color: '#00FF41', // Matrix-style neon green for winning symbols
    textShadowColor: '#00FF41',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    zIndex: 2,
  },
  symbolGlow: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 255, 65, 0.3)',
    zIndex: 1,
    shadowColor: '#00FF41',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 10,
  },
}); 