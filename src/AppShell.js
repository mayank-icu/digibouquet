import * as React from 'react';
import { NavigationContainer, getStateFromPath } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import CustomTabBar from './components/CustomTabBar';
import {
  useFonts,
  Manrope_200ExtraLight,
  Manrope_300Light,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import { DancingScript_400Regular, DancingScript_700Bold } from '@expo-google-fonts/dancing-script';
import { Merriweather_400Regular, Merriweather_700Bold, Merriweather_400Regular_Italic } from '@expo-google-fonts/merriweather';
import { Quicksand_400Regular, Quicksand_600SemiBold } from '@expo-google-fonts/quicksand';
import { PlayfairDisplay_400Regular, PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { Poppins_400Regular, Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { Caveat_400Regular, Caveat_700Bold } from '@expo-google-fonts/caveat';
import { SpecialElite_400Regular } from '@expo-google-fonts/special-elite';
import { JosefinSans_400Regular, JosefinSans_600SemiBold } from '@expo-google-fonts/josefin-sans';
import { Cinzel_400Regular, Cinzel_700Bold } from '@expo-google-fonts/cinzel';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform, View, Text, Linking, LogBox } from 'react-native';
import * as Notifications from 'expo-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { Check, X, Info as InfoIcon } from 'lucide-react-native';
import { collection, query, onSnapshot, orderBy, limit, where } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth , AuthProvider } from './contexts/AuthContext';
import { scheduleInteractionNotification , scheduleHolidayNotifications } from './utils/notifications';
import { checkForInstallReferrer } from './utils/referral';

import { AlertProvider } from './contexts/AlertContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { AccessibilityProvider } from './contexts/AccessibilityContext';
import { CountryProvider } from './contexts/CountryContext';


LogBox.ignoreLogs([
  'Encountered an error loading page',
  'react-native-youtube-iframe',
  '@firebase/firestore: Firestore',
  'Instant email failed',
  'WebChannelConnection RPC'
]);

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const FORCE_SHOW_WELCOME = false;

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false, unmountOnBlur: false }}
    >
      <Tab.Screen name="Home" getComponent={() => require('./screens/HomeScreen').default} />
      <Tab.Screen name="GameHub" getComponent={() => require('./screens/GameHubScreen').default} />
      <Tab.Screen name="CreateBouquetDummy" component={View} />
      <Tab.Screen name="History" getComponent={() => require('./screens/HistoryScreen').default} />
      <Tab.Screen name="Shop" getComponent={() => require('./screens/ShopScreen').default} />
    </Tab.Navigator>
  );
}

const toastConfig = {
  success: (props) => (
    <View style={{
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(74, 93, 58, 0.1)',
    }}>
      <View style={{
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#4A5D3A',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
      }}>
        <Check size={14} color="#FAF7F2" strokeWidth={3} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontFamily: 'Manrope-SemiBold', color: '#2C2416' }}>
          {props.text1}
        </Text>
        {props.text2 && (
          <Text style={{ fontSize: 11, fontFamily: 'Manrope-Regular', color: '#6B5B4C', marginTop: 1 }}>
            {props.text2}
          </Text>
        )}
      </View>
    </View>
  ),
  error: (props) => (
    <View style={{
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(196, 69, 69, 0.1)',
    }}>
      <View style={{
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#C44545',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
      }}>
        <X size={14} color="#FAF7F2" strokeWidth={3} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontFamily: 'Manrope-SemiBold', color: '#2C2416' }}>
          {props.text1}
        </Text>
        {props.text2 && (
          <Text style={{ fontSize: 11, fontFamily: 'Manrope-Regular', color: '#6B5B4C', marginTop: 1 }}>
            {props.text2}
          </Text>
        )}
      </View>
    </View>
  ),
  info: (props) => (
    <View style={{
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(139, 115, 85, 0.1)',
    }}>
      <View style={{
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#8B7355',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
      }}>
        <InfoIcon size={14} color="#FAF7F2" strokeWidth={3} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontFamily: 'Manrope-SemiBold', color: '#2C2416' }}>
          {props.text1}
        </Text>
        {props.text2 && (
          <Text style={{ fontSize: 11, fontFamily: 'Manrope-Regular', color: '#6B5B4C', marginTop: 1 }}>
            {props.text2}
          </Text>
        )}
      </View>
    </View>
  ),
};

