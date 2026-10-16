import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Ionicons } from '@expo/vector-icons';
interface CustomTabBarProps {
  state: {
    index: number;
    routes: { key: string; name: string }[];
  };
  descriptors: Record<string, { options: { tabBarAccessibilityLabel?: string } }>;
  navigateToTab?: (routeKey: string) => void;
  navigation?: any;
}

function CustomTabBar({ state, descriptors, navigateToTab, navigation }: CustomTabBarProps) {
  return (
    <View style={styles.dockWrapper}>
      <View style={styles.floatingDock}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key] || { options: {} };
          const isFocused = state.index === index;

          const onPress = () => {
            if (!isFocused) {
              if (navigateToTab) {
                navigateToTab(route.key);
              } else if (navigation?.navigate) {
                navigation.navigate(route.name);
              }
            }
          };

          let iconName: keyof typeof Ionicons.glyphMap = 'extension-puzzle-outline';
          let label = 'Feed';

          if (route.name === 'feed') {
            iconName = isFocused ? 'compass' : 'compass-outline';
            label = 'Feed';
          } else if (route.name === 'leaderboard') {
            iconName = isFocused ? 'trophy' : 'trophy-outline';
            label = 'Ranking';
          } else if (route.name === 'stats') {
            iconName = isFocused ? 'bar-chart' : 'bar-chart-outline';
            label = 'Stats';
          } else if (route.name === 'profile') {
            iconName = isFocused ? 'person' : 'person-outline';
            label = 'Profile';
          }

          if (isFocused) {
            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={{ selected: true }}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                onPress={onPress}
                style={styles.activeTabPill}
                activeOpacity={0.85}
              >
                <Ionicons name={iconName} size={18} color={Colors.white} />
                <Text style={styles.activeTabLabel}>{label}</Text>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={{ selected: false }}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              style={styles.inactiveTabItem}
              activeOpacity={0.7}
            >
              <Ionicons name={iconName} size={18} color={Colors.secondary[600]} />
              <Text style={styles.inactiveTabLabel}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Ranking',
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  dockWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 20 : 14,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'box-none',
  },
  floatingDock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '92%',
    maxWidth: 380,
    backgroundColor: Colors.white,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#E8DFD7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowColor: Colors.secondary[900],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 8,
  },
  activeTabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF684A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    gap: 6,
    shadowColor: '#FF684A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  activeTabLabel: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Typography.fontFamily.bold,
  },
  inactiveTabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 3,
  },
  inactiveTabLabel: {
    color: '#1A1F36',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: Typography.fontFamily.semiBold,
  },
});
