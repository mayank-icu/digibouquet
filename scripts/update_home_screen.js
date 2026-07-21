const fs = require('fs');

const file = 'c:/Projects/DigiBouquet/src/screens/HomeScreen.js';
let content = fs.readFileSync(file, 'utf8');

// Update imports
content = content.replace(
  "import React, { useEffect, useState, useCallback, useRef } from 'react';",
  "import React, { useEffect, useState, useCallback, useRef, forwardRef, useImperativeHandle, memo } from 'react';"
);

// Define HamburgerMenu component before HomeScreen
const menuComponent = `
const HamburgerMenu = React.memo(React.forwardRef(({ navigation, currentUser, translate, getTextSize, isDark, t, toggleTheme, memoizedCherryBlossom, insets }, ref) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const closeMenu = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: -300, duration: 180, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setMenuVisible(false);
    });
  };

  const openMenu = () => {
    setMenuVisible(true);
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  useImperativeHandle(ref, () => ({
    open: openMenu,
    close: closeMenu,
    isOpen: () => menuVisible,
  }));

  useEffect(() => {
    if (menuVisible) {
      const backAction = () => {
        closeMenu();
        return true;
      };
      const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
      return () => backHandler.remove();
    }
  }, [menuVisible]);

  const navTo = (screen, params = {}) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate(screen, params);
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: -300, duration: 180, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setMenuVisible(false);
    });
  };

  const handleRateUs = async () => {
    closeMenu();
    const storeUrl = 'https://play.google.com/store/apps/details?id=com.egreet.digibouquet';
    if (Platform.OS !== 'web' && await StoreReview.isAvailableAsync()) {
      await StoreReview.requestReview();
    } else {
      Linking.openURL(storeUrl);
    }
  };

  const handleToggleTheme = () => {
    toggleTheme();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  if (!menuVisible && slideAnim._value === -300) return null;

  return (
    <View 
      style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]} 
      pointerEvents={menuVisible ? 'auto' : 'none'}
    >
      <View style={styles.menuOverlay}>
        <Animated.View style={[styles.menuCloseArea, { opacity: fadeAnim, backgroundColor: 'rgba(0,0,0,0.4)' }]}>
          <HapticButton style={{ flex: 1 }} onPress={closeMenu} activeOpacity={1} />
        </Animated.View>
        <Animated.View style={[styles.menuContainer, { transform: [{ translateX: slideAnim }], backgroundColor: t.bg }]}>
          <View style={[styles.menuHeader, { paddingTop: insets.top + 8, borderBottomColor: t.border }]}>
            <PremiumImage source={require('./textlogo-oneline.png')} style={styles.menuLogo} resizeMode="contain" />
            <HapticButton onPress={closeMenu}>
              <Feather name="x" size={24} color={t.text} />
            </HapticButton>
          </View>
          <View style={styles.menuItems}>
            {currentUser ? (
              <>
                <HapticButton style={styles.menuItem} onPress={() => navTo('Profile')}>
                  <Feather name="user" size={20} color={t.text} />
                  <Text style={[styles.menuItemText, { color: t.text, fontSize: getTextSize(15) }]}>{translate('menu.profile')}</Text>
                </HapticButton>
              </>
            ) : (
              <>
                <HapticButton style={styles.menuItem} onPress={() => navTo('Login')}>
                  <Feather name="log-in" size={20} color={t.text} />
                  <Text style={[styles.menuItemText, { color: t.text, fontSize: getTextSize(16) }]}>{translate('menu.signIn')}</Text>
                </HapticButton>
                <HapticButton style={styles.menuItem} onPress={() => navTo('Register')}>
                  <Feather name="user-plus" size={20} color={t.text} />
                  <Text style={[styles.menuItemText, { color: t.text, fontSize: getTextSize(16) }]}>{translate('menu.createAccount')}</Text>
                </HapticButton>
                <HapticButton style={styles.menuItem} onPress={() => navTo('Language')}>
                  <Feather name="globe" size={20} color={t.text} />
                  <Text style={[styles.menuItemText, { color: t.text, fontSize: getTextSize(16) }]}>{translate('profile.language') || 'Language'}</Text>
                </HapticButton>
              </>
            )}

            <View style={[styles.menuDivider, { backgroundColor: t.border }]} />
            {currentUser && (
              <HapticButton style={styles.menuItem} onPress={() => navTo('Feedback')}>
              <Feather name="message-square" size={20} color={t.text} />
              <Text style={[styles.menuItemText, { color: t.text, fontSize: getTextSize(15) }]}>{translate('menu.feedback')}</Text>
            </HapticButton>
            )}
            <HapticButton style={styles.menuItem} onPress={handleRateUs}>
              <Feather name="star" size={20} color={t.text} />
              <Text style={[styles.menuItemText, { color: t.text, fontSize: getTextSize(15) }]}>{translate('menu.rateUs')}</Text>
            </HapticButton>
            <HapticButton style={styles.menuItem} onPress={() => navTo('About')}>
              <Feather name="info" size={20} color={t.text} />
              <Text style={[styles.menuItemText, { color: t.text, fontSize: getTextSize(15) }]}>{translate('menu.about')}</Text>
            </HapticButton>
            <HapticButton style={styles.menuItem} onPress={() => navTo('Settings')}>
              <Feather name="settings" size={20} color={t.text} />
              <Text style={[styles.menuItemText, { color: t.text, fontSize: getTextSize(15) }]}>{translate('menu.settings')}</Text>
            </HapticButton>
            <View style={[styles.menuItem, { justifyContent: 'space-between', paddingTop: 20 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Feather name={isDark ? 'sun' : 'moon'} size={20} color={t.text} />
                <Text style={[styles.menuItemText, { color: t.text, fontSize: getTextSize(15) }]}>
                  {isDark ? translate('menu.lightMode') : translate('menu.darkMode')}
                </Text>
              </View>
              <HapticButton onPress={handleToggleTheme} activeOpacity={0.8}>
                <View style={[styles.customToggle, { backgroundColor: isDark ? t.brand : t.border }]}>
                  <View style={[styles.customToggleCircle, { 
                    transform: [{ translateX: isDark ? 20 : 0 }],
                    backgroundColor: '#fff'
                  }]} />
                </View>
              </HapticButton>
            </View>
          </View>

          <View style={{ position: 'absolute', bottom: 0, left: 0, zIndex: -1, opacity: 0.6 }}>
            {memoizedCherryBlossom}
          </View>

          {/* Made with love footer */}
          <View style={styles.menuFooter}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.menuFooterText, { color: t.textMuted, fontSize: getTextSize(12) }]}>{translate('home.madeWithLove')}</Text>
              <MaterialCommunityIcons name="heart" size={14} color="#7A5C58" style={{ opacity: 0.8 }} />
            </View>
            <Text style={[styles.menuFooterVersion, { color: t.textMuted }]}>v{packageJson.version}</Text>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}));

export default function HomeScreen`;