const linking = {
  prefixes: [process.env.EXPO_PUBLIC_EGREET_URL || 'https://egreet.in', 'digibouquet://'],
  config: {
    screens: {
      MakeBouquetTogether: 'together',
      BouquetView: 'bouquet/reply',
      Home: '*',
    },
  },
  getStateFromPath(path, options) {
    const urlParts = path.split('?');
    const cleanPath = urlParts[0];
    const queryString = urlParts[1] || '';
    const normalizedPath = cleanPath.replace(/^\/+/, '');
    
    if (normalizedPath.startsWith('bouquet/')) {
      let id = '';
      if (normalizedPath === 'bouquet/reply') {
        const match = queryString.match(/(?:^|&)id=([^&]+)/);
        if (match) {
          id = decodeURIComponent(match[1]);
        }
      } else {
        id = normalizedPath.substring('bouquet/'.length);
      }
      
      if (id) {
        return {
          routes: [
            {
              name: 'MainTabs',
            },
            {
              name: 'BouquetView',
              params: { id }
            }
          ]
        };
      }
    }
    return getStateFromPath(path, options);
  },
  async getInitialURL() {
    const url = await Linking.getInitialURL();
    if (url != null) return url;
    
    // Check if app was opened from a push notification
    const response = await Notifications.getLastNotificationResponseAsync();
    const notifUrl = response?.notification?.request?.content?.data?.url;
    if (notifUrl) return notifUrl;
    
    return null;
  },
  subscribe(listener) {
    const onReceiveURL = ({ url }) => listener(url);
    const linkingSubscription = Linking.addEventListener('url', onReceiveURL);
    
    const notificationSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const url = response.notification.request.content.data.url;
      if (url) {
        listener(url);
      }
    });
    
    return () => {
      linkingSubscription.remove();
      notificationSubscription.remove();
    };
  }
};

