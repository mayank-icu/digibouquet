const fs = require('fs');
const path = './src/screens/create-bouquet/stages/Stage3Message.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Imports
content = content.replace(
  `import React from 'react';\nimport { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Image, StyleSheet } from 'react-native';`,
  `import React from 'react';\nimport { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Image, StyleSheet, LayoutAnimation, UIManager, Platform } from 'react-native';\n\nif (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {\n  UIManager.setLayoutAnimationEnabledExperimental(true);\n}`
);

// 2. Component Setup
content = content.replace(
  `  soundRef\n}: any) => {\n\n  return (`,
  `  soundRef\n}: any) => {\n  const [showCustomUrlCard, setShowCustomUrlCard] = React.useState(false);\n  const [tempDate, setTempDate] = React.useState(null);\n\n  const toggleCustomUrl = () => {\n    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);\n    setShowCustomUrlCard(!showCustomUrlCard);\n  };\n\n  return (`
);

// 3. Reordering Email and Do Not Open Until
const originalMiddleBlock = `      {/* Unlock Date / Do Not Open Until */}
      {!editId && !isRandomActMode && (
        <View style={{ marginTop: 16 }}>
           <Text style={[styles.settingLabel, { fontSize: 13, marginBottom: 8 }]}>Do Not Open Until (Optional)</Text>
           <View style={styles.scheduleControls}>
             <TouchableOpacity style={styles.schedulePickerBtn} onPress={() => setShowUnlockDatePicker(true)}>
               <Calendar size={16} color="#7A5C58" />
               <Text style={styles.schedulePickerText}>
                 {additionalSettings.unlockDate ? additionalSettings.unlockDate.toLocaleDateString() : 'Set Date'}
               </Text>
             </TouchableOpacity>
             <TouchableOpacity style={styles.schedulePickerBtn} onPress={() => setShowUnlockTimePicker(true)}>
               <Clock size={16} color="#7A5C58" />
               <Text style={styles.schedulePickerText}>
                 {additionalSettings.unlockDate ? additionalSettings.unlockDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Set Time'}
               </Text>
             </TouchableOpacity>
           </View>
        </View>
      )}

      {/* Email Delivery */}
      {!editId && (
        <View style={{ marginTop: 16 }}>
          <Text style={[styles.settingLabel, { fontSize: 13, marginBottom: 8 }]}>{t('createBouquet.emailLabel') || 'Recipient Email Delivery'}</Text>
          <TextInput
            style={[styles.recipientInput, { fontSize: 14, backgroundColor: themeColors.background, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: themeColors.border, color: themeColors.text }]}
            placeholder={t('createBouquet.emailPlaceholderShort') || "friend@gmail.com"}
            placeholderTextColor={themeColors.textMuted}
            value={messageCard.recipientEmail || ''}
            onChangeText={(val) => setMessageCard((prev) => ({ ...prev, recipientEmail: val.toLowerCase() }))}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {messageCard.recipientEmail?.trim().length > 0 && (
            <View style={{ marginTop: 12 }}>
              <Text style={[styles.fieldLabel, { marginBottom: 8, fontSize: 12 }]}>{t('createBouquet.deliverySchedule')}</Text>

              <View style={styles.deliveryTabs}>
                <TouchableOpacity
                  style={[styles.deliveryTab, deliveryMode === 'now' && styles.deliveryTabActive]}
                  onPress={() => setDeliveryMode('now')}
                >
                  <Text style={[styles.deliveryTabText, deliveryMode === 'now' && styles.deliveryTabTextActive, { fontSize: 12 }]}>{t('createBouquet.sendNow')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.deliveryTab, deliveryMode === 'scheduled' && styles.deliveryTabActive]}
                  onPress={() => {
                    if (!currentUser) {
                      Toast.show({ type: 'info', text1: t('createBouquet.loginRequired'), text2: t('createBouquet.loginToEmail') });
                      return;
                    }
                    setDeliveryMode('scheduled');
                  }}
                >
                  <Text style={[styles.deliveryTabText, deliveryMode === 'scheduled' && styles.deliveryTabTextActive, { fontSize: 12 }]}>{t('createBouquet.scheduleLater')}</Text>
                </TouchableOpacity>
              </View>

              {deliveryMode === 'scheduled' && (
                <View style={{ marginTop: 12, marginBottom: 4 }}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    {[
                      { label: '+60m', value: 60 * 60 * 1000 },
                      { label: '+6h', value: 6 * 60 * 60 * 1000 },
                      { label: '+24h', value: 24 * 60 * 60 * 1000 },
                    ].map(tab => (
                      <TouchableOpacity
                        key={tab.label}
                        style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#FFF5F0', marginRight: 8 }}
                        onPress={() => {
                          const d = new Date();
                          setScheduledDate(new Date(d.getTime() + tab.value));
                        }}
                      >
                        <Text style={{ color: '#7A5C58', fontSize: 12, fontFamily: 'Manrope-SemiBold' }}>{tab.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <View style={styles.scheduleControls}>
                    <TouchableOpacity style={styles.schedulePickerBtn} onPress={() => setShowDatePicker(true)}>
                      <Calendar size={16} color="#7A5C58" />
                      <Text style={styles.schedulePickerText}>{scheduledDate.toLocaleDateString()}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.schedulePickerBtn} onPress={() => setShowTimePicker(true)}>
                      <Clock size={16} color="#7A5C58" />
                      <Text style={styles.schedulePickerText}>
                        {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={{ fontSize: 11, color: themeColors.brand, marginTop: 8, fontStyle: 'italic', textAlign: 'center' }}>
                    This email will be delivered on {scheduledDate.toLocaleDateString()} at {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}`;

