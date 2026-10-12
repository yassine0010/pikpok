import { View, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import { Colors } from '@/constants/colors';

interface LoadingSkeletonProps {
  style?: ViewStyle;
  height?: number;
  borderRadius?: number;
}

import { ViewStyle } from 'react-native';

export function LoadingSkeleton({ style, height = 100, borderRadius = 8 }: LoadingSkeletonProps) {
  const [opacity, setOpacity] = useState(0.4);

  useEffect(() => {
    const animation = setInterval(() => {
      setOpacity((prev) => (prev === 0.4 ? 0.8 : 0.4));
    }, 1000);
    return () => clearInterval(animation);
  }, []);

  return (
    <View
      style={[
        styles.skeleton,
        { height, borderRadius, opacity },
        style
      ]}
    />
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: Colors.border,
    width: '100%'
  }
});