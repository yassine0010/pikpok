import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  SafeAreaView,
  StatusBar,
  LayoutChangeEvent,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Alert,
} from 'react-native';
import { Colors } from '@/constants/colors';
import { TopBar } from '@/components/TopBar';
import { EmptyPuzzleCard } from '@/components/EmptyPuzzleCard';

// 5 empty puzzle cards for the stream
const EMPTY_CARDS = [
  { id: 'card_1', level: 1 },
  { id: 'card_2', level: 2 },
  { id: 'card_3', level: 2 },
  { id: 'card_4', level: 3 },
  { id: 'card_5', level: 4 },
];

const PagingList = FlatList as any;
const AppStatusBar = StatusBar as any;

export default function FeedScreen() {
  const [containerHeight, setContainerHeight] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<any>(null);

  const onLayoutContainer = (e: LayoutChangeEvent) => {
    const { height } = e.nativeEvent.layout;
    if (height > 0 && height !== containerHeight) {
      setContainerHeight(height);
    }
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (containerHeight > 0) {
      const offsetY = e.nativeEvent.contentOffset.y;
      const index = Math.round(offsetY / containerHeight);
      if (index >= 0 && index < EMPTY_CARDS.length && index !== activeIndex) {
        setActiveIndex(index);
      }
    }
  };

  const handleHint = () => {
    Alert.alert('Hint', 'Hints will connect to the puzzle service in Milestone 4.');
  };

  const handleSkip = (currentIndex: number) => {
    if (currentIndex < EMPTY_CARDS.length - 1 && flatListRef.current && containerHeight > 0) {
      flatListRef.current.scrollToOffset({
        offset: (currentIndex + 1) * containerHeight,
        animated: true,
      });
    }
  };

  const handleShare = () => {
    Alert.alert('Share', 'Share functionality will be available in future releases.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppStatusBar barStyle="dark-content" />

      {/* Top Bar matching fedd ui.jpeg */}
      <TopBar title="PikPok" showStreak={true} />

      {/* Main Coral Canvas with Instagram Reels / TikTok vertical paging mechanism */}
      <View style={styles.reelStage} onLayout={onLayoutContainer}>
        {containerHeight > 0 && (
          <PagingList
            ref={flatListRef}
            data={EMPTY_CARDS}
            keyExtractor={(item: { id: string }) => item.id}
            pagingEnabled={true}
            snapToInterval={containerHeight}
            snapToAlignment="start"
            decelerationRate="fast"
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            getItemLayout={(_: any, index: number) => ({
              length: containerHeight,
              offset: containerHeight * index,
              index,
            })}
            renderItem={({ item, index }: { item: { id: string; level: number }; index: number }) => (
              <EmptyPuzzleCard
                cardIndex={index}
                totalCards={EMPTY_CARDS.length}
                level={item.level}
                cardHeight={containerHeight}
                onHintPress={handleHint}
                onSkipPress={() => handleSkip(index)}
                onSharePress={handleShare}
              />
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  reelStage: {
    flex: 1,
    backgroundColor: '#FF684A', // Vibrant coral background matching fedd ui.jpeg
  },
});