const replacementMiddleBlock = `      {/* Email Delivery */}
      {!editId && (
        <View style={{ marginTop: 16 }}>
          <Text style={[styles.settingLabel, { fontSize: 13, marginBottom: 8 }]}>{t('createBouquet.emailLabel') || 'Recipient Email Delivery'}</Text>
          <TextInput
            style={[styles.recipientInput, { fontSize: 14, backgroundColor: themeColors.background, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: themeColors.border, color: themeColors.text }]}
            placeholder={t('createBouquet.emailPlaceholderShort') || "friend@gmail.com"}
            placeholderTextColor={themeColors.textMuted}
            value={messageCard.recipientEmail || ''}
            onChangeText={(val) => setMessageCard((prev) => ({ ...prev, recipientEmail: val.toLowerCase() }))}
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
        <View style={{ marginTop: 16 }}>
           <Text style={[styles.settingLabel, { fontSize: 13, marginBottom: 8 }]}>Do Not Open Until (Optional)</Text>
           <View style={styles.scheduleControls}>
             <TouchableOpacity style={[styles.schedulePickerBtn, { flex: 1 }]} onPress={() => setShowUnlockDatePicker(true)}>
               <Calendar size={16} color="#7A5C58" />
               <Text style={styles.schedulePickerText}>
                 {additionalSettings.unlockDate ? \`\${additionalSettings.unlockDate.toLocaleDateString()} \${additionalSettings.unlockDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\` : 'Set Date & Time'}
               </Text>
             </TouchableOpacity>
             {additionalSettings.unlockDate && (
               <TouchableOpacity style={{ marginLeft: 8, padding: 8 }} onPress={() => setAdditionalSettings((s) => ({ ...s, unlockDate: null }))}>
                 <X size={20} color="#7A5C58" />
               </TouchableOpacity>
             )}
           </View>
        </View>
      )}`;

// We can just use string indexOf and substring since the block is large.
const emailIdx = content.indexOf(`      {/* Unlock Date / Do Not Open Until */}`);
const endEmailIdx = content.indexOf(`      {/* Accessibility Dropdown */}`);
if (emailIdx !== -1 && endEmailIdx !== -1) {
  content = content.substring(0, emailIdx) + replacementMiddleBlock + "\n\n" + content.substring(endEmailIdx);
} else {
  console.log("Could not find middle block");
}

// 4. Custom URL and Modals
const customUrlIdx = content.indexOf(`      {/* Custom URL section - Hidden in edit mode */}`);
const endScrollViewIdx = content.lastIndexOf(`    </ScrollView>`);

