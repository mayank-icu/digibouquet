const fs = require('fs');
const path = './src/screens/create-bouquet/stages/Stage3Message.tsx';
let content = fs.readFileSync(path, 'utf8');

// The block to replace starts at `{/* Email Delivery */}` and ends at `</ScrollView>` (excluding modals).
const emailIdx = content.indexOf(`      {/* Email Delivery */}`);
const modalsIdx = content.indexOf(`      {/* Modals placed inside card at end */}`);

if (emailIdx === -1 || modalsIdx === -1) {
    console.log("Could not find boundaries");
    process.exit(1);
}

// We will recreate the whole block from email to custom url wrapped in styles.postcard.
const newBlock = `      <View style={[styles.postcard, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border, marginTop: 16 }]}>
        <Text style={[styles.sectionLabel, { fontSize: 14, fontWeight: '700', color: themeColors.brand, marginBottom: 12 }]}>Delivery & Settings</Text>
        
        {/* Email Delivery */}
        {!editId && (
          <View>
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

        <View style={[styles.divider, { marginVertical: 16, backgroundColor: themeColors.border }]} />

        {/* Unlock Date / Do Not Open Until */}
        {!editId && !isRandomActMode && (
          <View>
             <Text style={[styles.settingLabel, { fontSize: 13, marginBottom: 8 }]}>Do Not Open Until (Optional)</Text>
             <View style={styles.scheduleControls}>
               <TouchableOpacity style={[styles.schedulePickerBtn, { flex: 1 }]} onPress={() => setShowUnlockDatePicker(true)}>
                 <Text style={styles.schedulePickerText}>
                   {additionalSettings.unlockDate ? \`\${additionalSettings.unlockDate.toLocaleDateString()} \${additionalSettings.unlockDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\` : 'Set Date & Time'}
                 </Text>
               </TouchableOpacity>
               {additionalSettings.unlockDate && (
                 <TouchableOpacity style={{ marginLeft: 8, padding: 8 }} onPress={() => setAdditionalSettings((s) => ({ ...s, unlockDate: null }))}>
                   <Text style={{color: '#7A5C58', fontSize: 16}}>✕</Text>
                 </TouchableOpacity>
               )}
             </View>
          </View>
        )}

        <View style={[styles.divider, { marginVertical: 16, backgroundColor: themeColors.border }]} />

        {/* Accessibility Dropdown */}
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }} onPress={() => setShowAccessibilitySettings((s) => !s)}>
           <Text style={[styles.settingLabel, { fontSize: 13 }]}>Accessibility Settings</Text>
           <Text style={{ color: '#7A5C58' }}>{showAccessibilitySettings ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {showAccessibilitySettings && (
          <View style={{ paddingTop: 12 }}>
            {[
              { key: 'dyslexiaFriendly', label: 'Dyslexia-Friendly Font', desc: 'Uses dyslexia-friendly font with improved spacing' },
              { key: 'largeText', label: 'Large Text', desc: 'Increases text size for better visibility' },
              { key: 'translateEnabled', label: 'Enable Translation Button', desc: 'Adds translate button for recipients' },
              { key: 'blindFriendly', label: 'Blind-Friendly Mode', desc: 'Enables text-to-speech description' },
            ].map(({ key, label, desc }) => {
              const settingLabelKey = \`createBouquet.\${key}\`;
              const settingDescKey = \`createBouquet.\${key}Desc\`;
              return (
                <TouchableOpacity key={key} style={styles.settingRow} onPress={() => setAdditionalSettings((s) => ({ ...s, [key]: !s[key] }))}>
                  <View style={{ width: 40, height: 22, borderRadius: 11, backgroundColor: additionalSettings[key] ? '#5BAD8E' : '#ddd', justifyContent: 'center', paddingHorizontal: 2, marginTop: 2 }}>
                     <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: 'white', alignSelf: additionalSettings[key] ? 'flex-end' : 'flex-start' }} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.settingLabel, { fontSize: 13 }]}>{t(settingLabelKey)}</Text>
                    <Text style={[styles.settingDesc, { fontSize: 11 }]}>{t(settingDescKey)}</Text>
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        <View style={[styles.divider, { marginVertical: 16, backgroundColor: themeColors.border }]} />

        {/* Custom URL section */}
        {!editId && (
          <View>
            <Text style={[styles.settingLabel, { fontSize: 13 }]}>{t('createBouquet.customUrl')}</Text>
            <View style={{ paddingBottom: 4, marginTop: 8 }}>
              <View style={[styles.slugInputRow]}>
                <TextInput
                  style={[styles.slugInput, { flex: 1, paddingVertical: 10, fontSize: 14, backgroundColor: themeColors.background, borderColor: themeColors.border }]}
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
          </View>
        )}
      </View>
`;

const modalsBlock = `      {/* Modals placed inside card at end */}
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
                 
                 // Default timezone calculation included here implicitly via JS Date, 
                 // but we ensure the date is set right away in case they skip time
                 setAdditionalSettings((s) => ({ ...s, unlockDate: date, userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone }));
                 
                 setShowUnlockTimePicker(true);
              }
            } else {
              setShowUnlockDatePicker(false);
              if (date) {
                setAdditionalSettings((s) => ({ ...s, unlockDate: date, userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone }));
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
              const finalDate = new Date(tempDate || date);
              finalDate.setHours(date.getHours(), date.getMinutes());
              setAdditionalSettings((s) => ({ ...s, unlockDate: finalDate, userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone }));
            }
          }}
        />
      )}
`;

content = content.substring(0, emailIdx) + newBlock + '\n' + modalsBlock + '\n    </ScrollView>\n  );\n};\n';

fs.writeFileSync(path, content);
console.log("Card applied successfully.");
