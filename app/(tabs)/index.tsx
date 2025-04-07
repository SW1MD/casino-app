import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, TouchableOpacity, View, ScrollView, Text, ImageBackground, Dimensions, Animated, Image } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { MaterialCommunityIcons } from '@expo/vector-icons';
// Import all components directly (avoid using @ path notation)
import SlotMachine from '../../components/SlotMachine';
import Roulette from '../../components/Roulette';
import Poker from '../../components/Poker';
import AdvancedSlotMachine from '../../components/AdvancedSlotMachine';
import Blackjack from '../../components/Blackjack';
import Craps from '../../components/Craps';
import EgyptianSlotMachine from '../../components/EgyptianSlotMachine';
import CyberSlotMachine from '../../components/CyberSlotMachine';
import GhostPirateSlotMachine from '../../components/GhostPirateSlotMachine';
import LuckyCharmSlotMachine from '../../components/LuckyCharmSlotMachine';
import AtlantisSlotMachine from '../../components/AtlantisSlotMachine';
import SpecialEdSlotMachine from '../../components/SpecialEdSlotMachine';
import GhettoSlotMachine from '../../components/GhettoSlotMachine';
import { useCasino } from '../../context/CasinoContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CreditsDisplay from '../../components/CreditsDisplay';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { CasinoLogo } from '../../assets/images/logo';
import * as GameImages from '../../assets/images/games/placeholders';

const { width } = Dimensions.get('window');

// Define the game type
type Game = {
  id: string;
  name: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  component: React.ComponentType;
  category: 'slots' | 'cards' | 'table';
  description: string;
  color: string;
  imageComponent: React.ComponentType<any>;
  featured?: boolean;
};

// Define the casino context type for TypeScript
type CasinoContextType = {
  credits: number;
  defaultBet: number;
  lastMachine: string | null;
  updateCredits: (amount: number) => void;
  addCredits: (amount: number) => void;
  subtractCredits: (amount: number) => void;
  forceUpdate?: () => void;
  syncWithStorage?: () => void;
  [key: string]: any; // Allow additional properties
};

