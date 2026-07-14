import { HapticButton } from '../components/HapticButton';
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import * as Sentry from '@sentry/react-native';

/**
 * ErrorBoundary
 *
 * Catches any unhandled JavaScript exceptions thrown inside the component tree.
 * - Reports the error to Sentry with full context
 * - Prevents the native bridge from receiving a raw JavascriptException (= no Play Console crash)
 * - Shows a clean, minimal fallback screen with a "Go Back" / "Try Again" button
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error, errorInfo) {
    // Report to Sentry with the full React component stack
    Sentry.withScope((scope) => {
      scope.setExtra('componentStack', errorInfo?.componentStack);
      Sentry.captureException(error);
    });

    if (__DEV__) {
      console.error('[ErrorBoundary] Caught error:', error);
      console.error('[ErrorBoundary] Component stack:', errorInfo?.componentStack);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { onBack } = this.props;

    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor="#FAF7F2" />

        <View style={styles.container}>
          {/* Icon */}
          <View style={styles.iconWrap}>
            <Text style={styles.iconEmoji}>🌸</Text>
          </View>

          {/* Heading */}
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle}>
            The app ran into an unexpected problem. This has been reported automatically.
          </Text>

          {/* Actions */}
          <HapticButton
            style={styles.primaryBtn}
            onPress={this.handleReset}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryBtnText}>Try Again</Text>
          </HapticButton>

          {onBack && (
            <HapticButton
              style={styles.secondaryBtn}
              onPress={() => {
                this.handleReset();
                onBack();
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryBtnText}>← Go Back</Text>
            </HapticButton>
          )}

          {/* Only show raw error in dev builds */}
          {__DEV__ && (
            <View style={styles.devBox}>
              <Text style={styles.devLabel}>DEV — Error details:</Text>
              <Text style={styles.devText} numberOfLines={6}>
                {this.state.errorMessage}
              </Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FAF7F2',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0EAE4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  iconEmoji: {
    fontSize: 36,
  },
  title: {
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
    fontSize: 22,
    fontWeight: '700',
    color: '#2C2416',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : 'System',
    fontSize: 15,
    color: '#8B7355',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 36,
  },
  primaryBtn: {
    backgroundColor: '#7A5C58',
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 40,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#7A5C58',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  primaryBtnText: {
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  secondaryBtnText: {
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : 'System',
    fontSize: 15,
    fontWeight: '500',
    color: '#7A5C58',
  },
  devBox: {
    marginTop: 32,
    padding: 14,
    backgroundColor: '#FFF0F0',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFCCCC',
    width: '100%',
  },
  devLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#CC4444',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  devText: {
    fontSize: 11,
    color: '#882222',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
});
