import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Image } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCasino } from '../../context/CasinoContext';
import { BlurView } from 'expo-blur';
import * as GameImages from '../../assets/images/games/placeholders';
import { LinearGradient } from 'expo-linear-gradient';

export default function ExploreScreen() {
  const { credits, lastMachine, defaultBet, addCredits } = useCasino();
  const [selectedTab, setSelectedTab] = useState('stats');

  // Map machine IDs to readable names
  const machineNames = {
    'slots': 'Basic Slots',
    'advancedSlots': 'Super Slots 5000',
    'egyptianSlots': 'Egyptian Treasures',
    'cyberSlots': 'CyberHack 2000',
    'ghostPirateSlots': 'Phantom Pirate\'s Fortune',
    'luckyCharmSlots': 'Lucky Charm Slots',
    'atlantisSlots': 'Atlantis Rising',
    'specialEdSlots': 'Special Education Slots',
    'ghettoSlots': 'Hood Rich Slots',
    'blackjack': 'Blackjack',
    'roulette': 'Roulette',
    'poker': 'Video Poker',
    'craps': 'Craps',
  };

  // Add some mock achievements
  const achievements = [
    { id: 'first_win', name: 'First Win', description: 'Win your first game', completed: true, icon: 'trophy' },
    { id: 'big_win', name: 'High Roller', description: 'Win more than 1000 credits in a single game', completed: credits > 1000, icon: 'cash-multiple' },
    { id: 'slot_master', name: 'Slot Master', description: 'Play all slot machine games', completed: false, icon: 'slot-machine' },
    { id: 'card_shark', name: 'Card Shark', description: 'Win at Blackjack and Poker', completed: false, icon: 'cards' },
    { id: 'lucky_streak', name: 'Lucky Streak', description: 'Win 5 games in a row', completed: false, icon: 'lightning-bolt' },
  ];

  // Add some profile settings
  const settings = [
    { id: 'sound', name: 'Sound Effects', value: 'On', icon: 'volume-high' },
    { id: 'music', name: 'Background Music', value: 'On', icon: 'music' },
    { id: 'notifications', name: 'Notifications', value: 'Off', icon: 'bell' },
    { id: 'theme', name: 'Dark Theme', value: 'On', icon: 'theme-light-dark' },
    { id: 'currency', name: 'Currency', value: 'Credits', icon: 'cash' },
  ];

  // Render achievements tab
  const renderAchievements = () => (
    <View style={styles.sectionContainer}>
      <ThemedText style={styles.sectionTitle}>Achievements</ThemedText>
      {achievements.map(achievement => (
        <View 
          key={achievement.id} 
          style={[
            styles.achievementCard, 
            achievement.completed ? styles.achievementCompleted : styles.achievementLocked
          ]}
        >
          <View style={styles.achievementIconContainer}>
            <MaterialCommunityIcons 
              name={achievement.icon} 
              size={30} 
              color={achievement.completed ? "#FFD700" : "#666"} 
            />
          </View>
          <View style={styles.achievementInfo}>
            <ThemedText style={styles.achievementName}>
              {achievement.name}
            </ThemedText>
            <ThemedText style={styles.achievementDescription}>
              {achievement.description}
            </ThemedText>
          </View>
          <MaterialCommunityIcons 
            name={achievement.completed ? "check-circle" : "lock"} 
            size={24} 
            color={achievement.completed ? "#4CAF50" : "#666"} 
          />
        </View>
      ))}
    </View>
  );

  // Render settings tab
  const renderSettings = () => (
    <View style={styles.sectionContainer}>
      <ThemedText style={styles.sectionTitle}>Settings</ThemedText>
      {settings.map(setting => (
        <View key={setting.id} style={styles.settingRow}>
          <View style={styles.settingIconContainer}>
            <MaterialCommunityIcons name={setting.icon} size={24} color="#FFD700" />
          </View>
          <ThemedText style={styles.settingName}>
            {setting.name}
          </ThemedText>
          <ThemedText style={styles.settingValue}>
            {setting.value}
          </ThemedText>
        </View>
      ))}
    </View>
  );

  // Render stats tab
  const renderStats = () => (
    <View style={styles.sectionContainer}>
      <ThemedText style={styles.sectionTitle}>Your Stats</ThemedText>
      <View style={styles.statsCard}>
        <View style={styles.statRow}>
          <MaterialCommunityIcons name="cash" size={24} color="#FFD700" />
          <ThemedText type="subtitle">Total Credits:</ThemedText>
          <ThemedText type="subtitle" style={styles.statValue}>{credits}</ThemedText>
        </View>

        <View style={styles.statRow}>
          <MaterialCommunityIcons name="gamepad-variant" size={24} color="#FFD700" />
          <ThemedText type="subtitle">Last Played Game:</ThemedText>
          <ThemedText type="subtitle" style={styles.statValue}>
            {lastMachine ? machineNames[lastMachine] || lastMachine : 'None'}
          </ThemedText>
        </View>

        <View style={styles.statRow}>
          <MaterialCommunityIcons name="dice-multiple" size={24} color="#FFD700" />
          <ThemedText type="subtitle">Default Bet:</ThemedText>
          <ThemedText type="subtitle" style={styles.statValue}>{defaultBet}</ThemedText>
        </View>
        
        <View style={styles.statRow}>
          <MaterialCommunityIcons name="chart-line" size={24} color="#FFD700" />
          <ThemedText type="subtitle">Win/Loss Ratio:</ThemedText>
          <ThemedText type="subtitle" style={styles.statValue}>58%</ThemedText>
        </View>
      </View>
    </View>
  );

  // Main render
  return (
    <ThemedView style={styles.container}>
      <View style={styles.bgImageContainer}>
        <GameImages.CasinoBackgroundImage />
      </View>
      <View style={styles.contentContainer}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={['#FFD700', '#FFA000']}
                style={styles.avatarBorder}
              >
                <View style={styles.avatar}>
                  <MaterialCommunityIcons name="account" size={70} color="#FFF" />
                </View>
              </LinearGradient>
            </View>
            <ThemedText type="title" style={styles.username}>
              Casino Player
            </ThemedText>
            <View style={styles.vipBadge}>
              <MaterialCommunityIcons name="star" size={16} color="#000" />
              <ThemedText style={styles.vipText}>VIP MEMBER</ThemedText>
            </View>
            <ThemedText style={styles.creditsText}>
              {credits} Credits Available
            </ThemedText>
          </View>

          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, selectedTab === 'stats' && styles.activeTab]}
              onPress={() => setSelectedTab('stats')}
            >
              <MaterialCommunityIcons 
                name="chart-bar" 
                size={24} 
                color={selectedTab === 'stats' ? "#FFD700" : "#CCC"} 
              />
              <ThemedText style={[styles.tabText, selectedTab === 'stats' && styles.activeTabText]}>
                Stats
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, selectedTab === 'achievements' && styles.activeTab]}
              onPress={() => setSelectedTab('achievements')}
            >
              <MaterialCommunityIcons 
                name="trophy" 
                size={24} 
                color={selectedTab === 'achievements' ? "#FFD700" : "#CCC"} 
              />
              <ThemedText style={[styles.tabText, selectedTab === 'achievements' && styles.activeTabText]}>
                Achievements
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, selectedTab === 'settings' && styles.activeTab]}
              onPress={() => setSelectedTab('settings')}
            >
              <MaterialCommunityIcons 
                name="cog" 
                size={24} 
                color={selectedTab === 'settings' ? "#FFD700" : "#CCC"} 
              />
              <ThemedText style={[styles.tabText, selectedTab === 'settings' && styles.activeTabText]}>
                Settings
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          {selectedTab === 'stats' && renderStats()}
          {selectedTab === 'achievements' && renderAchievements()}
          {selectedTab === 'settings' && renderSettings()}

          <ThemedText style={styles.disclaimer}>
            This app is for educational purposes only. It demonstrates how casino games work without the financial risk of real gambling.
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
  scrollContent: {
    paddingVertical: 20,
    paddingHorizontal: 15,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    marginBottom: 15,
  },
  avatarBorder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    padding: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2C3E50',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  username: {
    fontSize: 24,
    color: '#FFFFFF',
    marginBottom: 5,
  },
  vipBadge: {
    flexDirection: 'row',
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
    alignItems: 'center',
    marginVertical: 5,
  },
  vipText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 5,
  },
  creditsText: {
    color: '#FFD700',
    fontSize: 16,
    marginTop: 5,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  activeTab: {
    backgroundColor: 'rgba(255,215,0,0.15)',
    borderBottomWidth: 2,
    borderBottomColor: '#FFD700',
  },
  tabText: {
    marginLeft: 8,
    color: '#CCC',
  },
  activeTabText: {
    color: '#FFD700',
    fontWeight: 'bold',
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#FFFFFF',
  },
  statsCard: {
    width: '100%',
    backgroundColor: 'rgba(44, 62, 80, 0.7)',
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    gap: 10,
  },
  statValue: {
    marginLeft: 'auto',
    fontWeight: 'bold',
    color: '#FFD700',
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(44, 62, 80, 0.7)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
  },
  achievementCompleted: {
    borderColor: '#4CAF50',
  },
  achievementLocked: {
    borderColor: 'rgba(255,255,255,0.2)',
    opacity: 0.7,
  },
  achievementIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  achievementDescription: {
    fontSize: 12,
    opacity: 0.8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(44, 62, 80, 0.7)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  settingName: {
    flex: 1,
    fontSize: 16,
  },
  settingValue: {
    color: '#FFD700',
    fontWeight: 'bold',
  },
  disclaimer: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
    opacity: 0.7,
    paddingHorizontal: 10,
  },
}); 