// Game options with categories, descriptions and images
const GAMES: Game[] = [
  { 
    id: 'slots', 
    name: 'Classic Slots', 
    icon: 'slot-machine', 
    component: SlotMachine, 
    category: 'slots',
    description: 'Simple 3-reel slot machine with classic symbols',
    color: '#F44336',
    imageComponent: GameImages.ClassicSlotsImage,
  },
  { 
    id: 'advancedSlots', 
    name: 'Super Slots 5000', 
    icon: 'slot-machine-outline', 
    component: AdvancedSlotMachine,
    category: 'slots',
    description: 'Advanced 5-reel slots with multiple paylines',
    color: '#9C27B0',
    imageComponent: GameImages.AdvancedSlotsImage,
    featured: true,
  },
  { 
    id: 'egyptianSlots', 
    name: 'Egyptian Treasures', 
    icon: 'pyramid', 
    component: EgyptianSlotMachine,
    category: 'slots',
    description: 'Ancient Egyptian themed slots with special pharaoh bonuses',
    color: '#FFEB3B',
    imageComponent: GameImages.EgyptianSlotsImage,
    featured: true,
  },
  { 
    id: 'cyberSlots', 
    name: 'CyberHack 2000', 
    icon: 'chip', 
    component: CyberSlotMachine,
    category: 'slots',
    description: 'Futuristic cyberpunk slot game with digital symbols',
    color: '#00BCD4',
    imageComponent: GameImages.CyberSlotsImage,
    featured: true,
  },
  { 
    id: 'ghostPirateSlots', 
    name: 'Phantom Pirate\'s Fortune', 
    icon: 'ghost', 
    component: GhostPirateSlotMachine,
    category: 'slots',
    description: 'Spooky pirate adventure with ghost ship bonus rounds',
    color: '#673AB7',
    imageComponent: GameImages.GhostPirateSlotsImage,
  },
  { 
    id: 'luckyCharmSlots', 
    name: 'Lucky Charm Slots', 
    icon: 'clover', 
    component: LuckyCharmSlotMachine,
    category: 'slots',
    description: 'Irish-themed slot machine with lucky charms and rainbows',
    color: '#4CAF50',
    imageComponent: GameImages.LuckyCharmSlotsImage,
  },
  { 
    id: 'atlantisSlots', 
    name: 'Atlantis Rising', 
    icon: 'waves', 
    component: AtlantisSlotMachine,
    category: 'slots',
    description: 'Underwater adventure in the lost city of Atlantis',
    color: '#2196F3',
    imageComponent: GameImages.AtlantisSlotsImage,
  },
  { 
    id: 'specialEdSlots', 
    name: 'Special Education Slots', 
    icon: 'brain', 
    component: SpecialEdSlotMachine,
    category: 'slots',
    description: 'Adaptive difficulty slots with extra chances for struggling players',
    color: '#3F51B5',
    imageComponent: GameImages.SpecialEdSlotsImage,
    featured: true,
  },
  { 
    id: 'ghettoSlots', 
    name: 'Hood Rich Slots', 
    icon: 'cash-multiple', 
    component: GhettoSlotMachine,
    category: 'slots',
    description: 'Street-themed slots with heat meter for increasing multipliers',
    color: '#9b59b6',
    imageComponent: GameImages.GhettoSlotsImage,
    featured: true,
  },
  { 
    id: 'blackjack', 
    name: 'Blackjack', 
    icon: 'cards-playing-outline', 
    component: Blackjack,
    category: 'cards',
    description: 'Classic card game - try to beat the dealer without going over 21',
    color: '#FF9800',
    imageComponent: GameImages.BlackjackImage,
  },
  { 
    id: 'roulette', 
    name: 'Roulette', 
    icon: 'record-circle', 
    component: Roulette,
    category: 'table',
    description: 'Spin the wheel and bet on where the ball will land',
    color: '#E91E63',
    imageComponent: GameImages.RouletteImage,
  },
  { 
    id: 'poker', 
    name: 'Video Poker', 
    icon: 'cards', 
    component: Poker,
    category: 'cards',
    description: 'Draw poker - hold cards and try to make the best hand',
    color: '#3F51B5',
    imageComponent: GameImages.PokerImage,
  },
  { 
    id: 'craps', 
    name: 'Craps', 
    icon: 'dice-multiple', 
    component: Craps,
    category: 'table',
    description: 'Exciting dice game with multiple betting options',
    color: '#009688',
    imageComponent: GameImages.CrapsImage,
  },
];

