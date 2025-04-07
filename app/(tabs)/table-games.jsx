import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Dimensions } from 'react-native';
import * as GameImages from '../../assets/images/games/placeholders';
import { useCasino } from '../../context/CasinoContext';
import CreditsDisplay from '../../components/CreditsDisplay';

// Import components
import Roulette from '../../components/Roulette';
import Poker from '../../components/Poker';
import Blackjack from '../../components/Blackjack';
import Craps from '../../components/Craps';

const { width } = Dimensions.get('window');

// Define table games
const TABLE_GAMES = [
  { 
    id: 'blackjack', 
    name: 'Blackjack', 
    icon: 'cards-playing-outline', 
    component: Blackjack,
    description: 'Classic card game - try to beat the dealer without going over 21',
    color: '#FF9800',
    imageComponent: GameImages.BlackjackImage,
  },
  { 
    id: 'roulette', 
    name: 'Roulette', 
    icon: 'record-circle', 
    component: Roulette,
    description: 'Spin the wheel and bet on where the ball will land',
    color: '#E91E63',
    imageComponent: GameImages.RouletteImage,
  },
  { 
    id: 'poker', 
    name: 'Video Poker', 
    icon: 'cards', 
    component: Poker,
    description: 'Draw poker - hold cards and try to make the best hand',
    color: '#3F51B5',
    imageComponent: GameImages.PokerImage,
  },
  { 
    id: 'craps', 
    name: 'Craps', 
    icon: 'dice-multiple', 
    component: Craps,
    description: 'Exciting dice game with multiple betting options',
    color: '#009688',
    imageComponent: GameImages.CrapsImage,
  },
];

export default function TableGamesScreen() {
  const [selectedGame, setSelectedGame] = useState(null);
  const casino = useCasino();

  // Game selection handler
  const handleGameSelect = (game) => {
    setSelectedGame(game);
  };

  // Return to dashboard handler
  const handleBackToGames = () => {
    // Force context update if needed
    if (casino.forceUpdate) {
      casino.forceUpdate();
    }
    setSelectedGame(null);
  };

  // Render a game card
  const renderGameCard = (game) => {
    const GameImageComponent = game.imageComponent;
    
    return (
      <TouchableOpacity
        key={game.id}
        style={styles.gameCard}
        onPress={() => handleGameSelect(game)}
      >
        <View style={styles.gameCardImage}>
          <GameImageComponent />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.cardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            <View style={styles.gameCardContent}>
              <MaterialCommunityIcons 
                name={game.icon} 
                size={40} 
                color="#FFFFFF" 
              />
              <ThemedText type="subtitle" style={styles.gameCardName}>
                {game.name}
              </ThemedText>
              <ThemedText style={styles.gameCardDescription}>
                {game.description}
              </ThemedText>
              <View style={styles.playButton}>
                <ThemedText style={styles.playButtonText}>PLAY NOW</ThemedText>
              </View>
            </View>
          </LinearGradient>
        </View>
      </TouchableOpacity>
    );
  };

  // If a game is selected, render its component
  if (selectedGame) {
    const GameComponent = selectedGame.component;
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackToGames}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#FFF" />
            <ThemedText style={styles.backText}>
              Back to games
            </ThemedText>
          </TouchableOpacity>
          
          <CreditsDisplay />
        </View>
        <GameComponent onBackPress={handleBackToGames} />
      </ThemedView>
    );
  }

  // Render the table games selection screen
  return (
    <ThemedView style={styles.container}>
      <View style={styles.bgImageContainer}>
        <GameImages.CasinoBackgroundImage />
      </View>
      <View style={styles.contentContainer}>
        <ScrollView 
          contentContainerStyle={styles.gamesContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerContainer}>
            <View style={styles.titleContainer}>
              <MaterialCommunityIcons 
                name="cards-playing" 
                size={40} 
                color="#FFD700" 
              />
              <ThemedText type="title" style={styles.title}>
                Table Games
              </ThemedText>
            </View>
            <CreditsDisplay />
          </View>
          
          {TABLE_GAMES.map(game => renderGameCard(game))}
          
          <ThemedText style={styles.disclaimer}>
            This app is for educational purposes only. No real money involved.
          </ThemedText>
        </ScrollView>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  bgImageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.6,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  header: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
  },
  backText: {
    marginLeft: 5,
    color: '#FFF',
  },
  headerContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 15,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
    marginLeft: 10,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
  },
  gamesContainer: {
    paddingHorizontal: 15,
    paddingVertical: 20,
    gap: 15,
  },
  gameCard: {
    width: '100%',
    height: 180,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  gameCardImage: {
    flex: 1,
    borderRadius: 15,
    overflow: 'hidden',
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  gameCardContent: {
    alignItems: 'center',
  },
  gameCardName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 10,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  gameCardDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginVertical: 10,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  playButton: {
    backgroundColor: 'rgba(255,215,0,0.85)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 5,
  },
  playButtonText: {
    color: '#000000',
    fontWeight: 'bold',
  },
  disclaimer: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
    color: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 30,
  },
}); 