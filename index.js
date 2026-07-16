import { registerRootComponent } from 'expo';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import * as Sentry from '@sentry/react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

import App from './App';

// ─── Google Sign-In — Configure at Boot ───────────────────────────────────────
// Configure ONCE synchronously at app entry (before any screen mounts).
// This eliminates the useEffect delay — by the time Welcome/Login/Register
// screens appear, the SDK is already fully configured and ready to sign in.
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
});

// ─── Widget Task Handler ───────────────────────────────────────────────────────
import { widgetTaskHandler } from './src/widgets/widgetTaskHandler';

// ─── Sentry Crash Reporter ─────────────────────────────────────────────────────
// Sentry catches JS exceptions on the JavaScript side — before they reach the
// native RN bridge and become useless "JavascriptException" entries in Play Console.
Sentry.init({
  enabled: false,
  // Replace with your real DSN from sentry.io → Settings → Projects → Client Keys
  dsn: 'https://f88c480ec8527a425d351be506249517@o4511545942605824.ingest.us.sentry.io/4511545945358336',

  // Captures JS errors, unhandled promise rejections, and native crashes
  enableNative: true,

  // Enable tombstone collection for richer native crash reports
  enableTombstone: true,

  // Attach JS bundle source maps so Sentry un-minifies stack traces automatically
  attachStacktrace: true,

  // Send 10% of normal events as performance traces (0 = off)
  tracesSampleRate: 0.1,

  // Tag every event with the app environment
  environment: __DEV__ ? 'development' : 'production',

  // Adds more context data to events (IP address, cookies, user, etc.)
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,
  integrations: [Sentry.feedbackIntegration()],
});

// ─── Global JS Error Handler ───────────────────────────────────────────────────
// This catches any unhandled exception that wasn't caught by an Error Boundary.
// In production, fatal errors are still shown to users, but we get a real stack
// trace in Sentry instead of a useless native-side JavascriptException.
const originalHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error, isFatal) => {
  // Report to Sentry first
  Sentry.captureException(error, { extra: { isFatal } });

  if (__DEV__) {
    console.error('[GlobalErrorHandler] Caught error (isFatal=' + isFatal + '):', error);
  }

  // Then call the original React Native handler
  originalHandler(error, isFatal);
});
registerWidgetTaskHandler(widgetTaskHandler);
registerRootComponent(App);
