import { HapticButton } from './HapticButton';
import React, { useRef, useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

export default function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { theme: t } = useTheme();
  
  const [navBarWidth, setNavBarWidth] = useState(0);
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Determine target index (skipping the center Create button at index 2)
    const targetIndex = state.index > 2 ? state.index - 1 : state.index;
    Animated.spring(tabIndicatorAnim, {
      toValue: targetIndex,
      useNativeDriver: true,
      tension: 68,
      friction: 11,
    }).start();
  }, [state.index]);

  return (
    <Animated.View
      style={[
        styles.bottomNav,
        {
          backgroundColor: t.navBg,
          bottom: insets.bottom > 0 ? insets.bottom + 8 : 16,
        },
      ]}
      onLayout={(e) => setNavBarWidth(e.nativeEvent.layout.width)}
    >
      {/* Sliding active pill */}
      {navBarWidth > 0 && (() => {
        const availW = navBarWidth - 60 - 24;
        const slotW = availW / 4;
        const pillW = 60;
        const pillH = 40;
        const slot0X = 12 + slotW * 0 + slotW / 2 - pillW / 2;
        const slot1X = 12 + slotW * 1 + slotW / 2 - pillW / 2;
        const slot2X = 12 + slotW * 2 + 60 + slotW / 2 - pillW / 2;
        const slot3X = 12 + slotW * 3 + 60 + slotW / 2 - pillW / 2;
        const pillX = tabIndicatorAnim.interpolate({
          inputRange: [0, 1, 2, 3],
          outputRange: [slot0X, slot1X, slot2X, slot3X],
          extrapolate: 'clamp',
        });
        return (
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: (66 - pillH) / 2,
              left: 0,
              width: pillW,
              height: pillH,
              borderRadius: 18,
              backgroundColor: t.brand + '18',
              transform: [{ translateX: pillX }],
              zIndex: 0,
            }}
          />
        );
      })()}

      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        
        if (route.name === 'CreateBouquetDummy') {
          return (
            <View key={route.key} style={styles.fabWrapper}>
              <HapticButton
                style={[styles.fab, { backgroundColor: t.brand, borderColor: t.navBg }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  navigation.navigate('CreateBouquet', { occasion: { label: 'New' }, fadeUp: true });
                }}
                activeOpacity={0.75}
              >
                <Feather name="plus" size={24} color="#fff" />
              </HapticButton>
            </View>
          );
        }

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate({ name: route.name, merge: true });
          }
        };

        let iconName = '';
        if (route.name === 'Home') iconName = isFocused ? 'home' : 'home-outline';
        else if (route.name === 'GameHub') iconName = isFocused ? 'game-controller' : 'game-controller-outline';
        else if (route.name === 'History') iconName = isFocused ? 'time' : 'time-outline';
        else if (route.name === 'Shop') iconName = isFocused ? 'bag-handle' : 'bag-handle-outline';

        return (
          <HapticButton
            key={route.key}
            style={styles.navItem}
            onPress={onPress}
          >
            <View style={[styles.activeIconContainer, { backgroundColor: 'transparent' }]}>
              <Ionicons name={iconName} size={22} color={isFocused ? t.brand : t.textMuted} />
            </View>
          </HapticButton>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    height: 66,
    zIndex: 1000,
  },
  activeIconContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 18,
  },
  navItem: { 
    alignItems: 'center', 
    justifyContent: 'center',
    flex: 1,
    height: '100%',
  },
  fabWrapper: { 
    width: 60,
    height: '100%',
    alignItems: 'center', 
    justifyContent: 'center',
    position: 'relative',
  },
  fab: {
    width: 56, 
    height: 56, 
    borderRadius: 28,
    alignItems: 'center', 
    justifyContent: 'center',
    position: 'absolute',
    top: -8,
    borderWidth: 3.5,
  },
});
