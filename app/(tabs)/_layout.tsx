import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { useColorScheme } from 'react-native';
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';

import { Colors } from '@/constants/Colors';
import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: 'absolute',
          },
          default: {},
        }),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Slots',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="slot-machine" size={28} color={color} />,
          tabBarButton: HapticTab,
        }}
      />
      <Tabs.Screen
        name="table-games"
        options={{
          title: 'Table Games',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="cards-playing" size={28} color={color} />,
          tabBarButton: HapticTab,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="account" size={28} color={color} />,
          tabBarButton: HapticTab,
        }}
      />
    </Tabs>
  );
}
