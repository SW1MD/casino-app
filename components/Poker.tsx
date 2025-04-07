import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Dimensions, 
  Image
} from 'react-native';
import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCasino } from '../context/CasinoContext';

// Card suits and values
const SUITS = ['♠️', '♥️', '♦️', '♣️'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// Hand rankings
const HAND_RANKINGS = {
  ROYAL_FLUSH: 'Royal Flush',
  STRAIGHT_FLUSH: 'Straight Flush',
  FOUR_OF_A_KIND: 'Four of a Kind',
  FULL_HOUSE: 'Full House',
  FLUSH: 'Flush',
  STRAIGHT: 'Straight',
  THREE_OF_A_KIND: 'Three of a Kind',
  TWO_PAIR: 'Two Pair',
  ONE_PAIR: 'One Pair',
  HIGH_CARD: 'High Card'
};

export default function Poker() {
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
  const [message, setMessage] = useState('Place your bet and deal!');
  const [gamePhase, setGamePhase] = useState('betting'); // betting, dealing, player-turn, dealer-turn, result
  const [deck, setDeck] = useState([]);
  const [playerHand, setPlayerHand] = useState([]);
  const [dealerHand, setDealerHand] = useState([]);
  const [heldCards, setHeldCards] = useState([false, false, false, false, false]);
  const [playerHandRank, setPlayerHandRank] = useState('');
  const [dealerHandRank, setDealerHandRank] = useState('');
  
  // Add game ID for tracking
  const GAME_ID = 'videoPoker';
  
  // Set the last machine when component mounts
  useEffect(() => {
    setLastMachine(GAME_ID);
  }, []);
  
  const screenWidth = Dimensions.get('window').width;
  const CARD_WIDTH = Math.min(70, screenWidth / 6);
  
  // Preset bet amounts
  const BET_AMOUNTS = [5, 10, 25, 50, 100];

  // Initialize or reset the game
  const resetGame = () => {
    setGamePhase('betting');
    setPlayerHand([]);
    setDealerHand([]);
    setHeldCards([false, false, false, false, false]);
    setPlayerHandRank('');
    setDealerHandRank('');
    setMessage('Place your bet and deal!');
  };

  // Create and shuffle a new deck
  const createDeck = () => {
    const newDeck = [];
    SUITS.forEach(suit => {
      VALUES.forEach(value => {
        newDeck.push({ suit, value });
      });
    });
    
    // Shuffle
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    
    return newDeck;
  };

  // Deal initial cards
  const dealCards = () => {
    if (gamePhase !== 'betting') return;
    
    if (credits < betAmount) {
      setMessage('Not enough credits!');
      return;
    }
    
    // Subtract bet amount
    subtractCredits(betAmount);
    
    // Create a new shuffled deck
    const newDeck = createDeck();
    setDeck(newDeck);
    
    // Deal 5 cards to player
    const playerCards = newDeck.splice(0, 5);
    setPlayerHand(playerCards);
    
    // Reset held cards
    setHeldCards([false, false, false, false, false]);
    
    setGamePhase('player-turn');
    setMessage('Select cards to hold, then click DRAW');
  };

  // Toggle holding a card
  const toggleHold = (index) => {
    if (gamePhase !== 'player-turn') return;
    
    const newHeldCards = [...heldCards];
    newHeldCards[index] = !newHeldCards[index];
    setHeldCards(newHeldCards);
  };

  // Draw new cards for non-held positions
  const drawCards = () => {
    if (gamePhase !== 'player-turn') return;
    
    const newPlayerHand = [...playerHand];
    const currentDeck = [...deck];
    
    // Replace cards that aren't held
    heldCards.forEach((isHeld, index) => {
      if (!isHeld) {
        newPlayerHand[index] = currentDeck.shift();
      }
    });
    
    setPlayerHand(newPlayerHand);
    setDeck(currentDeck);
    
    // Deal dealer hand
    const dealerCards = currentDeck.splice(0, 5);
    setDealerHand(dealerCards);
    
    // Evaluate hands
    const playerRank = evaluateHand(newPlayerHand);
    const dealerRank = evaluateHand(dealerCards);
    
    console.log('Player hand:', newPlayerHand, 'Rank:', playerRank);
    console.log('Dealer hand:', dealerCards, 'Rank:', dealerRank);
    
    setPlayerHandRank(playerRank);
    setDealerHandRank(dealerRank);
    
    setGamePhase('result');
    
    // Determine winner
    const result = determineWinner(playerRank, dealerRank);
    handleResult(result);
  };

  // Function to add credits (for demo purposes)
  const addCredits = () => {
    addGlobalCredits(1000);
    setMessage('1000 credits added!');
  };
  
  // Evaluate a poker hand and return its ranking
  const evaluateHand = (hand) => {
    // Count values and suits
    const valueCounts = {};
    const suitCounts = {};
    
    hand.forEach(card => {
      valueCounts[card.value] = (valueCounts[card.value] || 0) + 1;
      suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
    });
    
    const values = Object.keys(valueCounts);
    const distinctValues = values.length;
    const valueCountsArr = Object.values(valueCounts);
    
    // Check for flush
    const isFlush = Object.values(suitCounts).some(count => count === 5);
    
    // Check for straight
    let isStraight = false;
    if (distinctValues === 5) {
      const sortedValues = hand.map(card => VALUES.indexOf(card.value))
                               .sort((a, b) => a - b);
      
      isStraight = sortedValues[4] - sortedValues[0] === 4;
      
      // Check for A-5 straight
      if (!isStraight && 
          sortedValues.includes(VALUES.indexOf('A')) && 
          sortedValues.includes(VALUES.indexOf('2')) && 
          sortedValues.includes(VALUES.indexOf('3')) && 
          sortedValues.includes(VALUES.indexOf('4')) && 
          sortedValues.includes(VALUES.indexOf('5'))) {
        isStraight = true;
      }
    }
    
    // Royal flush
    if (isFlush && isStraight) {
      const hasAce = hand.some(card => card.value === 'A');
      const hasKing = hand.some(card => card.value === 'K');
      const hasQueen = hand.some(card => card.value === 'Q');
      const hasJack = hand.some(card => card.value === 'J');
      const hasTen = hand.some(card => card.value === '10');
      
      if (hasAce && hasKing && hasQueen && hasJack && hasTen) {
        return HAND_RANKINGS.ROYAL_FLUSH;
      }
      
      return HAND_RANKINGS.STRAIGHT_FLUSH;
    }
    
    // Four of a kind
    if (valueCountsArr.includes(4)) {
      return HAND_RANKINGS.FOUR_OF_A_KIND;
    }
    
    // Full house
    if (valueCountsArr.includes(3) && valueCountsArr.includes(2)) {
      return HAND_RANKINGS.FULL_HOUSE;
    }
    
    // Flush
    if (isFlush) {
      return HAND_RANKINGS.FLUSH;
    }
    
    // Straight
    if (isStraight) {
      return HAND_RANKINGS.STRAIGHT;
    }
    
    // Three of a kind
    if (valueCountsArr.includes(3)) {
      return HAND_RANKINGS.THREE_OF_A_KIND;
    }
    
    // Two pair
    const pairs = valueCountsArr.filter(count => count === 2).length;
    if (pairs === 2) {
      return HAND_RANKINGS.TWO_PAIR;
    }
    
    // One pair
    if (valueCountsArr.includes(2)) {
      // Check if it's Jacks or better
      const pairValue = Object.keys(valueCounts).find(value => valueCounts[value] === 2);
      const pairValueIndex = VALUES.indexOf(pairValue);
      const jackIndex = VALUES.indexOf('J');
      
      // Only pay for Jacks or better (J, Q, K, A)
      if (pairValueIndex >= jackIndex) {
        return HAND_RANKINGS.ONE_PAIR;
      }
      // Return ONE_PAIR for display purposes but it won't pay out
      return HAND_RANKINGS.ONE_PAIR;
    }
    
    // High card
    return HAND_RANKINGS.HIGH_CARD;
  };
  
  // Determine winner by comparing hand ranks
  const determineWinner = (playerRank, dealerRank) => {
    const rankings = Object.values(HAND_RANKINGS);
    const playerRankIndex = rankings.indexOf(playerRank);
    const dealerRankIndex = rankings.indexOf(dealerRank);
    
    // In poker rankings, LOWER index means BETTER hand (Royal Flush is index 0)
    if (playerRankIndex < dealerRankIndex) {
      return 'player';
    } else if (dealerRankIndex < playerRankIndex) {
      return 'dealer';
    } else {
      // Tie - implement high card comparison or let player win
      return 'player';
    }
  };
  
  // Handle the game result
  const handleResult = (result) => {
    if (result === 'player') {
      // Calculate winnings based on hand rank
      let multiplier = 0;
      
      switch (playerHandRank) {
        case HAND_RANKINGS.ROYAL_FLUSH:
          multiplier = 250;
          break;
        case HAND_RANKINGS.STRAIGHT_FLUSH:
          multiplier = 50;
          break;
        case HAND_RANKINGS.FOUR_OF_A_KIND:
          multiplier = 25;
          break;
        case HAND_RANKINGS.FULL_HOUSE:
          multiplier = 9;
          break;
        case HAND_RANKINGS.FLUSH:
          multiplier = 6;
          break;
        case HAND_RANKINGS.STRAIGHT:
          multiplier = 4;
          break;
        case HAND_RANKINGS.THREE_OF_A_KIND:
          multiplier = 3;
          break;
        case HAND_RANKINGS.TWO_PAIR:
          multiplier = 2;
          break;
        case HAND_RANKINGS.ONE_PAIR:
          multiplier = 1;
          break;
      }
      
      const winnings = betAmount * multiplier;
      
      // You win the hand comparison regardless of payout
      if (winnings > 0) {
        addGlobalCredits(winnings);
        setMessage(`You win ${winnings} credits with ${playerHandRank}!`);
      } else {
        // Player won the hand but didn't get a payout
        setMessage(`You beat the dealer with ${playerHandRank} but no payout.`);
      }
    } else {
      setMessage(`You lose! Your hand: ${playerHandRank}, Dealer: ${dealerHandRank}`);
    }
  };

  // Render a card
  const renderCard = (card, index, isPlayerCard = true) => {
    if (!card) return null;
    
    const isRed = card.suit === '♥️' || card.suit === '♦️';
    const isHeld = isPlayerCard && heldCards[index];
    
    return (
      <TouchableOpacity
        key={`${card.value}${card.suit}`}
        style={[
          styles.card,
          isRed ? styles.redCard : styles.blackCard,
          isHeld && styles.heldCard,
          { width: CARD_WIDTH }
        ]}
        disabled={!isPlayerCard || gamePhase !== 'player-turn'}
        onPress={() => isPlayerCard ? toggleHold(index) : null}
      >
        <ThemedText style={[styles.cardValue, isRed ? styles.redText : styles.blackText]}>
          {card.value}
        </ThemedText>
        <ThemedText style={[styles.cardSuit, isRed ? styles.redText : styles.blackText]}>
          {card.suit}
        </ThemedText>
        {isHeld && (
          <View style={styles.heldLabel}>
            <ThemedText style={styles.heldText}>HELD</ThemedText>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Video Poker
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
        
        {/* Dealer Hand (only visible after player draws) */}
        {gamePhase === 'result' && (
          <View style={styles.handContainer}>
            <ThemedText style={styles.handLabel}>Dealer's Hand ({dealerHandRank})</ThemedText>
            <View style={styles.cardsContainer}>
              {dealerHand.map((card, index) => renderCard(card, index, false))}
            </View>
          </View>
        )}
        
        {/* Player Hand */}
        <View style={styles.handContainer}>
          <ThemedText style={styles.handLabel}>
            Your Hand {playerHandRank ? `(${playerHandRank})` : ''}
          </ThemedText>
          <View style={styles.cardsContainer}>
            {playerHand.length > 0 ? 
              playerHand.map((card, index) => renderCard(card, index)) : 
              Array(5).fill(null).map((_, index) => (
                <View key={index} style={[styles.card, styles.emptyCard, { width: CARD_WIDTH }]} />
              ))
            }
          </View>
        </View>
        
        {/* Bet Amount Buttons */}
        <View style={styles.betAmountContainer}>
          <ThemedText style={styles.betAmountLabel}>Bet Amount:</ThemedText>
          <View style={styles.betAmountButtons}>
            {BET_AMOUNTS.map(amount => (
              <TouchableOpacity
                key={amount}
                style={[
                  styles.betAmountButton,
                  betAmount === amount ? styles.activeBetAmount : null,
                  gamePhase !== 'betting' ? styles.disabledButton : null
                ]}
                onPress={() => gamePhase === 'betting' ? setBetAmount(amount) : null}
                disabled={gamePhase !== 'betting'}
              >
                <ThemedText style={styles.betAmountText}>{amount}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {gamePhase === 'betting' && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.dealButton]}
              onPress={dealCards}
              disabled={credits < betAmount}
            >
              <ThemedText style={styles.actionButtonText}>Deal</ThemedText>
            </TouchableOpacity>
          )}
          
          {gamePhase === 'player-turn' && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.drawButton]}
              onPress={drawCards}
            >
              <ThemedText style={styles.actionButtonText}>Draw</ThemedText>
            </TouchableOpacity>
          )}
          
          {gamePhase === 'result' && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.newHandButton]}
              onPress={resetGame}
            >
              <ThemedText style={styles.actionButtonText}>New Hand</ThemedText>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Payout Table */}
        <View style={styles.payoutTableContainer}>
          <ThemedText style={styles.payoutTableTitle}>Payouts</ThemedText>
          <View style={styles.payoutTable}>
            <View style={styles.payoutRow}>
              <ThemedText style={styles.handName}>Royal Flush</ThemedText>
              <ThemedText style={styles.payoutAmount}>250x</ThemedText>
            </View>
            <View style={styles.payoutRow}>
              <ThemedText style={styles.handName}>Straight Flush</ThemedText>
              <ThemedText style={styles.payoutAmount}>50x</ThemedText>
            </View>
            <View style={styles.payoutRow}>
              <ThemedText style={styles.handName}>Four of a Kind</ThemedText>
              <ThemedText style={styles.payoutAmount}>25x</ThemedText>
            </View>
            <View style={styles.payoutRow}>
              <ThemedText style={styles.handName}>Full House</ThemedText>
              <ThemedText style={styles.payoutAmount}>9x</ThemedText>
            </View>
            <View style={styles.payoutRow}>
              <ThemedText style={styles.handName}>Flush</ThemedText>
              <ThemedText style={styles.payoutAmount}>6x</ThemedText>
            </View>
            <View style={styles.payoutRow}>
              <ThemedText style={styles.handName}>Straight</ThemedText>
              <ThemedText style={styles.payoutAmount}>4x</ThemedText>
            </View>
            <View style={styles.payoutRow}>
              <ThemedText style={styles.handName}>Three of a Kind</ThemedText>
              <ThemedText style={styles.payoutAmount}>3x</ThemedText>
            </View>
            <View style={styles.payoutRow}>
              <ThemedText style={styles.handName}>Two Pair</ThemedText>
              <ThemedText style={styles.payoutAmount}>2x</ThemedText>
            </View>
            <View style={styles.payoutRow}>
              <ThemedText style={styles.handName}>Pair (Jacks or Better)</ThemedText>
              <ThemedText style={styles.payoutAmount}>1x</ThemedText>
            </View>
          </View>
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
  handContainer: {
    width: '100%',
    marginBottom: 20,
    alignItems: 'center',
  },
  handLabel: {
    fontSize: 16,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  cardsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  card: {
    height: 100,
    borderRadius: 8,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
    position: 'relative',
  },
  emptyCard: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  redCard: {
    borderColor: 'red',
    borderWidth: 1,
  },
  blackCard: {
    borderColor: 'black',
    borderWidth: 1,
  },
  heldCard: {
    borderColor: '#D4AF37',
    borderWidth: 2,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
  },
  cardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    position: 'absolute',
    top: 5,
    left: 5,
  },
  cardSuit: {
    fontSize: 30,
  },
  redText: {
    color: 'red',
  },
  blackText: {
    color: 'black',
  },
  heldLabel: {
    position: 'absolute',
    bottom: 5,
    backgroundColor: '#D4AF37',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  heldText: {
    color: 'black',
    fontSize: 10,
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
  disabledButton: {
    opacity: 0.5,
  },
  betAmountText: {
    fontWeight: 'bold',
    color: 'white',
  },
  actionButtons: {
    width: '100%',
    marginBottom: 20,
    alignItems: 'center',
  },
  actionButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    minWidth: 150,
    alignItems: 'center',
  },
  dealButton: {
    backgroundColor: '#2ecc71',
  },
  drawButton: {
    backgroundColor: '#3498db',
  },
  newHandButton: {
    backgroundColor: '#9b59b6',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  payoutTableContainer: {
    width: '100%',
    marginTop: 10,
  },
  payoutTableTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  payoutTable: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  payoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  handName: {
    fontSize: 14,
  },
  payoutAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
}); 