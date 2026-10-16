import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Colors } from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';

interface BrandEmblemProps {
  size?: number;
}

export function BrandEmblem({ size = 80 }: BrandEmblemProps) {
  const scale = size / 80;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Background Orbit Ring */}
      <View
        style={[
          styles.orbitRing,
          {
            width: size * 0.95,
            height: size * 0.95,
            borderRadius: (size * 0.95) / 2,
          },
        ]}
      />

      {/* Tilted Sage Tile */}
      <View
        style={[
          styles.sageTile,
          {
            width: 44 * scale,
            height: 44 * scale,
            borderRadius: 12 * scale,
            transform: [{ rotate: '12deg' }, { translateX: -8 * scale }, { translateY: -4 * scale }],
          },
        ]}
      >
        <Ionicons name="sparkles" size={18 * scale} color={Colors.tertiary[500]} />
      </View>

      {/* Tilted Coral Tile */}
      <View
        style={[
          styles.coralTile,
          {
            width: 46 * scale,
            height: 46 * scale,
            borderRadius: 14 * scale,
            transform: [{ rotate: '-14deg' }, { translateX: 6 * scale }, { translateY: 6 * scale }],
          },
        ]}
      >
        <Ionicons name="flash" size={20 * scale} color={Colors.white} />
      </View>

      {/* Central Emblem Badge */}
      <View
        style={[
          styles.centerBadge,
          {
            width: 48 * scale,
            height: 48 * scale,
            borderRadius: 14 * scale,
          },
        ]}
      >
        <Ionicons name="extension-puzzle" size={26 * scale} color={Colors.white} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  orbitRing: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: Colors.neutral[200],
    borderStyle: 'dashed',
  },
  sageTile: {
    position: 'absolute',
    backgroundColor: Colors.tertiary[100],
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.tertiary[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  coralTile: {
    position: 'absolute',
    backgroundColor: Colors.primary[400],
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  centerBadge: {
    backgroundColor: Colors.secondary[800],
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.secondary[800],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
});