export default function HomeScreen() {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [categories] = useState(['Featured', 'Slots', 'Cards', 'Table Games']);
  const [activeCategory, setActiveCategory] = useState('Slots'); // Default to Slots
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const slotScrollX = useRef(new Animated.Value(0)).current;
  
  // Use the casino context with proper typing
  const casino = useCasino() as CasinoContextType;

  // Sync credits once when returning to the dashboard
  useEffect(() => {
    const syncStorage = async () => {
      try {
        // Read directly from storage
        const storedValue = await AsyncStorage.getItem('@casino_credits');
        if (storedValue && Number(storedValue) !== casino.credits) {
          // Update context if different
          casino.updateCredits(Number(storedValue));
        }
      } catch (error) {
        console.error('Error syncing credits:', error);
      }
    };
    
    // Only sync when not in a game
    if (!selectedGame) {
      syncStorage();
    }
  }, [selectedGame, casino]);
  
  // Game selection handler
  const handleGameSelect = useCallback((game: Game) => {
    setSelectedGame(game);
  }, []);
  
  // Return to dashboard handler
  const handleBackToGames = useCallback(() => {
    // Force context update
    if (casino.forceUpdate) {
      casino.forceUpdate();
    }
    setSelectedGame(null);
  }, [casino]);

  // Filter games by category
  const getGamesByCategory = useCallback((category: string) => {
    if (category === 'Featured') {
      // Return games marked as featured
      return GAMES.filter(game => game.featured);
    }
    if (category === 'Slots') {
      return GAMES.filter(game => game.category === 'slots');
    }
    if (category === 'Cards') {
      return GAMES.filter(game => game.category === 'cards');
    }
    if (category === 'Table Games') {
      return GAMES.filter(game => game.category === 'table');
    }
    return GAMES;
  }, []);

  // Only get slot games
  const getSlotGames = useCallback(() => {
    return GAMES.filter(game => game.category === 'slots');
  }, []);

  // Render a horizontal card for a game
  const renderGameCard = (game: Game) => {
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

  // Render a slot machine card in the horizontal list
  const renderSlotCard = (game: Game, index: number) => {
    const SlotImageComponent = game.imageComponent;
    
    return (
      <TouchableOpacity
        key={`slot-${game.id}`}
        style={styles.slotCard}
        onPress={() => handleGameSelect(game)}
      >
        <View style={styles.slotCardImage}>
          <SlotImageComponent />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.75)']}
            style={styles.slotCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            <View style={styles.slotCardHeader}>
              <View style={styles.slotIconContainer}>
                <MaterialCommunityIcons 
                  name={game.icon} 
                  size={30} 
                  color="#FFFFFF" 
                />
              </View>
              <ThemedText style={styles.slotCardName}>
                {game.name}
              </ThemedText>
            </View>
            <View style={styles.slotCardContent}>
              <View style={styles.slotPlayButton}>
                <ThemedText style={styles.slotPlayButtonText}>SPIN</ThemedText>
              </View>
            </View>
          </LinearGradient>
        </View>
      </TouchableOpacity>
    );
  };

  // Render the featured games carousel
  const renderFeaturedCarousel = () => {
    const featuredGames = GAMES.filter(game => game.featured);
    
    return (
      <View style={styles.carouselContainer}>
        <Animated.ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
          decelerationRate="fast"
          style={styles.carousel}
        >
          {featuredGames.map((game, index) => {
            const FeaturedImageComponent = game.imageComponent;
            
            return (
              <TouchableOpacity
                key={`featured-${game.id}`}
                style={styles.featuredCard}
                onPress={() => handleGameSelect(game)}
              >
                <View style={styles.featuredCardImage}>
                  <FeaturedImageComponent />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.85)']}
                    style={styles.featuredGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                  >
                    <View style={styles.featuredContent}>
                      <MaterialCommunityIcons 
                        name={game.icon} 
                        size={60} 
                        color="#FFFFFF" 
                      />
                      <ThemedText type="title" style={styles.featuredTitle}>
                        {game.name}
                      </ThemedText>
                      <ThemedText style={styles.featuredDescription}>
                        {game.description}
                      </ThemedText>
                      <View style={styles.featuredButton}>
                        <ThemedText style={styles.featuredButtonText}>PLAY NOW</ThemedText>
                      </View>
                    </View>
                  </LinearGradient>
                </View>
              </TouchableOpacity>
            );
          })}
        </Animated.ScrollView>
        
        <View style={styles.paginationContainer}>
          {featuredGames.map((_, index) => {
            const inputRange = [
              (index - 1) * width,
              index * width,
              (index + 1) * width,
            ];
            
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 16, 8],
              extrapolate: 'clamp',
            });
            
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.4, 1, 0.4],
              extrapolate: 'clamp',
            });
            
            return (
              <Animated.View
                key={`dot-${index}`}
                style={[styles.dot, { width: dotWidth, opacity }]}
              />
            );
          })}
        </View>
      </View>
    );
  };
  
  // Render the slot machines horizontal list
  const renderSlotMachinesRow = () => {
    const slotGames = getSlotGames();
    const cardWidth = width * 0.7;
    
    return (
      <View style={styles.slotRowContainer}>
        <View style={styles.sectionHeaderRow}>
          <MaterialCommunityIcons name="slot-machine" size={24} color="#FFD700" />
          <ThemedText style={styles.slotsSectionTitle}>
            Slot Machines
          </ThemedText>
        </View>
        
        <Animated.ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={cardWidth + 15}
          decelerationRate="fast"
          contentContainerStyle={styles.slotRowContent}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: slotScrollX } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
        >
          {slotGames.map((game, index) => renderSlotCard(game, index))}
        </Animated.ScrollView>
      </View>
    );
  };
  
  // Render category tabs
  const renderCategoryTabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.categoryContainer}
    >
      {categories.map(category => (
        <TouchableOpacity
          key={category}
          style={[
            styles.categoryTab,
            activeCategory === category && styles.activeCategoryTab
          ]}
          onPress={() => setActiveCategory(category)}
        >
          <ThemedText 
            style={[
              styles.categoryText,
              activeCategory === category && styles.activeCategoryText
            ]}
          >
            {category}
          </ThemedText>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
  
  // Render the game selection screen
  const renderGameSelection = () => (
    <View style={styles.mainContainer}>
      <View style={styles.bgImageContainer}>
        <GameImages.CasinoBackgroundImage />
      </View>
      <View style={styles.contentContainer}>
        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={styles.selectionContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerContainer}>
            <View style={styles.titleContainer}>
              <View style={styles.logo}>
                <CasinoLogo />
              </View>
              <ThemedText type="title" style={styles.title}>
                Slot Machines
              </ThemedText>
            </View>
            <CreditsDisplay />
          </View>
          
          {/* Main Slot Machines Row - Featured Prominently */}
          {renderSlotMachinesRow()}
          
          {/* Featured Games Carousel */}
          {renderFeaturedCarousel()}
          
          {/* Category tabs */}
          {renderCategoryTabs()}
          
          <View style={styles.sectionContainer}>
            <ThemedText style={styles.sectionTitle}>
              {activeCategory}
            </ThemedText>
            
            <View style={styles.gamesContainer}>
              {getGamesByCategory(activeCategory).map(game => renderGameCard(game))}
            </View>
          </View>
          
          <ThemedText style={styles.disclaimer}>
            This app is for educational purposes only. No real money involved.
          </ThemedText>
        </ScrollView>
      </View>
    </View>
  );
  
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
  
  // Otherwise, render the selection screen
  return (
    <ThemedView style={styles.container}>
      {renderGameSelection()}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  backgroundContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  blurOverlay: {
    flex: 1,
    width: '100%',
    height: '100%',
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
  logo: {
    width: 40,
    height: 40,
    marginRight: 10,
  },
  selectionContainer: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
  },
  // Carousel styles
  carouselContainer: {
    marginTop: 20,
    height: 200,
  },
  carousel: {
    width: width,
  },
  featuredCard: {
    width: width - 40,
    height: 180,
    marginHorizontal: 20,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  featuredCardImage: {
    flex: 1,
    borderRadius: 15,
    overflow: 'hidden',
  },
  featuredGradient: {
    ...StyleSheet.absoluteFillObject,
    padding: 20,
    justifyContent: 'flex-end',
  },
  featuredContent: {
    alignItems: 'center',
  },
  featuredTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 10,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  featuredDescription: {
    color: '#FFFFFF',
    opacity: 0.9,
    textAlign: 'center',
    marginVertical: 10,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  featuredButton: {
    backgroundColor: 'rgba(255,215,0,0.85)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 5,
  },
  featuredButtonText: {
    color: '#000000',
    fontWeight: 'bold',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFD700',
    marginHorizontal: 4,
  },
  // Slot Machines Row
  slotRowContainer: {
    marginTop: 20,
    marginBottom: 5,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  slotsSectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFD700',
    marginLeft: 10,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  slotRowContent: {
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  slotCard: {
    width: width * 0.7,
    height: 220,
    marginHorizontal: 8,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  slotCardImage: {
    flex: 1,
    borderRadius: 15,
    overflow: 'hidden',
  },
  slotCardGradient: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: 15,
  },
  slotIconContainer: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFD700',
    marginRight: 10,
    alignSelf: 'center',
  },
  slotCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slotCardContent: {
    alignItems: 'center',
    marginTop: 10,
  },
  slotCardName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  slotPlayButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 25,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  slotPlayButtonText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Category tabs
  categoryContainer: {
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  categoryTab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  activeCategoryTab: {
    backgroundColor: '#FFD700',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  categoryText: {
    color: '#FFFFFF',
  },
  activeCategoryText: {
    color: '#000000',
    fontWeight: 'bold',
  },
  // Section styles
  sectionContainer: {
    paddingHorizontal: 15,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  gamesContainer: {
    width: '100%',
  },
  // Game card styles
  gameCard: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    marginBottom: 15,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  gameCardImage: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 15,
  },
  gameCardContent: {
    justifyContent: 'flex-end',
  },
  gameCardName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  gameCardDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 10,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  playButton: {
    backgroundColor: 'rgba(255,215,0,0.85)',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15,
    alignSelf: 'flex-start',
  },
  playButtonText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 12,
  },
  disclaimer: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
    color: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 30,
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  mainContainer: {
    flex: 1,
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
});
