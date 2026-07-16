import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Image, StyleSheet, LayoutAnimation, UIManager, Platform, Modal } from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { Calendar, Clock, Music, X } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Sparkles } from 'lucide-react-native';
import MessageMediaUploader from '../../../components/MessageMediaUploader';

export const Stage3Message = ({
  insets,
  themeColors,
  styles,
  t,
  scrollViewRef,
  editId,
  isRandomActMode,
  messageCard,
  setMessageCard,
  customSlug,
  setCustomSlug,
  slugStatus,
  setSlugStatus,
  isSafe,
  moderationResult,
  messageFormatting,
  setMessageFormatting,
  fontFamilyMap,
  slugPlaceholders,
  slugPlaceholderIndex,
  checkedSlugs,
  setCheckedSlugs,
  deliveryMode,
  setDeliveryMode,
  currentUser,
  scheduledDate,
  setScheduledDate,
  showDatePicker,
  setShowDatePicker,
  showTimePicker,
  setShowTimePicker,
  showAccessibilitySettings,
  setShowAccessibilitySettings,
  additionalSettings,
  setAdditionalSettings,
  showUnlockDatePicker,
  setShowUnlockDatePicker,
  showUnlockTimePicker,
  setShowUnlockTimePicker,
  isSlugOffensive,
  handleSlugCheck,
  isDark,
  isGoldenMode,
  messageImages,
  messageAudio,
  handleAddImages,
  handleRemoveImage,
  handleEditImage,
  handleAudioRecorded,
  handleRemoveAudio,
  navigation,
  selectedSuggestionCategory,
  setSelectedSuggestionCategory,
  RAOK_SUGGESTIONS,
  translatedMessageSuggestions,
  selectedSong,
  setSelectedSong,
  setShowSpotifyModal,
  setIsPlayingSong,
  soundRef
}: any) => {
  const [isDeliverySettingsExpanded, setIsDeliverySettingsExpanded] = useState(false);
  const [tempDate, setTempDate] = React.useState<Date | null>(null);


  return (
    <ScrollView
      ref={scrollViewRef}
      contentContainerStyle={{
        paddingTop: 16,
        paddingBottom: insets.bottom + 150
      }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    >
      <Text style={[styles.stepTitle, { color: themeColors.brand }]}>{t('createBouquet.title3')}</Text>
      <Text style={[styles.stepSubtitle, { color: themeColors.textMuted }]}>{t('createBouquet.subtitle3')}</Text>

      {/* Edit mode notice */}
      {editId && (
        <View style={{ backgroundColor: '#FFF5F0', borderRadius: 10, padding: 12, marginBottom: 16 }}>
          <Text style={{ fontFamily: 'Manrope-SemiBold', fontSize: 13, color: '#7A5C58' }}>
            {t('createBouquet.editModeNotice')}
          </Text>
        </View>
      )}
      <View style={[styles.postcard, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>

        {!isRandomActMode && (
          <>
            {/* Recipient */}
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.fieldLabel}>{t('common.to')}</Text>
              <TextInput
                style={[styles.recipientInput, { color: themeColors.text }]}
                placeholder={t('createBouquet.recipientPlaceholder')}
                placeholderTextColor={themeColors.textMuted}
                value={messageCard.recipientName}
                onChangeText={(t: string) => setMessageCard((m: any) => ({ ...m, recipientName: t }))}
                maxLength={30}
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollTo({ y: 100, animated: true });
                  }, 200);
                }}
              />
            </View>

            {/* From / Signature */}
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.fieldLabel}>{t('common.from')}</Text>
              <TextInput
                style={[styles.signatureInput, { color: themeColors.text }]}
                placeholder={t('createBouquet.senderPlaceholder')}
                placeholderTextColor={themeColors.textMuted}
                value={messageCard.senderName}
                onChangeText={(t: string) => setMessageCard((m: any) => ({ ...m, senderName: t }))}
                maxLength={30}
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollTo({ y: 150, animated: true });
                  }, 200);
                }}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
          </>
        )}

        {/* Info Box for RAOK */}
        {isRandomActMode && (
          <View style={{ backgroundColor: isDark ? themeColors.surface2 : '#f5f5f5', borderRadius: 8, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: themeColors.brand + '30' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{ fontFamily: 'Manrope-SemiBold', fontSize: 13, color: themeColors.brand, marginLeft: 6 }}>How this works</Text>
            </View>
            <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 12, color: themeColors.textMuted, lineHeight: 18 }}>
              Your message will be sent anonymously to a stranger to brighten their day. It will be moderated by AI to ensure it&apos;s kind and safe.
            </Text>
          </View>
        )}

        {/* Local Moderation Warning */}
        {isRandomActMode && !isSafe && (
          <View style={{ backgroundColor: '#FDECEC', borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#F44336' }}>
            <Text style={{ color: '#F44336', fontFamily: 'Manrope-SemiBold', fontSize: 13 }}>
              Safety Warning
            </Text>
            <Text style={{ color: '#D32F2F', fontFamily: 'Manrope-Regular', fontSize: 12, marginTop: 4 }}>
              Your message appears to contain inappropriate language ({moderationResult?.flaggedWords?.join(', ')}). Please revise it before sending.
            </Text>
          </View>
        )}

        {/* Font style */}
        <View style={{ marginTop: 12, marginBottom: 8 }}>
          <Text style={styles.fieldLabel}>{t('createBouquet.fontStyle')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
            {[{ key: 'default', label: 'Default' }, { key: 'minimalist', label: 'Minimalist' }, { key: 'elegant', label: 'Elegant' }, { key: 'modern', label: 'Modern' }, { key: 'classic', label: 'Classic' }, { key: 'casual', label: 'Casual' }].map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[styles.fmtChip, { borderColor: isDark ? themeColors.border : '#e0e0e0', backgroundColor: isDark ? themeColors.surface : 'white' }, messageFormatting.fontStyle === key && styles.fmtChipActive]}
                onPress={() => setMessageFormatting((f: any) => ({ ...f, fontStyle: key }))}
              >
                <Text style={[styles.fmtChipText, { color: themeColors.brand, fontFamily: fontFamilyMap[key] || 'Manrope-Regular' }, messageFormatting.fontStyle === key && styles.fmtChipTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Message textarea */}
        <TextInput
          style={[
            styles.messageTextarea,
            {
              fontFamily: fontFamilyMap[messageFormatting.fontStyle] || 'Manrope-Regular',
              fontWeight: messageFormatting.bold ? 'bold' : 'normal',
              fontStyle: messageFormatting.italic ? 'italic' : 'normal',
              textDecorationLine: messageFormatting.underline ? 'underline' : 'none',
              color: themeColors.text,
            },
          ]}
          multiline
          placeholder={t('createBouquet.msgPlaceholder')}
          placeholderTextColor={themeColors.textMuted}
          value={messageCard.message}
          onChangeText={(t: string) => setMessageCard((m: any) => ({ ...m, message: t }))}
          maxLength={isRandomActMode ? 800 : 500}
          onFocus={() => {
            setTimeout(() => {
              scrollViewRef.current?.scrollTo({ y: 300, animated: true });
            }, 200);
          }}
        />

        {/* Char count */}
        <Text style={{ fontSize: 11, color: (isRandomActMode && messageCard.message.length < 300) ? (themeColors.error || '#F44336') : '#bbb', textAlign: 'right', marginTop: 4 }}>
          {messageCard.message.length}/{isRandomActMode ? 800 : 500}
          {isRandomActMode && messageCard.message.length < 300 && ' (Min 300)'}
        </Text>

        {/* ── Media attachments (logged-in only) ── */}
        {!isRandomActMode && (
          <>
            {currentUser ? (
              <MessageMediaUploader
                images={messageImages}
                audio={messageAudio}
                onAddImages={handleAddImages}
                onRemoveImage={handleRemoveImage}
                onEditImage={handleEditImage}
                onAudio={handleAudioRecorded}
                onRemoveAudio={handleRemoveAudio}
                disabled={false}
              />
            ) : (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, padding: 10, backgroundColor: isDark ? themeColors.surface : '#FFF8F5', borderRadius: 10, borderWidth: 1, borderColor: isDark ? themeColors.border : '#EAE0D5' }}
                onPress={() => (navigation as any).navigate('Register', { fromScreen: 'CreateBouquet' })}
              >
                <Text style={{ fontSize: 14 }}>🔒</Text>
                <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 12, color: themeColors.textMuted, flex: 1 }}>
                  Create an account or sign in to attach up to 5 photos or a voice note
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Message suggestions accordion */}
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, padding: 10, backgroundColor: isDark ? themeColors.surface : '#FFF5F0', borderRadius: 8 }}
          onPress={() => setSelectedSuggestionCategory(selectedSuggestionCategory !== null ? null : 0)}
        >
          <Text style={{ fontFamily: 'Manrope-SemiBold', fontSize: 13, color: themeColors.brand }}>{t('createBouquet.suggestions')}</Text>
          <Text style={{ color: themeColors.brand }}>{selectedSuggestionCategory !== null ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {selectedSuggestionCategory !== null && (
          <View style={{ marginTop: 8 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              {(isRandomActMode ? RAOK_SUGGESTIONS : translatedMessageSuggestions).map((s: any, i: number) => (
                <TouchableOpacity key={i} style={[styles.sugTab, { borderColor: isDark ? themeColors.border : '#e0e0e0', backgroundColor: isDark ? themeColors.surface : 'white' }, selectedSuggestionCategory === i && styles.sugTabActive]} onPress={() => setSelectedSuggestionCategory(i)}>
                  <Text style={[styles.sugTabText, { color: themeColors.brand }, selectedSuggestionCategory === i && styles.sugTabTextActive]}>{s.category}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={[styles.sugList, { backgroundColor: isDark ? themeColors.surface : '#f8f9fa' }]}>
              {(isRandomActMode ? RAOK_SUGGESTIONS : translatedMessageSuggestions)[selectedSuggestionCategory].messages.map((msg: string, idx: number) => (
                <TouchableOpacity key={idx} style={[styles.sugItem, { backgroundColor: isDark ? themeColors.surface2 : 'white' }]} onPress={() => { setMessageCard((m: any) => ({ ...m, message: msg })); setSelectedSuggestionCategory(null); }}>
                  <Text style={[styles.sugItemText, { color: themeColors.text }]}>{msg}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Song */}
      <View style={[styles.songSection]}>
        {!selectedSong ? (
          <TouchableOpacity style={[styles.addMusicBtn, { borderColor: isDark ? themeColors.border : '#ccc' }]} onPress={() => setShowSpotifyModal(true)}>
            <Music size={22} color={themeColors.textMuted} />
            <Text style={[styles.addMusicText, { color: themeColors.textMuted }]}>{t('createBouquet.addMusic')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.selectedSong, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
            <Image source={{ uri: selectedSong.albumArt }} style={styles.albumArt} />
            <View style={{ flex: 1 }}>
              <Text style={styles.songName}>{selectedSong.name}</Text>
              <Text style={styles.songArtist}>{selectedSong.artist}</Text>
              {selectedSong.startTime !== undefined && selectedSong.startTime > 0 && (
                <Text style={styles.songTiming}>
                  {t('youtubeSearch.startsAt').replace('{time}', selectedSong.startTime.toString())}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={() => { setSelectedSong(null); setIsPlayingSong(false); soundRef.current?.unloadAsync(); soundRef.current = null; }}>
              <X size={20} color="#ccc" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Animation picker */}
      {!isGoldenMode && (
        <View style={styles.animSection}>
          <Text style={[styles.sectionLabel, { fontSize: 13, fontWeight: '600', color: themeColors.text, opacity: 0.8 }]}>{t('createBouquet.animations')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 10 }}>
            {['none', 'cherry-blossom', 'snow', 'confetti', 'sparkles', 'hearts'].map(anim => {
              let bgContent = null;
              if (anim === 'cherry-blossom') {
                bgContent = <View style={{ flexDirection: 'row', gap: 10, opacity: 0.4 }}><View style={{width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFB7B2' }}/><View style={{width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFB7B2', marginTop: 15 }}/><View style={{width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFB7B2', marginTop: 5 }}/></View>;
              } else if (anim === 'snow') {
                bgContent = <View style={{ flexDirection: 'row', gap: 10, opacity: 0.4 }}><View style={{width: 6, height: 6, borderRadius: 3, backgroundColor: '#888' }}/><View style={{width: 8, height: 8, borderRadius: 4, backgroundColor: '#888', marginTop: 15 }}/><View style={{width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#888', marginTop: 5 }}/></View>;
              } else if (anim === 'confetti') {
                bgContent = <View style={{ flexDirection: 'row', gap: 10, opacity: 0.4 }}><View style={{width: 6, height: 10, backgroundColor: '#E63946', transform: [{rotate: '45deg'}] }}/><View style={{width: 8, height: 8, backgroundColor: '#F4A261', marginTop: 15, transform: [{rotate: '15deg'}] }}/><View style={{width: 6, height: 10, backgroundColor: '#2A9D8F', marginTop: 5, transform: [{rotate: '75deg'}] }}/></View>;
              } else if (anim === 'sparkles') {
                bgContent = <View style={{ flexDirection: 'row', gap: 10, opacity: 0.4 }}><Sparkles size={12} color="#FFD700" /><View style={{marginTop: 15}}><Sparkles size={16} color="#FFD700" /></View><View style={{marginTop: 5}}><Sparkles size={10} color="#FFD700" /></View></View>;
              } else if (anim === 'hearts') {
                bgContent = <View style={{ flexDirection: 'row', gap: 10, opacity: 0.4 }}><Text style={{fontSize: 12, color: '#E63946'}}>❤</Text><Text style={{fontSize: 16, color: '#E63946', marginTop: 15}}>❤</Text><Text style={{fontSize: 10, color: '#E63946', marginTop: 5}}>❤</Text></View>;
              } else {
                bgContent = <View style={{opacity: 0.2}}><Text style={{fontSize: 20}}>🚫</Text></View>;
              }

              return (
                <TouchableOpacity
                  key={anim}
                  style={[
                    styles.animBtn,
                    {
                      width: 100, height: 80,
                      justifyContent: 'flex-end', alignItems: 'center',
                      overflow: 'hidden', position: 'relative',
                      borderWidth: additionalSettings.animation === anim ? 2 : 1,
                      borderColor: additionalSettings.animation === anim ? '#7A5C58' : themeColors.border,
                      backgroundColor: isDark ? themeColors.surface2 : '#faf8f7',
                      paddingBottom: 8,
                    },
                  ]}
                  onPress={() => setAdditionalSettings((s: any) => ({ ...s, animation: anim }))}
                >
                  <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }]}>
                    {bgContent}
                  </View>
                  <Text style={[styles.animBtnText, { fontSize: 11, textAlign: 'center', zIndex: 2, color: additionalSettings.animation === anim ? '#7A5C58' : themeColors.textMuted, fontWeight: additionalSettings.animation === anim ? '700' : '500' }]}>
                    {anim === 'none' ? t('createBouquet.none') : anim.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {!isRandomActMode && (
        <View style={[styles.postcard, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border, marginTop: 16, elevation: 0, shadowOpacity: 0 }]}>
        <TouchableOpacity 
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, marginBottom: isDeliverySettingsExpanded ? 12 : 0 }}
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setIsDeliverySettingsExpanded(!isDeliverySettingsExpanded);
          }}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.sectionLabel, { fontSize: 14, fontWeight: '700', color: themeColors.brand, marginBottom: 0 }]}>Delivery & Settings</Text>
          </View>
          <View style={{ backgroundColor: themeColors.surface, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: themeColors.brand, fontSize: 18, lineHeight: 20, marginTop: -2 }}>{isDeliverySettingsExpanded ? '−' : '+'}</Text>
          </View>
        </TouchableOpacity>
        
        {isDeliverySettingsExpanded && (
          <View>
            {/* Email Delivery */}
            {!editId && (
              <View style={{ marginBottom: 16 }}>
                <Text style={[styles.settingLabel, { fontSize: 13, marginBottom: 8 }]}>{t('createBouquet.emailLabel') || 'Recipient Email Delivery'}</Text>
                <TextInput
                  style={[styles.recipientInput, { fontSize: 14, backgroundColor: themeColors.background, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: themeColors.border, color: themeColors.text }]}
                  placeholder={t('createBouquet.emailPlaceholderShort') || "friend@gmail.com"}
                  placeholderTextColor={themeColors.textMuted}
                  value={messageCard.recipientEmail || ''}
                  onChangeText={(val) => setMessageCard((prev: any) => ({ ...prev, recipientEmail: val.toLowerCase() }))}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                {messageCard.recipientEmail?.trim().length > 0 && (
                  <View style={{ marginTop: 8 }}>
                    {additionalSettings.unlockDate ? (
                       <Text style={{ fontSize: 12, color: themeColors.brand, fontStyle: 'italic' }}>
                         This email will be scheduled to be sent on {additionalSettings.unlockDate.toLocaleDateString()} at {additionalSettings.unlockDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                       </Text>
                    ) : (
                       <Text style={{ fontSize: 12, color: themeColors.brand, fontStyle: 'italic' }}>
                         This email will be sent now
                       </Text>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Unlock Date / Do Not Open Until */}
            {!editId && !isRandomActMode && (
              <View style={{ marginBottom: 16 }}>
                 <Text style={[styles.settingLabel, { fontSize: 13, marginBottom: 8 }]}>Do Not Open Until (Optional)</Text>
                 <View style={[styles.scheduleControls, { flexDirection: 'row', alignItems: 'center' }]}>
                   <TouchableOpacity style={[styles.schedulePickerBtn, { flex: 1, backgroundColor: themeColors.background, borderColor: themeColors.border, borderWidth: 1, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12 }]} onPress={() => setShowUnlockDatePicker(true)}>
                     <Text style={[styles.schedulePickerText, { color: additionalSettings.unlockDate ? themeColors.text : themeColors.textMuted, fontSize: 14 }]}>
                       {additionalSettings.unlockDate ? additionalSettings.unlockDate.toLocaleDateString() : 'Set Date'}
                     </Text>
                   </TouchableOpacity>

                   {additionalSettings.unlockDate && (
                     <TouchableOpacity style={[styles.schedulePickerBtn, { flex: 1, marginLeft: 8, backgroundColor: themeColors.background, borderColor: themeColors.border, borderWidth: 1, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12 }]} onPress={() => setShowUnlockTimePicker(true)}>
                       <Text style={[styles.schedulePickerText, { color: additionalSettings.unlockTimeSet ? themeColors.text : themeColors.brand, fontSize: 14, fontWeight: additionalSettings.unlockTimeSet ? 'normal' : '600' }]}>
                         {additionalSettings.unlockTimeSet ? additionalSettings.unlockDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '+ Add Time'}
                       </Text>
                     </TouchableOpacity>
                   )}

                   {additionalSettings.unlockDate && (
                     <TouchableOpacity style={{ marginLeft: 8, padding: 8, backgroundColor: themeColors.surface, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }} onPress={() => setAdditionalSettings((s: any) => ({ ...s, unlockDate: null, unlockTimeSet: false }))}>
                       <Text style={{color: themeColors.brand, fontSize: 14, fontWeight: 'bold' }}>✕</Text>
                     </TouchableOpacity>
                   )}
                 </View>
              </View>
            )}

            {/* Custom URL section */}
            {!editId && (
              <View style={{ marginBottom: 16 }}>
                <Text style={[styles.settingLabel, { fontSize: 13, marginBottom: 8 }]}>{t('createBouquet.customUrl')}</Text>
                <View style={{ paddingBottom: 4 }}>
                  <View style={[styles.slugInputRow]}>
                    <TextInput
                      style={[styles.slugInput, { flex: 1, paddingVertical: 10, fontSize: 14, backgroundColor: themeColors.background, borderColor: themeColors.border, borderRadius: 8, paddingHorizontal: 12, borderWidth: 1 }]}
                      placeholder={slugPlaceholders[slugPlaceholderIndex]}
                      value={customSlug}
                      onChangeText={(t) => {
                        const cleanSlug = t.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
                        setCustomSlug(cleanSlug);

                        if (cleanSlug.length > 2 && isSlugOffensive(cleanSlug)) {
                          setSlugStatus('blocked');
                        } else if (checkedSlugs.has(cleanSlug)) {
                          setSlugStatus('taken');
                        } else {
                          setSlugStatus('idle');
                        }
                      }}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="done"
                      onFocus={() => {
                        setTimeout(() => {
                          scrollViewRef.current?.scrollToEnd({ animated: true });
                        }, 150);
                      }}
                    />
                    {customSlug.trim().length > 0 && (
                      <TouchableOpacity
                        style={[
                          styles.slugCheckBtn,
                          { paddingVertical: 10, marginLeft: 8, borderRadius: 8, paddingHorizontal: 16 },
                          slugStatus === 'available' && { backgroundColor: '#27ae60' },
                          slugStatus === 'taken' && { backgroundColor: '#e74c3c' },
                          slugStatus === 'blocked' && { backgroundColor: '#e67e22' }
                        ]}
                        onPress={() => handleSlugCheck(customSlug)}
                        disabled={slugStatus === 'checking' || slugStatus === 'blocked' || (slugStatus === 'taken' && checkedSlugs.has(customSlug.trim()))}
                      >
                        {slugStatus === 'checking'
                          ? <ActivityIndicator size="small" color="white" />
                          : <Text style={[styles.slugCheckBtnText, { fontWeight: '600' }]}>
                            {slugStatus === 'available' ? t('createBouquet.available') :
                              slugStatus === 'taken' ? t('createBouquet.taken') :
                                slugStatus === 'blocked' ? 'Blocked' :
                                  t('createBouquet.check')}
                          </Text>}
                      </TouchableOpacity>
                    )}
                  </View>
                  {slugStatus === 'taken' && <Text style={{ color: '#e74c3c', fontSize: 11, marginTop: 6 }}>{t('createBouquet.takenDesc')}</Text>}
                  {slugStatus === 'available' && <Text style={{ color: '#27ae60', fontSize: 11, marginTop: 6 }}>{t('createBouquet.availableDesc')}</Text>}
                  {slugStatus === 'blocked' && <Text style={{ color: '#e67e22', fontSize: 11, marginTop: 6 }}>{t('createBouquet.invalidNameDesc')}</Text>}
                  {customSlug.trim().length > 0 && slugStatus !== 'available' && slugStatus !== 'checking' && (
                    <Text style={{ color: '#e67e22', fontSize: 11, marginTop: 6, fontStyle: 'italic' }}>
                      {t('createBouquet.checkSlugFirst') || 'Please check if your custom URL is available before creating'}
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* Accessibility Dropdown */}
            <View style={{ backgroundColor: showAccessibilitySettings ? themeColors.surface : 'transparent', borderRadius: 12, padding: showAccessibilitySettings ? 12 : 0, marginBottom: 4, borderWidth: showAccessibilitySettings ? 1 : 0, borderColor: themeColors.border }}>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 12, backgroundColor: showAccessibilitySettings ? themeColors.cardBg : themeColors.surface, borderRadius: 8, borderWidth: 1, borderColor: themeColors.border }} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setShowAccessibilitySettings((s: any) => !s); }}>
                 <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                   <Text style={[styles.settingLabel, { fontSize: 13, color: themeColors.text, fontWeight: '600', marginBottom: 0 }]}>Accessibility Settings</Text>
                 </View>
                 <View style={{ backgroundColor: showAccessibilitySettings ? themeColors.surface : themeColors.cardBg, width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}>
                   <Text style={{ color: themeColors.textMuted, fontSize: 12 }}>{showAccessibilitySettings ? '▲' : '▼'}</Text>
                 </View>
              </TouchableOpacity>

              {showAccessibilitySettings && (
                <View style={{ paddingTop: 16 }}>
                  {[
                    { key: 'dyslexiaFriendly', label: 'Dyslexia-Friendly Font', desc: 'Uses dyslexia-friendly font with improved spacing' },
                    { key: 'largeText', label: 'Large Text', desc: 'Increases text size for better visibility' },
                    { key: 'translateEnabled', label: 'Enable Translation Button', desc: 'Adds translate button for recipients' },
                    { key: 'blindFriendly', label: 'Blind-Friendly Mode', desc: 'Enables text-to-speech description' },
                  ].map(({ key, label, desc }, idx) => {
                    const settingLabelKey = `createBouquet.${key}`;
                    const settingDescKey = `createBouquet.${key}Desc`;
                    const isLast = idx === 3;
                    return (
                      <TouchableOpacity key={key} style={[styles.settingRow, { marginBottom: isLast ? 0 : 12 }]} onPress={() => setAdditionalSettings((s: any) => ({ ...s, [key]: !s[key] }))}>
                        <View style={{ width: 44, height: 24, borderRadius: 12, backgroundColor: additionalSettings[key] ? themeColors.brand : themeColors.border, justifyContent: 'center', paddingHorizontal: 2 }}>
                           <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: 'white', alignSelf: additionalSettings[key] ? 'flex-end' : 'flex-start', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1, elevation: 1 }} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={[styles.settingLabel, { fontSize: 13, fontWeight: '600', color: themeColors.text }]}>{t(settingLabelKey)}</Text>
                          <Text style={[styles.settingDesc, { fontSize: 11, color: themeColors.textMuted, marginTop: 2 }]}>{t(settingDescKey)}</Text>
                        </View>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              )}
            </View>
          </View>
        )}
        </View>
      )}

      {/* Modals placed inside card at end */}
      {/* iOS Date Picker Modal */}
      <Modal visible={showUnlockDatePicker && Platform.OS === 'ios'} transparent animationType="slide">
         <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <View style={{ backgroundColor: themeColors.cardBg, paddingBottom: 30, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
               <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: themeColors.border }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: themeColors.text }}>Select Date</Text>
                  <TouchableOpacity onPress={() => setShowUnlockDatePicker(false)}>
                     <Text style={{ color: themeColors.brand, fontWeight: 'bold', fontSize: 16 }}>Done</Text>
                  </TouchableOpacity>
               </View>
               <DateTimePicker
                 value={additionalSettings.unlockDate || new Date()}
                 mode="date"
                 display="inline"
                 minimumDate={new Date(new Date().setHours(0,0,0,0))}
                 onChange={(event, date) => {
                   if (date) {
                     // Keep the existing time if it was set, otherwise start with a clean date
                     const newDate = new Date(date);
                     if (additionalSettings.unlockDate && additionalSettings.unlockTimeSet) {
                       newDate.setHours(additionalSettings.unlockDate.getHours(), additionalSettings.unlockDate.getMinutes());
                     } else {
                       newDate.setHours(0, 0, 0, 0);
                     }
                     setAdditionalSettings((s: any) => ({ ...s, unlockDate: newDate, userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone }));
                   }
                 }}
                 style={{ backgroundColor: themeColors.cardBg }}
               />
            </View>
         </View>
      </Modal>

      {/* Android Date Picker */}
      {showUnlockDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={additionalSettings.unlockDate || new Date()}
          mode="date"
          minimumDate={new Date(new Date().setHours(0,0,0,0))}
          onChange={(event, date) => {
            setShowUnlockDatePicker(false);
            if (event.type === 'set' && date) {
               const newDate = new Date(date);
               if (additionalSettings.unlockDate && additionalSettings.unlockTimeSet) {
                 newDate.setHours(additionalSettings.unlockDate.getHours(), additionalSettings.unlockDate.getMinutes());
               } else {
                 newDate.setHours(0, 0, 0, 0);
               }
               setAdditionalSettings((s: any) => ({ ...s, unlockDate: newDate, userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone }));
            }
          }}
        />
      )}

      {/* iOS Time Picker Modal */}
      <Modal visible={showUnlockTimePicker && Platform.OS === 'ios'} transparent animationType="slide">
         <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <View style={{ backgroundColor: themeColors.cardBg, paddingBottom: 30, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
               <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: themeColors.border }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: themeColors.text }}>Select Time</Text>
                  <TouchableOpacity onPress={() => setShowUnlockTimePicker(false)}>
                     <Text style={{ color: themeColors.brand, fontWeight: 'bold', fontSize: 16 }}>Done</Text>
                  </TouchableOpacity>
               </View>
               <DateTimePicker
                 value={additionalSettings.unlockDate || new Date()}
                 mode="time"
                 display="spinner"
                 onChange={(event, date) => {
                   if (date) {
                     const finalDate = new Date(additionalSettings.unlockDate || new Date());
                     finalDate.setHours(date.getHours(), date.getMinutes());
                     setAdditionalSettings((s: any) => ({ ...s, unlockDate: finalDate, unlockTimeSet: true, userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone }));
                   }
                 }}
               />
            </View>
         </View>
      </Modal>

      {/* Android Time Picker */}
      {showUnlockTimePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={additionalSettings.unlockDate || new Date()}
          mode="time"
          onChange={(event, date) => {
            setShowUnlockTimePicker(false);
            if (event.type === 'set' && date) {
              const finalDate = new Date(additionalSettings.unlockDate || new Date());
              finalDate.setHours(date.getHours(), date.getMinutes());
              setAdditionalSettings((s: any) => ({ ...s, unlockDate: finalDate, unlockTimeSet: true, userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone }));
            }
          }}
        />
      )}

    </ScrollView>
  );
};