const newBottomBlock = `      {/* Custom URL section - Hidden in edit mode */}
      {!editId && (
        <View style={{ marginTop: 16 }}>
          <TouchableOpacity 
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, backgroundColor: isDark ? themeColors.surface : '#FFF5F0', borderRadius: 8, paddingHorizontal: 12 }} 
            onPress={toggleCustomUrl}
          >
            <Text style={[styles.settingLabel, { fontSize: 13 }]}>{t('createBouquet.customUrl')}</Text>
            <Text style={{ color: '#7A5C58' }}>{showCustomUrlCard ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          
          {showCustomUrlCard && (
            <View style={{ paddingBottom: 4, marginTop: 12, paddingHorizontal: 4 }}>
              <View style={[styles.slugInputRow]}>
                <TextInput
                  style={[styles.slugInput, { flex: 1, paddingVertical: 10, fontSize: 14, backgroundColor: themeColors.background, borderColor: themeColors.border }]}
                  placeholder={slugPlaceholders[slugPlaceholderIndex]}
                  value={customSlug}
                  onChangeText={(t) => {
                    const cleanSlug = t.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
                    setCustomSlug(cleanSlug);

                    // Check for offensive content immediately
                    if (cleanSlug.length > 2 && isSlugOffensive(cleanSlug)) {
                      setSlugStatus('blocked');
                    } else if (checkedSlugs.has(cleanSlug)) {
                      // If we already checked this slug and it was taken, don't allow re-checking
                      setSlugStatus('taken');
                    } else {
                      setSlugStatus('idle');
                    }
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onFocus={() => {
                    // Scroll to bottom to ensure this field is visible above keyboard
                    setTimeout(() => {
                      scrollViewRef.current?.scrollToEnd({ animated: true });
                    }, 150);
                  }}
                />
                {customSlug.trim().length > 0 && (
                  <TouchableOpacity
                    style={[
                      styles.slugCheckBtn,
                      { paddingVertical: 10 },
                      slugStatus === 'available' && { backgroundColor: '#27ae60' },
                      slugStatus === 'taken' && { backgroundColor: '#e74c3c' },
                      slugStatus === 'blocked' && { backgroundColor: '#e67e22' }
                    ]}
                    onPress={() => handleSlugCheck(customSlug)}
                    disabled={slugStatus === 'checking' || slugStatus === 'blocked' || (slugStatus === 'taken' && checkedSlugs.has(customSlug.trim()))}
                  >
                    {slugStatus === 'checking'
                      ? <ActivityIndicator size="small" color="white" />
                      : <Text style={styles.slugCheckBtnText}>
                        {slugStatus === 'available' ? t('createBouquet.available') :
                          slugStatus === 'taken' ? t('createBouquet.taken') :
                            slugStatus === 'blocked' ? 'Blocked' :
                              t('createBouquet.check')}
                      </Text>}
                  </TouchableOpacity>
                )}
              </View>
              {slugStatus === 'taken' && <Text style={{ color: '#e74c3c', fontSize: 11, marginTop: 4 }}>{t('createBouquet.takenDesc')}</Text>}
              {slugStatus === 'available' && <Text style={{ color: '#27ae60', fontSize: 11, marginTop: 4 }}>{t('createBouquet.availableDesc')}</Text>}
              {slugStatus === 'blocked' && <Text style={{ color: '#e67e22', fontSize: 11, marginTop: 4 }}>{t('createBouquet.invalidNameDesc')}</Text>}
              {customSlug.trim().length > 0 && slugStatus !== 'available' && slugStatus !== 'checking' && (
                <Text style={{ color: '#e67e22', fontSize: 11, marginTop: 4, fontStyle: 'italic' }}>
                  {t('createBouquet.checkSlugFirst') || 'Please check if your custom URL is available before creating'}
                </Text>
              )}
            </View>
          )}
        </View>
      )}
      
      {/* Modals placed inside card at end */}
      {showUnlockDatePicker && (
        <DateTimePicker
          value={additionalSettings.unlockDate || new Date()}
          mode={Platform.OS === 'ios' ? 'datetime' : 'date'}
          minimumDate={new Date()}
          onChange={(event, date) => {
            if (Platform.OS === 'android') {
              setShowUnlockDatePicker(false);
              if (event.type === 'set' && date) {
                 setTempDate(date);
                 setShowUnlockTimePicker(true);
              }
            } else {
              setShowUnlockDatePicker(false);
              if (date) {
                setAdditionalSettings((s) => ({ ...s, unlockDate: date }));
              }
            }
          }}
        />
      )}
      {showUnlockTimePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={tempDate || new Date()}
          mode="time"
          onChange={(event, date) => {
            setShowUnlockTimePicker(false);
            if (event.type === 'set' && date) {
              const finalDate = new Date(tempDate);
              finalDate.setHours(date.getHours(), date.getMinutes());
              setAdditionalSettings((s) => ({ ...s, unlockDate: finalDate }));
            }
          }}
        />
      )}
`;

if (customUrlIdx !== -1 && endScrollViewIdx !== -1) {
  content = content.substring(0, customUrlIdx) + newBottomBlock + "\n    </ScrollView>\n  );\n};\n";
} else {
  console.log("Could not find bottom block");
}

fs.writeFileSync(path, content);
console.log("Update completed successfully!");