function ThemedNavigator({ initialRoute }) {
  const { theme: t } = useTheme();
  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          animation: Platform.OS === 'web' ? 'none' : 'slide_from_right',
          animationDuration: 180,
          contentStyle: { backgroundColor: t.bg },
        }}
      >
        <Stack.Screen name="LanguagePicker" getComponent={() => require('./screens/LanguagePickerScreen').default} />
        <Stack.Screen name="Welcome" getComponent={() => require('./screens/WelcomeScreen').default} />
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ animation: 'none' }} />
        <Stack.Screen name="ProActivation" getComponent={() => require('./screens/ProActivationScreen').default} />
        <Stack.Screen 
          name="CreateBouquet" 
          getComponent={() => require('./screens/CreateBouquetScreen').default}
          options={({ route }) => ({
            animation: route.params?.fadeUp ? 'fade_from_bottom' : 'none',
          })}
        />
        <Stack.Screen name="BouquetView" getComponent={() => require('./screens/BouquetViewScreen').default} />
        <Stack.Screen name="WallpaperHub" getComponent={() => require('./screens/WallpaperHubScreen').default} />
        <Stack.Screen name="WallpaperSetup" getComponent={() => require('./screens/WallpaperSetupScreen').default} />
        <Stack.Screen name="Feedback" getComponent={() => require('./screens/FeedbackScreen').default} />
        <Stack.Screen name="About" getComponent={() => require('./screens/AboutScreen').default} />
        <Stack.Screen name="Terms" getComponent={() => require('./screens/TermsScreen').default} />
        <Stack.Screen name="Privacy" getComponent={() => require('./screens/PrivacyScreen').default} />
        <Stack.Screen name="Login" getComponent={() => require('./screens/LoginScreen').default} />
        <Stack.Screen name="Register" getComponent={() => require('./screens/RegisterScreen').default} />
        <Stack.Screen name="ForgotPassword" getComponent={() => require('./screens/ForgotPasswordScreen').default} />
        <Stack.Screen name="Notifications" getComponent={() => require('./screens/NotificationsScreen').default} />
        <Stack.Screen name="Profile" getComponent={() => require('./screens/ProfileScreen').default} />
        <Stack.Screen name="Discover" getComponent={() => require('./screens/DiscoverScreen').default} />
        <Stack.Screen name="Accessibility" getComponent={() => require('./screens/AccessibilityScreen').default} />
        <Stack.Screen name="DataManagement" getComponent={() => require('./screens/DataManagementScreen').default} />
        <Stack.Screen 
          name="Language" 
          getComponent={() => require('./screens/LanguageScreen').default} 
          options={{
            presentation: 'transparentModal',
            animation: 'fade',
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
        <Stack.Screen name="ScheduledEmails" getComponent={() => require('./screens/ScheduledEmailsScreen').default} />
        <Stack.Screen name="WidgetOverlay" getComponent={() => require('./screens/WidgetOverlayScreen').default} />
        <Stack.Screen name="Settings" getComponent={() => require('./screens/SettingsScreen').default} />
        <Stack.Screen name="MakeBouquetTogether" getComponent={() => require('./screens/MakeBouquetTogetherScreen').default} />
        <Stack.Screen name="FlowerLanguage" getComponent={() => require('./screens/FlowerLanguageScreen').default} />
        <Stack.Screen name="FloristRecipeCard" getComponent={() => require('./screens/FloristRecipeCardScreen').default} />
        <Stack.Screen name="BlossomSortGame" getComponent={() => require('./screens/BlossomSortGameScreen').default} />
        <Stack.Screen name="BlossomLinkGame" getComponent={() => require('./screens/BlossomLinkGameScreen').default} />
        <Stack.Screen name="GameLevelPath" getComponent={() => require('./screens/GameLevelPathScreen').default} />
        <Stack.Screen name="Credits" getComponent={() => require('./screens/CreditsScreen').default} />

        <Stack.Screen name="BirthFlowerWallpaper" getComponent={() => require('./screens/BirthFlowerWallpaperScreen').default} />
        <Stack.Screen name="CreativeStudio" getComponent={() => require('./screens/CreativeStudioScreen').default} />
        <Stack.Screen name="GoldenBouquet" getComponent={() => require('./screens/GoldenBouquetScreen').default} />
        <Stack.Screen name="RandomActMode" getComponent={() => require('./screens/create-bouquet/modes/RandomActMode').RandomActMode} />
        <Stack.Screen name="BridalMakerMain" getComponent={() => require('./screens/bridal-bouquet-maker/MainPage').default} />
        <Stack.Screen name="BridalMakerSaved" getComponent={() => require('./screens/bridal-bouquet-maker/SavedDesignsPage').default} />
        <Stack.Screen name="BridalMakerDesign" getComponent={() => require('./screens/bridal-bouquet-maker/DesignPage').default} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function ThemedRoot({ children }) {
  const { theme: t } = useTheme();
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: t.bg }}>
      {children}
    </GestureHandlerRootView>
  );
}

function InteractionListener() {
  const { currentUser } = useAuth();
  const initialLoadRef = React.useRef(true);

  React.useEffect(() => {
    if (!currentUser) return;
    
    const q = query(
      collection(db, 'notifications', currentUser.uid, 'items'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsub = onSnapshot(q, (snap) => {
      if (initialLoadRef.current) {
        initialLoadRef.current = false;
        return;
      }
      
      snap.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const d = change.doc.data();
          // Only schedule a local notification for 'referral' — reply push is
          // already sent by the Cloud Function (onBouquetReply). Firing it here
          // too would cause a double-notification for every reply.
          if (!d.read && d.type === 'referral') {
            scheduleInteractionNotification(d.type, d.username, d.bouquetId);
          }
        }
      });
    });

    return unsub;
  }, [currentUser]);

  return null;
}

