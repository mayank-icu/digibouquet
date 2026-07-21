const fs = require('fs');

// Helper to set nested properties on an object
function setNested(obj, path, value) {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (current[part] === undefined) {
      current[part] = {};
    }
    current = current[part];
  }
  current[parts[parts.length - 1]] = value;
}

// Helper to delete nested properties from an object
function deleteNested(obj, path) {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (current === undefined || current[part] === undefined) {
      return;
    }
    current = current[part];
  }
  if (current !== undefined) {
    delete current[parts[parts.length - 1]];
  }
}

try {
  // 1. Read and parse original translations.js
  const translationsContent = fs.readFileSync('src/translations.js', 'utf8');
  // Convert ES6 export to CommonJS module exports in memory
  const runCode = translationsContent.replace('export default', 'module.exports =');
  const m = { exports: {} };
  const fn = new Function('module', 'exports', runCode);
  fn(m, m.exports);
  const translations = m.exports;

  // 2. Read and parse the user's new translations
  const newTranslationsContent = fs.readFileSync('/home/mayank/Downloads/translations.json', 'utf8');
  const newTranslations = JSON.parse(newTranslationsContent);

  // 3. Define the new English values (since we added new keys for English too)
  const englishNewKeys = {
    "profile.disconnectEmail": "Disconnect Email Login",
    "settings.dataManagementDesc": "Manage and free up local storage occupied by cached files, widgets, and received bouquets.",
    "games.title": "Blossom Garden Games",
    "games.subtitle": "Relax and play our cozy flower mini-games to unlock new bouquet designs and ideas.",
    "games.sortTitle": "Blossom Sort Puzzle",
    "games.sortDesc": "Sort matching flower stems into identical slots. Tap to select and move.",
    "games.matchTitle": "Blossom Match",
    "games.matchDesc": "Swap adjacent flowers to match 3 or more in a row and trigger cascading combos.",
    "games.playNow": "Play Now",
    "home.limitedEdition": "LIMITED EDITION",
    "home.goldenBouquet": "Golden Bouquet",
    "home.goldenBouquetDesc": "Tap to unlock or enter referral code",
    "golden.title": "Golden Bouquet",
    "golden.subtitle": "An exclusive, limited edition arrangement designed to capture life's most precious moments.",
    "golden.claimTitle": "Claim Invitation",
    "golden.claimDesc": "Received a golden invitation? Enter your code below to unlock your creation.",
    "golden.inputPlaceholder": "Enter referral code",
    "golden.unlock": "Unlock",
    "golden.shareTitle": "Share the Magic",
    "golden.shareDesc": "Invite friends with your unique code. You both earn a Golden Credit when they use it.",
    "golden.signInToGetCode": "Sign in to get code",
    "golden.share": "Share",
    "golden.friendsJoined": "Friends Joined",
    "golden.noCredits": "No Golden Credits",
    "golden.noCreditsDesc": "Invite friends or use a code to earn credits.",
    "golden.create": "Create Golden Bouquet",
    "golden.ownCodeError": "You cannot use your own code.",
    "golden.alreadyClaimedError": "You have already claimed this code.",
    "golden.invalidCodeError": "Invalid code.",
    "golden.claimSuccess": "Claimed Successfully!",
    "golden.claimSuccessDesc": "You earned a Golden Credit.",
    "golden.failed": "Failed",
    "golden.error": "Error",
    "golden.connectionError": "Could not connect to server.",
    "golden.shareText": "Unlock the Golden Bouquet with my invitation! Download the app and enter my code {code} or use this link to automatically claim your credit: {link}",
    "golden.credit": "Credit",
    "golden.credits": "Credits",
    "home.createBouquet": "Create Bouquet",
    "home.spreadKindness": "Spread Kindness",
    "home.spreadKindnessDesc": "Send a mystery bouquet to brighten a stranger's day.",
    "home.temporarilyDisabled": "Temporarily disabled",
    "home.featureDisabled": "Feature Disabled",
    "home.safetyViolationDesc": "Feature temporarily disabled due to safety violations.",
    "home.loginRequired": "Login Required",
    "home.loginToSpreadKindness": "You must be logged in to send a Random Act of Kindness.",
    "home.cancel": "Cancel",
    "home.login": "Login",
    "home.whatsNewTitle": "What's New",
    "home.whatsNewSubtitle": "We've added some beautiful new ways to connect and spread joy.",
    "home.whatsNewGoldenTitle": "Golden Bouquet",
    "home.whatsNewGoldenDesc": "Express ultimate gratitude with our radiant, shimmering premium bouquet style designed for special moments.",
    "home.whatsNewRaokTitle": "Random Acts of Kindness",
    "home.whatsNewRaokDesc": "Send and receive anonymous digital bouquets globally, sharing warmth and positivity with those who need it.",
    "home.whatsNewClose": "Sounds good",
    "raok.guidelinesTitle": "Random Act of Kindness",
    "raok.guidelinesSubtitle": "Send a little warmth and surprise a stranger! Here is how it works & guidelines to follow.",
    "raok.rule1Title": "Spread Joy Anonymously",
    "raok.rule1Desc": "Your bouquet and message will be randomly matched by AI to someone who needs a smile today, completely anonymously.",
    "raok.rule2Title": "Be Positive & Uplifting",
    "raok.rule2Desc": "Write warm, encouraging words. Leave comments that inspire hope, kindness, and support.",
    "raok.rule3Title": "No Personal Information",
    "raok.rule3Desc": "For your safety and others, do not include names, phone numbers, addresses, social handles, or links.",
    "raok.understand": "I understand",
    "raok.soundsGood": "Sounds good",
    "createBouquet.howToCreate": "How to create a bouquet",
    "createBouquet.selectFlowers": "Select Flowers",
    "createBouquet.selectFlowersDesc": "Choose at least 3 flowers to begin. Tap a flower card to see its meaning and color options.",
    "createBouquet.arrangeThem": "Arrange Them",
    "createBouquet.arrangeThemDesc": "Drag flowers around the canvas. Use the toolbar to edit size, rotation, and layering.",
    "createBouquet.personalizeAndSend": "Personalize & Send",
    "createBouquet.personalizeAndSendDesc": "Add a heartfelt message, pick a song, and generate a unique link to share with them.",
    "createBouquet.enjoyingApp": "Enjoying the app?",
    "createBouquet.thankYou": "Thank You!",
    "createBouquet.openPlayStore": "Open Play Store",
    "createBouquet.maybeLater": "Maybe Later",
    "createBouquet.sarahsSelection": "Sarah's Selection",
    "createBouquet.createAccountAttach": "Create an account or sign in to attach a photo or voice note",
    "createBouquet.returnToHome": "Return to Home"
  };

  // Merge English new keys first
  for (const path in englishNewKeys) {
    setNested(translations.en, path, englishNewKeys[path]);
  }

  // Merge all other languages
  for (const lang in newTranslations) {
    if (!translations[lang]) {
      translations[lang] = {};
    }
    const langObj = newTranslations[lang];
    for (const path in langObj) {
      setNested(translations[lang], path, langObj[path]);
    }
  }

  // 4. Delete credits.specialThanksText from all languages (including English)
  for (const lang in translations) {
    deleteNested(translations[lang], 'credits.specialThanksText');
  }

  // 5. Format and save translations.js
  const formattedContent = 'export default ' + JSON.stringify(translations, null, 2) + ';\n';
  fs.writeFileSync('src/translations.js', formattedContent, 'utf8');
  console.log('Successfully merged translations and saved src/translations.js!');
} catch (err) {
  console.error('Error during merge:', err);
  process.exit(1);
}
