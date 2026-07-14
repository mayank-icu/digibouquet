const fs = require('fs');
const path = './src/screens/create-bouquet/stages/Stage3Message.tsx';
let content = fs.readFileSync(path, 'utf8');

// Remove box shadow
content = content.replace(
  "<View style={[styles.postcard, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border, marginTop: 16 }]}>",
  "<View style={[styles.postcard, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border, marginTop: 16, elevation: 0, shadowOpacity: 0 }]}>"
);

// Add LayoutAnimation to Accessibility toggle
content = content.replace(
  "<TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }} onPress={() => setShowAccessibilitySettings((s) => !s)}>",
  "<TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setShowAccessibilitySettings((s) => !s); }}>"
);

fs.writeFileSync(path, content);
console.log("Updated shadows and animations.");
