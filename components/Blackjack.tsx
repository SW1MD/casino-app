import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, ScrollView, Platform } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCasino } from '../context/CasinoContext';

// Card suits and values
const SUITS = ['♠️', '♥️', '♦️', '♣️'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// Card colors (red for hearts and diamonds, black for clubs and spades)
const CARD_COLORS = {
  '♠️': '#000000',
  '♥️': '#E74C3C',
  '♦️': '#E74C3C',
  '♣️': '#000000',
};

/**
 * @typedef {Object} Card
 * @property {string} suit - The card suit
 * @property {string} value - The card value
 * @property {boolean} [hidden] - Whether the card is hidden
 */

export default function Blackjack() {
  // Use global casino context
  const { 
    credits, 
    defaultBet,
    updateCredits, 
    addCredits: addGlobalCredits,
    subtractCredits,
    setLastMachine
  } = useCasino();
  
  const [bet, setBet] = useState(defaultBet || 10);
  const [maxBet, setMaxBet] = useState(500);
  const [betIncrement, setBetIncrement] = useState(10);
  const [deck, setDeck] = useState([]);
  const [playerHand, setPlayerHand] = useState([]);
  const [dealerHand, setDealerHand] = useState([]);
  const [gameState, setGameState] = useState('betting');
  const [result, setResult] = useState('');
  const [message, setMessage] = useState('');
  
  // Add game ID for tracking
  const GAME_ID = 'blackjack';
  
  // Set the last machine when component mounts
  useEffect(() => {
    setLastMachine(GAME_ID);
  }, []);
  
  // Initialize or shuffle the deck
  const initializeDeck = () => {
    const newDeck = [];
    for (const suit of SUITS) {
      for (const value of VALUES) {
        newDeck.push({ suit, value });
      }
    }
    // Fisher-Yates shuffle algorithm
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    return newDeck;
  };
  
  // Start a new game
  const startGame = () => {
    if (credits < bet) {
      setMessage('Not enough credits to place bet!');
      setTimeout(() => setMessage(''), 2000);
      return;
    }
    
    subtractCredits(bet);
    const newDeck = initializeDeck();
    
    // Deal initial cards
    const dealer = [
      { ...newDeck.pop(), hidden: false },
      { ...newDeck.pop(), hidden: true }
    ];
    
    const player = [
      { ...newDeck.pop(), hidden: false },
      { ...newDeck.pop(), hidden: false }
    ];
    
    setDeck(newDeck);
    setDealerHand(dealer);
    setPlayerHand(player);
    setGameState('playing');
    setResult('');
    
    // Check for blackjack
    if (getHandValue(player) === 21) {
      handleDealerTurn(newDeck, player, dealer);
    }
  };
  
  /**
   * Calculate the value of a hand
   * @param {Array} hand - Array of card objects
   * @returns {number} - Hand value
   */
  const getHandValue = (hand) => {
    let value = 0;
    let aces = 0;
    
    for (const card of hand) {
      if (card.hidden) continue;
      
      if (card.value === 'A') {
        aces++;
        value += 11;
      } else if (['K', 'Q', 'J'].includes(card.value)) {
        value += 10;
      } else {
        value += parseInt(card.value);
      }
    }
    
    // Adjust for aces
    while (value > 21 && aces > 0) {
      value -= 10;
      aces--;
    }
    
    return value;
  };
  
  // Player actions
  const hit = () => {
    if (gameState !== 'playing') return;
    
    // Deal a card to the player
    const newDeck = [...deck];
    const newCard = newDeck.pop();
    if (!newCard) return; // Safety check
    
    const newHand = [...playerHand, { ...newCard, hidden: false }];
    
    // Add logging for debugging
    console.log('HIT - Adding card:', JSON.stringify(newCard));
    console.log('HIT - New hand after adding card:', JSON.stringify(newHand));
    console.log('HIT - New hand value:', getHandValue(newHand));
    
    setDeck(newDeck);
    setPlayerHand(newHand);
    
    // Check if player busts
    const handValue = getHandValue(newHand);
    if (handValue > 21) {
      endRound('lose', 'Bust! You went over 21.');
    } else if (handValue === 21) {
      stand();
    }
    
    // Haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };
  
  const stand = () => {
    if (gameState !== 'playing') return;
    
    // Add logging before dealer's turn
    console.log('STAND - Current player hand:', JSON.stringify(playerHand));
    console.log('STAND - Current player hand value:', getHandValue(playerHand));
    
    // Reveal dealer's hidden card
    const revealedDealerHand = dealerHand.map(card => ({ ...card, hidden: false }));
    setDealerHand(revealedDealerHand);
    
    // Dealer's turn
    handleDealerTurn(deck, playerHand, revealedDealerHand);
    
    // Haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };
  
  const doubleDown = () => {
    if (gameState !== 'playing' || playerHand.length > 2 || credits < bet) return;
    
    // Double the bet
    subtractCredits(bet);
    setBet(prev => prev * 2);
    
    // Deal one more card and stand
    const newDeck = [...deck];
    const newCard = newDeck.pop();
    if (!newCard) return; // Safety check
    
    const newHand = [...playerHand, { ...newCard, hidden: false }];
    
    setDeck(newDeck);
    setPlayerHand(newHand);
    
    // Check if player busts
    const handValue = getHandValue(newHand);
    if (handValue > 21) {
      endRound('lose', 'Bust! You went over 21.');
    } else {
      // Reveal dealer's hidden card and continue with dealer's turn
      const revealedDealerHand = dealerHand.map(card => ({ ...card, hidden: false }));
      setDealerHand(revealedDealerHand);
      
      handleDealerTurn(newDeck, newHand, revealedDealerHand);
    }
    
    // Haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  };
  
  /**
   * Dealer's turn logic
   * @param {Array} currentDeck - The current deck
   * @param {Array} playerCards - Player's cards
   * @param {Array} dealerCards - Dealer's cards
   */
  const handleDealerTurn = (currentDeck, playerCards, dealerCards) => {
    setGameState('dealerTurn');
    
    // Ensure all dealer cards are revealed
    const fullyRevealedDealerHand = dealerCards.map(card => ({ ...card, hidden: false }));
    
    const playerValue = getHandValue(playerCards);
    let dealerValue = getHandValue(fullyRevealedDealerHand);
    
    // Debug logging with more detail
    console.log('DEALER TURN - Player hand in state:', JSON.stringify(playerHand));
    console.log('DEALER TURN - Player hand passed to function:', JSON.stringify(playerCards));
    console.log('DEALER TURN - Player hand value:', playerValue);
    console.log('DEALER TURN - Dealer hand:', JSON.stringify(fullyRevealedDealerHand));
    console.log('DEALER TURN - Dealer hand value:', dealerValue);
    
    // Clone deck and dealer's hand
    let newDeck = [...currentDeck];
    let newDealerHand = [...fullyRevealedDealerHand];
    
    // Check for player blackjack
    if (playerCards.length === 2 && playerValue === 21) {
      // Check if dealer also has blackjack
      if (newDealerHand.length === 2 && getHandValue(newDealerHand) === 21) {
        console.log('Both have blackjack');
        endRound('push', 'Both have Blackjack! Push.');
      } else {
        console.log('Player has blackjack');
        endRound('blackjack', 'Blackjack! You win 3:2.');
      }
      return;
    }
    
    // If player has already busted, no need for dealer to draw
    if (playerValue > 21) {
      console.log('Player busted');
      endRound('lose', 'Bust! You went over 21.');
      return;
    }
    
    // Dealer draws until reaching 17 or higher
    while (dealerValue < 17) {
      if (newDeck.length === 0) {
        newDeck = initializeDeck();
      }
      const newCard = newDeck.pop();
      if (!newCard) break; // Safety check
      
      newDealerHand = [...newDealerHand, { ...newCard, hidden: false }];
      dealerValue = getHandValue(newDealerHand);
      console.log('Dealer drew a card:', JSON.stringify(newCard), 'New dealer value:', dealerValue);
    }
    
    setDealerHand(newDealerHand);
    setDeck(newDeck);
    
    // Determine the winner - detailed debug logging
    console.log('Final player value:', playerValue, 'Final dealer value:', dealerValue);
    console.log('Player > Dealer?', playerValue > dealerValue);
    console.log('Player < Dealer?', playerValue < dealerValue);
    console.log('Player == Dealer?', playerValue === dealerValue);
    
    if (dealerValue > 21) {
      console.log('Dealer busts');
      endRound('win', 'Dealer busts! You win.');
    } else if (dealerValue > playerValue) {
      console.log('Dealer wins with higher value');
      endRound('lose', 'Dealer wins.');
    } else if (dealerValue < playerValue) {
      console.log('Player wins with higher value');
      endRound('win', 'You win!');
    } else {
      console.log('Push - equal values');
      endRound('push', 'Push.');
    }
  };
  
  /**
   * End the round and determine payouts
   * @param {string} resultType - The result type ('win', 'lose', 'push', 'blackjack')
   * @param {string} msg - Message to display
   */
  const endRound = (resultType, msg) => {
    setGameState('gameOver');
    setResult(resultType);
    setMessage(msg);
    
    // Calculate and award winnings
    let winnings = 0;
    
    switch (resultType) {
      case 'win':
        winnings = bet * 2; // Original bet + winnings
        break;
      case 'blackjack':
        winnings = bet * 2.5; // Blackjack pays 3:2
        break;
      case 'push':
        winnings = bet; // Return the original bet
        break;
      case 'lose':
        winnings = 0; // No winnings
        break;
    }
    
    if (winnings > 0) {
      addGlobalCredits(winnings);
    }
    
    // Reset bet to original amount after double down
    if (bet > 10 && bet % 10 === 0) {
      setBet(bet / 2);
    }
    
    // Haptic feedback for win/lose
    if (Platform.OS !== 'web') {
      if (resultType === 'win' || resultType === 'blackjack') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (resultType === 'lose') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  };
  
  // Reset to betting state
  const newHand = () => {
    setGameState('betting');
    setPlayerHand([]);
    setDealerHand([]);
    setMessage('');
  };
  
  // Increase bet amount
  const increaseBet = () => {
    if (gameState !== 'betting') return;
    if (bet < maxBet && bet < credits) {
      setBet(prev => Math.min(prev + betIncrement, maxBet, credits));
    }
  };
  
  // Decrease bet amount
  const decreaseBet = () => {
    if (gameState !== 'betting') return;
    if (bet > 10) {
      setBet(prev => Math.max(prev - betIncrement, 10));
    }
  };

  // Set bet increment
  const changeBetIncrement = () => {
    if (gameState !== 'betting') return;
    // Cycle through bet increments: 10 -> 50 -> 100 -> 10
    if (betIncrement === 10) {
      setBetIncrement(50);
    } else if (betIncrement === 50) {
      setBetIncrement(100);
    } else {
      setBetIncrement(10);
    }
  };

  // Max bet
  const setMaximumBet = () => {
    if (gameState !== 'betting') return;
    setBet(Math.min(maxBet, credits));
  };
  
  // Add free credits
  const addCredits = () => {
    addGlobalCredits(1000);
    setMessage('1000 free credits added!');
    setTimeout(() => setMessage(''), 2000);
  };
  
  /**
   * Render a playing card
   * @param {Object} card - The card to render
   * @param {number} index - Index for the key
   * @returns {JSX.Element} Card component
   */
  const renderCard = (card, index) => {
    if (card.hidden) {
      return (
        <View key={`card-back-${index}`} style={styles.card}>
          <View style={styles.cardBack}>
            <ThemedText style={styles.cardBackText}>♠️ ♥️ ♦️ ♣️</ThemedText>
          </View>
        </View>
      );
    }
    
    const color = CARD_COLORS[card.suit];
    
    return (
      <View key={`card-${card.suit}-${card.value}-${index}`} style={styles.card}>
        <View style={styles.cardCorner}>
          <ThemedText style={[styles.cardValue, { color }]}>{card.value}</ThemedText>
          <ThemedText style={[styles.cardSuit, { color }]}>{card.suit}</ThemedText>
        </View>
        <View style={styles.cardCenterContainer}>
          <ThemedText style={[styles.cardCenter, { color }]}>{card.suit}</ThemedText>
        </View>
        <View style={[styles.cardCorner, styles.cardCornerBottom]}>
          <ThemedText style={[styles.cardValue, { color }]}>{card.value}</ThemedText>
          <ThemedText style={[styles.cardSuit, { color }]}>{card.suit}</ThemedText>
        </View>
      </View>
    );
  };
  
  return (
    <ScrollView>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>Blackjack</ThemedText>
        
        {/* Credits and bet display */}
        <View style={styles.infoContainer}>
          <ThemedView style={styles.creditContainer}>
            <ThemedText type="defaultSemiBold">Credits:</ThemedText>
            <ThemedText type="subtitle">{credits}</ThemedText>
            <TouchableOpacity style={styles.addButton} onPress={addCredits}>
              <ThemedText type="smallSemiBold">+1000</ThemedText>
            </TouchableOpacity>
          </ThemedView>
          
          {gameState === 'betting' && (
            <ThemedView style={styles.betContainer}>
              <ThemedText type="defaultSemiBold">Bet:</ThemedText>
              <View style={styles.betControls}>
                <TouchableOpacity 
                  style={styles.betButton} 
                  onPress={decreaseBet}
                  disabled={bet <= 10}
                >
                  <MaterialCommunityIcons name="minus" size={18} color="#FFF" />
                </TouchableOpacity>
                
                <ThemedText type="subtitle">{bet}</ThemedText>
                
                <TouchableOpacity 
                  style={styles.betButton} 
                  onPress={increaseBet}
                  disabled={bet >= maxBet || bet >= credits}
                >
                  <MaterialCommunityIcons name="plus" size={18} color="#FFF" />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.incrementButton} 
                  onPress={changeBetIncrement}
                >
                  <ThemedText type="smallSemiBold">{betIncrement}</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.maxBetButton} 
                  onPress={setMaximumBet}
                  disabled={credits <= 0}
                >
                  <ThemedText type="smallSemiBold">MAX</ThemedText>
                </TouchableOpacity>
              </View>
            </ThemedView>
          )}
        </View>
        
        {/* Game table */}
        <ThemedView style={styles.gameTable}>
          {/* Dealer's area */}
          <View style={styles.dealerArea}>
            <ThemedText type="defaultSemiBold" style={styles.areaLabel}>
              Dealer {dealerHand.length > 0 ? `(${getHandValue(dealerHand)})` : ''}
            </ThemedText>
            <View style={styles.cardsContainer}>
              {dealerHand.map((card, index) => renderCard(card, index))}
              {dealerHand.length === 0 && gameState === 'betting' && (
                <ThemedText style={styles.placeholder}>Dealer cards will appear here</ThemedText>
              )}
            </View>
          </View>
          
          {/* Player's area */}
          <View style={styles.playerArea}>
            <ThemedText type="defaultSemiBold" style={styles.areaLabel}>
              Player {playerHand.length > 0 ? `(${getHandValue(playerHand)})` : ''}
            </ThemedText>
            <View style={styles.cardsContainer}>
              {playerHand.map((card, index) => renderCard(card, index))}
              {playerHand.length === 0 && gameState === 'betting' && (
                <ThemedText style={styles.placeholder}>Your cards will appear here</ThemedText>
              )}
            </View>
          </View>
        </ThemedView>
        
        {/* Game controls */}
        <View style={styles.controlsContainer}>
          {gameState === 'betting' && (
            <TouchableOpacity 
              style={styles.dealButton}
              onPress={startGame}
              disabled={credits < bet}
            >
              <ThemedText type="subtitle" style={styles.buttonText}>DEAL</ThemedText>
            </TouchableOpacity>
          )}
          
          {gameState === 'playing' && (
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={hit}
              >
                <ThemedText type="defaultSemiBold" style={styles.buttonText}>HIT</ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={stand}
              >
                <ThemedText type="defaultSemiBold" style={styles.buttonText}>STAND</ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.actionButton,
                  (playerHand.length > 2 || credits < bet) && styles.disabledButton
                ]}
                onPress={doubleDown}
                disabled={playerHand.length > 2 || credits < bet}
              >
                <ThemedText type="defaultSemiBold" style={styles.buttonText}>DOUBLE</ThemedText>
              </TouchableOpacity>
            </View>
          )}
          
          {(gameState === 'dealerTurn' || gameState === 'gameOver') && (
            <TouchableOpacity 
              style={styles.newHandButton}
              onPress={newHand}
            >
              <ThemedText type="subtitle" style={styles.buttonText}>NEW HAND</ThemedText>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Result message */}
        {message && (
          <ThemedView style={[
            styles.messageContainer,
            result === 'win' || result === 'blackjack' ? styles.winMessage :
            result === 'lose' ? styles.loseMessage :
            result === 'push' ? styles.pushMessage : null
          ]}>
            <ThemedText type="defaultSemiBold" style={styles.message}>
              {message}
            </ThemedText>
          </ThemedView>
        )}
        
        {/* Game rules */}
        <ThemedView style={styles.rulesContainer}>
          <ThemedText type="subtitle">Blackjack Rules</ThemedText>
          <ThemedText type="small" style={styles.rule}>• Get closer to 21 than the dealer without going over</ThemedText>
          <ThemedText type="small" style={styles.rule}>• Face cards are worth 10, Aces are 1 or 11</ThemedText>
          <ThemedText type="small" style={styles.rule}>• Blackjack (A + 10/Face) pays 3:2</ThemedText>
          <ThemedText type="small" style={styles.rule}>• Dealer must hit until 17 or higher</ThemedText>
          <ThemedText type="small" style={styles.rule}>• Double Down allows you to double your bet after receiving your first two cards, but you'll get exactly one more card</ThemedText>
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
  incrementButton: {
    backgroundColor: '#9b59b6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    marginLeft: 5,
  },
  maxBetButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    marginLeft: 5,
  },
  gameTable: {
    width: '100%',
    padding: 10,
    backgroundColor: '#0A6522', // Green felt color
    borderRadius: 10,
    borderWidth: 5,
    borderColor: '#8B4513', // Brown border
  },
  dealerArea: {
    marginBottom: 20,
  },
  playerArea: {
    marginTop: 20,
  },
  areaLabel: {
    color: '#FFFFFF',
    marginBottom: 5,
  },
  cardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    minHeight: 100,
  },
  placeholder: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontStyle: 'italic',
  },
  card: {
    width: 70,
    height: 100,
    backgroundColor: '#FFFFFF',
    borderRadius: 5,
    marginHorizontal: 5,
    marginVertical: 5,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardBack: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1E3A8A',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 5,
  },
  cardBackText: {
    fontSize: 20,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  cardCorner: {
    position: 'absolute',
    top: 5,
    left: 5,
    alignItems: 'center',
  },
  cardCornerBottom: {
    top: 'auto',
    left: 'auto',
    bottom: 5,
    right: 5,
    transform: [{ rotate: '180deg' }],
  },
  cardValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  cardSuit: {
    fontSize: 14,
    lineHeight: 14,
  },
  cardCenter: {
    fontSize: 30,
  },
  cardCenterContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlsContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
  dealButton: {
    backgroundColor: '#2ECC71',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 30,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  actionButton: {
    backgroundColor: '#E67E22',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    minWidth: 80,
    alignItems: 'center',
  },
  newHandButton: {
    backgroundColor: '#3498DB',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 30,
  },
  disabledButton: {
    backgroundColor: '#95A5A6',
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
  },
  messageContainer: {
    marginTop: 10,
    padding: 10,
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
  },
  winMessage: {
    backgroundColor: '#2ECC71',
  },
  loseMessage: {
    backgroundColor: '#E74C3C',
  },
  pushMessage: {
    backgroundColor: '#F39C12',
  },
  message: {
    textAlign: 'center',
    color: '#FFFFFF',
  },
  rulesContainer: {
    marginTop: 15,
    width: '100%',
    alignItems: 'flex-start',
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 5,
  },
  rule: {
    marginVertical: 2,
    textAlign: 'left',
  },
}); 