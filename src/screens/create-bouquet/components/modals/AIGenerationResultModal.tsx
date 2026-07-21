import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, BackHandler } from 'react-native';
import { Image } from 'expo-image';
import Toast from 'react-native-toast-message';
import { Flag } from 'lucide-react-native';
import { getFlowerImage } from '../../../../utils/bouquetData';
import { v4 as uuidv4 } from 'uuid';
import { generateRandomPosition } from '../../utils/arrangementUtils';

export const AIGenerationResultModal = ({
  aiGenerationResult,
  setAiGenerationResult,
  insets,
  styles,
  t,
  showAlert,
  setSelectedFlowers,
  setMessageCard,
  setSearchQuery,
  setCurrentStep,
  background,
}: any) => {
  useEffect(() => {
    if (!aiGenerationResult) return;
    const backAction = () => {
      setAiGenerationResult(null);
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [!!aiGenerationResult, setAiGenerationResult]);

  if (!aiGenerationResult) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 999 }]} pointerEvents="box-none">
      <View style={[styles.modalOverlay, { zIndex: 9999, elevation: 9999 }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={() => setAiGenerationResult(null)}
        />
        <View style={[styles.modalBox, { backgroundColor: '#FFFFFF', paddingTop: 20, paddingBottom: Math.max(insets.bottom + 20, 30), zIndex: 10000, elevation: 10000 }]}>
          {aiGenerationResult && (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <Text style={styles.modalTitle}>Sarah&apos;s Selection</Text>
                <TouchableOpacity
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: -4,
                    padding: 8,
                    backgroundColor: '#FFF5F5',
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: '#FFE0E0'
                  }}
                  onPress={() => {
                    const tempResult = aiGenerationResult;
                    setAiGenerationResult(null);
                    setTimeout(() => {
                      showAlert(
                        "Report Result",
                        "Help us improve Sarah! Let us know if something seems off with this bouquet suggestion.",
                        [
                          {
                            text: "Flowers don't match",
                            onPress: () => {
                              Toast.show({
                                type: 'success',
                                text1: 'Feedback received',
                                text2: 'Thanks for helping Sarah learn!'
                              });
                              setTimeout(() => setAiGenerationResult(tempResult), 250);
                            }
                          },
                          {
                            text: "Message inappropriate",
                            onPress: () => {
                              Toast.show({
                                type: 'success',
                                text1: 'Feedback received',
                                text2: 'We\'ll review this right away'
                              });
                              setTimeout(() => setAiGenerationResult(tempResult), 250);
                            }
                          },
                          {
                            text: "Other issue",
                            onPress: () => {
                              Toast.show({
                                type: 'success',
                                text1: 'Feedback received',
                                text2: 'Thank you for your input!'
                              });
                              setTimeout(() => setAiGenerationResult(tempResult), 250);
                            }
                          },
                          {
                            text: "Cancel",
                            style: "cancel",
                            onPress: () => {
                              setTimeout(() => setAiGenerationResult(tempResult), 250);
                            }
                          }
                        ]
                      );
                    }, 250);
                  }}
                  accessibilityLabel="Report this result"
                  accessibilityHint="Report if there's an issue with Sarah's suggestion"
                >
                  <Flag size={16} color="#E57373" />
                </TouchableOpacity>
              </View>
              <Text style={{ color: '#666', marginVertical: 8 }}>{aiGenerationResult.explanation}</Text>
              {aiGenerationResult.message ? (
                <View style={styles.aiBouquetMessageBox}>
                  <Text style={styles.aiBouquetMessageLabel}>{t('createBouquet.suggestedMessage')}</Text>
                  <Text style={styles.aiBouquetMessageText}>&quot;{aiGenerationResult.message}&quot;</Text>
                </View>
              ) : null}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {aiGenerationResult.flowers.map((fid: string, i: number) => {
                  const img = getFlowerImage(fid);
                  return img ? <Image key={i} source={img} style={{ width: 40, height: 40, marginRight: 8 }} resizeMode="contain" /> : null;
                })}
              </ScrollView>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity style={[styles.fabSecondary, { flex: 1 }]} onPress={() => setAiGenerationResult(null)}>
                  <Text style={styles.fabSecondaryText}>{t('createBouquet.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.fabPrimary, { flex: 1 }]} onPress={() => {
                  const newFlowers = aiGenerationResult.flowers.map((id: string) => ({ id, uniqueId: uuidv4(), ...generateRandomPosition(id, [], background) }));
                  setSelectedFlowers(newFlowers);
                  if (aiGenerationResult.message) setMessageCard((m: any) => ({ ...m, message: aiGenerationResult.message }));
                  setAiGenerationResult(null);
                  setSearchQuery('');
                  setCurrentStep(2);
                }}>
                  <Text style={styles.fabPrimaryText}>{t('createBouquet.useThis')}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );
};