// AppShell handles all heavy init. Calls onReady() once fonts + storage are done.
export default function AppShell({ onReady }) {
  const [fontsLoaded, fontError] = useFonts({
    'Manrope-ExtraLight': Manrope_200ExtraLight,
    'Manrope-Light':      Manrope_300Light,
    'Manrope-Regular':    Manrope_400Regular,
    'Manrope-Medium':     Manrope_500Medium,
    'Manrope-SemiBold':   Manrope_600SemiBold,
    'Manrope-Bold':       Manrope_700Bold,
    'Manrope-LightItalic': Manrope_300Light,
    'DancingScript-Regular': DancingScript_400Regular,
    'DancingScript-Bold':    DancingScript_700Bold,
    'Merriweather-Regular':  Merriweather_400Regular,
    'Merriweather-Bold':     Merriweather_700Bold,
    'Merriweather-Italic':   Merriweather_400Regular_Italic,
    'Quicksand-Regular':     Quicksand_400Regular,
    'Quicksand-SemiBold':    Quicksand_600SemiBold,
    'PlayfairDisplay-Regular': PlayfairDisplay_400Regular,
    'PlayfairDisplay-Bold':    PlayfairDisplay_700Bold,
    'Poppins-Regular':    Poppins_400Regular,
    'Poppins-SemiBold':   Poppins_600SemiBold,
    'Caveat-Regular':     Caveat_400Regular,
    'Caveat-Bold':        Caveat_700Bold,
    'SpecialElite-Regular': SpecialElite_400Regular,
    'JosefinSans-Regular': JosefinSans_400Regular,
    'JosefinSans-SemiBold': JosefinSans_600SemiBold,
    'Cinzel-Regular':     Cinzel_400Regular,
    'Cinzel-Bold':        Cinzel_700Bold,
    // Wallpaper & Stage-3 fonts — loaded directly from sub-paths to avoid ESM index issues
    'Satisfy-Regular': require('@expo-google-fonts/satisfy/400Regular/Satisfy_400Regular.ttf'),
    'Lora-Regular':    require('@expo-google-fonts/lora/400Regular/Lora_400Regular.ttf'),
    'Lora-Italic':     require('@expo-google-fonts/lora/400Regular_Italic/Lora_400Regular_Italic.ttf'),
    'Lora-Medium':     require('@expo-google-fonts/lora/500Medium/Lora_500Medium.ttf'),
  });

  const [isFirstLaunch, setIsFirstLaunch] = React.useState(null);
  const [hasPickedLanguage, setHasPickedLanguage] = React.useState(null);
  const onReadyCalledRef = React.useRef(false);

  React.useEffect(() => {
    // Reduce timeout from 3000ms to 1500ms for faster fallback
    const timer = setTimeout(() => {
      setIsFirstLaunch(prev => (prev === null ? false : prev));
      setHasPickedLanguage(prev => (prev === null ? false : prev));
    }, 1500);

    Promise.all([
      AsyncStorage.getItem('hasLaunched'),
      AsyncStorage.getItem('hasPickedLanguage'),
    ])
      .then(([launched, pickedLang]) => {
        clearTimeout(timer);
        if (launched === null) {
          AsyncStorage.setItem('hasLaunched', 'true');
          setIsFirstLaunch(true);
        } else {
          setIsFirstLaunch(false);
        }
        setHasPickedLanguage(pickedLang !== null);
      })
      .catch(() => {
        clearTimeout(timer);
        setIsFirstLaunch(false);
        setHasPickedLanguage(false);
      });

    // Schedule holiday notifications (if enabled by user)
    scheduleHolidayNotifications();

    // Check for Android Google Play install referrer
    checkForInstallReferrer();

    return () => clearTimeout(timer);
  }, []);

  const appReady = (fontsLoaded || fontError) && isFirstLaunch !== null && hasPickedLanguage !== null;

  // Signal parent once — parent will reveal us after splash finishes
  React.useEffect(() => {
    if (appReady && !onReadyCalledRef.current) {
      onReadyCalledRef.current = true;
      onReady();
    }
  }, [appReady, onReady]);

  if (!appReady) {
    // Render nothing visible — cream bg from parent covers this
    return <View style={{ flex: 1, backgroundColor: '#FAF7F2' }} />;
  }

  let initialRoute = 'MainTabs';
  if (FORCE_SHOW_WELCOME || isFirstLaunch) {
    initialRoute = 'Welcome';
  }

  return (
    <ThemeProvider>
      <ThemedRoot>
        <SafeAreaProvider>
          <AuthProvider>
            <CountryProvider>
              <AlertProvider>
                <LanguageProvider>
                  <AccessibilityProvider>
                    <InteractionListener />
                    <ThemedNavigator initialRoute={initialRoute} />
                  </AccessibilityProvider>
                </LanguageProvider>
              </AlertProvider>
            </CountryProvider>
          </AuthProvider>
        </SafeAreaProvider>
        <Toast config={toastConfig} />
      </ThemedRoot>
    </ThemeProvider>
  );
}