content = content.replace('export default function HomeScreen', menuComponent);

// Remove state from HomeScreen
const stateStr = `  const [menuVisible, setMenuVisible] = useState(false);
  const [slideAnim] = useState(() => new Animated.Value(-300));
  const [fadeAnim] = useState(() => new Animated.Value(0));`;

content = content.replace(stateStr, '  const menuRef = useRef(null);');

// Remove hardware back button effect from HomeScreen
const backEffectStr = `  useEffect(() => {
    if (menuVisible) {
      const backAction = () => {
        closeMenu();
        return true;
      };
      const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
      return () => backHandler.remove();
    }
  }, [menuVisible]);`;

content = content.replace(backEffectStr, '');

// Remove handleToggleTheme
const toggleThemeStr = `  const handleToggleTheme = () => {
    // Immediately toggle theme for instant UI response
    toggleTheme();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };`;

content = content.replace(toggleThemeStr, '');

// Remove closeMenu and navTo
const menuFnsStr = `  const closeMenu = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: -300, duration: 180, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setMenuVisible(false);
    });
  };

  const navTo = (screen, params = {}) => {
    // Add light haptic feedback for premium feel
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Start navigation first - this begins the transition under the modal
    navigation.navigate(screen, params);
    
    // Animate the menu out quickly (faster for premium feel)
    // 180ms provides a smooth exit that overlaps with the nav transition
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: -300, duration: 180, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      // Only unmount the modal after animation finishes
      setMenuVisible(false);
    });
  };`;

