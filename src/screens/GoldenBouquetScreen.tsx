import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated, Platform, ScrollView, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import * as Clipboard from 'expo-clipboard';
import { ChevronLeft, Gift, Share2, Sparkles } from 'lucide-react-native';
import { doc, getDoc, setDoc, increment, collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const GOLD_DARK   = '#8B6914';
const GOLD_MID    = '#C9960C';
const GOLD_LIGHT  = '#F5C842';
const GOLD_BORDER = '#D4AF37';

export default function GoldenBouquetScreen() {
  const navigation = useNavigation();
  const { currentUser } = useAuth();
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  const userUniqueCode = currentUser ? `GLD-${currentUser.uid.substring(0, 5).toUpperCase()}` : '';
  const [goldenCredits, setGoldenCredits] = useState(0);
  const [joinedUsers, setJoinedUsers] = useState<any[]>([]);



  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 2500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (!currentUser || !userUniqueCode) return;
    const userDocRef = doc(db, 'users', currentUser.uid);
    const codeDocRef = doc(db, 'golden_codes', userUniqueCode);

    // Initialize code doc if it doesn't exist
    getDoc(codeDocRef).then((snap) => {
      if (!snap.exists()) {
        setDoc(codeDocRef, { ownerUid: currentUser.uid, createdAt: Date.now() }, { merge: true });
      }
    });

    // Listen to user's credits
    const unsubUser = onSnapshot(userDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setGoldenCredits(data.goldenCredits || 0);
      } else {
        setDoc(userDocRef, { goldenCredits: 0 }, { merge: true });
      }
    });

    // Listen to joined users
    const joinedRef = collection(db, `golden_codes/${userUniqueCode}/joined_users`);
    const unsubJoined = onSnapshot(joinedRef, (snap) => {
      const users = [];
      snap.forEach(docSnap => {
        users.push({ id: docSnap.id, ...docSnap.data() });
      });
      setJoinedUsers(users);
    });

    return () => {
      unsubUser();
      unsubJoined();
    };
  }, [currentUser, userUniqueCode]);

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.0, 0.15],
  });

  const handleClaim = async () => {
    if (!currentUser) {
      navigation.navigate('Login' as never);
      return;
    }
    const enteredCode = referralCode.trim().toUpperCase();
    if (!enteredCode) return;

    if (enteredCode === userUniqueCode) {
      Toast.show({ type: 'error', text1: 'You cannot use your own code.' });
      return;
    }

    setLoading(true);
    try {
      // 1. Check if user already claimed this code
      const claimRef = doc(db, `users/${currentUser.uid}/claimed_codes`, enteredCode);
      const claimSnap = await getDoc(claimRef);
      if (claimSnap.exists()) {
        setLoading(false);
        Toast.show({ type: 'error', text1: 'You have already claimed this code.' });
        return;
      }

      // 2. Check if code is valid
      const codeRef = doc(db, 'golden_codes', enteredCode);
      const codeSnap = await getDoc(codeRef);
      if (!codeSnap.exists()) {
        setLoading(false);
        Toast.show({ type: 'error', text1: 'Invalid code.' });
        return;
      }

      const creatorUid = codeSnap.data().ownerUid;

      // 3. Update both users and record claim
      // Mark as claimed
      await setDoc(claimRef, { claimedAt: Date.now() });

      // Add to creator's joined users
      const joinedRef = doc(db, `golden_codes/${enteredCode}/joined_users`, currentUser.uid);
      await setDoc(joinedRef, { 
        name: currentUser.displayName || currentUser.email?.split('@')[0] || 'A Friend',
        date: new Date().toLocaleDateString()
      });

      // Increment credits for receiver
      await setDoc(doc(db, 'users', currentUser.uid), {
        goldenCredits: increment(1)
      }, { merge: true });

      // Increment credits for creator
      await setDoc(doc(db, 'users', creatorUid), {
        goldenCredits: increment(1)
      }, { merge: true });

      setLoading(false);
      Toast.show({ type: 'success', text1: 'Golden Bouquet Unlocked! +1 Credit' });
      setReferralCode('');
      
      // Optionally navigate immediately, or let them see the success and credit bump
      // navigation.navigate('CreateBouquet' as any, { goldenMode: true, fadeUp: true } as any);

    } catch (e) {
      console.error(e);
      setLoading(false);
      Toast.show({ type: 'error', text1: 'Error claiming code. Please try again.' });
    }
  };

  const handleCreateTesting = () => {
    navigation.navigate('CreateBouquet' as any, { goldenMode: true, fadeUp: true } as any);
  };

  const copyUniqueCode = async () => {
    if (!currentUser) {
      navigation.navigate('Login' as never);
      return;
    }
    try {
      await Share.share({
        message: `Here is my Golden Bouquet code: ${userUniqueCode}`
      });
    } catch (error) {
      // ignore
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1F1A15', '#0F0C0A', '#1F1A15']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ChevronLeft size={24} color="#F5C842" />
          </TouchableOpacity>
          <View style={styles.creditsBadge}>
            <Sparkles size={14} color="#1A1200" />
            <Text style={styles.creditsText}>{goldenCredits} Credits</Text>
          </View>
        </View>

        <ScrollView 
          style={styles.scroll} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Title & Subtitle */}
          <View style={styles.titleContainer}>
            <Text style={styles.mainTitle}>Golden Bouquet</Text>
            <Text style={styles.subTitle}>An exclusive, limited edition arrangement designed to capture life's most precious moments.</Text>
          </View>

          {/* Unified Elegant Card */}
          <View style={styles.unifiedCard}>
            <Animated.View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                { borderRadius: 24, backgroundColor: GOLD_LIGHT, opacity: shimmerOpacity },
              ]}
            />
            <View style={styles.cardInner}>
              
              {/* Claim Section */}
              <View style={styles.actionBlock}>
                <View style={styles.blockHeaderRow}>
                  <Gift size={20} color={GOLD_LIGHT} />
                  <Text style={styles.blockTitle}>Claim Invitation</Text>
                </View>
                <Text style={styles.blockDesc}>Received a golden invitation? Enter your code below to unlock your creation.</Text>
                
                <View style={styles.inputRow}>
                  <TextInput 
                    style={styles.input}
                    placeholder="Enter referral code"
                    placeholderTextColor="rgba(245, 200, 66, 0.4)"
                    value={referralCode}
                    onChangeText={setReferralCode}
                    autoCapitalize="characters"
                  />
                  <TouchableOpacity 
                    style={[styles.actionBtn, !referralCode && { opacity: 0.5 }]}
                    disabled={!referralCode || loading}
                    onPress={handleClaim}
                  >
                    <Text style={styles.actionBtnText}>{loading ? '...' : 'Unlock'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Share Section */}
              <View style={styles.actionBlock}>
                <View style={styles.blockHeaderRow}>
                  <Share2 size={20} color={GOLD_LIGHT} />
                  <Text style={styles.blockTitle}>Share the Magic</Text>
                </View>
                <Text style={styles.blockDesc}>Invite friends with your unique code. You both earn a Golden Credit when they use it.</Text>
                
                <View style={styles.codeRow}>
                  <Text style={styles.codeText}>
                    {currentUser ? userUniqueCode : 'Sign in to get code'}
                  </Text>
                  <TouchableOpacity style={styles.copyBtn} onPress={copyUniqueCode}>
                    <Text style={styles.copyBtnText}>Share</Text>
                  </TouchableOpacity>
                </View>
                
                {/* Joined Users List */}
                {joinedUsers.length > 0 && (
                  <View style={{ marginTop: 24 }}>
                    <Text style={[styles.blockTitle, { fontSize: 16, marginBottom: 12 }]}>Friends Joined</Text>
                    {joinedUsers.map((u, i) => (
                      <View key={u.id} style={styles.joinedUserRow}>
                        <View style={styles.joinedUserAvatar}>
                          <Text style={styles.joinedUserInitials}>{u.name.charAt(0)}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.joinedUserName}>{u.name}</Text>
                          <Text style={styles.joinedUserDate}>{u.date}</Text>
                        </View>
                        <View style={styles.joinedUserCredit}>
                          <Text style={styles.joinedUserCreditText}>+1</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>

            </View>
          </View>

          {/* Testing Mode */}
          <TouchableOpacity style={styles.testBtn} onPress={handleCreateTesting} activeOpacity={0.8}>
            <LinearGradient
              colors={['#C9960C', '#8B6914']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.testBtnGradient}
            >
              <Sparkles size={18} color="#1A1200" />
              <Text style={styles.testBtnText}>Preview Design (Test Mode)</Text>
            </LinearGradient>
          </TouchableOpacity>
          
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0C0A',
  },
  safe: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(245, 200, 66, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245, 200, 66, 0.2)',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 50,
  },
  titleContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  mainTitle: {
    fontFamily: 'Manrope-Bold',
    fontSize: 32,
    color: GOLD_LIGHT,
    letterSpacing: 0.5,
    marginBottom: 12,
    textShadowColor: 'rgba(245, 200, 66, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  subTitle: {
    fontFamily: 'Manrope-Regular',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  unifiedCard: {
    backgroundColor: 'rgba(26, 20, 16, 0.6)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
    overflow: 'hidden',
    marginBottom: 32,
  },
  cardInner: {
    padding: 24,
  },
  actionBlock: {
    paddingVertical: 8,
  },
  blockHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  blockTitle: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 18,
    color: '#FFF',
  },
  blockDesc: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    lineHeight: 20,
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(245, 200, 66, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: GOLD_LIGHT,
    fontFamily: 'Manrope-SemiBold',
    fontSize: 14,
  },
  actionBtn: {
    backgroundColor: 'rgba(245, 200, 66, 0.15)',
    borderWidth: 1,
    borderColor: GOLD_LIGHT,
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: {
    color: GOLD_LIGHT,
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(245, 200, 66, 0.15)',
    marginVertical: 24,
  },
  codeRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(245, 200, 66, 0.2)',
    borderRadius: 12,
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
  },
  codeText: {
    flex: 1,
    color: GOLD_LIGHT,
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    letterSpacing: 2,
  },
  copyBtn: {
    backgroundColor: GOLD_LIGHT,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  copyBtnText: {
    color: '#1A1200',
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
  },
  testBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: GOLD_LIGHT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  testBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  testBtnText: {
    color: '#1A1200',
    fontFamily: 'Manrope-Bold',
    fontSize: 15,
  },
  creditsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GOLD_LIGHT,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  creditsText: {
    color: '#1A1200',
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
  },
  joinedUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 200, 66, 0.1)',
  },
  joinedUserAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245, 200, 66, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  joinedUserInitials: {
    color: GOLD_LIGHT,
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
  },
  joinedUserName: {
    color: '#FFF',
    fontFamily: 'Manrope-SemiBold',
    fontSize: 14,
  },
  joinedUserDate: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontFamily: 'Manrope-Regular',
    fontSize: 12,
    marginTop: 2,
  },
  joinedUserCredit: {
    backgroundColor: 'rgba(245, 200, 66, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  joinedUserCreditText: {
    color: GOLD_LIGHT,
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
  },
});
