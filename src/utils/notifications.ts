import * as Notifications from 'expo-notifications';
import holidayDates from '../data/holidayDates.json';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Configure how notifications behave when the app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Create a dedicated channel with the custom sound for Android
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('bouquet_alerts', {
    name: 'Bouquet Alerts',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'notification.mp3',
    enableVibrate: true,
  });
}

interface HolidayDateMap {
  [key: string]: string;
}

const HOLIDAYS: HolidayDateMap = holidayDates;

export const scheduleHolidayNotifications = async () => {
  try {
    const isEnabled = await AsyncStorage.getItem('notifications_enabled');
    if (isEnabled !== 'true') return;

    // We'll reset every time country changes or year changes
    const currentYear = new Date().getFullYear().toString();
    const storedCountry = await AsyncStorage.getItem('shop_country_selected') || 'US';
    const language = await AsyncStorage.getItem('app_language') || 'en';
    const lastScheduledKey = await AsyncStorage.getItem('holiday_notifications_scheduled_key');
    const scheduleKey = `${currentYear}_${storedCountry}_${language}`;
    
    if (lastScheduledKey === scheduleKey) {
      return;
    }

    await Notifications.cancelAllScheduledNotificationsAsync();
    const now = new Date();

    const universalDates = language === 'en' ? (HOLIDAYS.universal || {}) : {};
    const countryDates = HOLIDAYS[storedCountry] || {};
    const mergedHolidays = { ...universalDates, ...countryDates };

    for (const [holidayKey, dateStr] of Object.entries(mergedHolidays)) {
      if (!dateStr) continue;

      const dateParts = dateStr.split('-');
      const holidayDate = new Date(
        parseInt(dateParts[0]), 
        parseInt(dateParts[1]) - 1, 
        parseInt(dateParts[2]),
        19, 0, 0
      );

      if (holidayDate.getTime() > now.getTime()) {
        let title = '';
        let body = '';

        switch(holidayKey) {
          case 'valentinesDay':
          case 'diaDosNamorados':
            title = "Happy Valentine's Day! 💘";
            body = "Cupid called! Send a romantic bouquet to steal their heart today.";
            break;
          case 'mothersDay':
          case 'motheringSunday':
            title = "Happy Mother's Day! 🌸";
            body = "She's one of a kind! Remind Mom how much you love her with a custom bouquet.";
            break;
          case 'fathersDay':
            title = "Happy Father's Day! 👔";
            body = "Dads love flowers too! Send him a thoughtful digital gift today.";
            break;
          case 'christmas':
            title = "Merry Christmas! 🎄";
            body = "Spread the holiday cheer with a festive, wintery bouquet.";
            break;
          case 'diwali':
            title = "Happy Diwali! 🪔";
            body = "Light up someone's day! Send a bright & beautiful festive bouquet.";
            break;
          case 'eidAlFitr':
          case 'eidAlAdha':
            title = "Eid Mubarak! 🌙";
            body = "Celebrate the blessed day with a gorgeous floral greeting.";
            break;
          case 'dashain':
            title = "Happy Dashain! 🌺";
            body = "Send your warmest festive greetings blooming with joy.";
            break;
          case 'tihar':
            title = "Happy Tihar! 🌼";
            body = "Celebrate the festival of lights with a vibrant marigold bouquet!";
            break;
          case 'newYear':
            title = "Happy New Year! 🎆";
            body = "Start the year fresh and bright with a gorgeous bouquet.";
            break;
          case 'roseDay':
            title = "Happy Rose Day! 🌹";
            body = "Kick off Valentine's week by sending a stunning digital rose.";
            break;
          case 'friendshipDay':
            title = "Happy Friendship Day! 👯";
            body = "Celebrate your besties with a bright, cheerful bouquet.";
            break;
          case 'rakshaBandhan':
            title = "Happy Raksha Bandhan! 🧵";
            body = "Send your sibling a beautiful floral surprise today.";
            break;
          case 'karvaChauth':
            title = "Happy Karva Chauth! 🌕";
            body = "Express your eternal love with a beautiful bouquet.";
            break;
          case 'kartiniDay':
            title = "Happy Kartini Day! 🇮🇩";
            body = "Celebrate the inspiring women in your life with flowers.";
            break;
          case 'undas':
          case 'diaDeLosMuertos':
            title = "A Day of Remembrance 🕯️";
            body = "Honor your loved ones with a beautiful memorial bouquet.";
            break;
          case 'childrensDay':
            title = "Happy Children's Day! 🎈";
            body = "Send a sweet, playful bouquet today.";
            break;
          case 'pohelaBoishakh':
            title = "Shubho Noboborsho! 🎊";
            body = "Celebrate the Bengali New Year with vibrant flowers.";
            break;
          case 'songkran':
            title = "Happy Songkran! 💦";
            body = "Send a refreshing, bright bouquet for the Thai New Year.";
            break;
          case 'womensDay':
            title = "Happy Women's Day! 🌷";
            body = "Celebrate her strength and grace with a gorgeous bouquet.";
            break;
          case 'siblingsDay':
            title = "Happy National Siblings Day! 👫";
            body = "Remind them who the favorite child is with a beautiful bouquet.";
            break;
          case 'bestFriendsDay':
            title = "Happy Best Friends Day! 👯‍♀️";
            body = "Send your ride-or-die a stunning bouquet just because!";
            break;
          case 'randomActOfKindnessDay':
            title = "Random Act of Kindness Day 💖";
            body = "Make a stranger or a friend smile today with a surprise bouquet.";
            break;
          case 'grandparentsDay':
            title = "Happy Grandparents Day! 👵👴";
            body = "Send some love to the ones who spoil you with a classic bouquet.";
            break;
          case 'spousesDay':
            title = "Happy Spouse's Day! 🥂";
            body = "Surprise your better half with a gorgeous bouquet today.";
            break;
          case 'intlFriendshipDay':
            title = "Happy Friendship Day! 👯";
            body = "Celebrate your global besties with a bright, cheerful bouquet.";
            break;
          case 'worldGratitudeDay':
            title = "World Gratitude Day 🕊️";
            body = "Say 'thank you' to someone special with a stunning floral gift.";
            break;
          case 'teachersDay':
            title = "Happy Teacher's Day! 🍎";
            body = "Thank an inspiring teacher with a beautiful bouquet today.";
            break;
          case 'singlesDay':
            title = "Happy Singles' Day! 🛍️";
            body = "Treat yourself! You deserve a gorgeous bouquet today.";
            break;
          case 'galentinesDay':
            title = "Happy Galentine's Day! 🥂";
            body = "Celebrate your fabulous girlfriends with a vibrant bouquet today!";
            break;
          case 'worldComplimentDay':
            title = "World Compliment Day 🗣️";
            body = "Send a sweet compliment wrapped in a digital bouquet!";
            break;
          case 'petDay':
            title = "National Pet Day! 🐾";
            body = "Celebrate the furry friends in your life (or their humans) with a bright bouquet.";
            break;
          case 'nursesDay':
            title = "National Nurses Day 🩺";
            body = "Thank a healthcare hero today with a gorgeous digital bouquet.";
            break;
          case 'familiesDay':
            title = "International Day of Families 🏡";
            body = "Remind your family how much they mean to you with a classic bouquet.";
            break;
          case 'justBecauseDay':
            title = "Just Because Day! ✨";
            body = "No reason needed! Surprise someone with an unexpected bouquet today.";
            break;
          case 'daughtersDay':
            title = "National Daughters Day 🎀";
            body = "Show your daughter how much she shines with a beautiful bouquet.";
            break;
          case 'sonsDay':
            title = "National Sons Day 🌟";
            body = "Send some love to your amazing son today!";
            break;
          case 'bossesDay':
            title = "Happy Boss's Day! 💼";
            body = "Show appreciation for great leadership with a professional bouquet.";
            break;
          case 'sweetestDay':
            title = "Happy Sweetest Day! 🍬";
            body = "Do something sweet—send a romantic or cheerful bouquet today!";
            break;
          case 'newYearRU':
            title = "Happy New Year! 🎆";
            body = "Start the year fresh and bright with a gorgeous bouquet.";
            break;
          default:
            title = "Time to bloom! 💐";
            body = "It's a beautiful day to surprise someone with a digital bouquet.";
        }

        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: { url: 'digibouquet://' },
            sound: 'notification.mp3', // For iOS
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: holidayDate,
            channelId: 'bouquet_alerts', // For Android
          },
        });
      }
    }

    await AsyncStorage.setItem('holiday_notifications_scheduled_key', scheduleKey);
  } catch (error) {
    console.error('Error scheduling holiday notifications:', error);
  }
};

export const scheduleInteractionNotification = async (type: 'reply' | 'referral', username?: string, bouquetId?: string) => {
  try {
    const isEnabled = await AsyncStorage.getItem('notifications_enabled');
    if (isEnabled !== 'true') return;

    let title = '';
    let body = '';

    if (type === 'reply') {
      title = "New Reply! 💌";
      body = `${username || 'Someone'} replied to your bouquet!`;
    } else if (type === 'referral') {
      title = "New Referral! 🎉";
      body = `${username || 'Someone'} joined using your referral link.`;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { 
          type,
          url: type === 'reply' && bouquetId ? `digibouquet://bouquet/reply?id=${bouquetId}` : undefined
        },
        sound: 'notification.mp3', // For iOS
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1,
        channelId: 'bouquet_alerts', // For Android
      },
    });
  } catch (error) {
    console.error('Error scheduling interaction notification:', error);
  }
};