content = content.replace(menuFnsStr, '');

// Replace handleRateUs
const rateUsStr = `  const handleRateUs = async () => {
    closeMenu();
    const storeUrl = 'https://play.google.com/store/apps/details?id=com.egreet.digibouquet';
    if (Platform.OS !== 'web' && await StoreReview.isAvailableAsync()) {
      await StoreReview.requestReview();
    } else {
      Linking.openURL(storeUrl);
    }
  };`;

content = content.replace(rateUsStr, '');

// Replace openMenu
const openMenuStr = `  const openMenu = () => {
    setMenuVisible(true);
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };`;

content = content.replace(openMenuStr, `  const openMenu = () => {
    menuRef.current?.open();
  };`);

// Replace swipe handlers logic
const swipeHandlersStr = `  const swipeHandlers = useSwipeNavigation({
    onSwipeLeft: () => {
      if (menuVisible) {
        closeMenu(); // Close menu if open
      } else {
        navigation.navigate('GameHub', { fade: true }); // Navigate to Games
      }
    },
    onSwipeRight: () => {
      if (!menuVisible) {
        openMenu(); // Use the smooth openMenu function
      }
    },
  });`;

content = content.replace(swipeHandlersStr, `  const swipeHandlers = useSwipeNavigation({
    onSwipeLeft: () => {
      if (menuRef.current?.isOpen()) {
        menuRef.current?.close(); // Close menu if open
      } else {
        navigation.navigate('GameHub', { fade: true }); // Navigate to Games
      }
    },
    onSwipeRight: () => {
      if (!menuRef.current?.isOpen()) {
        openMenu(); // Use the smooth openMenu function
      }
    },
  });`);

