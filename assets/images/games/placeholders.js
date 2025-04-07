import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// This file creates image placeholders for our games
// In a real app, you would replace these with actual image assets

// Function to create a placeholder with specific theme colors
export const createPlaceholder = (primaryColor, secondaryColor, pattern = 'slots') => {
  return () => (
    <LinearGradient
      colors={[primaryColor, secondaryColor]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {pattern === 'slots' && (
        <View style={styles.slotPattern}>
          {Array.from({ length: 12 }).map((_, index) => (
            <View 
              key={index} 
              style={[
                styles.slotSymbol,
                { 
                  left: `${Math.random() * 80 + 10}%`, 
                  top: `${Math.random() * 80 + 10}%`,
                  backgroundColor: index % 3 === 0 
                    ? '#FFD700' 
                    : index % 3 === 1 
                      ? '#FFFFFF' 
                      : '#FF5555',
                  transform: [{ rotate: `${Math.random() * 360}deg` }]
                }
              ]} 
            />
          ))}
        </View>
      )}
      
      {pattern === 'cards' && (
        <View style={styles.cardPattern}>
          {Array.from({ length: 5 }).map((_, index) => (
            <View 
              key={index} 
              style={[
                styles.card,
                { 
                  left: `${10 + index * 15}%`, 
                  top: `${40 + (index % 2) * 10}%`,
                  transform: [{ rotate: `${-10 + index * 5}deg` }]
                }
              ]} 
            >
              <View style={styles.cardInner} />
            </View>
          ))}
        </View>
      )}
      
      {pattern === 'table' && (
        <View style={styles.tablePattern}>
          <View style={styles.rouletteWheel}>
            <View style={styles.rouletteCenter} />
            {Array.from({ length: 8 }).map((_, index) => (
              <View 
                key={index} 
                style={[
                  styles.rouletteSection,
                  { 
                    transform: [{ rotate: `${index * 45}deg` }],
                    backgroundColor: index % 2 === 0 ? '#E91E63' : '#000000'
                  }
                ]} 
              />
            ))}
          </View>
        </View>
      )}
    </LinearGradient>
  );
};

// Create placeholder images for each game type
export const ClassicSlotsImage = createPlaceholder('#B71C1C', '#4A0404');
export const AdvancedSlotsImage = createPlaceholder('#4A148C', '#12004A');
export const EgyptianSlotsImage = createPlaceholder('#F9A825', '#7E4A00');
export const CyberSlotsImage = createPlaceholder('#006064', '#002F34');
export const GhostPirateSlotsImage = createPlaceholder('#4527A0', '#1A0056');
export const LuckyCharmSlotsImage = createPlaceholder('#2E7D32', '#0A3A0F');
export const AtlantisSlotsImage = createPlaceholder('#0277BD', '#013A5E');
export const SpecialEdSlotsImage = createPlaceholder('#3F51B5', '#1A237E');
export const GhettoSlotsImage = createPlaceholder('#9b59b6', '#8e44ad');
export const BlackjackImage = createPlaceholder('#5D4037', '#321911', 'cards');
export const RouletteImage = createPlaceholder('#880E4F', '#3F0624', 'table');
export const PokerImage = createPlaceholder('#1A237E', '#080E3F', 'cards');
export const CrapsImage = createPlaceholder('#1B5E20', '#092E0F', 'table');

// Create a casino background image
export const CasinoBackgroundImage = () => (
  <LinearGradient
    colors={['#1A2035', '#0D1117']}
    style={styles.background}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
  >
    {Array.from({ length: 50 }).map((_, index) => (
      <View 
        key={index} 
        style={[
          styles.backgroundDot,
          { 
            left: `${Math.random() * 100}%`, 
            top: `${Math.random() * 100}%`,
            width: Math.random() * 4 + 1,
            height: Math.random() * 4 + 1,
            opacity: Math.random() * 0.5 + 0.1
          }
        ]} 
      />
    ))}
  </LinearGradient>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  background: {
    flex: 1,
    position: 'relative',
  },
  backgroundDot: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  slotPattern: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  slotSymbol: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  cardPattern: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  card: {
    position: 'absolute',
    width: 40,
    height: 60,
    backgroundColor: '#FFFFFF',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInner: {
    width: '80%',
    height: '80%',
    borderRadius: 3,
    backgroundColor: 'rgba(255,0,0,0.8)',
  },
  tablePattern: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rouletteWheel: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#880E4F',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  rouletteCenter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFD700',
    zIndex: 10,
  },
  rouletteSection: {
    position: 'absolute',
    width: '50%',
    height: 10,
    top: '50%',
    left: '50%',
    marginLeft: -60,
    marginTop: -5,
    transformOrigin: '60px 5px',
  }
});

export default {
  ClassicSlotsImage,
  AdvancedSlotsImage,
  EgyptianSlotsImage,
  CyberSlotsImage,
  GhostPirateSlotsImage,
  LuckyCharmSlotsImage,
  AtlantisSlotsImage,
  SpecialEdSlotsImage,
  GhettoSlotsImage,
  BlackjackImage,
  RouletteImage,
  PokerImage,
  CrapsImage,
  CasinoBackgroundImage
}; 