// Replace the old JSX menu with HamburgerMenu
const oldMenuJsx = `      {/* ── Hamburger Menu Overlay ── */}
      <View 
        style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]} 
        pointerEvents={menuVisible ? 'auto' : 'none'}
      >
        <View style={styles.menuOverlay}>
          <Animated.View style={[styles.menuCloseArea, { opacity: fadeAnim, backgroundColor: 'rgba(0,0,0,0.4)' }]}>
            <HapticButton style={{ flex: 1 }} onPress={() => closeMenu()} activeOpacity={1} />
          </Animated.View>
          <Animated.View style={[styles.menuContainer, { transform: [{ translateX: slideAnim }], backgroundColor: t.bg }]}>
            <View style={[styles.menuHeader, { paddingTop: insets.top + 8, borderBottomColor: t.border }]}>
              <PremiumImage source={require('./textlogo-oneline.png')} style={styles.menuLogo} resizeMode="contain" />
              <HapticButton onPress={() => closeMenu()}>
                <Feather name="x" size={24} color={t.text} />
              </HapticButton>
            </View>
            <View style={styles.menuItems}>
              {currentUser ? (
                <>
                  <HapticButton style={styles.menuItem} onPress={() => navTo('Profile')}>
                    <Feather name="user" size={20} color={t.text} />
                    <Text style={[styles.menuItemText, { color: t.text, fontSize: getTextSize(15) }]}>{translate('menu.profile')}</Text>
                  </HapticButton>
                </>
              ) : (
                <>
                  <HapticButton style={styles.menuItem} onPress={() => navTo('Login')}>
                    <Feather name="log-in" size={20} color={t.text} />
                    <Text style={[styles.menuItemText, { color: t.text, fontSize: getTextSize(16) }]}>{translate('menu.signIn')}</Text>
                  </HapticButton>
                  <HapticButton style={styles.menuItem} onPress={() => navTo('Register')}>
                    <Feather name="user-plus" size={20} color={t.text} />
                    <Text style={[styles.menuItemText, { color: t.text, fontSize: getTextSize(16) }]}>{translate('menu.createAccount')}</Text>
                  </HapticButton>
                  <HapticButton style={styles.menuItem} onPress={() => navTo('Language')}>
                    <Feather name="globe" size={20} color={t.text} />
                    <Text style={[styles.menuItemText, { color: t.text, fontSize: getTextSize(16) }]}>{translate('profile.language') || 'Language'}</Text>
                  </HapticButton>
                </>
              )}



              <View style={[styles.menuDivider, { backgroundColor: t.border }]} />
              {currentUser && (
                <HapticButton style={styles.menuItem} onPress={() => navTo('Feedback')}>
                <Feather name="message-square" size={20} color={t.text} />
                <Text style={[styles.menuItemText, { color: t.text, fontSize: getTextSize(15) }]}>{translate('menu.feedback')}</Text>
              </HapticButton>
              )}
              <HapticButton style={styles.menuItem} onPress={handleRateUs}>
                <Feather name="star" size={20} color={t.text} />
                <Text style={[styles.menuItemText, { color: t.text, fontSize: getTextSize(15) }]}>{translate('menu.rateUs')}</Text>
              </HapticButton>
              <HapticButton style={styles.menuItem} onPress={() => navTo('About')}>
                <Feather name="info" size={20} color={t.text} />
                <Text style={[styles.menuItemText, { color: t.text, fontSize: getTextSize(15) }]}>{translate('menu.about')}</Text>
              </HapticButton>
              <HapticButton style={styles.menuItem} onPress={() => navTo('Settings')}>
                <Feather name="settings" size={20} color={t.text} />
                <Text style={[styles.menuItemText, { color: t.text, fontSize: getTextSize(15) }]}>{translate('menu.settings')}</Text>
              </HapticButton>
              <View style={[styles.menuItem, { justifyContent: 'space-between', paddingTop: 20 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Feather name={isDark ? 'sun' : 'moon'} size={20} color={t.text} />
                  <Text style={[styles.menuItemText, { color: t.text, fontSize: getTextSize(15) }]}>
                    {isDark ? translate('menu.lightMode') : translate('menu.darkMode')}
                  </Text>
                </View>
                <HapticButton onPress={handleToggleTheme} activeOpacity={0.8}>
                  <View style={[styles.customToggle, { backgroundColor: isDark ? t.brand : t.border }]}>
                    <View style={[styles.customToggleCircle, { 
                      transform: [{ translateX: isDark ? 20 : 0 }],
                      backgroundColor: '#fff'
                    }]} />
                  </View>
                </HapticButton>
              </View>
            </View>

            <View style={{ position: 'absolute', bottom: 0, left: 0, zIndex: -1, opacity: 0.6 }}>
              {memoizedCherryBlossom}
            </View>

            {/* Made with love footer */}
            <View style={styles.menuFooter}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.menuFooterText, { color: t.textMuted, fontSize: getTextSize(12) }]}>{translate('home.madeWithLove')}</Text>
                <MaterialCommunityIcons name="heart" size={14} color="#7A5C58" style={{ opacity: 0.8 }} />
              </View>
              <Text style={[styles.menuFooterVersion, { color: t.textMuted }]}>v{packageJson.version}</Text>
            </View>
          </Animated.View>
        </View>
      </View>`;

content = content.replace(oldMenuJsx, `      {/* ── Hamburger Menu Overlay ── */}
      <HamburgerMenu
        ref={menuRef}
        navigation={navigation}
        currentUser={currentUser}
        translate={translate}
        getTextSize={getTextSize}
        isDark={isDark}
        t={t}
        toggleTheme={toggleTheme}
        memoizedCherryBlossom={memoizedCherryBlossom}
        insets={insets}
      />`);

fs.writeFileSync(file, content);
console.log('Update successful');
